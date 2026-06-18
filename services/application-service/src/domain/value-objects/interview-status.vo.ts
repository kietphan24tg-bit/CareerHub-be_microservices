import { ValidationError, ValueObject } from '@careerhub/shared-kernel';

export const INTERVIEW_STATUS_VALUES = [
  'scheduled',
  'confirmed',
  'cancelled',
  'rescheduled'
] as const;

export type InterviewStatusValue = (typeof INTERVIEW_STATUS_VALUES)[number];

export class InterviewStatus extends ValueObject<string> {
  constructor(value: string) {
    super({ value: value.trim().toLowerCase() });
  }

  static scheduled()   { return new InterviewStatus('scheduled'); }
  static confirmed()   { return new InterviewStatus('confirmed'); }
  static cancelled()   { return new InterviewStatus('cancelled'); }
  static rescheduled() { return new InterviewStatus('rescheduled'); }

  get value(): InterviewStatusValue {
    return this.raw() as InterviewStatusValue;
  }

  // Employer có thể sửa/huỷ khi interview chưa kết thúc
  canEmployerMutate(): boolean {
    return ['scheduled', 'rescheduled', 'confirmed'].includes(this.value);
  }

  // Candidate chỉ phản hồi khi đang chờ xác nhận hoặc đang rescheduled
  canCandidateRespond(): boolean {
    return ['scheduled', 'rescheduled'].includes(this.value);
  }

  protected validate(props: { value: string }): void {
    if (!INTERVIEW_STATUS_VALUES.includes(props.value as InterviewStatusValue)) {
      throw new ValidationError(`Interview status '${props.value}' is invalid`);
    }
  }
}
