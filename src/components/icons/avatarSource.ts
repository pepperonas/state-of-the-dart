import { useEffect, useState } from 'react';

/**
 * Player avatars from game-icons.net (CC BY 3.0) are stored as `gi:<name>`.
 * Their path data (~120 kB gzip) is a separate chunk, loaded the first time
 * such an avatar is drawn — the login page and every player without one never
 * pay for it.
 */
export const GAME_ICON_PREFIX = 'gi:';

export const isGameIcon = (avatar?: string | null): avatar is string =>
  !!avatar && avatar.startsWith(GAME_ICON_PREFIX);

export const gameIconName = (avatar: string): string => avatar.slice(GAME_ICON_PREFIX.length);

type Paths = Record<string, string>;
let cache: Paths | null = null;
let pending: Promise<Paths> | null = null;

export const loadAvatarPaths = (): Promise<Paths> => {
  if (cache) return Promise.resolve(cache);
  pending ??= import('./avatarPaths').then(m => (cache = m.default));
  return pending;
};

/** The path data once loaded (null until then); starts loading only when `needed`. */
export const useAvatarPaths = (needed: boolean): Paths | null => {
  const [paths, setPaths] = useState<Paths | null>(cache);
  useEffect(() => {
    if (!needed || paths) return;
    let alive = true;
    void loadAvatarPaths().then(p => { if (alive) setPaths(p); });
    return () => { alive = false; };
  }, [needed, paths]);
  return paths;
};
