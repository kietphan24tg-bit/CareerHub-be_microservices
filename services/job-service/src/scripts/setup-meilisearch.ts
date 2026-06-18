import { MeiliSearch, type Index } from 'meilisearch';

const INDEX_UID = 'jobs';

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

async function main(): Promise<void> {
  const host = getRequiredEnv('MEILISEARCH_HOST');
  const apiKey = getRequiredEnv('MEILISEARCH_API_KEY');
  const client = new MeiliSearch({ host, apiKey });

  const indexes = await client.getIndexes();
  const exists = indexes.results.some((index: Index) => index.uid === INDEX_UID);

  if (!exists) {
    await client.createIndex(INDEX_UID, { primaryKey: 'id' });
  }

  const index = client.index(INDEX_UID);

  await index.updateSearchableAttributes([
    'title',
    'description',
    'companyName',
    'category',
    'city',
    'country'
  ]);

  await index.updateFilterableAttributes([
    'status',
    'slug',
    'category',
    'companyIndustry',
    'employmentType',
    'level',
    'isRemote',
    'salaryMin',
    'salaryMax',
    'city',
    'country'
  ]);

  await index.updateSortableAttributes(['createdAt', 'salaryMin', 'salaryMax']);

  console.log(`Meilisearch index "${INDEX_UID}" is configured.`);
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error(`Failed to setup Meilisearch: ${message}`);
  process.exitCode = 1;
});
