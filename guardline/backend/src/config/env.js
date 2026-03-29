/**
 * Valida variáveis de ambiente mínimas na subida do servidor.
 * Integrações (Anthropic, Gmail, Slack) são opcionais na Etapa 1.
 */
function validateEnv() {
  const errors = [];

  if (!process.env.DATABASE_URL) {
    errors.push('DATABASE_URL é obrigatório');
  }

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET é obrigatório e deve ter no mínimo 32 caracteres');
  }

  if (!process.env.REFRESH_TOKEN_SECRET || process.env.REFRESH_TOKEN_SECRET.length < 32) {
    errors.push('REFRESH_TOKEN_SECRET é obrigatório e deve ter no mínimo 32 caracteres');
  }

  if (process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length !== 32) {
    errors.push('ENCRYPTION_KEY, se definida, deve ter exatamente 32 caracteres (AES-256)');
  }

  if (errors.length) {
    console.error('\n❌ Erro de configuração (.env):\n');
    errors.forEach((e) => console.error('  ·', e));
    console.error('\nCopie .env.example para .env e preencha os valores.\n');
    process.exit(1);
  }
}

module.exports = { validateEnv };
