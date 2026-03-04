const app = require('../src/app');
const { initializeBackend } = require('../src/bootstrap');

let bootStartTime;
let bootError;
let bootSuccess = false;

module.exports = async function handler(req, res) {
  const reqId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const reqStartMs = Date.now();

  try {
    // Root diagnostics endpoint
    if (req.url === '/' || req.url === '/diagnose') {
      return res.status(200).json({
        service: 'generic-invoice-quotation-backend',
        status: bootSuccess ? 'running' : bootError ? 'failed' : 'initializing',
        timestamp: new Date().toISOString(),
        reqId,
        bootTime: bootStartTime ? Date.now() - bootStartTime : null,
        bootError: bootError ? { message: bootError.message } : null,
      });
    }

    // Initialize backend once per container lifetime
    if (!bootStartTime) {
      bootStartTime = Date.now();
      // eslint-disable-next-line no-console
      console.log('BACKEND_INIT_START', { timestamp: new Date().toISOString() });
      try {
        await initializeBackend();
        bootSuccess = true;
        // eslint-disable-next-line no-console
        console.log('BACKEND_INIT_SUCCESS', {
          timestamp: new Date().toISOString(),
          bootMs: Date.now() - bootStartTime,
        });
      } catch (initError) {
        bootError = initError;
        // eslint-disable-next-line no-console
        console.error('BACKEND_INIT_FAILED', {
          timestamp: new Date().toISOString(),
          error: initError.message,
          stack: initError.stack,
        });
        throw initError;
      }
    }

    if (bootError) throw bootError;

    // eslint-disable-next-line no-console
    console.log('REQUEST_IN', {
      reqId,
      path: req.url,
      method: req.method,
      timestamp: new Date().toISOString(),
    });

    // Route request through Express app
    // Wrap response.end to track completion
    const originalEnd = res.end;
    res.end = function (...args) {
      // eslint-disable-next-line no-console
      console.log('REQUEST_OUT', {
        reqId,
        path: req.url,
        statusCode: res.statusCode,
        durationMs: Date.now() - reqStartMs,
        timestamp: new Date().toISOString(),
      });
      return originalEnd.apply(res, args);
    };

    // Invoke Express app - it will handle the request/response cycle
    app(req, res);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('HANDLER_ERROR', {
      reqId,
      path: req.url,
      method: req.method,
      error: error.message,
      stack: error.stack,
      durationMs: Date.now() - reqStartMs,
      timestamp: new Date().toISOString(),
    });

    if (!res.headersSent) {
      const statusCode = Number(error.statusCode || 500);
      const message = statusCode >= 500 ? 'Internal server error' : error.message;
      res.status(statusCode).json({ message, reqId });
    }
  }
};