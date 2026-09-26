/**
 * Screens where a game is being played. On these the app keeps quiet: no
 * footer, no floating report buttons, no "new version" prompt, and the screen
 * is kept awake.
 */
const GAME_ROUTE = /^\/(game|cricket|around-the-clock|shanghai|online|training\/[^/]+)\/?$/;

export const isGameRoute = (pathname: string): boolean => GAME_ROUTE.test(pathname);
