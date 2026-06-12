export type ResumeContentShape = {
  address?: string | null;
  avatarUrl?: string | null;
  awards: Array<Record<string, unknown>>;
  certifications: Array<Record<string, unknown>>;
  educations: Array<Record<string, unknown>>;
  email?: string | null;
  experiences: Array<Record<string, unknown>>;
  fullName?: string | null;
  githubUrl?: string | null;
  headline?: string | null;
  linkedinUrl?: string | null;
  phone?: string | null;
  portfolioUrl?: string | null;
  projects: Array<Record<string, unknown>>;
  skills: Array<Record<string, unknown>>;
  summary?: string | null;
};

export function parseResumeContent(contentJson: string): ResumeContentShape {
  try {
    const parsed = JSON.parse(contentJson) as Partial<ResumeContentShape>;

    return {
      address: parsed.address ?? null,
      avatarUrl: parsed.avatarUrl ?? null,
      awards: parsed.awards ?? [],
      certifications: parsed.certifications ?? [],
      educations: parsed.educations ?? [],
      email: parsed.email ?? null,
      experiences: parsed.experiences ?? [],
      fullName: parsed.fullName ?? null,
      githubUrl: parsed.githubUrl ?? null,
      headline: parsed.headline ?? null,
      linkedinUrl: parsed.linkedinUrl ?? null,
      phone: parsed.phone ?? null,
      portfolioUrl: parsed.portfolioUrl ?? null,
      projects: parsed.projects ?? [],
      skills: parsed.skills ?? [],
      summary: parsed.summary ?? null
    };
  } catch {
    return {
      address: null,
      avatarUrl: null,
      awards: [],
      certifications: [],
      educations: [],
      email: null,
      experiences: [],
      fullName: null,
      githubUrl: null,
      headline: null,
      linkedinUrl: null,
      phone: null,
      portfolioUrl: null,
      projects: [],
      skills: [],
      summary: ''
    };
  }
}

export function buildResumeContentFromDto(
  dto: Record<string, unknown> & {
    awards: unknown[];
    certifications: unknown[];
    educations: unknown[];
    experiences: unknown[];
    projects: unknown[];
    skills: unknown[];
  }
): ResumeContentShape {
  return {
    address: (dto.address as string | null | undefined) ?? null,
    avatarUrl: (dto.avatarUrl as string | null | undefined) ?? null,
    awards: (dto.awards as ResumeContentShape['awards']) ?? [],
    certifications: (dto.certifications as ResumeContentShape['certifications']) ?? [],
    educations: (dto.educations as ResumeContentShape['educations']) ?? [],
    email: (dto.email as string | null | undefined) ?? null,
    experiences: (dto.experiences as ResumeContentShape['experiences']) ?? [],
    fullName: (dto.fullName as string | null | undefined) ?? null,
    githubUrl: (dto.githubUrl as string | null | undefined) ?? null,
    headline: (dto.headline as string | null | undefined) ?? null,
    linkedinUrl: (dto.linkedinUrl as string | null | undefined) ?? null,
    phone: (dto.phone as string | null | undefined) ?? null,
    portfolioUrl: (dto.portfolioUrl as string | null | undefined) ?? null,
    projects: (dto.projects as ResumeContentShape['projects']) ?? [],
    skills: (dto.skills as ResumeContentShape['skills']) ?? [],
    summary: (dto.summary as string | null | undefined) ?? null
  };
}
