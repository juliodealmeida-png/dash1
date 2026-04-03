# Guardline Revenue OS — WF08-WF13 Implementation Guide

## 1. Preparação do Banco (Supabase)

### Passo 1: Executar migration
No Supabase SQL Editor (`ohwybcisgrmbgqeeulmm.supabase.co`):
1. Abrir o arquivo `supabase/migrations/20260327200000_multi_user_workflows.sql`
2. Executar no SQL Editor
3. Verificar que as 7 tabelas foram criadas: `team_members`, `team_member_config`, `routing_rules`, `routing_history`, `meetings`, `assistant_interactions`, `deal_health_alerts`

### Passo 2: Seed data
1. Executar `seed_team_data.sql` no SQL Editor
2. **IMPORTANTE:** Substituir os `hubspot_owner_id` pelos IDs reais do HubSpot

---

## 2. Importar Workflows no n8n Cloud

### Para cada arquivo WF08-WF13:
1. Acessar `guardline.app.n8n.cloud`
2. Ir em **Workflows** → **Import from File**
3. Importar cada JSON na ordem: WF08, WF09, WF10, WF11, WF12, WF13

### Após importar, configurar credenciais em cada workflow:
Substituir os placeholders de credenciais:

| Placeholder | Substituir por |
|---|---|
| `SUPABASE_CREDENTIAL_ID` | ID da credencial Supabase já configurada no n8n |
| `ANTHROPIC_CREDENTIAL_ID` | ID da credencial Anthropic já configurada no n8n |
| `SLACK_CREDENTIAL_ID` | ID da credencial Slack do n8n |
| `GMAIL_CREDENTIAL_ID` | ID da credencial Gmail OAuth2 |
| `TWILIO_CREDENTIAL_ID` | ID da credencial Twilio |
| `LINKEDIN_CREDENTIAL_ID` | ID da credencial LinkedIn OAuth2 |

**Dica:** No n8n, abra cada nó que usa credencial e selecione a credencial correta do dropdown.

---

## 3. Modificações no WF06 (Lead Processing)

### Localizar o nó "ASSIGN OWNER" no WF06

**ANTES** (atribuição fixa):
```
owner_name: "Julio De Almeida"
hubspot_owner_id: "12345678"
```

**DEPOIS** — Substituir por um nó HTTP Request:
- **Tipo:** HTTP Request
- **Method:** POST
- **URL:** `https://guardline.app.n8n.cloud/webhook/wf09-guardline-smart-router-v1`
- **Body (JSON):**
```json
{
  "lead": {
    "id": "{{ $json.lead_id }}",
    "company_name": "{{ $json.company_name }}",
    "company_country": "{{ $json.company_country }}",
    "primary_solution": "{{ $json.primary_solution }}",
    "company_industry": "{{ $json.company_industry }}",
    "lead_score": {{ $json.lead_score || 0 }},
    "lead_temperature": "{{ $json.lead_temperature }}"
  },
  "score": {
    "total": {{ $json.lead_score || 0 }},
    "temperature": "{{ $json.lead_temperature }}"
  }
}
```

- **Usar resposta nos nós seguintes:**
  - `{{ $json.assigned_to.name }}` → owner_name
  - `{{ $json.assigned_to.hubspot_owner_id }}` → hubspot_owner_id
  - `{{ $json.assigned_to.email }}` → owner_email

---

## 4. Modificações no WF07 (Reply Processing)

### 4a. Após processar reply (nó "REPLY INTAKE"):
Adicionar nó HTTP Request chamando WF10:
- **URL:** `https://guardline.app.n8n.cloud/webhook/wf10-guardline-virtual-assistant-v1`
- **Body:**
```json
{
  "trigger": "reply_received",
  "lead_id": "{{ $json.lead_id }}",
  "company_name": "{{ $json.company_name }}",
  "contact_name": "{{ $json.contact_name }}",
  "contact_email": "{{ $json.contact_email }}",
  "assigned_member_id": "{{ $json.owner_id }}",
  "channel_preference": "email",
  "context": "Prospect respondeu ao email. Mensagem: {{ $json.reply_preview }}"
}
```

### 4b. Após registrar meeting (nó "MEETING MEMORY"):
O Fireflies webhook já chama WF11 automaticamente.
Se quiser redundância, adicionar nó HTTP Request:
- **URL:** `https://guardline.app.n8n.cloud/webhook/wf11-guardline-meeting-intelligence-v1`

---

## 5. Configurar Fireflies Webhook

1. Acessar **app.fireflies.ai** → Settings → Integrations → Webhooks
2. Adicionar:
   - **URL:** `https://guardline.app.n8n.cloud/webhook/wf11-guardline-meeting-intelligence-v1`
   - **Events:** `Transcription Complete`
3. Testar com uma reunião de exemplo

---

## 6. Endpoints Criados

| Workflow | Endpoint | Trigger |
|---|---|---|
| WF08 | `wf08-guardline-team-member-onboarding-v1` | Dashboard (novo usuário) |
| WF09 | `wf09-guardline-smart-router-v1` | WF06 (após scoring) |
| WF10 | `wf10-guardline-virtual-assistant-v1` | WF11 + Schedule + Manual |
| WF11 | `wf11-guardline-meeting-intelligence-v1` | Fireflies webhook |
| WF12 | `wf12-guardline-deal-health-monitor-v1` | Schedule 6h + WF11 |
| WF13 | `wf13-guardline-handoff-v1` | Dashboard (transferir lead) |

---

## 7. Ativar Workflows

Após configurar tudo:
1. Ativar WF08, WF09, WF10, WF11, WF12, WF13 (toggle "Active" no n8n)
2. WF12 tem Schedule trigger — vai rodar automaticamente a cada 6h
3. Testar WF08 primeiro com um POST manual para validar Supabase
4. Testar WF09 chamando via WF06 com um lead de teste
5. Testar WF11 com uma reunião de teste no Fireflies

---

## 8. Checklist de Validação

- [ ] Migration executada no Supabase
- [ ] Seed data inserido com IDs reais do HubSpot
- [ ] WF08 importado e credenciais configuradas
- [ ] WF09 importado e credenciais configuradas
- [ ] WF10 importado e credenciais configuradas
- [ ] WF11 importado e credenciais configuradas
- [ ] WF12 importado e credenciais configuradas
- [ ] WF13 importado e credenciais configuradas
- [ ] WF06 modificado (ASSIGN OWNER → HTTP Request para WF09)
- [ ] WF07 modificado (reply → WF10, meeting → WF11)
- [ ] Fireflies webhook configurado para WF11
- [ ] Todos os workflows ativados
- [ ] Teste end-to-end com lead de exemplo
