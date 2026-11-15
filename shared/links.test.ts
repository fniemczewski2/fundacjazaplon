import { describe, expect, it } from 'vitest';
import { LINK_LIMITS, isValidLinkUrl } from './links';

describe('isValidLinkUrl', () => {
  it.each([
    'https://zaplon.org.pl',
    'http://example.com/a?b=c',
    '/',
    '/materialy',
    '/aktualnosci/wpis-1',
  ])('akceptuje %s', (url) => {
    expect(isValidLinkUrl(url)).toBe(true);
  });

  it.each([
    'javascript:alert(1)',
    'data:text/html,x',
    '//evil.example.com',
    'ftp://example.com',
    'example.com',
    'https://exa mple.com',
    '/a b',
    '',
  ])('odrzuca %j', (url) => {
    expect(isValidLinkUrl(url)).toBe(false);
  });

  it('odrzuca adres dłuższy niż limit', () => {
    expect(isValidLinkUrl(`https://a.pl/${'x'.repeat(LINK_LIMITS.url)}`)).toBe(false);
  });
});
