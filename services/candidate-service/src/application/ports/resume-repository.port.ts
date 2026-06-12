import type { ResumeAggregate } from '../../domain/resume/resume.aggregate';

export interface ResumeRepository {
  clearIsUsingByIdentityId(
    identityId: string,
    exceptResumeId?: string
  ): Promise<void>;
  deleteById(id: string): Promise<void>;
  findById(id: string): Promise<ResumeAggregate | null>;
  findByIdentityAndTemplateId(
    identityId: string,
    templateId: string
  ): Promise<ResumeAggregate | null>;
  findByIdentityId(identityId: string): Promise<ResumeAggregate[]>;
  save(resume: ResumeAggregate): Promise<void>;
  update(resume: ResumeAggregate): Promise<void>;
}
