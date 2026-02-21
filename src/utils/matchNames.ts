const ADJECTIVES = [
  'Blitz', 'Golden', 'Silent', 'Iron', 'Swift',
  'Shadow', 'Thunder', 'Crystal', 'Crimson', 'Frost',
  'Solar', 'Phantom', 'Copper', 'Midnight', 'Titan',
  'Ember', 'Storm', 'Jade', 'Silver', 'Neon',
];

const NOUNS = [
  'Arrow', 'Bull', 'Flight', 'Triple', 'Double',
  'Dart', 'Board', 'Oche', 'Leg', 'Checkout',
  'Treble', 'Marker', 'Point', 'Strike', 'Round',
  'Barrel', 'Shaft', 'Ring', 'Sector', 'Finish',
];

/**
 * Generate a deterministic match name from a UUID.
 * Same ID always produces the same name.
 */
export function generateMatchName(matchId: string): string {
  // Use first 8 hex chars of the UUID as seed
  const hex = matchId.replace(/-/g, '').slice(0, 8);
  const seed = parseInt(hex, 16);

  const adjIdx = seed % ADJECTIVES.length;
  const nounIdx = Math.floor(seed / ADJECTIVES.length) % NOUNS.length;

  return `${ADJECTIVES[adjIdx]} ${NOUNS[nounIdx]}`;
}
