const http = require('http');

const HOST = process.env.BACKEND_HOST || '127.0.0.1';
const PORT = process.env.BACKEND_PORT || process.env.PORT || 5000;
const MAX_ATTEMPTS = 60;
const DELAY_MS = 250;

function ping() {
  return new Promise((resolve) => {
    const req = http.get(
      { hostname: HOST, port: PORT, path: '/api/status', timeout: 2000 },
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

async function main() {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (await ping()) {
      console.log(`[wait-for-backend] API ready at http://${HOST}:${PORT}`);
      process.exit(0);
    }
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }
  console.error(`[wait-for-backend] Timed out waiting for http://${HOST}:${PORT}/api/status`);
  process.exit(1);
}

main();
