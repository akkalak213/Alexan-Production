import assert from 'node:assert/strict'
import test from 'node:test'
import createMiddleware from 'next-intl/middleware'
import { NextRequest } from 'next/server'
import { localizedPath, routing } from '../src/i18n/routing'
import { resolveSiteOrigin, SITE_ORIGIN } from '../src/lib/site'

test('canonical origin defaults and rejects non-origin URLs', () => {
  for (const value of [undefined, '', '  ', 'alexan.studio', 'https://alexan.studio/']) {
    assert.equal(resolveSiteOrigin(value), SITE_ORIGIN)
  }
  assert.equal(resolveSiteOrigin('http://localhost:3000'), 'http://localhost:3000')
  for (const value of ['https://alexan.studio/th', 'https://user:pass@alexan.studio', 'ftp://alexan.studio', 'https://alexan.studio?x=1', 'https://alexan.studio/#x']) {
    assert.throws(() => resolveSiteOrigin(value))
  }
})

test('root stays Thai even with an English language cookie or browser preference', () => {
  const middleware = createMiddleware(routing)
  const result = middleware(new NextRequest(`${SITE_ORIGIN}/`, {
    headers: { 'accept-language': 'en-US', cookie: 'NEXT_LOCALE=en' },
  }))
  assert.equal(result.headers.get('location'), null)
  assert.equal(new URL(result.headers.get('x-middleware-rewrite')!).pathname, '/th')
})

test('legacy Thai routes redirect without losing query parameters; English stays prefixed', () => {
  const middleware = createMiddleware(routing)
  const result = middleware(new NextRequest(`${SITE_ORIGIN}/th/work?category=WEB`))
  assert.equal(result.status, 307)
  assert.equal(result.headers.get('location'), `${SITE_ORIGIN}/work?category=WEB`)
  const english = middleware(new NextRequest(`${SITE_ORIGIN}/en/work`))
  assert.equal(english.headers.get('location'), null)
  assert.equal(english.status, 200)
  assert.equal(english.headers.get('x-middleware-next'), '1')
  assert.equal(localizedPath('th'), '/')
  assert.equal(localizedPath('en'), '/en')
})

test('canonical, hreflang and social links agree for root and detail pages', async () => {
  process.env.SKIP_ENV_VALIDATION = '1'
  process.env.NEXT_PUBLIC_SITE_URL = SITE_ORIGIN
  const { pageMetadata } = await import('../src/lib/seo')
  for (const locale of ['th', 'en'] as const) {
    for (const path of ['', '/services/web-development']) {
      const meta = pageMetadata({ locale, path, title: 'Alexan Production', description: 'Studio' })
      assert.equal(meta.alternates?.canonical, localizedPath(locale, path))
      assert.equal(meta.alternates?.languages?.th, localizedPath('th', path))
      assert.equal(meta.alternates?.languages?.en, localizedPath('en', path))
      assert.equal(meta.alternates?.languages?.['x-default'], localizedPath('th', path))
      assert.equal(meta.openGraph?.url, localizedPath(locale, path))
    }
  }
})
