
import { NextResponse } from 'next/server';
import { query } from '../../../lib/db';

export async function POST(req) {
  const body = await req.json();
  const author = body.author_name || 'Operador';
  const text = String(body.body || '').trim();
  if (!text) return NextResponse.json({ error: 'body obrigatório' }, { status: 400 });
  const result = await query(`
    with room as (select id from public.punk_saas_chat_rooms where slug='war-room')
    insert into public.punk_saas_messages(room_id, author_name, body, kind, metadata)
    select id, $1, $2, $3, $4::jsonb from room returning *
  `, [author, text, body.kind || 'chat', JSON.stringify({ source: 'ui' })]);
  return NextResponse.json(result.rows[0]);
}
