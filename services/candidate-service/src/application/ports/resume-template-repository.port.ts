export type ResumeTemplateRecord = {
  category: string | null;
  createdAt: Date;
  id: string;
  isActive: boolean;
  layoutData: Record<string, unknown>;
  name: string;
  thumbnail: string | null;
};

export type ResumeTemplateListItemRecord = {
  category: string | null;
  id: string;
  name: string;
  thumbnail: string | null;
};

export interface ResumeTemplateRepository {
  findActiveById(templateId: string): Promise<ResumeTemplateRecord | null>;
  listActive(): Promise<ResumeTemplateListItemRecord[]>;
}
