
import pg from 'pg';
import { APP } from './config';
const { Pool } = pg;

let pool;

export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 8,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
  }
  return pool;
}

export async function query(text, params = []) {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL não configurada');
  }
  return getPool().query(text, params);
}

export async function getHealth() {
  const result = await query(`select
    now() as checked_at,
    (select count(*)::int from public.punk_records) as records,
    (select count(*)::int from public.punk_chunks) as chunks,
    (select count(*)::int from public.punk_saas_agents) as agents,
    (select count(*)::int from public.punk_saas_cards) as cards,
    (select count(*)::int from public.punk_saas_messages) as messages,
    (select count(*)::int from public.punk_saas_mcp_clients) as mcp_clients`);
  return {
    ok: true,
    app: APP.name,
    version: APP.version,
    domain: APP.domain,
    database: 'online',
    ...result.rows[0],
  };
}

export async function getDashboardData() {
  const [stats, agents, board, messages, records, clients] = await Promise.all([
    query(`select
      (select count(*)::int from public.punk_records) as records,
      (select count(*)::int from public.punk_chunks) as chunks,
      (select count(*)::int from public.punk_links) as links,
      (select count(*)::int from public.punk_saas_cards) as cards,
      (select count(*)::int from public.punk_saas_messages) as messages,
      (select count(*)::int from public.punk_saas_agents) as agents,
      (select count(*)::int from public.punk_saas_mcp_clients) as mcp_clients`),
    query(`select id, name, role, status, model, avatar, last_seen_at from public.punk_saas_agents order by created_at asc`),
    query(`select
        c.id as column_id, c.name as column_name, c.position as column_position, c.accent,
        coalesce(json_agg(json_build_object(
          'id', card.id,
          'title', card.title,
          'description', card.description,
          'priority', card.priority,
          'status', card.status,
          'assignee', ag.name,
          'position', card.position
        ) order by card.position, card.created_at) filter (where card.id is not null), '[]'::json) as cards
      from public.punk_saas_columns c
      join public.punk_saas_boards b on b.id = c.board_id and b.slug=$1
      left join public.punk_saas_cards card on card.column_id = c.id
      left join public.punk_saas_agents ag on ag.id = card.assignee_agent_id
      group by c.id, c.name, c.position, c.accent
      order by c.position asc`, [APP.boardSlug]),
    query(`select m.id, m.author_name, m.body, m.kind, m.created_at, a.role
      from public.punk_saas_messages m
      left join public.punk_saas_agents a on a.id=m.agent_id
      join public.punk_saas_chat_rooms r on r.id=m.room_id and r.slug=$1
      order by m.created_at desc limit 20`, [APP.roomSlug]),
    query(`select title, path, metadata from public.punk_records order by indexed_at desc limit 8`),
    query(`select client_name, capabilities, last_seen_at from public.punk_saas_mcp_clients order by last_seen_at desc limit 5`)
  ]);
  return {
    app: APP,
    stats: stats.rows[0],
    agents: agents.rows,
    columns: board.rows,
    messages: messages.rows.reverse(),
    recentRecords: records.rows,
    mcpClients: clients.rows,
  };
}
