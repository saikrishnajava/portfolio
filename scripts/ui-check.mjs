#!/usr/bin/env node
/**
 * Zero-dependency browser contract check.
 *
 * Uses only Node built-ins, the global WebSocket, and the Chrome DevTools
 * Protocol. No playwright / puppeteer / axe.
 *
 * Usage: npm run check:ui
 */

import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PREVIEW_URL = 'http://localhost:4173/portfolio/';
const PREVIEW_PORT = 4173;
// Port 0 lets Chrome pick a free port and write it to DevToolsActivePort, so
// the harness never attaches to a developer's already-running Chrome.
let CDP_PORT = 0;
const CHROME_BIN = process.env.CHROME_PATH || '/usr/bin/google-chrome';
const VITE_BIN = path.join(ROOT, 'node_modules', '.bin', 'vite');

const DESKTOP = { width: 1440, height: 1100, mobile: false };
const DESKTOP_NARROW = { width: 1024, height: 900, mobile: false };
const TABLET = { width: 768, height: 900, mobile: false };
const MOBILE = { width: 390, height: 844, mobile: true };
const MIN_CONTRAST = 4.5;
const MIN_TARGET = 44;

const results = [];
let cdp = null;
let chrome = null;
let preview = null;
let userDataDir = null;
let previewLog = '';
let chromeLog = '';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const round = (n) => Math.round(n * 100) / 100;
const oneLine = (value, max = 240) => String(value).replace(/\s+/g, ' ').trim().slice(0, max);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function check(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, ok: true });
    console.log(`PASS  ${name}${detail ? `  [${detail}]` : ''}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    results.push({ name, ok: false, message });
    console.log(`FAIL  ${name}`);
    for (const line of message.split('\n')) {
      console.log(`      ${line}`);
    }
  }
}

async function pollValue(fn, predicate, timeout = 3000, interval = 100) {
  const deadline = Date.now() + timeout;
  let last;
  do {
    try {
      last = await fn();
      if (predicate(last)) return last;
    } catch {
      // Navigation or execution context swap: keep polling.
    }
    await sleep(interval);
  } while (Date.now() < deadline);
  return last;
}

/* ------------------------------------------------------------------ */
/* Process lifecycle                                                   */
/* ------------------------------------------------------------------ */

function killTree(child) {
  if (!child || !child.pid) return;
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

async function stopTree(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  killTree(child);
  const deadline = Date.now() + 3000;
  while (child.exitCode === null && child.signalCode === null && Date.now() < deadline) {
    await sleep(100);
  }
  if (child.exitCode === null && child.signalCode === null) {
    try {
      process.kill(-child.pid, 'SIGKILL');
    } catch {
      try {
        child.kill('SIGKILL');
      } catch {
        /* already gone */
      }
    }
  }
}

let cleanupPromise = null;
function cleanup() {
  if (!cleanupPromise) cleanupPromise = runCleanup();
  return cleanupPromise;
}

async function runCleanup() {
  try {
    cdp?.close();
  } catch {
    /* ignore */
  }
  await stopTree(chrome);
  await stopTree(preview);
  if (userDataDir) {
    try {
      rmSync(userDataDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    } catch {
      /* temp dir, ignore */
    }
  }
}

let shuttingDown = false;
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    if (shuttingDown) return;
    shuttingDown = true;
    void cleanup().finally(() => process.exit(130));
  });
}

async function waitForHttp(urls, timeout = 30000) {
  const deadline = Date.now() + timeout;
  let lastError = 'no response';
  while (Date.now() < deadline) {
    if (preview && preview.exitCode !== null) {
      throw new Error(`vite preview exited early\n${oneLine(previewLog, 2000)}`);
    }
    for (const url of urls) {
      try {
        const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(2000) });
        if (response.status === 200) return url;
        lastError = `${url} -> HTTP ${response.status}`;
      } catch (error) {
        lastError = `${url} -> ${error instanceof Error ? error.message : String(error)}`;
      }
    }
    await sleep(250);
  }
  throw new Error(`preview server never became ready (${lastError})`);
}

async function waitForDevToolsPort(timeout = 20000) {
  const activePortFile = path.join(userDataDir, 'DevToolsActivePort');
  const deadline = Date.now() + timeout;
  let lastError = 'file not written yet';
  while (Date.now() < deadline) {
    if (chrome && chrome.exitCode !== null) {
      throw new Error(`Chrome exited before writing DevToolsActivePort\n${oneLine(chromeLog, 2000)}`);
    }
    try {
      if (existsSync(activePortFile)) {
        const firstLine = readFileSync(activePortFile, 'utf8').split(/\r?\n/)[0]?.trim() || '';
        const port = Number(firstLine);
        if (Number.isInteger(port) && port > 0) return port;
        lastError = `unexpected first line "${oneLine(firstLine, 60)}"`;
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await sleep(100);
  }
  throw new Error(
    `Chrome never wrote a usable ${activePortFile} (${lastError}); refusing to attach to a pre-existing Chrome`,
  );
}

async function waitForChrome(timeout = 20000) {
  const deadline = Date.now() + timeout;
  let lastError = 'no response';
  while (Date.now() < deadline) {
    if (chrome && chrome.exitCode !== null) {
      throw new Error(`Chrome exited early\n${oneLine(chromeLog, 2000)}`);
    }
    try {
      const response = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`, {
        signal: AbortSignal.timeout(1000),
      });
      if (response.ok) return response.json();
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await sleep(200);
  }
  throw new Error(`Chrome DevTools endpoint never became ready (${lastError})`);
}

async function pageTarget() {
  const list = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`).then((response) => response.json());
  const pages = list.filter((target) => target.type === 'page');
  if (pages.length > 0) return pages[0];

  // Older/edge Chrome builds: create a page target explicitly.
  try {
    await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?about:blank`, { method: 'PUT' });
  } catch {
    /* try the deprecated GET form below */
    try {
      await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?about:blank`);
    } catch {
      /* ignore */
    }
  }
  const retry = await pollValue(
    async () => {
      const targets = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`).then((response) => response.json());
      return targets.find((target) => target.type === 'page') || null;
    },
    (target) => Boolean(target?.webSocketDebuggerUrl),
    5000,
  );
  if (!retry) throw new Error('could not find a Chrome page target');
  return retry;
}

/* ------------------------------------------------------------------ */
/* Minimal CDP client                                                  */
/* ------------------------------------------------------------------ */

class CDP {
  #ws;
  #nextId = 1;
  #pending = new Map();
  #listeners = new Map();

  constructor(ws) {
    this.#ws = ws;
    ws.addEventListener('message', (event) => this.#onMessage(event));
    ws.addEventListener('close', () => {
      for (const { reject } of this.#pending.values()) {
        reject(new Error('CDP socket closed'));
      }
      this.#pending.clear();
    });
  }

  static async connect(url) {
    const ws = new WebSocket(url);
    await new Promise((resolve, reject) => {
      const onOpen = () => {
        cleanupListeners();
        resolve();
      };
      const onError = () => {
        cleanupListeners();
        reject(new Error('CDP WebSocket connection failed'));
      };
      const cleanupListeners = () => {
        ws.removeEventListener('open', onOpen);
        ws.removeEventListener('error', onError);
      };
      ws.addEventListener('open', onOpen);
      ws.addEventListener('error', onError);
    });
    return new CDP(ws);
  }

  #onMessage(event) {
    let message;
    try {
      message = JSON.parse(typeof event.data === 'string' ? event.data : String(event.data));
    } catch {
      return;
    }
    if (message.id) {
      const pending = this.#pending.get(message.id);
      if (!pending) return;
      this.#pending.delete(message.id);
      if (message.error) pending.reject(new Error(`${pending.method}: ${message.error.message}`));
      else pending.resolve(message.result);
      return;
    }
    if (message.method) {
      const listeners = this.#listeners.get(message.method);
      if (!listeners) return;
      for (const listener of [...listeners]) {
        try {
          listener(message.params || {});
        } catch {
          /* a listener must never break message dispatch */
        }
      }
    }
  }

  send(method, params = {}) {
    if (this.#ws.readyState !== 1) return Promise.reject(new Error('CDP socket is not open'));
    const id = this.#nextId++;
    return new Promise((resolve, reject) => {
      this.#pending.set(id, { resolve, reject, method });
      try {
        this.#ws.send(JSON.stringify({ id, method, params }));
      } catch (error) {
        this.#pending.delete(id);
        reject(error);
      }
    });
  }

  on(method, listener) {
    if (!this.#listeners.has(method)) this.#listeners.set(method, new Set());
    this.#listeners.get(method).add(listener);
    return () => {
      this.#listeners.get(method)?.delete(listener);
    };
  }

  waitFor(method, timeout = 15000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        off();
        reject(new Error(`timeout waiting for ${method}`));
      }, timeout);
      const off = this.on(method, (params) => {
        clearTimeout(timer);
        off();
        resolve(params);
      });
    });
  }

  close() {
    try {
      this.#ws.close();
    } catch {
      /* ignore */
    }
  }
}

/* ------------------------------------------------------------------ */
/* Page helpers (injected after every navigation)                      */
/* ------------------------------------------------------------------ */

const PAGE_HELPERS = String.raw`
(() => {
  const parseColor = (input) => {
    if (!input) return { r: 0, g: 0, b: 0, a: 0 };
    const value = String(input).trim();
    if (!value || value === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };

    const rgb = value.match(/^rgba?\(([^)]+)\)$/i);
    if (rgb) {
      const parts = rgb[1]
        .trim()
        .replace(/\s*\/\s*/g, ' ')
        .split(/[\s,]+/)
        .filter(Boolean)
        .map(Number);
      if (parts.length >= 3 && parts.slice(0, 3).every(Number.isFinite)) {
        const alpha = parts.length >= 4 && Number.isFinite(parts[3]) ? parts[3] : 1;
        return { r: parts[0], g: parts[1], b: parts[2], a: alpha };
      }
    }

    const hex = value.match(/^#([0-9a-f]{3,8})$/i);
    if (hex) {
      let raw = hex[1];
      if (raw.length === 3 || raw.length === 4) {
        const alpha = raw.length === 4 ? parseInt(raw[3] + raw[3], 16) / 255 : 1;
        raw = raw.slice(0, 3).split('').map((char) => char + char).join('');
        return {
          r: parseInt(raw.slice(0, 2), 16),
          g: parseInt(raw.slice(2, 4), 16),
          b: parseInt(raw.slice(4, 6), 16),
          a: alpha,
        };
      }
      if (raw.length === 6 || raw.length === 8) {
        return {
          r: parseInt(raw.slice(0, 2), 16),
          g: parseInt(raw.slice(2, 4), 16),
          b: parseInt(raw.slice(4, 6), 16),
          a: raw.length === 8 ? parseInt(raw.slice(6, 8), 16) / 255 : 1,
        };
      }
    }

    return { r: 0, g: 0, b: 0, a: 0 };
  };

  const backgroundLayers = (element) => {
    const layers = [];
    let node = element;
    while (node && node.nodeType === 1) {
      const color = parseColor(getComputedStyle(node).backgroundColor);
      if (color.a > 0.001) {
        layers.push(color);
        if (color.a >= 0.999) break;
      }
      node = node.parentElement;
    }
    return layers;
  };

  const composite = (layers) => {
    let out = { r: 255, g: 255, b: 255, a: 1 };
    for (let index = layers.length - 1; index >= 0; index -= 1) {
      const top = layers[index];
      const bottom = out;
      const alpha = top.a + bottom.a * (1 - top.a);
      if (alpha <= 0) continue;
      out = {
        r: (top.r * top.a + bottom.r * bottom.a * (1 - top.a)) / alpha,
        g: (top.g * top.a + bottom.g * bottom.a * (1 - top.a)) / alpha,
        b: (top.b * top.a + bottom.b * bottom.a * (1 - top.a)) / alpha,
        a: alpha,
      };
    }
    return out;
  };

  const channel = (value) => {
    const normalized = value / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  };

  const luminance = ({ r, g, b }) =>
    0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

  const contrast = (foreground, background) => {
    const l1 = luminance(foreground);
    const l2 = luminance(background);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };

  const contrastFor = (element) => {
    const style = getComputedStyle(element);
    const background = composite(backgroundLayers(element));
    const foreground = parseColor(style.color);
    const flattened = {
      r: foreground.r * foreground.a + background.r * (1 - foreground.a),
      g: foreground.g * foreground.a + background.g * (1 - foreground.a),
      b: foreground.b * foreground.a + background.b * (1 - foreground.a),
      a: 1,
    };
    return {
      ratio: Math.round(contrast(flattened, background) * 100) / 100,
      color: style.color,
      background: 'rgb(' + [background.r, background.g, background.b].map((n) => Math.round(n)).join(', ') + ')',
      text: (element.innerText || element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 48),
    };
  };

  const accessibleName = (element) => {
    const ariaLabel = (element.getAttribute('aria-label') || '').trim();
    if (ariaLabel) return ariaLabel;

    const labelledBy = element.getAttribute('aria-labelledby');
    if (labelledBy) {
      const text = labelledBy
        .split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent || '')
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (text) return text;
    }

    const text = (element.innerText || element.textContent || '').replace(/\s+/g, ' ').trim();
    if (text) return text;

    const title = (element.getAttribute('title') || '').trim();
    if (title) return title;

    return [...element.querySelectorAll('img[alt]')]
      .map((image) => image.getAttribute('alt').trim())
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const isVisible = (element) => {
    if (!element) return false;
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      Number(style.opacity || '1') > 0.01 &&
      rect.width > 0 &&
      rect.height > 0
    );
  };

  const describe = (element) => {
    if (!element) return 'null';
    return (element.outerHTML || '').replace(/\s+/g, ' ').slice(0, 160);
  };

  const menuToggle = () => {
    const buttons = [...document.querySelectorAll('header button')];
    return (
      buttons.find((button) => button.getAttribute('aria-controls') === 'mobile-nav') ||
      buttons.find((button) => {
        const label = (button.getAttribute('aria-label') || '') + ' ' + (button.textContent || '');
        return /menu|navigation|\bnav\b/i.test(label);
      }) ||
      buttons.find((button) => button.hasAttribute('aria-expanded')) ||
      null
    );
  };

  window.__ui = { parseColor, composite, contrastFor, accessibleName, isVisible, describe, menuToggle };
})();
`;

/* ------------------------------------------------------------------ */
/* CDP page operations                                                 */
/* ------------------------------------------------------------------ */

async function evaluate(expression) {
  const response = await cdp.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
    userGesture: true,
  });
  if (response.exceptionDetails) {
    const description =
      response.exceptionDetails.exception?.description ||
      response.exceptionDetails.text ||
      'page evaluation failed';
    throw new Error(oneLine(description.split('\n')[0], 300));
  }
  return response.result?.value;
}

async function page(fn, ...args) {
  return evaluate(`(${fn.toString()})(${args.map((arg) => JSON.stringify(arg)).join(',')})`);
}

async function waitForAppReady(timeout = 10000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      const state = await evaluate(`(() => {
        const root = document.getElementById('root');
        return {
          ready: document.readyState === 'complete' && Boolean(root) && root.children.length > 0,
          children: root ? root.children.length : 0,
        };
      })()`);
      if (state?.ready) {
        await evaluate(PAGE_HELPERS);
        return true;
      }
    } catch {
      /* execution context may be swapping */
    }
    await sleep(100);
  }
  try {
    await evaluate(PAGE_HELPERS);
  } catch {
    /* assertions will fail with a useful message */
  }
  return false;
}

async function navigate(url) {
  const loaded = cdp.waitFor('Page.loadEventFired', 20000).catch(() => null);
  const response = await cdp.send('Page.navigate', { url });
  if (response?.errorText) throw new Error(`navigation failed: ${response.errorText}`);
  await loaded;
  await waitForAppReady();
}

async function reload() {
  const loaded = cdp.waitFor('Page.loadEventFired', 20000).catch(() => null);
  await cdp.send('Page.reload', { ignoreCache: false });
  await loaded;
  await waitForAppReady();
}

async function setViewport(viewport) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.mobile,
    screenWidth: viewport.width,
    screenHeight: viewport.height,
  });
}

async function emulateMedia(colorScheme) {
  // Reduced motion must stay active for the metric checks, so every media
  // override declares both features instead of replacing the whole set.
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [
      { name: 'prefers-reduced-motion', value: 'reduce' },
      { name: 'prefers-color-scheme', value: colorScheme },
    ],
  });
}

async function applyTheme(theme) {
  const { identifier } = await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `try { localStorage.setItem('theme', ${JSON.stringify(theme)}); } catch (error) {}`,
  });
  await reload();
  try {
    await cdp.send('Page.removeScriptToEvaluateOnNewDocument', { identifier });
  } catch {
    /* ignore */
  }

  const classes = await pollValue(
    () => evaluate('document.documentElement.className'),
    (value) => new RegExp(`(^|\\s)${theme}(\\s|$)`).test(String(value || '')),
    4000,
  );
  return String(classes || '');
}

async function pressKey(key, code, virtualKeyCode) {
  const base = { key, code, windowsVirtualKeyCode: virtualKeyCode, nativeVirtualKeyCode: virtualKeyCode };
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', ...base });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
}

async function clickElement(expression) {
  const point = await evaluate(`(() => {
    const element = ${expression};
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`);
  if (!point) return false;

  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x, y: point.y });
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x: point.x,
    y: point.y,
    button: 'left',
    buttons: 1,
    clickCount: 1,
  });
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x: point.x,
    y: point.y,
    button: 'left',
    buttons: 0,
    clickCount: 1,
  });
  return true;
}

/* ------------------------------------------------------------------ */
/* Console error collection                                            */
/* ------------------------------------------------------------------ */

const consoleErrors = [];
const exceptions = [];

function remoteText(arg) {
  if (!arg) return '';
  if (Object.prototype.hasOwnProperty.call(arg, 'value')) {
    if (typeof arg.value === 'string') return arg.value;
    try {
      return JSON.stringify(arg.value);
    } catch {
      return String(arg.value);
    }
  }
  return arg.unserializableValue || arg.description || arg.type || '';
}

function watchRuntime() {
  cdp.on('Runtime.consoleAPICalled', ({ type, args = [] }) => {
    if (type !== 'error') return;
    const text = args.map(remoteText).join(' ').replace(/\s+/g, ' ').trim();
    consoleErrors.push(oneLine(text || '(console.error with no arguments)', 500));
  });
  cdp.on('Runtime.exceptionThrown', ({ exceptionDetails = {} }) => {
    const text =
      exceptionDetails.exception?.description ||
      exceptionDetails.text ||
      '(uncaught exception)';
    exceptions.push(oneLine(String(text).split('\n')[0], 500));
  });
}

/* ------------------------------------------------------------------ */
/* Assertions by contract area                                         */
/* ------------------------------------------------------------------ */

async function checkSkipLink() {
  await check('skip link a[href="#main-content"] exists', async () => {
    const found = await page(() => Boolean(document.querySelector('a[href="#main-content"]')));
    assert(found, 'no a[href="#main-content"] found');
    return 'found';
  });

  await check('skip link target <main id="main-content"> exists', async () => {
    const data = await page(() => ({
      exists: Boolean(document.querySelector('main#main-content')),
      mainId: document.querySelector('main')?.id || null,
    }));
    assert(data.exists, `<main id="main-content"> not found (main id: ${data.mainId || 'none'})`);
    return 'found';
  });

  await check('skip link is the first focusable element', async () => {
    const data = await page(() => {
      const selector =
        'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
      const focusable = [...document.querySelectorAll(selector)].filter((element) => {
        const style = getComputedStyle(element);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });
      const first = focusable[0] || null;
      return {
        count: focusable.length,
        isSkip: Boolean(first && first.matches('a[href="#main-content"]')),
        first: window.__ui.describe(first),
      };
    });
    assert(data.isSkip, `first focusable is not the skip link: ${data.first}`);
    return 'first in DOM order';
  });

  await check('focused skip link becomes visible', async () => {
    const focused = await page(() => {
      const link = document.querySelector('a[href="#main-content"]');
      if (!link) return { found: false };
      link.focus();
      return { found: true, focused: document.activeElement === link, html: window.__ui.describe(link) };
    });
    assert(focused.found, 'skip link not found');
    assert(focused.focused, `skip link did not receive focus (${focused.html})`);
    await sleep(250);

    const data = await page(() => {
      const link = document.querySelector('a[href="#main-content"]');
      if (!link) return { found: false };
      const style = getComputedStyle(link);
      const rect = link.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const hit =
        centerX >= 0 && centerY >= 0 && centerX <= innerWidth && centerY <= innerHeight
          ? document.elementFromPoint(centerX, centerY)
          : null;
      return {
        found: true,
        width: rect.width,
        height: rect.height,
        top: rect.top,
        left: rect.left,
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        clip: style.clip,
        clipPath: style.clipPath,
        transform: style.transform,
        zIndex: style.zIndex,
        hit: Boolean(hit && (hit === link || link.contains(hit))),
        hitTag: hit ? hit.tagName + (hit.id ? '#' + hit.id : '') : null,
        active: window.__ui.describe(document.activeElement),
        text: (link.innerText || '').trim(),
        html: window.__ui.describe(link),
      };
    });
    assert(data.found, 'skip link not found');
    assert(data.width >= 8 && data.height >= 8, `focused skip link is only ${round(data.width)}x${round(data.height)}px`);
    assert(
      data.display !== 'none' && data.visibility !== 'hidden' && Number(data.opacity) > 0.01,
      `focused skip link is not rendered (display=${data.display}, visibility=${data.visibility}, opacity=${data.opacity})`,
    );
    assert(
      data.hit,
      `focused skip link is covered by another element at its center (rect ${round(data.left)},${round(data.top)} ${round(data.width)}x${round(data.height)}; transform=${data.transform}; z-index=${data.zIndex}; hit=${data.hitTag}; active=${data.active})`,
    );
    return `${round(data.width)}x${round(data.height)} at ${round(data.left)},${round(data.top)}`;
  });
}

async function checkHeadingOrder() {
  const headings = await page(() =>
    [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((heading) => ({
      tag: heading.tagName,
      text: (heading.innerText || heading.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80),
    })),
  );

  await check('first heading in the document is an <h1>', async () => {
    assert(headings.length > 0, 'document contains no headings');
    assert(headings[0].tag === 'H1', `first heading is <${headings[0].tag.toLowerCase()}> "${headings[0].text}"`);
    return `"${headings[0].text}"`;
  });

  await check('no <h2> appears before the first <h1>', async () => {
    const firstH1 = headings.findIndex((heading) => heading.tag === 'H1');
    assert(firstH1 !== -1, 'document contains no <h1>');
    const before = headings.slice(0, firstH1).filter((heading) => heading.tag === 'H2');
    assert(
      before.length === 0,
      `${before.length} <h2> before first <h1>: ${before.map((heading) => `"${heading.text}"`).join(', ')}`,
    );
    return 'none';
  });

  await check('document has exactly one <h1>', async () => {
    const h1s = headings.filter((heading) => heading.tag === 'H1');
    assert(h1s.length === 1, `found ${h1s.length} <h1> elements: ${h1s.map((h) => `"${h.text}"`).join(', ')}`);
    return h1s[0].text;
  });
}

async function checkNestedInteractive() {
  await check('no <a> contains a <button> (or vice versa)', async () => {
    const data = await page(() => {
      const nested = [...document.querySelectorAll('a button, button a')];
      return {
        count: nested.length,
        samples: nested.slice(0, 4).map((element) => window.__ui.describe(element)),
      };
    });
    assert(
      data.count === 0,
      `${data.count} nested interactive element(s):\n${data.samples.map((sample) => `- ${sample}`).join('\n')}`,
    );
    return '0 nested';
  });
}

async function checkHeaderNav() {
  const nav = await page(() => {
    const links = [...document.querySelectorAll('header a[href^="#"]')].filter((anchor) =>
      window.__ui.isVisible(anchor),
    );
    return {
      count: links.length,
      hrefs: links.map((anchor) => anchor.getAttribute('href')),
      links: links.map((anchor) => ({
        href: anchor.getAttribute('href'),
        text: (anchor.innerText || anchor.textContent || '').replace(/\s+/g, ' ').trim(),
        current: anchor.getAttribute('aria-current'),
      })),
    };
  });

  await check('header nav has at least 6 visible same-page links', async () => {
    assert(nav.count >= 6, `found ${nav.count} visible header a[href^="#"] link(s): ${nav.hrefs.join(', ') || 'none'}`);
    return `${nav.count} links`;
  });

  await check('header nav contains a #projects link', async () => {
    const link = nav.links.find((item) => item.href === '#projects');
    assert(link, `no visible header a[href="#projects"]; links: ${nav.hrefs.join(', ') || 'none'}`);
    return `"${link.text}"`;
  });

  await check('clicking the #projects nav link sets location.hash', async () => {
    const clicked = await clickElement(
      `[...document.querySelectorAll('header a[href="#projects"]')].find((anchor) => window.__ui.isVisible(anchor))`,
    );
    assert(clicked, 'no visible header #projects link to click');
    const hash = await pollValue(() => evaluate('location.hash'), (value) => value === '#projects', 2500);
    assert(hash === '#projects', `location.hash is ${hash ? `"${hash}"` : '(empty)'}`);
    return '#projects';
  });

  await check('header #projects link is aria-current="location" after scrolling to projects', async () => {
    const scrolled = await page(() => {
      const section = document.getElementById('projects');
      if (!section) return false;
      section.scrollIntoView({ block: 'start', behavior: 'instant' });
      return true;
    });
    assert(scrolled, 'no #projects section found');
    await sleep(150);

    const state = await pollValue(
      () =>
        page(() => {
          const links = [...document.querySelectorAll('header a[href^="#"]')];
          const projectLink = links.find((anchor) => anchor.getAttribute('href') === '#projects');
          const projects = document.getElementById('projects');
          const skills = document.getElementById('skills');
          return {
            projectsCurrent: projectLink?.getAttribute('aria-current') || null,
            active: links
              .filter((anchor) => anchor.getAttribute('aria-current') === 'location')
              .map((anchor) => anchor.getAttribute('href')),
            scrollY: Math.round(window.scrollY),
            projectsTop: projects ? Math.round(projects.offsetTop) : null,
            skillsTop: skills ? Math.round(skills.offsetTop) : null,
            docHeight: Math.round(document.documentElement.scrollHeight),
            viewport: innerHeight,
          };
        }),
      (value) => value?.projectsCurrent === 'location',
      3000,
    );
    assert(
      state?.projectsCurrent === 'location',
      `projects aria-current=${state?.projectsCurrent || 'missing'}; active links: ${state?.active?.join(', ') || 'none'}; scrollY=${state?.scrollY}, projectsTop=${state?.projectsTop}, skillsTop=${state?.skillsTop}, docHeight=${state?.docHeight}, viewport=${state?.viewport}`,
    );
    return 'projects active';
  });
}

async function checkProjectCards() {
  const cards = await page(() =>
    [...document.querySelectorAll('[data-project-card]')].map((card) => {
      const rect = card.getBoundingClientRect();
      const ariaLabel = (card.getAttribute('aria-label') || '').trim();
      const text = (card.innerText || card.textContent || '').replace(/\s+/g, ' ').trim();
      return {
        tag: card.tagName,
        href: card.getAttribute('href') || '',
        name: ariaLabel || text,
        width: rect.width,
        height: rect.height,
        html: window.__ui.describe(card),
      };
    }),
  );

  await check('there are exactly 6 [data-project-card] elements', async () => {
    assert(cards.length === 6, `found ${cards.length}`);
    return '6 cards';
  });

  await check('every project card is an <a> with a GitHub href, accessible name, and 44px target', async () => {
    assert(cards.length > 0, 'no [data-project-card] elements found');
    const problems = [];
    cards.forEach((card, index) => {
      if (card.tag !== 'A') problems.push(`card ${index + 1} is <${card.tag.toLowerCase()}>, not <a>`);
      if (!card.name) problems.push(`card ${index + 1} has no accessible name`);
      if (!card.href.includes('github.com')) {
        problems.push(`card ${index + 1} href does not contain github.com (${card.href || 'missing'})`);
      }
      if (card.width < MIN_TARGET || card.height < MIN_TARGET) {
        problems.push(`card ${index + 1} is ${round(card.width)}x${round(card.height)} (min ${MIN_TARGET}px)`);
      }
    });
    assert(problems.length === 0, problems.join('\n'));
    return `${cards.length} cards valid`;
  });
}

async function checkAvatarBadges(theme) {
  const data = await page(() => {
    const badges = [...document.querySelectorAll('[data-avatar-badge]')];
    return {
      count: badges.length,
      badges: badges.map((badge) => ({
        ...window.__ui.contrastFor(badge),
        html: window.__ui.describe(badge),
      })),
    };
  });

  if (theme === 'light') {
    await check('at least 5 [data-avatar-badge] elements exist', async () => {
      assert(data.count >= 5, `found ${data.count}`);
      return `${data.count} badges`;
    });
  }

  await check(`avatar badges meet 4.5:1 contrast in ${theme} mode`, async () => {
    assert(data.count > 0, 'no [data-avatar-badge] elements found');
    const failing = data.badges.filter((badge) => badge.ratio < MIN_CONTRAST);
    assert(
      failing.length === 0,
      failing
        .map(
          (badge) =>
            `"${badge.text}" ratio ${badge.ratio}:1 (color ${badge.color} on ${badge.background})`,
        )
        .join('\n'),
    );
    const lowest = Math.min(...data.badges.map((badge) => badge.ratio));
    return `${data.count} badges, min ${lowest}:1`;
  });
}

async function checkControlContrast(theme) {
  const data = await page(() => {
    const controls = [...document.querySelectorAll('button[aria-pressed="true"]')];
    return {
      count: controls.length,
      controls: controls.map((control) => ({
        ...window.__ui.contrastFor(control),
        html: window.__ui.describe(control),
      })),
    };
  });

  await check(`active (aria-pressed="true") filter controls meet 4.5:1 contrast in ${theme} mode`, async () => {
    assert(data.count > 0, 'no button[aria-pressed="true"] (active skills filter) found');
    const failing = data.controls.filter((control) => control.ratio < MIN_CONTRAST);
    assert(
      failing.length === 0,
      failing
        .map(
          (control) =>
            `"${control.text}" ratio ${control.ratio}:1 (color ${control.color} on ${control.background})`,
        )
        .join('\n'),
    );
    const lowest = Math.min(...data.controls.map((control) => control.ratio));
    return `${data.count} control(s), min ${lowest}:1`;
  });
}

async function checkProfileImage() {
  await check('profile <img> has width, height, and fetchpriority="high"', async () => {
    const images = await page(() =>
      [...document.querySelectorAll('img')]
        .filter((image) => (image.getAttribute('src') || '').includes('profile'))
        .map((image) => ({
          src: image.getAttribute('src'),
          width: image.getAttribute('width'),
          height: image.getAttribute('height'),
          fetchpriority: image.getAttribute('fetchpriority'),
        })),
    );
    assert(images.length > 0, 'no <img> whose src includes "profile" found');
    const problems = images
      .filter((image) => !image.width || !image.height || (image.fetchpriority || '').toLowerCase() !== 'high')
      .map(
        (image) =>
          `${image.src}: width=${image.width || 'missing'}, height=${image.height || 'missing'}, fetchpriority=${image.fetchpriority || 'missing'}`,
      );
    assert(problems.length === 0, problems.join('\n'));
    return images.map((image) => image.src).join(', ');
  });
}

async function checkMetrics() {
  await check('at least 4 [data-metric-value] elements exist', async () => {
    const count = await page(() => document.querySelectorAll('[data-metric-value]').length);
    assert(count >= 4, `found ${count}`);
    return `${count} metrics`;
  });

  // Bring the metrics section into view and give IntersectionObserver one frame
  // to fire. With prefers-reduced-motion: reduce the values must already be final.
  await page(() => {
    const target =
      document.querySelector('#impact') ||
      document.querySelector('[data-metric-value]')?.closest('section') ||
      document.querySelector('[data-metric-value]');
    if (target) target.scrollIntoView({ block: 'center', behavior: 'instant' });
    return Boolean(target);
  });
  await sleep(500);

  const data = await page(() => {
    const elements = [...document.querySelectorAll('[data-metric-value]')];
    return {
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      count: elements.length,
      metrics: elements.map((element) => ({
        text: (element.innerText || element.textContent || '').replace(/\s+/g, ' ').trim(),
        dataValue: element.getAttribute('data-value'),
        visible: window.__ui.isVisible(element),
      })),
    };
  });

  await check('every [data-metric-value] has a non-empty data-value', async () => {
    assert(data.count > 0, 'no [data-metric-value] elements found');
    const missing = data.metrics
      .map((metric, index) => ({ ...metric, index }))
      .filter((metric) => !metric.dataValue || !metric.dataValue.trim());
    assert(
      missing.length === 0,
      missing.map((metric) => `metric ${metric.index + 1} ("${metric.text}") has no data-value`).join('\n'),
    );
    return data.metrics.map((metric) => metric.dataValue).join(', ');
  });

  await check('every visible [data-metric-value] text begins with its data-value', async () => {
    const visible = data.metrics.filter((metric) => metric.visible);
    assert(visible.length > 0, 'no visible [data-metric-value] elements found');
    const mismatched = visible.filter((metric) => {
      const dataValue = (metric.dataValue || '').trim();
      return !dataValue || !metric.text.startsWith(dataValue);
    });
    assert(
      mismatched.length === 0,
      mismatched
        .map((metric) => `data-value="${metric.dataValue || ''}" but visible text is "${metric.text}"`)
        .join('\n'),
    );
    return visible.map((metric) => `${metric.dataValue} -> "${metric.text}"`).join(', ');
  });

  await check('reduced-motion metrics show 95, 56, 70, 3 (no 0)', async () => {
    assert(data.reducedMotion, 'prefers-reduced-motion: reduce was not active');
    assert(data.count > 0, 'no [data-metric-value] elements found');
    const visible = data.metrics.filter((metric) => metric.visible);
    assert(visible.length >= 4, `only ${visible.length} metric element(s) are visible after scrolling`);

    const numbers = [];
    for (const metric of visible) {
      const match = metric.text.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
      if (match) numbers.push({ number: Number(match[0]), text: metric.text });
    }
    assert(numbers.length >= 4, `could not read numeric values from: ${visible.map((m) => `"${m.text}"`).join(', ')}`);

    const zeros = numbers.filter((value) => value.number === 0);
    assert(zeros.length === 0, `metric value(s) still show 0 under reduced motion: ${zeros.map((z) => `"${z.text}"`).join(', ')}`);

    const expected = [95, 56, 70, 3];
    const actual = numbers.map((value) => value.number);
    const missing = expected.filter((value) => !actual.includes(value));
    assert(
      missing.length === 0,
      `missing expected value(s): ${missing.join(', ')}; visible: ${actual.join(', ')} (${visible.map((m) => `"${m.text}"`).join(', ')})`,
    );
    return actual.join(', ');
  });
}

async function checkPhoneLink() {
  await check('telephone link a[href^="tel:"] exists', async () => {
    const data = await page(() => {
      const link = document.querySelector('a[href^="tel:"]');
      return { found: Boolean(link), href: link?.getAttribute('href') || null };
    });
    assert(data.found, 'no a[href^="tel:"] found');
    assert((data.href || '').replace(/^tel:/, '').trim().length > 0, 'telephone link has an empty number');
    return data.href;
  });
}

async function checkTheme(theme) {
  await check(`html applies the selected ${theme} theme after localStorage reload`, async () => {
    const data = await page(() => ({
      className: document.documentElement.className,
      hasLight: document.documentElement.classList.contains('light'),
      hasDark: document.documentElement.classList.contains('dark'),
      stored: (() => {
        try {
          return localStorage.getItem('theme');
        } catch {
          return null;
        }
      })(),
    }));
    assert(data.hasLight || data.hasDark, `<html> has neither "light" nor "dark" class (class="${data.className}")`);
    assert(data.hasLight === (theme === 'light'), `<html> class="${data.className}" does not match stored theme "${theme}"`);
    return `${theme} (class="${data.className}")`;
  });

  if (theme === 'light') {
    await check('at least one meta[name="theme-color"] exists', async () => {
      const count = await page(() => document.querySelectorAll('meta[name="theme-color"]').length);
      assert(count >= 1, `found ${count}`);
      return `${count} meta tag(s)`;
    });
  }
}

async function readThemeState() {
  return page(() => ({
    className: document.documentElement.className,
    hasLight: document.documentElement.classList.contains('light'),
    hasDark: document.documentElement.classList.contains('dark'),
    stored: (() => {
      try {
        return localStorage.getItem('theme');
      } catch {
        return null;
      }
    })(),
    systemDark: matchMedia('(prefers-color-scheme: dark)').matches,
    toggleLabel: document.querySelector('button[aria-label^="Switch to"]')?.getAttribute('aria-label') || null,
  }));
}

async function clearStoredTheme() {
  return page(() => {
    try {
      localStorage.removeItem('theme');
    } catch {
      /* storage can be blocked */
    }
    try {
      return localStorage.getItem('theme');
    } catch {
      return null;
    }
  });
}

async function checkThemeBehavior() {
  // System preference wins only while the visitor has made no explicit choice.
  await emulateMedia('light');
  await clearStoredTheme();
  await reload();

  await check('unset theme follows the light system preference and is not written to localStorage', async () => {
    const data = await pollValue(() => readThemeState(), (value) => value?.hasLight === true, 4000);
    assert(data?.hasLight, `<html> does not have the "light" class with prefers-color-scheme: light (class="${data?.className}")`);
    assert(!data?.hasDark, `<html> still has the "dark" class under a light system preference (class="${data?.className}")`);
    assert(data?.stored === null, `localStorage.theme was written on first mount: "${data?.stored}" (expected null)`);
    return 'light, storage null';
  });

  await emulateMedia('dark');
  await reload();

  await check('unset theme follows the dark system preference and is not written to localStorage', async () => {
    const data = await pollValue(() => readThemeState(), (value) => value?.hasDark === true, 4000);
    assert(data?.hasDark, `<html> does not have the "dark" class with prefers-color-scheme: dark (class="${data?.className}")`);
    assert(!data?.hasLight, `<html> still has the "light" class under a dark system preference (class="${data?.className}")`);
    assert(data?.stored === null, `localStorage.theme was written on first mount: "${data?.stored}" (expected null)`);
    return 'dark, storage null';
  });

  // An explicit choice must be remembered.
  const before = await readThemeState();
  const nextTheme = before?.hasDark ? 'light' : 'dark';
  const clicked = await clickElement(`document.querySelector('button[aria-label^="Switch to"]')`);

  await check('theme toggle flips the theme and persists the choice', async () => {
    assert(clicked, `no visible button[aria-label^="Switch to"] to click (found label: ${before?.toggleLabel || 'none'})`);
    const data = await pollValue(
      () => readThemeState(),
      (value) =>
        (nextTheme === 'dark' ? value?.hasDark : value?.hasLight) === true && value?.stored === nextTheme,
      3000,
    );
    assert(
      nextTheme === 'dark' ? data?.hasDark : data?.hasLight,
      `theme did not flip to "${nextTheme}" after clicking the toggle (class="${data?.className}", label="${data?.toggleLabel}")`,
    );
    assert(
      nextTheme === 'dark' ? !data?.hasLight : !data?.hasDark,
      `<html> kept both theme classes after the toggle (class="${data?.className}")`,
    );
    assert(
      data?.stored === nextTheme,
      `localStorage.theme is ${data?.stored === null ? 'null' : `"${data?.stored}"`} after the toggle (expected "${nextTheme}")`,
    );
    return `${nextTheme}, stored`;
  });

  // Reload while the system prefers the opposite theme: the stored theme wins.
  await reload();
  await check('stored theme wins over the opposite system preference on reload', async () => {
    const data = await pollValue(
      () => readThemeState(),
      (value) => (nextTheme === 'dark' ? value?.hasDark : value?.hasLight) === true,
      4000,
    );
    assert(
      data?.systemDark === (nextTheme === 'light'),
      `emulated system preference was not the opposite of the stored "${nextTheme}" theme (systemDark=${data?.systemDark})`,
    );
    assert(
      nextTheme === 'dark' ? data?.hasDark : data?.hasLight,
      `<html> ignored the stored "${nextTheme}" theme after reload (class="${data?.className}")`,
    );
    assert(
      nextTheme === 'dark' ? !data?.hasLight : !data?.hasDark,
      `<html> kept both theme classes after reload (class="${data?.className}")`,
    );
    assert(data?.stored === nextTheme, `localStorage.theme is "${data?.stored}" after reload (expected "${nextTheme}")`);
    return `${nextTheme} despite ${data.systemDark ? 'dark' : 'light'} system preference`;
  });

  // Leave the browser in the same state the rest of the suite expects.
  await clearStoredTheme();
  await emulateMedia('light');
  await reload();
}

async function checkThemeBootstrapScript() {
  await check('index.html contains an inline theme bootstrap script', async () => {
    const htmlPath = path.join(ROOT, 'index.html');
    assert(existsSync(htmlPath), `not found: ${htmlPath}`);
    const html = readFileSync(htmlPath, 'utf8');
    const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].map((match) => ({
      attrs: match[1],
      code: match[2],
    }));
    const inline = scripts.filter((script) => !/\bsrc\s*=/i.test(script.attrs));
    const bootstrap = inline.find(
      (script) =>
        /localStorage/i.test(script.code) &&
        /theme/i.test(script.code) &&
        /(classList|documentElement|dataset|setAttribute)/i.test(script.code),
    );
    assert(
      Boolean(bootstrap),
      'no inline <script> reads/writes theme state and applies it to the document element before React',
    );
    return `${inline.length} inline script(s) inspected`;
  });
}

async function checkAccessibleNames() {
  await check('every <a> and <button> has an accessible name', async () => {
    const data = await page(() => {
      const unnamed = [];
      for (const element of document.querySelectorAll('a, button')) {
        const name = window.__ui.accessibleName(element);
        if (!name) {
          unnamed.push({ tag: element.tagName.toLowerCase(), html: window.__ui.describe(element) });
        }
      }
      return {
        anchors: document.querySelectorAll('a').length,
        buttons: document.querySelectorAll('button').length,
        unnamed,
      };
    });
    assert(
      data.unnamed.length === 0,
      `${data.unnamed.length} unnamed control(s):\n${data.unnamed
        .slice(0, 8)
        .map((item) => `- <${item.tag}> ${item.html}`)
        .join('\n')}`,
    );
    return `${data.anchors} anchors, ${data.buttons} buttons`;
  });
}

async function checkNoHorizontalOverflow() {
  const data = await page(() => {
    const width = window.innerWidth;
    const scrollWidth = document.documentElement.scrollWidth;
    const offenders = [...document.querySelectorAll('body *')]
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return false;
        return rect.right > width + 1 || rect.left < -1;
      })
      .slice(0, 8)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName.toLowerCase(),
          cls: String(element.className || '').slice(0, 70),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        };
      });
    return { width, scrollWidth, bodyScrollWidth: document.body.scrollWidth, offenders };
  });

  await check('no horizontal overflow at 390px', async () => {
    assert(
      data.scrollWidth <= data.width + 1,
      `documentElement.scrollWidth ${data.scrollWidth} > innerWidth ${data.width} + 1\n` +
        data.offenders
          .map((item) => `- <${item.tag} class="${item.cls}"> left=${item.left} right=${item.right} width=${item.width}`)
          .join('\n'),
    );
    return `scrollWidth ${data.scrollWidth} <= ${data.width + 1}`;
  });
}

async function checkMobileMenu() {
  const toggle = await page(() => {
    const element = window.__ui.menuToggle();
    return {
      found: Boolean(element),
      visible: Boolean(element && window.__ui.isVisible(element)),
      expanded: element?.getAttribute('aria-expanded') ?? null,
      controls: element?.getAttribute('aria-controls') ?? null,
      label: element?.getAttribute('aria-label') || null,
      html: window.__ui.describe(element),
    };
  });

  await check('mobile menu toggle has an aria-expanded attribute', async () => {
    assert(toggle.found && toggle.visible, `no visible header menu toggle found (${toggle.html})`);
    assert(toggle.expanded !== null, `toggle has no aria-expanded (${toggle.html})`);
    return `aria-expanded="${toggle.expanded}"`;
  });

  await check('mobile menu toggle has aria-controls="mobile-nav"', async () => {
    assert(toggle.found && toggle.visible, `no visible header menu toggle found (${toggle.html})`);
    assert(toggle.controls === 'mobile-nav', `aria-controls=${toggle.controls === null ? 'missing' : `"${toggle.controls}"`}`);
    return 'aria-controls="mobile-nav"';
  });

  const opened = await clickElement('window.__ui.menuToggle()');
  await check('clicking the mobile menu toggle opens #mobile-nav', async () => {
    assert(opened, 'could not click the mobile menu toggle');
    const data = await pollValue(
      () =>
        page(() => {
          const element = window.__ui.menuToggle();
          const menu = document.getElementById('mobile-nav');
          return {
            expanded: element?.getAttribute('aria-expanded') ?? null,
            menuExists: Boolean(menu),
            menuVisible: Boolean(menu && window.__ui.isVisible(menu)),
            html: window.__ui.describe(menu),
          };
        }),
      (value) => value?.expanded === 'true' && value?.menuExists && value?.menuVisible,
      2000,
    );
    assert(data?.expanded === 'true', `aria-expanded is ${data?.expanded === null ? 'missing' : `"${data?.expanded}"`} after click`);
    assert(data?.menuExists, '#mobile-nav does not exist after opening the menu');
    assert(data?.menuVisible, `#mobile-nav is not visible after opening (${data?.html})`);
    return 'open';
  });

  // Move focus into the menu so Escape genuinely has to restore focus.
  const focusedInside = await page(() => {
    const menu = document.getElementById('mobile-nav');
    if (!menu) return false;
    const first = menu.querySelector('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])');
    if (!first) return false;
    first.focus();
    return document.activeElement === first;
  });

  await pressKey('Escape', 'Escape', 27);
  await sleep(150);

  await check('Escape closes the mobile menu', async () => {
    const data = await pollValue(
      () =>
        page(() => {
          const element = window.__ui.menuToggle();
          const menu = document.getElementById('mobile-nav');
          return {
            expanded: element?.getAttribute('aria-expanded') ?? null,
            menuExists: Boolean(menu),
            menuVisible: Boolean(menu && window.__ui.isVisible(menu)),
          };
        }),
      (value) => value?.expanded === 'false' && (!value?.menuVisible || !value?.menuExists),
      2000,
    );
    assert(data?.expanded === 'false', `aria-expanded is ${data?.expanded === null ? 'missing' : `"${data?.expanded}"`} after Escape`);
    assert(!data?.menuVisible || !data?.menuExists, '#mobile-nav is still visible after Escape');
    return 'closed';
  });

  await check('Escape returns focus to the mobile menu toggle', async () => {
    assert(focusedInside, 'could not move focus inside the open menu before pressing Escape');
    const focused = await page(() => {
      const element = window.__ui.menuToggle();
      return {
        isToggle: Boolean(element && document.activeElement === element),
        active: window.__ui.describe(document.activeElement),
      };
    });
    assert(focused.isToggle, `focus is on ${focused.active}, not the menu toggle`);
    return 'focus restored';
  });
}

async function scrollToPageBottom() {
  await page(() => {
    const contact = document.querySelector('#contact');
    if (contact) contact.scrollIntoView({ block: 'end', behavior: 'instant' });
    window.scrollTo({ top: document.documentElement.scrollHeight, left: 0, behavior: 'instant' });
    return true;
  });
  await sleep(700);
}

async function readBackToTopState() {
  return page(() => {
    const button = document.querySelector('[aria-label="Back to top"]');
    const contact = document.querySelector('#contact');
    const target = contact ? contact.querySelector('[data-contact-content]') : null;
    const box = (element) => {
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        text: (element.innerText || element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80),
        html: window.__ui.describe(element),
      };
    };
    return {
      found: Boolean(button),
      visible: Boolean(button && window.__ui.isVisible(button)),
      display: button ? getComputedStyle(button).display : null,
      targetFound: Boolean(target),
      scrollY: Math.round(window.scrollY),
      maxScroll: Math.round(document.documentElement.scrollHeight - innerHeight),
      button: box(button),
      target: box(target),
      viewport: { width: innerWidth, height: innerHeight },
    };
  });
}

function overlapArea(a, b) {
  if (!a || !b) return { x: 0, y: 0 };
  return {
    x: Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)),
    y: Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)),
  };
}

function overlapMessage(data) {
  const { x, y } = overlapArea(data.button, data.target);
  return (
    `back-to-top overlaps [data-contact-content] by ${round(x)}x${round(y)}px\n` +
    `- button: ${round(data.button.left)},${round(data.button.top)} .. ${round(data.button.right)},${round(data.button.bottom)} (${data.button.html})\n` +
    `- contact: ${round(data.target.left)},${round(data.target.top)} .. ${round(data.target.right)},${round(data.target.bottom)} "${data.target.text}"`
  );
}

async function checkBackToTopMobile() {
  await scrollToPageBottom();

  const data = await pollValue(() => readBackToTopState(), (value) => value?.found === true, 2500);

  await check('back-to-top is hidden at 390px', async () => {
    assert(
      data?.found,
      `no [aria-label="Back to top"] rendered after scrolling to the bottom (scrollY=${data?.scrollY}, max=${data?.maxScroll}, viewport=${data?.viewport?.width}x${data?.viewport?.height})`,
    );
    assert(
      !data.visible,
      `[aria-label="Back to top"] is visible at ${data.viewport.width}px; it must stay hidden below the md breakpoint (display=${data.display}, ${data.button?.html})`,
    );
    return `hidden (display: ${data.display})`;
  });
}

async function checkBackToTopTablet() {
  await scrollToPageBottom();

  const data = await pollValue(
    () => readBackToTopState(),
    (value) => value?.found === true && value?.visible === true,
    2500,
  );

  await check('back-to-top is visible with 0px contact overlap at 768px', async () => {
    assert(
      data?.found,
      `no [aria-label="Back to top"] button rendered after scrolling to the bottom (scrollY=${data?.scrollY}, max=${data?.maxScroll}, viewport=${data?.viewport?.width}x${data?.viewport?.height})`,
    );
    assert(data.visible, `[aria-label="Back to top"] is not visible at 768px (display=${data.display}, ${data.button?.html})`);
    assert(data.targetFound, 'no [data-contact-content] found inside #contact');
    const { x, y } = overlapArea(data.button, data.target);
    assert(!(x > 0 && y > 0), overlapMessage(data));
    return `visible; 0px overlap (button ${round(data.button.left)},${round(data.button.top)}; contact bottom ${round(data.target.bottom)}; scrollY ${data.scrollY}/${data.maxScroll})`;
  });
}

async function checkBackToTopDesktop() {
  await page(() => {
    const contact = document.querySelector('#contact');
    if (contact) contact.scrollIntoView({ block: 'end', behavior: 'instant' });
    window.scrollTo({ top: document.documentElement.scrollHeight, left: 0, behavior: 'instant' });
    return true;
  });
  await sleep(700);

  const data = await pollValue(
    () =>
      page(() => {
        const button = document.querySelector('[aria-label="Back to top"]');
        const contact = document.querySelector('#contact');
        const target = contact?.querySelector('[data-contact-content]') || null;
        return {
          found: Boolean(button),
          visible: Boolean(button && window.__ui.isVisible(button)),
          targetFound: Boolean(target),
          scrollY: Math.round(window.scrollY),
          maxScroll: Math.round(document.documentElement.scrollHeight - innerHeight),
          button: button
            ? (() => {
                const rect = button.getBoundingClientRect();
                return {
                  left: rect.left,
                  top: rect.top,
                  right: rect.right,
                  bottom: rect.bottom,
                  html: window.__ui.describe(button),
                };
              })()
            : null,
          target: target
            ? (() => {
                const rect = target.getBoundingClientRect();
                return {
                  left: rect.left,
                  top: rect.top,
                  right: rect.right,
                  bottom: rect.bottom,
                  text: (target.innerText || target.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80),
                };
              })()
            : null,
          viewport: { width: innerWidth, height: innerHeight },
        };
      }),
    (value) => value?.found === true && value?.visible === true,
    2500,
  );

  await check('desktop back-to-top is visible and does not overlap contact content at 1024px', async () => {
    assert(
      data?.found,
      `no [aria-label="Back to top"] button rendered after scrolling to the bottom (scrollY=${data?.scrollY}, max=${data?.maxScroll}, viewport=${data?.viewport?.width}x${data?.viewport?.height})`,
    );
    assert(
      data.visible,
      `[aria-label="Back to top"] is not visible at 1024px (${data.button.html})`,
    );
    assert(data.targetFound, 'no [data-contact-content] found inside #contact');
    const overlapX = Math.max(
      0,
      Math.min(data.button.right, data.target.right) - Math.max(data.button.left, data.target.left),
    );
    const overlapY = Math.max(
      0,
      Math.min(data.button.bottom, data.target.bottom) - Math.max(data.button.top, data.target.top),
    );
    assert(
      !(overlapX > 0 && overlapY > 0),
      `back-to-top overlaps [data-contact-content] by ${round(overlapX)}x${round(overlapY)}px\n` +
        `- button: ${round(data.button.left)},${round(data.button.top)} .. ${round(data.button.right)},${round(data.button.bottom)} (${data.button.html})\n` +
        `- contact: ${round(data.target.left)},${round(data.target.top)} .. ${round(data.target.right)},${round(data.target.bottom)} "${data.target.text}"`,
    );
    return `visible; 0px overlap (button ${round(data.button.left)},${round(data.button.top)}; contact bottom ${round(data.target.bottom)}; scrollY ${data.scrollY}/${data.maxScroll})`;
  });
}

async function checkConsoleErrors() {
  await sleep(400);
  await check('no console errors or uncaught exceptions', async () => {
    const unique = [...new Set([...consoleErrors, ...exceptions])];
    assert(
      unique.length === 0,
      `${unique.length} error event(s):\n${unique.map((message) => `- ${message}`).join('\n')}`,
    );
    return '0 errors';
  });
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

async function main() {
  if (!existsSync(path.join(ROOT, 'dist'))) {
    console.error('run npm run build');
    process.exit(1);
  }
  if (!existsSync(path.join(ROOT, 'dist', 'index.html'))) {
    console.error('run npm run build');
    process.exit(1);
  }
  if (!existsSync(VITE_BIN)) {
    console.error('vite is not installed; run npm install');
    process.exit(1);
  }
  if (!existsSync(CHROME_BIN)) {
    console.error(`Chrome not found at ${CHROME_BIN}; set CHROME_PATH`);
    process.exit(1);
  }

  console.log(`vite preview -> ${PREVIEW_URL}`);
  preview = spawn(VITE_BIN, ['preview', '--port', String(PREVIEW_PORT), '--strictPort'], {
    cwd: ROOT,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  preview.stdout.on('data', (chunk) => {
    previewLog += String(chunk);
  });
  preview.stderr.on('data', (chunk) => {
    previewLog += String(chunk);
  });

  await waitForHttp([
    PREVIEW_URL,
    `http://127.0.0.1:${PREVIEW_PORT}/portfolio/`,
  ]);

  userDataDir = mkdtempSync(path.join(tmpdir(), 'portfolio-ui-check-'));
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
    { detached: true, stdio: ['ignore', 'ignore', 'pipe'] },
  );
  chrome.stderr.on('data', (chunk) => {
    chromeLog += String(chunk);
  });

  CDP_PORT = await waitForDevToolsPort();
  console.log(`Chrome headless -> CDP ${CDP_PORT}`);

  await waitForChrome();
  const target = await pageTarget();
  cdp = await CDP.connect(target.webSocketDebuggerUrl);

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Page.bringToFront').catch(() => {});
  // Headless Chrome does not always treat its page as the focused window,
  // which suppresses :focus styles. Emulate a focused tab so keyboard focus
  // assertions exercise real CSS.
  await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => {});
  watchRuntime();
  await emulateMedia('light');

  // --- Desktop / light ------------------------------------------------
  await setViewport(DESKTOP);
  await navigate(PREVIEW_URL);
  await checkThemeBehavior();
  await applyTheme('light');

  await checkSkipLink();
  await checkHeadingOrder();
  await checkNestedInteractive();
  await checkHeaderNav();
  await checkProjectCards();
  await checkAvatarBadges('light');
  await checkControlContrast('light');
  await checkProfileImage();
  await checkMetrics();
  await checkPhoneLink();
  await checkTheme('light');
  await checkThemeBootstrapScript();
  await checkAccessibleNames();

  // --- Desktop / dark -------------------------------------------------
  await applyTheme('dark');
  await checkAvatarBadges('dark');
  await checkControlContrast('dark');
  await checkTheme('dark');

  // --- Desktop narrow / back-to-top -----------------------------------
  await setViewport(DESKTOP_NARROW);
  await applyTheme('light');
  await checkBackToTopDesktop();

  // --- Tablet / back-to-top -------------------------------------------
  await setViewport(TABLET);
  await applyTheme('light');
  await checkBackToTopTablet();

  // --- Mobile / light -------------------------------------------------
  await setViewport(MOBILE);
  await applyTheme('light');
  await checkMobileMenu();
  await checkNoHorizontalOverflow();
  await checkBackToTopMobile();

  await checkConsoleErrors();

  const passed = results.filter((result) => result.ok).length;
  const failed = results.length - passed;
  console.log('');
  console.log(`Summary: ${passed} passed, ${failed} failed, ${results.length} total`);
  if (failed > 0) {
    console.log('Failed checks:');
    for (const result of results.filter((item) => !item.ok)) {
      console.log(`  - ${result.name}`);
    }
    console.log('RESULT: FAIL');
    process.exitCode = 1;
  } else {
    console.log('RESULT: PASS');
    process.exitCode = 0;
  }
}

try {
  await main();
} catch (error) {
  console.error(`FATAL: ${error instanceof Error ? error.message : String(error)}`);
  if (previewLog) console.error(`vite preview output:\n${oneLine(previewLog, 3000)}`);
  if (chromeLog) console.error(`Chrome output:\n${oneLine(chromeLog, 3000)}`);
  process.exitCode = 1;
} finally {
  await cleanup();
}
