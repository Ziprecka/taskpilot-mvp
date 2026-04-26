import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET() {
  try {
    const sql = await readFile(join(process.cwd(), 'supabase', 'schema.sql'), 'utf8');
    return NextResponse.json({ ok: true, sql });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Failed to read schema.sql' }, { status: 500 });
  }
}
