
import { NextResponse } from 'next/server';
import { query } from '../../../lib/db';

const tools = [
  { name: 'search_records', description: 'Busca contexto no PunkRecords/Super Cérebro.', inputSchema: { type: 'object', properties: { query: { type: 'string' }, limit: { type: 'number', default: 8 } }, required: ['query'] } },
  { name: 'list_cards', description: 'Lista cards do kanban interno dos agentes.', inputSchema: { type: 'object', properties: {} } },
  { name: 'create_card', description: 'Cria card para agentes no kanban.', inputSchema: { type: 'object', properties: { title: { type: 'string' }, description: { type: 'string' }, priority: { type: 'string' } }, required: ['title'] } },
  { name: 'post_message', description: 'Posta mensagem no chat interno.', inputSchema: { type: 'object', properties: { author_name: { type: 'string' }, body: { type: 'string' } }, required: ['body'] } },
  { name: 'list_messages', description: 'Lista mensagens recentes do chat interno.', inputSchema: { type: 'object', properties: { limit: { type: 'number', default: 20 } } } },
  { name: 'agent_heartbeat', description: 'Registra/atualiza presença de agente externo.', inputSchema: { type: 'object', properties: { name: { type: 'string' }, role: { type: 'string' }, model: { type: 'string' }, status: { type: 'string' } }, required: ['name'] } }
];

function rpc(id, result) { return NextResponse.json({ jsonrpc: '2.0', id, result }); }
function rpcError(id, code, message) { return NextResponse.json({ jsonrpc: '2.0', id, error: { code, message } }, { status: 200 }); }

export async function GET() {
  return NextResponse.json({ name: 'punkrecords-mcp', version: '0.1.0', endpoint: '/api/mcp', tools: tools.map(t => t.name) });
}

export async function POST(req) {
  let payload;
  try { payload = await req.json(); } catch { return rpcError(null, -32700, 'JSON inválido'); }
  const { id = null, method, params = {} } = payload;
  try {
    if (method === 'initialize') {
      const clientName = params?.clientInfo?.name || 'unknown-ai-client';
      await logClient(clientName, params?.capabilities || {});
      return rpc(id, { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'punkrecords-saas', version: '0.1.0' } });
    }
    if (method === 'tools/list') return rpc(id, { tools });
    if (method === 'tools/call') {
      const name = params.name;
      const args = params.arguments || {};
      const result = await callTool(name, args);
      return rpc(id, { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] });
    }
    if (method === 'ping') return rpc(id, {});
    return rpcError(id, -32601, `Método não suportado: ${method}`);
  } catch (error) {
    return rpcError(id, -32000, error.message);
  }
}

async function logClient(clientName, capabilities) {
  await query(`
    with org as (select id from public.punk_saas_orgs where slug='canhete-labs')
    insert into public.punk_saas_mcp_clients(org_id, client_name, capabilities, last_seen_at)
    select id, $1, $2::jsonb, now() from org
    on conflict (org_id, client_name) do update set capabilities=excluded.capabilities, last_seen_at=now()
  `, [clientName, JSON.stringify(capabilities)]);
}

async function callTool(name, args) {
  if (name === 'search_records') {
    const limit = Math.min(Number(args.limit || 8), 20);
    const res = await query(`select title, path, left(coalesce(content,''), 1200) as snippet, metadata
      from public.punk_records
      where to_tsvector('portuguese', coalesce(title,'') || ' ' || coalesce(content,'')) @@ websearch_to_tsquery('portuguese', $1)
         or title ilike $2 or path ilike $2
      limit $3`, [String(args.query || ''), `%${args.query || ''}%`, limit]);
    return { results: res.rows };
  }
  if (name === 'list_cards') {
    const res = await query(`select card.id, card.title, card.description, card.priority, col.name as column, ag.name as assignee
      from public.punk_saas_cards card
      left join public.punk_saas_columns col on col.id=card.column_id
      left join public.punk_saas_agents ag on ag.id=card.assignee_agent_id
      order by col.position, card.position, card.created_at`);
    return { cards: res.rows };
  }
  if (name === 'create_card') {
    const res = await query(`with board as (select id from public.punk_saas_boards where slug='command-board'),
      col as (select c.id from public.punk_saas_columns c join board b on b.id=c.board_id where c.name='Inbox' limit 1),
      ag as (select id from public.punk_saas_agents where name='TanIA' limit 1)
      insert into public.punk_saas_cards(board_id,column_id,assignee_agent_id,title,description,priority,metadata)
      select board.id,col.id,ag.id,$1,$2,$3,$4::jsonb from board,col,ag returning id,title`, [args.title, args.description || '', args.priority || 'medium', JSON.stringify({ source: 'mcp' })]);
    return { created: res.rows[0] };
  }
  if (name === 'post_message') {
    const res = await query(`with room as (select id from public.punk_saas_chat_rooms where slug='war-room')
      insert into public.punk_saas_messages(room_id, author_name, body, kind, metadata)
      select id, $1, $2, 'mcp', $3::jsonb from room returning id, author_name, body, created_at`, [args.author_name || 'MCP Agent', args.body, JSON.stringify({ source: 'mcp' })]);
    return { posted: res.rows[0] };
  }
  if (name === 'list_messages') {
    const res = await query(`select author_name, body, kind, created_at from public.punk_saas_messages order by created_at desc limit $1`, [Math.min(Number(args.limit || 20), 50)]);
    return { messages: res.rows.reverse() };
  }
  if (name === 'agent_heartbeat') {
    const res = await query(`with org as (select id from public.punk_saas_orgs where slug='canhete-labs')
      insert into public.punk_saas_agents(org_id,name,role,status,model,last_seen_at,metadata)
      select id,$1,$2,$3,$4,now(),$5::jsonb from org
      on conflict (org_id,name) do update set role=excluded.role,status=excluded.status,model=excluded.model,last_seen_at=now()
      returning id,name,status,last_seen_at`, [args.name, args.role || 'external-agent', args.status || 'online', args.model || null, JSON.stringify({ source: 'mcp' })]);
    return { agent: res.rows[0] };
  }
  throw new Error(`Tool desconhecida: ${name}`);
}
