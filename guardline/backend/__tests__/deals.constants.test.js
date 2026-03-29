const { STAGE_PROBABILITIES, STAGE_LABELS, ALLOWED_DEAL_SORT } = require('../src/controllers/deals.constants');

describe('deals.constants', () => {
  test('STAGE_PROBABILITIES cobre todos os estágios conhecidos', () => {
    Object.keys(STAGE_LABELS).forEach((stage) => {
      expect(STAGE_PROBABILITIES).toHaveProperty(stage);
      expect(typeof STAGE_PROBABILITIES[stage]).toBe('number');
    });
  });

  test('ALLOWED_DEAL_SORT inclui riskScore e companyName', () => {
    expect(ALLOWED_DEAL_SORT.has('riskScore')).toBe(true);
    expect(ALLOWED_DEAL_SORT.has('companyName')).toBe(true);
  });
});
