import { UniqueEntityID } from '@careerhub/shared-kernel';
import { parseResumeContent } from '../../../application/mappers/resume-response.mapper';
import { ResumeAggregate } from '../../../domain/resume/resume.aggregate';
import { ResumeOwner, ResumeTitle } from '../../../domain/resume/value-objects';
import type {
  ResumeCreateInput,
  ResumePersistenceRecord
} from '../prisma/candidate-prisma.types';

export function toResumePersistence(resume: ResumeAggregate): ResumeCreateInput {
  return {
    content: resume.content,
    id: resume.id.toString(),
    identityId: resume.identityId,
    isUsing: resume.isUsing,
    templateId: resume.templateId,
    title: resume.title.value
  };
}

export function toResumeDomain(record: ResumePersistenceRecord): ResumeAggregate {
  return ResumeAggregate.reconstitute({
    createdAt: record.createdAt,
    id: new UniqueEntityID(record.id),
    props: {
      content: parseResumeContent(record.content),
      isUsing: record.isUsing,
      owner: new ResumeOwner(record.identityId),
      templateId: record.templateId,
      title: new ResumeTitle(record.title)
    },
    updatedAt: record.updatedAt
  });
}
