/** Mapeamento HubSpot — stages são IDs; `deal_stage` na BD pode guardar slug ou ID conforme sync n8n */
export const HUBSPOT_CONFIG = {
  pipeline_id: '705209428',
  pipeline_name: 'Funnel_Guardline',
  stage_map: {
    new_lead: '1031112078',
    intro_call: '1031112079',
    discovery_demo: '1031112080',
    nda: '1031146375',
    poc_planning: '1035269698',
    poc: '1031127597',
    proposal_sent: '1160559924',
    contract_negotiation: '1311981861',
    proposal_accepted: '1031112081',
    contract_sent: '1031112082',
    closed_won: '1031112083',
    freezer: '1123039270',
    unqualified: '1031127595',
    closed_lost: '1031112084',
  },
  owner_map: {
    'Julio De Almeida': '78581656',
    'Glauciele Silva': '78930080',
    'Rafa Nova': '78954425',
    'Adriano Fernandes': '80012051',
    'Ezequiel Dominguez': '88558410',
    'Agustin Pesce': '88559526',
    'Arthur Ferreira': '88587177',
    'Danilo Pereira': '88631599',
    'Dario Schilman': '89441187',
  },
} as const;

/** Estágios considerados “fechados” ou congelados para KPIs de pipeline activo */
export const DEAL_INACTIVE_STAGES = new Set([
  'closed_won',
  'closed_lost',
  'unqualified',
  'freezer',
  '1031112083',
  '1031112084',
  '1031127595',
  '1123039270',
]);
