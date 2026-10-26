#!/usr/bin/env node
/**
 * Prerender the built SPA to static HTML for crawlers.
 *
 * Loads dist/ in headless Chrome, waits for fonts/images/effects, and writes
 * the rendered DOM back to dist/index.html. main.tsx hydrates that markup.
 * Zero dependencies: Node built-ins + the Chrome DevTools Protocol.
 *
 * Usage: npm run prerender  (after npm run build)
 */

import { spawn } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const INDEX = path.join(DIST, 'index.html');
const PREVIEW_PORT = 4175;
const PAGE_URL = `http://127.0.0.1:${PREVIEW_PORT}/portfolio/`;
const CHROME_BIN = process.env.CHROME_PATH || '/usr/bin/google-chrome';
const VITE_BIN = path.join(ROOT, 'node_modules', '.bin', 'vite');

let preview = null;
let chrome = null;
let cdp = null;
let userDataDir = null;
let cleanedUp = false;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function killTree(child) {
  if (!child?.pid) return;
  try {
    process.kill(-child.pid, 'SIGTERM');
  } catch {
    try {
      child.kill('SIGTERM');
    } catch {
      /* already gone */
    }
  }
}

async function cleanup() {
  if (cleanedUp) return;
  cleanedUp = true;
  try {
    cdp?.close();
  } catch {
    /* ignore */
  }
  killTree(chrome);
  killTree(preview);
  if (userDataDir) {
    rmSync(userDataDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  }
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    void cleanup().finally(() => process.exit(130));
  });
}

async function waitForHttp(url, timeout = 30000) {
  const deadline = Date.now() + timeout;
  let last = 'no response';
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (response.ok) return;
      last = `HTTP ${response.status}`;
    } catch (error) {
      last = error instanceof Error ? error.message : String(error);
    }
    await sleep(250);
  }
  throw new Error(`preview server never became ready (${last})`);
}

async function waitForCdpPort(timeout = 20000) {
  const deadline = Date.now() + timeout;
  const portFile = path.join(userDataDir, 'DevToolsActivePort');
  while (Date.now() < deadline) {
    try {
      const [line] = readFileSync(portFile, 'utf8').split('\n');
      const port = Number(line);
      if (Number.isInteger(port) && port > 0 && port < 65536) return port;
    } catch {
      /* not written yet */
    }
    await sleep(100);
  }
  throw new Error('Chrome did not expose a DevTools port');
}

async function pageTarget(port) {
  const list = await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json());
  const page = list.find((target) => target.type === 'page' && target.webSocketDebuggerUrl);
  if (!page) throw new Error('Chrome has no page target');
  return page;
}

class CDP {
  #ws;
  #nextId = 1;
  #pending = new Map();

  constructor(ws) {
    this.#ws = ws;
    ws.addEventListener('message', (event) => {
      let message;
      try {
        message = JSON.parse(String(event.data));
      } catch {
        return;
      }
      if (!message.id) return;
      const pending = this.#pending.get(message.id);
      if (!pending) return;
      this.#pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result);
    });
  }

  static async connect(url) {
    const ws = new WebSocket(url);
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve, { once: true });
      ws.addEventListener('error', () => reject(new Error('CDP connection failed')), {
        once: true,
      });
    });
    return new CDP(ws);
  }

  send(method, params = {}) {
    const id = this.#nextId++;
    return new Promise((resolve, reject) => {
      this.#pending.set(id, { resolve, reject });
      this.#ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.text || 'page evaluation failed');
    }
    return result.result?.value;
  }

  close() {
    try {
      this.#ws.close();
    } catch {
      /* ignore */
    }
  }
}

async function main() {
  if (!existsSync(INDEX)) {
    throw new Error('dist/index.html missing; run npm run build first');
  }
  if (!existsSync(VITE_BIN)) {
    throw new Error('vite is not installed; run npm install');
  }
  if (!existsSync(CHROME_BIN)) {
    throw new Error(`Chrome not found at ${CHROME_BIN}; set CHROME_PATH`);
  }

  console.log(`prerender: serving ${DIST} on ${PAGE_URL}`);
  preview = spawn(
    VITE_BIN,
    ['preview', '--port', String(PREVIEW_PORT), '--strictPort'],
    { cwd: ROOT, detached: true, stdio: 'ignore' },
  );
  await waitForHttp(PAGE_URL);

  userDataDir = mkdtempSync(path.join(tmpdir(), 'portfolio-prerender-'));
  chrome = spawn(
    CHROME_BIN,
    [
      '--headless=new',
      '--remote-debugging-port=0',
      `--user-data-dir=${userDataDir}`,
      '--no-sandbox',
      '--disable-gpu',
      '--hide-scrollbars',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-dev-shm-usage',
      'about:blank',
    ],
    { detached: true, stdio: 'ignore' },
  );

  const port = await waitForCdpPort();
  const target = await pageTarget(port);
  cdp = await CDP.connect(target.webSocketDebuggerUrl);

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => {});
  await cdp.send('Page.navigate', { url: PAGE_URL });

  const ready = await (async () => {
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
      const state = await cdp
        .evaluate('document.readyState')
        .catch(() => 'loading');
      if (state === 'complete') return true;
      await sleep(100);
    }
    return false;
  })();
  if (!ready) throw new Error('page did not finish loading');

  await cdp.evaluate(`
    (async () => {
      await document.fonts.ready;
      await Promise.all(
        Array.from(document.images).map((image) =>
          image.complete
            ? true
            : new Promise((resolve) => {
                image.addEventListener('load', resolve, { once: true });
                image.addEventListener('error', resolve, { once: true });
              }),
        ),
      );
      return true;
    })()
  `);

  // Let the hero entrance and IntersectionObserver settle so the static
  // markup matches what React will hydrate.
  await sleep(900);

  const html = await cdp.evaluate('document.documentElement.outerHTML');
  if (typeof html !== 'string' || !html.includes('<h1')) {
    throw new Error('rendered DOM did not contain an h1');
  }

  const output = `<!doctype html>\n${html}`;
  for (const needle of [
    'Professional Experience',
    'Technical Skills',
    'Featured Projects',
    'Charles Schwab',
  ]) {
    if (!output.includes(needle)) {
      throw new Error(`prerendered HTML missing "${needle}"`);
    }
  }

  writeFileSync(INDEX, output);
  console.log(
    `prerender: wrote ${(Buffer.byteLength(output) / 1024).toFixed(1)} KB static HTML`,
  );
}

try {
  await main();
} catch (error) {
  console.error(`prerender failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  await cleanup();
}
