export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatDisplayDate(date: Date | string, lang: 'en' | 'zh' = 'zh'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (lang === 'zh') {
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  }
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function isToday(date: string): boolean {
  return formatDate(new Date()) === formatDate(date);
}

export function isThisWeek(date: string): boolean {
  const d = new Date(date);
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  return d >= startOfWeek;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function getDateString(offset: number = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return formatDate(d);
}
