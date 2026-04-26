import { NextResponse } from 'next/server';
import { getDbGuard } from '@/lib/db';
import { getServerEnvStatus } from '@/lib/env';
import { getRobotStoreHealth } from '@/lib/robotStore';

export async function GET() {
  const env = getServerEnvStatus();
  const guard = getDbGuard();
  if (!guard.ok) {
    return NextResponse.json({
      ok: false,
      db_enabled: env.supabaseEnabled,
      env: {
        hasSupabaseUrl: env.hasSupabaseUrl,
        hasSupabaseAnonKey: env.hasSupabaseAnonKey,
        hasSupabaseServiceRole: env.hasSupabaseServiceRole
      },
      connection: { canConnect: false, error: guard.body.reason },
      schema: { workflowsTable: false, workflowStepsTable: false, installed: false },
      seed: { taskpilotWorkflowExists: false, installed: false },
      robot: { tables_installed: false, routes_exist: true, test_page_exists: true, heartbeat_successful: false },
      next_fix: 'Add Supabase variables to .env.local and restart npm run dev.'
    });
  }
  const workflowsTable = await guard.supabase.from('workflows').select('id').limit(1);
  const stepsTable = await guard.supabase.from('workflow_steps').select('id').limit(1);
  const dailyOutcomesTable = await guard.supabase.from('daily_outcomes').select('id').limit(1);
  const dailyFocusTable = await guard.supabase.from('daily_focus_blocks').select('id').limit(1);
  const robotDevicesTable = await guard.supabase.from('robot_devices').select('id').limit(1);
  const robotStatesTable = await guard.supabase.from('robot_states').select('id').limit(1);
  const robotEventsTable = await guard.supabase.from('robot_events').select('id').limit(1);
  const robotCommandsTable = await guard.supabase.from('robot_commands').select('id').limit(1);
  const seedCheck = await guard.supabase.from('workflows').select('id').eq('slug', 'taskpilot-mvp-build').maybeSingle();
  const canConnect = !workflowsTable.error || !stepsTable.error;
  const schemaInstalled =
    !workflowsTable.error &&
    !stepsTable.error &&
    !dailyOutcomesTable.error &&
    !dailyFocusTable.error &&
    !robotDevicesTable.error &&
    !robotStatesTable.error &&
    !robotEventsTable.error &&
    !robotCommandsTable.error;
  const seedInstalled = !seedCheck.error && Boolean(seedCheck.data?.id);
  const nextFix = !env.hasSupabaseUrl || !env.hasSupabaseAnonKey || !env.hasSupabaseServiceRole
    ? 'Add Supabase variables to .env.local and restart npm run dev.'
    : !schemaInstalled
      ? 'Run supabase/schema.sql in Supabase SQL Editor.'
      : !seedInstalled
        ? 'Run supabase/seed.sql in Supabase SQL Editor.'
        : 'Supabase is ready.';
  if (process.env.NODE_ENV !== 'production') {
    console.log('[TaskPilot][db-status]', {
      canConnect,
      schemaInstalled,
      seedInstalled,
      nextFix
    });
  }

  return NextResponse.json({
    ok: schemaInstalled && seedInstalled,
    db_enabled: env.supabaseEnabled,
    env: {
      hasSupabaseUrl: env.hasSupabaseUrl,
      hasSupabaseAnonKey: env.hasSupabaseAnonKey,
      hasSupabaseServiceRole: env.hasSupabaseServiceRole
    },
    connection: { canConnect, error: workflowsTable.error?.message ?? stepsTable.error?.message ?? null },
    schema: {
      workflowsTable: !workflowsTable.error,
      workflowStepsTable: !stepsTable.error,
      dailyOutcomesTable: !dailyOutcomesTable.error,
      dailyFocusBlocksTable: !dailyFocusTable.error,
      robotDevicesTable: !robotDevicesTable.error,
      robotStatesTable: !robotStatesTable.error,
      robotEventsTable: !robotEventsTable.error,
      robotCommandsTable: !robotCommandsTable.error,
      installed: schemaInstalled
    },
    seed: {
      taskpilotWorkflowExists: seedInstalled,
      installed: seedInstalled
    },
    robot: {
      tables_installed: !robotDevicesTable.error && !robotStatesTable.error && !robotEventsTable.error && !robotCommandsTable.error,
      ...getRobotStoreHealth()
    },
    next_fix: nextFix
  });
}
