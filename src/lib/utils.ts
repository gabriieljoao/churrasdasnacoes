import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isPast, isFuture, addHours } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Dates ────────────────────────────────────────────────────────────────────

export function formatMatchDate(isoDate: string): string {
  const d = new Date(isoDate)
  return format(d, "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })
}

export function formatShortDate(isoDate: string): string {
  const d = new Date(isoDate)
  return format(d, "dd/MM HH:mm")
}

export function formatTimeLeft(isoDate: string): string {
  const d = new Date(isoDate)
  if (isPast(d)) return 'Encerrado'
  return formatDistanceToNow(d, { locale: ptBR, addSuffix: true })
}

/** Returns true if the match can still accept predictions (before kickoff) */
export function canPredict(startsAt: string): boolean {
  return isFuture(new Date(startsAt))
}

/** Returns true if a round's craque can still be chosen (6h before 1st match) */
export function canPickCraque(firstMatchAt: string): boolean {
  const deadline = addHours(new Date(firstMatchAt), -6)
  return isFuture(deadline)
}

export function getCraqueDeadline(firstMatchAt: string): Date {
  return addHours(new Date(firstMatchAt), -6)
}

// ─── Strings ──────────────────────────────────────────────────────────────────

export function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

export function ordinal(n: number): string {
  const suffixes = ['º', 'º', 'º']
  return `${n}${suffixes[Math.min(n - 1, 2)] ?? 'º'}`
}

// ─── Flag URLs (via flagcdn.com) ──────────────────────────────────────────────

export function flagUrl(countryCode: string, size: 'sm' | 'md' | 'lg' = 'md'): string {
  const px = size === 'sm' ? 40 : size === 'md' ? 80 : 160
  return `https://flagcdn.com/w${px}/${countryCode.toLowerCase()}.png`
}

// ─── Numbers ──────────────────────────────────────────────────────────────────

export function formatPoints(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
