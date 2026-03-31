const path = require('path');
const fs = require('fs');
const { ok, fail } = require('../utils/response');
const { prisma } = require('../config/database');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

async function weather(req, res) {
  try {
    const name = String(req.query.city || req.query.q || '').trim();
    const lat = req.query.lat ? parseFloat(req.query.lat) : null;
    const lon = req.query.lon ? parseFloat(req.query.lon) : null;
    let loc = null;
    if (lat && lon) {
      loc = { name: 'Localização', latitude: lat, longitude: lon, country: '' };
    } else if (name) {
      const geores = await fetch(
        'https://geocoding-api.open-meteo.com/v1/search?name=' +
          encodeURIComponent(name) +
          '&count=1&language=pt&format=json'
      );
      const geo = await geores.json().catch(() => ({}));
      if (!geo.results || !geo.results.length) return fail(res, 404, 'Cidade não encontrada', 'NOT_FOUND');
      loc = geo.results[0];
    } else {
      return fail(res, 400, 'Informe city ou lat/lon', 'MISSING_PARAMS');
    }
    const wres = await fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=' +
        loc.latitude +
        '&longitude=' +
        loc.longitude +
        '&current=temperature_2m,precipitation,rain,weather_code&timezone=auto'
    );
    const data = await wres.json().catch(() => ({}));
    return ok(res, {
      location: { name: loc.name, country: loc.country, latitude: loc.latitude, longitude: loc.longitude },
      current: data.current || {},
    });
  } catch (e) {
    return fail(res, 502, 'Serviço de clima indisponível', 'WEATHER_ERROR');
  }
}

async function forex(req, res) {
  try {
    const base = String(req.query.base || 'USD').toUpperCase();
    const quote = String(req.query.quote || 'BRL').toUpperCase();
    const r = await fetch(
      'https://api.exchangerate.host/latest?base=' + encodeURIComponent(base) + '&symbols=' + encodeURIComponent(quote)
    );
    const j = await r.json().catch(() => ({}));
    const rate = j.rates && j.rates[quote];
    if (!rate) return fail(res, 502, 'Não foi possível obter cotação', 'FOREX_ERROR');
    return ok(res, { base, quote, rate, ts: j.date || new Date().toISOString().slice(0, 10) });
  } catch (e) {
    return fail(res, 502, 'Serviço de câmbio indisponível', 'FOREX_ERROR');
  }
}

async function news(req, res) {
  try {
    const query = String(req.query.query || req.query.q || 'tecnologia').trim();
    const key = process.env.NEWS_API_KEY || '';
    if (key) {
      const r = await fetch(
        'https://gnews.io/api/v4/search?q=' + encodeURIComponent(query) + '&lang=pt&country=br&max=10&token=' + key
      );
      const j = await r.json().catch(() => ({}));
      const items = (j.articles || []).map((a) => ({
        title: a.title,
        url: a.url,
        source: a.source?.name || '',
        publishedAt: a.publishedAt,
      }));
      return ok(res, { query, items });
    }
    const r = await fetch(
      'https://hn.algolia.com/api/v1/search?query=' + encodeURIComponent(query) + '&tags=story&hitsPerPage=10'
    );
    const j = await r.json().catch(() => ({}));
    const items = (j.hits || []).map((h) => ({
      title: h.title,
      url: h.url || 'https://news.ycombinator.com/item?id=' + h.objectID,
      source: 'Hacker News',
      points: h.points,
      author: h.author,
    }));
    return ok(res, { query, items });
  } catch (e) {
    return fail(res, 502, 'Serviço de notícias indisponível', 'NEWS_ERROR');
  }
}

async function createDoc(req, res) {
  try {
    const { title, content } = req.body || {};
    if (!title || !content) return fail(res, 400, 'title e content obrigatórios', 'VALIDATION_ERROR');
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    let y = 800;
    page.drawText(String(title), { x: 50, y, size: 20, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
    y -= 30;
    const text = String(content);
    const lines = text.split(/\r?\n/);
    const size = 12;
    for (const line of lines) {
      const chunks = line.match(/.{1,90}/g) || [''];
      for (const ch of chunks) {
        if (y < 60) {
          y = 780;
          pdfDoc.addPage([595.28, 841.89]);
        }
        const p = pdfDoc.getPages()[pdfDoc.getPageCount() - 1];
        p.drawText(ch, { x: 50, y, size, font, color: rgb(0.15, 0.15, 0.15) });
        y -= 16;
      }
      y -= 6;
    }
    const bytes = await pdfDoc.save();
    const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'documents');
    fs.mkdirSync(uploadsDir, { recursive: true });
    const filename = Date.now() + '_julio_doc.pdf';
    fs.writeFileSync(path.join(uploadsDir, filename), Buffer.from(bytes));
    const url = '/uploads/documents/' + filename;
    return ok(res, { url, filename });
  } catch (e) {
    return fail(res, 500, 'Falha ao gerar PDF', 'PDF_ERROR');
  }
}

async function createImage(req, res) {
  try {
    const { text, width, height, bg, fg } = req.body || {};
    const W = parseInt(width) || 1200;
    const H = parseInt(height) || 630;
    const BG = String(bg || '#0b1220');
    const FG = String(fg || '#ffffff');
    const T = String(text || 'Guardline');
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="100%" height="100%" fill="${BG}"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Inter,Arial" font-size="48" fill="${FG}">${T.replace(
        /</g,
        '&lt;'
      )}</text></svg>`;
    const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'images');
    fs.mkdirSync(uploadsDir, { recursive: true });
    const filename = Date.now() + '_julio_image.svg';
    fs.writeFileSync(path.join(uploadsDir, filename), svg);
    const url = '/uploads/images/' + filename;
    return ok(res, { url, filename });
  } catch (e) {
    return fail(res, 500, 'Falha ao gerar imagem', 'IMAGE_ERROR');
  }
}

module.exports = {
  weather,
  forex,
  news,
  createDoc,
  createImage,
};
