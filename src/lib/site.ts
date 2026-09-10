/** Public identity and canonical origin; safe to import without server credentials. */
export const SITE_NAME = 'Alexan Production'
export const SITE_ORIGIN = 'https://alexan.studio'

export function resolveSiteOrigin(value: string | undefined): string {
  const input = value?.trim() || SITE_ORIGIN
  const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(input) ? input : `https://${input}`)
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username || url.password || url.pathname !== '/' || url.search || url.hash
  ) {
    throw new Error('NEXT_PUBLIC_SITE_URL must be an HTTP(S) origin without a path, credentials, query, or fragment')
  }
  return url.origin
}
