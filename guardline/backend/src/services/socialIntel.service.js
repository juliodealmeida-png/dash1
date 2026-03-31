const { prisma } = require('../config/database');
const julioService = require('./julio.service');

/**
 * Generate a personalized LinkedIn icebreaker for a lead or deal contact.
 * @param {string} leadId - Optional lead ID
 * @param {string} dealId - Optional deal ID
 * @returns {Promise<Object>} Icebreaker and social context
 */
async function generateIcebreaker(leadId, dealId) {
  if (!julioService.isConfigured()) throw new Error('NVIDIA_API_KEY não configurada');

  let person = null;
  if (leadId) {
    person = await prisma.lead.findUnique({ where: { id: leadId } });
  } else if (dealId) {
    person = await prisma.deal.findUnique({ where: { id: dealId } });
  }

  if (!person) throw new Error('Lead ou Deal não encontrado');

  const name = person.name || person.contactName || 'Prospect';
  const company = person.company || person.companyName || 'Empresa';
  const title = person.jobTitle || 'Executivo';
  const linkedin = person.contactLinkedin || person.linkedinUrl || '';

  // Simulate social data if not present
  const recentPost = person.linkedinPosts || 'Publicou recentemente sobre os desafios de escalar operações de risco em fintechs LATAM.';
  const commonInterests = 'Compartilha interesse em Prevenção à Fraude e IA Generativa.';

  const prompt = `Você é um SDR de elite especializado em prospecção personalizada.
Sua tarefa é criar um icebreaker para o LinkedIn que seja curto, autêntico e não pareça automatizado.

Dados do Prospect:
- Nome: ${name}
- Empresa: ${company}
- Cargo: ${title}
- Post recente no LinkedIn: ${recentPost}
- Interesses comuns: ${commonInterests}

Gere 3 opções de icebreaker (do mais formal ao mais casual).
Retorne SOMENTE este JSON:
{
  "prospectSummary": "resumo do perfil",
  "icebreakers": [
    { "type": "formal", "text": "..." },
    { "type": "casual", "text": "..." },
    { "type": "observation", "text": "..." }
  ],
  "reasoning": "por que essas abordagens funcionam para este perfil"
}`;

  const raw = await julioService.nvidiaChat([
    { role: 'system', content: 'Você é um assistente de prospecção inteligente.' },
    { role: 'user', content: prompt }
  ], 800);

  const analysis = julioService.extractJsonObject(raw);
  if (!analysis) throw new Error('Falha ao gerar icebreakers com IA');

  return analysis;
}

module.exports = {
  generateIcebreaker
};
