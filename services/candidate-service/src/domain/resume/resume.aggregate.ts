import {
  AggregateRoot,
  type CreateEntityProps,
  UniqueEntityID,
  ValidationError
} from '@careerhub/shared-kernel';
import type { CandidateProfileRecord } from '../../application';
import { ResumeOwnershipError } from './errors';
import type { ResumeContent } from './resume-content.types';
import { createEmptyResumeContent } from './resume-content.types';
import { ResumeOwner, ResumeTitle } from './value-objects';

export type ResumeProps = {
  content: ResumeContent;
  isUsing: boolean;
  owner: ResumeOwner;
  templateId: string | null;
  title: ResumeTitle;
};

export type CreateDraftProps = {
  id: UniqueEntityID;
  identityId: string;
  profile?: CandidateProfileRecord | null;
  templateId: string;
  templateName: string;
  createdAt?: Date;
};

export type CreateResumeProps = {
  id: UniqueEntityID;
  identityId: string;
  templateId: string;
  title: string;
  content: ResumeContent;
  createdAt?: Date;
};

type ReconstituteResumeProps = CreateEntityProps<ResumeProps>;

export class ResumeAggregate extends AggregateRoot<ResumeProps> {
  private readonly propsRef: ResumeProps;

  private constructor(props: ReconstituteResumeProps) {
    super(props);
    this.propsRef = props.props;
  }

  static create(input: CreateResumeProps): ResumeAggregate {
    const owner = new ResumeOwner(input.identityId);
    const title = new ResumeTitle(input.title);
    const now = input.createdAt ?? new Date();

    return new ResumeAggregate({
      id: input.id,
      createdAt: now,
      updatedAt: now,
      props: {
        content: input.content,
        isUsing: false,
        owner,
        templateId: input.templateId,
        title
      }
    });
  }

  static createDraft(input: CreateDraftProps): ResumeAggregate {
    const content = createEmptyResumeContent();

    if (input.profile) {
      content.fullName = input.profile.fullName;
      content.headline = input.profile.headline;
      content.phone = input.profile.phone;
      content.address = input.profile.address;
      content.avatarUrl = input.profile.avatarUrl;
      content.linkedinUrl = input.profile.linkedinUrl;
      content.githubUrl = input.profile.githubUrl;
      content.portfolioUrl = input.profile.portfolioUrl;
      content.summary = input.profile.bio ?? '';
    }

    const owner = new ResumeOwner(input.identityId);
    const now = input.createdAt ?? new Date();
    const title = ResumeTitle.fromTemplate(
      input.templateName,
      input.profile?.headline
    );

    return new ResumeAggregate({
      id: input.id,
      createdAt: now,
      updatedAt: now,
      props: {
        content,
        isUsing: false,
        owner,
        templateId: input.templateId,
        title
      }
    });
  }

  static reconstitute(props: ReconstituteResumeProps): ResumeAggregate {
    return new ResumeAggregate(props);
  }

  get identityId(): string {
    return this.propsRef.owner.value;
  }

  get owner(): ResumeOwner {
    return this.propsRef.owner;
  }

  get title(): ResumeTitle {
    return this.propsRef.title;
  }

  get content(): ResumeContent {
    return this.propsRef.content;
  }

  get templateId(): string | null {
    return this.propsRef.templateId;
  }

  get isUsing(): boolean {
    return this.propsRef.isUsing;
  }

  update(input: { content: ResumeContent; title: string }): void {
    this.propsRef.title = new ResumeTitle(input.title);
    this.propsRef.content = input.content;
  }

  markAsUsing(): void {
    if (this.propsRef.isUsing) {
      return;
    }

    this.propsRef.isUsing = true;
  }

  ensureOwnedBy(identityId: string): void {
    if (this.propsRef.owner.value !== identityId.trim()) {
      throw new ResumeOwnershipError(this.id.toString());
    }
  }

  validate(): void {
    const props = this.getProps();

    if (!(props.owner instanceof ResumeOwner)) {
      throw new ValidationError('Resume owner must be a ResumeOwner value object');
    }

    if (!(props.title instanceof ResumeTitle)) {
      throw new ValidationError('Resume title must be a ResumeTitle value object');
    }

    if (props.content === null || typeof props.content !== 'object') {
      throw new ValidationError('Resume content must be an object');
    }

    if (typeof props.isUsing !== 'boolean') {
      throw new ValidationError('Resume isUsing must be a boolean');
    }
  }
}
