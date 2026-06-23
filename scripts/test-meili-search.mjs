import fs from 'fs';
import { MeiliSearch } from 'meilisearch';

const env = fs.readFileSync('.env.prod', 'utf8');
const host = env.match(/^MEILISEARCH_HOST=(.+)$/m)[1].trim();
const apiKey = env.match(/^MEILISEARCH_API_KEY=(.+)$/m)[1].trim();
const client = new MeiliSearch({ host, apiKey });
const index = client.index('jobs');

const result = await index.search('', {
  limit: 5,
  offset: 0,
  filter: 'status = "published"',
  sort: ['createdAt:desc']
});

console.log({
  estimatedTotalHits: result.estimatedTotalHits,
  hits: result.hits.length,
  titles: result.hits.map((hit) => hit.title)
});
