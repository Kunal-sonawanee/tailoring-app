// All "today / overdue" logic uses India time, whatever the phone's timezone is.
export const SHOP_TZ = 'Asia/Kolkata'

/** Today's date in India as 'YYYY-MM-DD'. */
export function todayIST(now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: SHOP_TZ }).format(now)
}

/** 'YYYY-MM-DD' → 'DD/MM/YYYY' (digits always English). */
export function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-')
  return `${d}/${m}/${y}`
}
