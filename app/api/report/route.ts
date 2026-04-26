import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  return NextResponse.json({
    summary: `Completed report for ${body.workflow?.workflow_name ?? 'workflow'}.`,
    completed_steps: body.session?.completed_steps ?? [],
    issues_found: body.session?.detected_issues ?? [],
    recommendations: ['Save this workflow as a reusable template.', 'Add more proof checkpoints next time.']
  });
}
