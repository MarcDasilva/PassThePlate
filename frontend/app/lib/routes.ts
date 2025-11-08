/**
 * Centralized route definitions
 * Use these constants instead of hardcoding URLs throughout the application
 */
export const ROUTES = {
  HOME: "/",
  SIGN_IN: "/signin",
  SIGN_UP: "/signup",
  DASHBOARD: "/dashboard",
  AUTH_CALLBACK: "/auth/callback",
} as const;

/**
 * Helper function to get the dashboard redirect URL with optional next parameter
 */
export function getDashboardRedirectUrl(origin: string, next?: string): string {
  return `${origin}${next || ROUTES.DASHBOARD}`;
}
