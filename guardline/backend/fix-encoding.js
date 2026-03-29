const { Client } = require('pg');

const client = new Client({
  host: 'db.ohwybcisgrmbgqeeulmm.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'qT7zAfXY+p.FD/@',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

function fixDoubleEncoding(str) {
  if (!str || typeof str !== 'string') return str;
  try {
    const bytes = Buffer.from(str, 'latin1');
    const decoded = bytes.toString('utf8');
    if (decoded !== str && /[^\x00-\x7F]/.test(decoded)) return decoded;
  } catch {}
  return str;
}

async function fixTable(table, columns) {
  console.log(`\n🔍 Verificando ${table}...`);
  const { rows } = await client.query(`SELECT id, ${columns.join(', ')} FROM ${table} LIMIT 500`);
  let fixed = 0;
  for (const row of rows) {
    const updates = {};
    for (const col of columns) {
      const original = row[col];
      const corrected = fixDoubleEncoding(original);
      if (corrected !== original) updates[col] = corrected;
    }
    if (Object.keys(updates).length) {
      const setClauses = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`).join(', ');
      const values = [row.id, ...Object.values(updates)];
      await client.query(`UPDATE ${table} SET ${setClauses} WHERE id = $1`, values);
      fixed++;
    }
  }
  console.log(`✅ ${table}: ${fixed} linha(s) corrigida(s) de ${rows.length}`);
}

async function run() {
  console.log('🔌 Conectando...');
  await client.connect();
  console.log('✅ Conectado!\n');

  const tables = [
    { name: 'documents',    cols: ['filename', 'doc_type'] },
    { name: 'leads',        cols: ['contact_name', 'company_name', 'contact_title', 'company_industry'] },
    { name: 'deals',        cols: ['deal_name', 'company_name', 'contact_name'] },
    { name: 'signals',      cols: ['title', 'description', 'entity_name'] },
    { name: 'alerts',       cols: ['title', 'message', 'description'] },
  ];

  for (const t of tables) {
    try {
      await fixTable(t.name, t.cols);
    } catch (e) {
      if (e.message.includes('does not exist')) {
        console.log(`⏭  ${t.name}: tabela não encontrada, pulando`);
      } else {
        console.error(`❌ ${t.name}: ${e.message}`);
      }
    }
  }

  await client.end();
  console.log('\n🎉 Fix de encoding concluído!');
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
