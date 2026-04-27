import type { Workflow } from '@/types/workflow';

export const sampleWorkflows: Workflow[] = [
  {
    id: 'daily-top-3-planning',
    workflow_name: 'Plan Today Top 3 Outcomes',
    category: 'productivity',
    difficulty: 'beginner',
    estimated_time: '15 minutes',
    required_tools: ['TaskPilot Daily Mode'],
    required_materials: [],
    prerequisites: ['Know what kind of day you are planning'],
    steps: [
      { step_number: 1, title: 'Choose day type', instructions: 'Decide whether today is primarily build, money, admin, learning, or personal productivity.', expected_state: 'Day type selected.', visual_checks: [], common_mistakes: ['Skipping intent and jumping into tasks'], troubleshooting: ['Pick one primary day type only.'], completion_criteria: 'Day type decided.' },
      { step_number: 2, title: 'Set top 3 outcomes', instructions: 'Write three outcomes with visible end-of-day proof.', expected_state: 'Three measurable outcomes defined.', visual_checks: [], common_mistakes: ['Using vague tasks'], troubleshooting: ['Rewrite each as a visible result.'], completion_criteria: 'Top 3 outcomes written.' },
      { step_number: 3, title: 'Start first focus block', instructions: 'Choose the highest leverage outcome and start a 25-minute block.', expected_state: 'Focus block active.', visual_checks: [], common_mistakes: ['Trying all outcomes at once'], troubleshooting: ['Commit to one block before switching.'], completion_criteria: 'First focus block started.' }
    ],
    completion_criteria: 'Top 3 outcomes are clear and first block is active.',
    report_template: { summary: 'Daily outcomes planned.', issues_found: [], fixes_made: [], recommendations: [] }
  },
  {
    id: 'sales-outreach-list',
    workflow_name: 'Write and Send 10 Sales Messages',
    category: 'business_sop',
    difficulty: 'beginner',
    estimated_time: '40 minutes',
    required_tools: ['Spreadsheet or CRM', 'Email/LinkedIn'],
    required_materials: [],
    prerequisites: ['Define ideal customer profile'],
    steps: [
      { step_number: 1, title: 'Define target segment', instructions: 'Select one customer segment and one pain point.', expected_state: 'Segment + pain point chosen.', visual_checks: [], common_mistakes: ['Too broad audience'], troubleshooting: ['Narrow to one segment.'], completion_criteria: 'Target segment defined.' },
      { step_number: 2, title: 'Collect 10 leads', instructions: 'Find and log 10 relevant contacts with context.', expected_state: '10 leads added.', visual_checks: [], common_mistakes: ['No context notes'], troubleshooting: ['Add role + trigger note for each lead.'], completion_criteria: 'Lead list complete.' },
      { step_number: 3, title: 'Send first 3 messages', instructions: 'Send 3 personalized outreach messages.', expected_state: 'First messages sent.', visual_checks: [], common_mistakes: ['Generic templates'], troubleshooting: ['Use one line specific to each lead.'], completion_criteria: '3 outreach messages sent.' }
    ],
    completion_criteria: 'Lead list created and first outreach sent.',
    report_template: { summary: 'Sales outreach list workflow completed.', issues_found: [], fixes_made: [], recommendations: [] }
  },
  {
    id: 'weekly-execution-plan',
    workflow_name: 'Run a 25-Minute Focus Block',
    category: 'productivity',
    difficulty: 'beginner',
    estimated_time: '30 minutes',
    required_tools: ['Calendar', 'TaskPilot'],
    required_materials: [],
    prerequisites: ['Know top goals for the week'],
    steps: [
      { step_number: 1, title: 'Choose weekly priorities', instructions: 'List 3 priorities for this week.', expected_state: 'Priorities listed.', visual_checks: [], common_mistakes: ['Too many priorities'], troubleshooting: ['Limit to three.'], completion_criteria: 'Top priorities selected.' },
      { step_number: 2, title: 'Assign focus blocks', instructions: 'Schedule at least one focus block for each priority.', expected_state: 'Focus blocks on calendar.', visual_checks: [], common_mistakes: ['No time assignment'], troubleshooting: ['Assign exact time windows.'], completion_criteria: 'Focus blocks scheduled.' },
      { step_number: 3, title: 'Define proof for each priority', instructions: 'Decide what proof confirms completion.', expected_state: 'Proof criteria defined.', visual_checks: [], common_mistakes: ['No completion signal'], troubleshooting: ['Use visible deliverables.'], completion_criteria: 'Proof criteria set.' }
    ],
    completion_criteria: 'One focused block is completed with visible proof.',
    report_template: { summary: '25-minute focus block completed.', issues_found: [], fixes_made: [], recommendations: [] }
  },
  {
    id: 'taskpilot-mvp-build',
    workflow_name: 'Developer Example: TaskPilot MVP Build Workflow (Internal)',
    category: 'coding',
    difficulty: 'intermediate',
    estimated_time: '2-5 days',
    required_tools: ['Cursor', 'Next.js dev server', 'OpenAI API key', 'Supabase project', 'Vercel account'],
    required_materials: [],
    prerequisites: ['TaskPilot starter app running locally'],
    steps: [
      { step_number: 1, title: 'Confirm app runs locally', instructions: 'Run the app and confirm dashboard + session routes load cleanly.', expected_state: 'App is running locally with usable pages.', visual_checks: ['Dashboard loads', 'Session page loads'], common_mistakes: ['Running dev server in wrong directory'], troubleshooting: ['Run npm install and npm run dev from project root.'], completion_criteria: 'Local app verified.' },
      { step_number: 2, title: 'Fix AI response format', instructions: 'Enforce strict AIResponse shape in /api/ai so frontend always receives valid structured JSON.', expected_state: 'Route returns stable structured payload.', visual_checks: ['workflow_state exists in every response'], common_mistakes: ['Relying on prompt only'], troubleshooting: ['Normalize responses in backend.'], completion_criteria: 'Structured format stable.' },
      { step_number: 3, title: 'Add AI source badge', instructions: 'Expose ai_source from backend and show AI: OpenAI or AI: Mock Mode in chat panel.', expected_state: 'User can see current AI source.', visual_checks: ['Badge visible in AI panel'], common_mistakes: ['Only logging source without UI'], troubleshooting: ['Return ai_source in every response.'], completion_criteria: 'AI source visible.' },
      { step_number: 4, title: 'Improve contextual AI answers', instructions: 'Answer user question directly first, then connect back to workflow and provide next action.', expected_state: 'Responses feel helpful and context-aware.', visual_checks: ['Question gets direct answer'], common_mistakes: ['Repeating step text only'], troubleshooting: ['Classify intent before generation.'], completion_criteria: 'AI responses are practical.' },
      { step_number: 5, title: 'Make step completion advance state', instructions: 'When step completes, move to next incomplete step and sync tracker/chat/card state.', expected_state: 'Single source of truth for workflow state.', visual_checks: ['Tracker and card stay aligned'], common_mistakes: ['Updating one view only'], troubleshooting: ['Update shared session state.'], completion_criteria: 'Completion advances reliably.' },
      { step_number: 6, title: 'Add workflow completion screen', instructions: 'Show completion panel with summary, actions, and next workflow options.', expected_state: 'Finished workflow feels complete.', visual_checks: ['Workflow complete panel appears'], common_mistakes: ['No final state feedback'], troubleshooting: ['Set session.status complete at end.'], completion_criteria: 'Completion UX added.' },
      { step_number: 7, title: 'Add report generation', instructions: 'Generate an on-page report object with summary, completed steps, issues, and recommendations.', expected_state: 'Report is visible without database.', visual_checks: ['Report card renders'], common_mistakes: ['No useful recommendations'], troubleshooting: ['Use workflow + session data for report body.'], completion_criteria: 'Report generation works.' },
      { step_number: 8, title: 'Add proof/context upload', instructions: 'Collect proof/context notes and send them to AI route payload.', expected_state: 'AI has proof context for check/debug.', visual_checks: ['Notes are reflected in AI requests'], common_mistakes: ['Proof captured but never sent'], troubleshooting: ['Pass notes/contextNotes to backend.'], completion_criteria: 'Proof context wired.' },
      { step_number: 9, title: 'Add Supabase persistence', instructions: 'Persist sessions and workflow state in Supabase.', expected_state: 'State survives beyond local browser.', visual_checks: ['Rows appear in Supabase'], common_mistakes: ['Schema missing required fields'], troubleshooting: ['Create session table before writes.'], completion_criteria: 'Supabase persistence live.' },
      { step_number: 10, title: 'Save workflow sessions', instructions: 'Allow users to save and reopen sessions by id/state.', expected_state: 'Sessions can be resumed later.', visual_checks: ['Saved sessions list exists'], common_mistakes: ['No unique identifier'], troubleshooting: ['Use stable session ids and timestamps.'], completion_criteria: 'Session save/reload works.' },
      { step_number: 11, title: 'Add daily productivity mode', instructions: 'Introduce daily mode with focused tasks and progress tracking.', expected_state: 'Daily execution workflow is available.', visual_checks: ['Daily mode appears in UI'], common_mistakes: ['No persistence for daily goals'], troubleshooting: ['Store daily mode items with status.'], completion_criteria: 'Daily mode functional.' },
      {
        step_number: 12,
        title: 'Add robot API routes',
        instructions: 'Create authenticated robot-facing API endpoints with validation, fallback store, and test tooling.',
        expected_state:
          '/api/robot/register, /api/robot/state, /api/robot/event, /api/robot/command, and /api/robot/heartbeat exist; auth works via x-taskpilot-robot-key; /settings/robot can exercise endpoints; Python sample client can call routes.',
        visual_checks: ['Robot routes exist', 'Robot test page responds', 'Heartbeat endpoint returns ok'],
        common_mistakes: [
          'Exposing robot API key in frontend',
          'No request validation',
          'Route crashes on missing fields',
          'No mock/in-memory fallback',
          'No clear test page',
          'No robot client documentation'
        ],
        troubleshooting: ['Add auth helper, strict required-field checks, in-memory fallback store, and test console page.'],
        completion_criteria: 'Robot API layer is authenticated, testable, and stable.'
      },
      { step_number: 13, title: 'Deploy to Vercel', instructions: 'Deploy MVP to Vercel with required environment variables.', expected_state: 'Hosted app is reachable.', visual_checks: ['Deployment URL works'], common_mistakes: ['Missing OPENAI/SUPABASE vars'], troubleshooting: ['Set env vars in Vercel project settings.'], completion_criteria: 'Deployment successful.' },
      { step_number: 14, title: 'Record first demo', instructions: 'Record an end-to-end MVP walkthrough and capture the URL/artifact.', expected_state: 'Demo shows full core workflow.', visual_checks: ['Demo includes start, progress, completion'], common_mistakes: ['Skipping completion/report flow'], troubleshooting: ['Record a full real session.'], completion_criteria: 'First demo recorded.' }
    ],
    completion_criteria: 'TaskPilot starter app becomes a practical MVP workflow copilot.',
    report_template: { summary: 'TaskPilot MVP build workflow completed.', issues_found: [], fixes_made: [], recommendations: [] }
  },
  {
    id: 'arduino-led-blink',
    workflow_name: 'Arduino LED Blink Setup',
    category: 'electronics',
    difficulty: 'beginner',
    estimated_time: '20 minutes',
    required_tools: ['Computer', 'USB cable', 'Arduino IDE'],
    required_materials: ['Arduino Uno', 'LED', '220Ω resistor', 'Breadboard', 'Jumper wires'],
    prerequisites: ['Arduino IDE installed', 'USB port available'],
    steps: [
      {
        step_number: 1,
        title: 'Confirm parts',
        instructions: 'Lay out the Arduino, breadboard, LED, resistor, jumper wires, and USB cable.',
        expected_state: 'All required parts are visible and reachable.',
        visual_checks: ['Arduino visible', 'LED visible', 'resistor visible', 'USB cable visible'],
        common_mistakes: ['Missing resistor', 'Wrong board type', 'Charge-only USB cable'],
        troubleshooting: ['Pause and gather missing parts before wiring.'],
        completion_criteria: 'All required parts are present.'
      },
      {
        step_number: 2,
        title: 'Connect Arduino to computer',
        instructions: 'Plug the Arduino into your computer using the USB cable and confirm the board powers on.',
        expected_state: 'Arduino power LED is on.',
        visual_checks: ['USB cable connected', 'Power LED lit'],
        common_mistakes: ['Bad cable', 'Wrong port', 'Board not powered'],
        troubleshooting: ['Try a different USB cable or USB port.'],
        completion_criteria: 'Board powers on.'
      },
      {
        step_number: 3,
        title: 'Place LED on breadboard',
        instructions: 'Insert the LED legs into two separate rows on the breadboard. The long leg is positive.',
        expected_state: 'LED legs are separated and not in the same connected row.',
        visual_checks: ['LED legs separated', 'Long leg identifiable'],
        common_mistakes: ['Both LED legs in same row', 'LED reversed'],
        troubleshooting: ['Move one LED leg to another row. Reverse LED if it does not blink later.'],
        completion_criteria: 'LED is seated correctly.'
      },
      {
        step_number: 4,
        title: 'Add resistor in series',
        instructions: 'Connect the 220Ω resistor in series with the LED so current must pass through it.',
        expected_state: 'Resistor is part of the LED circuit path.',
        visual_checks: ['Resistor connected to LED path'],
        common_mistakes: ['No resistor', 'Resistor placed in an unconnected row'],
        troubleshooting: ['Move the resistor so one end shares the LED row and the other leads to ground or pin 13.'],
        completion_criteria: 'Resistor is in series with LED.'
      },
      {
        step_number: 5,
        title: 'Connect pin 13 and ground',
        instructions: 'Connect Arduino pin 13 to the LED/resistor path, and connect the other side to GND.',
        expected_state: 'Pin 13 and GND complete the LED circuit.',
        visual_checks: ['Wire from pin 13', 'Wire from GND'],
        common_mistakes: ['Wire in wrong pin', 'Ground rail disconnected'],
        troubleshooting: ['Move the data wire to pin 13 and verify ground reaches the LED circuit.'],
        completion_criteria: 'Pin 13 and GND are connected.'
      },
      {
        step_number: 6,
        title: 'Upload Blink sketch',
        instructions: 'Open Arduino IDE, load File > Examples > Basics > Blink, select the right board/port, then upload.',
        expected_state: 'IDE says done uploading.',
        visual_checks: ['Blink sketch visible', 'Done uploading message'],
        common_mistakes: ['Wrong board', 'Wrong port', 'Missing driver'],
        troubleshooting: ['Check Tools > Board and Tools > Port. Paste the error into debug mode if upload fails.'],
        completion_criteria: 'Upload succeeds.'
      },
      {
        step_number: 7,
        title: 'Verify blinking',
        instructions: 'Watch the LED and confirm it blinks once per second.',
        expected_state: 'LED blinks repeatedly.',
        visual_checks: ['LED blinking'],
        common_mistakes: ['LED reversed', 'Wrong pin', 'Bad ground'],
        troubleshooting: ['Reverse LED polarity, check pin 13, confirm GND, or upload a photo for check mode.'],
        completion_criteria: 'LED blinks consistently.'
      }
    ],
    completion_criteria: 'LED blinks consistently after code upload.',
    report_template: { summary: 'Arduino LED Blink Setup completed.', issues_found: [], fixes_made: [], recommendations: [] }
  },
  {
    id: 'java-gradle-debug',
    workflow_name: 'Java Gradle Project Debug',
    category: 'coding',
    difficulty: 'beginner',
    estimated_time: '15 minutes',
    required_tools: ['IntelliJ IDEA', 'JDK 11 or 17', 'Gradle project'],
    required_materials: [],
    prerequisites: ['Project opened in IntelliJ'],
    steps: [
      { step_number: 1, title: 'Capture exact error', instructions: 'Paste the full Gradle/IntelliJ error.', expected_state: 'Full error available.', visual_checks: ['Error text visible'], common_mistakes: ['Only pasting last line'], troubleshooting: ['Copy the full stack or screenshot.'], completion_criteria: 'Error captured.' },
      { step_number: 2, title: 'Verify project SDK', instructions: 'Check File > Project Structure > Project SDK.', expected_state: 'SDK version known.', visual_checks: ['SDK shown'], common_mistakes: ['Project SDK differs from Gradle JVM'], troubleshooting: ['Set SDK to required project version.'], completion_criteria: 'SDK verified.' },
      { step_number: 3, title: 'Verify Gradle JVM', instructions: 'Check Settings > Build Tools > Gradle > Gradle JVM.', expected_state: 'Gradle JVM known.', visual_checks: ['Gradle JVM shown'], common_mistakes: ['Using Java 17 for Java 11 project'], troubleshooting: ['Match Gradle JVM to project requirement.'], completion_criteria: 'Gradle JVM verified.' },
      { step_number: 4, title: 'Sync and run', instructions: 'Refresh Gradle, then run the project.', expected_state: 'Build output available.', visual_checks: ['Build success or error'], common_mistakes: ['Not refreshing Gradle'], troubleshooting: ['Invalidate caches if settings are correct but stale.'], completion_criteria: 'Build succeeds or new error captured.' }
    ],
    completion_criteria: 'Project builds/runs or exact blocker is identified.',
    report_template: { summary: 'Java Gradle debug session completed.', issues_found: [], fixes_made: [], recommendations: [] }
  },
  {
    id: 'first-layer-troubleshoot',
    workflow_name: '3D Printer First Layer Troubleshooting',
    category: '3d-printing',
    difficulty: 'beginner',
    estimated_time: '25 minutes',
    required_tools: ['3D printer', 'Slicer', 'Filament'],
    required_materials: [],
    prerequisites: ['Printer powered on', 'Bed clean'],
    steps: [
      { step_number: 1, title: 'Upload first-layer photo', instructions: 'Take a close photo of the failed or current first layer.', expected_state: 'Clear photo uploaded.', visual_checks: ['Layer lines visible'], common_mistakes: ['Blurry photo'], troubleshooting: ['Retake closer with better light.'], completion_criteria: 'Photo usable.' },
      { step_number: 2, title: 'Check nozzle distance', instructions: 'Compare extrusion: too round means too high, too scraped means too low.', expected_state: 'Likely Z-offset issue identified.', visual_checks: ['Line squish visible'], common_mistakes: ['Adjusting slicer before Z-offset'], troubleshooting: ['Tune Z-offset in small increments.'], completion_criteria: 'Z-offset direction chosen.' },
      { step_number: 3, title: 'Run small test patch', instructions: 'Print a small first-layer square and upload the result.', expected_state: 'Improved layer visible.', visual_checks: ['Consistent adhesion'], common_mistakes: ['Testing full print too soon'], troubleshooting: ['Repeat with small increments.'], completion_criteria: 'First layer acceptable.' }
    ],
    completion_criteria: 'First layer sticks cleanly with consistent lines.',
    report_template: { summary: 'First layer troubleshooting completed.', issues_found: [], fixes_made: [], recommendations: [] }
  },
  {
    id: 'product-research',
    workflow_name: 'Validate a Product Idea',
    category: 'research',
    difficulty: 'beginner',
    estimated_time: '45 minutes',
    required_tools: ['Browser', 'Notes'],
    required_materials: [],
    prerequisites: ['Clear product idea'],
    steps: [
      { step_number: 1, title: 'Define product hypothesis', instructions: 'State the product, buyer, pain, and why now.', expected_state: 'Hypothesis written.', visual_checks: [], common_mistakes: ['Too broad'], troubleshooting: ['Narrow buyer and pain.'], completion_criteria: 'Hypothesis is specific.' },
      { step_number: 2, title: 'Find competitors', instructions: 'Search Amazon, Google, Reddit, YouTube, Product Hunt, and TikTok.', expected_state: 'Competitor list started.', visual_checks: [], common_mistakes: ['Stopping after one search'], troubleshooting: ['Use multiple keywords.'], completion_criteria: 'At least 5 competitors or alternatives listed.' },
      { step_number: 3, title: 'Score opportunity', instructions: 'Compare price, reviews, gaps, complaints, and differentiation.', expected_state: 'Go/no-go signal emerging.', visual_checks: [], common_mistakes: ['Ignoring distribution'], troubleshooting: ['Look for channels, not just products.'], completion_criteria: 'Clear next action defined.' }
    ],
    completion_criteria: 'Research report identifies competitors, gaps, and next action.',
    report_template: { summary: 'Product research completed.', issues_found: [], fixes_made: [], recommendations: [] }
  },
  {
    id: 'deploy-taskpilot-vercel',
    workflow_name: 'Deploy a Next.js App',
    category: 'deployment',
    difficulty: 'intermediate',
    estimated_time: '45-90 minutes',
    required_tools: ['GitHub account', 'Vercel account', 'Supabase project', 'Phone browser'],
    required_materials: [],
    prerequisites: ['Project runs locally', 'Environment variables prepared'],
    steps: [
      { step_number: 1, title: 'Confirm project builds locally', instructions: 'Run npm run build and confirm no TypeScript/build errors.', expected_state: 'Build completes successfully.', visual_checks: ['Build success output in terminal'], common_mistakes: ['Skipping local build', 'Ignoring failing build output'], troubleshooting: ['Fix local build issues before deploying.'], completion_criteria: 'Local production build succeeds.' },
      { step_number: 2, title: 'Push code to GitHub', instructions: 'Commit and push your latest branch to GitHub.', expected_state: 'Repository contains latest TaskPilot code.', visual_checks: ['Latest commit visible in GitHub'], common_mistakes: ['Pushing wrong branch', 'Forgetting new files'], troubleshooting: ['Check git status and remote branch before push.'], completion_criteria: 'Latest code is available on GitHub.' },
      { step_number: 3, title: 'Import project into Vercel', instructions: 'Create/import Vercel project from GitHub repository.', expected_state: 'Vercel project connected to repository.', visual_checks: ['Vercel import flow completed'], common_mistakes: ['Wrong repo selected'], troubleshooting: ['Reconnect to correct repository in Vercel project settings.'], completion_criteria: 'Project is imported with Next.js preset.' },
      { step_number: 4, title: 'Add environment variables in Vercel', instructions: 'Add OPENAI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_DB_ENABLED=true, TASKPILOT_ROBOT_API_KEY.', expected_state: 'All required variables are present in Vercel settings.', visual_checks: ['Variables listed in Vercel Environment Variables'], common_mistakes: ['Missing service role key', 'SUPABASE_DB_ENABLED not true'], troubleshooting: ['Copy env checklist from /settings/deploy.'], completion_criteria: 'All required env vars are configured.' },
      { step_number: 5, title: 'Deploy production build', instructions: 'Trigger deployment in Vercel and wait for successful completion.', expected_state: 'Deployment status is Ready.', visual_checks: ['Vercel shows successful deployment'], common_mistakes: ['Deploying with missing env vars'], troubleshooting: ['Review build logs and fix missing env keys.'], completion_criteria: 'Production deployment is live.' },
      { step_number: 6, title: 'Test /api/health', instructions: 'Open /api/health on deployed URL.', expected_state: 'Health JSON loads with productionReady true or clear missing list.', visual_checks: ['Health JSON response shown'], common_mistakes: ['Testing local URL accidentally'], troubleshooting: ['Use deployed vercel.app URL.'], completion_criteria: '/api/health verifies production status.' },
      { step_number: 7, title: 'Test /settings/setup', instructions: 'Open setup page on deployed URL and confirm readiness indicators.', expected_state: 'Setup checklist loads with useful statuses.', visual_checks: ['Setup page shows OpenAI/Supabase statuses'], common_mistakes: ['Schema not installed in production DB'], troubleshooting: ['Run schema and seed in production Supabase project.'], completion_criteria: 'Setup page confirms production setup.' },
      { step_number: 8, title: 'Test workflow generator', instructions: 'Generate a workflow from /workflows/generate and confirm practical steps.', expected_state: 'Generated workflow preview is usable and saveable.', visual_checks: ['Generated steps include expected state and criteria'], common_mistakes: ['Overly generic prompt'], troubleshooting: ['Use specific goal and tools in generator form.'], completion_criteria: 'Workflow generation works in production.' },
      { step_number: 9, title: 'Test Supabase sync', instructions: 'Start a session and verify state persists after refresh.', expected_state: 'Session loads with synced progress.', visual_checks: ['Session state survives refresh'], common_mistakes: ['Supabase env mismatch'], troubleshooting: ['Compare deployed env vars with local working values.'], completion_criteria: 'Session sync works in production.' },
      { step_number: 10, title: 'Test mobile layout', instructions: 'Open deployed URL on narrow screen and verify dashboard/session/generator usability.', expected_state: 'UI stacks correctly and controls are tappable.', visual_checks: ['Cards stack cleanly', 'Inputs/buttons remain usable'], common_mistakes: ['Ignoring overflow on small screens'], troubleshooting: ['Adjust responsive classes for mobile breakpoints.'], completion_criteria: 'Mobile UX is demo-ready.' },
      { step_number: 11, title: 'Add to phone home screen', instructions: 'Install app from Safari/Chrome add-to-home-screen flow.', expected_state: 'TaskPilot opens from phone home screen as standalone app.', visual_checks: ['TaskPilot icon appears', 'App opens without browser chrome'], common_mistakes: ['Trying from localhost URL'], troubleshooting: ['Use deployed HTTPS URL for install prompt.'], completion_criteria: 'Phone home-screen install works.' },
      { step_number: 12, title: 'Record demo', instructions: 'Record a short end-to-end production demo including mobile install and workflow execution.', expected_state: 'Demo video exists and can be shared.', visual_checks: ['Video shows deployment URL + main features'], common_mistakes: ['Skipping health/setup checks in demo'], troubleshooting: ['Follow this workflow step-by-step while recording.'], completion_criteria: 'Demo artifact is recorded.' }
    ],
    completion_criteria: 'TaskPilot is deployed, tested, mobile-installable, and demo-ready.',
    report_template: { summary: 'Vercel deployment workflow completed.', issues_found: [], fixes_made: [], recommendations: [] }
  },
  {
    id: 'clear-stuck-task',
    workflow_name: 'Clear a Stuck Task',
    category: 'productivity',
    difficulty: 'beginner',
    estimated_time: '20 minutes',
    required_tools: ['TaskPilot Daily Mode', 'Notes'],
    required_materials: [],
    prerequisites: ['Identify one blocked task'],
    steps: [
      { step_number: 1, title: 'Define blocker clearly', instructions: 'Write exactly what is blocked and why.', expected_state: 'Blocker statement exists.', visual_checks: [], common_mistakes: ['Vague blocker'], troubleshooting: ['Name one precise bottleneck.'], completion_criteria: 'Blocker is specific.' },
      { step_number: 2, title: 'Pick smallest unblock move', instructions: 'Choose a 5-10 minute unblock action.', expected_state: 'Tiny unblock action selected.', visual_checks: [], common_mistakes: ['Picking large task'], troubleshooting: ['Shrink to one tiny action.'], completion_criteria: 'Tiny move chosen.' },
      { step_number: 3, title: 'Run unblock action now', instructions: 'Execute the tiny action and log proof.', expected_state: 'Momentum restored with proof.', visual_checks: [], common_mistakes: ['Planning without action'], troubleshooting: ['Do action before editing plan further.'], completion_criteria: 'Proof logged and blocker reduced.' }
    ],
    completion_criteria: 'Blocked task has a concrete next step completed.',
    report_template: { summary: 'Stuck task cleared.', issues_found: [], fixes_made: [], recommendations: [] }
  },
  {
    id: 'close-day-report',
    workflow_name: 'Close the Day With a Report',
    category: 'productivity',
    difficulty: 'beginner',
    estimated_time: '15 minutes',
    required_tools: ['TaskPilot Daily'],
    required_materials: [],
    prerequisites: ['At least one outcome attempted today'],
    steps: [
      { step_number: 1, title: 'Review outcomes', instructions: 'Mark each outcome as done, blocked, or carry forward.', expected_state: 'Outcome statuses are current.', visual_checks: [], common_mistakes: ['Skipping blockers'], troubleshooting: ['Write blocker note for each blocked item.'], completion_criteria: 'Statuses updated.' },
      { step_number: 2, title: 'Capture proof highlights', instructions: 'Log proof notes for completed outcomes.', expected_state: 'Proof notes exist.', visual_checks: [], common_mistakes: ['No proof evidence'], troubleshooting: ['Capture one sentence per completed result.'], completion_criteria: 'Proof logged.' },
      { step_number: 3, title: 'Generate report', instructions: 'Generate and save daily report, then define tomorrow first action.', expected_state: 'Report generated and next action defined.', visual_checks: [], common_mistakes: ['No tomorrow action'], troubleshooting: ['Add one concrete first action for tomorrow.'], completion_criteria: 'Daily report complete.' }
    ],
    completion_criteria: 'Daily report saved with tomorrow first action.',
    report_template: { summary: 'Close-the-day workflow completed.', issues_found: [], fixes_made: [], recommendations: [] }
  },
  {
    id: 'record-product-demo',
    workflow_name: 'Record a Product Demo',
    category: 'productivity',
    difficulty: 'beginner',
    estimated_time: '35 minutes',
    required_tools: ['Screen recorder', 'Script notes'],
    required_materials: [],
    prerequisites: ['Feature or deliverable to show'],
    steps: [
      { step_number: 1, title: 'Write demo outline', instructions: 'Draft intro, problem, solution, and proof sections.', expected_state: 'Demo structure exists.', visual_checks: [], common_mistakes: ['No clear story'], troubleshooting: ['Limit to one user outcome.'], completion_criteria: 'Outline ready.' },
      { step_number: 2, title: 'Record first take', instructions: 'Record a full first take from start to finish.', expected_state: 'Raw recording exists.', visual_checks: [], common_mistakes: ['Stopping too often'], troubleshooting: ['Prioritize complete take over perfection.'], completion_criteria: 'First take saved.' },
      { step_number: 3, title: 'Publish or share', instructions: 'Export and post/share recording with target audience.', expected_state: 'Demo shared.', visual_checks: [], common_mistakes: ['Never shipping the demo'], troubleshooting: ['Publish as unlisted if not public-ready.'], completion_criteria: 'Demo delivered.' }
    ],
    completion_criteria: 'A product demo is recorded and shared.',
    report_template: { summary: 'Product demo workflow completed.', issues_found: [], fixes_made: [], recommendations: [] }
  }
];

export function getWorkflowById(id: string) {
  return sampleWorkflows.find((workflow) => workflow.id === id) ?? sampleWorkflows.find((workflow) => workflow.id === 'daily-top-3-planning') ?? sampleWorkflows[0];
}
