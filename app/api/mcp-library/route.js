import { NextResponse } from 'next/server';
import { query } from '../../../lib/db';
import { APP } from '../../../lib/config';

function clean(value, fallback = '', max = 2000) {
  return String(value ?? fallback).trim().slice(0, max);
}

function slugify(value) {
  return clean(value, '', 120)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `mcp-${Date.now()}`;
}

function parseArgs(value) {
  if (Array.isArray(value)) return value.map(String);
  const text = clean(value, '', 1000);
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {}
  return text.split(/\s+/).filter(Boolean);
}

function validateUrl(url) {
  if (!url) return null;
  const parsed = new URL(url);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('URL precisa ser http ou https');
  return parsed.toString();
}

export async function GET() {
  try {
    const result = await query(`select s.id, s.name, s.slug, s.description, s.category, s.transport, s.url, s.command,
        s.args, s.env_template, s.headers_template, s.status, s.official, s.metadata, s.last_checked_at, s.created_at
      from public.punk_saas_mcp_servers s
      join public.punk_saas_orgs o on o.id=s.org_id and o.slug=$1
      order by s.official desc, s.status='enabled' desc, s.category asc, s.name asc`, [APP.orgSlug]);
    return NextResponse.json({ servers: result.rows });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const name = clean(body.name, '', 140);
    if (!name) return NextResponse.json({ error: 'name obrigatório' }, { status: 400 });
    const transport = clean(body.transport || 'http', 'http', 20);
    if (!['http', 'stdio'].includes(transport)) return NextResponse.json({ error: 'transport inválido' }, { status: 400 });

    const url = transport === 'http' ? validateUrl(clean(body.url, '', 500)) : null;
    const command = transport === 'stdio' ? clean(body.command, '', 180) : null;
    if (transport === 'http' && !url) return NextResponse.json({ error: 'url obrigatória para MCP HTTP' }, { status: 400 });
    if (transport === 'stdio' && !command) return NextResponse.json({ error: 'command obrigatório para MCP stdio' }, { status: 400 });

    const args = parseArgs(body.args);
    const status = clean(body.status || 'available', 'available', 30);
    if (!['available', 'enabled', 'disabled', 'draft'].includes(status)) return NextResponse.json({ error: 'status inválido' }, { status: 400 });
    const slug = slugify(body.slug || name);
    const result = await query(`with org as (select id from public.punk_saas_orgs where slug=$11)
      insert into public.punk_saas_mcp_servers(org_id, name, slug, description, category, transport, url, command, args, env_template, headers_template, status, official, metadata)
      select id, $1, $2, $3, $4, $5, $6, $7, $8::jsonb, '{}'::jsonb, '{}'::jsonb, $9, false, $10::jsonb from org
      on conflict (org_id, slug) do update set
        name=excluded.name,
        description=excluded.description,
        category=excluded.category,
        transport=excluded.transport,
        url=excluded.url,
        command=excluded.command,
        args=excluded.args,
        status=excluded.status,
        updated_at=now()
      returning id, name, slug, description, category, transport, url, command, args, status, official, metadata`, [
        name,
        slug,
        clean(body.description, '', 1000),
        clean(body.category || 'custom', 'custom', 80),
        transport,
        url,
        command,
        JSON.stringify(args),
        status,
        JSON.stringify({ source: 'ui' }),
        APP.orgSlug,
      ]);
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
