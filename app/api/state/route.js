
import { NextResponse } from 'next/server';
import { getDashboardData } from '../../../lib/db';

export async function GET() {
  try {
    return NextResponse.json(await getDashboardData());
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
