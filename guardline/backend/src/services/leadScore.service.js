function calculateLeadScore(data) {
  const breakdown = {
    source: 0,
    engagement: 0,
    companyFit: 0,
    dataCompleteness: 0,
  };

  const sourceScores = {
    referral: 25,
    inbound: 20,
    linkedin: 15,
    event: 12,
    cold_email: 8,
    other: 5,
  };
  breakdown.source = sourceScores[data.source] || 5;

  const fields = ['email', 'phone', 'company', 'jobTitle'];
  const filled = fields.filter((f) => data[f]).length;
  breakdown.dataCompleteness = Math.round((filled / fields.length) * 25);

  if (data.email && !String(data.email).includes('gmail') && !String(data.email).includes('yahoo')) {
    breakdown.companyFit = 20;
  } else {
    breakdown.companyFit = 10;
  }

  breakdown.engagement = 15;

  const total = Math.min(100, Object.values(breakdown).reduce((a, b) => a + b, 0));
  return { total, breakdown };
}

module.exports = { calculateLeadScore };
