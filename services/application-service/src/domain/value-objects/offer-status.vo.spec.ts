import assert from 'node:assert/strict';
import test from 'node:test';
import { ValidationError } from '@careerhub/shared-kernel';
import { OfferStatus } from './offer-status.vo';

// Constructor & validation
test('constructor: trim và lowercase value', () => {
  const status = new OfferStatus('  Draft  ');
  assert.equal(status.value, 'draft');
});

test('constructor: throw nếu status không hợp lệ', () => {
  assert.throws(() => new OfferStatus('pending'), ValidationError);
  assert.throws(() => new OfferStatus(''), ValidationError);
  assert.throws(() => new OfferStatus('active'), ValidationError);
});

test('static factories tạo đúng value', () => {
  assert.equal(OfferStatus.draft().value, 'draft');
  assert.equal(OfferStatus.sent().value, 'sent');
  assert.equal(OfferStatus.viewed().value, 'viewed');
  assert.equal(OfferStatus.accepted().value, 'accepted');
  assert.equal(OfferStatus.rejected().value, 'rejected');
  assert.equal(OfferStatus.expired().value, 'expired');
});

// canEmployerMutate() — mirror EMPLOYER_MUTABLE_OFFER_STATUSES
test('canEmployerMutate: draft, sent, viewed cho phép employer sửa', () => {
  assert.equal(OfferStatus.draft().canEmployerMutate(), true);
  assert.equal(OfferStatus.sent().canEmployerMutate(), true);
  assert.equal(OfferStatus.viewed().canEmployerMutate(), true);
});

test('canEmployerMutate: accepted, rejected, expired không cho phép employer sửa', () => {
  assert.equal(OfferStatus.accepted().canEmployerMutate(), false);
  assert.equal(OfferStatus.rejected().canEmployerMutate(), false);
  assert.equal(OfferStatus.expired().canEmployerMutate(), false);
});

// isDraft()
test('isDraft: chỉ draft trả về true', () => {
  assert.equal(OfferStatus.draft().isDraft(), true);
  assert.equal(OfferStatus.sent().isDraft(), false);
  assert.equal(OfferStatus.viewed().isDraft(), false);
  assert.equal(OfferStatus.accepted().isDraft(), false);
  assert.equal(OfferStatus.rejected().isDraft(), false);
  assert.equal(OfferStatus.expired().isDraft(), false);
});

// isRespondable() — candidate có thể accept/decline
test('isRespondable: sent, viewed cho phép candidate phản hồi', () => {
  assert.equal(OfferStatus.sent().isRespondable(), true);
  assert.equal(OfferStatus.viewed().isRespondable(), true);
});

test('isRespondable: draft, accepted, rejected, expired không cho phép candidate phản hồi', () => {
  assert.equal(OfferStatus.draft().isRespondable(), false);
  assert.equal(OfferStatus.accepted().isRespondable(), false);
  assert.equal(OfferStatus.rejected().isRespondable(), false);
  assert.equal(OfferStatus.expired().isRespondable(), false);
});
