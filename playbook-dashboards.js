// ══════════════════════════════════════════════════════════════════════════════
// PLAYBOOK DASHBOARD FUNCTIONS — 6 new dashboards
// Copy ALL code below before </script> tag in guardline.html
// ══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// DEMO DATA BUILDERS
// ─────────────────────────────────────────────────────────────────────────────

function _demoTimelineDeals() {
  return [
    { id:'d1',  companyName:'Empresa Alfa',         value:24000,  expectedCloseDate:'2026-04-10', stage:'prospecting' },
    { id:'d2',  companyName:'Tech Ventures',        value:36000,  expectedCloseDate:'2026-04-20', stage:'qualified' },
    { id:'d3',  companyName:'Global Commerce',      value:18500,  expectedCloseDate:'2026-04-05', stage:'presentation' },
    { id:'d4',  companyName:'FinTrust Pagamentos',  value:52000,  expectedCloseDate:'2026-04-08', stage:'proposal' },
    { id:'d5',  companyName:'MetalCorp',            value:67000,  expectedCloseDate:'2026-04-12', stage:'negotiation' },
    { id:'d6',  companyName:'Logística Express',    value:89000,  expectedCloseDate:'2026-04-03', stage:'commit_signing' },
    { id:'d7',  companyName:'Retail Cloud SA',      value:44000,  expectedCloseDate:'2026-05-01', stage:'negotiation' },
    { id:'d8',  companyName:'Agro Solutions',       value:31000,  expectedCloseDate:'2026-04-25', stage:'proposal' },
    { id:'d9',  companyName:'Construtech',          value:58000,  expectedCloseDate:'2026-04-15', stage:'presentation' },
    { id:'d10', companyName:'Pharma Distribuidora', value:72000,  expectedCloseDate:'2026-05-10', stage:'qualified' },
  ];
}

function _demoSegmentData() {
  return {
    segments: [
      { name:'Enterprise',   dealCount:5,  totalValue:312000, deals:['FinTrust','MetalCorp','Logística','Pharma','Construtech'] },
      { name:'Mid-market',   dealCount:3,  totalValue:149500, deals:['Tech Ventures','Global Commerce','Agro Solutions'] },
      { name:'SMB',          dealCount:2,  totalValue:75000,  deals:['Empresa Alfa','Retail Cloud'] },
    ]
  };
}

function _demoProductData() {
  return {
    products: [
      { name:'CRM',        revenue:178000, dealCount:12, commonCombinations:['Automation','Analytics'] },
      { name:'Automation', revenue:224000, dealCount:15, commonCombinations:['CRM','Analytics'] },
      { name:'Analytics',  revenue:134500, dealCount:9,  commonCombinations:['CRM','Automation'] },
    ]
  };
}

function _demoQuarterlyTargets() {
  return {
    quarters: [
      { quarter:'Q1 2026', target:250000, forecast:238000, committed:85000, atRisk:45000 },
      { quarter:'Q2 2026', target:280000, forecast:295000, committed:120000, atRisk:32000 },
      { quarter:'Q3 2026', target:300000, forecast:275000, committed:0, atRisk:0 },
      { quarter:'Q4 2026', target:320000, forecast:0, committed:0, atRisk:0 },
    ]
  };
}

function _demoWonLostData() {
  return {
    won: [
      { id:'w1', companyName:'GlobalTech',      value:95000,  closedDate:'2026-03-15', daysCycle:62 },
      { id:'w2', companyName:'CloudServe',      value:72000,  closedDate:'2026-02-28', daysCycle:48 },
      { id:'w3', companyName:'SecureNet',       value:84000,  closedDate:'2026-02-10', daysCycle:55 },
      { id:'w4', companyName:'DataFlow Inc',    value:67000,  closedDate:'2026-03-01', daysCycle:71 },
      { id:'w5', companyName:'OpsCloud',        value:58000,  closedDate:'2026-03-20', daysCycle:44 },
    ],
    lost: [
      { id:'l1', companyName:'Legacy Corp',     value:45000,  closedDate:'2026-03-18', reason:'price' },
      { id:'l2', companyName:'BudgetTech',      value:32000,  closedDate:'2026-03-10', reason:'budget' },
      { id:'l3', companyName:'Competitor Inc',  value:51000,  closedDate:'2026-02-25', reason:'competition' },
      { id:'l4', companyName:'TimelineWorks',   value:38000,  closedDate:'2026-03-05', reason:'timeline' },
      { id:'l5', companyName:'SkepticalCorp',   value:29000,  closedDate:'2026-03-22', reason:'fit' },
    ]
  };
}

function _demoLeadAnalyticsData() {
  return {
    stages: [
      { stage:'prospected',  count:342, avgDaysInStage:8 },
      { stage:'qualified',   count:87,  avgDaysInStage:12 },
      { stage:'contacted',   count:34,  avgDaysInStage:15 },
      { stage:'meeting',     count:12,  avgDaysInStage:7 },
      { stage:'converted',   count:8,   avgDaysInStage:0 },
    ],
    sources: [
      { source:'LinkedIn',   count:156, conversion:4.2 },
      { source:'Cold Email', count:98,  conversion:2.8 },
      { source:'Referral',   count:67,  conversion:8.5 },
      { source:'Event',      count:42,  conversion:6.3 },
      { source:'Inbound',    count:28,  conversion:14.2 },
    ]
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD 1 — Timeline de Fechamento
// ─────────────────────────────────────────────────────────────────────────────

async function renderTimelineDeals() {
  var area = document.getElementById('content-area');
  if (!Auth.isLoggedIn()) { area.innerHTML = guardlineV2Page('Timeline de Fechamento', null, '<p class="placeholder-note">Faça login para acessar.</p>'); return; }
  area.innerHTML = '<div class="pipeline-page-wrap"><div class="card" style="padding:40px;text-align:center"><div class="loading-spinner"></div></div></div>';

  var deals = _demoTimelineDeals();
  try {
    var r = await API.get('/deals?perPage=200&sortBy=expectedCloseDate&sortOrder=asc');
    deals = (r.data || []).filter(function(d) { return d.expectedCloseDate && d.stage !== 'lost'; });
  } catch(e) { console.warn('[Timeline] API unavailable:', e.message); }

  try {
    var today = new Date('2026-04-02');
    var thisMonth = deals.filter(function(d) {
      var ed = new Date(d.expectedCloseDate);
      return ed.getMonth() === today.getMonth() && ed.getFullYear() === today.getFullYear();
    });
    var nextMonth = deals.filter(function(d) {
      var ed = new Date(d.expectedCloseDate);
      return ed.getMonth() === (today.getMonth()+1)%12;
    });
    var nextQuarter = deals.filter(function(d) {
      var ed = new Date(d.expectedCloseDate);
      return ed > new Date(today.getTime() + 91*86400000);
    });

    var totalValue = deals.reduce(function(a,d){ return a+(d.value||0); },0);
    var avgCycle = 47; // days — from demo
    var closingValue = thisMonth.reduce(function(a,d){ return a+(d.value||0); },0);

    function kpiCard(label, val, sub, color, anim) {
      return '<div class="kpi-card" style="cursor:default;animation:slide-up '+anim+'s ease">'+
        '<div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px">'+label+'</div>'+
        '<div style="font-size:26px;font-weight:800;color:'+color+';margin:6px 0 2px">'+val+'</div>'+
        '<div style="font-size:11px;color:var(--text-muted)">'+sub+'</div></div>';
    }

    function dealBubble(d, idx) {
      var daysUntil = Math.max(0, Math.round((new Date(d.expectedCloseDate) - new Date('2026-04-02'))/86400000));
      return '<div class="timeline-deal-bubble" style="animation:slide-up '+(0.3+idx*0.05)+'s ease;margin-bottom:12px;padding:10px 12px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:8px">'+
        '<div style="display:flex;justify-content:space-between;align-items:center">'+
        '<span style="font-weight:600;font-size:13px">'+escapeHtml(d.companyName||'')+'</span>'+
        '<span style="font-size:11px;color:var(--accent-cyan)">$'+((d.value||0)/1000).toFixed(0)+'k</span></div>'+
        '<div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;color:var(--text-muted);margin-top:6px">'+
        '<span>'+daysUntil+' dias</span>'+
        '<span>'+new Date(d.expectedCloseDate).toLocaleDateString('pt-BR')+'</span></div></div>';
    }

    var timelineDeals = deals.sort(function(a,b){
      return new Date(a.expectedCloseDate) - new Date(b.expectedCloseDate);
    }).slice(0,10).map(dealBubble).join('');

    var kpiGrid = '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">'+
      kpiCard('Deals Fechando Este Mês', thisMonth.length, 'Abril 2026', 'var(--accent-green)', '.3')+
      kpiCard('$ Fechando Este Mês', '$'+(closingValue/1000).toFixed(0)+'k', 'do total pipeline', 'var(--accent-cyan)', '.32')+
      kpiCard('Próximo Mês', nextMonth.length+' deals', 'Maio 2026', 'var(--accent-purple-light)', '.34')+
      kpiCard('Ciclo de Vendas Médio', avgCycle+'d', 'Qualification → Won', 'var(--accent-amber,#F59E0B)', '.36')+
      '</div>';

    var monthlyBreakdown = '<div class="card" style="animation:slide-up .38s ease;margin-bottom:16px">'+
      '<div class="card-header"><span class="card-title">Distribuição por período</span></div>'+
      '<div style="padding:8px 0;display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">'+
      '<div style="background:rgba(16,185,129,.08);border:1px solid rgba(16,185,129,.15);border-radius:8px;padding:12px;text-align:center">'+
      '<div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">Este Mês</div>'+
      '<div style="font-size:18px;font-weight:800;color:var(--accent-green)">'+thisMonth.length+'</div>'+
      '<div style="font-size:10px;color:var(--accent-green);margin-top:4px">$'+(thisMonth.reduce(function(a,d){return a+(d.value||0);},0)/1000).toFixed(0)+'k</div></div>'+
      '<div style="background:rgba(60,165,250,.08);border:1px solid rgba(60,165,250,.15);border-radius:8px;padding:12px;text-align:center">'+
      '<div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">Próximo Mês</div>'+
      '<div style="font-size:18px;font-weight:800;color:var(--accent-cyan)">'+nextMonth.length+'</div>'+
      '<div style="font-size:10px;color:var(--accent-cyan);margin-top:4px">$'+(nextMonth.reduce(function(a,d){return a+(d.value||0);},0)/1000).toFixed(0)+'k</div></div>'+
      '<div style="background:rgba(168,85,247,.08);border:1px solid rgba(168,85,247,.15);border-radius:8px;padding:12px;text-align:center">'+
      '<div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">Próxima Quarter</div>'+
      '<div style="font-size:18px;font-weight:800;color:var(--accent-purple-light)">'+nextQuarter.length+'</div>'+
      '<div style="font-size:10px;color:var(--accent-purple-light);margin-top:4px">$'+(nextQuarter.reduce(function(a,d){return a+(d.value||0);},0)/1000).toFixed(0)+'k</div></div>'+
      '</div></div>';

    area.innerHTML = '<div class="pipeline-page-wrap">'+
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">'+
      '<div><h2 style="margin:0 0 4px;font-size:1.4rem">Timeline de Fechamento</h2>'+
      '<p style="font-size:13px;color:var(--text-muted);margin:0">Previsão de deals fechados por período · Semanas futuras vs pipeline total</p></div></div>'+
      kpiGrid + monthlyBreakdown +
      '<div class="command-grid" style="align-items:start;margin-bottom:16px">'+
      '<div class="card" style="animation:slide-up .4s ease;grid-column:1/-1">'+
      '<div class="card-header"><span class="card-title">Timeline — Deals Ordenados por Data de Fechamento</span>'+
      '<span class="card-subtitle">hoje: 2026-04-02</span></div>'+
      '<div style="padding:8px 0">'+timelineDeals+'</div></div></div>'+
      '<div class="timeline-chart-area" style="background:rgba(108,63,197,.04);border:1px solid rgba(108,63,197,.1);border-radius:8px;padding:16px;min-height:300px">'+
      '<div style="font-size:12px;color:var(--text-muted);text-align:center;padding:80px 16px">'+
      '<i data-lucide="bar-chart-3" style="width:32px;height:32px;margin-bottom:8px;opacity:.5"></i><br>'+
      'Gráfico de Timeline: Eixo X = semanas futuras, Eixo Y = $ pipeline · Prepared para Chart.js</div></div></div>';
  } catch(e) {
    console.error('[Timeline]', e);
    area.innerHTML = '<div class="pipeline-page-wrap"><div class="card" style="padding:32px"><p class="placeholder-note">Erro ao carregar: '+escapeHtml((e.message||String(e)).slice(0,80))+'</p></div></div>';
  }
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD 2 — Segment Breakdown
// ─────────────────────────────────────────────────────────────────────────────

async function renderSegmentBreakdown() {
  var area = document.getElementById('content-area');
  if (!Auth.isLoggedIn()) { area.innerHTML = guardlineV2Page('Segment Breakdown', null, '<p class="placeholder-note">Faça login para acessar.</p>'); return; }
  area.innerHTML = '<div class="pipeline-page-wrap"><div class="card" style="padding:40px;text-align:center"><div class="loading-spinner"></div></div></div>';

  var data = _demoSegmentData();
  try {
    var r = await API.get('/deals?perPage=200');
    // Group by segment if available in API response
  } catch(e) { console.warn('[Segment] API unavailable:', e.message); }

  try {
    var totalDeals = data.segments.reduce(function(a,s){ return a+s.dealCount; },0);
    var totalValue = data.segments.reduce(function(a,s){ return a+s.totalValue; },0);

    function kpiCard(label, val, sub, color, anim) {
      return '<div class="kpi-card" style="cursor:default;animation:slide-up '+anim+'s ease">'+
        '<div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px">'+label+'</div>'+
        '<div style="font-size:26px;font-weight:800;color:'+color+';margin:6px 0 2px">'+val+'</div>'+
        '<div style="font-size:11px;color:var(--text-muted)">'+sub+'</div></div>';
    }

    var avgDealSize = totalDeals ? Math.round(totalValue / totalDeals) : 0;

    var segmentRows = data.segments.map(function(s, idx) {
      var pct = totalValue ? Math.round((s.totalValue / totalValue)*100) : 0;
      var avgSize = s.dealCount ? Math.round(s.totalValue / s.dealCount) : 0;
      return '<div style="animation:slide-up '+(0.3+idx*0.05)+'s ease;padding:12px;background:rgba(255,255,255,.02);border-radius:8px;margin-bottom:12px">'+
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">'+
        '<span style="font-weight:600">'+s.name+'</span>'+
        '<span style="font-size:12px;color:var(--accent-cyan)">$'+(s.totalValue/1000).toFixed(0)+'k ('+pct+'%)</span></div>'+
        '<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);margin-bottom:6px">'+
        '<span>'+s.dealCount+' deals</span>'+
        '<span>Avg: $'+(avgSize/1000).toFixed(0)+'k</span></div>'+
        '<div style="height:8px;background:rgba(255,255,255,.06);border-radius:4px;overflow:hidden">'+
        '<div style="height:100%;width:'+pct+'%;background:'+(s.name==='Enterprise'?'#f472b6':(s.name==='Mid-market'?'#60a5fa':'#34d399'))+';border-radius:4px"></div></div></div>';
    }).join('');

    var kpiGrid = '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">'+
      kpiCard('Total Pipeline', '$'+(totalValue/1000).toFixed(0)+'k', 'todos segmentos', 'var(--accent-cyan)', '.3')+
      kpiCard('Deal Count', totalDeals, 'ativos no pipeline', 'var(--accent-green)', '.32')+
      kpiCard('Avg Deal Size', '$'+(avgDealSize/1000).toFixed(0)+'k', 'por segmento', 'var(--accent-purple-light)', '.34')+
      kpiCard('Segmentos', '3', 'Enterprise · Mid · SMB', 'var(--accent-amber,#F59E0B)', '.36')+
      '</div>';

    area.innerHTML = '<div class="pipeline-page-wrap">'+
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">'+
      '<div><h2 style="margin:0 0 4px;font-size:1.4rem">Segment Breakdown</h2>'+
      '<p style="font-size:13px;color:var(--text-muted);margin:0">Pipeline distribuído por segmento de mercado · Enterprise, Mid-market, SMB</p></div></div>'+
      kpiGrid +
      '<div class="command-grid" style="align-items:start;margin-bottom:16px">'+
      '<div class="card" style="animation:slide-up .38s ease">'+
      '<div class="card-header"><span class="card-title">Breakdown por Segmento</span></div>'+
      '<div style="padding:8px 0">'+segmentRows+'</div></div>'+
      '<div class="card" style="animation:slide-up .4s ease">'+
      '<div class="card-header"><span class="card-title">Targets por Segmento</span></div>'+
      '<div style="padding:8px 0">'+
      '<div style="padding:8px 0;margin-bottom:8px"><div style="font-size:12px;font-weight:600;margin-bottom:4px">Enterprise: 40% do pipeline</div><div style="height:6px;background:rgba(255,255,255,.06);border-radius:3px;overflow:hidden"><div style="height:100%;width:40%;background:#f472b6"></div></div></div>'+
      '<div style="padding:8px 0;margin-bottom:8px"><div style="font-size:12px;font-weight:600;margin-bottom:4px">Mid-market: 35% do pipeline</div><div style="height:6px;background:rgba(255,255,255,.06);border-radius:3px;overflow:hidden"><div style="height:100%;width:35%;background:#60a5fa"></div></div></div>'+
      '<div style="padding:8px 0"><div style="font-size:12px;font-weight:600;margin-bottom:4px">SMB: 25% do pipeline</div><div style="height:6px;background:rgba(255,255,255,.06);border-radius:3px;overflow:hidden"><div style="height:100%;width:25%;background:#34d399"></div></div></div>'+
      '</div></div></div>'+
      '<div class="segment-chart-area" style="background:rgba(108,63,197,.04);border:1px solid rgba(108,63,197,.1);border-radius:8px;padding:16px;min-height:300px;grid-column:1/-1">'+
      '<div style="font-size:12px;color:var(--text-muted);text-align:center;padding:80px 16px">'+
      '<i data-lucide="pie-chart" style="width:32px;height:32px;margin-bottom:8px;opacity:.5"></i><br>'+
      'Gráfico de Segmentos: Stacked bar ou pie chart · Prepared para Chart.js</div></div></div>';
  } catch(e) {
    console.error('[Segment]', e);
    area.innerHTML = '<div class="pipeline-page-wrap"><div class="card" style="padding:32px"><p class="placeholder-note">Erro: '+escapeHtml((e.message||String(e)).slice(0,80))+'</p></div></div>';
  }
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD 3 — Product Breakdown
// ─────────────────────────────────────────────────────────────────────────────

async function renderProductBreakdown() {
  var area = document.getElementById('content-area');
  if (!Auth.isLoggedIn()) { area.innerHTML = guardlineV2Page('Product Breakdown', null, '<p class="placeholder-note">Faça login para acessar.</p>'); return; }
  area.innerHTML = '<div class="pipeline-page-wrap"><div class="card" style="padding:40px;text-align:center"><div class="loading-spinner"></div></div></div>';

  var data = _demoProductData();
  try {
    var r = await API.get('/deals?perPage=200');
    // Group by product if available
  } catch(e) { console.warn('[Product] API unavailable:', e.message); }

  try {
    var totalRevenue = data.products.reduce(function(a,p){ return a+p.revenue; },0);
    var totalDeals = data.products.reduce(function(a,p){ return a+p.dealCount; },0);

    function kpiCard(label, val, sub, color, anim) {
      return '<div class="kpi-card" style="cursor:default;animation:slide-up '+anim+'s ease">'+
        '<div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px">'+label+'</div>'+
        '<div style="font-size:26px;font-weight:800;color:'+color+';margin:6px 0 2px">'+val+'</div>'+
        '<div style="font-size:11px;color:var(--text-muted)">'+sub+'</div></div>';
    }

    var productRows = data.products.map(function(p, idx) {
      var pct = totalRevenue ? Math.round((p.revenue / totalRevenue)*100) : 0;
      var pctDeals = totalDeals ? Math.round((p.dealCount / totalDeals)*100) : 0;
      return '<div style="animation:slide-up '+(0.3+idx*0.05)+'s ease;padding:12px;background:rgba(255,255,255,.02);border-radius:8px;margin-bottom:12px">'+
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">'+
        '<span style="font-weight:600">'+p.name+'</span>'+
        '<span style="font-size:12px;color:var(--accent-cyan)">$'+(p.revenue/1000).toFixed(0)+'k</span></div>'+
        '<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);margin-bottom:6px">'+
        '<span>'+p.dealCount+' deals ('+pctDeals+'%)</span>'+
        '<span>'+p.commonCombinations.join(' + ')+'</span></div>'+
        '<div style="height:8px;background:rgba(255,255,255,.06);border-radius:4px;overflow:hidden">'+
        '<div style="height:100%;width:'+pct+'%;background:'+(p.name==='CRM'?'#818cf8':(p.name==='Automation'?'#60a5fa':'#34d399'))+';border-radius:4px"></div></div></div>';
    }).join('');

    var crossSellOpps = '<div style="padding:8px 0">'+
      '<div style="margin-bottom:10px"><div style="font-size:12px;font-weight:600;color:var(--accent-green);margin-bottom:4px">✓ CRM → Automation</div><div style="font-size:11px;color:var(--text-muted)">8 deals com potencial upsell</div></div>'+
      '<div style="margin-bottom:10px"><div style="font-size:12px;font-weight:600;color:var(--accent-green);margin-bottom:4px">✓ Automation → Analytics</div><div style="font-size:11px;color:var(--text-muted)">5 deals com potencial</div></div>'+
      '<div><div style="font-size:12px;font-weight:600;color:var(--accent-amber,#F59E0B);margin-bottom:4px">→ CRM + Automation + Analytics</div><div style="font-size:11px;color:var(--text-muted)">Bundle opportunity: 3 accounts</div></div>'+
      '</div>';

    var kpiGrid = '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">'+
      kpiCard('Total Product Revenue', '$'+(totalRevenue/1000).toFixed(0)+'k', 'todos produtos', 'var(--accent-cyan)', '.3')+
      kpiCard('Produtos', '3', 'CRM · Automation · Analytics', 'var(--accent-green)', '.32')+
      kpiCard('Deals Totais', totalDeals, 'com cross-sell opp', 'var(--accent-purple-light)', '.34')+
      kpiCard('Cross-sell Rate', '62%', 'múltiplos produtos', 'var(--accent-amber,#F59E0B)', '.36')+
      '</div>';

    area.innerHTML = '<div class="pipeline-page-wrap">'+
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">'+
      '<div><h2 style="margin:0 0 4px;font-size:1.4rem">Product Breakdown</h2>'+
      '<p style="font-size:13px;color:var(--text-muted);margin:0">Receita e cross-sell por produto/módulo · CRM, Automation, Analytics</p></div></div>'+
      kpiGrid +
      '<div class="command-grid" style="align-items:start;margin-bottom:16px">'+
      '<div class="card" style="animation:slide-up .38s ease">'+
      '<div class="card-header"><span class="card-title">Receita por Produto</span></div>'+
      '<div style="padding:8px 0">'+productRows+'</div></div>'+
      '<div class="card" style="animation:slide-up .4s ease">'+
      '<div class="card-header"><span class="card-title">Oportunidades Cross-sell</span></div>'+
      crossSellOpps+'</div></div>'+
      '<div class="product-chart-area" style="background:rgba(108,63,197,.04);border:1px solid rgba(108,63,197,.1);border-radius:8px;padding:16px;min-height:300px;grid-column:1/-1">'+
      '<div style="font-size:12px;color:var(--text-muted);text-align:center;padding:80px 16px">'+
      '<i data-lucide="layers" style="width:32px;height:32px;margin-bottom:8px;opacity:.5"></i><br>'+
      'Gráfico de Produtos: Revenue vs Deals · Prepared para Chart.js</div></div></div>';
  } catch(e) {
    console.error('[Product]', e);
    area.innerHTML = '<div class="pipeline-page-wrap"><div class="card" style="padding:32px"><p class="placeholder-note">Erro: '+escapeHtml((e.message||String(e)).slice(0,80))+'</p></div></div>';
  }
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD 4 — Sales Target by Quarter
// ─────────────────────────────────────────────────────────────────────────────

async function renderQuarterlyTargets() {
  var area = document.getElementById('content-area');
  if (!Auth.isLoggedIn()) { area.innerHTML = guardlineV2Page('Quarterly Goals', null, '<p class="placeholder-note">Faça login para acessar.</p>'); return; }
  area.innerHTML = '<div class="pipeline-page-wrap"><div class="card" style="padding:40px;text-align:center"><div class="loading-spinner"></div></div></div>';

  var data = _demoQuarterlyTargets();
  try {
    var r = await API.get('/metrics/quarterly');
    // Update with API data if available
  } catch(e) { console.warn('[Quarterly] API unavailable:', e.message); }

  try {
    var totalTarget = data.quarters.reduce(function(a,q){ return a+(q.target||0); },0);
    var totalForecast = data.quarters.reduce(function(a,q){ return a+(q.forecast||0); },0);
    var totalCommitted = data.quarters.reduce(function(a,q){ return a+(q.committed||0); },0);
    var overallAttainment = totalTarget ? Math.round((totalForecast / totalTarget)*100) : 0;

    function kpiCard(label, val, sub, color, anim) {
      return '<div class="kpi-card" style="cursor:default;animation:slide-up '+anim+'s ease">'+
        '<div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px">'+label+'</div>'+
        '<div style="font-size:26px;font-weight:800;color:'+color+';margin:6px 0 2px">'+val+'</div>'+
        '<div style="font-size:11px;color:var(--text-muted)">'+sub+'</div></div>';
    }

    var quarterRows = data.quarters.map(function(q, idx) {
      var attain = q.target ? Math.round((q.forecast / q.target)*100) : 0;
      var gap = Math.max(0, q.target - q.forecast);
      var color = attain >= 100 ? 'var(--accent-green)' : attain >= 75 ? 'var(--accent-amber,#F59E0B)' : 'var(--accent-red)';
      return '<div style="animation:slide-up '+(0.3+idx*0.05)+'s ease;padding:12px;background:rgba(255,255,255,.02);border-radius:8px;margin-bottom:12px">'+
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">'+
        '<span style="font-weight:600">'+q.quarter+'</span>'+
        '<span style="font-size:12px;color:'+color+'">'+attain+'% vs target</span></div>'+
        '<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);margin-bottom:6px">'+
        '<span>Target: $'+(q.target/1000).toFixed(0)+'k</span>'+
        '<span>Forecast: $'+(q.forecast/1000).toFixed(0)+'k</span></div>'+
        '<div style="display:flex;gap:2px;height:8px;background:rgba(255,255,255,.06);border-radius:4px;overflow:hidden">'+
        '<div style="flex:'+(q.committed||0)+';background:var(--accent-green);border-radius:4px"></div>'+
        '<div style="flex:'+(q.atRisk||0)+';background:var(--accent-amber,#F59E0B);border-radius:4px"></div>'+
        '<div style="flex:'+Math.max(0,q.target-(q.committed||0)-(q.atRisk||0))+';background:rgba(255,255,255,.06);border-radius:4px"></div></div>'+
        '<div style="font-size:10px;color:var(--text-muted);margin-top:4px">Committed: $'+(q.committed/1000).toFixed(0)+'k · At Risk: $'+(q.atRisk/1000).toFixed(0)+'k · Gap: $'+(gap/1000).toFixed(0)+'k</div></div>';
    }).join('');

    var kpiGrid = '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">'+
      kpiCard('Target Anual 2026', '$'+(totalTarget/1000).toFixed(0)+'k', 'Q1-Q4', 'var(--accent-cyan)', '.3')+
      kpiCard('Forecast Anual', '$'+(totalForecast/1000).toFixed(0)+'k', 'projected', overallAttainment>=100?'var(--accent-green)':'var(--accent-amber,#F59E0B)', '.32')+
      kpiCard('Overall Attainment', overallAttainment+'%', '2026 total', overallAttainment>=100?'var(--accent-green)':'var(--accent-red)', '.34')+
      kpiCard('Committed Today', '$'+(totalCommitted/1000).toFixed(0)+'k', 'high confidence', 'var(--accent-green)', '.36')+
      '</div>';

    area.innerHTML = '<div class="pipeline-page-wrap">'+
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">'+
      '<div><h2 style="margin:0 0 4px;font-size:1.4rem">Sales Target by Quarter</h2>'+
      '<p style="font-size:13px;color:var(--text-muted);margin:0">2026 quarterly goals vs forecast · Target attainment, committed, at-risk</p></div></div>'+
      kpiGrid +
      '<div class="command-grid" style="align-items:start;margin-bottom:16px">'+
      '<div class="card" style="animation:slide-up .38s ease;grid-column:1/-1">'+
      '<div class="card-header"><span class="card-title">Quarterly Breakdown</span></div>'+
      '<div style="padding:8px 0">'+quarterRows+'</div></div></div>'+
      '<div class="quarterly-chart-area" style="background:rgba(108,63,197,.04);border:1px solid rgba(108,63,197,.1);border-radius:8px;padding:16px;min-height:300px">'+
      '<div style="font-size:12px;color:var(--text-muted);text-align:center;padding:80px 16px">'+
      '<i data-lucide="bar-chart-2" style="width:32px;height:32px;margin-bottom:8px;opacity:.5"></i><br>'+
      'Gráfico de Quarters: Target vs Forecast vs Committed · Prepared para Chart.js</div></div></div>';
  } catch(e) {
    console.error('[Quarterly]', e);
    area.innerHTML = '<div class="pipeline-page-wrap"><div class="card" style="padding:32px"><p class="placeholder-note">Erro: '+escapeHtml((e.message||String(e)).slice(0,80))+'</p></div></div>';
  }
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD 5 — Won/Lost Analysis
// ─────────────────────────────────────────────────────────────────────────────

async function renderWonLostAnalysis() {
  var area = document.getElementById('content-area');
  if (!Auth.isLoggedIn()) { area.innerHTML = guardlineV2Page('Won/Lost Analysis', null, '<p class="placeholder-note">Faça login para acessar.</p>'); return; }
  area.innerHTML = '<div class="pipeline-page-wrap"><div class="card" style="padding:40px;text-align:center"><div class="loading-spinner"></div></div></div>';

  var data = _demoWonLostData();
  try {
    var r = await API.get('/deals?status=closed&perPage=200');
    // Filter won/lost from API
  } catch(e) { console.warn('[WonLost] API unavailable:', e.message); }

  try {
    var totalWon = data.won.length;
    var totalLost = data.lost.length;
    var totalClosed = totalWon + totalLost;
    var winRate = totalClosed ? Math.round((totalWon / totalClosed)*100) : 0;
    var avgWonValue = totalWon ? Math.round(data.won.reduce(function(a,d){ return a+(d.value||0); },0) / totalWon) : 0;
    var avgLostValue = totalLost ? Math.round(data.lost.reduce(function(a,d){ return a+(d.value||0); },0) / totalLost) : 0;
    var totalWonValue = data.won.reduce(function(a,d){ return a+(d.value||0); },0);
    var totalLostValue = data.lost.reduce(function(a,d){ return a+(d.value||0); },0);

    // Loss reasons breakdown
    var lossReasons = {};
    data.lost.forEach(function(d) { lossReasons[d.reason] = (lossReasons[d.reason]||0) + 1; });
    var topLossReason = Object.keys(lossReasons).reduce(function(a,b){ return lossReasons[a]>lossReasons[b]?a:b; });

    function kpiCard(label, val, sub, color, anim) {
      return '<div class="kpi-card" style="cursor:default;animation:slide-up '+anim+'s ease">'+
        '<div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px">'+label+'</div>'+
        '<div style="font-size:26px;font-weight:800;color:'+color+';margin:6px 0 2px">'+val+'</div>'+
        '<div style="font-size:11px;color:var(--text-muted)">'+sub+'</div></div>';
    }

    var wonRows = data.won.slice(0,5).map(function(d, idx) {
      return '<tr style="animation:slide-up '+(0.3+idx*0.03)+'s ease;border-bottom:1px solid rgba(255,255,255,.04)">'+
        '<td style="padding:10px 8px;font-size:13px;font-weight:600">'+escapeHtml(d.companyName||'')+'</td>'+
        '<td style="padding:10px 8px;font-size:12px;color:var(--accent-green)">$'+(d.value||0).toLocaleString('en-US')+'</td>'+
        '<td style="padding:10px 8px;font-size:11px;color:var(--text-muted)">'+d.daysCycle+' dias</td></tr>';
    }).join('');

    var lostRows = data.lost.slice(0,5).map(function(d, idx) {
      var reasonLabel = {price:'Preço',budget:'Budget',competition:'Concorrência',timeline:'Timeline',fit:'Fit'}[d.reason]||d.reason;
      return '<tr style="animation:slide-up '+(0.3+idx*0.03)+'s ease;border-bottom:1px solid rgba(255,255,255,.04)">'+
        '<td style="padding:10px 8px;font-size:13px;font-weight:600">'+escapeHtml(d.companyName||'')+'</td>'+
        '<td style="padding:10px 8px;font-size:12px;color:var(--accent-red)">$'+(d.value||0).toLocaleString('en-US')+'</td>'+
        '<td style="padding:10px 8px;font-size:11px;color:var(--text-muted)">'+reasonLabel+'</td></tr>';
    }).join('');

    var reasonBars = Object.keys(lossReasons).map(function(reason) {
      var count = lossReasons[reason];
      var pct = totalLost ? Math.round((count / totalLost)*100) : 0;
      var reasonLabel = {price:'Preço',budget:'Budget',competition:'Concorrência',timeline:'Timeline',fit:'Fit'}[reason]||reason;
      return '<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px"><span>'+reasonLabel+'</span><span style="font-weight:600">'+count+' ('+pct+'%)</span></div><div style="height:6px;background:rgba(255,255,255,.06);border-radius:3px;overflow:hidden"><div style="height:100%;width:'+pct+'%;background:var(--accent-red);border-radius:3px"></div></div></div>';
    }).join('');

    var kpiGrid = '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">'+
      kpiCard('Win Rate', winRate+'%', totalClosed+' deals fechados', winRate>=50?'var(--accent-green)':'var(--accent-amber,#F59E0B)', '.3')+
      kpiCard('Avg Win Value', '$'+(avgWonValue/1000).toFixed(0)+'k', totalWon+' deals won', 'var(--accent-cyan)', '.32')+
      kpiCard('Avg Lost Value', '$'+(avgLostValue/1000).toFixed(0)+'k', totalLost+' deals lost', 'var(--accent-red)', '.34')+
      kpiCard('Motivo Mais Comum', topLossReason, 'perdas', 'var(--accent-amber,#F59E0B)', '.36')+
      '</div>';

    area.innerHTML = '<div class="pipeline-page-wrap">'+
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">'+
      '<div><h2 style="margin:0 0 4px;font-size:1.4rem">Won/Lost Analysis</h2>'+
      '<p style="font-size:13px;color:var(--text-muted);margin:0">Últimos 90 dias — Deals fechados · Taxa de sucesso e motivos de perda</p></div></div>'+
      kpiGrid +
      '<div class="command-grid" style="align-items:start;margin-bottom:16px">'+
      '<div class="card" style="animation:slide-up .38s ease">'+
      '<div class="card-header"><span class="card-title">Top 5 Wins</span></div>'+
      '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">'+
      '<thead><tr style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:var(--text-muted)"><th style="padding:8px;text-align:left">Empresa</th><th style="padding:8px;text-align:left">Valor</th><th style="padding:8px;text-align:left">Ciclo</th></tr></thead>'+
      '<tbody>'+wonRows+'</tbody></table></div></div>'+
      '<div class="card" style="animation:slide-up .4s ease">'+
      '<div class="card-header"><span class="card-title">Top 5 Losses</span></div>'+
      '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">'+
      '<thead><tr style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:var(--text-muted)"><th style="padding:8px;text-align:left">Empresa</th><th style="padding:8px;text-align:left">Valor</th><th style="padding:8px;text-align:left">Motivo</th></tr></thead>'+
      '<tbody>'+lostRows+'</tbody></table></div></div></div>'+
      '<div class="card" style="animation:slide-up .42s ease;margin-bottom:16px">'+
      '<div class="card-header"><span class="card-title">Motivos de Perda — Breakdown</span></div>'+
      '<div style="padding:8px 0">'+reasonBars+'</div></div>'+
      '<div class="wonlost-chart-area" style="background:rgba(108,63,197,.04);border:1px solid rgba(108,63,197,.1);border-radius:8px;padding:16px;min-height:300px">'+
      '<div style="font-size:12px;color:var(--text-muted);text-align:center;padding:80px 16px">'+
      '<i data-lucide="trending-up" style="width:32px;height:32px;margin-bottom:8px;opacity:.5"></i><br>'+
      'Gráfico Won vs Lost: Win rate trend · Prepared para Chart.js</div></div></div>';
  } catch(e) {
    console.error('[WonLost]', e);
    area.innerHTML = '<div class="pipeline-page-wrap"><div class="card" style="padding:32px"><p class="placeholder-note">Erro: '+escapeHtml((e.message||String(e)).slice(0,80))+'</p></div></div>';
  }
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD 6 — Lead Analytics
// ─────────────────────────────────────────────────────────────────────────────

async function renderLeadAnalytics() {
  var area = document.getElementById('content-area');
  if (!Auth.isLoggedIn()) { area.innerHTML = guardlineV2Page('Lead Analytics', null, '<p class="placeholder-note">Faça login para acessar.</p>'); return; }
  area.innerHTML = '<div class="pipeline-page-wrap"><div class="card" style="padding:40px;text-align:center"><div class="loading-spinner"></div></div></div>';

  var data = _demoLeadAnalyticsData();
  try {
    var r = await API.get('/leads?perPage=200');
    // Group by stage if available
  } catch(e) { console.warn('[LeadAnalytics] API unavailable:', e.message); }

  try {
    var totalLeads = data.stages.reduce(function(a,s){ return a+s.count; },0);
    var prospected = data.stages[0].count || 0;
    var converted = data.stages[data.stages.length-1].count || 0;
    var conversionRate = prospected ? Math.round((converted / prospected)*100) : 0;

    function kpiCard(label, val, sub, color, anim) {
      return '<div class="kpi-card" style="cursor:default;animation:slide-up '+anim+'s ease">'+
        '<div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px">'+label+'</div>'+
        '<div style="font-size:26px;font-weight:800;color:'+color+';margin:6px 0 2px">'+val+'</div>'+
        '<div style="font-size:11px;color:var(--text-muted)">'+sub+'</div></div>';
    }

    var stageRows = data.stages.map(function(s, idx) {
      var pct = totalLeads ? Math.round((s.count / totalLeads)*100) : 0;
      return '<div style="animation:slide-up '+(0.3+idx*0.05)+'s ease;padding:12px;background:rgba(255,255,255,.02);border-radius:8px;margin-bottom:12px">'+
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">'+
        '<span style="font-weight:600;text-transform:capitalize">'+s.stage+'</span>'+
        '<span style="font-size:12px;color:var(--accent-cyan)">'+s.count+' leads ('+pct+'%)</span></div>'+
        '<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);margin-bottom:6px">'+
        '<span>Avg: '+s.avgDaysInStage+' dias</span></div>'+
        '<div style="height:8px;background:rgba(255,255,255,.06);border-radius:4px;overflow:hidden">'+
        '<div style="height:100%;width:'+pct+'%;background:'+(s.stage==='converted'?'var(--accent-green)':(s.stage==='meeting'?'var(--accent-amber,#F59E0B)':'#60a5fa'))+';border-radius:4px"></div></div></div>';
    }).join('');

    var sourceRows = data.sources.map(function(s, idx) {
      var pct = totalLeads ? Math.round((s.count / totalLeads)*100) : 0;
      var convColor = s.conversion >= 10 ? 'var(--accent-green)' : s.conversion >= 5 ? 'var(--accent-amber,#F59E0B)' : 'var(--accent-red)';
      return '<div style="animation:slide-up '+(0.3+idx*0.05)+'s ease;padding:12px;background:rgba(255,255,255,.02);border-radius:8px;margin-bottom:12px">'+
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">'+
        '<span style="font-weight:600">'+s.source+'</span>'+
        '<span style="font-size:12px;color:'+convColor+'">'+s.conversion+'% conv</span></div>'+
        '<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);margin-bottom:6px">'+
        '<span>'+s.count+' leads ('+pct+'% of total)</span></div>'+
        '<div style="height:8px;background:rgba(255,255,255,.06);border-radius:4px;overflow:hidden">'+
        '<div style="height:100%;width:'+pct+'%;background:'+(s.source==='Referral'?'var(--accent-green)':(s.source==='Inbound'?'#34d399':'#60a5fa'))+';border-radius:4px"></div></div></div>';
    }).join('');

    var kpiGrid = '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">'+
      kpiCard('Total Leads', totalLeads, 'all stages', 'var(--accent-cyan)', '.3')+
      kpiCard('Conversion Rate', conversionRate+'%', 'prospected → converted', conversionRate>=5?'var(--accent-green)':'var(--accent-amber,#F59E0B)', '.32')+
      kpiCard('Avg Time in Stage', '10d', 'median across funnel', 'var(--accent-purple-light)', '.34')+
      kpiCard('Best Source', 'Referral', '8.5% conversion rate', 'var(--accent-green)', '.36')+
      '</div>';

    area.innerHTML = '<div class="pipeline-page-wrap">'+
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">'+
      '<div><h2 style="margin:0 0 4px;font-size:1.4rem">Lead Analytics</h2>'+
      '<p style="font-size:13px;color:var(--text-muted);margin:0">Pipeline de leads · Estágios, conversão e eficiência por fonte</p></div></div>'+
      kpiGrid +
      '<div class="command-grid" style="align-items:start;margin-bottom:16px">'+
      '<div class="card" style="animation:slide-up .38s ease">'+
      '<div class="card-header"><span class="card-title">Leads por Estágio</span></div>'+
      '<div style="padding:8px 0">'+stageRows+'</div></div>'+
      '<div class="card" style="animation:slide-up .4s ease">'+
      '<div class="card-header"><span class="card-title">Eficiência por Fonte</span></div>'+
      '<div style="padding:8px 0">'+sourceRows+'</div></div></div>'+
      '<div class="lead-funnel-area" style="background:rgba(108,63,197,.04);border:1px solid rgba(108,63,197,.1);border-radius:8px;padding:16px;min-height:300px">'+
      '<div style="font-size:12px;color:var(--text-muted);text-align:center;padding:80px 16px">'+
      '<i data-lucide="git-branch" style="width:32px;height:32px;margin-bottom:8px;opacity:.5"></i><br>'+
      'Gráfico de Funnel: Estágios e conversão · Prepared para Chart.js</div></div></div>';
  } catch(e) {
    console.error('[LeadAnalytics]', e);
    area.innerHTML = '<div class="pipeline-page-wrap"><div class="card" style="padding:32px"><p class="placeholder-note">Erro: '+escapeHtml((e.message||String(e)).slice(0,80))+'</p></div></div>';
  }
  if (typeof lucide !== 'undefined') lucide.createIcons();
}
