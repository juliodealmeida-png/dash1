const https = require('https');

const BASE_URL = 'https://guardline-engine-production.up.railway.app';

function checkEndpoint(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(`${BASE_URL}${path}`, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function run() {
  console.log('Testando saúde do deploy no Railway...');
  console.log(`URL Base: ${BASE_URL}\n`);

  try {
    // Testando a rota de webhook (se der 404, não subiu ainda)
    console.log('1. Verificando rota /webhooks/hubspot...');
    const webhookRes = await checkEndpoint('/webhooks/hubspot', 'POST');
    console.log(`   Status: ${webhookRes.status}`);
    console.log(`   Resposta:`, webhookRes.data);
    
    if (webhookRes.status === 404) {
      console.log('   ❌ A rota /webhooks/hubspot não foi encontrada. O deploy novo AINDA NÃO SUBIU.');
    } else {
      console.log('   ✅ A rota /webhooks/hubspot existe! O deploy parece ter subido.');
    }
    
    console.log('\n2. Verificando rota /api/auth/bootstrap-admin...');
    const bootstrapRes = await checkEndpoint('/api/auth/bootstrap-admin', 'POST');
    console.log(`   Status: ${bootstrapRes.status}`);
    console.log(`   Resposta:`, bootstrapRes.data);
    
    if (bootstrapRes.status === 404) {
      console.log('   ❌ A rota de bootstrap-admin retornou 404 Not Found. Deploy não está no ar.');
    } else if (bootstrapRes.status === 403) {
      console.log('   ⚠️ A rota existe, mas retornou FORBIDDEN. Isso significa que a rota SUBIU, mas o secret não foi enviado ou está incorreto.');
    } else {
      console.log(`   ✅ Rota respondeu com status ${bootstrapRes.status}`);
    }

    console.log('\nConclusão:');
    if (webhookRes.status === 404 && bootstrapRes.status === 404) {
      console.log('👉 Vá até o Railway e clique em "Deploy" ou "Redeploy" no serviço guardline-engine.');
      console.log('👉 Aguarde ficar verde/ativo antes de rodar a criação do admin de novo.');
    } else if (bootstrapRes.status === 403) {
      console.log('👉 O deploy JÁ ESTÁ NO AR. O problema agora é só enviar o Header "x-bootstrap-secret" com o valor exato que está nas variáveis de ambiente do Railway.');
    }
    
  } catch (error) {
    console.error('Erro ao tentar conectar com a API:', error.message);
  }
}

run();