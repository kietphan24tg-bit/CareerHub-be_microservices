import fs from 'fs';
import pg from 'pg';

const env = fs.readFileSync('.env.prod', 'utf8');
const url = env.match(/^JOB_DATABASE_URL=(.+)$/m)[1];
const pool = new pg.Pool({ connectionString: url });
const count = await pool.query(
  "SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'published')::int AS published FROM jobs"
);
const sample = await pool.query('SELECT title, slug, status, salary_min, city FROM jobs ORDER BY created_at DESC LIMIT 3');
console.log(count.rows[0]);
console.log(sample.rows);
await pool.end();
