import { format, formatDistanceToNow, parseISO, isValid, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

export function fDate(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  const d = parseISO(dateStr);
  if (!isValid(d)) return dateStr;
  return format(d, "d 'de' MMMM, yyyy", { locale: es });
}

export function fDateShort(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  const d = parseISO(dateStr);
  if (!isValid(d)) return dateStr;
  return format(d, 'dd/MM/yyyy', { locale: es });
}

export function fRelative(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  const d = parseISO(dateStr);
  if (!isValid(d)) return dateStr;
  return formatDistanceToNow(d, { addSuffix: true, locale: es });
}

export function fInputDate(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const d = parseISO(dateStr);
  if (!isValid(d)) return '';
  return format(d, 'yyyy-MM-dd');
}

export function daysUntil(dateStr: string | undefined): number | null {
  if (!dateStr) return null;
  const d = parseISO(dateStr);
  if (!isValid(d)) return null;
  return differenceInDays(d, new Date());
}

export function isSoonDate(dateStr: string | undefined, withinDays = 30): boolean {
  const days = daysUntil(dateStr);
  return days !== null && days >= 0 && days <= withinDays;
}

export function extractError(err: unknown): string {
  if (!err) return 'Error desconocido';
  const e = err as any;
  return (
    e?.response?.data?.message ||
    e?.response?.data?.error ||
    e?.message ||
    'Error inesperado'
  );
}
