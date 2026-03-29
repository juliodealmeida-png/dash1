/* pasted into guardline.html before const SCREENS — do not load as separate file */
    function guardlineV2Page(title, subtitle, inner) {
      return (
        '<div class="pipeline-page-wrap"><h2 style="margin:0 0 8px">' +
        escapeHtml(title) +
        '</h2>' +
        (subtitle
          ? '<p style="font-size:13px;color:var(--text-muted);margin:0 0 16px">' + escapeHtml(subtitle) + '</p>'
          : '') +
        inner +
        '</div>'
      );
    }

    window.__guardlineV2AlertDedup = window.__guardlineV2AlertDedup || {};

    async function createAlert(type, severity, title, message, leadId) {
      if (!guardlineSupabaseReady()) return;
      var dedupKey = String(type || '') + ':' + String(leadId || title || '').slice(0, 64);
      var now = Date.now();
      if (window.__guardlineV2AlertDedup[dedupKey] && now - window.__guardlineV2AlertDedup[dedupKey] < 3600000)
        return;
      window.__guardlineV2AlertDedup[dedupKey] = now;
      try {
        await DB.insert('alerts', {
          type: type,
          severity: severity || 'info',
          title: title,
          message: message,
          lead_id: leadId || null,
          read: false,
        });
      } catch (e) {
        console.error(e);
      }
    }

    async function markAlertRead(alertId) {
      try {
        await DB.update('alerts', alertId, { read: true });
      } catch (e) {}
      renderAlertsScreen();
    }

    async function renderAccounts() {
      var area = document.getElementById('content-area');
      if (!guardlineSupabaseReady()) {
        area.innerHTML = guardlineV2Page('Contas', null, '<p class="placeholder-note">Supabase não configurado.</p>');
        return;
      }
      try {
        var accounts = await DB.query('accounts', { order: 'name.asc', limit: 80 });
        var rows = (accounts || [])
          .map(function (a) {
            return (
              '<tr><td><strong>' +
              escapeHtml(a.name || '') +
              '</strong></td><td>' +
              escapeHtml(a.domain || '—') +
              '</td><td>' +
              escapeHtml(a.industry || '—') +
              '</td><td>' +
              escapeHtml(a.tier || '—') +
              '</td><td>' +
              escapeHtml(a.owner_name || '—') +
              '</td></tr>'
            );
          })
          .join('');
        area.innerHTML = guardlineV2Page(
          'Contas',
          'Tabela accounts no Supabase.',
          '<div class="card"><div class="leads-table-wrap"><table class="leads-table"><thead><tr><th>Nome</th><th>Domínio</th><th>Setor</th><th>Tier</th><th>Owner</th></tr></thead><tbody>' +
            (rows || '<tr><td colspan="5">Nenhum registro.</td></tr>') +
            '</tbody></table></div></div>'
        );
      } catch (e) {
        showToast('error', 'Contas', (e && e.message) || String(e));
      }
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    async function renderContacts() {
      var area = document.getElementById('content-area');
      if (!guardlineSupabaseReady()) {
        area.innerHTML = guardlineV2Page('Contatos', null, '<p class="placeholder-note">Supabase não configurado.</p>');
        return;
      }
      try {
        var contacts = await DB.query('contacts', { order: 'name.asc', limit: 80 });
        var rows = (contacts || [])
          .map(function (c) {
            return (
              '<tr><td>' +
              escapeHtml(c.name || '') +
              '</td><td>' +
              escapeHtml(c.email || '—') +
              '</td><td>' +
              escapeHtml(c.title || '—') +
              '</td><td>' +
              escapeHtml(c.country || '—') +
              '</td></tr>'
            );
          })
          .join('');
        area.innerHTML = guardlineV2Page(
          'Contatos',
          'Tabela contacts.',
          '<div class="card"><div class="leads-table-wrap"><table class="leads-table"><thead><tr><th>Nome</th><th>Email</th><th>Cargo</th><th>País</th></tr></thead><tbody>' +
            (rows || '<tr><td colspan="4">Nenhum registro.</td></tr>') +
            '</tbody></table></div></div>'
        );
      } catch (e) {
        showToast('error', 'Contatos', (e && e.message) || String(e));
      }
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    async function renderMeetings() {
      var area = document.getElementById('content-area');
      if (!guardlineSupabaseReady()) {
        area.innerHTML = guardlineV2Page('Reuniões', null, '<p class="placeholder-note">Supabase não configurado.</p>');
        return;
      }
      var meetings = [];
      try {
        meetings = await DB.query('meetings', { order: 'scheduled_at.desc', limit: 80 });
      } catch (e) {
        meetings = [];
      }
      try {
        var rows = (meetings || [])
          .map(function (m) {
            return (
              '<tr><td>' +
              escapeHtml(m.company_name || '—') +
              '</td><td>' +
              escapeHtml(m.title || '—') +
              '</td><td>' +
              escapeHtml(m.status || '') +
              '</td><td>' +
              escapeHtml(m.scheduled_at || '—') +
              '</td><td><button type="button" class="act-btn" onclick="ingestMeetingSummary(\'' +
              String(m.id) +
              "','Resumo registrado no dashboard','')\">Completar</button></td></tr>"
            );
          })
          .join('');
        document.getElementById('content-area').innerHTML = guardlineV2Page(
          'Reuniões',
          'meetings · use WF07 para enriquecer MEDDPICC.',
          '<div class="card"><div class="leads-table-wrap"><table class="leads-table"><thead><tr><th>Empresa</th><th>Título</th><th>Status</th><th>Data</th><th></th></tr></thead><tbody>' +
            (rows || '<tr><td colspan="5">Nenhuma reunião.</td></tr>') +
            '</tbody></table></div></div>'
        );
      } catch (e2) {
        showToast('error', 'Reuniões', (e2 && e2.message) || String(e2));
      }
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    async function ingestMeetingSummary(meetingId, summary, transcript) {
      transcript = transcript || '';
      var rows = await DB.query('meetings', { filter: 'id=eq.' + encodeURIComponent(meetingId), limit: 1, order: '' });
      if (!rows[0]) return;
      var m = rows[0];
      await DB.update('meetings', meetingId, { summary: summary, transcript: transcript, status: 'completed' });
      try {
        await N8N.ingestMeeting({
          company_name: m.company_name,
          contact_email: m.contact_email,
          note_taker_summary: summary,
          transcript_data: transcript,
          scheduled_meeting_context: { meeting_id: meetingId },
        });
      } catch (e) {
        console.error(e);
      }
      showToast('success', 'Reunião', 'Resumo enviado ao WF07');
    }

    async function renderInbox() {
      var area = document.getElementById('content-area');
      if (!guardlineSupabaseReady()) {
        area.innerHTML = guardlineV2Page('Inbox', null, '<p class="placeholder-note">Supabase não configurado.</p>');
        return;
      }
      try {
        var convs = await DB.query('conversations', { order: 'created_at.desc', limit: 60 });
        var rows = (convs || [])
          .map(function (c) {
            return (
              '<tr><td>' +
              escapeHtml(c.from_name || '') +
              '</td><td>' +
              escapeHtml(c.from_email || '') +
              '</td><td>' +
              escapeHtml((c.subject || '').slice(0, 40)) +
              '</td><td>' +
              escapeHtml(c.status || '') +
              '</td><td><button type="button" class="act-btn" onclick="processReply(\'' +
              String(c.id) +
              "')\">Processar</button></td></tr>"
            );
          })
          .join('');
        area.innerHTML = guardlineV2Page(
          'Inbox',
          'conversations — WF07 reply',
          '<div class="card"><div class="leads-table-wrap"><table class="leads-table"><thead><tr><th>De</th><th>Email</th><th>Assunto</th><th>Status</th><th></th></tr></thead><tbody>' +
            (rows || '<tr><td colspan="5">Nenhuma conversa.</td></tr>') +
            '</tbody></table></div></div>'
        );
      } catch (e) {
        showToast('error', 'Inbox', (e && e.message) || String(e));
      }
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    async function processReply(convId) {
      var rows = await DB.query('conversations', { filter: 'id=eq.' + encodeURIComponent(convId), limit: 1, order: '' });
      if (!rows[0]) return;
      var c = rows[0];
      var result = {};
      try {
        result = await N8N.ingestReply({
          company_name: c.from_name,
          email: c.from_email,
          reply_text: c.body,
          reply_channel: c.channel || 'email',
        });
      } catch (e) {
        showToast('error', 'WF07', (e && e.message) || String(e));
        return;
      }
      var draft =
        (result.conversation_engine && result.conversation_engine.drafted_reply_message) ||
        (result.drafted_reply_message || '');
      try {
        await DB.update('conversations', convId, { status: 'processed', processed: true, ai_reply: draft });
      } catch (e2) {}
      showToast('success', 'Reply', 'Processado');
      renderInbox();
    }

    async function renderChannelDeals() {
      var area = document.getElementById('content-area');
      if (!guardlineSupabaseReady()) {
        area.innerHTML = guardlineV2Page('Canal', null, '<p class="placeholder-note">Supabase não configurado.</p>');
        return;
      }
      try {
        var partners = await DB.query('partners', { order: 'name.asc', limit: 50 });
        var deals = await DB.query('channel_deals', { order: 'created_at.desc', limit: 100 });
        var html = (partners || [])
          .map(function (p) {
            var pd = (deals || []).filter(function (d) {
              return d.partner_id === p.id;
            });
            var rev = pd.reduce(function (s, d) {
              return s + (Number(d.value) || 0);
            }, 0);
            return (
              '<div class="card" style="margin-bottom:12px"><div class="card-header"><span class="card-title">' +
              escapeHtml(p.name) +
              '</span><span class="card-subtitle">' +
              pd.length +
              ' deals · $' +
              rev.toLocaleString('en-US') +
              '</span></div></div>'
            );
          })
          .join('');
        area.innerHTML = guardlineV2Page('Deals de canal', 'partners + channel_deals', html || '<p class="placeholder-note">Nenhum parceiro.</p>');
      } catch (e) {
        showToast('error', 'Canal', (e && e.message) || String(e));
      }
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    async function renderSdrHub() {
      var area = document.getElementById('content-area');
      if (!guardlineSupabaseReady()) {
        area.innerHTML = guardlineV2Page('SDR Hub', null, '<p class="placeholder-note">Supabase não configurado.</p>');
        return;
      }
      var today = new Date().toISOString().split('T')[0];
      try {
        var hotLeads = await DB.query('leads', { filter: 'lead_temperature=eq.hot', order: 'lead_score.desc', limit: 15 });
        var pendingReplies = await DB.query('conversations', { filter: 'status=eq.unread', order: 'created_at.desc', limit: 8 });
        var todayMeetings = await DB.query('meetings', { filter: 'scheduled_at=gte.' + today + 'T00:00:00', order: 'scheduled_at.asc', limit: 8 });
        var hotRows = (hotLeads || [])
          .map(function (l) {
            var u = mapLeadToUi(l);
            return '<li style="margin:6px 0">' + escapeHtml(u.companyName || '') + ' · ' + u.riskScore + '</li>';
          })
          .join('');
        area.innerHTML = guardlineV2Page(
          'SDR Hub',
          'Prioridades',
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
            '<div class="card"><div class="card-header"><span class="card-title">Leads quentes</span></div><ul style="margin:12px 16px;padding-left:16px">' +
            (hotRows || '<li>—</li>') +
            '</ul></div>' +
            '<div class="card"><div class="card-header"><span class="card-title">Inbox</span></div><p style="padding:16px;font-size:20px;font-weight:800">' +
            (pendingReplies || []).length +
            '</p><button type="button" class="act-btn" style="margin:0 16px 16px" onclick="navigateTo(\'inbox\')">Abrir</button></div>' +
            '<div class="card" style="grid-column:1/-1"><div class="card-header"><span class="card-title">Reuniões</span></div><ul style="margin:12px 16px">' +
            (todayMeetings || [])
              .map(function (m) {
                return '<li>' + escapeHtml(m.company_name || '') + '</li>';
              })
              .join('') +
            '</ul></div></div>'
        );
      } catch (e) {
        showToast('error', 'SDR', (e && e.message) || String(e));
      }
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    async function renderMeddpiccScreen() {
      var area = document.getElementById('content-area');
      if (!guardlineSupabaseReady()) {
        area.innerHTML = guardlineV2Page('MEDDPICC', null, '<p class="placeholder-note">Supabase não configurado.</p>');
        return;
      }
      try {
        var leads = await DB.query('leads', {
          filter: 'pipeline_stage=neq.won&pipeline_stage=neq.lost',
          order: 'lead_score.desc',
          limit: 100,
        });
        var ui = (leads || []).map(mapLeadToUi);
        var avg =
          ui.length > 0
            ? Math.round(ui.reduce(function (s, l) {
                return s + l.meddpicc.completion;
              }, 0) / ui.length)
            : 0;
        var sorted = ui.slice().sort(function (a, b) {
          return a.meddpicc.completion - b.meddpicc.completion;
        });
        var dealRows = sorted
          .slice(0, 25)
          .map(function (l) {
            return (
              '<tr><td>' +
              escapeHtml(l.companyName || '') +
              '</td><td>' +
              l.meddpicc.completion +
              '%</td><td>' +
              escapeHtml((l.meddpicc.topMissingElements || []).slice(0, 2).join(', ') || '—') +
              '</td></tr>'
            );
          })
          .join('');
        area.innerHTML = guardlineV2Page(
          'MEDDPICC',
          'Média: ' + avg + '%',
          '<div class="card"><div class="leads-table-wrap"><table class="leads-table"><thead><tr><th>Empresa</th><th>%</th><th>Faltando</th></tr></thead><tbody>' +
            (dealRows || '<tr><td colspan="3">—</td></tr>') +
            '</tbody></table></div></div>'
        );
      } catch (e) {
        showToast('error', 'MEDDPICC', (e && e.message) || String(e));
      }
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    async function renderPipelineHealth() {
      var area = document.getElementById('content-area');
      if (!guardlineSupabaseReady()) {
        area.innerHTML = guardlineV2Page('Saúde', null, '<p class="placeholder-note">Supabase não configurado.</p>');
        return;
      }
      try {
        var leads = await DB.query('leads', { order: 'lead_score.desc', limit: 200 });
        var ui = (leads || []).map(mapLeadToUi);
        var active = ui.filter(function (l) {
          return l.stage !== 'won' && l.stage !== 'lost';
        });
        var atR = active.filter(function (l) {
          return l.riskScore >= 75;
        }).length;
        var score = Math.max(0, 100 - Math.round((atR / (active.length || 1)) * 100));
        area.innerHTML = guardlineV2Page(
          'Saúde & churn',
          'Health proxy ' + score + '/100',
          '<div class="card" style="padding:16px"><p>Ativos: ' + active.length + ' · Risco ≥75: ' + atR + '</p></div>'
        );
      } catch (e) {
        showToast('error', 'Saúde', (e && e.message) || String(e));
      }
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    async function renderMarketSignals() {
      var area = document.getElementById('content-area');
      if (!guardlineSupabaseReady()) {
        area.innerHTML = guardlineV2Page('Sinais', null, '<p class="placeholder-note">Supabase não configurado.</p>');
        return;
      }
      try {
        var signals = await DB.query('market_signals', { order: 'detected_at.desc', limit: 50 });
        var rows = (signals || [])
          .map(function (s) {
            return (
              '<tr><td>' +
              escapeHtml(s.company_name || '') +
              '</td><td>' +
              escapeHtml(s.title || '') +
              '</td><td>' +
              (s.relevance != null ? s.relevance : '—') +
              '</td></tr>'
            );
          })
          .join('');
        var deals = window.__guardlineCommandUiDeals || [];
        var first = deals[0];
        var btn = first
          ? '<button type="button" class="act-btn" onclick="fetchSignalsForLeadId(\'' + String(first.id) + '\')">Serper</button>'
          : '';
        area.innerHTML = guardlineV2Page(
          'Sinais de mercado',
          'market_signals',
          '<p style="margin-bottom:12px">' + btn + '</p><div class="card"><div class="leads-table-wrap"><table class="leads-table"><thead><tr><th>Empresa</th><th>Título</th><th>Rel</th></tr></thead><tbody>' +
            (rows || '<tr><td colspan="3">—</td></tr>') +
            '</tbody></table></div></div>'
        );
      } catch (e) {
        showToast('error', 'Sinais', (e && e.message) || String(e));
      }
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    async function fetchSignalsForLeadId(leadUuid) {
      var rows = await DB.query('leads', { filter: 'id=eq.' + encodeURIComponent(leadUuid), limit: 1, order: '' });
      if (!rows[0]) return;
      await fetchSignalsForLead(mapLeadToUi(rows[0]));
    }

    async function fetchSignalsForLead(lead) {
      var company = lead.companyName || '';
      var gl = /brazil|brasil|^br$/i.test(lead.country || '') ? 'br' : 'us';
      showToast('info', 'Serper', 'Buscando…');
      var a = {};
      var b = {};
      try {
        a = await searchMarket(company + ' compliance AML 2025', gl);
      } catch (e) {}
      try {
        b = await searchMarket(company + ' regulatório 2025', gl);
      } catch (e2) {}
      var organic = (a.organic || []).concat(b.organic || []);
      var n = 0;
      for (var i = 0; i < organic.length; i++) {
        var r = organic[i];
        try {
          await DB.insert('market_signals', {
            lead_id: lead.id,
            company_name: company,
            signal_type: 'news',
            title: r.title || '',
            description: r.snippet || '',
            source: 'serper',
            url: r.link || '',
            relevance: 70,
            detected_at: new Date().toISOString(),
          });
          n++;
        } catch (e3) {}
      }
      showToast('success', 'Sinais', n + ' novos');
      renderMarketSignals();
    }

    async function renderProductIntelligence() {
      var area = document.getElementById('content-area');
      if (!guardlineSupabaseReady()) {
        area.innerHTML = guardlineV2Page('Produto', null, '<p class="placeholder-note">Supabase não configurado.</p>');
        return;
      }
      try {
        var leads = await DB.query('leads', { order: 'lead_score.desc', limit: 200 });
        var ui = (leads || []).map(mapLeadToUi);
        var solutions = ['AML / PLD', 'Fraud Prevention', 'Onboarding / KYC / KYB', 'Decision Engine', 'Orchestration'];
        var stats = solutions
          .map(function (sol) {
            var m = ui.filter(function (l) {
              return (l.primarySolution || '') === sol;
            });
            return (
              '<tr><td>' +
              escapeHtml(sol) +
              '</td><td>' +
              m.length +
              '</td><td>' +
              m.filter(function (x) {
                return x.stage === 'won';
              }).length +
              '</td></tr>'
            );
          })
          .join('');
        var insight = '';
        if (guardlineAnthropicReady()) {
          try {
            insight = await askJulioComplete('Qual solução performa melhor? Máx 100 palavras.', 500);
          } catch (e) {
            insight = '—';
          }
        }
        area.innerHTML = guardlineV2Page(
          'Inteligência de produto',
          'Por solução',
          '<div class="card"><div class="leads-table-wrap"><table class="leads-table"><thead><tr><th>Solução</th><th>Total</th><th>Won</th></tr></thead><tbody>' +
            stats +
            '</tbody></table></div></div><div class="card" style="margin-top:12px"><p style="padding:16px;font-size:13px;white-space:pre-wrap">' +
            escapeHtml(insight || '') +
            '</p></div>'
        );
      } catch (e) {
        showToast('error', 'Produto', (e && e.message) || String(e));
      }
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    async function renderAlertsScreen() {
      var area = document.getElementById('content-area');
      if (!guardlineSupabaseReady()) {
        area.innerHTML = guardlineV2Page('Alertas', null, '<p class="placeholder-note">Supabase não configurado.</p>');
        return;
      }
      try {
        var alerts = await DB.query('alerts', { filter: 'read=eq.false', order: 'created_at.desc', limit: 50 });
        var rows = (alerts || [])
          .map(function (a) {
            return (
              '<tr><td>' +
              escapeHtml(a.title || '') +
              '</td><td>' +
              escapeHtml((a.message || '').slice(0, 60)) +
              '</td><td><button type="button" class="act-btn" onclick="markAlertRead(\'' +
              String(a.id) +
              "')\">Lido</button></td></tr>"
            );
          })
          .join('');
        area.innerHTML = guardlineV2Page(
          'Alertas',
          'Não lidos',
          '<div class="card"><div class="leads-table-wrap"><table class="leads-table"><thead><tr><th>Título</th><th>Mensagem</th><th></th></tr></thead><tbody>' +
            (rows || '<tr><td colspan="3">—</td></tr>') +
            '</tbody></table></div></div>'
        );
      } catch (e) {
        showToast('error', 'Alertas', (e && e.message) || String(e));
      }
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    async function renderN8nEngine() {
      var area = document.getElementById('content-area');
      if (!guardlineSupabaseReady()) {
        area.innerHTML = guardlineV2Page('n8n', null, '<p class="placeholder-note">Supabase não configurado.</p>');
        return;
      }
      try {
        var execs = await DB.query('wf_executions', { order: 'created_at.desc', limit: 100 });
        var total = execs.length;
        var success = execs.filter(function (e) {
          return e.status === 'success';
        }).length;
        var errors = execs.filter(function (e) {
          return e.status === 'error';
        }).length;
        var todayN = execs.filter(function (e) {
          return e.created_at && new Date(e.created_at) > new Date(Date.now() - 86400000);
        }).length;
        var rows = execs
          .slice(0, 30)
          .map(function (r) {
            return (
              '<tr><td>' +
              escapeHtml(r.workflow_name || '') +
              '</td><td>' +
              escapeHtml(r.status || '') +
              '</td><td>' +
              escapeHtml(r.created_at || '') +
              '</td></tr>'
            );
          })
          .join('');
        area.innerHTML = guardlineV2Page(
          'n8n Engine',
          '24h: ' + todayN + ' · sucesso ' + (total ? Math.round((success / total) * 100) : 0) + '%',
          '<div class="card"><div class="leads-table-wrap"><table class="leads-table"><thead><tr><th>WF</th><th>Status</th><th>Quando</th></tr></thead><tbody>' +
            rows +
            '</tbody></table></div></div>'
        );
      } catch (e) {
        showToast('error', 'n8n', (e && e.message) || String(e));
      }
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    async function triggerManualRecipe(type, payload) {
      payload = payload || {};
      showToast('info', 'n8n', 'Disparando…');
      try {
        var fns = {
          batch: function () {
            return N8N.processBatch(payload.csv, payload.campaign);
          },
          refresh: function () {
            return N8N.signalRefresh(payload.accounts || []);
          },
          reply: function () {
            return N8N.ingestReply(payload);
          },
          meeting: function () {
            return N8N.ingestMeeting(payload);
          },
          lead: function () {
            return N8N.processLead(payload);
          },
        };
        if (fns[type]) await fns[type]();
        showToast('success', 'n8n', 'OK');
        setTimeout(renderN8nEngine, 2000);
      } catch (err) {
        showToast('error', 'n8n', (err && err.message) || String(err));
      }
    }

    async function renderLogsScreen() {
      var area = document.getElementById('content-area');
      if (!guardlineSupabaseReady()) {
        area.innerHTML = guardlineV2Page('Logs', null, '<p class="placeholder-note">Supabase não configurado.</p>');
        return;
      }
      try {
        var execs = await DB.query('wf_executions', { order: 'created_at.desc', limit: 60 });
        var alerts = await DB.query('alerts', { order: 'created_at.desc', limit: 40 });
        var combined = (execs || [])
          .map(function (e) {
            return { t: e.created_at, k: 'wf', a: e.workflow_name, b: e.status };
          })
          .concat(
            (alerts || []).map(function (x) {
              return { t: x.created_at, k: 'al', a: x.title, b: x.severity };
            })
          )
          .sort(function (a, b) {
            return new Date(b.t) - new Date(a.t);
          })
          .slice(0, 50);
        var rows = combined
          .map(function (x) {
            return (
              '<tr><td>' +
              x.k +
              '</td><td>' +
              escapeHtml(x.a || '') +
              '</td><td>' +
              escapeHtml(x.b || '') +
              '</td><td>' +
              escapeHtml(x.t || '') +
              '</td></tr>'
            );
          })
          .join('');
        area.innerHTML = guardlineV2Page(
          'Logs',
          'WF + alertas',
          '<div class="card"><div class="leads-table-wrap"><table class="leads-table"><thead><tr><th>T</th><th>Evento</th><th>Det</th><th>Quando</th></tr></thead><tbody>' +
            rows +
            '</tbody></table></div></div>'
        );
      } catch (e) {
        showToast('error', 'Logs', (e && e.message) || String(e));
      }
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    async function renderAdminScreen() {
      var area = document.getElementById('content-area');
      area.innerHTML = guardlineV2Page(
        'Admin',
        'Sem expor chaves',
        '<div class="card" style="padding:16px;font-size:13px"><p>' +
          escapeHtml(CONFIG.supabase.url) +
          '</p><p>n8n: ' +
          escapeHtml(CONFIG.n8n.base) +
          '</p><button type="button" class="btn-full" style="margin-top:12px" onclick="syncCRM()">Sync HubSpot</button></div>'
      );
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    async function syncCRM() {
      if (!guardlineSupabaseReady()) return;
      showToast('info', 'HubSpot', 'Enviando…');
      var PIPELINE_TO_HS = {
        prospecting: 'new_lead',
        qualified: 'intro_call',
        presentation: 'discovery_demo',
        proposal: 'proposal_sent',
        negotiation: 'contract_negotiation',
        won: 'closed_won',
        lost: 'closed_lost',
      };
      try {
        var leads = await DB.query('leads', { limit: 15, order: 'lead_score.desc' });
        var n = 0;
        for (var i = 0; i < (leads || []).length; i++) {
          var lead = leads[i];
          var ownerId =
            (CONFIG.hubspot.owners && CONFIG.hubspot.owners[lead.owner_name]) || lead.hubspot_owner_id;
          var sk = inferLeadStageKey(lead);
          var hsKey = PIPELINE_TO_HS[sk] || 'new_lead';
          var stageId =
            (CONFIG.hubspot.stages && CONFIG.hubspot.stages[hsKey]) ||
            (CONFIG.hubspot.stages && CONFIG.hubspot.stages.new_lead);
          var res = await fetch('https://api.hubapi.com/crm/v3/objects/deals', {
            method: 'POST',
            headers: {
              Authorization: 'Bearer ' + CONFIG.hubspot.pat,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              properties: {
                dealname: lead.company_name || 'Deal',
                pipeline: CONFIG.hubspot.pipeline,
                dealstage: stageId,
                hubspot_owner_id: ownerId,
              },
            }),
          });
          if (res.ok) n++;
        }
        showToast('success', 'HubSpot', n + ' criados (verificar duplicatas)');
      } catch (e) {
        showToast('error', 'HubSpot', (e && e.message) || String(e));
      }
    }

    function guardlineDocUploadClick() {
      var inp = document.getElementById('guardline-doc-file');
      if (inp) inp.click();
    }

    async function uploadDocumentFromInput(input) {
      var f = input && input.files && input.files[0];
      if (!f) return;
      await uploadDocument(f, {});
      input.value = '';
      renderDocumentsScreen();
    }

    async function uploadDocument(file, metadata) {
      metadata = metadata || {};
      return new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onload = async function (e) {
          try {
            var dataUrl = e.target.result;
            var base64 = String(dataUrl).split(',')[1] || '';
            var h = await hashText(dataUrl);
            var doc = await DB.insert('documents', {
              name: file.name,
              type: metadata.type || 'nda',
              status: 'draft',
              file_base64: base64,
              file_content: dataUrl,
              file_size: file.size,
              mime_type: file.type || 'application/pdf',
              hash: h,
              version: 1,
              uploaded_by: metadata.uploadedBy || 'dashboard',
              lead_id: metadata.leadId || null,
              account_id: metadata.accountId || null,
              notes: metadata.notes || '',
            });
            showToast('success', 'Doc', file.name);
            resolve(doc && doc[0]);
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    async function renderDocumentsScreen() {
      var area = document.getElementById('content-area');
      if (!guardlineSupabaseReady()) {
        area.innerHTML = guardlineV2Page('Documentos', null, '<p class="placeholder-note">Supabase não configurado.</p>');
        return;
      }
      try {
        var docs = await DB.query('documents', { order: 'created_at.desc', limit: 40 });
        var sigs = await DB.query('signatures', { order: 'created_at.desc', limit: 80 });
        var rows = (docs || [])
          .map(function (d) {
            var ss = (sigs || []).filter(function (s) {
              return s.document_id === d.id;
            });
            var pend = ss.filter(function (s) {
              return s.status === 'pending';
            }).length;
            return (
              '<tr><td>' +
              escapeHtml(d.name || '') +
              '</td><td>' +
              escapeHtml(d.status || '') +
              '</td><td>' +
              pend +
              ' pend.</td><td><button type="button" class="act-btn" onclick="guardlinePrepareSign(\'' +
              String(d.id) +
              "')\">Assinatura</button></td></tr>"
            );
          })
          .join('');
        area.innerHTML = guardlineV2Page(
          'Documentos',
          'PDF + assinaturas',
          '<input type="file" id="guardline-doc-file" accept="application/pdf" style="display:none" onchange="uploadDocumentFromInput(this)" />' +
            '<button type="button" class="act-btn" style="margin-bottom:12px" onclick="guardlineDocUploadClick()">Upload PDF</button>' +
            '<div class="card"><div class="leads-table-wrap"><table class="leads-table"><thead><tr><th>Nome</th><th>Status</th><th>Pend</th><th></th></tr></thead><tbody>' +
            (rows || '<tr><td colspan="4">—</td></tr>') +
            '</tbody></table></div></div><p style="font-size:12px;color:var(--text-muted)">Link: ?sign=TOKEN</p>'
        );
      } catch (e) {
        showToast('error', 'Docs', (e && e.message) || String(e));
      }
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    async function guardlinePrepareSign(docId) {
      var leads = await DB.query('leads', { order: 'lead_score.desc', limit: 1 });
      if (!leads[0]) {
        showToast('warning', 'Assinatura', 'Nenhum lead para sugerir signatários');
        return;
      }
      var sigs = await prepareSignatories(docId, leads[0].id);
      await createSignatureRequest(docId, sigs);
      renderDocumentsScreen();
    }

    async function prepareSignatories(docId, leadId) {
      var rows = await DB.query('leads', { filter: 'id=eq.' + encodeURIComponent(leadId), limit: 1, order: '' });
      if (!rows[0]) return [];
      var lead = rows[0];
      var signatories = [];
      if (guardlineAnthropicReady()) {
        try {
          var raw = await askJulioComplete(
            'NDA ' + (lead.company_name || '') + ' — JSON [{"name":"","title":"","email":""}] só isso.',
            400
          );
          var m = raw.match(/\[[\s\S]*\]/);
          if (m) signatories = JSON.parse(m[0]);
        } catch (e) {}
      }
      if (!Array.isArray(signatories)) signatories = [];
      if (lead.contact_email) {
        signatories.unshift({
          name: lead.contact_name || 'Contato',
          email: lead.contact_email,
          title: lead.contact_title || '',
        });
      }
      return signatories;
    }

    async function createSignatureRequest(docId, signatories) {
      var drows = await DB.query('documents', { filter: 'id=eq.' + encodeURIComponent(docId), limit: 1, order: '' });
      if (!drows[0]) return;
      var doc = drows[0];
      var base = window.location.origin + (window.location.pathname || '/');
      for (var i = 0; i < signatories.length; i++) {
        var signer = signatories[i];
        var token = guardlineGenerateToken(24);
        await DB.insert('signatures', {
          document_id: docId,
          signer_name: signer.name,
          signer_email: signer.email,
          signer_title: signer.title || '',
          position_page: signer.page || 1,
          position_x: signer.x != null ? signer.x : 100 + i * 40,
          position_y: signer.y != null ? signer.y : 720,
          status: 'pending',
          token: token,
        });
        try {
          await sendEmail({
            to: signer.email,
            subject: 'Assinar — ' + (doc.name || ''),
            html:
              '<p>Olá ' +
              escapeHtml(signer.name) +
              ',</p><p><a href="' +
              base +
              '?sign=' +
              encodeURIComponent(token) +
              '">Assinar</a></p>',
          });
        } catch (e) {}
      }
      try {
        await DB.update('documents', docId, { status: 'pending_signatures' });
      } catch (e2) {}
      showToast('success', 'Convites', String(signatories.length));
    }

    async function processSignature(token) {
      var rows = await DB.query('signatures', { filter: 'token=eq.' + encodeURIComponent(token), limit: 1, order: '' });
      if (!rows[0]) {
        showToast('error', 'Token', 'Inválido');
        return;
      }
      var sig = rows[0];
      if (sig.status === 'signed') {
        showToast('info', 'Assinatura', 'Já assinado');
        return;
      }
      await DB.update('signatures', sig.id, { status: 'viewed', viewed_at: new Date().toISOString() });
      var area = document.getElementById('content-area');
      if (area) {
        area.innerHTML = guardlineV2Page(
          'Assinar',
          escapeHtml(sig.signer_name || ''),
          '<canvas id="pdf-canvas" style="max-width:100%;border:1px solid var(--border-default)"></canvas>' +
            '<button type="button" class="btn-full" style="margin-top:16px" onclick="confirmSignature(\'' +
            String(sig.id) +
            '\')">Confirmar assinatura</button>'
        );
      }
      await renderDocumentViewer(sig.document_id);
    }

    async function renderDocumentViewer(docId) {
      if (typeof pdfjsLib === 'undefined') return;
      var rows = await DB.query('documents', { filter: 'id=eq.' + encodeURIComponent(docId), limit: 1, order: '' });
      if (!rows[0] || !rows[0].file_base64) return;
      var canvas = document.getElementById('pdf-canvas');
      if (!canvas) return;
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      var bin = atob(rows[0].file_base64);
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      var pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      var page = await pdf.getPage(1);
      var vp = page.getViewport({ scale: 1.15 });
      canvas.width = vp.width;
      canvas.height = vp.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
    }

    async function confirmSignature(signatureId) {
      var rows = await DB.query('signatures', { filter: 'id=eq.' + encodeURIComponent(signatureId), limit: 1, order: '' });
      if (!rows[0]) return;
      var sig = rows[0];
      var signatureData =
        (sig.signer_name || '') + ':' + (sig.signer_email || '') + ':' + (sig.document_id || '') + ':' + Date.now();
      var h = await hashText(signatureData);
      var ip = '';
      try {
        var ipRes = await fetch('https://api.ipify.org?format=json');
        var ipJ = await ipRes.json();
        ip = ipJ.ip || '';
      } catch (e) {}
      await DB.update('signatures', signatureId, {
        status: 'signed',
        signed_at: new Date().toISOString(),
        hash_signed: h,
        ip_address: ip,
      });
      var all = await DB.query('signatures', {
        filter: 'document_id=eq.' + encodeURIComponent(sig.document_id),
        limit: 100,
        order: '',
      });
      var allSigned = (all || [])
        .filter(function (s) {
          return s.status !== 'cancelled';
        })
        .every(function (s) {
          return s.status === 'signed';
        });
      if (allSigned) {
        await DB.update('documents', sig.document_id, { status: 'completed' });
        notifySlack('Documento totalmente assinado: ' + String(sig.document_id));
      }
      showToast('success', 'Assinatura', 'OK');
      navigateTo('documents', true);
    }

    async function createAccountFromLead(leadId) {
      var rows = await DB.query('leads', { filter: 'id=eq.' + encodeURIComponent(leadId), limit: 1, order: '' });
      if (!rows[0]) return;
      var l = rows[0];
      var acc = await DB.insert('accounts', {
        name: l.company_name,
        domain: l.company_domain,
        industry: l.company_industry,
        country: l.company_country,
        owner_name: l.owner_name,
        hubspot_id: l.hubspot_owner_id,
      });
      if (acc[0]) {
        await DB.insert('contacts', {
          account_id: acc[0].id,
          name: l.contact_name,
          email: l.contact_email,
          title: l.contact_title,
          linkedin: l.contact_linkedin,
          country: l.company_country,
        });
        showToast('success', 'Conta', l.company_name || '');
      }
    }

    function guardlineInjectV2Nav() {
      if (document.getElementById('guardline-v2-nav')) return;
      var scroll = document.querySelector('.sidebar-scroll');
      if (!scroll) return;
      var wrap = document.createElement('div');
      wrap.id = 'guardline-v2-nav';
      wrap.innerHTML =
        '<div class="nav-section-label" data-section="v2">Revenue OS v2</div>' +
        '<button type="button" class="nav-item" data-screen="sdr-hub" data-roles="founder,sdr"><i data-lucide="target" class="nav-icon"></i><span class="nav-label">SDR Hub</span></button>' +
        '<button type="button" class="nav-item" data-screen="inbox" data-roles="founder,sdr"><i data-lucide="inbox" class="nav-icon"></i><span class="nav-label">Inbox</span></button>' +
        '<button type="button" class="nav-item" data-screen="accounts" data-roles="founder,sdr"><i data-lucide="building-2" class="nav-icon"></i><span class="nav-label">Contas</span></button>' +
        '<button type="button" class="nav-item" data-screen="contacts" data-roles="founder,sdr"><i data-lucide="user-circle" class="nav-icon"></i><span class="nav-label">Contatos</span></button>' +
        '<button type="button" class="nav-item" data-screen="meetings" data-roles="founder,sdr"><i data-lucide="calendar" class="nav-icon"></i><span class="nav-label">Reuniões</span></button>' +
        '<button type="button" class="nav-item" data-screen="channel-deals" data-roles="founder"><i data-lucide="share-2" class="nav-icon"></i><span class="nav-label">Canal</span></button>' +
        '<button type="button" class="nav-item" data-screen="meddpicc" data-roles="founder,sdr"><i data-lucide="layout-grid" class="nav-icon"></i><span class="nav-label">MEDDPICC</span></button>' +
        '<button type="button" class="nav-item" data-screen="pipeline-health" data-roles="founder"><i data-lucide="activity" class="nav-icon"></i><span class="nav-label">Saúde</span></button>' +
        '<button type="button" class="nav-item" data-screen="market-signals" data-roles="founder,sdr"><i data-lucide="globe" class="nav-icon"></i><span class="nav-label">Sinais</span></button>' +
        '<button type="button" class="nav-item" data-screen="product-intelligence" data-roles="founder"><i data-lucide="cpu" class="nav-icon"></i><span class="nav-label">Produto</span></button>' +
        '<button type="button" class="nav-item" data-screen="alerts" data-roles="founder,sdr"><i data-lucide="bell" class="nav-icon"></i><span class="nav-label">Alertas</span></button>' +
        '<button type="button" class="nav-item" data-screen="n8n-engine" data-roles="founder,sdr"><i data-lucide="workflow" class="nav-icon"></i><span class="nav-label">n8n Engine</span></button>' +
        '<button type="button" class="nav-item" data-screen="logs" data-roles="founder"><i data-lucide="scroll-text" class="nav-icon"></i><span class="nav-label">Logs</span></button>' +
        '<button type="button" class="nav-item" data-screen="documents" data-roles="founder,sdr"><i data-lucide="file-signature" class="nav-icon"></i><span class="nav-label">Documentos</span></button>' +
        '<button type="button" class="nav-item" data-screen="admin" data-roles="founder"><i data-lucide="settings" class="nav-icon"></i><span class="nav-label">Admin</span></button>';
      scroll.appendChild(wrap);
      wrap.querySelectorAll('.nav-item[data-screen]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          navigateTo(btn.getAttribute('data-screen'));
        });
      });
      if (typeof lucide !== 'undefined') lucide.createIcons();
      applyRoleVisibility();
    }

    function guardlineMaybeOpenSignQuery() {
      var t = new URLSearchParams(window.location.search || '').get('sign');
      if (!t || !guardlineSupabaseReady()) return;
      if (typeof showDashboard === 'function') showDashboard();
      setTimeout(function () {
        processSignature(t);
      }, 500);
    }
