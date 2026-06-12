import type { JobRepository } from '../ports';

const JOB_SLUG_WRITE_RETRY_LIMIT = 3;

type PrismaLikeError = {
  code?: string;
  meta?: {
    target?: string[] | string;
  };
};

export function slugifyJobTitle(value: string): string {
  const slug = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || `job-${Date.now()}`;
}

export async function createUniqueJobSlug(
  jobRepository: JobRepository,
  title: string,
  excludeJobId?: string
): Promise<string> {
  const baseSlug = slugifyJobTitle(title);
  let candidateSlug = baseSlug;
  let suffix = 2;

  while (await jobRepository.slugExists(candidateSlug, excludeJobId)) {
    candidateSlug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return candidateSlug;
}

export function isSlugUniqueConstraintError(error: unknown): boolean {
  const prismaError = error as PrismaLikeError;

  if (prismaError.code !== 'P2002') {
    return false;
  }

  const target = prismaError.meta?.target;

  if (!target) {
    return true;
  }

  return Array.isArray(target) ? target.includes('slug') : target.includes('slug');
}

export async function writeJobWithUniqueSlug<T>(
  jobRepository: JobRepository,
  title: string,
  excludeJobId: string | undefined,
  write: (slug: string) => Promise<T>
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < JOB_SLUG_WRITE_RETRY_LIMIT; attempt += 1) {
    const slug = await createUniqueJobSlug(jobRepository, title, excludeJobId);

    try {
      return await write(slug);
    } catch (error) {
      if (!isSlugUniqueConstraintError(error)) {
        throw error;
      }

      lastError = error;
    }
  }

  throw lastError;
}
