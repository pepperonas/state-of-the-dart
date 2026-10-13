/**
 * The last tile of a section stretches over the empty cells of its row, so a
 * grid never ends in a hole (0.38.0: "Auswerten" had five tiles, 3 + 2 on a
 * desktop). Full class strings — Tailwind cannot see built ones.
 */
export const lastTileSpan = (count: number): string => {
  if (count < 2) return '';
  const sm = count % 2 === 1 ? 'sm:col-span-2' : '';
  const lg = count % 3 === 2 ? 'lg:col-span-2' : count % 3 === 1 ? 'lg:col-span-3' : sm ? 'lg:col-span-1' : '';
  return [sm, lg].filter(Boolean).join(' ');
};
