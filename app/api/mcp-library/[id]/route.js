import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import { APP } from '../../../../lib/config';

export async function DELETE(_req, { params }) {
  try {
    const { id } = await params;
    const result = await query(`delete from public.punk_saas_mcp_servers s
      using public.punk_saas_orgs o
      where s.org_id=o.id and o.slug=$1 and s.id=$2 and s.official=false
      returning s.id, s.name`, [APP.orgSlug, id]);
    if (!result.rowCount) {
      return NextResponse.json({ error: 'MCP não encontrado ou é oficial/protegido' }, { status: 404 });
    }
    return NextResponse.json({ deleted: result.rows[0] });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
