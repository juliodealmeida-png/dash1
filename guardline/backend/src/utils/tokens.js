const jwt = require('jsonwebtoken');

function signAccessToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

/** Refresh JWT armazenado em refresh_tokens (payload mínimo). */
function signRefreshToken(userId) {
  return jwt.sign({ userId }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d',
  });
}

function verifyRefreshJwt(token) {
  return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyRefreshJwt,
};
