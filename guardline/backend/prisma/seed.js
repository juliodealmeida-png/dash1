/* eslint-disable no-console */
/**
 * Seed completo — demonstração Guardline Revenue OS
 * Login: demo@guardline.com / guardline123
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const { STAGE_PROBABILITIES } = require(path.join(__dirname, '../src/controllers/deals.constants'));

const prisma = new PrismaClient();

function daysAgo(n) {
  return new Date(Date.now() - n * 86400000);
}

function emailFromContact(contact, company) {
  const local = contact
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9.]/g, '');
  const dom = company
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .concat('.com');
  return `${local}@${dom}`;
}

/** 23 deals em estágios abertos (pipeline ativo) */
const ACTIVE_DEAL_TEMPLATES = [
  { company: 'Alfa Solutions', contact: 'João Silva', value: 24000, stage: 'proposal', source: 'linkedin', riskScore: 92, daysAgoEntry: 42, daysAgoContact: 8 },
  { company: 'Tech Ventures', contact: 'Maria Santos', value: 36000, stage: 'negotiation', source: 'referral', riskScore: 34, daysAgoEntry: 28, daysAgoContact: 2 },
  { company: 'Global Commerce', contact: 'Pedro Lima', value: 18500, stage: 'presentation', source: 'inbound', riskScore: 71, daysAgoEntry: 21, daysAgoContact: 5 },
  { company: 'DataSync Corp', contact: 'Carla Mendes', value: 52000, stage: 'negotiation', source: 'linkedin', riskScore: 28, daysAgoEntry: 35, daysAgoContact: 1 },
  { company: 'CloudBase Inc', contact: 'Roberto Costa', value: 15000, stage: 'proposal', source: 'cold_email', riskScore: 85, daysAgoEntry: 55, daysAgoContact: 12 },
  { company: 'InnovateTech', contact: 'Fernanda Dias', value: 42000, stage: 'qualified', source: 'event', riskScore: 45, daysAgoEntry: 14, daysAgoContact: 3 },
  { company: 'FinStream', contact: 'Lucas Martins', value: 28000, stage: 'proposal', source: 'referral', riskScore: 62, daysAgoEntry: 31, daysAgoContact: 7 },
  { company: 'NextLevel SaaS', contact: 'Beatriz Alves', value: 19500, stage: 'presentation', source: 'linkedin', riskScore: 38, daysAgoEntry: 18, daysAgoContact: 2 },
  { company: 'SmartLogix', contact: 'André Souza', value: 67000, stage: 'negotiation', source: 'inbound', riskScore: 21, daysAgoEntry: 22, daysAgoContact: 0 },
  { company: 'PlatformX', contact: 'Juliana Ferreira', value: 11000, stage: 'qualified', source: 'cold_email', riskScore: 79, daysAgoEntry: 40, daysAgoContact: 9 },
  { company: 'Northwind Labs', contact: 'Ricardo Prado', value: 33000, stage: 'prospecting', source: 'linkedin', riskScore: 55, daysAgoEntry: 12, daysAgoContact: 4 },
  { company: 'BlueGrid Systems', contact: 'Amanda Rocha', value: 47000, stage: 'presentation', source: 'referral', riskScore: 41, daysAgoEntry: 25, daysAgoContact: 1 },
  { company: 'Vertex Analytics', contact: 'Felipe Nunes', value: 22000, stage: 'qualified', source: 'inbound', riskScore: 68, daysAgoEntry: 19, daysAgoContact: 6 },
  { company: 'OmniData', contact: 'Patricia Gomes', value: 54000, stage: 'negotiation', source: 'event', riskScore: 25, daysAgoEntry: 48, daysAgoContact: 0 },
  { company: 'Pulse Metrics', contact: 'Gustavo Reis', value: 9800, stage: 'prospecting', source: 'cold_email', riskScore: 73, daysAgoEntry: 8, daysAgoContact: 11 },
  { company: 'Aurora Pay', contact: 'Camila Duarte', value: 31000, stage: 'proposal', source: 'linkedin', riskScore: 58, daysAgoEntry: 33, daysAgoContact: 3 },
  { company: 'Kappa Security', contact: 'Bruno Azevedo', value: 89000, stage: 'negotiation', source: 'referral', riskScore: 19, daysAgoEntry: 60, daysAgoContact: 1 },
  { company: 'Sigma Health', contact: 'Letícia Moura', value: 17500, stage: 'qualified', source: 'inbound', riskScore: 64, daysAgoEntry: 16, daysAgoContact: 5 },
  { company: 'DeltaOps', contact: 'Eduardo Pires', value: 41000, stage: 'presentation', source: 'linkedin', riskScore: 47, daysAgoEntry: 27, daysAgoContact: 2 },
  { company: 'Echo Commerce', contact: 'Renata Lopes', value: 12600, stage: 'prospecting', source: 'cold_email', riskScore: 81, daysAgoEntry: 6, daysAgoContact: 14 },
  { company: 'Foxtrot AI', contact: 'Daniel Cardoso', value: 73000, stage: 'proposal', source: 'event', riskScore: 33, daysAgoEntry: 39, daysAgoContact: 4 },
  { company: 'Gamma Finance', contact: 'Isabela Freitas', value: 25500, stage: 'qualified', source: 'referral', riskScore: 52, daysAgoEntry: 23, daysAgoContact: 7 },
  { company: 'Helix IoT', contact: 'Thiago Monteiro', value: 19200, stage: 'presentation', source: 'inbound', riskScore: 44, daysAgoEntry: 11, daysAgoContact: 1 },
];

const FRAUD_SEED = [
  { lat: -23.55, lng: -46.63, city: 'São Paulo', country: 'Brasil', type: 'Card Not Present', amount: 4200, severity: 'high', status: 'detected', riskScore: 81 },
  { lat: 40.71, lng: -74.01, city: 'New York', country: 'USA', type: 'Wire Fraud', amount: 52000, severity: 'critical', status: 'investigating', riskScore: 94 },
  { lat: 51.51, lng: -0.13, city: 'Londres', country: 'UK', type: 'Synthetic ID', amount: 11000, severity: 'high', status: 'confirmed', riskScore: 82 },
  { lat: 48.86, lng: 2.35, city: 'Paris', country: 'França', type: 'Account Takeover', amount: 7800, severity: 'high', status: 'detected', riskScore: 76 },
  { lat: 35.68, lng: 139.69, city: 'Tóquio', country: 'Japão', type: 'Phishing', amount: 3100, severity: 'medium', status: 'detected', riskScore: 58 },
  { lat: 1.35, lng: 103.82, city: 'Singapura', country: 'Singapura', type: 'Business Email Comp', amount: 95000, severity: 'critical', status: 'blocked', riskScore: 97 },
  { lat: -34.6, lng: -58.38, city: 'Buenos Aires', country: 'Argentina', type: 'Card Not Present', amount: 2100, severity: 'medium', status: 'detected', riskScore: 55 },
  { lat: 19.43, lng: -99.13, city: 'Cidade do México', country: 'México', type: 'Identity Theft', amount: 15600, severity: 'high', status: 'confirmed', riskScore: 79 },
  { lat: 25.2, lng: 55.27, city: 'Dubai', country: 'EAU', type: 'Wire Fraud', amount: 88000, severity: 'critical', status: 'investigating', riskScore: 91 },
  { lat: 52.52, lng: 13.41, city: 'Berlim', country: 'Alemanha', type: 'Synthetic ID', amount: 6400, severity: 'medium', status: 'detected', riskScore: 61 },
  { lat: 37.57, lng: 126.98, city: 'Seul', country: 'Coreia do Sul', type: 'Phishing', amount: 9200, severity: 'high', status: 'detected', riskScore: 74 },
  { lat: -33.87, lng: 151.21, city: 'Sydney', country: 'Austrália', type: 'Account Takeover', amount: 13400, severity: 'high', status: 'confirmed', riskScore: 83 },
  { lat: 55.76, lng: 37.62, city: 'Moscou', country: 'Rússia', type: 'Card Not Present', amount: 5100, severity: 'medium', status: 'detected', riskScore: 59 },
  { lat: 28.61, lng: 77.21, city: 'Nova Delhi', country: 'Índia', type: 'Wire Fraud', amount: 22000, severity: 'high', status: 'investigating', riskScore: 72 },
  { lat: 39.9, lng: 116.4, city: 'Pequim', country: 'China', type: 'Business Email Comp', amount: 41000, severity: 'critical', status: 'blocked', riskScore: 88 },
  { lat: -22.91, lng: -43.17, city: 'Rio de Janeiro', country: 'Brasil', type: 'Identity Theft', amount: 3800, severity: 'medium', status: 'detected', riskScore: 56 },
  { lat: 41.9, lng: 12.5, city: 'Roma', country: 'Itália', type: 'Phishing', amount: 2900, severity: 'low', status: 'detected', riskScore: 42 },
  { lat: 59.33, lng: 18.07, city: 'Estocolmo', country: 'Suécia', type: 'Synthetic ID', amount: 11200, severity: 'high', status: 'confirmed', riskScore: 77 },
  { lat: 45.5, lng: -73.57, city: 'Montreal', country: 'Canadá', type: 'Card Not Present', amount: 6700, severity: 'medium', status: 'detected', riskScore: 63 },
  { lat: 3.14, lng: 101.69, city: 'Kuala Lumpur', country: 'Malásia', type: 'Account Takeover', amount: 18900, severity: 'high', status: 'investigating', riskScore: 80 },
];

const FIRST_NAMES = [
  'Lucas', 'Marina', 'Pedro', 'Fernanda', 'Gustavo', 'Amanda', 'Ricardo', 'Juliana', 'Marcos', 'Patrícia',
  'Bruno', 'Carla', 'Diego', 'Luiza', 'Rafael', 'Bianca', 'Vinícius', 'Tatiana', 'Rodrigo', 'Priscila',
  'André', 'Cláudia', 'Fábio', 'Daniela', 'Henrique', 'Aline', 'Paulo', 'Renata', 'Igor', 'Sabrina',
];
const LEAD_COMPANIES = [
  'NovaPay', 'BlueGrid', 'Skyline', 'Vertex', 'OmniData', 'Pulse', 'Northwind', 'Aurora', 'Kappa', 'Zeta',
  'Lambda', 'Sigma', 'DeltaOps', 'Echo', 'Foxtrot', 'Gamma', 'Helix', 'Ion', 'Jasper', 'Krypton',
  'Lumen', 'Matrix', 'Nimbus', 'Orbit', 'Photon', 'Quantum', 'Ridge', 'Summit', 'Terra', 'Ultra',
  'Vortex', 'Waveform', 'Xenon', 'Yotta', 'Zenith', 'Arcadia', 'Beacon', 'Catalyst', 'Drift', 'Ember',
];
const LEAD_SOURCES = ['linkedin', 'referral', 'inbound', 'event', 'cold_email'];
const LEAD_STATUSES = ['new', 'contacted', 'qualifying', 'nurturing', 'hot'];

async function main() {
  console.log('🌱 Iniciando seed Guardline…');

  await prisma.refreshToken.deleteMany();
  await prisma.automationLog.deleteMany();
  await prisma.automationRecipe.deleteMany();
  await prisma.signal.deleteMany();
  await prisma.dealEmail.deleteMany();
  await prisma.dealActivity.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.fraudEvent.deleteMany();
  await prisma.integration.deleteMany();
  await prisma.investorDeal.deleteMany();
  await prisma.julioBrief.deleteMany();
  await prisma.julioConversation.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash('guardline123', 10);

  const user = await prisma.user.create({
    data: {
      email: 'demo@guardline.com',
      password: hashedPassword,
      name: 'Ana Paula',
      company: 'Guardline Corp',
      role: 'founder',
      avatar: 'AP',
    },
  });

  console.log(`✓ Usuário demo: ${user.email} / guardline123`);

  const julio = await prisma.user.create({
    data: {
      email: 'julio.dealmeida@guardline.io',
      password: hashedPassword,
      name: 'Julio Almeida',
      company: 'Guardline',
      role: 'admin',
      avatar: 'JA',
    },
  });

  console.log(`✓ Usuário: ${julio.email} / guardline123`);

  const createdDeals = [];
  for (const t of ACTIVE_DEAL_TEMPLATES) {
    const entryDate = daysAgo(t.daysAgoEntry);
    const contactDate = daysAgo(t.daysAgoContact);
    const stageChangedAt = new Date(entryDate.getTime() + Math.random() * 5 * 86400000);
    const prob = STAGE_PROBABILITIES[t.stage] ?? 50;

    const d = await prisma.deal.create({
      data: {
        title: `Deal — ${t.company}`,
        companyName: t.company,
        contactName: t.contact,
        contactEmail: emailFromContact(t.contact, t.company),
        contactPhone: `11${String(900000000 + createdDeals.length * 137).slice(0, 9)}`,
        value: t.value,
        stage: t.stage,
        source: t.source,
        riskScore: t.riskScore,
        probability: prob,
        forecastCategory: t.stage === 'negotiation' ? 'committed' : 'pipeline',
        ownerId: user.id,
        createdAt: entryDate,
        stageChangedAt,
        lastContactAt: contactDate,
        activities: {
          create: [
            {
              type: 'note',
              title: 'Entrada no pipeline',
              note: `Origem: ${t.source}`,
              date: entryDate,
            },
            {
              type: 'call',
              title: 'Último contato registrado',
              date: contactDate,
            },
          ],
        },
      },
    });
    createdDeals.push(d);
  }

  const firstDealId = createdDeals[0].id;

  /* Fechados nos últimos 90d — win rate no dashboard */
  const closedWon = [
    { company: 'Beta Industries', value: 12000, daysAgoClose: 25 },
    { company: 'Gamma Retail', value: 18500, daysAgoClose: 45 },
    { company: 'Zeta Cloud', value: 22000, daysAgoClose: 70 },
    { company: 'Omega Labs', value: 31000, daysAgoClose: 12 },
    { company: 'Theta Media', value: 8700, daysAgoClose: 88 },
  ];
  for (const c of closedWon) {
    const close = daysAgo(c.daysAgoClose);
    await prisma.deal.create({
      data: {
        title: `Won — ${c.company}`,
        companyName: c.company,
        contactName: 'Contato Principal',
        contactEmail: `contato@${c.company.toLowerCase().replace(/\s/g, '')}.com`,
        value: c.value,
        stage: 'won',
        source: 'referral',
        probability: 100,
        riskScore: 8,
        ownerId: user.id,
        createdAt: daysAgo(c.daysAgoClose + 40),
        stageChangedAt: close,
        lastContactAt: close,
        actualCloseDate: close,
      },
    });
  }

  const closedLost = [
    { company: 'Legacy Corp', value: 8000, daysAgoClose: 30 },
    { company: 'Stale SaaS', value: 14000, daysAgoClose: 55 },
    { company: 'NoFit Ltd', value: 5000, daysAgoClose: 78 },
  ];
  for (const c of closedLost) {
    const close = daysAgo(c.daysAgoClose);
    await prisma.deal.create({
      data: {
        title: `Lost — ${c.company}`,
        companyName: c.company,
        value: c.value,
        stage: 'lost',
        source: 'cold_email',
        probability: 0,
        riskScore: 70,
        lostReason: 'timing',
        ownerId: user.id,
        createdAt: daysAgo(c.daysAgoClose + 50),
        stageChangedAt: close,
        lastContactAt: close,
        actualCloseDate: close,
      },
    });
  }

  console.log(`✓ ${ACTIVE_DEAL_TEMPLATES.length} deals ativos + ${closedWon.length} ganhos + ${closedLost.length} perdidos`);

  const leads = [];
  for (let n = 1; n <= 50; n++) {
    const score = 35 + ((n * 17) % 55);
    const L = await prisma.lead.create({
      data: {
        name: `${FIRST_NAMES[(n - 1) % FIRST_NAMES.length]} ${String.fromCharCode(65 + (n % 26))}.`,
        email: `lead${n}@${LEAD_COMPANIES[(n - 1) % LEAD_COMPANIES.length].toLowerCase()}.io`,
        company: `${LEAD_COMPANIES[(n - 1) % LEAD_COMPANIES.length]} Ltda`,
        jobTitle: n % 4 === 0 ? 'CFO' : n % 3 === 0 ? 'Head of Sales' : 'Founder',
        source: LEAD_SOURCES[n % LEAD_SOURCES.length],
        status: LEAD_STATUSES[n % LEAD_STATUSES.length],
        score: n === 3 ? 91 : n === 7 ? 78 : n === 11 ? 85 : score,
        scoreBreakdown: JSON.stringify({ fit: 7, intent: 6, engagement: 5 + (n % 4) }),
        ownerId: user.id,
        lastContactAt: daysAgo(n % 14),
        createdAt: daysAgo(n % 45),
      },
    });
    leads.push(L);
  }
  console.log('✓ 50 leads criados');

  const campaign = await prisma.campaign.create({
    data: {
      name: 'LinkedIn ABM Q1',
      type: 'linkedin',
      status: 'active',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-03-31'),
      budget: 4800,
      targetLeads: 200,
      description: 'ABM ICP fintech',
      ownerId: user.id,
      leads: { connect: leads.slice(0, 12).map((l) => ({ id: l.id })) },
    },
  });

  await prisma.campaign.create({
    data: {
      name: 'Inbound orgânico',
      type: 'inbound',
      status: 'active',
      startDate: new Date('2025-01-15'),
      budget: 0,
      targetLeads: 500,
      ownerId: user.id,
      leads: { connect: leads.slice(12, 22).map((l) => ({ id: l.id })) },
    },
  });

  console.log(`✓ Campanhas (principal: ${campaign.name})`);

  await prisma.fraudEvent.createMany({
    data: FRAUD_SEED.map((f, i) => ({
      externalId: `seed-frd-${i + 1}`,
      lat: f.lat,
      lng: f.lng,
      city: f.city,
      country: f.country,
      type: f.type,
      amount: f.amount,
      severity: f.severity,
      status: f.status,
      riskScore: f.riskScore,
      detectedAt: daysAgo(i % 14),
    })),
  });
  console.log(`✓ ${FRAUD_SEED.length} fraud events`);

  await prisma.signal.createMany({
    data: [
      {
        type: 'deal_stalled',
        severity: 'warning',
        title: 'Deal sem atividade',
        message: `${ACTIVE_DEAL_TEMPLATES[0].company} sem resposta há vários dias — priorizar follow-up.`,
        dealId: firstDealId,
        read: false,
      },
      {
        type: 'deal_advanced',
        severity: 'info',
        title: 'Pipeline em movimento',
        message: 'Negociações com ticket médio acima da meta na semana.',
        read: false,
      },
      {
        type: 'lead_scored',
        severity: 'info',
        title: 'Leads quentes',
        message: '3 leads com score > 85 aguardando primeiro contato.',
        read: false,
      },
      {
        type: 'deal_risk',
        severity: 'critical',
        title: 'Risco elevado',
        message: 'CloudBase Inc: risco 85+ e proposta sem abertura confirmada.',
        read: false,
      },
    ],
  });
  console.log('✓ Sinais iniciais');

  /**
   * Triggers alinhados ao motor atual: stage_changed | new_lead | * | all
   * (Recipes com no_contact_N_days ficam documentados na descrição para n8n futuro.)
   */
  const recipes = [
    {
      name: 'Follow-up após mudança de estágio',
      description: 'Cria task quando o deal avança (demo). Conceito: no_contact_N_days no n8n.',
      trigger: 'stage_changed',
      actions: JSON.stringify([
        {
          type: 'create_task',
          title: 'Follow-up: {company}',
          note: 'Verificar próximo passo após mudança de estágio',
          daysFromNow: 1,
        },
        { type: 'send_slack', message: '⚠️ Deal {company} mudou de estágio — revisar próximos passos.' },
      ]),
      config: JSON.stringify({ concept: 'no_contact_N_days', days: 5 }),
      active: true,
    },
    {
      name: 'Alerta deal estagnado (Slack)',
      description: 'Notifica no Slack a cada mudança de estágio (proxy para stage_too_long).',
      trigger: 'stage_changed',
      actions: JSON.stringify([
        { type: 'send_slack', message: '🟡 Pipeline: {company} — conferir tempo no estágio atual.' },
      ]),
      config: JSON.stringify({ concept: 'stage_too_long', days: 10 }),
      active: true,
    },
    {
      name: 'Celebração no Slack (ganho)',
      description: 'Dispara em qualquer stage_changed; combine com filtro no n8n para won apenas.',
      trigger: 'stage_changed',
      actions: JSON.stringify([
        { type: 'send_slack', message: '🎉 Deal avançou: {company} — bom trabalho, time!' },
      ]),
      config: JSON.stringify({ targetStage: 'won' }),
      active: true,
    },
    {
      name: 'Webhook n8n — pipeline',
      trigger: 'stage_changed',
      actions: JSON.stringify([{ type: 'n8n_webhook', webhookPath: 'guardline-stage-changed' }]),
      config: JSON.stringify({}),
      active: true,
    },
    {
      name: 'Novo lead → Slack',
      trigger: 'new_lead',
      actions: JSON.stringify([
        { type: 'send_slack', message: '✨ Novo lead na fila: {company} — qualificar nas próximas 2h.' },
      ]),
      active: true,
    },
    {
      name: 'Novo lead → n8n',
      trigger: 'new_lead',
      actions: JSON.stringify([{ type: 'n8n_webhook', webhookPath: 'guardline-new-lead' }]),
      active: true,
    },
    {
      name: 'Boas-vindas lead (Slack)',
      trigger: 'new_lead',
      actions: JSON.stringify([
        { type: 'send_slack', message: '📥 Lead capturado — origem registrada no CRM (Guardline).' },
      ]),
      active: true,
    },
    {
      name: 'Automação catch-all (demo)',
      description: 'Usa trigger * para testes manuais de triggerAutomations.',
      trigger: '*',
      actions: JSON.stringify([{ type: 'send_slack', message: '⚡ Recipe catch-all disparou (demo).' }]),
      active: false,
    },
  ];

  for (const r of recipes) {
    await prisma.automationRecipe.create({ data: { ...r, ownerId: user.id } });
  }
  console.log(`✓ ${recipes.length} automation recipes`);

  const recipeFollowUp = await prisma.automationRecipe.findFirst({
    where: { name: 'Follow-up após mudança de estágio' },
  });
  if (recipeFollowUp) {
    await prisma.automationLog.create({
      data: {
        recipeId: recipeFollowUp.id,
        dealId: firstDealId,
        status: 'success',
        result: JSON.stringify([{ ok: true }]),
        duration: 420,
        triggeredBy: 'seed',
        userId: user.id,
      },
    });
  }

  await prisma.integration.createMany({
    data: [
      {
        type: 'gmail',
        status: 'disconnected',
        userId: user.id,
        metadata: JSON.stringify({ email: user.email }),
      },
      {
        type: 'slack',
        status: 'connected',
        userId: user.id,
        metadata: JSON.stringify({ workspace: 'Guardline Team' }),
      },
      {
        type: 'n8n',
        status: 'connected',
        userId: user.id,
        metadata: JSON.stringify({ baseUrl: process.env.N8N_BASE_URL || 'http://localhost:5678' }),
      },
      {
        type: 'whatsapp',
        status: 'error',
        userId: user.id,
        errorMessage: 'Token expirado (demo)',
        metadata: JSON.stringify({ phone: '+55 11 99999-9999' }),
      },
    ],
  });

  await prisma.investorDeal.createMany({
    data: [
      {
        investorName: 'Alex Rivera',
        firm: 'Horizon VC',
        type: 'vc',
        ticketMin: 150000,
        ticketMax: 500000,
        stage: 'first_meeting',
        probability: 72,
        lastContactAt: daysAgo(3),
        ownerId: user.id,
      },
      {
        investorName: 'Patricia Bloom',
        firm: 'Lattice Angels',
        type: 'angel',
        ticketMin: 100000,
        ticketMax: 250000,
        stage: 'cold_outreach',
        probability: 35,
        lastContactAt: daysAgo(10),
        ownerId: user.id,
      },
      {
        investorName: 'Jordan Lee',
        firm: 'Summit Growth',
        type: 'growth',
        ticketMin: 80000,
        ticketMax: 200000,
        stage: 'due_diligence',
        probability: 55,
        lastContactAt: daysAgo(1),
        ownerId: user.id,
      },
      {
        investorName: 'Sam Okonkwo',
        firm: 'Pan-Africa Ventures',
        type: 'vc',
        ticketMin: 200000,
        ticketMax: 800000,
        stage: 'interest_confirmed',
        probability: 48,
        lastContactAt: daysAgo(5),
        ownerId: user.id,
      },
    ],
  });

  await prisma.julioBrief.create({
    data: {
      content: JSON.stringify({
        items: [
          {
            priority: 'P1',
            title: 'Alfa Solutions',
            detail: 'Sem contato há 8+ dias; proposta em aberto — ligar hoje.',
            action: 'Ligar antes das 14h',
          },
          {
            priority: 'P2',
            title: 'Win rate por fonte',
            detail: 'Cold email com conversão abaixo da média vs LinkedIn.',
            action: 'Revisar sequências',
          },
          {
            priority: 'P3',
            title: 'Forecast do mês',
            detail: 'Gap para meta: concentrar negociações em Tech Ventures e SmartLogix.',
            action: 'Atualizar CRM',
          },
          {
            priority: 'P2',
            title: 'Leads quentes',
            detail: 'Múltiplos leads score > 85 aguardando SDR.',
            action: 'Distribuir fila',
          },
          {
            priority: 'P3',
            title: 'Fraud map',
            detail: 'Volume estável; monitorar eventos críticos em NY e Singapura.',
            action: 'Ver Security',
          },
        ],
        forecastNarrative:
          'Committed ancora-se em negociações de ticket médio-alto; best case depende de fechar 2 propostas antes do fim do mês.',
        bullets: [
          'Priorizar Alfa Solutions e CloudBase (inatividade).',
          'Manter cadência em leads LinkedIn score > 80.',
        ],
      }),
      type: 'daily',
      userId: user.id,
    },
  });

  console.log('\n✅ Seed concluído!');
  console.log('   Login: demo@guardline.com / guardline123');
  var _p = process.env.PORT || '4000';
  console.log('   URL:   http://localhost:' + _p + '\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
