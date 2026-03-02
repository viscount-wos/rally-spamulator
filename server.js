require('dotenv').config();
const express = require('express');
const session = require('express-session');
const SqliteStore = require('better-sqlite3-session-store')(session);
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { upsertUser, getUser, getAllUsers, setUserRole, bootstrapAdmin } = require('./db');

const app = express();
const PORT = process.env.PORT || 8080;

// Discord OAuth2 config
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || `http://localhost:${PORT}/auth/discord/callback`;
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret-change-me';

if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
  console.error('ERROR: DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET must be set');
  process.exit(1);
}

// Ensure data directory for session store
const dataDir = path.dirname(process.env.DB_PATH || path.join(__dirname, 'data', 'rally.db'));
fs.mkdirSync(dataDir, { recursive: true });

// Session store (separate DB file from app data)
const sessionDb = new Database(path.join(dataDir, 'sessions.db'));

app.use(express.json());

app.use(session({
  store: new SqliteStore({ client: sessionDb }),
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    httpOnly: true,
    secure: false // set true in production with HTTPS
  }
}));

// ===== Auth Middleware =====

function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  // API requests get 401, page requests get redirected
  if (req.path.startsWith('/api/') || req.path === '/auth/status') {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  return res.redirect('/login');
}

function requireRole(...roles) {
  return (req, res, next) => {
    const user = getUser(req.session.userId);
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

// ===== Public Routes =====

// Login page (always accessible)
app.get('/login', (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Start Discord OAuth flow
app.get('/auth/discord', (req, res) => {
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: DISCORD_REDIRECT_URI,
    response_type: 'code',
    scope: 'identify email'
  });
  res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
});

// Discord OAuth callback
app.get('/auth/discord/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.redirect('/login?error=no_code');
  }

  try {
    // Exchange code for access token
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: DISCORD_REDIRECT_URI
      })
    });

    if (!tokenRes.ok) {
      console.error('Token exchange failed:', await tokenRes.text());
      return res.redirect('/login?error=token_failed');
    }

    const tokenData = await tokenRes.json();

    // Fetch user profile from Discord
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });

    if (!userRes.ok) {
      console.error('User fetch failed:', await userRes.text());
      return res.redirect('/login?error=user_failed');
    }

    const discordUser = await userRes.json();

    // Upsert user in database
    const user = upsertUser(discordUser);

    // Bootstrap admin if configured
    bootstrapAdmin();

    // Create session
    req.session.userId = user.discord_id;
    req.session.save(() => {
      res.redirect('/');
    });

  } catch (err) {
    console.error('OAuth error:', err);
    res.redirect('/login?error=oauth_failed');
  }
});

// ===== Protected Routes =====

// Auth status check
app.get('/auth/status', requireAuth, (req, res) => {
  const user = getUser(req.session.userId);
  if (!user) {
    req.session.destroy();
    return res.status(401).json({ error: 'User not found' });
  }
  res.json({
    discord_id: user.discord_id,
    username: user.username,
    global_name: user.global_name,
    avatar: user.avatar,
    role: user.role
  });
});

// Logout
app.post('/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

// ===== User Management API (R5/Admin only) =====

app.get('/api/users', requireAuth, requireRole('r5', 'admin'), (req, res) => {
  const users = getAllUsers();
  res.json(users);
});

app.put('/api/users/:id/role', requireAuth, requireRole('r5', 'admin'), (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  const currentUser = getUser(req.session.userId);

  // Only admin can assign admin role
  if (role === 'admin' && currentUser.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can assign the admin role' });
  }

  // Cannot change your own role
  if (id === req.session.userId) {
    return res.status(400).json({ error: 'Cannot change your own role' });
  }

  try {
    const updated = setUserRole(id, role);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ===== Static Files (behind auth) =====

// Auth gate for static files (except login page and auth routes)
app.use((req, res, next) => {
  // Allow public paths
  if (req.path === '/login' || req.path === '/login.html' || req.path.startsWith('/auth/')) {
    return next();
  }
  // Check auth for everything else
  if (!req.session || !req.session.userId) {
    return res.redirect('/login');
  }
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

// Fallback: serve index.html for any unmatched route (SPA)
app.get('*', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Rally Spamulator listening on port ${PORT}`);
});
