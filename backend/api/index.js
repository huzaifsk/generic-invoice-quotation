let app;
let initializeBackend;
let bootStartTime;
let bootError;
let bootSuccess = false;
let loadError;

// Load modules with explicit error handling
try {
  // eslint-disable-next-line no-console
  console.log('MODULE_LOAD_START api/index.js');
  app = require('../src/app');
  // eslint-disable-next-line no-console
  console.log('MODULE_LOAD_SUCCESS app.js');
  
  initializeBackend = require('../src/bootstrap').initializeBackend;
  // eslint-disable-next-line no-console
  console.log('MODULE_LOAD_SUCCESS bootstrap.js');
} catch (error) {
  loadError = error;
  // eslint-disable-next-line no-console
  console.error('MODULE_LOAD_FAILED', {
    error: error.message,
    code: error.code,
    stack: error.stack,
    timestamp: new Date().toISOString(),
  });
}

module.exports = async function handler(req, res) {
  const reqId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const reqStartMs = Date.now();
  const ts = new Date().toISOString();

  // eslint-disable-next-line no-console
  console.log('HANDLER_INVOKE', {
    reqId,
    path: req.url,
    method: req.method,
    timestamp: ts,
    loadError: loadError ? loadError.message : null,
  });

  try {
    // Fail fast if module load failed
    if (loadError) {
      // eslint-disable-next-line no-console
      console.error('HANDLER_BLOCKED_MODULE_ERROR', { reqId, error: loadError.message });
      return res.status(500).json({ message: 'Backend module failed to load', reqId });
    }

    // Initialize backend once per container lifetime (even for diagnostics)
    if (!bootStartTime) {
      bootStartTime = Date.now();
      // eslint-disable-next-line no-console
      console.log('BACKEND_INIT_START', { timestamp: ts });
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
          code: initError.code,
          stack: initError.stack,
        });
      }
    }

    // Root diagnostics endpoint - always available after boot attempt
    if (req.url === '/' || req.url === '/diagnose') {
      // eslint-disable-next-line no-console
      console.log('DIAGNOSTICS_REQUEST', {
        reqId,
        timestamp: ts,
        bootSuccess,
        bootError: bootError ? bootError.message : null,
        loadError: loadError ? loadError.message : null,
      });
      
      return res.status(200).json({
        service: 'generic-invoice-quotation-backend',
        status: loadError ? 'module_error' : bootSuccess ? 'running' : bootError ? 'failed' : 'initializing',
        timestamp: ts,
        reqId,
        bootTime: bootStartTime ? Date.now() - bootStartTime : null,
        bootError: bootError ? { message: bootError.message } : null,
        loadError: loadError ? { message: loadError.message } : null,
      });
    }

    if (bootError) {
      // eslint-disable-next-line no-console
      console.error('HANDLER_BLOCKED_BOOT_ERROR', { reqId, error: bootError.message });
      return res.status(503).json({ message: 'Backend failed to initialize', reqId });
    }

    // eslint-disable-next-line no-console
    console.log('REQUEST_ROUTE', {
      reqId,
      path: req.url,
      method: req.method,
      timestamp: ts,
    });

    // Track response completion
    const originalEnd = res.end;
    res.end = function (...args) {
      // eslint-disable-next-line no-console
      console.log('REQUEST_COMPLETE', {
        reqId,
        path: req.url,
        statusCode: res.statusCode,
        durationMs: Date.now() - reqStartMs,
        timestamp: new Date().toISOString(),
      });
      return originalEnd.apply(res, args);
    };

    // Invoke Express app
    app(req, res);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('HANDLER_EXCEPTION', {
      reqId,
      path: req.url,
      method: req.method,
      error: error.message,
      code: error.code,
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