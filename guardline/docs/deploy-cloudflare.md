Deploy do Frontend no Cloudflare Pages

1) Estrutura
- Pasta estática: guardline/frontend
- Não há build command
- Arquivo de redireciono: guardline/frontend/_redirects (já contém a regra)
  /    /guardline.html    200

2) Criar o projeto no Cloudflare Pages
- No dashboard do Cloudflare: Pages → Create Project
- Conectar ao repositório ou usar “Upload assets”
- Se usar repositório:
  - Framework preset: None
  - Build command: vazio
  - Output directory: guardline/frontend

3) Variáveis e domínios
- O Frontend não precisa de secrets.
- Para o Backend aceitar o domínio do Pages nas regras de CORS/sockets:
  - Abra o .env do backend e inclua o domínio do Pages em FRONTEND_URL, separado por vírgulas.
    Ex.: FRONTEND_URL=https://SEU_DOMINIO.pages.dev,https://app.seu-dominio.com

4) Deploy automático (opcional) via GitHub Actions
- Arquivo criado: .github/workflows/cloudflare-pages.yml
- Defina os Secrets no repositório:
  - CF_API_TOKEN
  - CF_ACCOUNT_ID
  - CF_PAGES_PROJECT (nome do projeto no Cloudflare Pages)
- O workflow publica a pasta guardline/frontend a cada push na branch principal.

5) Testes rápidos
- Abra o domínio do Pages e verifique se carrega /guardline.html
- Confirme que navegação / é redirecionada para /guardline.html
- Verifique o Console do navegador para erros de CORS; se houver, acrescente o domínio do Pages em FRONTEND_URL no .env do backend e faça redeploy do backend.

6) Integração com n8n
- Os fluxos do n8n devem buscar credenciais específicas por usuário:
  GET https://SEU_BACKEND/api/connectors/credentials?userId=<ID>&type=waalaxy
  Header: X-N8N-API-KEY: <chave>
- Em seguida, usar os campos retornados nos nós do fluxo.

