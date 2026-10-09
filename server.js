// Tiny static server for the Rally Spamulator. No login, no database:
// all data stays in the browser (localStorage).
const express = require('express');
const compression = require('compression');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;
const PUBLIC = path.join(__dirname, 'public');

app.disable('x-powered-by');
app.set('trust proxy', true);

const CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self'",
  "connect-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'"
].join('; ');

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
    'Strict-Transport-Security': 'max-age=31536000'
  });
  next();
});

app.use(compression());

app.get('/health', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ status: 'ok' });
});

// Old links from the login era land on the app.
app.get(['/login', '/login.html', '/auth/*'], (req, res) => res.redirect(302, '/'));

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

if (require.main === module) {
  app.listen(PORT, () => console.log(`Rally Spamulator listening on port ${PORT}`));
}

module.exports = app;
