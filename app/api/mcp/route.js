
import { NextResponse } from 'next/server';
import { query } from '../../../lib/db';
import { APP } from '../../../lib/config';

const tools = [
  { name: 'search_records', description: 'Busca contexto no PunkRecords/Super Cérebro.', inputSchema: { type: 'object', properties: { query: { type: 'string' }, limit: { type: 'number', default: 8 } }, required: ['query'] } },
  { name: 'list_cards', description: 'Lista cards do kanban interno dos agentes.', inputSchema: { type: 'object', properties: {} } },
  { name: 'create_card', description: 'Cria card para agentes no kanban.', inputSchema: { type: 'object', properties: { title: { type: 'string' }, description: { type: 'string' }, priority: { type: 'string', enum: ['low', 'medium', 'high'] } }, required: ['title'] } },
  { name: 'post_message', description: 'Posta mensagem no chat interno.', inputSchema: { type: 'object', properties: { author_name: { type: 'string' }, body: { type: 'string' } }, required: ['body'] } },
  { name: 'list_messages', description: 'Lista mensagens recentes do chat interno.', inputSchema: { type: 'object', properties: { limit: { type: 'number', default: 20 } } } },
  { name: 'agent_heartbeat', description: 'Registra/atualiza presença de agente externo.', inputSchema: { type: 'object', properties: { name: { type: 'string' }, role: { type: 'string' }, model: { type: 'string' }, status: { type: 'string' } }, required: ['name'] } }
];

function rpc(id, result) { return NextResponse.json({ jsonrpc: '2.0', id, result }); }
function rpcError(id, code, message) { return NextResponse.json({ jsonrpc: '2.0', id, error: { code, message } }, { status: 200 }); }
function cleanText(value, fallback = '', max = 2000) { return String(value ?? fallback).trim().slice(0, max); }
function clampLimit(value, fallback, max) {
  const parsed = Number(value || fallback);
  return Math.max(1, Math.min(Number.isFinite(parsed) ? parsed : fallback, max));
}

export async function GET() {
  return NextResponse.json({
    name: 'punkrecords-mcp',
    version: APP.version,
    endpoint: APP.mcpPath,
    public_endpoint: APP.mcpUrl,
    health: '/api/health',
    tools: tools.map(t => t.name),
  });
}

export async function POST(req) {
  let payload;
  try { payload = await req.json(); } catch { return rpcError(null, -32700, 'JSON inválido'); }
  const { id = null, method, params = {} } = payload;
  try {
    if (method === 'initialize') {
      const clientName = cleanText(params?.clientInfo?.name, 'unknown-ai-client', 160);
      await logClient(clientName, params?.capabilities || {});
      return rpc(id, {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'punkrecords-saas', version: APP.version, publicUrl: APP.publicUrl }
      });
    }
    if (method === 'tools/list') return rpc(id, { tools });
    if (method === 'tools/call') {
      const name = cleanText(params.name, '', 80);
      const args = params.arguments || {};
      const result = await callTool(name, args);
      return rpc(id, { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] });
    }
    if (method === 'ping') return rpc(id, { ok: true, app: APP.name, version: APP.version });
    return rpcError(id, -32601, `Método não suportado: ${method}`);
  } catch (error) {
    return rpcError(id, -32000, error.message);
  }
}

async function logClient(clientName, capabilities) {
  await query(`
    with org as (select id from public.punk_saas_orgs where slug=$3)
    insert into public.punk_saas_mcp_clients(org_id, client_name, capabilities, last_seen_at)
    select id, $1, $2::jsonb, now() from org
    on conflict (org_id, client_name) do update set capabilities=excluded.capabilities, last_seen_at=now()
  `, [clientName, JSON.stringify(capabilities), APP.orgSlug]);
}

async function callTool(name, args) {
  if (name === 'search_records') {
    const search = cleanText(args.query, '', 400);
    if (!search) throw new Error('query obrigatória');
    const limit = clampLimit(args.limit, 8, 20);
    const res = await query(`select title, path, left(coalesce(content,''), 1200) as snippet, metadata
      from public.punk_records
      where to_tsvector('portuguese', coalesce(title,'') || ' ' || coalesce(content,'')) @@ websearch_to_tsquery('portuguese', $1)
         or title ilike $2 or path ilike $2
      order by indexed_at desc
      limit $3`, [search, `%${search}%`, limit]);
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
    const title = cleanText(args.title, '', 180);
    if (!title) throw new Error('title obrigatório');
    const priority = ['low', 'medium', 'high'].includes(args.priority) ? args.priority : 'medium';
    const res = await query(`with board as (select id from public.punk_saas_boards where slug=$5),
      col as (select c.id from public.punk_saas_columns c join board b on b.id=c.board_id where c.name='Inbox' limit 1),
      ag as (select id from public.punk_saas_agents where name='TanIA' limit 1)
      insert into public.punk_saas_cards(board_id,column_id,assignee_agent_id,title,description,priority,metadata)
      select board.id,col.id,ag.id,$1,$2,$3,$4::jsonb from board,col,ag returning id,title,priority`, [title, cleanText(args.description, '', 1200), priority, JSON.stringify({ source: 'mcp' }), APP.boardSlug]);
    return { created: res.rows[0] };
  }
  if (name === 'post_message') {
    const body = cleanText(args.body, '', 4000);
    if (!body) throw new Error('body obrigatório');
    const res = await query(`with room as (select id from public.punk_saas_chat_rooms where slug=$4)
      insert into public.punk_saas_messages(room_id, author_name, body, kind, metadata)
      select id, $1, $2, 'mcp', $3::jsonb from room returning id, author_name, body, created_at`, [cleanText(args.author_name, 'MCP Agent', 160), body, JSON.stringify({ source: 'mcp' }), APP.roomSlug]);
    return { posted: res.rows[0] };
  }
  if (name === 'list_messages') {
    const res = await query(`select author_name, body, kind, created_at from public.punk_saas_messages order by created_at desc limit $1`, [clampLimit(args.limit, 20, 50)]);
    return { messages: res.rows.reverse() };
  }
  if (name === 'agent_heartbeat') {
    const nameValue = cleanText(args.name, '', 160);
    if (!nameValue) throw new Error('name obrigatório');
    const res = await query(`with org as (select id from public.punk_saas_orgs where slug=$6)
      insert into public.punk_saas_agents(org_id,name,role,status,model,last_seen_at,metadata)
      select id,$1,$2,$3,$4,now(),$5::jsonb from org
      on conflict (org_id,name) do update set role=excluded.role,status=excluded.status,model=excluded.model,last_seen_at=now()
      returning id,name,status,last_seen_at`, [nameValue, cleanText(args.role, 'external-agent', 120), cleanText(args.status, 'online', 40), cleanText(args.model, '', 120) || null, JSON.stringify({ source: 'mcp' }), APP.orgSlug]);
    return { agent: res.rows[0] };
  }
  throw new Error(`Tool desconhecida: ${name}`);
}
