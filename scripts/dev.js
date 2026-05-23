const { spawn, spawnSync } = require('child_process');
const http = require('http');
const net = require('net');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const BACKEND_DIR = path.join(ROOT_DIR, 'backend');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');
const FRONTEND_VITE_BIN = path.join(FRONTEND_DIR, 'node_modules', 'vite', 'bin', 'vite.js');
const BACKEND_HOST = process.env.BACKEND_HOST || '127.0.0.1';
const DEFAULT_BACKEND_PORT = Number(process.env.BACKEND_PORT || process.env.PORT || 5000);
const STARTUP_ATTEMPTS = 80;
const STARTUP_DELAY_MS = 250;

let backendProcess = null;
let frontendProcess = null;
let isShuttingDown = false;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function canUsePort(port) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();

    server.once('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        resolve(false);
        return;
      }

      reject(error);
    });

    server.listen(port, () => {
      server.close(() => resolve(true));
    });
  });
}

async function findAvailablePort(startPort) {
  let port = startPort;

  while (!(await canUsePort(port))) {
    port += 1;
  }

  return port;
}

function pingBackend(port) {
  return new Promise((resolve) => {
    const req = http.get(
      {
        hostname: BACKEND_HOST,
        port,
        path: '/api/status',
        timeout: 2000
      },
      (res) => {
        res.resume();
        resolve(res.statusCode === 200);
      }
    );

    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForBackend(port) {
  for (let attempt = 1; attempt <= STARTUP_ATTEMPTS; attempt += 1) {
    if (await pingBackend(port)) {
      return true;
    }

    await delay(STARTUP_DELAY_MS);
  }

  return false;
}

function killChildProcess(child) {
  if (!child || child.killed) {
    return;
  }

  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
    return;
  }

  child.kill('SIGTERM');
}

function shutdown(exitCode = 0) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  killChildProcess(frontendProcess);
  killChildProcess(backendProcess);

  setTimeout(() => process.exit(exitCode), 50);
}

function startProcess(name, command, args, options) {
  const child = spawn(command, args, {
    cwd: options.cwd,
    env: {
      ...process.env,
      ...options.env
    },
    stdio: 'inherit'
  });

  child.on('error', (error) => {
    console.error(`[dev] Failed to start ${name}.`, error);
    shutdown(1);
  });

  child.on('exit', (code, signal) => {
    if (isShuttingDown) {
      return;
    }

    const outcome = signal ? `signal ${signal}` : `code ${code ?? 0}`;
    console.error(`[dev] ${name} exited with ${outcome}.`);
    shutdown(code ?? 1);
  });

  return child;
}

async function main() {
  const backendPort = await findAvailablePort(DEFAULT_BACKEND_PORT);

  if (backendPort !== DEFAULT_BACKEND_PORT) {
    console.warn(
      `[dev] Port ${DEFAULT_BACKEND_PORT} is busy. Starting the backend on ${backendPort} instead.`
    );
  }

  console.log(`[dev] Starting backend at http://${BACKEND_HOST}:${backendPort}`);
  backendProcess = startProcess('backend', process.execPath, ['server.js'], {
    cwd: BACKEND_DIR,
    env: {
      PORT: String(backendPort),
      BACKEND_HOST,
      BACKEND_PORT: String(backendPort)
    }
  });

  const backendReady = await waitForBackend(backendPort);
  if (!backendReady) {
    console.error(`[dev] Timed out waiting for http://${BACKEND_HOST}:${backendPort}/api/status`);
    shutdown(1);
    return;
  }

  console.log(`[dev] Backend is ready. Starting frontend...`);
  frontendProcess = startProcess('frontend', process.execPath, [FRONTEND_VITE_BIN], {
    cwd: FRONTEND_DIR,
    env: {
      BACKEND_HOST,
      BACKEND_PORT: String(backendPort)
    }
  });
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

main().catch((error) => {
  console.error('[dev] Failed to start the workspace.', error);
  shutdown(1);
});
