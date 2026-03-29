const { Client } = require('pg');
const client = new Client({
  host: 'db.ohwybcisgrmbgqeeulmm.supabase.co',
  port: 5432, database: 'postgres', user: 'postgres',
  password: 'qT7zAfXY+p.FD/@', ssl: { rejectUnauthorized: false },
});
async function cols(table) {
  const { rows } = await client.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`,
    [table]
  );
  return rows.map(r => r.column_name);
}
async function run() {
  await client.connect();
  for (const t of ['documents','leads','deals','signals','alerts']) {
    const c = await cols(t);
    console.log(`${t}: ${c.join(', ')}`);
  }
  await client.end();
}
run().catch(e => console.error(e.message));
