import {
  AggregateRoot,
  type CreateEntityProps,
  UniqueEntityID,
  ValidationError
} from '@careerhub/shared-kernel';
import { InvalidJobStatusTransitionError } from '../errors';
import {
  JobArchivedEvent,
  JobClosedEvent,
  JobPublishedEvent,
  JobReopenedEvent,
  JobUpdatedEvent
} from '../events';
import { JobStatus, type JobStatusValue } from '../value-objects';

export type JobProps = {
  employerIdentityId: string;
  status: JobStatus;
};

type ReconstituteJobProps = CreateEntityProps<JobProps>;

/**
 * Job aggregate — chỉ giữ phần tham gia INVARIANT (vòng đời trạng thái).
 * Các thuộc tính hiển thị (title, salary, company...) do read model/repository
 * quản lý, không thuộc aggregate này.
 *
 * Luật chuyển trạng thái (nguồn sự thật duy nhất):
 *   draft     --publish-->  published
 *   closed    --publish-->  published   (giữ nguyên hành vi code cũ)
 *   published --close---->  closed
 *   closed    --archive-->  archived
 *   closed    --reopen--->  published
 */
export class Job extends AggregateRoot<JobProps> {
  private readonly propsRef: JobProps;

  private constructor(props: ReconstituteJobProps) {
    super(props);
    this.propsRef = props.props;
  }

  static create(props: {
    id: UniqueEntityID;
    employerIdentityId: string;
  }): Job {
    if (!props.employerIdentityId.trim()) {
      throw new ValidationError('Employer identity id is required');
    }

    return new Job({
      id: props.id,
      props: {
        employerIdentityId: props.employerIdentityId.trim(),
        status: JobStatus.draft()
      }
    });
  }

  static reconstitute(props: ReconstituteJobProps): Job {
    return new Job(props);
  }

  get employerIdentityId(): string {
    return this.propsRef.employerIdentityId;
  }

  get status(): JobStatus {
    return this.propsRef.status;
  }

  publish(): void {
    this.transition(['draft', 'closed'], JobStatus.published());
    this.addDomainEvent(new JobPublishedEvent({ aggregateId: this.id }));
  }

  close(): void {
    this.transition(['published'], JobStatus.closed());
    this.addDomainEvent(new JobClosedEvent({ aggregateId: this.id }));
  }

  archive(): void {
    this.transition(['closed'], JobStatus.archived());
    this.addDomainEvent(new JobArchivedEvent({ aggregateId: this.id }));
  }

  reopen(): void {
    this.transition(['closed'], JobStatus.published());
    this.addDomainEvent(new JobReopenedEvent({ aggregateId: this.id }));
  }

  markUpdated(): void {
    this.addDomainEvent(new JobUpdatedEvent({ aggregateId: this.id }));
  }

  private transition(allowedFrom: JobStatusValue[], next: JobStatus): void {
    if (!this.propsRef.status.isOneOf(allowedFrom)) {
      throw new InvalidJobStatusTransitionError(
        this.propsRef.status.value,
        next.value
      );
    }

    this.propsRef.status = next;
  }

  validate(): void {
    if (!(this.getProps().status instanceof JobStatus)) {
      throw new ValidationError('Job status must be a JobStatus value object');
    }
  }
}
