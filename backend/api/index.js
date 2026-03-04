const app = require('../src/app');
const { initializeBackend } = require('../src/bootstrap');

module.exports = async function handler(req, res) {
  try {
    await initializeBackend();
    return app(req, res);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Serverless startup failed:', error);
    const statusCode = Number(error.statusCode || 500);
    const message = statusCode >= 500 ? 'Server initialization failed.' : error.message;
    return res.status(statusCode).json({ message });
  }
};