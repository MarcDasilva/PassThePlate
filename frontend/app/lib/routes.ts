/**
 * Centralized route definitions
 * Use these constants instead of hardcoding URLs throughout the application
 */
export const ROUTES = {
  HOME: "/",
  SIGN_IN: "/signin",
  SIGN_UP: "/signup",
  MAP: "/map",
  ACCOUNT: "/account",
  PROFILE_SETUP: "/profile/setup",
  AUTH_CALLBACK: "/auth/callback",
} as const;

/**
 * Helper function to get the map redirect URL with optional next parameter
 */
export function getMapRedirectUrl(origin: string, next?: string): string {
  return `${origin}${next || ROUTES.MAP}`;
}
