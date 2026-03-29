# PROMPT — Guardline Revenue OS: Full Dashboard Overhaul

## CONTEXTO

Estás trabalhando no arquivo `guardline/frontend/guardline.html` — um dashboard monolítico (HTML+CSS+JS inline, ~470KB).

O backend Express+Prisma+SQLite está 100% funcional em `guardline/backend/` com dados seed (31 deals, 50 leads, signals, automations, etc). Todas as chamadas API usam o helper `API.get(path)` / `API.post(path, body)` / `API.patch(path, body)` / `API.delete(path)` que já resolve auth JWT automaticamente.

**O problema:** Muitas páginas estão com visual básico (tabelas simples, sem gráficos, sem interatividade). O Command Center/Dashboard já tem visual premium. Todas as outras telas precisam seguir o MESMO padrão visual.

---

## DESIGN SYSTEM OBRIGATÓRIO

Usar EXATAMENTE estas classes e padrões do Command Center:

### Cores (CSS Variables já existem)
```
--bg-card: #131728          --accent-purple: #7c3aed
--bg-elevated: #1a1f35      --accent-purple-light: #9d5cf5
--bg-surface: #0f1220       --accent-cyan: #06b6d4
--border-default: #1e2540   --accent-red: #ef4444
--border-subtle: #1a2040    --accent-amber: #f59e0b
--border-strong: #2a3255    --accent-green: #10b981
--text-primary: #e2e8f0     --text-secondary: #94a3b8
--text-muted: #475569
```

### Card Base
```css
.card {
  background: var(--bg-card);
  border: 1px solid var(--border-default);
  border-radius: 14px;
  padding: 18px;
  animation: slide-up 0.4s ease;
}
```

### KPI Cards (usar em TODAS as telas que têm métricas)
```css
.kpi-card {
  padding: 10px 16px;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  /* Cyan underline on hover */
}
```

### Deal Rows (usar para qualquer lista de deals/leads/items)
```css
.deal-row {
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  gap: 12px; padding: 14px;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  /* .critical → red border + pulse animation */
  /* .warning-row → amber border */
}
```

### Risk Badges (circular, with pulse animation)
```css
.risk-badge { width: 38px; height: 38px; border-radius: 50%; }
.risk-critical { bg: rgba(239,68,68,0.12); color: #ef4444; animation: pulse-critical 2.5s; }
.risk-warning { bg: rgba(245,158,11,0.12); color: #f59e0b; }
.risk-healthy { bg: rgba(16,185,129,0.12); color: #10b981; }
```

### Brief Items (usar para listas de insights, tips, next steps)
```css
.brief-item {
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--bg-surface);
  border-left: 3px solid var(--border-strong);
  font-size: 12.5px;
}
.brief-item.priority { border-left-color: #ef4444; background: rgba(239,68,68,0.12); }
.brief-item.warning  { border-left-color: #f59e0b; background: rgba(245,158,11,0.12); }
.brief-item.info     { border-left-color: #06b6d4; background: rgba(6,182,212,0.15); }
.brief-item.success  { border-left-color: #10b981; background: rgba(16,185,129,0.12); }
```

### Grids (como o Command Center)
```css
display: grid;
grid-template-columns: 2fr 1fr; /* ou repeat(4, 1fr) para KPI row */
gap: 16px;
```

### Animações disponíveis
- `slide-up` — entrada de cards
- `pulse-critical` — glow vermelho pulsante
- `pulse-live` — indicador ao vivo
- `kpi-flash` — flash cyan em valores

---

## ENDPOINTS DA API DISPONÍVEIS

```
GET /deals?perPage=100&sortBy=riskScore&sortOrder=desc
  → { data: [{ id, companyName, value, stage, probability, riskScore, contactName, contactEmail, source, notes, daysSinceContact, createdAt, updatedAt, activities: [], emails: [] }] }

GET /leads?perPage=100&sortBy=score&sortOrder=desc
  → { data: [{ id, name, email, company, phone, source, status, score, jobTitle, createdAt }] }

GET /metrics/dashboard
  → { data: { pipelineTotal, activeDeals, atRiskDeals, winRate, forecast: { committed, bestCase }, healthScore, coverageRatio, recentSignals, fraudToday, leadsThisMonth } }

GET /signals?take=50&unread=true
  → { data: [{ id, title, message, severity, dealId, deal: { id, companyName, value }, createdAt, readAt }] }

PATCH /signals/:id/read → marca como lido

GET /automations/recipes
  → { data: [{ id, name, trigger, actions, active, createdAt }] }

GET /automations/logs
  → { data: [{ id, trigger, status, duration, result, error, recipe: { name }, deal: { companyName }, createdAt }] }

GET /integrations
  → { data: [{ type, status, config, lastSyncAt, errorMessage }] }

GET /deals/:id → deal detail com activities e emails
POST /deals/:id/activities → { title, type, note }
GET /fraud/stats → { total, bySeverity, byStatus, amountSum, todayCount }
GET /campaigns/stats → { count, byStatus, leadAssociations }
```

---

## TELAS PARA REFAZER (todas em `guardline.html`)

### 1. SDR HUB (`renderSdrHub`)
**Layout:** Grid 2fr 1fr como Command Center
**Coluna esquerda:**
- Card "Leads quentes" — deal-row style com score badge (usar .risk-badge mas com cores invertidas: score alto = green, baixo = amber)
- Para cada lead: nome, empresa, score, fonte, última atividade
- Botão "Ver lead" que abre detalhe
- Tooltip ou expandir com: POR QUE esse score (breakdown dos fatores)

**Coluna direita:**
- Card "Deals em risco" — deal-row com risk badge pulsante
- Para cada deal: empresa, valor, risk score, dias sem contato
- Brief items com dicas do que fazer: "Ligar para João da Alfa Solutions — sem contato há 8 dias"

**Linha inferior (full width):**
- Card "Próximas ações" — lista de brief-items com próximos passos prioritários derivados dos deals (contatar leads quentes, follow-up deals em risco)
- Card "Atividade recente" — mini heatmap com últimos 28 dias (como Command Center)

**Dados:** `GET /leads`, `GET /deals`, `GET /signals?take=10`

---

### 2. INBOX (`renderInbox`)
**Layout:** Grid 300px sidebar + 1fr content
**Sidebar esquerda:**
- Lista de conversas (derivadas de deal emails)
- Cada item: avatar com iniciais, nome, preview da última mensagem, timestamp
- Item ativo com borda left cyan
- Busca no topo

**Content direita:**
- Thread de emails tipo chat: mensagens enviadas (alinhadas à direita, fundo purple-dim) e recebidas (esquerda, fundo surface)
- Cada mensagem: avatar, nome, texto, hora
- Campo de resposta no bottom com textarea + botão enviar

**Ação real:** O botão enviar pode chamar `showToast('info', 'Email', 'Resposta será enviada via integração Gmail')` por agora — funcionalidade real quando Gmail estiver conectado.

**Dados:** `GET /deals?perPage=50` → extrair emails de cada deal

---

### 3. CONTAS (`renderAccounts`)
**Layout:** Tabela premium com deal-row styling
**Cada conta (agrupada por companyName dos deals):**
- Card expandível ao clicar
- Header: nome da empresa, total de deals, valor total, pipeline stage mais avançado
- Ao expandir: todos os deals dessa empresa em deal-rows com risk badges
- KPI row no topo: total contas, total valor, ticket médio, % em risco

**Dados:** `GET /deals?perPage=100` → groupBy companyName

---

### 4. CONTATOS (`renderContacts`)
**Layout:** Cards grid (não tabela crua)
**Cada contato (derivado de leads):**
- Card com avatar de iniciais (circulo com bg purple-dim)
- Nome, email, empresa, cargo, fonte
- Score badge (risk-badge style)
- Ao clicar: abre drawer lateral com detalhes completos, histórico, score breakdown

**KPI row no topo:** Total contatos, por fonte, score médio

**Dados:** `GET /leads?perPage=100`

---

### 5. REUNIÕES (`renderMeetings`)
**Layout:** Calendário visual grande (estilo heatmap ampliado)
- Grid 7 colunas (Seg-Dom) × semanas do mês
- Cada célula: dia do mês, cor baseada em quantidade de atividades (usar escala cyan como o heatmap)
- Ao clicar numa célula: expandir mostrando as reuniões daquele dia em brief-items
- Sidebar direita: lista das próximas 5 reuniões com hora, empresa, tipo

**Dados:** `GET /deals?perPage=50` → extrair activities tipo meeting/call

---

### 6. CANAL (`renderChannelDeals`)
**Layout:** Cards por fonte com KPI em cada um
**Para cada fonte (LinkedIn, Inbound, Indicação, etc.):**
- Card grande com: nome da fonte, # deals, valor total, win rate
- Mini bar chart (CSS puro) mostrando proporção por stage
- Deal-rows dentro do card com os deals dessa fonte

**KPI row no topo:** Total por canal, melhor canal, pior canal

**Dados:** `GET /deals?perPage=100` → groupBy source

---

### 7. MEDDPICC (`renderMeddpiccScreen`)
**Layout:** Grid como Command Center
**Para cada deal:**
- Deal-row com nome, valor, completion %
- Barra de progresso visual (como health-score-bar) — gradient red→amber→cyan→green baseado no %
- Tags coloridas para cada elemento do MEDDPICC (M E D D P I C C) — verde se completo, vermelho se faltando
- Ao clicar: expandir com detalhes de cada elemento e o que falta fazer

**Resumo no topo:** Gauge (como Pipeline Health no Command Center) com média geral, distribuição

**Dados:** `GET /deals?perPage=100` → derivar MEDDPICC da função `deriveMeddpicc`

---

### 8. SAÚDE (`renderPipelineHealth`)
**Layout:** Dashboard estilo Command Center
**Row 1:** 4 KPI cards (Deals ativos, Em risco, Win Rate, Health Score) — com cores, deltas, ícones
**Row 2 (grid 2fr 1fr):**
- Coluna esquerda: lista de deals em risco com deal-rows, risk badges pulsantes, dias sem contato
- Coluna direita: card com brief-items de recomendações ("Ligar para Alfa Solutions", "Enviar follow-up para CloudBase")

**Row 3:** Distribuição por stage — bar chart CSS com contagem e valor por stage

**Dados:** `GET /metrics/dashboard`, `GET /deals`

---

### 9. SINAIS (`renderMarketSignals`)
**Layout:** Feed estilo Signal Feed do Command Center
- Cada sinal em signal-item card com ícone, título, mensagem, severidade
- Cor do border-left baseada em severidade (critical=red, warning=amber, info=cyan, success=green)
- Botões "Agir" e "Ignorar" em cada sinal (já funcionam via API)
- Live indicator no header

**Dados:** `GET /signals?take=50`

---

### 10. PRODUTO (`renderProductIntelligence`)
**Layout:** Grid de cards por segmento
**KPI row:** Total leads, Total won, Conversão geral, Melhor fonte
**Para cada fonte/segmento:**
- Card com nome, total leads, convertidos, taxa de conversão
- Mini progress bar da conversão
- Ao expandir: leads dessa fonte em mini deal-rows

**Dados:** `GET /leads?perPage=200`, `GET /deals?perPage=100`

---

### 11. ALERTAS (`renderAlertsScreen`)
**Layout:** Feed semelhante ao Signal Feed
- Cada alerta em signal-item card com severidade colorida
- Botão "Marcar como lido" chama `API.patch('/signals/:id/read')`
- Filtros por severidade no header (chips como Signal Feed)
- Contagem de não lidos no header

**Dados:** `GET /signals?take=50&unread=true`

---

### 12. N8N ENGINE (`renderN8nEngine`)
**Layout:** Dashboard operacional
**Row 1:** 4 KPI cards (Total execuções, Sucesso, Erros, Recipes ativos) com cores
**Row 2 (grid 2fr 1fr):**
- Coluna esquerda: tabela de logs com status colorido, duration, timestamp
- Coluna direita: lista de recipes ativos como brief-items com nome e trigger

**Botão "Disparar automação manual":** Abre modal com lista de recipes, seleciona um, confirma

**Dados:** `GET /automations/logs`, `GET /automations/recipes`

---

### 13. LOGS (`renderLogsScreen`)
**Layout:** Timeline vertical
- Cada evento: ícone (⚡ para WF, 📡 para sinal), título, status com cor, timestamp
- Linha vertical conectando os eventos (pseudo-element)
- Filtro por tipo (WF / Sinais / Todos) com chips

**Dados:** `GET /automations/logs`, `GET /signals?take=40`

---

### 14. INTEGRATIONS (`renderIntegrations`)
**Layout:** Grid de cards premium
**Cada integração:**
- Card com ícone grande, nome, status badge (ATIVO/OFFLINE/Desligado)
- Métricas: última sync, emails/mensagens, taxa sucesso
- Botões de ação funcionais: Conectar (Gmail OAuth), Desconectar, Testar (Slack)
- Visual: active cards com borda cyan glow, offline com borda amber, desligado com borda dashed

**Dados:** `GET /integrations`

---

### 15. FORECAST (`renderForecast`)
Já está conectado à API. Melhorar visual:
- KPI cards para Committed/Best/Worst Case (não divs simples)
- Narrative card com brief-item styling
- Deal rows com deal-row styling e risk badges
- Clicar num deal abre o deal panel

---

## REGRAS GERAIS

1. **NUNCA usar tabelas HTML cruas** (`<table>`) para dados principais — usar deal-rows, cards, grids
2. **SEMPRE incluir KPI row** no topo de cada tela com métricas relevantes
3. **SEMPRE dar feedback visual** ao clicar — loading states, toasts, transitions
4. **Cada item clicável** deve ter `cursor: pointer`, hover effect (border-color change), e uma ação
5. **Manter responsivo** — usar `@media (max-width: 1024px)` para single column
6. **Usar as classes CSS existentes** — NÃO criar novas a menos que necessário
7. **Animations:** `slide-up` para cards entrando, `pulse-critical` para itens urgentes
8. **Dados reais da API** — nunca hardcoded. Fallback para estado vazio elegante ("Nenhum deal encontrado")
9. **Cada tela deve ter** pelo menos: header, KPI summary, content principal, e ações
10. **Seguir o padrão de grid** do Command Center: `grid-template-columns: 2fr 1fr` para layout principal

## PADRÃO DE CADA FUNÇÃO

```javascript
async function renderXxx() {
  var area = document.getElementById('content-area');
  if (!Auth.isLoggedIn()) {
    area.innerHTML = guardlineV2Page('Título', null, '<p class="placeholder-note">Faça login.</p>');
    return;
  }
  // Loading state
  area.innerHTML = '<div class="pipeline-page-wrap"><div class="card" style="padding:40px;text-align:center"><div class="loading-spinner"></div></div></div>';
  try {
    var res = await API.get('/endpoint');
    var data = res.data || [];
    // Build KPI row + content + render
    area.innerHTML = '...';
  } catch (e) {
    showToast('error', 'Título', e.message);
  }
  if (typeof lucide !== 'undefined') lucide.createIcons();
}
```

## NÃO MODIFICAR
- Command Center (`renderCommandCenter`, `renderCommandGrid`)
- Pipeline (`renderPipeline`, `paintPipelineBoard`)
- Leads table (`renderLeads`)
- Julio AI panel
- Login/Auth flow
- CSS variables (:root)

## MODIFICAR APENAS
As funções `renderXxx` listadas acima em `guardline.html`. Manter a mesma posição no arquivo (não mover funções).
