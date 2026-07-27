const { clearSessionCookie } = require('./utils/auth');

exports.handler = async () => {
  return {
    statusCode: 200,
    headers: { 'Set-Cookie': clearSessionCookie(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true }),
  };
};
