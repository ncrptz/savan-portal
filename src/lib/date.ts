// Format a certificate/issue date from its literal Y-M-D parts, with NO
// timezone conversion — so the displayed date always matches the calendar
// date stored/printed, regardless of the viewer's timezone.
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function formatCertDate(iso?: string | null, short = false): string {
  if (!iso) return ''
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return ''
  const month = short ? MONTHS[m - 1].slice(0, 3) : MONTHS[m - 1]
  return `${d} ${month} ${y}`
}
