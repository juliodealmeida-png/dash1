const { prisma } = require('../config/database');
const { broadcastToAll } = require('../config/socket');

const FRAUD_LOCATIONS = [
  { lat: -23.5505, lng: -46.6333, city: 'São Paulo', country: 'Brasil', weight: 15 },
  { lat: -22.9068, lng: -43.1729, city: 'Rio de Janeiro', country: 'Brasil', weight: 10 },
  { lat: -19.9191, lng: -43.9386, city: 'Belo Horizonte', country: 'Brasil', weight: 6 },
  { lat: -30.0346, lng: -51.2177, city: 'Porto Alegre', country: 'Brasil', weight: 5 },
  { lat: 25.7617, lng: -80.1918, city: 'Miami', country: 'EUA', weight: 12 },
  { lat: 40.7128, lng: -74.006, city: 'Nova York', country: 'EUA', weight: 14 },
  { lat: 34.0522, lng: -118.2437, city: 'Los Angeles', country: 'EUA', weight: 8 },
  { lat: 19.4326, lng: -99.1332, city: 'Cidade do México', country: 'México', weight: 7 },
  { lat: 51.5074, lng: -0.1278, city: 'Londres', country: 'UK', weight: 10 },
  { lat: 48.8566, lng: 2.3522, city: 'Paris', country: 'França', weight: 8 },
  { lat: 52.52, lng: 13.405, city: 'Berlim', country: 'Alemanha', weight: 6 },
  { lat: 41.9028, lng: 12.4964, city: 'Roma', country: 'Itália', weight: 5 },
  { lat: 22.3193, lng: 114.1694, city: 'Hong Kong', country: 'China', weight: 13 },
  { lat: 35.6762, lng: 139.6503, city: 'Tóquio', country: 'Japão', weight: 9 },
  { lat: 1.3521, lng: 103.8198, city: 'Singapura', country: 'Singapura', weight: 8 },
  { lat: 37.5665, lng: 126.978, city: 'Seul', country: 'Coreia', weight: 7 },
];

const FRAUD_TYPES = [
  { type: 'card_not_present', label: 'Card Not Present', weight: 30, amountRange: [500, 8000] },
  { type: 'account_takeover', label: 'Account Takeover', weight: 20, amountRange: [2000, 25000] },
  { type: 'wire_fraud', label: 'Wire Fraud', weight: 15, amountRange: [10000, 95000] },
  { type: 'identity_theft', label: 'Identity Theft', weight: 15, amountRange: [1000, 15000] },
  { type: 'phishing', label: 'Phishing', weight: 10, amountRange: [300, 5000] },
  { type: 'synthetic_id', label: 'Synthetic Identity', weight: 6, amountRange: [5000, 40000] },
  {
    type: 'business_email_compromise',
    label: 'Business Email Compromise',
    weight: 4,
    amountRange: [20000, 120000],
  },
];

function weightedRandom(items) {
  const totalWeight = items.reduce((s, i) => s + i.weight, 0);
  let random = Math.random() * totalWeight;
  for (const item of items) {
    random -= item.weight;
    if (random <= 0) return item;
  }
  return items[items.length - 1];
}

function randomInRange([min, max]) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function generateFraudEvent(io) {
  const location = weightedRandom(FRAUD_LOCATIONS);
  const fraudType = weightedRandom(FRAUD_TYPES);
  const amount = randomInRange(fraudType.amountRange);
  const severity =
    amount > 20000 ? 'critical' : amount > 8000 ? 'high' : amount > 2000 ? 'medium' : 'low';

  const latVariation = (Math.random() - 0.5) * 1.5;
  const lngVariation = (Math.random() - 0.5) * 1.5;

  const fraudEvent = await prisma.fraudEvent.create({
    data: {
      lat: location.lat + latVariation,
      lng: location.lng + lngVariation,
      city: location.city,
      country: location.country,
      type: fraudType.type,
      amount,
      currency: location.country === 'Brasil' ? 'BRL' : 'USD',
      severity,
      status: 'detected',
      riskScore:
        Math.floor(Math.random() * 30) +
        (severity === 'critical' ? 70 : severity === 'high' ? 55 : severity === 'medium' ? 40 : 20),
    },
  });

  if (io) {
    broadcastToAll(io, 'fraud:new', fraudEvent);

    if (severity === 'critical') {
      broadcastToAll(io, 'signal:new', {
        type: 'fraud_detected',
        severity: 'critical',
        title: '🔴 Fraude Crítica Detectada',
        message: `${location.city}: ${fraudType.label} · $${amount.toLocaleString('pt-BR')}`,
        createdAt: new Date(),
      });
    }
  }

  return fraudEvent;
}

function startFraudSimulation(io) {
  if (process.env.FRAUD_SIMULATION === 'false') {
    console.log('   [fraud] simulação desligada (FRAUD_SIMULATION=false)');
    return;
  }

  function scheduleNext() {
    const delay = Math.floor(Math.random() * 8000) + 7000;
    setTimeout(async () => {
      try {
        await generateFraudEvent(io);
      } catch (error) {
        console.error('Erro na simulação de fraude:', error);
      }
      scheduleNext();
    }, delay);
  }

  console.log('🗺️  Simulação de fraudes ativa (~7–15s entre eventos)');
  scheduleNext();
}

module.exports = { generateFraudEvent, startFraudSimulation };
