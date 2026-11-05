import test from 'node:test';
import assert from 'node:assert/strict';
import { hasActiveTrustedEnrollment } from './trustedEnrollment';

test('allows an existing active trusted enrollment', () => {
  assert.equal(hasActiveTrustedEnrollment({ exists: true, status: 'active' }), true);
});

test('rejects a missing enrollment record', () => {
  assert.equal(hasActiveTrustedEnrollment({ exists: false, status: 'active' }), false);
});

test('rejects inactive, pending, and revoked enrollments', () => {
  for (const status of ['inactive', 'pending', 'revoked', undefined, null]) {
    assert.equal(hasActiveTrustedEnrollment({ exists: true, status }), false);
  }
});

test('rejects unexpected enrollment status values', () => {
  assert.equal(hasActiveTrustedEnrollment({ exists: true, status: true }), false);
});
