import { ValidationError, ValueObject } from '@careerhub/shared-kernel';

export const OFFER_STATUS_VALUES = [
  'draft',
  'sent',
  'viewed',
  'accepted',
  'rejected',
  'expired'
] as const;

export type OfferStatusValue = (typeof OFFER_STATUS_VALUES)[number];

export class OfferStatus extends ValueObject<string> {
  constructor(value: string) {
    super({ value: value.trim().toLowerCase() });
  }

  static draft()    { return new OfferStatus('draft'); }
  static sent()     { return new OfferStatus('sent'); }
  static viewed()   { return new OfferStatus('viewed'); }
  static accepted() { return new OfferStatus('accepted'); }
  static rejected() { return new OfferStatus('rejected'); }
  static expired()  { return new OfferStatus('expired'); }

  get value(): OfferStatusValue {
    return this.raw() as OfferStatusValue;
  }

  // Employer có thể chỉnh sửa khi offer chưa được candidate phản hồi
  canEmployerMutate(): boolean {
    return ['draft', 'sent', 'viewed'].includes(this.value);
  }

  isDraft(): boolean {
    return this.value === 'draft';
  }

  // Candidate có thể chấp nhận hoặc từ chối khi offer đã gửi hoặc đã xem
  isRespondable(): boolean {
    return this.value === 'sent' || this.value === 'viewed';
  }

  protected validate(props: { value: string }): void {
    if (!OFFER_STATUS_VALUES.includes(props.value as OfferStatusValue)) {
      throw new ValidationError(`Offer status '${props.value}' is invalid`);
    }
  }
}
