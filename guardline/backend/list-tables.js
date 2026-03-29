const { Client } = require('pg');
const client = new Client({
  host: 'db.ohwybcisgrmbgqeeulmm.supabase.co',
  port: 5432, database: 'postgres', user: 'postgres',
  password: 'qT7zAfXY+p.FD/@', ssl: { rejectUnauthorized: false },
});
async function run() {
  await client.connect();
  const { rows } = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' ORDER BY table_name
  `);
  console.log('Tables:', rows.map(r => r.table_name).join(', '));
  await client.end();
}
run().catch(e => console.error(e.message));
