import assert from 'node:assert/strict';
import test from 'node:test';
import { UniqueEntityID, ValidationError } from '@careerhub/shared-kernel';
import { InvalidJobStatusTransitionError } from '../errors';
import { JobStatus, type JobStatusValue } from '../value-objects';
import { Job } from './job.aggregate';

function makeJob(status: JobStatusValue): Job {
  return Job.reconstitute({
    id: new UniqueEntityID('job-1'),
    props: {
      employerIdentityId: 'employer-1',
      status: new JobStatus(status)
    }
  });
}

test('publish: draft -> published', () => {
  const job = makeJob('draft');
  job.publish();
  assert.equal(job.status.value, 'published');
});

test('publish: closed -> published (giữ hành vi code cũ)', () => {
  const job = makeJob('closed');
  job.publish();
  assert.equal(job.status.value, 'published');
});

test('close: published -> closed', () => {
  const job = makeJob('published');
  job.close();
  assert.equal(job.status.value, 'closed');
});

test('archive: closed -> archived', () => {
  const job = makeJob('closed');
  job.archive();
  assert.equal(job.status.value, 'archived');
});

test('reopen: closed -> published', () => {
  const job = makeJob('closed');
  job.reopen();
  assert.equal(job.status.value, 'published');
});

test('reopen từ draft bị từ chối (chỉ closed mới reopen được)', () => {
  const job = makeJob('draft');
  assert.throws(() => job.reopen(), InvalidJobStatusTransitionError);
});

test('publish job đã published bị từ chối', () => {
  const job = makeJob('published');
  assert.throws(() => job.publish(), InvalidJobStatusTransitionError);
});

test('archived là trạng thái cuối, không chuyển đi đâu', () => {
  const job = makeJob('archived');
  assert.throws(() => job.publish(), InvalidJobStatusTransitionError);
  assert.throws(() => job.close(), InvalidJobStatusTransitionError);
  assert.throws(() => job.reopen(), InvalidJobStatusTransitionError);
});

// Job.create()
test('create: tạo job với trạng thái draft', () => {
  const job = Job.create({
    id: new UniqueEntityID('job-1'),
    employerIdentityId: 'employer-1'
  });
  assert.equal(job.status.value, 'draft');
  assert.equal(job.employerIdentityId, 'employer-1');
  assert.equal(job.id.toString(), 'job-1');
});

test('create: trim employerIdentityId', () => {
  const job = Job.create({
    id: new UniqueEntityID('job-1'),
    employerIdentityId: '  employer-1  '
  });
  assert.equal(job.employerIdentityId, 'employer-1');
});

test('create: throw nếu employerIdentityId rỗng', () => {
  assert.throws(
    () => Job.create({ id: new UniqueEntityID('job-1'), employerIdentityId: '' }),
    ValidationError
  );
});

test('create: throw nếu employerIdentityId chỉ có khoảng trắng', () => {
  assert.throws(
    () => Job.create({ id: new UniqueEntityID('job-1'), employerIdentityId: '   ' }),
    ValidationError
  );
});

test('create: job mới tạo có thể publish ngay', () => {
  const job = Job.create({
    id: new UniqueEntityID('job-1'),
    employerIdentityId: 'employer-1'
  });
  job.publish();
  assert.equal(job.status.value, 'published');
});
