
import { NextResponse } from 'next/server';
import { getHealth } from '../../../lib/db';

export async function GET() {
  try {
    return NextResponse.json(await getHealth());
  } catch (error) {
    return NextResponse.json({ ok: false, database: 'offline', error: error.message }, { status: 503 });
  }
}
