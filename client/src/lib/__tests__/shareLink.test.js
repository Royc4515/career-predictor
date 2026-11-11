import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SHARE_TOKEN_RE, newShareToken, shareUrlFor } from '../shareLink.js';

test('tokens match the server format and do not repeat', () => {
  const seen = new Set();
  for (let i = 0; i < 2000; i++) {
    const token = newShareToken();
    assert.match(token, SHARE_TOKEN_RE);
    seen.add(token);
  }
  assert.equal(seen.size, 2000);
});

test('every byte value encodes to a URL-safe token', () => {
  for (const fill of [0, 0xfb, 0xff]) {
    const token = newShareToken({ getRandomValues: (a) => a.fill(fill) });
    assert.match(token, SHARE_TOKEN_RE, `fill ${fill}: ${token}`);
  }
});

test('the link is the public page on this site', () => {
  assert.equal(shareUrlFor('AbC_def-1234', 'https://site.example/'), 'https://site.example/s/AbC_def-1234');
});
