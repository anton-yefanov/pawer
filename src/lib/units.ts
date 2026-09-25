/**
 * The database stores kilograms and metres and nothing else. Pounds and miles
 * exist only between these functions and the user's eyeballs.
 */

import { getLocales } from 'expo-localization';

import { t } from '@/i18n';

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

// Hundredths only strip the kg↔lb conversion noise. Snapping to plate steps
// would silently turn a logged 2.8 kg band or micro-plate into 3.
export function roundForDisplay(value: number, _unit: WeightUnit): number {
  return Math.round(value * 100) / 100;
}

// Read from the region, not the language: the decimal pad's key follows the
// region too, so an English-language phone in Germany types and reads commas.
const locale = getLocales()[0];
const DECIMAL = locale?.decimalSeparator ?? '.';
const GROUPING = locale?.digitGroupingSeparator ?? ',';

export function unitLabel(unit: WeightUnit | DistanceUnit | 't'): string {
  return t(`units.${unit}`);
}

export function formatDecimal(value: number): string {
  return String(Math.round(value * 100) / 100).replace('.', DECIMAL);
}

function formatGrouped(value: number): string {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, GROUPING);
}

export function formatWeight(kg: number | null, unit: WeightUnit): string {
  if (kg == null) return '—';
  return `${formatDecimal(roundForDisplay(kgToDisplay(kg, unit), unit))} ${unitLabel(unit)}`;
}

/**
 * Totals rather than a single lift: kilograms roll over into tonnes so a
 * season's work reads as `26.49 t` instead of `26490 kg`. Pounds have no such
 * customary unit in the gym, so they stay pounds and only gain separators.
 */
export function formatTonnage(kg: number, unit: WeightUnit, compact = false): string {
  const value = kgToDisplay(kg, unit);
  if (compact && value === 0) return '0';
  if (unit === 'kg' && value >= 1000) {
    // Compact is for axis ticks, which are round numbers: `5 t`, not `5.00 t`.
    const tonnes = compact ? formatDecimal(value / 1000) : (value / 1000).toFixed(2).replace('.', DECIMAL);
    return `${tonnes} ${unitLabel('t')}`;
  }
  if (compact && value >= 1000) return `${formatDecimal(value / 1000)}k ${unitLabel(unit)}`;
  return `${formatGrouped(value)} ${unitLabel(unit)}`;
}

/** Splits `1,240 kg` into its parts so a display can set the unit apart. */
export function splitMeasure(text: string): { value: string; unit?: string } {
  const match = /^(.*\S)\s(\p{L}+)$/u.exec(text);
  return match ? { value: match[1], unit: match[2] } : { value: text };
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
  return `${formatDecimal(metersToDisplay(meters, unit))} ${unitLabel(unit)}`;
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
