const express = require('express');
const { createServer } = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { initSocket } = require('./config/socket');
const { validateEnv } = require('./config/env');
const { errorHandler } = require('./middleware/errorHandler');
const { requestLogger } = require('./middleware/logger');
const { fail } = require('./utils/response');

const DATA_API_BASE = String(process.env.DATA_API_BASE_URL || process.env.GUARDLINE_DATA_API_BASE || '').replace(/\/$/, '');

function isHopByHopHeader(name) {
  return ['connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade', 'host', 'content-length'].includes(String(name || '').toLowerCase());
}

function copyResponseHeaders(upstream, res) {
  upstream.headers.forEach((value, key) => {
    if (!isHopByHopHeader(key)) {
      res.setHeader(key, value);
    }
  });
}

function getProxyBody(req, headers) {
  if (['GET', 'HEAD'].includes(req.method)) return undefined;
  if (req.body == null) return req;
  if (Buffer.isBuffer(req.body) || typeof req.body === 'string') return req.body;
  if (headers['content-type'] && String(headers['content-type']).includes('application/json')) {
    return JSON.stringify(req.body);
  }
  return req;
}

async function proxyToDataApi(req, res, upstreamPath) {
  if (!DATA_API_BASE) {
    return fail(res, 503, 'Data API não configurada', 'DATA_API_UNAVAILABLE');
  }

  const target = new URL(upstreamPath, DATA_API_BASE + '/');
  const headers = {};
  Object.entries(req.headers || {}).forEach(([key, value]) => {
    if (!isHopByHopHeader(key) && value != null) {
      headers[key] = value;
    }
  });

  try {
    const upstream = await fetch(target, {
      method: req.method,
      headers,
      body: getProxyBody(req, headers),
      duplex: ['GET', 'HEAD'].includes(req.method) ? undefined : 'half',
    });

    res.status(upstream.status);
    copyResponseHeaders(upstream, res);

    if (req.method === 'HEAD' || upstream.status === 204 || upstream.status === 304) {
      res.end();
      return;
    }

    if (upstream.body) {
      upstream.body.pipe(res);
      return;
    }

    const text = await upstream.text();
    res.send(text);
  } catch (error) {
    console.error('[data-api-proxy]', error.message || error);
    return fail(res, 502, 'Falha ao comunicar com a Data API', 'DATA_API_PROXY_ERROR');
  }
}

validateEnv();

const app = express();
const httpServer = createServer(app);

const io = initSocket(httpServer);
app.set('io', io);

const corsOrigins = (
  process.env.FRONTEND_URL ||
  'http://localhost:4000,http://localhost:3001,http://localhost:5173,http://127.0.0.1:5173,http://localhost:5500'
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const isProd = process.env.NODE_ENV === 'production';

function corsAllowOrigin(origin, callback) {
  if (!origin) return callback(null, true);
  if (!isProd) {
    try {
      const host = new URL(origin).hostname;
      if (host === 'localhost' || host === '127.0.0.1') return callback(null, true);
    } catch (e) {
      return callback(null, false);
    }
  }
  if (corsOrigins.includes(origin)) return callback(null, true);
  callback(null, false);
}

app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
app.use(
  compression({
    filter: (req, res) => {
      if (req.path && req.path.startsWith('/api/julio/chat') && req.method === 'POST') {
        return false;
      }
      return compression.filter(req, res);
    },
  })
);
app.use(
  cors({
    origin: corsAllowOrigin,
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    ok: true,
    service: 'guardline-backend',
    node: process.version,
    dataApiConfigured: !!DATA_API_BASE,
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    ok: true,
    service: 'guardline-backend',
    node: process.version,
    dataApiConfigured: !!DATA_API_BASE,
  });
});

app.use(['/api/ai', '/api/fraud-map', '/api/events', '/api/realtime'], (req, res) => {
  const upstreamPath = req.originalUrl.replace(/^\/api/, '/api');
  proxyToDataApi(req, res, upstreamPath);
});

app.get('/health/data', (req, res) => {
  proxyToDataApi(req, res, '/health');
});

const embeddedFrontendDir = path.join(__dirname, '..', 'public');
const siblingFrontendDir = path.join(__dirname, '..', '..', 'frontend');
const frontendDir = require('fs').existsSync(path.join(embeddedFrontendDir, 'guardline.html'))
  ? embeddedFrontendDir
  : siblingFrontendDir;
app.use(express.static(frontendDir));

// Serve uploaded documents
const uploadsDir = path.join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(uploadsDir));

// File upload endpoint for documents
const multer = require('multer');
const docStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(uploadsDir, 'documents');
    require('fs').mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, Date.now() + '_' + safeName);
  }
});
const docUpload = multer({ storage: docStorage, limits: { fileSize: 25 * 1024 * 1024 }, fileFilter: (req, file, cb) => {
  cb(null, file.mimetype === 'application/pdf');
}});
app.post('/api/upload/document', require('./middleware/auth').authMiddleware, docUpload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'Nenhum PDF enviado' });
  const fileUrl = '/uploads/documents/' + req.file.filename;
  res.json({ success: true, data: { fileUrl, filename: req.file.originalname, size: req.file.size } });
});

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/deals', require('./routes/deals.routes'));
app.use('/api/leads', require('./routes/leads.routes'));
app.use('/api/campaigns', require('./routes/campaigns.routes'));
app.use('/api/fraud', require('./routes/fraud.routes'));
app.use('/api/automations', require('./routes/automation.routes'));
app.use('/api/julio', require('./routes/julio.routes'));
app.use('/api/metrics', require('./routes/metrics.routes'));
app.use('/api/signals', require('./routes/signals.routes'));
app.use('/api/integrations', require('./routes/integrations.routes'));
app.use('/api/investor', require('./routes/investor.routes'));
app.use('/api/documents', require('./routes/documents.routes'));

function sendGuardlineHtml(res, next) {
  const file = path.join(frontendDir, 'guardline.html');
  res.sendFile(file, (err) => {
    if (err) next(err);
  });
}

app.get('/', (req, res, next) => {
  sendGuardlineHtml(res, next);
});

// Signer portal — public page
app.get('/assinar/:token', (req, res, next) => {
  const file = path.join(frontendDir, 'sign.html');
  res.sendFile(file, (err) => { if (err) next(err); });
});

// Verification page — public
app.get('/verificar', (req, res, next) => {
  const file = path.join(frontendDir, 'verify.html');
  res.sendFile(file, (err) => { if (err) next(err); });
});

app.get(/^\/(?!api(?:\/|$)).*/, (req, res, next) => {
  sendGuardlineHtml(res, next);
});

app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return fail(res, 404, 'Rota não encontrada', 'NOT_FOUND');
  }
  res.status(404).send('Not found');
});

app.use(errorHandler);

const PREFERRED_PORT = Number(process.env.PORT) || 3001;

function listenOnPort(port) {
  httpServer.once('error', (err) => {
    if (err.code === 'EADDRINUSE' && !isProd && port < PREFERRED_PORT + 15) {
      console.warn(`\n⚠️  Porta ${port} já está em uso (feche a outra instância ou defina PORT=4001 no .env).`);
      console.warn(`   A tentar porta ${port + 1}…\n`);
      setImmediate(() => listenOnPort(port + 1));
      return;
    }
    console.error('\n❌ Não foi possível abrir o servidor HTTP:', err.message);
    if (err.code === 'EADDRINUSE') {
      console.error(`   Liberte a porta ${port} ou use outra: PORT=4001 npm start\n`);
    }
    process.exit(1);
  });

  httpServer.listen(port, () => {
    httpServer.removeAllListeners('error');
    process.env.PORT = String(port);
    console.log(`\n[GUARDLINE] ✅ Online na porta ${port}`);
    console.log(`   Dashboard: http://localhost:${port}`);
    console.log(`   Health:    http://localhost:${port}/api/health`);
    console.log(`   Ambiente: ${process.env.NODE_ENV || 'development'}\n`);
  });
}

listenOnPort(PREFERRED_PORT);

const { startScheduledJobs } = require('./services/scheduler.service');
startScheduledJobs(io);

module.exports = { app, httpServer };
