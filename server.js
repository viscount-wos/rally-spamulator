// Tiny static server for the Rally Spamulator, behind a shared-password gate.
// No database: app data stays in the browser (localStorage). The gate is
// stateless: the cookie is an HMAC of a fixed message keyed by GATE_PASSWORD,
// so changing the password logs everyone out.
const express = require('express');
const compression = require('compression');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PUBLIC = path.join(__dirname, 'public');
const COOKIE = 'rally_gate';
const COOKIE_MAX_AGE = 30 * 24 * 3600; // seconds
const RATE_MAX = 10;                    // wrong POST /login attempts per client IP ...
const RATE_WINDOW_MS = 15 * 60 * 1000;  // ... per 15 minutes
// Reachable without the cookie (the login page needs its own CSS/JS).
const OPEN_PATHS = new Set(['/health', '/robots.txt', '/login', '/login.html', '/login.css', '/login.js', '/tokens.css', '/theme.js', '/icon.svg', '/favicon.ico', '/logout']);
// Private tool (shared by password only): ask search engines to stay out of every response.
const ROBOTS_TAG = 'noindex, nofollow';
const ROBOTS_TXT = 'User-agent: *\nDisallow: /\n';

const CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self'",
  "connect-src 'self'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'"
].join('; ');

// Reads the gate password from the environment. Throws in production without one.
function gateConfig(env) {
  const password = env.GATE_PASSWORD || '';
  if (!password && env.NODE_ENV === 'production') {
    throw new Error('GATE_PASSWORD is not set: refusing to start in production');
  }
  return { password };
}

const sha256 = (s) => crypto.createHash('sha256').update(String(s), 'utf8').digest();
const safeEqual = (a, b) => crypto.timingSafeEqual(sha256(a), sha256(b));

// Only same-site relative paths ("/x?y"); anything else (//evil, /\evil, http:...) -> '/'.
function safeNext(next) {
  if (typeof next !== 'string' || next.length > 512) return '/';
  if (!next.startsWith('/') || next.startsWith('//') || /[\\\x00-\x1f\x7f]/.test(next)) return '/';
  try {
    const u = new URL(next, 'http://gate.invalid');
    if (u.origin !== 'http://gate.invalid') return '/';
    if (['/login', '/login.html', '/logout'].includes(u.pathname)) return '/';
    return u.pathname + u.search;
  } catch (e) {
    return '/';
  }
}

function readCookie(req, name) {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function createApp(opts = {}) {
  const password = opts.password || '';
  const gateOn = Boolean(password);
  const log = opts.log || console;
  const token = gateOn ? crypto.createHmac('sha256', password).update('rally-gate-v1').digest('base64url') : '';
  const loginTemplate = fs.readFileSync(path.join(PUBLIC, 'login.html'), 'utf8');
  const attempts = new Map(); // ip -> { count, resetAt }

  const app = express();
  app.disable('x-powered-by');
  // Cloud Run: req.ip = right-most X-Forwarded-For entry, req.secure from X-Forwarded-Proto.
  app.set('trust proxy', 1);

  if (!gateOn) log.warn('WARNING: GATE_PASSWORD is not set; the password gate is DISABLED (dev only).');

  app.use((req, res, next) => {
    res.set({
      'Content-Security-Policy': CSP,
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'no-referrer',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Resource-Policy': 'same-origin',
      // Browsers ignore HSTS over plain http (LAN); it applies on Cloud Run's https.
      'Strict-Transport-Security': 'max-age=31536000',
      'X-Robots-Tag': ROBOTS_TAG
    });
    next();
  });

  app.use(compression());

  app.get('/health', (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({ status: 'ok' });
  });

  // robots.txt is open (no gate) so crawlers can read "stay out".
  app.get('/robots.txt', (req, res) => {
    res.set('Cache-Control', 'public, max-age=86400');
    res.type('text/plain').send(ROBOTS_TXT);
  });

  const authed = (req) => {
    if (!gateOn) return true;
    const c = readCookie(req, COOKIE);
    return c !== null && safeEqual(c, token);
  };

  const cookieFlags = (req, maxAge) =>
    `Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${req.secure ? '; Secure' : ''}`;

  // The login page is static apart from the error code and the "next" path.
  function sendLogin(res, status, error, next) {
    const html = loginTemplate
      .replace('data-error=""', `data-error="${escapeHtml(error || '')}"`)
      .replace('name="next" value="/"', `name="next" value="${escapeHtml(safeNext(next))}"`);
    res.status(status).set('Cache-Control', 'no-store').type('html').send(html);
  }

  if (gateOn) {
    app.get(['/login', '/login.html'], (req, res) => {
      if (authed(req)) return res.redirect(303, safeNext(req.query.next));
      sendLogin(res, 200, '', req.query.next);
    });

    app.post('/login', express.urlencoded({ extended: false, limit: '4kb' }), (req, res) => {
      const ip = req.ip || 'unknown';
      const now = Date.now();
      let a = attempts.get(ip);
      if (!a || a.resetAt <= now) { a = { count: 0, resetAt: now + RATE_WINDOW_MS }; attempts.set(ip, a); }
      const body = req.body || {};
      if (a.count >= RATE_MAX) {
        res.set('Retry-After', String(Math.ceil((a.resetAt - now) / 1000)));
        return sendLogin(res, 429, 'rate', body.next);
      }
      const given = typeof body.password === 'string' ? body.password : '';
      if (!safeEqual(given, password)) {
        a.count += 1; // only wrong passwords use up the budget
        return sendLogin(res, 401, 'bad', body.next);
      }
      res.set('Set-Cookie', `${COOKIE}=${token}; ${cookieFlags(req, COOKIE_MAX_AGE)}`);
      res.redirect(303, safeNext(body.next));
    });

    app.get('/logout', (req, res) => {
      res.set('Set-Cookie', `${COOKIE}=; ${cookieFlags(req, 0)}`);
      res.set('Cache-Control', 'no-store');
      res.redirect(303, '/login');
    });

    // Keep the attempt table small: drop expired entries.
    const sweep = setInterval(() => {
      const now = Date.now();
      for (const [ip, a] of attempts) if (a.resetAt <= now) attempts.delete(ip);
    }, 60 * 1000);
    sweep.unref();

    // Everything else needs the cookie: pages redirect to the login, the rest get 401.
    app.use((req, res, next) => {
      if (OPEN_PATHS.has(req.path) || authed(req)) return next();
      res.set('Cache-Control', 'no-store');
      const wantsPage = (req.method === 'GET' || req.method === 'HEAD') && /text\/html/.test(req.headers.accept || '');
      if (wantsPage) return res.redirect(302, '/login?next=' + encodeURIComponent(safeNext(req.originalUrl)));
      res.status(401).type('text/plain').send('Password required');
    });
  } else {
    // Gate disabled (dev only): the login page and logout lead straight to the app.
    app.get(['/login', '/login.html', '/logout'], (req, res) => res.redirect(302, '/'));
  }

  // Old links from the Discord-login era land on the app.
  app.get('/auth/*', (req, res) => res.redirect(302, '/'));

  app.use(express.static(PUBLIC, {
    index: 'index.html',
    etag: true,
    lastModified: true,
    setHeaders(res, filePath) {
      // Small files: always revalidate (cheap 304s) so a deploy shows up at once.
      res.set('Cache-Control', filePath.endsWith('icon.svg') ? 'public, max-age=86400' : 'no-cache');
    }
  }));

  app.use((req, res) => res.status(404).type('text/plain').send('Not found'));
  return app;
}

if (require.main === module) {
  let cfg;
  try {
    cfg = gateConfig(process.env);
  } catch (e) {
    console.error('FATAL: ' + e.message);
    process.exit(1);
  }
  const PORT = process.env.PORT || 8080;
  createApp(cfg).listen(PORT, () =>
    console.log(`Rally Spamulator listening on port ${PORT} (password gate ${cfg.password ? 'on' : 'OFF'})`));
}

module.exports = { createApp, gateConfig, safeNext, COOKIE, RATE_MAX };
