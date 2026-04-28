export function getBetaAdminEmails(): string[] {
  return String(process.env.TASKPILOT_BETA_ADMIN_EMAILS || process.env.NEXT_PUBLIC_TASKPILOT_BETA_ADMIN_EMAILS || '')
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

export function isBetaAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getBetaAdminEmails().includes(email.toLowerCase());
}
