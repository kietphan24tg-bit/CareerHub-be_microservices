import assert from 'node:assert/strict';
import test from 'node:test';
import {
  resolveAssetOrigin,
  resolveLayoutAssetUrls,
  toAbsoluteAssetUrl
} from './resume-asset-url.util';

test('resolveAssetOrigin trims trailing slash and falls back to localhost', () => {
  assert.equal(resolveAssetOrigin('http://api.example.com/'), 'http://api.example.com');
  assert.equal(resolveAssetOrigin(), 'http://localhost:4000');
});

test('toAbsoluteAssetUrl keeps absolute and data urls unchanged', () => {
  const origin = 'http://api.example.com';

  assert.equal(toAbsoluteAssetUrl('https://cdn.example.com/a.png', origin), 'https://cdn.example.com/a.png');
  assert.equal(toAbsoluteAssetUrl('data:image/png;base64,abc', origin), 'data:image/png;base64,abc');
  assert.equal(
    toAbsoluteAssetUrl('/templates/thumb.png', origin),
    'http://api.example.com/templates/thumb.png'
  );
  assert.equal(toAbsoluteAssetUrl(null, origin), null);
});

test('resolveLayoutAssetUrls resolves placeholder asset paths only', () => {
  const resolved = resolveLayoutAssetUrls(
    {
      avatar: {
        placeholder: '/templates/preview-avatars/modern.svg'
      },
      nested: {
        value: '/should-not-change'
      }
    },
    'http://api.example.com'
  );

  assert.equal(
    (resolved.avatar as { placeholder: string }).placeholder,
    'http://api.example.com/templates/preview-avatars/modern.svg'
  );
  assert.equal((resolved.nested as { value: string }).value, '/should-not-change');
});