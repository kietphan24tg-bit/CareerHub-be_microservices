import { ValidationError, ValueObject } from '@careerhub/shared-kernel';

export const APPLICATION_STATUS_VALUES = [
  'applied',
  'reviewed',
  'shortlisted',
  'interview',
  'offer',
  'hired',
  'rejected',
  'withdrawn'
] as const;

export type ApplicationStatusValue = (typeof APPLICATION_STATUS_VALUES)[number];

const EMPLOYER_TRANSITIONS: Record<ApplicationStatusValue, ApplicationStatusValue[]> = {
  applied:     ['reviewed', 'shortlisted', 'interview', 'rejected'],
  reviewed:    ['shortlisted', 'interview', 'rejected'],
  shortlisted: ['interview', 'offer', 'rejected'],
  interview:   ['reviewed', 'shortlisted', 'offer', 'rejected'],
  offer:       ['interview', 'hired', 'rejected'],
  hired:       [],
  rejected:    [],
  withdrawn:   []
};

export class ApplicationStatus extends ValueObject<string> {
  constructor(value: string) {
    super({ value: value.trim().toLowerCase() });
  }

  static applied()     { return new ApplicationStatus('applied'); }
  static reviewed()    { return new ApplicationStatus('reviewed'); }
  static shortlisted() { return new ApplicationStatus('shortlisted'); }
  static interview()   { return new ApplicationStatus('interview'); }
  static offer()       { return new ApplicationStatus('offer'); }
  static hired()       { return new ApplicationStatus('hired'); }
  static rejected()    { return new ApplicationStatus('rejected'); }
  static withdrawn()   { return new ApplicationStatus('withdrawn'); }

  get value(): ApplicationStatusValue {
    return this.raw() as ApplicationStatusValue;
  }

  isTerminal(): boolean {
    return ['hired', 'rejected', 'withdrawn'].includes(this.value);
  }

  canWithdraw(): boolean {
    return ['applied', 'reviewed', 'shortlisted'].includes(this.value);
  }

  canEmployerTransitionTo(next: ApplicationStatus): boolean {
    return this.value !== next.value &&
      (EMPLOYER_TRANSITIONS[this.value] ?? []).includes(next.value);
  }

  protected validate(props: { value: string }): void {
    if (!APPLICATION_STATUS_VALUES.includes(props.value as ApplicationStatusValue)) {
      throw new ValidationError(`Application status '${props.value}' is invalid`);
    }
  }
}
