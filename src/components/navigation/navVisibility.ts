import { isGameRoute } from '../../utils/gameRoutes';

/** Public pages (auth, legal, landing) carry no app navigation. */
const PUBLIC = /^\/(login|register|forgot-password|reset-password|verify-email|resend-verification|auth\/|impressum|datenschutz|nutzungsbedingungen|pricing|payment|willkommen)/;

/** Whether the M3 navigation bar/rail belongs on this screen. */
export const showsAppNavigation = (pathname: string, authenticated: boolean): boolean =>
  authenticated && !isGameRoute(pathname) && !PUBLIC.test(pathname);
