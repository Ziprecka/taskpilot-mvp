import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    app: 'TaskPilot',
    route: '/api/ping',
    timestamp: new Date().toISOString()
  });
}
