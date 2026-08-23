/* Seed names are catalogue entries, not phrases people type: they invert on a
   comma ("Running, Treadmill"), carry a qualifier after a dash, footnote
   themselves in parentheses, and use a slash for alternatives — all of which
   read as noise (or, for the dash, as an exclusion operator) in a search box. */
function searchablePhrase(name: string) {
  const flat = name
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+-\s+/g, ' ')
    .replace(/\//g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const inverted = flat.match(/^(.+?),\s*(.+)$/);
  return inverted ? `${inverted[2]} ${inverted[1]}` : flat;
}

export function techniqueSearchUrl(name: string) {
  const query = encodeURIComponent(`${searchablePhrase(name)} proper form technique`);
  return `https://www.youtube.com/results?search_query=${query}`;
}
