import { ValidationError, ValueObject } from '@careerhub/shared-kernel';

export const JOB_STATUSES = ['draft', 'published', 'closed', 'archived'] as const;
export type JobStatusValue = (typeof JOB_STATUSES)[number];

export class JobStatus extends ValueObject<string> {
  constructor(value: string) {
    super({
      value: value.trim().toLowerCase()
    });
  }

  static draft(): JobStatus {
    return new JobStatus('draft');
  }

  static published(): JobStatus {
    return new JobStatus('published');
  }

  static closed(): JobStatus {
    return new JobStatus('closed');
  }

  static archived(): JobStatus {
    return new JobStatus('archived');
  }

  get value(): JobStatusValue {
    return this.raw() as JobStatusValue;
  }

  is(value: JobStatusValue): boolean {
    return this.value === value;
  }

  isOneOf(values: JobStatusValue[]): boolean {
    return values.includes(this.value);
  }

  protected validate(props: { value: string }): void {
    if (!props.value) {
      throw new ValidationError('Job status is required');
    }

    if (!JOB_STATUSES.includes(props.value as JobStatusValue)) {
      throw new ValidationError('Job status is invalid');
    }
  }
}
