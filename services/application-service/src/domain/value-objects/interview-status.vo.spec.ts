import assert from 'node:assert/strict';
import test from 'node:test';
import { ValidationError } from '@careerhub/shared-kernel';
import { InterviewStatus } from './interview-status.vo';

// Constructor & validation
test('constructor: trim và lowercase value', () => {
  const status = new InterviewStatus('  Scheduled  ');
  assert.equal(status.value, 'scheduled');
});

test('constructor: throw nếu status không hợp lệ', () => {
  assert.throws(() => new InterviewStatus('pending'), ValidationError);
  assert.throws(() => new InterviewStatus(''), ValidationError);
});

test('static factories tạo đúng value', () => {
  assert.equal(InterviewStatus.scheduled().value, 'scheduled');
  assert.equal(InterviewStatus.confirmed().value, 'confirmed');
  assert.equal(InterviewStatus.cancelled().value, 'cancelled');
  assert.equal(InterviewStatus.rescheduled().value, 'rescheduled');
});

// canEmployerMutate() — mirror EMPLOYER_MUTABLE_INTERVIEW_STATUSES
test('canEmployerMutate: scheduled, confirmed, rescheduled cho phép employer sửa', () => {
  assert.equal(InterviewStatus.scheduled().canEmployerMutate(), true);
  assert.equal(InterviewStatus.confirmed().canEmployerMutate(), true);
  assert.equal(InterviewStatus.rescheduled().canEmployerMutate(), true);
});

test('canEmployerMutate: cancelled không cho phép employer sửa', () => {
  assert.equal(InterviewStatus.cancelled().canEmployerMutate(), false);
});

// canCandidateRespond() — mirror CANDIDATE_RESPONDABLE_INTERVIEW_STATUSES
test('canCandidateRespond: scheduled, rescheduled cho phép candidate phản hồi', () => {
  assert.equal(InterviewStatus.scheduled().canCandidateRespond(), true);
  assert.equal(InterviewStatus.rescheduled().canCandidateRespond(), true);
});

test('canCandidateRespond: confirmed, cancelled không cho phép candidate phản hồi', () => {
  assert.equal(InterviewStatus.confirmed().canCandidateRespond(), false);
  assert.equal(InterviewStatus.cancelled().canCandidateRespond(), false);
});
