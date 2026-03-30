const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

function readArg(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return null;
  const v = process.argv[idx + 1];
  if (!v || v.startsWith('--')) return null;
  return v;
}

function initialsFromName(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const first = parts[0] ? parts[0][0] : 'U';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

async function main() {
  const email = readArg('--email') || process.env.USER_EMAIL || 'julio.dealmeida@guardline.io';
  const password = readArg('--password') || process.env.USER_PASSWORD || 'guardline123';
  const name = readArg('--name') || process.env.USER_NAME || 'Julio Almeida';
  const company = readArg('--company') || process.env.USER_COMPANY || 'Guardline';
  const role = readArg('--role') || process.env.USER_ROLE || 'admin';

  const prisma = new PrismaClient();
  try {
    const hashed = await bcrypt.hash(String(password), 10);
    const user = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        password: hashed,
        name,
        company,
        role,
        avatar: initialsFromName(name),
      },
      update: {
        password: hashed,
        name,
        company,
        role,
        avatar: initialsFromName(name),
      },
    });

    process.stdout.write(
      JSON.stringify(
        { ok: true, id: user.id, email: user.email, role: user.role, name: user.name, company: user.company || null },
        null,
        2
      ) + '\n'
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  process.stderr.write(String(e && (e.stack || e.message) ? e.stack || e.message : e) + '\n');
  process.exitCode = 1;
});

