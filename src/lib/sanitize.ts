/**
 * Sanitize user text input - strip HTML tags and control characters
 */
export function sanitizeText(input: string): string {
  return input
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove null bytes
    .replace(/\0/g, '')
    // Trim
    .trim()
}

/**
 * Sanitize a file name to prevent path traversal and special chars
 */
export function sanitizeFileName(name: string): string {
  return name
    // Remove path separators
    .replace(/[/\\]/g, '')
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove leading dots (hidden files)
    .replace(/^\.+/, '')
    // Limit length
    .slice(0, 255)
    || 'unnamed'
}

/**
 * Allowed MIME types for file uploads
 */
export const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'application/zip',
])

/**
 * Max file size in bytes (50MB)
 */
export const MAX_FILE_SIZE = 52_428_800

/**
 * Validate a URL is safe (http/https only)
 */
export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return ['http:', 'https:'].includes(parsed.protocol)
  } catch {
    return false
  }
}
