/**
 * The database stores kilograms and metres and nothing else
 * (IMPLEMENTATION_PLAN.md §3.3). Pounds and miles exist only between these
 * functions and the user's eyeballs.
 */

export type WeightUnit = 'kg' | 'lb';
export type DistanceUnit = 'km' | 'mi';

const LB_PER_KG = 2.2046226218487757;
const M_PER_KM = 1000;
const M_PER_MI = 1609.344;

/**
 * Distance has no setting of its own — someone logging pounds is not going to
 * want kilometres.
 */
export function distanceUnitFor(unit: WeightUnit): DistanceUnit {
  return unit === 'kg' ? 'km' : 'mi';
}

export function kgToDisplay(kg: number, unit: WeightUnit): number {
  return unit === 'kg' ? kg : kg * LB_PER_KG;
}

export function displayToKg(value: number, unit: WeightUnit): number {
  return unit === 'kg' ? value : value / LB_PER_KG;
}

/**
 * Rounds to the nearest plate increment the user can actually load: 0.5 kg or
 * 1 lb. Keeps 82.5 kg from rendering as 181.87839... lb.
 */
export function roundForDisplay(value: number, unit: WeightUnit): number {
  const step = unit === 'kg' ? 0.5 : 1;
  return Math.round(value / step) * step;
}

export function formatWeight(kg: number | null, unit: WeightUnit): string {
  if (kg == null) return '—';
  const value = roundForDisplay(kgToDisplay(kg, unit), unit);
  // Drop the decimal when it is a whole number: "60 kg", not "60.0 kg".
  const text = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return `${text} ${unit}`;
}

/**
 * Totals rather than a single lift: kilograms roll over into tonnes so a
 * season's work reads as `26.49 t` instead of `26490 kg`. Pounds have no such
 * customary unit in the gym, so they stay pounds and only gain separators.
 */
export function formatTonnage(kg: number, unit: WeightUnit): string {
  const value = kgToDisplay(kg, unit);
  if (unit === 'kg' && value >= 1000) return `${(value / 1000).toFixed(2)} t`;
  return `${Math.round(value).toLocaleString()} ${unit}`;
}

/** `2:00`, or `1:20:00` once a duration runs past the hour. */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const pad = (n: number) => String(n).padStart(2, '0');
  if (s < 3600) return `${Math.floor(s / 60)}:${pad(s % 60)}`;
  return `${Math.floor(s / 3600)}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
}

export function metersToDisplay(meters: number, unit: DistanceUnit): number {
  return meters / (unit === 'km' ? M_PER_KM : M_PER_MI);
}

export function displayToMeters(value: number, unit: DistanceUnit): number {
  return value * (unit === 'km' ? M_PER_KM : M_PER_MI);
}

export function formatDistance(meters: number | null, unit: DistanceUnit): string {
  if (meters == null) return '—';
  const value = Math.round(metersToDisplay(meters, unit) * 100) / 100;
  return `${Number.isInteger(value) ? value : value.toFixed(2).replace(/0$/, '')} ${unit}`;
}

/**
 * Parses user input, accepting both `.` and `,` as the decimal separator —
 * numeric keypads in most of Europe emit a comma.
 */
export function parseDecimalInput(input: string): number | null {
  const normalised = input.trim().replace(',', '.');
  if (normalised === '') return null;
  const value = Number(normalised);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

/**
 * Time is typed as bare digits filling in from the right, the way a stopwatch
 * field behaves: `130` is 1:30, `45` is 0:45, `12000` is 1:20:00. Anything with
 * a separator already in it is read as `[hh:]mm:ss`.
 */
export function parseDurationInput(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === '') return null;

  if (trimmed.includes(':')) {
    const parts = trimmed.split(':').map((part) => Number(part.replace(/\D/g, '') || 0));
    if (parts.some((part) => !Number.isFinite(part))) return null;
    return parts.reduce((total, part) => total * 60 + part, 0);
  }

  const digits = trimmed.replace(/\D/g, '');
  if (digits === '') return null;
  const seconds = Number(digits.slice(-2));
  const minutes = Number(digits.slice(-4, -2) || 0);
  const hours = Number(digits.slice(0, -4) || 0);
  return hours * 3600 + minutes * 60 + seconds;
}
