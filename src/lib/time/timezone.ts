export type TimeZoneResolutionSource =
  | 'profile'
  | 'legacy-alias'
  | 'country-default'
  | 'device-default'

export interface TimeZoneResolution {
  timeZone: string
  source: TimeZoneResolutionSource
}

export const businessTimeZoneOptions = [
  { value: 'Africa/Abidjan', label: 'Abidjan' },
  { value: 'Africa/Casablanca', label: 'Casablanca' },
  { value: 'Africa/Dakar', label: 'Dakar' },
  { value: 'Africa/Douala', label: 'Douala' },
  { value: 'Europe/Paris', label: 'Paris' },
  { value: 'Indian/Reunion', label: 'Réunion' },
  { value: 'America/Cayenne', label: 'Cayenne' },
  { value: 'America/Guadeloupe', label: 'Guadeloupe' },
  { value: 'America/Martinique', label: 'Martinique' },
  { value: 'Pacific/Tahiti', label: 'Tahiti' },
  { value: 'Pacific/Noumea', label: 'Nouméa' },
  { value: 'UTC', label: 'UTC' },
] as const

const legacyTimeZones: Record<string, string> = {
  'Africa/Rabat': 'Africa/Casablanca',
}

const countryDefaults: Record<string, string> = {
  morocco: 'Africa/Casablanca',
  maroc: 'Africa/Casablanca',
  cameroon: 'Africa/Douala',
  cameroun: 'Africa/Douala',
  senegal: 'Africa/Dakar',
  'ivory coast': 'Africa/Abidjan',
  "cote d'ivoire": 'Africa/Abidjan',
  france: 'Europe/Paris',
}

export function isValidTimeZone(value: unknown): value is string {
  if (typeof value !== 'string' || value.trim().length === 0) return false
  try {
    new Intl.DateTimeFormat('en', { timeZone: value.trim() }).format(0)
    return true
  } catch {
    return false
  }
}

export function normalizeTimeZone(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  const normalized = legacyTimeZones[trimmed] ?? trimmed
  return isValidTimeZone(normalized) ? normalized : undefined
}

export function getCountryTimeZoneDefault(country: unknown): string | undefined {
  if (typeof country !== 'string') return undefined
  const normalizedCountry = country
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘]/g, "'")
    .trim()
    .toLowerCase()
  const timeZone = countryDefaults[normalizedCountry]
  return isValidTimeZone(timeZone) ? timeZone : undefined
}

export function resolveBusinessTimeZone(
  value: unknown,
  country?: unknown,
): TimeZoneResolution | undefined {
  const normalized = normalizeTimeZone(value)
  if (normalized) {
    return {
      timeZone: normalized,
      source: typeof value === 'string' && legacyTimeZones[value.trim()]
        ? 'legacy-alias'
        : 'profile',
    }
  }

  const countryDefault = getCountryTimeZoneDefault(country)
  if (countryDefault) {
    return { timeZone: countryDefault, source: 'country-default' }
  }
  return undefined
}

export function normalizeBusinessTimeZone(value: unknown, country?: unknown): string {
  return resolveBusinessTimeZone(value, country)?.timeZone ?? ''
}

export function getDeviceTimeZone(): TimeZoneResolution {
  const deviceTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const normalized = normalizeTimeZone(deviceTimeZone)
  return normalized
    ? { timeZone: normalized, source: 'device-default' }
    : { timeZone: 'UTC', source: 'device-default' }
}

export function formatDateOnly(date: Date, timeZone: string): string {
  const normalizedTimeZone = normalizeTimeZone(timeZone)
  if (!normalizedTimeZone) {
    throw new RangeError('A valid IANA timezone is required to format a business date.')
  }

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: normalizedTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  if (!values.year || !values.month || !values.day) {
    throw new RangeError('The business-local date could not be calculated.')
  }
  return `${values.year}-${values.month}-${values.day}`
}

export function getReferenceDateContext(
  timeZone?: string,
  country?: string,
  date: Date = new Date(),
): TimeZoneResolution & { referenceDate: string } {
  const resolution = timeZone === undefined || timeZone.trim() === ''
    ? country === undefined || country.trim() === ''
      ? getDeviceTimeZone()
      : resolveBusinessTimeZone(undefined, country)
    : resolveBusinessTimeZone(timeZone, country)

  if (!resolution) {
    throw new RangeError('The business timezone is invalid and has no known country default.')
  }
  return {
    ...resolution,
    referenceDate: formatDateOnly(date, resolution.timeZone),
  }
}
