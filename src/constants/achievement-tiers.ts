/**
 * The five rungs every achievement ladder has, and the only place their artwork
 * lives. `multiplier` scales the exercise's base value from
 * src/lib/achievement-scale.ts, so Gold is the base itself — a solid,
 * respectable effort — and Diamond is the cap: there is deliberately nothing
 * above it, which is what keeps a 2000 kg bench press badge from existing.
 *
 * `material` is artwork rather than theme tokens, the same call
 * `card-colors.ts` makes for a template cover, and for the same reason: a badge
 * sits on a surface as an object in its own right, so there is no dark variant.
 * A locked badge is drawn from the theme instead.
 *
 * The two colours are the same metal lit and unlit: `dark` is a facet turned
 * away from the light, `light` one facing it, and every facet of the solid in
 * src/lib/badge-mesh.ts lands somewhere between them. `spec` is the highlight —
 * warm for the warm metals, cool for the cold ones — and `gloss` how hard it
 * bites.
 */
export type BadgeMaterialColors = {
  dark: string;
  light: string;
  spec: string;
  gloss: number;
};

export type AchievementTier = {
  id: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  name: string;
  numeral: string;
  multiplier: number;
  material: BadgeMaterialColors;
};

export const TIERS: readonly AchievementTier[] = [
  {
    id: 'bronze',
    name: 'Bronze',
    numeral: 'I',
    multiplier: 0.5,
    material: {
      dark: '#7C3F1A',
      light: '#F1BE8D',
      spec: '#FFF1DE',
      gloss: 0.5,
    },
  },
  {
    id: 'silver',
    name: 'Silver',
    numeral: 'II',
    multiplier: 0.75,
    material: {
      dark: '#68727E',
      light: '#EAF0F6',
      spec: '#FFFFFF',
      gloss: 0.68,
    },
  },
  {
    id: 'gold',
    name: 'Gold',
    numeral: 'III',
    multiplier: 1,
    material: {
      dark: '#A96700',
      light: '#FFDD77',
      spec: '#FFFAE4',
      gloss: 0.74,
    },
  },
  {
    id: 'platinum',
    name: 'Platinum',
    numeral: 'IV',
    multiplier: 1.3,
    material: {
      dark: '#175A85',
      light: '#ABEAF8',
      spec: '#F4FEFF',
      gloss: 0.8,
    },
  },
  {
    id: 'diamond',
    name: 'Diamond',
    numeral: 'V',
    multiplier: 1.7,
    material: {
      dark: '#4626A6',
      light: '#D5C2FF',
      spec: '#F8F4FF',
      gloss: 0.86,
    },
  },
];

export const TIER_COUNT = TIERS.length;
