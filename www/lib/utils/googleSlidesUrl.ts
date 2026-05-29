/** Google Slides presentation IDs use URL-safe characters (length varies). */
const PRESENTATION_ID_RE = /^[a-zA-Z0-9-_]{10,}$/;

/**
 * Extract a Google Slides presentation ID from a share URL or bare ID.
 *
 * Supports:
 * - https://docs.google.com/presentation/d/{id}/edit
 * - https://docs.google.com/presentation/d/{id}
 * - bare presentation ID
 */
export function parseGoogleSlidesPresentationId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    const url = trimmed.startsWith('http') ? new URL(trimmed) : null;
    if (url) {
      const match = url.pathname.match(/\/presentation\/d\/([a-zA-Z0-9-_]+)/);
      if (match?.[1]) return match[1];
    }
  } catch {
    // Not a valid URL; fall through to bare ID check.
  }

  if (PRESENTATION_ID_RE.test(trimmed)) return trimmed;

  return null;
}
