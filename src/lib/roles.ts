// Where each role's "home"/dashboard lives.
export function dashboardPath(role?: string | null): string {
  if (role === 'organisation') return '/org'
  if (role === 'superadmin' || role === 'admin1' || role === 'admin2') return '/admin'
  return '/trainee'
}
