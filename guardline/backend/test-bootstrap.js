const https = require('https');

const secret = process.argv[2] || 'gl-boot-2026-abc123';
const data = JSON.stringify({ password: 'UmaSenhaForteAqui' });

console.log(`Tentando bootstrap com o secret: "${secret}"...`);

const options = {
  hostname: 'guardline-engine-production.up.railway.app',
  port: 443,
  path: '/api/auth/bootstrap-admin',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    'x-bootstrap-secret': secret
  }
};

const req = https.request(options, res => {
  console.log(`Status Code: ${res.statusCode}`);
  res.on('data', d => {
    process.stdout.write(d);
  });
});

req.on('error', error => {
  console.error(error);
});

req.write(data);
req.end();