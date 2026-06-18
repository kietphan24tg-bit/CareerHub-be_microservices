import assert from 'node:assert/strict';
import test from 'node:test';
import { ValidationError } from '@careerhub/shared-kernel';
import {
  APPLICATION_STATUS_VALUES,
  ApplicationStatus,
  type ApplicationStatusValue
} from './application-status.vo';

// Constructor & validation
test('constructor: trim và lowercase value', () => {
  const status = new ApplicationStatus('  Applied  ');
  assert.equal(status.value, 'applied');
});

test('constructor: throw nếu status không hợp lệ', () => {
  assert.throws(() => new ApplicationStatus('unknown'), ValidationError);
  assert.throws(() => new ApplicationStatus(''), ValidationError);
});

test('static factories tạo đúng value', () => {
  assert.equal(ApplicationStatus.applied().value, 'applied');
  assert.equal(ApplicationStatus.reviewed().value, 'reviewed');
  assert.equal(ApplicationStatus.shortlisted().value, 'shortlisted');
  assert.equal(ApplicationStatus.interview().value, 'interview');
  assert.equal(ApplicationStatus.offer().value, 'offer');
  assert.equal(ApplicationStatus.hired().value, 'hired');
  assert.equal(ApplicationStatus.rejected().value, 'rejected');
  assert.equal(ApplicationStatus.withdrawn().value, 'withdrawn');
});

// isTerminal()
test('isTerminal: hired, rejected, withdrawn là terminal', () => {
  assert.equal(ApplicationStatus.hired().isTerminal(), true);
  assert.equal(ApplicationStatus.rejected().isTerminal(), true);
  assert.equal(ApplicationStatus.withdrawn().isTerminal(), true);
});

test('isTerminal: các status khác không phải terminal', () => {
  const nonTerminal: ApplicationStatusValue[] = [
    'applied', 'reviewed', 'shortlisted', 'interview', 'offer'
  ];
  for (const s of nonTerminal) {
    assert.equal(new ApplicationStatus(s).isTerminal(), false, `${s} should not be terminal`);
  }
});

// canWithdraw()
test('canWithdraw: applied, reviewed, shortlisted có thể withdraw', () => {
  assert.equal(ApplicationStatus.applied().canWithdraw(), true);
  assert.equal(ApplicationStatus.reviewed().canWithdraw(), true);
  assert.equal(ApplicationStatus.shortlisted().canWithdraw(), true);
});

test('canWithdraw: interview, offer, hired, rejected, withdrawn không thể withdraw', () => {
  const nonWithdrawable: ApplicationStatusValue[] = [
    'interview', 'offer', 'hired', 'rejected', 'withdrawn'
  ];
  for (const s of nonWithdrawable) {
    assert.equal(new ApplicationStatus(s).canWithdraw(), false, `${s} should not allow withdraw`);
  }
});

// canEmployerTransitionTo() — mirror chính xác EMPLOYER_STATUS_TRANSITIONS cũ
test('employer transitions: applied -> reviewed/shortlisted/interview/rejected', () => {
  const current = ApplicationStatus.applied();
  assert.equal(current.canEmployerTransitionTo(ApplicationStatus.reviewed()), true);
  assert.equal(current.canEmployerTransitionTo(ApplicationStatus.shortlisted()), true);
  assert.equal(current.canEmployerTransitionTo(ApplicationStatus.interview()), true);
  assert.equal(current.canEmployerTransitionTo(ApplicationStatus.rejected()), true);
  assert.equal(current.canEmployerTransitionTo(ApplicationStatus.offer()), false);
  assert.equal(current.canEmployerTransitionTo(ApplicationStatus.hired()), false);
});

test('employer transitions: shortlisted -> interview/offer/rejected', () => {
  const current = ApplicationStatus.shortlisted();
  assert.equal(current.canEmployerTransitionTo(ApplicationStatus.interview()), true);
  assert.equal(current.canEmployerTransitionTo(ApplicationStatus.offer()), true);
  assert.equal(current.canEmployerTransitionTo(ApplicationStatus.rejected()), true);
  assert.equal(current.canEmployerTransitionTo(ApplicationStatus.reviewed()), false);
});

test('employer transitions: offer -> interview/hired/rejected', () => {
  const current = ApplicationStatus.offer();
  assert.equal(current.canEmployerTransitionTo(ApplicationStatus.interview()), true);
  assert.equal(current.canEmployerTransitionTo(ApplicationStatus.hired()), true);
  assert.equal(current.canEmployerTransitionTo(ApplicationStatus.rejected()), true);
  assert.equal(current.canEmployerTransitionTo(ApplicationStatus.shortlisted()), false);
});

test('employer transitions: hired/rejected/withdrawn là điểm cuối', () => {
  for (const terminal of ['hired', 'rejected', 'withdrawn'] as ApplicationStatusValue[]) {
    const current = new ApplicationStatus(terminal);
    for (const next of APPLICATION_STATUS_VALUES) {
      assert.equal(
        current.canEmployerTransitionTo(new ApplicationStatus(next)),
        false,
        `${terminal} -> ${next} should be blocked`
      );
    }
  }
});

test('canEmployerTransitionTo: same status trả về false', () => {
  assert.equal(
    ApplicationStatus.applied().canEmployerTransitionTo(ApplicationStatus.applied()),
    false
  );
});
