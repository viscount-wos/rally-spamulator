require('dotenv').config();
const express = require('express');
const session = require('express-session');
const SqliteStore = require('better-sqlite3-session-store')(session);
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const {
  upsertUser, getUser, getAllUsers, setUserRole, deleteUser, bootstrapAdmin,
  setWosProfile, getRegisteredCallers,
  createRally, getActiveRallies, getRallyWithCallers, getRallyCallers, cancelRally, cleanupExpiredRallies,
  createDoc, updateDoc, deleteDoc, getDoc, getAllDocs
} = require('./db');

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

const sessionMiddleware = session({
  store: new SqliteStore({ client: sessionDb }),
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    httpOnly: true,
    secure: false // set true in production with HTTPS
  }
});

app.use(sessionMiddleware);

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

// ===== SSE (Server-Sent Events) Infrastructure =====

const sseClients = new Map(); // userId -> response

function broadcastSSE(data) {
  const message = 'data: ' + JSON.stringify(data) + '\n\n';
  for (const [userId, res] of sseClients) {
    try {
      res.write(message);
    } catch (e) {
      sseClients.delete(userId);
    }
  }
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

// Auth status check (includes WOS profile fields)
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
    role: user.role,
    wos_name: user.wos_name,
    march_seconds: user.march_seconds,
    city_level: user.city_level,
    timezone: user.timezone,
    main_troop_type: user.main_troop_type,
    notes: user.notes
  });
});

// Logout
app.post('/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

// ===== WOS Profile API =====

app.get('/api/profile', requireAuth, (req, res) => {
  const user = getUser(req.session.userId);
  res.json({
    wos_name: user.wos_name,
    march_seconds: user.march_seconds,
    city_level: user.city_level,
    timezone: user.timezone,
    main_troop_type: user.main_troop_type,
    notes: user.notes
  });
});

app.put('/api/profile', requireAuth, (req, res) => {
  const { wos_name, march_seconds, city_level, timezone, main_troop_type, notes } = req.body;
  if (wos_name !== undefined && wos_name !== null && typeof wos_name !== 'string') {
    return res.status(400).json({ error: 'Invalid wos_name' });
  }
  if (march_seconds !== undefined && march_seconds !== null && (typeof march_seconds !== 'number' || march_seconds < 0 || march_seconds > 3600)) {
    return res.status(400).json({ error: 'Invalid march_seconds' });
  }
  if (city_level !== undefined && city_level !== null && typeof city_level !== 'string') {
    return res.status(400).json({ error: 'Invalid city_level' });
  }
  if (timezone !== undefined && timezone !== null && typeof timezone !== 'string') {
    return res.status(400).json({ error: 'Invalid timezone' });
  }
  if (main_troop_type !== undefined && main_troop_type !== null && typeof main_troop_type !== 'string') {
    return res.status(400).json({ error: 'Invalid main_troop_type' });
  }
  if (notes !== undefined && notes !== null && typeof notes !== 'string') {
    return res.status(400).json({ error: 'Invalid notes' });
  }
  const updated = setWosProfile(
    req.session.userId,
    wos_name,
    march_seconds,
    city_level,
    timezone,
    main_troop_type,
    notes
  );
  broadcastSSE({ type: 'profile_updated' });
  res.json({
    wos_name: updated.wos_name,
    march_seconds: updated.march_seconds,
    city_level: updated.city_level,
    timezone: updated.timezone,
    main_troop_type: updated.main_troop_type,
    notes: updated.notes
  });
});

// ===== Registered Callers API =====

app.get('/api/callers', requireAuth, (req, res) => {
  const callers = getRegisteredCallers();
  res.json(callers);
});

// ===== Rally Broadcasting API =====

app.post('/api/rallies', requireAuth, requireRole('r4', 'r5', 'admin'), (req, res) => {
  const { arrival_ms, rally_duration_seconds, callers } = req.body;
  if (!arrival_ms || !rally_duration_seconds || !Array.isArray(callers) || callers.length === 0) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (arrival_ms < Date.now()) {
    return res.status(400).json({ error: 'Arrival time is in the past' });
  }
  try {
    const rallyId = createRally(req.session.userId, arrival_ms, rally_duration_seconds, callers);
    const rally = getRallyWithCallers(rallyId);
    broadcastSSE({ type: 'rally_created', rally });
    res.json(rally);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/rallies', requireAuth, (req, res) => {
  cleanupExpiredRallies();
  const rallies = getActiveRallies();
  const result = rallies.map(r => {
    r.callers = getRallyCallers(r.id);
    return r;
  });
  res.json(result);
});

app.delete('/api/rallies/:id', requireAuth, (req, res) => {
  const rally = getRallyWithCallers(parseInt(req.params.id));
  if (!rally) return res.status(404).json({ error: 'Rally not found' });
  const user = getUser(req.session.userId);
  // Only creator, R5, or admin can cancel
  if (rally.creator_id !== req.session.userId && user.role !== 'r5' && user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized' });
  }
  cancelRally(rally.id);
  broadcastSSE({ type: 'rally_cancelled', rally_id: rally.id });
  res.json({ ok: true });
});

// ===== SSE Endpoint =====

app.get('/api/events', requireAuth, (req, res) => {
  const userId = req.session.userId;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  // Send initial connection confirmation
  res.write('data: ' + JSON.stringify({ type: 'connected' }) + '\n\n');

  // Store client connection
  sseClients.set(userId, res);

  // Heartbeat every 30s to keep connection alive
  const heartbeat = setInterval(() => {
    try { res.write(': heartbeat\n\n'); } catch (e) { /* ignore */ }
  }, 30000);

  // Cleanup on disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(userId);
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

app.put('/api/users/:id/profile', requireAuth, requireRole('r5', 'admin'), (req, res) => {
  const { id } = req.params;
  const { wos_name, march_seconds, city_level, timezone, main_troop_type, notes } = req.body;
  if (wos_name !== undefined && wos_name !== null && typeof wos_name !== 'string') {
    return res.status(400).json({ error: 'Invalid wos_name' });
  }
  if (march_seconds !== undefined && march_seconds !== null && (typeof march_seconds !== 'number' || march_seconds < 0 || march_seconds > 3600)) {
    return res.status(400).json({ error: 'Invalid march_seconds' });
  }
  if (city_level !== undefined && city_level !== null && typeof city_level !== 'string') {
    return res.status(400).json({ error: 'Invalid city_level' });
  }
  if (timezone !== undefined && timezone !== null && typeof timezone !== 'string') {
    return res.status(400).json({ error: 'Invalid timezone' });
  }
  if (main_troop_type !== undefined && main_troop_type !== null && typeof main_troop_type !== 'string') {
    return res.status(400).json({ error: 'Invalid main_troop_type' });
  }
  if (notes !== undefined && notes !== null && typeof notes !== 'string') {
    return res.status(400).json({ error: 'Invalid notes' });
  }
  const updated = setWosProfile(id, wos_name, march_seconds, city_level, timezone, main_troop_type, notes);
  broadcastSSE({ type: 'profile_updated' });
  res.json(updated);
});

// ===== Players list (R4/R5/Admin) =====

app.get('/api/players', requireAuth, requireRole('r4', 'r5', 'admin'), (req, res) => {
  const users = getAllUsers();
  res.json(users);
});

// ===== Alliance Docs / Notices =====

function canSeeDoc(user, doc) {
  if (!doc) return false;
  const role = user.role || null;
  if (doc.audience === 'all') return true;
  if (doc.audience === 'r4plus') return role === 'r4' || role === 'r5' || role === 'admin';
  if (doc.audience === 'r5plus') return role === 'r5' || role === 'admin';
  if (doc.audience === 'admin') return role === 'admin';
  return false;
}

function sanitizeDocAudience(audience) {
  const allowed = ['all', 'r4plus', 'r5plus', 'admin'];
  return allowed.includes(audience) ? audience : 'all';
}

app.get('/api/docs', requireAuth, (req, res) => {
  const user = getUser(req.session.userId);
  const docs = getAllDocs().filter(d => canSeeDoc(user, d));
  res.json(docs);
});

app.get('/api/docs/:id', requireAuth, (req, res) => {
  const user = getUser(req.session.userId);
  const doc = getDoc(parseInt(req.params.id, 10));
  if (!doc || !canSeeDoc(user, doc)) {
    return res.status(404).json({ error: 'Doc not found' });
  }
  res.json(doc);
});

app.post('/api/docs', requireAuth, requireRole('r4', 'r5', 'admin'), (req, res) => {
  const { title, body, category, audience, pinned } = req.body;
  if (!title || typeof title !== 'string' || title.length > 200) {
    return res.status(400).json({ error: 'Invalid title' });
  }
  if (!body || typeof body !== 'string') {
    return res.status(400).json({ error: 'Invalid body' });
  }
  if (category !== undefined && category !== null && typeof category !== 'string') {
    return res.status(400).json({ error: 'Invalid category' });
  }
  const safeAudience = sanitizeDocAudience(audience || 'all');
  const pinFlag = !!pinned;
  try {
    const id = createDoc(title.trim(), body.trim(), category ? category.trim() : null, safeAudience, pinFlag, req.session.userId);
    const doc = getDoc(id);
    res.json(doc);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/docs/:id', requireAuth, requireRole('r4', 'r5', 'admin'), (req, res) => {
  const id = parseInt(req.params.id, 10);
  const existing = getDoc(id);
  if (!existing) {
    return res.status(404).json({ error: 'Doc not found' });
  }
  const { title, body, category, audience, pinned } = req.body;
  if (!title || typeof title !== 'string' || title.length > 200) {
    return res.status(400).json({ error: 'Invalid title' });
  }
  if (!body || typeof body !== 'string') {
    return res.status(400).json({ error: 'Invalid body' });
  }
  if (category !== undefined && category !== null && typeof category !== 'string') {
    return res.status(400).json({ error: 'Invalid category' });
  }
  const safeAudience = sanitizeDocAudience(audience || existing.audience || 'all');
  const pinFlag = !!pinned;
  try {
    const updated = updateDoc(id, title.trim(), body.trim(), category ? category.trim() : null, safeAudience, pinFlag);
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/docs/:id', requireAuth, requireRole('r5', 'admin'), (req, res) => {
  const id = parseInt(req.params.id, 10);
  const existing = getDoc(id);
  if (!existing) {
    return res.status(404).json({ error: 'Doc not found' });
  }
  try {
    deleteDoc(id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/users/:id', requireAuth, requireRole('r5', 'admin'), (req, res) => {
  const { id } = req.params;

  // Cannot delete yourself
  if (id === req.session.userId) {
    return res.status(400).json({ error: 'Cannot delete yourself' });
  }

  const currentUser = getUser(req.session.userId);
  const targetUser = getUser(id);
  if (!targetUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Only admin can delete other admins
  if (targetUser.role === 'admin' && currentUser.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can delete other admins' });
  }

  try {
    const cancelledRallyIds = deleteUser(id);

    // Broadcast rally cancellations
    cancelledRallyIds.forEach(rallyId => {
      broadcastSSE({ type: 'rally_cancelled', rally_id: rallyId });
    });

    // Broadcast user deletion
    broadcastSSE({ type: 'user_deleted', discord_id: id });

    // Close deleted user's SSE connection if they're connected
    const deletedClient = sseClients.get(id);
    if (deletedClient) {
      try { deletedClient.end(); } catch (e) { /* ignore */ }
      sseClients.delete(id);
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
