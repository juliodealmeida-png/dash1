const STAGE_PROBABILITIES = {
  prospecting: 10,
  qualified: 25,
  presentation: 40,
  proposal: 55,
  negotiation: 75,
  won: 100,
  lost: 0,
};

const STAGE_LABELS = {
  prospecting: 'Prospecção',
  qualified: 'Qualificado',
  presentation: 'Apresentação',
  proposal: 'Proposta',
  negotiation: 'Negociação',
  won: 'Fechado Ganho',
  lost: 'Fechado Perdido',
};

const ALLOWED_DEAL_SORT = new Set([
  'riskScore',
  'value',
  'updatedAt',
  'createdAt',
  'stageChangedAt',
  'probability',
  'title',
  'companyName',
]);

module.exports = { STAGE_PROBABILITIES, STAGE_LABELS, ALLOWED_DEAL_SORT };
