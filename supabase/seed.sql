-- TaskPilot seed script.
-- Safe to re-run; workflow is upserted and steps are replaced for the target slug.

insert into public.workflows (
  user_id,
  slug,
  name,
  category,
  difficulty,
  goal,
  description,
  estimated_time,
  required_tools,
  required_materials,
  source
)
values (
  'local-dev-user',
  'taskpilot-mvp-build',
  'TaskPilot MVP Build Workflow',
  'coding',
  'intermediate',
  'Turn TaskPilot from a starter app into a real MVP that guides workflows, answers context-aware questions, saves sessions, accepts proof uploads, generates reports, and connects to a desktop robot.',
  'Primary internal build workflow',
  '2-5 days',
  '["Cursor","Next.js dev server","OpenAI API key","Supabase project","Vercel account"]'::jsonb,
  '[]'::jsonb,
  'seed'
)
on conflict (slug)
do update set
  name = excluded.name,
  category = excluded.category,
  difficulty = excluded.difficulty,
  goal = excluded.goal,
  description = excluded.description,
  estimated_time = excluded.estimated_time,
  required_tools = excluded.required_tools,
  required_materials = excluded.required_materials,
  updated_at = now();

with workflow_row as (
  select id from public.workflows where slug = 'taskpilot-mvp-build'
), deleted as (
  delete from public.workflow_steps
  where workflow_id = (select id from workflow_row)
  returning workflow_id
)
insert into public.workflow_steps (
  workflow_id,
  step_number,
  title,
  instructions,
  expected_state,
  common_mistakes,
  visual_checks,
  completion_criteria
)
select
  workflow_row.id,
  s.step_number,
  s.title,
  s.instructions,
  s.expected_state,
  '[]'::jsonb,
  '[]'::jsonb,
  s.completion_criteria
from workflow_row
cross join (
  values
    (1, 'Confirm app runs locally', 'Run app locally and verify dashboard/session routes load.', 'App runs locally and pages load.', 'Local app confirmed.'),
    (2, 'Fix AI response format', 'Enforce strict AIResponse shape and normalization.', 'AI response shape is stable.', 'Response format fixed.'),
    (3, 'Add AI source badge', 'Show AI source in chat panel.', 'OpenAI/Mock badge visible.', 'AI source visibility done.'),
    (4, 'Improve contextual AI answers', 'Answer user intent directly before next action.', 'Responses are specific and useful.', 'Contextual answers improved.'),
    (5, 'Make step completion advance state', 'Advance to next incomplete step and keep UI synced.', 'Step tracker/card/chat align.', 'Completion state sync works.'),
    (6, 'Add workflow completion screen', 'Show completion panel with next actions.', 'Completion UX appears at final step.', 'Completion screen added.'),
    (7, 'Add report generation', 'Generate structured report from session state.', 'Report renders and saves.', 'Report generation complete.'),
    (8, 'Add proof/context upload', 'Capture proof uploads and notes for check-work.', 'Proof context appears and is used.', 'Proof upload integrated.'),
    (9, 'Add Supabase persistence', 'Enable Supabase session persistence architecture.', 'DB routes save/load state.', 'Supabase persistence added.'),
    (10, 'Save workflow sessions', 'Persist and restore sessions.', 'Sessions reload correctly.', 'Session save/restore works.'),
    (11, 'Add daily productivity mode', 'Add daily mode workflow for planning/execution.', 'Daily mode available.', 'Daily mode added.'),
    (12, 'Add robot API routes', 'Create robot-facing API endpoints.', 'Robot route responds with valid JSON.', 'Robot API routes added.'),
    (13, 'Deploy to Vercel', 'Deploy with required environment variables.', 'Deployment is live.', 'Vercel deployment completed.'),
    (14, 'Record first demo', 'Record end-to-end MVP walkthrough.', 'Demo artifact exists.', 'First demo recorded.')
) as s(step_number, title, instructions, expected_state, completion_criteria);

insert into public.workflows (
  user_id, slug, name, category, difficulty, goal, description, estimated_time, required_tools, required_materials, source
)
values (
  'local-dev-user',
  'deploy-taskpilot-vercel',
  'Deploy TaskPilot MVP to Vercel',
  'deployment',
  'intermediate',
  'Deploy TaskPilot to Vercel with OpenAI, Supabase, robot API environment variables, mobile PWA support, and production testing.',
  'Production deployment workflow',
  '45-90 minutes',
  '["GitHub account","Vercel account","Supabase project","Phone browser"]'::jsonb,
  '[]'::jsonb,
  'seed'
)
on conflict (slug)
do update set
  name = excluded.name,
  category = excluded.category,
  difficulty = excluded.difficulty,
  goal = excluded.goal,
  description = excluded.description,
  estimated_time = excluded.estimated_time,
  required_tools = excluded.required_tools,
  required_materials = excluded.required_materials,
  updated_at = now();

with deploy_row as (
  select id from public.workflows where slug = 'deploy-taskpilot-vercel'
), deploy_deleted as (
  delete from public.workflow_steps where workflow_id = (select id from deploy_row) returning workflow_id
)
insert into public.workflow_steps (
  workflow_id, step_number, title, instructions, expected_state, common_mistakes, visual_checks, completion_criteria
)
select
  deploy_row.id, s.step_number, s.title, s.instructions, s.expected_state, '[]'::jsonb, '[]'::jsonb, s.completion_criteria
from deploy_row
cross join (
  values
    (1, 'Confirm project builds locally', 'Run npm run build and resolve any errors.', 'Build succeeds locally.', 'Local production build succeeds.'),
    (2, 'Push code to GitHub', 'Commit and push latest code.', 'Latest code is visible on GitHub.', 'Latest code is pushed.'),
    (3, 'Import project into Vercel', 'Import the repository in Vercel with Next.js preset.', 'Project import is complete.', 'Vercel project is connected.'),
    (4, 'Add environment variables in Vercel', 'Set required OpenAI, Supabase, and robot env vars.', 'All required vars are configured.', 'Environment variables are set.'),
    (5, 'Deploy production build', 'Trigger deployment and wait for Ready status.', 'Production deployment is live.', 'Vercel deployment succeeds.'),
    (6, 'Test /api/health', 'Open deployed /api/health endpoint.', 'Health endpoint returns JSON status.', 'Health endpoint passes.'),
    (7, 'Test /settings/setup', 'Open setup page on deployed app.', 'Setup page loads with clear statuses.', 'Setup page check passes.'),
    (8, 'Test workflow generator', 'Generate a workflow on deployed app.', 'Generated workflow is usable.', 'Generator test passes.'),
    (9, 'Test Supabase sync', 'Start/refresh session to verify persistence.', 'Session state syncs correctly.', 'Supabase sync works in production.'),
    (10, 'Test mobile layout', 'Open deployed app on narrow width/phone.', 'Layout is readable and tappable.', 'Mobile layout test passes.'),
    (11, 'Add to phone home screen', 'Install PWA from Safari/Chrome menu.', 'TaskPilot icon appears on home screen.', 'Home screen install works.'),
    (12, 'Record demo', 'Record end-to-end production walkthrough.', 'Demo video artifact exists.', 'Demo recording complete.')
) as s(step_number, title, instructions, expected_state, completion_criteria);
