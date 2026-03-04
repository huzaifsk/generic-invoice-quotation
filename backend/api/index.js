const app = require('../src/app');
const { initializeBackend } = require('../src/bootstrap');

module.exports = async function handler(req, res) {
  const reqId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const startMs = Date.now();
  const logContext = { reqId, path: req.url, method: req.method };

  try {
    // eslint-disable-next-line no-console
    console.log('REQUEST_START', { ...logContext, eventMs: Date.now() - startMs });
    await initializeBackend();
    const result = app(req, res);
    // eslint-disable-next-line no-console
    console.log('REQUEST_SUCCESS', { ...logContext, durationMs: Date.now() - startMs });
    return result;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('REQUEST_FAILED', {
      ...logContext,
      durationMs: Date.now() - startMs,
      error: error.message,
      stack: error.stack,
    });
    const statusCode = Number(error.statusCode || 500);
    const message = statusCode >= 500 ? 'Server initialization failed.' : error.message;
    return res.status(statusCode).json({ message });
  }
};