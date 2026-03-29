function requestLogger(req, res, next) {
  const start = Date.now();
  const { method, originalUrl } = req;

  res.on('finish', () => {
    const ms = Date.now() - start;
    const line = JSON.stringify({
      t: new Date().toISOString(),
      method,
      path: originalUrl,
      status: res.statusCode,
      ms,
    });
    if (process.env.NODE_ENV === 'development') {
      console.log(line);
    }
  });

  next();
}

module.exports = { requestLogger };
