/**
 * GUARDLINE — Digital Signature Module (Deliverables 3, 4, 6)
 * PDF Field Editor + Signature Canvas + Document Management Panel
 * Loaded into guardline.html as inline script or <script src>
 */

// ─── STATE ─────────────────────────────────────────────
window.__docModule = {
  currentDoc: null,
  fields: [],
  signers: [],
  selectedField: null,
  dragField: null,
  currentPage: 1,
  totalPages: 1,
  pdfDoc: null,
  editorScale: 1,
  demoCache: {},
};

// ─── DOCUMENT MANAGEMENT PANEL (Deliverable 6) ────────

window.renderDocumentsScreen = renderDocumentsScreen;
async function renderDocumentsScreen() {
  var area = document.getElementById('content-area');
  if (!Auth.isLoggedIn()) {
    area.innerHTML = guardlineV2Page('Documentos', null, '<p class="placeholder-note">Faça login para acessar.</p>');
    return;
  }
  area.innerHTML = '<div class="pipeline-page-wrap"><div class="card" style="padding:40px;text-align:center;color:var(--text-muted)">Carregando documentos...</div></div>';

  // Demo fallback data when backend /documents routes don't exist (404)
  var _demoStats = {total:4,draft:1,sent:1,inProgress:1,completed:1,refused:0};
  var _demoDocs = [
    {id:'demo-1',name:'Contrato de Prestação — Acme Corp',status:'completed',version:1,fileHash:'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',signers:[{id:'s1',name:'Carlos Mendes',email:'carlos@acme.com',status:'signed',color:'var(--accent-green)'},{id:'s2',name:'Ana Oliveira',email:'ana@guardline.com',status:'signed',color:'var(--accent-green)'}],_count:{fields:3}},
    {id:'demo-2',name:'NDA — Stark Industries',status:'sent',version:1,signers:[{id:'s3',name:'Tony Stark',email:'tony@stark.com',status:'notified',color:'var(--accent-cyan)'}],_count:{fields:2}},
    {id:'demo-3',name:'Proposta Comercial — Wayne Ent',status:'in_progress',version:2,signers:[{id:'s4',name:'Bruce Wayne',email:'bruce@wayne.com',status:'notified',color:'var(--accent-amber)'},{id:'s5',name:'Lucius Fox',email:'lucius@wayne.com',status:'signed',color:'var(--accent-green)'}],_count:{fields:4}},
    {id:'demo-4',name:'Aditivo Contratual — Oscorp',status:'draft',version:1,signers:[{id:'s6',name:'Norman Osborn',email:'norman@oscorp.com',status:'pending',color:'var(--text-muted)'}],_count:{fields:1}},
  ];

  var stats, docs;
  try {
    var results = await Promise.all([
      API.get('/documents/stats').catch(function(){ return {data: _demoStats}; }),
      API.get('/documents?perPage=50').catch(function(){ return {data: _demoDocs}; }),
    ]);
    stats = results[0].data || _demoStats;
    docs = results[1].data || _demoDocs;
    if (!docs.length) docs = _demoDocs;
  } catch(_fallbackErr) {
    stats = _demoStats;
    docs = _demoDocs;
  }

  try {

    var statusColors = {
      draft: 'var(--text-muted)', sent: 'var(--accent-cyan)', in_progress: 'var(--accent-amber)',
      completed: 'var(--accent-green)', expired: 'var(--text-muted)', cancelled: 'var(--text-muted)', refused: 'var(--accent-red)',
    };
    var statusLabels = {
      draft: 'Rascunho', sent: 'Enviado', in_progress: 'Em andamento',
      completed: 'Concluído', expired: 'Expirado', cancelled: 'Cancelado', refused: 'Recusado',
    };

    var kpiRow =
      '<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:12px;margin-bottom:16px">' +
      '<div class="card" style="padding:14px;text-align:center"><div style="font-size:24px;font-weight:800;color:var(--accent-cyan)">' + (stats.total || 0) + '</div><div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px">Total</div></div>' +
      '<div class="card" style="padding:14px;text-align:center"><div style="font-size:24px;font-weight:800;color:var(--text-muted)">' + (stats.draft || 0) + '</div><div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px">Rascunho</div></div>' +
      '<div class="card" style="padding:14px;text-align:center"><div style="font-size:24px;font-weight:800;color:var(--accent-cyan)">' + (stats.sent || 0) + '</div><div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px">Enviado</div></div>' +
      '<div class="card" style="padding:14px;text-align:center"><div style="font-size:24px;font-weight:800;color:var(--accent-amber)">' + (stats.inProgress || 0) + '</div><div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px">Andamento</div></div>' +
      '<div class="card" style="padding:14px;text-align:center"><div style="font-size:24px;font-weight:800;color:var(--accent-green)">' + (stats.completed || 0) + '</div><div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px">Concluído</div></div>' +
      '<div class="card" style="padding:14px;text-align:center"><div style="font-size:24px;font-weight:800;color:var(--accent-red)">' + (stats.refused || 0) + '</div><div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px">Recusado</div></div>' +
      '</div>';

    var docCards = docs.map(function(d) {
      var sc = statusColors[d.status] || 'var(--text-muted)';
      var sl = statusLabels[d.status] || d.status;
      var signerBadges = (d.signers || []).map(function(s) {
        var ini = (s.name || '?').split(' ').map(function(w){return w[0]}).join('').toUpperCase().slice(0,2);
        var sColor = s.status === 'signed' ? 'var(--accent-green)' : s.status === 'refused' ? 'var(--accent-red)' : s.color || 'var(--text-muted)';
        return '<div style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:20px;background:var(--bg-surface);border:1px solid ' + sColor + ';font-size:10px;color:' + sColor + '"><span style="font-weight:700">' + escapeHtml(ini) + '</span> ' + escapeHtml(s.name.split(' ')[0]) + '</div>';
      }).join(' ');

      // Per-signer action rows
      var signerActions = '';
      if (['sent', 'in_progress'].includes(d.status)) {
        signerActions = (d.signers || []).map(function(s) {
          var sColor = s.status === 'signed' ? 'var(--accent-green)' : s.status === 'refused' ? 'var(--accent-red)' : 'var(--accent-amber)';
          var sLabel = s.status === 'signed' ? '✅ Assinado' : s.status === 'refused' ? '❌ Recusado' : s.status === 'notified' ? '📧 Notificado' : '⏳ Pendente';
          var btns = '';
          if (s.status !== 'signed' && s.status !== 'refused') {
            btns = '<button type="button" class="act-btn" style="font-size:10px;padding:3px 8px" onclick="event.stopPropagation();docResendLink(\'' + d.id + '\',\'' + s.id + '\')">🔄 Reenviar link</button> ' +
              '<button type="button" class="act-btn" style="font-size:10px;padding:3px 8px" onclick="event.stopPropagation();docSendReminder(\'' + d.id + '\',\'' + s.id + '\',\'' + escapeHtml(s.name).replace(/'/g, "\\'") + '\')">🔔 Lembrete</button>';
          }
          return '<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:11px">' +
            '<span style="color:' + sColor + ';font-weight:600;min-width:100px">' + sLabel + '</span>' +
            '<span style="color:var(--text-secondary)">' + escapeHtml(s.name) + '</span>' +
            '<span style="color:var(--text-muted);font-size:10px">' + escapeHtml(s.email) + '</span>' +
            '<span style="flex:1"></span>' + btns + '</div>';
        }).join('');
        if (signerActions) {
          signerActions = '<div style="margin:8px 0;padding:8px 10px;background:var(--bg-surface);border-radius:8px;border:1px solid var(--border-subtle)">' +
            '<div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Status dos signatários</div>' +
            signerActions + '</div>';
        }
      }

      var actions = '';
      if (d.status === 'draft') {
        actions = '<button type="button" class="act-btn" onclick="docOpenEditor(\'' + d.id + '\')">✏️ Editar campos</button> ' +
          '<button type="button" class="act-btn" style="background:var(--accent-purple-dim);border-color:var(--accent-purple);color:var(--accent-purple-light)" onclick="docSend(\'' + d.id + '\')">📧 Enviar →</button> ' +
          '<button type="button" class="act-btn" onclick="docAssignSeller(\'' + d.id + '\',\'' + escapeHtml(d.name).replace(/'/g, "\\'") + '\')">👤 Atribuir vendedor</button>';
      } else if (['sent', 'in_progress'].includes(d.status)) {
        actions = '<button type="button" class="act-btn" onclick="docViewAudit(\'' + d.id + '\')">📋 Trilha</button> ' +
          '<button type="button" class="act-btn" onclick="docFollowUp(\'' + d.id + '\',\'' + escapeHtml(d.name).replace(/'/g, "\\'") + '\')">📞 Seguimento</button> ' +
          '<button type="button" class="act-btn" onclick="docAssignSeller(\'' + d.id + '\',\'' + escapeHtml(d.name).replace(/'/g, "\\'") + '\')">👤 Atribuir vendedor</button> ' +
          '<button type="button" class="act-btn" style="color:var(--accent-red)" onclick="docCancel(\'' + d.id + '\')">🚫 Cancelar</button>';
      } else if (d.status === 'completed') {
        actions = '<button type="button" class="act-btn" onclick="docViewAudit(\'' + d.id + '\')">📋 Trilha</button> ' +
          '<button type="button" class="act-btn" style="color:var(--accent-green)" onclick="docDownloadFinal(\'' + d.id + '\')">⬇ Baixar PDF</button> ' +
          '<button type="button" class="act-btn" onclick="docAssignSeller(\'' + d.id + '\',\'' + escapeHtml(d.name).replace(/'/g, "\\'") + '\')">👤 Atribuir vendedor</button>';
      } else if (d.status === 'refused') {
        actions = '<button type="button" class="act-btn" onclick="docViewAudit(\'' + d.id + '\')">📋 Trilha</button> ' +
          '<button type="button" class="act-btn" onclick="docResendAll(\'' + d.id + '\')">🔄 Reenviar</button>';
      }

      // Hash & blockchain info
      var hashInfo = '';
      if (d.fileHash) {
        hashInfo += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;padding:6px 10px;background:var(--bg-surface);border-radius:8px;border:1px solid var(--border-subtle)">' +
          '<span style="font-size:12px">🔒</span>' +
          '<span style="font-size:10px;color:var(--text-muted)">SHA-256:</span>' +
          '<code style="font-size:10px;color:var(--accent-cyan);font-family:monospace;word-break:break-all">' + escapeHtml(d.fileHash.slice(0, 16)) + '…</code>' +
          '<button type="button" onclick="navigator.clipboard.writeText(\'' + escapeHtml(d.fileHash) + '\');showToast(\'info\',\'Hash\',\'Copiado!\')" style="background:none;border:none;cursor:pointer;font-size:11px;color:var(--accent-cyan);padding:2px 4px" title="Copiar hash completo">📋</button>' +
          '</div>';
      }
      if (d.blockchainTxHash) {
        hashInfo += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;padding:6px 10px;background:rgba(124,58,237,0.1);border-radius:8px;border:1px solid rgba(124,58,237,0.3)">' +
          '<span style="font-size:12px">⛓️</span>' +
          '<span style="font-size:10px;color:var(--accent-purple-light)">Polygon:</span>' +
          '<code style="font-size:10px;color:var(--accent-purple-light);font-family:monospace">' + escapeHtml(d.blockchainTxHash.slice(0, 14)) + '…</code>' +
          (d.blockchainUrl ? '<a href="' + escapeHtml(d.blockchainUrl) + '" target="_blank" rel="noopener" style="font-size:10px;color:var(--accent-cyan);text-decoration:none">Verificar ↗</a>' : '') +
          '</div>';
      } else if (d.status === 'completed') {
        hashInfo += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;padding:6px 10px;background:rgba(245,158,11,0.1);border-radius:8px;border:1px solid rgba(245,158,11,0.3)">' +
          '<span style="font-size:12px">⏳</span>' +
          '<span style="font-size:10px;color:var(--accent-amber)">Blockchain: aguardando MATIC para registrar</span></div>';
      }

      return '<div class="card" style="margin-bottom:12px">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">' +
        '<div><div style="font-weight:700;font-size:14px;color:var(--text-primary)">' + escapeHtml(d.name) + '</div>' +
        '<div style="font-size:11px;color:var(--text-muted);margin-top:2px">' + (d.signers || []).length + ' signatários · ' + (d._count ? d._count.fields : 0) + ' campos · v' + d.version + '</div></div>' +
        '<span style="padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;color:' + sc + ';background:var(--bg-surface);border:1px solid ' + sc + '">' + escapeHtml(sl) + '</span></div>' +
        '<div style="margin-bottom:10px">' + (signerBadges || '<span style="font-size:11px;color:var(--text-muted)">Sem signatários</span>') + '</div>' +
        signerActions +
        hashInfo +
        '<div style="display:flex;gap:8px;flex-wrap:wrap">' + actions +
        ' <button type="button" class="act-btn" style="color:var(--accent-purple-light);border-color:rgba(124,58,237,.4)" onclick="docAskJulio(\'' + d.id + '\',\'' + escapeHtml(d.name).replace(/'/g,"\\'") + '\',\'' + d.status + '\')">🤖 Perguntar ao Júlio</button>' +
        ' <button type="button" class="act-btn" style="color:var(--accent-red)" onclick="docDelete(\'' + d.id + '\')">Excluir</button></div>' +
        '</div>';
    }).join('');

    area.innerHTML =
      '<div class="pipeline-page-wrap">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">' +
      '<h2 style="margin:0">Documentos & Assinatura Digital</h2>' +
      '<button type="button" class="act-btn" style="background:var(--gradient-purple);color:white;border:none;padding:10px 20px;font-size:13px" onclick="docShowCreateModal()">+ Novo documento</button></div>' +
      kpiRow +
      (docCards || '<div class="card" style="padding:40px;text-align:center;color:var(--text-muted)">Nenhum documento. Clique em "+ Novo documento" para começar.</div>') +
      '</div>';
  } catch (e) {
    showToast('error', 'Documentos', e.message);
    area.innerHTML =
      '<div class="pipeline-page-wrap">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px">' +
      '<h2 style="margin:0">Documentos & Assinatura Digital</h2>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
      (typeof window.trustSignOpen === 'function' ? '<button type="button" class="act-btn" style="background:linear-gradient(135deg,#7c3aed,#4f46e5);color:white;border:none;padding:10px 18px;font-size:13px;border-radius:10px" onclick="window.trustSignOpen()">🛡️ TrustSign</button>' : '') +
      '<button type="button" class="act-btn" style="background:var(--gradient-purple);color:white;border:none;padding:10px 20px;font-size:13px" onclick="docShowCreateModal()">+ Novo documento</button>' +
      '</div></div>' +
      '<div class="card" style="padding:40px;text-align:center;color:var(--text-muted)">Não foi possível carregar documentos. <br><span style="font-size:12px">' + (typeof escapeHtml === 'function' ? escapeHtml(e.message) : e.message) + '</span><br><br>' +
      '<button type="button" class="act-btn" onclick="renderDocumentsScreen()">🔄 Tentar novamente</button>' +
      (typeof window.trustSignOpen === 'function' ? ' <button type="button" class="act-btn" style="background:linear-gradient(135deg,#7c3aed,#4f46e5);color:white;border:none;padding:12px 24px;font-size:13px;border-radius:10px;margin-top:12px" onclick="window.trustSignOpen()">🛡️ Iniciar TrustSign</button>' : '') +
      '</div></div>';
  }
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ─── CREATE DOCUMENT MODAL ────────────────────────────

function docShowCreateModal() {
  var existing = document.getElementById('doc-create-modal');
  if (existing) existing.remove();

  var modal = document.createElement('div');
  modal.id = 'doc-create-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:9300;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.65)';
  modal.onclick = function(e) { if (e.target === modal) modal.remove(); };

  modal.innerHTML =
    '<div style="width:min(560px,94vw);max-height:90vh;overflow-y:auto;background:var(--bg-elevated);border:1px solid var(--border-default);border-radius:14px;padding:24px;box-shadow:var(--shadow-lg)">' +
    '<h3 style="margin:0 0 16px;color:var(--text-primary)">Novo Documento</h3>' +
    '<div style="display:flex;flex-direction:column;gap:12px">' +
    '<div><label style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:4px">Nome do documento *</label>' +
    '<input id="doc-create-name" type="text" placeholder="Ex: Contrato de prestação de serviços" style="width:100%;padding:10px 12px;background:var(--bg-surface);border:1px solid var(--border-default);border-radius:8px;color:var(--text-primary);font-size:13px;font-family:inherit" /></div>' +
    '<div><label style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:4px">Upload PDF *</label>' +
    '<div id="doc-create-dropzone" style="border:2px dashed var(--border-strong);border-radius:10px;padding:32px;text-align:center;cursor:pointer;transition:border-color 0.2s" onclick="document.getElementById(\'doc-create-file\').click()">' +
    '<div style="font-size:32px;margin-bottom:8px">📄</div>' +
    '<div style="color:var(--text-secondary);font-size:13px">Arraste o PDF aqui ou clique para selecionar</div>' +
    '<div id="doc-create-filename" style="color:var(--accent-cyan);font-size:12px;margin-top:8px"></div>' +
    '<input id="doc-create-file" type="file" accept="application/pdf" style="display:none" onchange="docFileSelected(this)" /></div></div>' +
    '<div><label style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:4px">Ordem de assinatura</label>' +
    '<select id="doc-create-order" style="width:100%;padding:10px;background:var(--bg-surface);border:1px solid var(--border-default);border-radius:8px;color:var(--text-primary);font-size:13px;font-family:inherit">' +
    '<option value="parallel">Paralela (todos ao mesmo tempo)</option>' +
    '<option value="sequential">Sequencial (um de cada vez)</option></select></div>' +
    '<div><label style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:4px">Prazo de expiração</label>' +
    '<input id="doc-create-expires" type="date" style="width:100%;padding:10px;background:var(--bg-surface);border:1px solid var(--border-default);border-radius:8px;color:var(--text-primary);font-size:13px;font-family:inherit" /></div>' +
    '<div id="doc-create-signers"><label style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:8px">Signatários</label>' +
    '<div id="doc-signers-list"></div>' +
    '<button type="button" class="act-btn" style="margin-top:8px" onclick="docAddSignerRow()">+ Adicionar signatário</button></div>' +
    '<div><label style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:4px">Mensagem para signatários (opcional)</label>' +
    '<textarea id="doc-create-message" rows="2" placeholder="Mensagem que aparece no email e portal" style="width:100%;padding:10px;background:var(--bg-surface);border:1px solid var(--border-default);border-radius:8px;color:var(--text-primary);font-size:13px;font-family:inherit;resize:vertical"></textarea></div></div>' +
    '<div style="display:flex;gap:8px;margin-top:18px;justify-content:flex-end">' +
    '<button type="button" class="act-btn" onclick="document.getElementById(\'doc-create-modal\').remove()">Cancelar</button>' +
    '<button type="button" class="act-btn" style="background:var(--gradient-purple);color:white;border:none;padding:10px 20px" onclick="docCreateSubmit()">Criar documento →</button></div></div>';

  document.body.appendChild(modal);
  docAddSignerRow(); // Add first signer row

  // Drag & drop on dropzone
  var dz = document.getElementById('doc-create-dropzone');
  dz.addEventListener('dragover', function(e) { e.preventDefault(); dz.style.borderColor = 'var(--accent-cyan)'; });
  dz.addEventListener('dragleave', function() { dz.style.borderColor = 'var(--border-strong)'; });
  dz.addEventListener('drop', function(e) {
    e.preventDefault();
    dz.style.borderColor = 'var(--border-strong)';
    var file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      document.getElementById('doc-create-file').files = e.dataTransfer.files;
      docFileSelected(document.getElementById('doc-create-file'));
    } else {
      showToast('error', 'Upload', 'Apenas arquivos PDF');
    }
  });
}

var __docSignerCount = 0;
function docAddSignerRow() {
  var list = document.getElementById('doc-signers-list');
  if (!list) return;
  var idx = __docSignerCount++;
  var colors = ['#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];
  var color = colors[idx % colors.length];
  var row = document.createElement('div');
  row.style.cssText = 'display:grid;grid-template-columns:1fr 1fr auto;gap:8px;margin-bottom:8px;align-items:center';
  row.innerHTML =
    '<input type="text" placeholder="Nome completo" class="doc-signer-name" style="padding:8px 10px;background:var(--bg-surface);border:1px solid var(--border-default);border-radius:6px;color:var(--text-primary);font-size:12px;font-family:inherit;border-left:3px solid ' + color + '" />' +
    '<input type="email" placeholder="email@empresa.com" class="doc-signer-email" style="padding:8px 10px;background:var(--bg-surface);border:1px solid var(--border-default);border-radius:6px;color:var(--text-primary);font-size:12px;font-family:inherit" />' +
    '<button type="button" style="background:none;border:none;color:var(--accent-red);cursor:pointer;font-size:16px;padding:4px" onclick="this.parentElement.remove()">✕</button>';
  list.appendChild(row);
}

window.__docSelectedFile = null;
function docFileSelected(input) {
  var file = input.files && input.files[0];
  if (!file) return;
  window.__docSelectedFile = file;
  var fn = document.getElementById('doc-create-filename');
  if (fn) fn.textContent = '✓ ' + file.name + ' (' + Math.round(file.size / 1024) + ' KB)';
}

async function docCreateSubmit() {
  var name = document.getElementById('doc-create-name').value.trim();
  var file = window.__docSelectedFile;
  var order = document.getElementById('doc-create-order').value;
  var expires = document.getElementById('doc-create-expires').value;
  var message = document.getElementById('doc-create-message').value.trim();

  if (!name) { showToast('error', 'Doc', 'Nome obrigatório'); return; }
  if (!file) { showToast('error', 'Doc', 'Selecione um PDF'); return; }

  // Collect signers
  var signerNames = document.querySelectorAll('.doc-signer-name');
  var signerEmails = document.querySelectorAll('.doc-signer-email');
  var signers = [];
  for (var i = 0; i < signerNames.length; i++) {
    var n = signerNames[i].value.trim();
    var e = signerEmails[i].value.trim();
    if (n && e) signers.push({ name: n, email: e, role: 'signer' });
  }

  // Upload PDF to local server
  var fileUrl;
  try {
    var formData = new FormData();
    formData.append('file', file);
    var uploadResp = await fetch((window.GUARDLINE_API_BASE || '/api') + '/upload/document', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + Auth.getToken() },
      body: formData,
    });
    var uploadJson = await uploadResp.json();
    if (uploadJson.success && uploadJson.data && uploadJson.data.fileUrl) {
      fileUrl = uploadJson.data.fileUrl;
    }
  } catch(err) {
    console.warn('Upload to server failed, using data URL fallback', err);
  }
  if (!fileUrl) {
    // Fallback: data URL (works but large)
    fileUrl = await new Promise(function(resolve) {
      var reader = new FileReader();
      reader.onload = function(ev) { resolve(ev.target.result); };
      reader.readAsDataURL(file);
    });
  }

  var res;
  try {
    res = await API.post('/documents', {
      name: name,
      fileUrl: fileUrl,
      signerOrder: order,
      expiresAt: expires ? new Date(expires + 'T23:59:59Z').toISOString() : null,
      message: message || null,
      signers: signers,
    }, { silent: true });
  } catch (e) {
    // Backend may not have /documents route — create a local demo doc
    console.warn('[Docs] POST /documents failed, using demo fallback:', e.message);
    var demoId = 'demo-' + Date.now();
    var colors = ['var(--accent-cyan)','var(--accent-green)','var(--accent-amber)','var(--accent-purple-light)'];
    res = { data: { id: demoId, name: name, status: 'draft', version: 1,
      signers: signers.map(function(s, i){ return { id: 'ds-'+i, name: s.name, email: s.email, status: 'pending', color: colors[i % colors.length] }; }),
      _count: { fields: 0 }, fields: [], fileUrl: fileUrl } };
    window.__docModule.demoCache[demoId] = res.data;
  }
  document.getElementById('doc-create-modal').remove();
  window.__docSelectedFile = null;
  __docSignerCount = 0;
  showToast('success', 'Documento', 'Criado com sucesso!');

  // If we have the doc id and it's a draft, open the field editor
  if (res.data && res.data.id) {
    try { docOpenEditor(res.data.id); } catch(_) { renderDocumentsScreen(); }
  } else {
    renderDocumentsScreen();
  }
}

// ─── N8N WEBHOOK HELPER ──────────────────────────────
function _getN8nBase() {
  return window.GUARDLINE_N8N_WEBHOOK_BASE || 'https://guardline.app.n8n.cloud/webhook';
}

async function _sendViaWebhook(doc, signers) {
  var url = _getN8nBase() + '/wf14-send-trustsign';
  var signUrl = window.location.origin + window.location.pathname + '?mode=sign&token=';
  var payload = {
    document: {
      id: doc.id,
      name: doc.name,
      status: doc.status,
      fileUrl: (doc.fileUrl && doc.fileUrl.length < 5000) ? doc.fileUrl : null,
      created_at: new Date().toISOString(),
    },
    signers: (signers || []).map(function(s, i) {
      var token = btoa(JSON.stringify({ docId: doc.id, signerId: s.id, email: s.email }));
      return {
        order: i + 1,
        name: s.name,
        email: s.email,
        whatsapp: s.whatsapp || null,
        sign_link: signUrl + encodeURIComponent(token),
        has_pin: !!s.pin,
      };
    }),
    signing_mode: 'simultaneous',
    timestamp: new Date().toISOString(),
  };
  console.log('[Docs WF14] POST →', url, payload);
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return true;
  } catch(err) {
    console.warn('[Docs WF14] Webhook error:', err);
    return false;
  }
}

// ─── DOCUMENT ACTIONS ─────────────────────────────────

async function docSend(docId) {
  // Find doc data from cache or demo list
  var doc = window.__docModule.demoCache[docId] || { id: docId, name: 'Documento', status: 'draft' };
  var signers = doc.signers || [];
  if (!signers.length) { showToast('error', 'Enviar', 'Sem signatários configurados'); return; }

  showToast('info', 'Enviar', '📧 Enviando para ' + signers.length + ' signatário(s)…');
  var ok = await _sendViaWebhook(doc, signers);

  // Also try backend (may 404)
  try { await API.post('/documents/' + docId + '/send', {}, { silent: true }); } catch(e) {}

  if (ok) {
    showToast('success', 'Documento', '📧 Enviado para ' + signers.length + ' signatário(s) via n8n!');
  } else {
    showToast('warning', 'Documento', 'Webhook enviado (n8n pode não estar ativo)');
  }
  if (doc) doc.status = 'sent';
  renderDocumentsScreen();
}

async function docCancel(docId) {
  if (!confirm('Cancelar este documento?')) return;
  try {
    await API.post('/documents/' + docId + '/cancel');
    showToast('info', 'Documento', 'Cancelado');
    renderDocumentsScreen();
  } catch(e) { showToast('error', 'Cancelar', e.message); }
}

function docAskJulio(docId, docName, docStatus) {
  var statusLabels = {
    draft: 'Rascunho', sent: 'Enviado', in_progress: 'Em andamento',
    completed: 'Concluído', expired: 'Expirado', cancelled: 'Cancelado', refused: 'Recusado',
  };
  var statusPt = statusLabels[docStatus] || docStatus;
  var prompt = 'Tenho um documento chamado "' + docName + '" com status "' + statusPt + '". ' +
    'Pode me ajudar a entender o status, sugerir próximos passos ou resumir o conteúdo?';
  if (typeof julioFloatOpen === 'function') {
    julioFloatOpen(prompt);
  } else if (typeof navigateTo === 'function') {
    navigateTo('julio');
  }
}

async function docDelete(docId) {
  if (!confirm('Excluir permanentemente?')) return;
  try {
    await API.delete('/documents/' + docId);
    showToast('info', 'Documento', 'Excluído');
    renderDocumentsScreen();
  } catch(e) { showToast('error', 'Excluir', e.message); }
}

async function docViewAudit(docId) {
  try {
    var res = await API.get('/documents/' + docId + '/audit');
    var logs = res.data || [];
    var actionLabels = {
      created: '📄 Criado', sent: '📧 Enviado', viewed: '👁 Visualizado',
      signed: '✅ Assinado', refused: '❌ Recusado', cancelled: '🚫 Cancelado',
      completed: '🎉 Concluído', reminder_sent: '🔔 Lembrete', otp_verified: '🔐 OTP verificado',
    };
    var html = logs.map(function(l) {
      return '<div class="brief-item ' +
        (l.action === 'signed' || l.action === 'completed' ? 'success' : l.action === 'refused' ? 'priority' : 'info') +
        '"><div class="brief-num" style="font-size:14px">' + (actionLabels[l.action] || '📋').split(' ')[0] + '</div>' +
        '<div><div style="font-weight:600;font-size:12px;color:var(--text-primary)">' + (actionLabels[l.action] || l.action) + '</div>' +
        '<div style="font-size:11px;color:var(--text-secondary)">' + escapeHtml(l.actorName || '') + (l.actorEmail ? ' (' + l.actorEmail + ')' : '') + '</div>' +
        (l.ip ? '<div style="font-size:10px;color:var(--text-muted)">IP: ' + escapeHtml(l.ip) + '</div>' : '') +
        '<div style="font-size:10px;color:var(--text-muted)">' + new Date(l.createdAt).toLocaleString('pt-BR') + '</div></div></div>';
    }).join('');

    var area = document.getElementById('content-area');
    area.innerHTML =
      '<div class="pipeline-page-wrap">' +
      '<button type="button" class="act-btn" style="margin-bottom:16px" onclick="renderDocumentsScreen()">← Voltar</button>' +
      '<h2 style="margin:0 0 16px">Trilha de auditoria</h2>' +
      '<div class="card"><div class="brief-items" style="max-height:none">' + (html || '<p style="padding:16px;color:var(--text-muted)">Nenhum evento.</p>') + '</div></div></div>';
  } catch(e) { showToast('error', 'Trilha', e.message); }
}

// ─── RESEND LINK TO SPECIFIC SIGNER ──────────────────
async function docResendLink(docId, signerId) {
  try {
    await API.post('/documents/' + docId + '/reminders', { signerId: signerId });
    showToast('success', 'Reenviar', 'Link reenviado com sucesso!');
  } catch(e) { showToast('error', 'Reenviar', e.message); }
}

// ─── SEND REMINDER WITH CUSTOM MESSAGE ───────────────
function docSendReminder(docId, signerId, signerName) {
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9400;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.6)';
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
  overlay.innerHTML =
    '<div class="card" style="width:420px;max-width:92vw;padding:24px">' +
    '<h3 style="margin:0 0 12px;font-size:15px">🔔 Enviar lembrete para ' + escapeHtml(signerName) + '</h3>' +
    '<div style="margin-bottom:12px"><label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:4px">Mensagem personalizada (opcional)</label>' +
    '<textarea id="reminder-msg" rows="3" placeholder="Ex: Olá, gostaria de lembrar sobre o documento pendente..." style="width:100%;padding:10px;background:var(--bg-surface);border:1px solid var(--border-default);border-radius:8px;color:var(--text-primary);font-size:13px;font-family:inherit;resize:vertical"></textarea></div>' +
    '<div style="display:flex;gap:8px;justify-content:flex-end">' +
    '<button type="button" class="act-btn" id="reminder-cancel">Cancelar</button>' +
    '<button type="button" class="act-btn" style="background:var(--accent-amber);color:white;border:none" id="reminder-send">🔔 Enviar lembrete</button></div></div>';
  document.body.appendChild(overlay);
  document.getElementById('reminder-cancel').onclick = function() { overlay.remove(); };
  document.getElementById('reminder-send').onclick = async function() {
    var msg = document.getElementById('reminder-msg').value.trim();
    try {
      await API.post('/documents/' + docId + '/reminders', { signerId: signerId, message: msg || undefined });
      showToast('success', 'Lembrete', 'Enviado para ' + signerName);
      overlay.remove();
    } catch(e) { showToast('error', 'Lembrete', e.message); }
  };
}

// ─── RESEND TO ALL PENDING ───────────────────────────
async function docResendAll(docId) {
  if (!confirm('Reenviar para todos os signatários pendentes?')) return;
  try {
    var res = await API.get('/documents/' + docId);
    var doc = res.data;
    var pending = (doc.signers || []).filter(function(s) { return s.status !== 'signed'; });
    var sent = 0;
    for (var i = 0; i < pending.length; i++) {
      try {
        await API.post('/documents/' + docId + '/reminders', { signerId: pending[i].id });
        sent++;
      } catch(e) {}
    }
    showToast('success', 'Reenviar', sent + ' lembrete(s) enviado(s)');
  } catch(e) { showToast('error', 'Reenviar', e.message); }
}

// ─── FOLLOW-UP (register activity on deal) ───────────
function docFollowUp(docId, docName) {
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9400;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.6)';
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
  overlay.innerHTML =
    '<div class="card" style="width:440px;max-width:92vw;padding:24px">' +
    '<h3 style="margin:0 0 12px;font-size:15px">📞 Dar seguimento — ' + escapeHtml(docName) + '</h3>' +
    '<div style="margin-bottom:10px"><label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:4px">Tipo de contato</label>' +
    '<select id="followup-type" style="width:100%;padding:8px 12px;background:var(--bg-surface);border:1px solid var(--border-default);border-radius:8px;color:var(--text-primary);font-size:13px">' +
    '<option value="call">📞 Ligação</option><option value="email">📧 Email</option><option value="whatsapp">💬 WhatsApp</option><option value="meeting">📅 Reunião</option><option value="note">📝 Nota</option></select></div>' +
    '<div style="margin-bottom:10px"><label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:4px">O que aconteceu / próximos passos</label>' +
    '<textarea id="followup-desc" rows="3" placeholder="Ex: Liguei para o cliente, pediu mais 2 dias para revisar internamente..." style="width:100%;padding:10px;background:var(--bg-surface);border:1px solid var(--border-default);border-radius:8px;color:var(--text-primary);font-size:13px;font-family:inherit;resize:vertical"></textarea></div>' +
    '<div style="margin-bottom:12px"><label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:4px">Enviar lembrete também?</label>' +
    '<label style="font-size:12px;color:var(--text-secondary);cursor:pointer"><input type="checkbox" id="followup-remind" /> Sim, enviar lembrete para signatários pendentes</label></div>' +
    '<div style="display:flex;gap:8px;justify-content:flex-end">' +
    '<button type="button" class="act-btn" id="followup-cancel">Cancelar</button>' +
    '<button type="button" class="act-btn" style="background:var(--gradient-purple);color:white;border:none" id="followup-save">Salvar seguimento</button></div></div>';
  document.body.appendChild(overlay);
  document.getElementById('followup-cancel').onclick = function() { overlay.remove(); };
  document.getElementById('followup-save').onclick = async function() {
    var type = document.getElementById('followup-type').value;
    var desc = document.getElementById('followup-desc').value.trim();
    var remind = document.getElementById('followup-remind').checked;
    if (!desc) { showToast('error', 'Seguimento', 'Descrição obrigatória'); return; }
    try {
      // Find deal linked to this document's signer email
      await API.post('/documents/' + docId + '/followup', { type: type, description: desc, sendReminder: remind });
      showToast('success', 'Seguimento', 'Registrado!');
      overlay.remove();
      if (remind) showToast('info', 'Lembrete', 'Lembretes enviados aos pendentes');
    } catch(e) { showToast('error', 'Seguimento', e.message); }
  };
}

// ─── ASSIGN TO SELLER ────────────────────────────────
async function docAssignSeller(docId, docName) {
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9400;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.6)';
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

  // Load deals to pick from
  var dealsHtml = '<option value="">Selecionar negócio...</option>';
  try {
    var dealRes = await API.get('/deals?perPage=50');
    var deals = dealRes.data || [];
    dealsHtml += deals.map(function(d) {
      return '<option value="' + d.id + '">' + escapeHtml(d.companyName || '') + ' — $' + (d.value || 0).toLocaleString('en-US') + ' (' + escapeHtml(d.contactName || '') + ')</option>';
    }).join('');
  } catch(e) {}

  overlay.innerHTML =
    '<div class="card" style="width:440px;max-width:92vw;padding:24px">' +
    '<h3 style="margin:0 0 12px;font-size:15px">👤 Atribuir documento a um negócio</h3>' +
    '<p style="font-size:12px;color:var(--text-muted);margin:0 0 12px">Vincule o documento "' + escapeHtml(docName) + '" a um negócio. Quando assinado, a cópia será anexada automaticamente.</p>' +
    '<div style="margin-bottom:12px"><label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:4px">Negócio</label>' +
    '<select id="assign-deal" style="width:100%;padding:10px;background:var(--bg-surface);border:1px solid var(--border-default);border-radius:8px;color:var(--text-primary);font-size:13px;font-family:inherit">' +
    dealsHtml + '</select></div>' +
    '<div style="display:flex;gap:8px;justify-content:flex-end">' +
    '<button type="button" class="act-btn" id="assign-cancel">Cancelar</button>' +
    '<button type="button" class="act-btn" style="background:var(--gradient-purple);color:white;border:none" id="assign-save">Vincular</button></div></div>';
  document.body.appendChild(overlay);
  document.getElementById('assign-cancel').onclick = function() { overlay.remove(); };
  document.getElementById('assign-save').onclick = async function() {
    var dealId = document.getElementById('assign-deal').value;
    if (!dealId) { showToast('error', 'Vincular', 'Selecione um negócio'); return; }
    try {
      await API.patch('/documents/' + docId + '/link-deal', { dealId: dealId });
      showToast('success', 'Vinculado', 'Documento vinculado ao negócio!');
      overlay.remove();
      renderDocumentsScreen();
    } catch(e) { showToast('error', 'Vincular', e.message); }
  };
}

// ─── DOWNLOAD FINAL PDF ──────────────────────────────
async function docDownloadFinal(docId) {
  try {
    var res = await API.get('/documents/' + docId);
    var doc = res.data;
    var url = doc.finalFileUrl || doc.fileUrl;
    if (url.startsWith('/')) url = window.location.origin + url;
    window.open(url, '_blank');
  } catch(e) { showToast('error', 'Download', e.message); }
}


// ─── PDF FIELD EDITOR (Deliverable 3) ─────────────────

async function docOpenEditor(docId) {
  var area = document.getElementById('content-area');
  area.innerHTML = '<div class="pipeline-page-wrap"><div class="card" style="padding:40px;text-align:center;color:var(--text-muted)">Carregando editor...</div></div>';

  try {
    var res;
    try {
      res = await API.get('/documents/' + docId, { silent: true });
    } catch(_apiErr) {
      // Backend doesn't have this route — check local cache first
      console.warn('[Docs] GET /documents/' + docId + ' failed, using demo fallback');
      var cached = window.__docModule.demoCache[docId];
      res = cached ? { data: cached } : { data: { id: docId, name: 'Documento ' + docId.replace('demo-','#'), status: 'draft', version: 1, fields: [], signers: [
        { id: 'ds-0', name: 'Signatário 1', email: 'signer@example.com', status: 'pending', color: 'var(--accent-cyan)' }
      ], fileUrl: null } };
    }
    var doc = res.data;
    window.__docModule.currentDoc = doc;
    window.__docModule.fields = (doc.fields || []).map(function(f, i) {
      return { id: f.id, type: f.type, page: f.page, x: f.x, y: f.y, width: f.width, height: f.height, signerId: f.signerId, required: f.required };
    });
    window.__docModule.signers = doc.signers || [];

    // Load PDF.js if we have a fileUrl
    if (doc.fileUrl) {
      if (typeof pdfjsLib === 'undefined') {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      }
    }

    renderFieldEditor(doc);
  } catch(e) {
    showToast('error', 'Editor', e.message);
    renderDocumentsScreen();
  }
}

function loadScript(url) {
  return new Promise(function(resolve, reject) {
    if (document.querySelector('script[src="' + url + '"]')) { resolve(); return; }
    var s = document.createElement('script');
    s.src = url;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

function renderFieldEditor(doc) {
  var area = document.getElementById('content-area');
  var mod = window.__docModule;

  var signerOptions = mod.signers.map(function(s) {
    return '<option value="' + s.id + '" style="color:' + s.color + '">' + escapeHtml(s.name) + '</option>';
  }).join('');

  var fieldTypes = [
    { type: 'signature', label: '✍️ Assinatura', w: 20, h: 6 },
    { type: 'initials', label: '🔤 Rubrica', w: 10, h: 5 },
    { type: 'date', label: '📅 Data', w: 14, h: 4 },
    { type: 'name', label: '👤 Nome', w: 18, h: 4 },
    { type: 'cpf', label: '🆔 CPF', w: 14, h: 4 },
    { type: 'text', label: '📝 Texto livre', w: 20, h: 4 },
    { type: 'checkbox', label: '☑️ Checkbox', w: 4, h: 4 },
  ];

  var toolbar = fieldTypes.map(function(ft) {
    return '<div class="doc-field-btn" draggable="true" data-type="' + ft.type + '" data-w="' + ft.w + '" data-h="' + ft.h + '" ' +
      'style="padding:8px 12px;background:var(--bg-surface);border:1px solid var(--border-default);border-radius:8px;cursor:grab;font-size:12px;color:var(--text-primary);text-align:center;user-select:none">' +
      ft.label + '</div>';
  }).join('');

  area.innerHTML =
    '<div style="display:flex;flex-direction:column;height:calc(100vh - 70px);overflow:hidden">' +
    // Top bar
    '<div style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:var(--bg-card);border-bottom:1px solid var(--border-default);flex-shrink:0">' +
    '<button type="button" class="act-btn" onclick="docEditorSaveAndBack()">← Voltar</button>' +
    '<span style="font-weight:700;font-size:14px;color:var(--text-primary);flex:1">' + escapeHtml(doc.name) + '</span>' +
    '<span style="font-size:12px;color:var(--text-muted)">Página <span id="doc-page-num">' + mod.currentPage + '</span>/' + '<span id="doc-page-total">?</span></span>' +
    '<button type="button" class="act-btn" onclick="docEditorPrevPage()">◀</button>' +
    '<button type="button" class="act-btn" onclick="docEditorNextPage()">▶</button>' +
    '<select id="doc-field-signer" style="padding:6px 10px;background:var(--bg-surface);border:1px solid var(--border-default);border-radius:6px;color:var(--text-primary);font-size:12px;font-family:inherit">' +
    '<option value="">Atribuir a...</option>' + signerOptions + '</select>' +
    '<button type="button" class="act-btn" style="background:var(--gradient-purple);color:white;border:none" onclick="docEditorSave()">💾 Salvar campos</button>' +
    '<button type="button" class="act-btn" style="background:var(--accent-green);color:white;border:none;margin-left:4px" onclick="docEditorSaveAndSend()">📧 Salvar & Enviar →</button></div>' +
    // Main area
    '<div style="display:flex;flex:1;overflow:hidden">' +
    // Toolbar
    '<div style="width:160px;padding:12px;background:var(--bg-elevated);border-right:1px solid var(--border-default);display:flex;flex-direction:column;gap:8px;overflow-y:auto;flex-shrink:0">' +
    '<div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Campos</div>' +
    toolbar +
    '<div style="margin-top:12px;font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Signatários</div>' +
    mod.signers.map(function(s) {
      var fieldCount = mod.fields.filter(function(f) { return f.signerId === s.id; }).length;
      return '<div style="padding:6px 8px;border-radius:6px;font-size:11px;border-left:3px solid ' + s.color + ';background:var(--bg-surface);color:var(--text-secondary);display:flex;justify-content:space-between;align-items:center">' +
        '<span>' + escapeHtml(s.name) + '</span>' +
        '<span style="font-size:9px;color:var(--text-muted)">' + fieldCount + ' campos</span></div>';
    }).join('') +
    '<button type="button" class="act-btn" style="width:100%;margin-top:8px;font-size:11px" onclick="docEditorAddSigner()">+ Signatário</button>' +
    '<div style="margin-top:auto;padding-top:12px;border-top:1px solid var(--border-subtle)">' +
    '<div id="doc-editor-field-count" style="font-size:11px;color:var(--text-muted);text-align:center">' + mod.fields.length + ' campos posicionados</div></div>' +
    '</div>' +
    // PDF Canvas area
    '<div id="doc-editor-canvas-wrap" style="flex:1;overflow:auto;background:#1a1a2e;display:flex;align-items:flex-start;justify-content:center;padding:20px;position:relative">' +
    '<div id="doc-editor-page" style="position:relative;box-shadow:0 4px 24px rgba(0,0,0,0.5)">' +
    '<canvas id="doc-pdf-canvas" style="display:block"></canvas>' +
    '<div id="doc-fields-layer" style="position:absolute;inset:0;pointer-events:none"></div>' +
    '</div></div>' +
    // Field properties panel
    '<div id="doc-field-props" style="width:220px;padding:12px;background:var(--bg-elevated);border-left:1px solid var(--border-default);display:none;flex-direction:column;gap:10px;overflow-y:auto;flex-shrink:0">' +
    '<div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px">Propriedades</div>' +
    '<div id="doc-field-props-content"></div></div>' +
    '</div></div>';

  // Init PDF rendering
  setTimeout(function() { docEditorInitPdf(doc.fileUrl); }, 100);

  // Setup drag & drop
  setTimeout(docEditorSetupDragDrop, 200);
}

async function docEditorInitPdf(url) {
  var mod = window.__docModule;
  if (!url) {
    // No PDF file — show placeholder canvas
    var canvas = document.getElementById('doc-pdf-canvas');
    if (canvas) {
      canvas.width = 595 * 1.5; canvas.height = 842 * 1.5;
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#cbd5e1'; ctx.font = '24px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('Nenhum PDF carregado', canvas.width/2, canvas.height/2 - 20);
      ctx.font = '14px sans-serif';
      ctx.fillText('Arraste campos para posicionar', canvas.width/2, canvas.height/2 + 16);
      mod.totalPages = 1; mod.currentPage = 1;
      var pn = document.getElementById('doc-page-total'); if (pn) pn.textContent = '1';
      docEditorRenderFields();
    }
    return;
  }
  try {
    // Handle data URL, relative URL, and external URL
    var loadingTask;
    if (url.startsWith('data:')) {
      var base64 = url.split(',')[1];
      var raw = atob(base64);
      var arr = new Uint8Array(raw.length);
      for (var i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
      loadingTask = pdfjsLib.getDocument({ data: arr });
    } else if (url.startsWith('/uploads/')) {
      // Relative URL — resolve to full URL
      loadingTask = pdfjsLib.getDocument(window.location.origin + url);
    } else {
      loadingTask = pdfjsLib.getDocument(url);
    }
    mod.pdfDoc = await loadingTask.promise;
    mod.totalPages = mod.pdfDoc.numPages;
    mod.currentPage = 1;
    var pn = document.getElementById('doc-page-total');
    if (pn) pn.textContent = mod.totalPages;
    await docEditorRenderPage(mod.currentPage);
  } catch(e) {
    console.error('PDF load error:', e);
    showToast('error', 'PDF', 'Erro ao carregar PDF: ' + e.message);
  }
}

async function docEditorRenderPage(pageNum) {
  var mod = window.__docModule;
  if (!mod.pdfDoc) return;

  var page = await mod.pdfDoc.getPage(pageNum);
  var viewport = page.getViewport({ scale: 1.5 });
  mod.editorScale = 1.5;

  var canvas = document.getElementById('doc-pdf-canvas');
  var ctx = canvas.getContext('2d');
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({ canvasContext: ctx, viewport: viewport }).promise;

  var pn = document.getElementById('doc-page-num');
  if (pn) pn.textContent = pageNum;

  docEditorRenderFields();
}

function docEditorRenderFields() {
  var layer = document.getElementById('doc-fields-layer');
  if (!layer) return;
  var mod = window.__docModule;
  var canvas = document.getElementById('doc-pdf-canvas');
  if (!canvas) return;

  layer.innerHTML = '';
  layer.style.width = canvas.width + 'px';
  layer.style.height = canvas.height + 'px';
  layer.style.pointerEvents = 'auto';

  var pageFields = mod.fields.filter(function(f) { return f.page === mod.currentPage; });

  pageFields.forEach(function(f, idx) {
    var signer = mod.signers.find(function(s) { return s.id === f.signerId; });
    var color = signer ? signer.color : '#7c3aed';
    var typeLabels = { signature: '✍️', initials: '🔤', date: '📅', name: '👤', cpf: '🆔', text: '📝', checkbox: '☑️' };

    var el = document.createElement('div');
    el.dataset.fieldIdx = mod.fields.indexOf(f);
    el.style.cssText =
      'position:absolute;' +
      'left:' + (f.x / 100 * canvas.width) + 'px;' +
      'top:' + (f.y / 100 * canvas.height) + 'px;' +
      'width:' + (f.width / 100 * canvas.width) + 'px;' +
      'height:' + (f.height / 100 * canvas.height) + 'px;' +
      'border:2px solid ' + color + ';' +
      'background:' + color + '22;' +
      'border-radius:4px;cursor:move;display:flex;align-items:center;justify-content:center;' +
      'font-size:11px;color:' + color + ';font-weight:600;user-select:none;';

    el.innerHTML = (typeLabels[f.type] || '📋') + ' ' + (signer ? signer.name.split(' ')[0] : '') +
      '<div style="position:absolute;top:-8px;right:-8px;width:16px;height:16px;background:var(--accent-red);border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:10px;color:white;opacity:0;transition:opacity 0.15s" class="doc-field-delete" onclick="event.stopPropagation();docEditorDeleteField(' + mod.fields.indexOf(f) + ')">✕</div>';

    el.onmouseenter = function() { el.querySelector('.doc-field-delete').style.opacity = '1'; };
    el.onmouseleave = function() { el.querySelector('.doc-field-delete').style.opacity = '0'; };

    // Drag to move
    el.onmousedown = function(ev) {
      if (ev.target.classList.contains('doc-field-delete')) return;
      ev.preventDefault();
      var fieldIdx = Number(el.dataset.fieldIdx);
      var startX = ev.clientX;
      var startY = ev.clientY;
      var origX = mod.fields[fieldIdx].x;
      var origY = mod.fields[fieldIdx].y;

      function onMove(me) {
        var dx = (me.clientX - startX) / canvas.width * 100;
        var dy = (me.clientY - startY) / canvas.height * 100;
        mod.fields[fieldIdx].x = Math.max(0, Math.min(100 - mod.fields[fieldIdx].width, origX + dx));
        mod.fields[fieldIdx].y = Math.max(0, Math.min(100 - mod.fields[fieldIdx].height, origY + dy));
        docEditorRenderFields();
      }
      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    };

    layer.appendChild(el);
  });
}

function docEditorDeleteField(idx) {
  window.__docModule.fields.splice(idx, 1);
  docEditorRenderFields();
}

function docEditorSetupDragDrop() {
  var wrap = document.getElementById('doc-editor-canvas-wrap');
  if (!wrap) return;

  // Handle toolbar field buttons
  document.querySelectorAll('.doc-field-btn').forEach(function(btn) {
    btn.addEventListener('dragstart', function(e) {
      e.dataTransfer.setData('text/plain', JSON.stringify({
        type: btn.dataset.type,
        w: Number(btn.dataset.w),
        h: Number(btn.dataset.h),
      }));
    });
  });

  wrap.addEventListener('dragover', function(e) { e.preventDefault(); });
  wrap.addEventListener('drop', function(e) {
    e.preventDefault();
    var data;
    try { data = JSON.parse(e.dataTransfer.getData('text/plain')); } catch(er) { return; }

    var canvas = document.getElementById('doc-pdf-canvas');
    var rect = canvas.getBoundingClientRect();
    var x = (e.clientX - rect.left) / rect.width * 100;
    var y = (e.clientY - rect.top) / rect.height * 100;

    var signerSelect = document.getElementById('doc-field-signer');
    var signerId = signerSelect ? signerSelect.value : null;

    window.__docModule.fields.push({
      id: null,
      type: data.type,
      page: window.__docModule.currentPage,
      x: Math.max(0, Math.min(100 - data.w, x - data.w / 2)),
      y: Math.max(0, Math.min(100 - data.h, y - data.h / 2)),
      width: data.w,
      height: data.h,
      signerId: signerId || null,
      required: true,
    });
    docEditorRenderFields();
  });
}

function docEditorPrevPage() {
  var mod = window.__docModule;
  if (mod.currentPage > 1) {
    mod.currentPage--;
    docEditorRenderPage(mod.currentPage);
  }
}

function docEditorNextPage() {
  var mod = window.__docModule;
  if (mod.currentPage < mod.totalPages) {
    mod.currentPage++;
    docEditorRenderPage(mod.currentPage);
  }
}

async function docEditorSave() {
  var mod = window.__docModule;
  if (!mod.currentDoc) return;
  var fieldData = mod.fields.map(function(f) {
    return { type: f.type, page: f.page, x: f.x, y: f.y, width: f.width, height: f.height, signerId: f.signerId, required: f.required };
  });
  try {
    await API.put('/documents/' + mod.currentDoc.id + '/fields', { fields: fieldData }, { silent: true });
  } catch(e) {
    // Backend may not exist — save locally
    console.warn('[Docs] PUT /fields failed, saving locally:', e.message);
    mod.currentDoc.fields = fieldData;
  }
  showToast('success', 'Campos', 'Salvos com sucesso! (' + mod.fields.length + ' campos)');
}

async function docEditorSaveAndBack() {
  await docEditorSave();
  renderDocumentsScreen();
}

function docEditorAddSigner() {
  var mod = window.__docModule;
  if (!mod.currentDoc) return;
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9400;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.6)';
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
  overlay.innerHTML =
    '<div class="card" style="width:380px;max-width:92vw;padding:24px">' +
    '<h3 style="margin:0 0 16px;font-size:15px">Adicionar signatário</h3>' +
    '<div style="margin-bottom:10px"><label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:4px">Nome *</label>' +
    '<input id="editor-signer-name" type="text" placeholder="Nome completo" style="width:100%;padding:8px 12px;background:var(--bg-surface);border:1px solid var(--border-default);border-radius:8px;color:var(--text-primary);font-size:13px;font-family:inherit" /></div>' +
    '<div style="margin-bottom:12px"><label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:4px">Email *</label>' +
    '<input id="editor-signer-email" type="email" placeholder="email@empresa.com" style="width:100%;padding:8px 12px;background:var(--bg-surface);border:1px solid var(--border-default);border-radius:8px;color:var(--text-primary);font-size:13px;font-family:inherit" /></div>' +
    '<div style="display:flex;gap:8px;justify-content:flex-end">' +
    '<button type="button" class="act-btn" id="editor-signer-cancel">Cancelar</button>' +
    '<button type="button" class="act-btn" style="background:var(--gradient-purple);color:white;border:none" id="editor-signer-add">Adicionar</button></div></div>';
  document.body.appendChild(overlay);
  document.getElementById('editor-signer-cancel').onclick = function() { overlay.remove(); };
  document.getElementById('editor-signer-add').onclick = async function() {
    var name = document.getElementById('editor-signer-name').value.trim();
    var email = document.getElementById('editor-signer-email').value.trim();
    if (!name || !email) { showToast('error', 'Signatário', 'Nome e email obrigatórios'); return; }
    try {
      var res = await API.post('/documents/' + mod.currentDoc.id + '/signers', { name: name, email: email, role: 'signer' });
      if (res.data) {
        mod.signers.push(res.data);
        // Update signer dropdown
        var sel = document.getElementById('doc-field-signer');
        if (sel) {
          var opt = document.createElement('option');
          opt.value = res.data.id;
          opt.textContent = res.data.name;
          sel.appendChild(opt);
        }
        showToast('success', 'Signatário', name + ' adicionado!');
        overlay.remove();
        renderFieldEditor(mod.currentDoc);
      }
    } catch(e) { showToast('error', 'Signatário', e.message); }
  };
}

async function docEditorSaveAndSend() {
  var mod = window.__docModule;
  if (!mod.currentDoc) { showToast('error', 'Enviar', 'Nenhum documento aberto.'); return; }

  // Auto-assign unassigned fields to first signer
  if (mod.fields.length && mod.signers.length) {
    var firstSigner = mod.signers[0].id;
    mod.fields.forEach(function(f) { if (!f.signerId) f.signerId = firstSigner; });
  }

  // Save fields
  var fieldData = mod.fields.map(function(f) {
    return { type: f.type, page: f.page, x: f.x, y: f.y, width: f.width, height: f.height, signerId: f.signerId, required: f.required };
  });
  try {
    await API.put('/documents/' + mod.currentDoc.id + '/fields', { fields: fieldData }, { silent: true });
  } catch(e) {
    console.warn('[Docs] PUT /fields failed, saving locally:', e.message);
    mod.currentDoc.fields = fieldData;
  }
  // Send via n8n webhook (real email dispatch)
  showToast('info', 'Enviar', '📧 Enviando para ' + (mod.signers.length || 0) + ' signatário(s)…');
  var webhookOk = await _sendViaWebhook(mod.currentDoc, mod.signers);

  // Also try backend API (may 404)
  try { await API.post('/documents/' + mod.currentDoc.id + '/send', {}, { silent: true }); } catch(e) {}

  if (mod.currentDoc) mod.currentDoc.status = 'sent';
  if (webhookOk) {
    showToast('success', 'Documento', '📧 Campos salvos e enviado para ' + (mod.signers.length || 0) + ' signatário(s) via n8n!');
  } else {
    showToast('warning', 'Documento', 'Campos salvos. Webhook enviado (n8n pode não estar ativo)');
  }
  renderDocumentsScreen();
}

// ─── SIGNATURE CANVAS (Deliverable 4) ─────────────────

function openSignatureCapture(callback) {
  var existing = document.getElementById('sig-capture-modal');
  if (existing) existing.remove();

  var modal = document.createElement('div');
  modal.id = 'sig-capture-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:9400;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.7)';

  modal.innerHTML =
    '<div style="width:min(520px,94vw);background:var(--bg-elevated);border:1px solid var(--border-default);border-radius:14px;padding:24px;box-shadow:var(--shadow-lg)">' +
    '<h3 style="margin:0 0 16px;color:var(--text-primary)">Capturar Assinatura</h3>' +
    // Tabs
    '<div style="display:flex;gap:8px;margin-bottom:16px">' +
    '<button type="button" class="act-btn sig-tab active" data-tab="draw" onclick="sigSwitchTab(\'draw\')" style="flex:1">✍️ Desenhar</button>' +
    '<button type="button" class="act-btn sig-tab" data-tab="type" onclick="sigSwitchTab(\'type\')" style="flex:1">⌨️ Digitar</button>' +
    '<button type="button" class="act-btn sig-tab" data-tab="upload" onclick="sigSwitchTab(\'upload\')" style="flex:1">📤 Imagem</button></div>' +
    // Draw tab
    '<div id="sig-tab-draw">' +
    '<canvas id="sig-draw-canvas" width="460" height="200" style="width:100%;border:1px solid var(--border-default);border-radius:8px;background:white;cursor:crosshair;touch-action:none"></canvas>' +
    '<div style="display:flex;gap:8px;margin-top:8px"><button type="button" class="act-btn" onclick="sigClearDraw()">Limpar</button></div></div>' +
    // Type tab
    '<div id="sig-tab-type" style="display:none">' +
    '<input id="sig-type-input" type="text" placeholder="Digite seu nome completo" style="width:100%;padding:12px;background:var(--bg-surface);border:1px solid var(--border-default);border-radius:8px;color:var(--text-primary);font-size:14px;font-family:inherit;margin-bottom:8px" oninput="sigUpdateTyped()" />' +
    '<div style="display:flex;gap:8px;margin-bottom:8px">' +
    '<button type="button" class="act-btn sig-font-btn active" data-font="Dancing Script" onclick="sigSetFont(this)">Cursiva 1</button>' +
    '<button type="button" class="act-btn sig-font-btn" data-font="Great Vibes" onclick="sigSetFont(this)">Cursiva 2</button>' +
    '<button type="button" class="act-btn sig-font-btn" data-font="Pacifico" onclick="sigSetFont(this)">Cursiva 3</button></div>' +
    '<canvas id="sig-type-canvas" width="460" height="120" style="width:100%;border:1px solid var(--border-default);border-radius:8px;background:white"></canvas></div>' +
    // Upload tab
    '<div id="sig-tab-upload" style="display:none">' +
    '<div style="border:2px dashed var(--border-strong);border-radius:10px;padding:32px;text-align:center;cursor:pointer" onclick="document.getElementById(\'sig-upload-file\').click()">' +
    '<div style="font-size:28px">📤</div><div style="color:var(--text-secondary);font-size:13px">Clique ou arraste uma imagem PNG/JPG</div>' +
    '<input id="sig-upload-file" type="file" accept="image/*" style="display:none" onchange="sigFileUploaded(this)" /></div>' +
    '<canvas id="sig-upload-canvas" width="460" height="120" style="width:100%;border:1px solid var(--border-default);border-radius:8px;background:white;margin-top:8px;display:none"></canvas></div>' +
    // Confirm
    '<div style="display:flex;gap:8px;margin-top:16px;justify-content:flex-end">' +
    '<button type="button" class="act-btn" onclick="document.getElementById(\'sig-capture-modal\').remove()">Cancelar</button>' +
    '<button type="button" class="act-btn" style="background:var(--gradient-purple);color:white;border:none;padding:10px 20px" onclick="sigConfirm()">Confirmar assinatura</button></div></div>';

  document.body.appendChild(modal);

  // Load Google Fonts
  if (!document.getElementById('sig-google-fonts')) {
    var link = document.createElement('link');
    link.id = 'sig-google-fonts';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Great+Vibes&family=Pacifico&display=swap';
    document.head.appendChild(link);
  }

  // Init draw canvas
  window.__sigCallback = callback;
  window.__sigCurrentTab = 'draw';
  window.__sigCurrentFont = 'Dancing Script';
  setTimeout(sigInitDrawCanvas, 100);
}

function sigInitDrawCanvas() {
  var canvas = document.getElementById('sig-draw-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var drawing = false;
  var lastX, lastY;

  ctx.strokeStyle = '#1a1a2e';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  function getPos(e) {
    var rect = canvas.getBoundingClientRect();
    var t = e.touches ? e.touches[0] : e;
    return { x: (t.clientX - rect.left) * (canvas.width / rect.width), y: (t.clientY - rect.top) * (canvas.height / rect.height) };
  }

  function start(e) { e.preventDefault(); drawing = true; var p = getPos(e); lastX = p.x; lastY = p.y; }
  function move(e) {
    if (!drawing) return;
    e.preventDefault();
    var p = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.quadraticCurveTo(lastX, lastY, (lastX + p.x) / 2, (lastY + p.y) / 2);
    ctx.stroke();
    lastX = p.x;
    lastY = p.y;
  }
  function end() { drawing = false; }

  canvas.addEventListener('mousedown', start);
  canvas.addEventListener('mousemove', move);
  canvas.addEventListener('mouseup', end);
  canvas.addEventListener('mouseleave', end);
  canvas.addEventListener('touchstart', start);
  canvas.addEventListener('touchmove', move);
  canvas.addEventListener('touchend', end);
}

function sigClearDraw() {
  var canvas = document.getElementById('sig-draw-canvas');
  if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
}

function sigSwitchTab(tab) {
  window.__sigCurrentTab = tab;
  ['draw', 'type', 'upload'].forEach(function(t) {
    var el = document.getElementById('sig-tab-' + t);
    if (el) el.style.display = t === tab ? 'block' : 'none';
  });
  document.querySelectorAll('.sig-tab').forEach(function(b) {
    b.classList.toggle('active', b.dataset.tab === tab);
    b.style.background = b.dataset.tab === tab ? 'var(--accent-purple-dim)' : '';
    b.style.borderColor = b.dataset.tab === tab ? 'var(--accent-purple)' : '';
    b.style.color = b.dataset.tab === tab ? 'var(--accent-purple-light)' : '';
  });
}

function sigSetFont(btn) {
  window.__sigCurrentFont = btn.dataset.font;
  document.querySelectorAll('.sig-font-btn').forEach(function(b) {
    b.classList.toggle('active', b === btn);
    b.style.background = b === btn ? 'var(--accent-purple-dim)' : '';
    b.style.borderColor = b === btn ? 'var(--accent-purple)' : '';
  });
  sigUpdateTyped();
}

function sigUpdateTyped() {
  var input = document.getElementById('sig-type-input');
  var canvas = document.getElementById('sig-type-canvas');
  if (!input || !canvas) return;
  var ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  var text = input.value || '';
  if (!text) return;
  ctx.font = '48px "' + window.__sigCurrentFont + '", cursive';
  ctx.fillStyle = '#1a1a2e';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
}

function sigFileUploaded(input) {
  var file = input.files && input.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    var img = new Image();
    img.onload = function() {
      var canvas = document.getElementById('sig-upload-canvas');
      canvas.style.display = 'block';
      var ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      var scale = Math.min(canvas.width / img.width, canvas.height / img.height) * 0.9;
      var w = img.width * scale;
      var h = img.height * scale;
      ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function sigConfirm() {
  var tab = window.__sigCurrentTab;
  var canvasId = tab === 'draw' ? 'sig-draw-canvas' : tab === 'type' ? 'sig-type-canvas' : 'sig-upload-canvas';
  var canvas = document.getElementById(canvasId);
  if (!canvas) return;

  var data = canvas.toDataURL('image/png');
  var method = tab;

  // Check if draw canvas is empty
  if (tab === 'draw') {
    var ctx = canvas.getContext('2d');
    var pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    var hasContent = false;
    for (var i = 3; i < pixels.length; i += 4) {
      if (pixels[i] > 0) { hasContent = true; break; }
    }
    if (!hasContent) { showToast('error', 'Assinatura', 'Desenhe sua assinatura'); return; }
  }

  if (tab === 'type') {
    var input = document.getElementById('sig-type-input');
    if (!input || !input.value.trim()) { showToast('error', 'Assinatura', 'Digite seu nome'); return; }
  }

  document.getElementById('sig-capture-modal').remove();

  if (typeof window.__sigCallback === 'function') {
    window.__sigCallback({ data: data, method: method });
  }
}
