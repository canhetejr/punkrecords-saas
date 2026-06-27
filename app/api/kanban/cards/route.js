
import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';

export async function POST(req) {
  const body = await req.json();
  const title = String(body.title || '').trim();
  if (!title) return NextResponse.json({ error: 'title obrigatório' }, { status: 400 });
  const result = await query(`
    with board as (select id from public.punk_saas_boards where slug='command-board'),
    col as (select c.id from public.punk_saas_columns c join board b on b.id=c.board_id where c.name=coalesce($3,'Inbox') limit 1),
    ag as (select id from public.punk_saas_agents where name=coalesce($4,'TanIA') limit 1)
    insert into public.punk_saas_cards(board_id, column_id, assignee_agent_id, title, description, priority, metadata)
    select board.id, col.id, ag.id, $1, $2, coalesce($5,'medium'), $6::jsonb from board, col, ag returning *
  `, [title, body.description || '', body.column || 'Inbox', body.assignee || 'TanIA', body.priority || 'medium', JSON.stringify({ source: 'ui_or_mcp' })]);
  return NextResponse.json(result.rows[0]);
}
