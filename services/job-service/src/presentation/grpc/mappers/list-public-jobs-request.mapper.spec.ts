import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveListPublicJobsSalaryFilter } from './list-public-jobs-request.mapper';

test('ignores proto3 default zero salary bounds', () => {
  assert.deepEqual(resolveListPublicJobsSalaryFilter({}), {});
  assert.deepEqual(
    resolveListPublicJobsSalaryFilter({
      salary_min: 0,
      salary_max: 0
    }),
    {}
  );
});

test('keeps explicit positive salary filters', () => {
  assert.deepEqual(
    resolveListPublicJobsSalaryFilter({
      salary_min: 1500
    }),
    { salaryMin: 1500 }
  );

  assert.deepEqual(
    resolveListPublicJobsSalaryFilter({
      salary_max: 4000
    }),
    { salaryMax: 4000 }
  );

  assert.deepEqual(
    resolveListPublicJobsSalaryFilter({
      salary_min: 1500,
      salary_max: 4000
    }),
    { salaryMin: 1500, salaryMax: 4000 }
  );
});
