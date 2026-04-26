export type EnvStatus = {
  openai: {
    detected: boolean;
    masked: string | null;
  };
  supabase: {
    urlDetected: boolean;
    anonKeyDetected: boolean;
    serviceRoleDetected: boolean;
    dbEnabled: boolean;
  };
  robot: {
    apiKeyDetected: boolean;
  };
  productionReady: boolean;
  missing: string[];
  // Backward-compatible flags for existing UI.
  hasOpenAIKey: boolean;
  openAIKeyPrefix: string | null;
  hasSupabaseUrl: boolean;
  hasSupabaseAnonKey: boolean;
  hasSupabaseServiceRole: boolean;
  supabaseEnabled: boolean;
  hasRobotApiKey: boolean;
};

function maskSecret(value?: string | null) {
  if (!value) return null;
  if (value.length <= 8) return `${value.slice(0, 2)}...`;
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export function getServerEnvStatus(): EnvStatus {
  const openAIKey = process.env.OPENAI_API_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const dbEnabled = process.env.SUPABASE_DB_ENABLED === 'true';
  const robotKey = process.env.TASKPILOT_ROBOT_API_KEY;

  const missing: string[] = [];
  if (!openAIKey) missing.push('OPENAI_API_KEY');
  if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!supabaseAnon) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (!supabaseServiceRole) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!dbEnabled) missing.push('SUPABASE_DB_ENABLED=true');
  if (!robotKey) missing.push('TASKPILOT_ROBOT_API_KEY');

  return {
    openai: {
      detected: Boolean(openAIKey),
      masked: maskSecret(openAIKey)
    },
    supabase: {
      urlDetected: Boolean(supabaseUrl),
      anonKeyDetected: Boolean(supabaseAnon),
      serviceRoleDetected: Boolean(supabaseServiceRole),
      dbEnabled
    },
    robot: {
      apiKeyDetected: Boolean(robotKey)
    },
    productionReady: missing.length === 0,
    missing,
    hasOpenAIKey: Boolean(openAIKey),
    openAIKeyPrefix: maskSecret(openAIKey),
    hasSupabaseUrl: Boolean(supabaseUrl),
    hasSupabaseAnonKey: Boolean(supabaseAnon),
    hasSupabaseServiceRole: Boolean(supabaseServiceRole),
    supabaseEnabled: dbEnabled,
    hasRobotApiKey: Boolean(robotKey)
  };
}
