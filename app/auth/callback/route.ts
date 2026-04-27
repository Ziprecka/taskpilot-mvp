import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const next = req.nextUrl.searchParams.get('next') || '/dashboard';
  return NextResponse.redirect(new URL(next, req.url));
}
