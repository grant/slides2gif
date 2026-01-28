/**
 * Type-safe route definitions
 * Use these constants instead of string literals to prevent typos and ensure consistency
 */
export const Routes = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  CREATE: '/create',
  CREATE_PRESENTATION: (fileId: string) => `/create/x/${fileId}`,
  LOGIN: '/login',
  HOW_IT_WORKS: '/howitworks',
} as const;

export type Route = string;

/**
 * Type guard to check if a route is valid
 */
export function isValidRoute(path: string): boolean {
  return Object.values(Routes).some(route => {
    if (typeof route === 'function') {
      // For dynamic routes, check if path matches the pattern
      return path.startsWith('/create/x/');
    }
    return route === path;
  });
}
