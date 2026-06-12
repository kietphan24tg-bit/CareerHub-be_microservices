import { ValidationError, ValueObject } from '@careerhub/shared-kernel';

const MAX_TITLE_LENGTH = 255;

export class ResumeTitle extends ValueObject<string> {
  constructor(value: string) {
    super({
      value: typeof value === 'string' ? value.trim() : value
    });
  }

  static fromTemplate(templateName: string, headline?: string | null): ResumeTitle {
    const trimmedHeadline = headline?.trim();

    if (trimmedHeadline) {
      return new ResumeTitle(`${templateName} - ${trimmedHeadline}`);
    }

    return new ResumeTitle(templateName);
  }

  get value(): string {
    return this.raw() as string;
  }

  protected validate(props: { value: string }): void {
    if (!props.value) {
      throw new ValidationError('Resume title cannot be blank');
    }

    if (props.value.length > MAX_TITLE_LENGTH) {
      throw new ValidationError(
        `Resume title must be at most ${MAX_TITLE_LENGTH} characters`
      );
    }
  }
}
