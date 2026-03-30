/**
 * Cria / atualiza super-admin julio.dealmeida@guardline.io no banco Railway.
 * Uso:
 *   railway run node scripts/create-admin.js
 *   ou: DATABASE_URL=<url> node scripts/create-admin.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const ADMIN_EMAIL    = 'julio.dealmeida@guardline.io';
const ADMIN_PASSWORD = 'Guardline@2026';
const ADMIN_NAME     = 'Julio de Almeida';
const ADMIN_ROLE     = 'admin';
const ADMIN_COMPANY  = 'Guardline';
const ADMIN_AVATAR   = 'JA';

async function main() {
  console.log('🔑  Conectando ao banco:', process.env.DATABASE_URL ? process.env.DATABASE_URL.split('@')[1] : 'local');

  const hashed = await bcrypt.hash(ADMIN_PASSWORD, 12);

  const user = await prisma.user.upsert({
    where:  { email: ADMIN_EMAIL },
    update: {
      password: hashed,
      role:     ADMIN_ROLE,
      name:     ADMIN_NAME,
      company:  ADMIN_COMPANY,
      avatar:   ADMIN_AVATAR,
    },
    create: {
      email:    ADMIN_EMAIL,
      password: hashed,
      name:     ADMIN_NAME,
      company:  ADMIN_COMPANY,
      role:     ADMIN_ROLE,
      avatar:   ADMIN_AVATAR,
    },
  });

  console.log('');
  console.log('✅  Super-admin criado / atualizado com sucesso!');
  console.log('─────────────────────────────────────────────');
  console.log('   ID    :', user.id);
  console.log('   Email :', user.email);
  console.log('   Role  :', user.role);
  console.log('   Senha :', ADMIN_PASSWORD, '  ← troque após o primeiro login');
  console.log('─────────────────────────────────────────────');
}

main()
  .catch(e => { console.error('❌  Erro:', e.message || e); process.exit(1); })
  .finally(() => prisma.$disconnect());
