const { requireAuth, getSessionUser } = require('./utils/auth');

exports.handler = async (event) => {
  const authError = requireAuth(event);
  if (authError) return authError;

  const user = getSessionUser(event);
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  };
};
