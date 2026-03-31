    function renderLeadFlow() {
      var area = document.getElementById('content-area');
      if (!area) return;
      if (!document.getElementById('lf-css')) {
        var s = document.createElement('style');
        s.id = 'lf-css';
        s.textContent = [
          '.lf-wrap{display:flex;flex-direction:column;gap:16px;width:100%}',
          '.lf-header{display:flex;align-items:center;gap:12px;flex-wrap:wrap}',
          '.lf-funnel{width:100%;display:grid;grid-template-columns:repeat(7,1fr) repeat(6,28px);gap:2px;border-radius:12px;overflow:hidden}',
          '.lf-stage{padding:14px 8px;background:var(--card);text-align:center;cursor:pointer;transition:background .2s;user-select:none}',
          '.lf-stage:hover{background:rgba(255,255,255,.06)}',
          '.lf-stage.lf-stage--active{background:rgba(124,58,237,.2);border-bottom:2px solid #7c3aed}',
          '.lf-stage-count{font-size:22px;font-weight:700;color:var(--text-primary)}',
          '.lf-stage-label{font-size:10px;color:var(--text-muted);margin-top:2px;text-transform:uppercase;letter-spacing:.5px}',
          '.lf-stage-pct{font-size:10px;color:var(--text-dim,#64748b);margin-top:3px}',
          '.lf-stage-bar{height:3px;border-radius:2px;margin-top:8px}',
          '.lf-arrow{display:flex;align-items:center;justify-content:center;color:var(--text-dim,#64748b);font-size:16px;background:var(--bg,#0f172a)}',
          '.lf-controls{display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap}',
          '.lf-sources-bar{display:flex;gap:6px;align-items:center;flex-wrap:wrap}',
          '.lf-src-badge{padding:3px 9px;border-radius:12px;font-size:12px;background:var(--card);border:1px solid var(--border);color:var(--text-secondary)}',
          '.lf-filters{display:flex;gap:6px;flex-wrap:wrap;margin-left:auto}',
          '.lf-fbtn{padding:4px 12px;border-radius:20px;border:1px solid var(--border);background:transparent;color:var(--text-muted);font-size:12px;cursor:pointer;transition:all .2s}',
          '.lf-fbtn.active{background:rgba(124,58,237,.2);border-color:#7c3aed;color:#a78bfa}',
          '.lf-table-wrap{width:100%;overflow-x:auto;border-radius:12px;border:1px solid var(--border)}',
          '.lf-tbl{width:100%;min-width:800px;border-collapse:collapse;font-size:13px}',
          '.lf-tbl th{padding:9px 12px;text-align:left;color:var(--text-muted);font-size:11px;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid var(--border);white-space:nowrap;background:var(--card)}',
          '.lf-tbl td{padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.04);vertical-align:middle}',
          '.lf-tbl tbody tr{cursor:pointer}.lf-tbl tbody tr:hover td{background:rgba(255,255,255,.025)}',
          '.lf-score{display:inline-flex;align-items:center;justify-content:center;min-width:32px;height:22px;padding:0 6px;border-radius:6px;font-size:12px;font-weight:700}',
          '.lf-score.h{background:rgba(52,211,153,.15);color:#34d399}',
          '.lf-score.m{background:rgba(251,146,60,.15);color:#fb923c}',
          '.lf-score.l{background:rgba(107,114,128,.15);color:#9ca3af}',
          '.lf-temp{display:inline-flex;align-items:center;gap:3px;padding:2px 7px;border-radius:12px;font-size:11px;font-weight:600}',
          '.lf-temp.hot{background:rgba(239,68,68,.15);color:#f87171}',
          '.lf-temp.warm{background:rgba(251,191,36,.15);color:#fbbf24}',
          '.lf-temp.cold{background:rgba(99,102,241,.15);color:#818cf8}',
          '.lf-reply{padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600}',
          '.lf-reply.positive{background:rgba(52,211,153,.15);color:#34d399}',
          '.lf-reply.negative{background:rgba(239,68,68,.15);color:#f87171}',
          '.lf-reply.neutral{background:rgba(96,165,250,.15);color:#60a5fa}',
          '#lf-lead-drawer{position:fixed;right:0;top:0;height:100vh;width:480px;max-width:96vw;background:var(--card,#1e293b);border-left:1px solid var(--border);z-index:8000;transform:translateX(100%);transition:transform .3s cubic-bezier(.4,0,.2,1);overflow-y:auto;display:flex;flex-direction:column}',
          '#lf-lead-drawer.open{transform:translateX(0)}',
          '#lf-drawer-overlay{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:7999;opacity:0;transition:opacity .3s;pointer-events:none}',
          '#lf-drawer-overlay.open{opacity:1;pointer-events:all}',
          '.lfd-header{padding:20px 24px;border-bottom:1px solid var(--border);display:flex;gap:14px;align-items:flex-start}',
          '.lfd-avatar{width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#06b6d4);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800;color:#fff;flex-shrink:0}',
          '.lfd-tabs{display:flex;border-bottom:1px solid var(--border);padding:0 24px}',
          '.lfd-tab{padding:10px 14px;font-size:13px;cursor:pointer;border-bottom:2px solid transparent;color:var(--text-muted);transition:all .2s;user-select:none}',
          '.lfd-tab.active{color:#06b6d4;border-bottom-color:#06b6d4}',
          '.lfd-pane{padding:20px 24px;display:none}',
          '.lfd-pane.active{display:block}',
          '.lfd-section{margin-bottom:20px}',
          '.lfd-section-title{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);margin-bottom:10px;font-weight:700}',
          '.lfd-row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:13px}',
          '.lfd-row-label{color:var(--text-muted);flex-shrink:0}',
          '.lfd-row-val{color:var(--text-primary);text-align:right;max-width:60%;word-break:break-word}',
        ].join('');
        document.head.appendChild(s);
      }

      var stageDefs = [
        { id: 'entered',   label: 'Entrada',      icon: '📥', color: '#818cf8' },
        { id: 'processed', label: 'Processado',   icon: '⚙️',  color: '#60a5fa' },
        { id: 'qualified', label: 'Qualificado',  icon: '✅',  color: '#34d399' },
        { id: 'sent',      label: 'Ação Enviada', icon: '📤',  color: '#fb923c' },
        { id: 'replied',   label: 'Respondeu',    icon: '💬',  color: '#f472b6' },
        { id: 'meeting',   label: 'Reunião',      icon: '📅',  color: '#facc15' },
        { id: 'deal',      label: 'Deal',         icon: '💼',  color: '#4ade80' },
      ];

      function normalizeLead(lead) {
        var score = Number(lead.lead_score || lead.score || 0);
        var temp = lead.lead_temperature || lead.temperature ||
          (score >= 70 ? 'hot' : score >= 40 ? 'warm' : score > 0 ? 'cold' : '');
        var company = lead.companyName || lead.company_name || lead.company || lead.account || '';
        var contact = lead.contactName || lead.contact_name || lead.name || lead.contact || '';
        return {
          _raw:             lead,
          id:               lead.id || '',
          account:          (company && company !== contact) ? company : (company || '—'),
          domain:           lead.domain || ((lead.contactEmail || lead.email) ? String(lead.contactEmail || lead.email).split('@')[1] : '') || '',
          contact:          contact || '—',
          title:            lead.contact_title || lead.contactTitle || lead.jobTitle || lead.title || '',
          email:            lead.contactEmail  || lead.contact_email || lead.email || '',
          phone:            lead.contact_phone || lead.contactPhone  || lead.phone || '',
          linkedin:         lead.contact_linkedin || lead.contactLinkedin || lead.linkedin_url || lead.linkedin || '',
          company_website:  lead.company_website  || lead.website || '',
          company_industry: lead.company_industry || lead.industry || '',
          company_size:     lead.company_size || '',
          company_country:  lead.company_country || '',
          lead_score:       score,
          lead_temperature: temp,
          route:            lead.route || '',
          reply_status:     lead.reply_status || '',
          meeting_status:   lead.meeting_status || '',
          meddpicc_completion: Number(lead.meddpicc_score || lead.meddpicc_completion || 0),
          next_action:      lead.next_action || '',
          owner:            lead.owner || lead.ownerName || '',
          source:           lead.source || lead.campaign_name || '',
          tags:             Array.isArray(lead.tags) ? lead.tags : [],
          notes:            lead.notes || '',
          timeline:         Array.isArray(lead.timeline)       ? lead.timeline       : [],
          intent_signals:   Array.isArray(lead.intent_signals) ? lead.intent_signals : [],
          _status:          lead.status || '',
        };
      }

      function classifyStage(lead) {
        var ms     = String(lead.meeting_status || '').toLowerCase();
        var rs     = String(lead.reply_status   || '').toLowerCase();
        var score  = Number(lead.lead_score || 0);
        var medc   = Number(lead.meddpicc_completion || 0);
        var status = String(lead._status || '').toLowerCase();
        if (ms === 'occurred' || medc >= 50 || status === 'converted') return 'deal';
        if (ms === 'scheduled' || status === 'meeting')                 return 'meeting';
        if (rs && rs !== 'no_reply' && rs !== 'none')                   return 'replied';
        if (lead.route)                                                  return 'sent';
        if (score > 0)                                                   return 'qualified';
        if (lead.account !== '—' || lead.domain || lead.contact !== '—') return 'processed';
        return 'entered';
      }

      function buildFunnel(stageExact, total) {
        var html = '<div class="lf-funnel">';
        stageDefs.forEach(function(s, i) {
          var cnt = stageExact[s.id].length;
          var pct = total > 0 ? Math.round(cnt / total * 100) : 0;
          var active = window.__lfFilterStage === s.id;
          html +=
            '<div class="lf-stage' + (active ? ' lf-stage--active' : '') + '" data-stage="' + s.id + '">' +
            '<div style="font-size:18px">' + s.icon + '</div>' +
            '<div class="lf-stage-count">' + cnt + '</div>' +
            '<div class="lf-stage-label">' + s.label + '</div>' +
            '<div class="lf-stage-pct">' + pct + '%</div>' +
            '<div class="lf-stage-bar" style="background:' + s.color + ';width:' + Math.max(8, pct) + '%"></div>' +
            '</div>';
          if (i < stageDefs.length - 1) html += '<div class="lf-arrow">›</div>';
        });
        return html + '</div>';
      }

      function buildSources(leads) {
        var counts = {};
        leads.forEach(function(l) {
          var src = (l.source || 'Sem fonte').trim();
          counts[src] = (counts[src] || 0) + 1;
        });
        var keys = Object.keys(counts).sort(function(a, b) { return counts[b] - counts[a]; });
        if (!keys.length) return '';
        return '<div class="lf-sources-bar">' +
          '<span style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;flex-shrink:0">Fontes:</span>' +
          keys.map(function(k) {
            return '<span class="lf-src-badge">' + escapeHtml(k) + ' <b>' + counts[k] + '</b></span>';
          }).join('') + '</div>';
      }

      function buildFilters(stageExact, total) {
        var stage = window.__lfFilterStage;
        return '<div class="lf-filters">' +
          '<button type="button" class="lf-fbtn' + (!stage ? ' active' : '') + '" data-stage="">Todos (' + total + ')</button>' +
          stageDefs.filter(function(s) { return stageExact[s.id].length > 0; }).map(function(s) {
            return '<button type="button" class="lf-fbtn' + (stage === s.id ? ' active' : '') + '" data-stage="' + s.id + '">' +
              s.icon + ' ' + s.label + ' (' + stageExact[s.id].length + ')</button>';
          }).join('') + '</div>';
      }

      function renderTable(allLeads, stageExact) {
        var stage    = window.__lfFilterStage || null;
        var filtered = stage ? (stageExact[stage] || []) : allLeads;

        document.querySelectorAll('.lf-stage').forEach(function(el) {
          el.classList.toggle('lf-stage--active', el.getAttribute('data-stage') === stage);
        });
        document.querySelectorAll('.lf-fbtn').forEach(function(b) {
          b.classList.toggle('active', b.getAttribute('data-stage') === (stage || ''));
        });

        var tbody = document.getElementById('lf-tbody');
        if (!tbody) return;
        if (!filtered.length) {
          tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:32px;color:var(--text-muted)">📭 Nenhum lead nesta etapa</td></tr>';
          return;
        }

        var sample = filtered.slice(0, Math.min(filtered.length, 50));
        var pct    = function(fn) { return sample.filter(fn).length / sample.length; };
        var hide = {
          cargo:    pct(function(l) { return !l.title; }) > 0.9,
          fonte:    pct(function(l) { return !l.source || l.source === 'Sem fonte'; }) > 0.9,
          rota:     pct(function(l) { return !l.route; }) > 0.9,
          resposta: pct(function(l) { return !l.reply_status || l.reply_status === 'no_reply'; }) > 0.9,
        };

        var tbl = tbody.closest('table');
        if (tbl) {
          ['cargo', 'fonte', 'rota', 'resposta'].forEach(function(col) {
            var th = tbl.querySelector('th[data-col="' + col + '"]');
            if (th) th.style.display = hide[col] ? 'none' : '';
          });
        }

        tbody.innerHTML = filtered.slice(0, 200).map(function(lead, idx) {
          var sc = lead.lead_score >= 70 ? 'h' : lead.lead_score >= 40 ? 'm' : 'l';
          var scoreBadge = lead.lead_score > 0
            ? '<span class="lf-score ' + sc + '">' + lead.lead_score + '</span>'
            : '<span style="color:var(--text-dim)">—</span>';

          var temp = (lead.lead_temperature || '').toLowerCase();
          var tempHtml = temp
            ? '<span class="lf-temp ' + temp + '">' + (temp === 'hot' ? '🔥' : temp === 'warm' ? '🟡' : '❄️') + '</span>'
            : '<span style="color:var(--text-dim)">—</span>';

          var rs = lead.reply_status || '';
          var rsHtml = (!rs || rs === 'no_reply' || rs === 'none')
            ? '<span style="color:var(--text-dim)">—</span>'
            : '<span class="lf-reply ' + (rs === 'positive' ? 'positive' : rs === 'negative' ? 'negative' : 'neutral') + '">' + escapeHtml(rs) + '</span>';

          var ini = (lead.contact).trim().split(' ').map(function(w) { return w[0] || ''; }).join('').slice(0, 2).toUpperCase();
          var contactCell =
            '<div style="display:flex;align-items:center;gap:7px">' +
            '<div style="width:24px;height:24px;border-radius:50%;background:linear-gradient(135deg,rgba(124,58,237,.4),rgba(6,182,212,.4));display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;flex-shrink:0">' + escapeHtml(ini) + '</div>' +
            '<span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:110px" title="' + escapeHtml(lead.contact) + '">' + escapeHtml(lead.contact) + '</span></div>';

          return '<tr data-idx="' + idx + '">' +
            '<td style="max-width:140px">' +
            '<div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="' + escapeHtml(lead.account) + '">' + escapeHtml(lead.account) + '</div>' +
            (lead.domain ? '<div style="font-size:11px;color:var(--text-muted)">' + escapeHtml(lead.domain) + '</div>' : '') +
            '</td>' +
            '<td>' + contactCell + '</td>' +
            '<td style="' + (hide.cargo    ? 'display:none;' : '') + 'font-size:12px;color:var(--text-secondary);max-width:110px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + escapeHtml(lead.title || '—') + '</td>' +
            '<td>' + scoreBadge + '</td>' +
            '<td>' + tempHtml + '</td>' +
            '<td style="' + (hide.fonte    ? 'display:none;' : '') + 'font-size:12px;color:var(--text-secondary)">' + escapeHtml(lead.source || '—') + '</td>' +
            '<td style="' + (hide.rota     ? 'display:none;' : '') + 'font-size:12px;color:var(--text-secondary);max-width:110px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + escapeHtml(lead.route || '—') + '</td>' +
            '<td style="' + (hide.resposta ? 'display:none;' : '') + '">' + rsHtml + '</td>' +
            '<td style="font-size:11px;color:var(--text-muted);max-width:130px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + escapeHtml(lead.next_action || lead.owner || '—') + '</td>' +
            '</tr>';
        }).join('');

        tbody.querySelectorAll('tr[data-idx]').forEach(function(tr) {
          var idx = parseInt(tr.getAttribute('data-idx'), 10);
          tr.onclick = function() { if (filtered[idx]) openLFLeadDrawer(filtered[idx]); };
        });
      }

      area.innerHTML =
        '<div class="pipeline-page-wrap"><div class="lf-wrap">' +
        '<div class="lf-header">' +
        '<h2 style="margin:0;font-size:1.3rem">Fluxo de Leads</h2>' +
        '<span style="font-size:12px;color:var(--text-muted);background:var(--card);padding:3px 10px;border-radius:12px">WF06 · WF07 · WF08 → Supabase</span>' +
        '<button type="button" id="lf-refresh-btn" class="act-btn" style="margin-left:auto;font-size:12px">⟳ Atualizar</button>' +
        '</div>' +
        '<div id="lf-body"><div style="text-align:center;padding:40px;color:var(--text-muted)">Carregando fluxo…</div></div>' +
        '</div></div>';

      document.getElementById('lf-refresh-btn').onclick = function() {
        window.__lfFilterStage = null;
        loadData();
      };

      if (!document.getElementById('lf-lead-drawer')) {
        var ov = document.createElement('div');
        ov.id = 'lf-drawer-overlay';
        ov.onclick = closeLFLeadDrawer;
        document.body.appendChild(ov);
        var dw = document.createElement('div');
        dw.id = 'lf-lead-drawer';
        document.body.appendChild(dw);
      }

      async function loadData() {
        var body = document.getElementById('lf-body');
        if (body) body.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted)">⟳ Carregando…</div>';
        var leads = [];
        try {
          var r = await API.get('/leads?perPage=100&sortBy=updatedAt&sortOrder=desc', { silent: true });
          var raw = r && r.data ? (Array.isArray(r.data) ? r.data : (r.data.items || r.data.leads || r.data.data || [])) : [];
          if (Array.isArray(raw)) leads = raw;
        } catch(e) { console.warn('[LeadFlow] API:', e.message); }

        if (!leads.length && typeof DB !== 'undefined' && typeof guardlineSupabaseReady === 'function' && guardlineSupabaseReady()) {
          try {
            var sb = await DB.query('leads', { order: 'updated_at.desc', limit: 200 });
            if (Array.isArray(sb)) leads = sb;
          } catch(e2) { console.warn('[LeadFlow] Supabase:', e2.message); }
        }

        var norm  = leads.map(normalizeLead);
        var total = norm.length;
        var stageExact = {};
        stageDefs.forEach(function(s) { stageExact[s.id] = []; });
        norm.forEach(function(l) { stageExact[classifyStage(l)].push(l); });

        if (!body) return;
        body.innerHTML =
          buildFunnel(stageExact, total) +
          '<div class="lf-controls">' + buildSources(norm) + buildFilters(stageExact, total) + '</div>' +
          '<div class="lf-table-wrap"><table class="lf-tbl"><thead><tr>' +
          '<th>Conta</th><th>Contato</th>' +
          '<th data-col="cargo">Cargo</th>' +
          '<th>Score</th><th>Temp.</th>' +
          '<th data-col="fonte">Fonte</th>' +
          '<th data-col="rota">Rota</th>' +
          '<th data-col="resposta">Resposta</th>' +
          '<th>Próx. Ação</th>' +
          '</tr></thead><tbody id="lf-tbody"></tbody></table></div>';

        window.__lfFilterStage = window.__lfFilterStage || null;
        window.__lfRenderTable = function() { renderTable(norm, stageExact); };

        body.querySelectorAll('.lf-stage').forEach(function(el) {
          el.onclick = function() {
            var id = el.getAttribute('data-stage');
            window.__lfFilterStage = (window.__lfFilterStage === id) ? null : id;
            window.__lfRenderTable();
          };
        });
        body.querySelectorAll('.lf-fbtn').forEach(function(btn) {
          btn.onclick = function() {
            var id = btn.getAttribute('data-stage') || null;
            window.__lfFilterStage = (window.__lfFilterStage === id && id) ? null : id;
            window.__lfRenderTable();
          };
        });

        window.__lfRenderTable();
      }

      loadData();
    }

    function openLFLeadDrawer(lead) {
      var drawer  = document.getElementById('lf-lead-drawer');
      var overlay = document.getElementById('lf-drawer-overlay');
      if (!drawer) return;
      var ini  = (lead.contact || '?').trim().split(' ').map(function(w) { return w[0] || ''; }).join('').slice(0, 2).toUpperCase();
      var sc   = lead.lead_score >= 70 ? 'h' : lead.lead_score >= 40 ? 'm' : 'l';
      var temp = (lead.lead_temperature || '').toLowerCase();
      var rs   = lead.reply_status || '';
      drawer.innerHTML =
        '<div class="lfd-header">' +
        '<div class="lfd-avatar">' + escapeHtml(ini) + '</div>' +
        '<div style="flex:1;min-width:0">' +
        '<div style="font-size:15px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + escapeHtml(lead.contact || '—') + '</div>' +
        '<div style="font-size:12px;color:var(--text-muted);margin-top:2px">' + escapeHtml((lead.title ? lead.title + (lead.account ? ' · ' : '') : '') + (lead.account || '')) + '</div>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">' +
        (lead.lead_score > 0 ? '<span class="lf-score ' + sc + '">' + lead.lead_score + '</span>' : '') +
        (temp ? '<span class="lf-temp ' + temp + '">' + (temp === 'hot' ? '🔥' : temp === 'warm' ? '🟡' : '❄️') + ' ' + temp + '</span>' : '') +
        (rs && rs !== 'no_reply' && rs !== 'none' ? '<span class="lf-reply ' + (rs === 'positive' ? 'positive' : rs === 'negative' ? 'negative' : 'neutral') + '">' + escapeHtml(rs) + '</span>' : '') +
        '</div></div>' +
        '<button type="button" onclick="closeLFLeadDrawer()" style="background:none;border:none;color:var(--text-muted);font-size:22px;cursor:pointer;line-height:1;align-self:flex-start;padding:0">×</button>' +
        '</div>' +
        '<div class="lfd-tabs">' +
        '<div class="lfd-tab active"  onclick="switchLFDrawerTab(this,\'perfil\')">Perfil</div>' +
        '<div class="lfd-tab"         onclick="switchLFDrawerTab(this,\'empresa\')">Empresa</div>' +
        '<div class="lfd-tab"         onclick="switchLFDrawerTab(this,\'atividade\')">Atividade</div>' +
        '<div class="lfd-tab"         onclick="switchLFDrawerTab(this,\'notas\')">Notas</div>' +
        '</div>' +
        '<div class="lfd-pane active" id="lfd-pane-perfil">' +
        '<div class="lfd-section"><div class="lfd-section-title">Contato</div>' +
        lfdRow('Email',    lead.email    ? '<a href="mailto:' + escapeHtml(lead.email)    + '" style="color:#06b6d4">' + escapeHtml(lead.email) + '</a>' : '—') +
        lfdRow('Telefone', lead.phone    || '—') +
        lfdRow('LinkedIn', lead.linkedin ? '<a href="' + escapeHtml(lead.linkedin) + '" target="_blank" style="color:#06b6d4">Ver perfil ↗</a>' : '—') +
        '</div>' +
        '<div class="lfd-section"><div class="lfd-section-title">Pipeline</div>' +
        lfdRow('Fonte',    lead.source   || '—') +
        lfdRow('Rota',     lead.route    || '—') +
        lfdRow('Resposta', (rs && rs !== 'no_reply' && rs !== 'none') ? rs : '—') +
        lfdRow('Reunião',  (lead.meeting_status && lead.meeting_status !== 'none') ? lead.meeting_status : '—') +
        lfdRow('MEDDPICC', lead.meddpicc_completion > 0 ? lead.meddpicc_completion + '%' : '—') +
        lfdRow('Owner',    lead.owner    || '—') +
        lfdRow('Próx. Ação', lead.next_action || '—') +
        '</div>' +
        (lead.intent_signals.length ?
          '<div class="lfd-section"><div class="lfd-section-title">Sinais de Intenção</div>' +
          lead.intent_signals.slice(0, 5).map(function(sig) {
            var str = Number(sig.strength || 0);
            return '<div class="lfd-row"><span class="lfd-row-label">' + escapeHtml(sig.signal || '') + '</span>' +
              '<span class="lfd-row-val" style="color:' + (str > 70 ? '#34d399' : str > 40 ? '#fb923c' : '#9ca3af') + '">' + str + '%</span></div>';
          }).join('') + '</div>' : '') +
        '</div>' +
        '<div class="lfd-pane" id="lfd-pane-empresa">' +
        '<div class="lfd-section"><div class="lfd-section-title">Empresa</div>' +
        lfdRow('Nome',    lead.account           || '—') +
        lfdRow('Setor',   lead.company_industry  || '—') +
        lfdRow('Porte',   lead.company_size      || '—') +
        lfdRow('País',    lead.company_country   || '—') +
        lfdRow('Website', lead.company_website   ? '<a href="' + escapeHtml(lead.company_website) + '" target="_blank" style="color:#06b6d4">' + escapeHtml(lead.company_website) + '</a>' : '—') +
        '</div></div>' +
        '<div class="lfd-pane" id="lfd-pane-atividade">' +
        (lead.timeline.length ?
          '<div class="lfd-section"><div class="lfd-section-title">Timeline</div>' +
          lead.timeline.map(function(ev) {
            return '<div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.04)">' +
              '<div style="width:6px;height:6px;border-radius:50%;background:#06b6d4;margin-top:5px;flex-shrink:0"></div>' +
              '<div><div style="font-size:12px">' + escapeHtml(ev.event || '') + '</div>' +
              '<div style="font-size:11px;color:var(--text-muted)">' + (ev.date ? new Date(ev.date).toLocaleDateString('pt-BR') : '') + '</div></div></div>';
          }).join('') + '</div>' :
          '<div style="text-align:center;padding:32px;color:var(--text-muted)">Sem atividade registada</div>') +
        '</div>' +
        '<div class="lfd-pane" id="lfd-pane-notas">' +
        '<div class="lfd-section"><div class="lfd-section-title">Notas do SDR</div>' +
        '<textarea id="lfd-notes-ta" rows="8" style="width:100%;background:rgba(255,255,255,.05);border:1px solid var(--border);border-radius:8px;color:var(--text-primary);padding:12px;font-size:13px;resize:vertical;box-sizing:border-box">' + escapeHtml(lead.notes || '') + '</textarea>' +
        '<button type="button" class="btn-activate" style="margin-top:10px;width:100%" onclick="saveLFLeadNotes(\'' + escapeHtml(lead.id) + '\')">💾 Salvar notas</button>' +
        '</div></div>';
      drawer.classList.add('open');
      if (overlay) overlay.classList.add('open');
    }

    function lfdRow(label, value) {
      return '<div class="lfd-row"><span class="lfd-row-label">' + escapeHtml(label) + '</span><span class="lfd-row-val">' + value + '</span></div>';
    }

    window.switchLFDrawerTab = function(el, tabId) {
      var drawer = document.getElementById('lf-lead-drawer');
      if (!drawer) return;
      drawer.querySelectorAll('.lfd-tab').forEach(function(t) { t.classList.remove('active'); });
      drawer.querySelectorAll('.lfd-pane').forEach(function(p) { p.classList.remove('active'); });
      el.classList.add('active');
      var pane = document.getElementById('lfd-pane-' + tabId);
      if (pane) pane.classList.add('active');
    };

    function closeLFLeadDrawer() {
      var drawer  = document.getElementById('lf-lead-drawer');
      var overlay = document.getElementById('lf-drawer-overlay');
      if (drawer)  drawer.classList.remove('open');
      if (overlay) overlay.classList.remove('open');
    }

    async function saveLFLeadNotes(leadId) {
      var ta = document.getElementById('lfd-notes-ta');
      if (!ta || !leadId) return;
      try {
        await API.patch('/leads/' + leadId, { notes: ta.value });
        showToast('success', 'Notas', 'Salvo.');
      } catch(e) {
        showToast('error', 'Notas', e.message || 'Erro');
      }
    }
