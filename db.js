const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'rally.db');

// Ensure data directory exists
const fs = require('fs');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent access
db.pragma('journal_mode = WAL');

// Create users table
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    discord_id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    global_name TEXT,
    avatar TEXT,
    email TEXT,
    role TEXT DEFAULT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    last_login TEXT DEFAULT (datetime('now'))
  )
`);

// Migration: add WOS profile columns (safe — SQLite throws if column exists)
try { db.exec('ALTER TABLE users ADD COLUMN wos_name TEXT DEFAULT NULL'); } catch (e) {}
try { db.exec('ALTER TABLE users ADD COLUMN march_seconds INTEGER DEFAULT NULL'); } catch (e) {}

// Create rallies table for broadcasted rallies
db.exec(`
  CREATE TABLE IF NOT EXISTS rallies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    creator_id TEXT NOT NULL,
    arrival_ms INTEGER NOT NULL,
    rally_duration_seconds INTEGER NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

// Create rally_callers table linking callers to a rally
db.exec(`
  CREATE TABLE IF NOT EXISTS rally_callers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rally_id INTEGER NOT NULL,
    discord_id TEXT,
    caller_name TEXT NOT NULL,
    march_seconds INTEGER NOT NULL,
    arrival_order INTEGER NOT NULL,
    FOREIGN KEY (rally_id) REFERENCES rallies(id)
  )
`);

// ===== User Functions =====

// Upsert user from Discord profile
const upsertStmt = db.prepare(`
  INSERT INTO users (discord_id, username, global_name, avatar, email, last_login)
  VALUES (@discord_id, @username, @global_name, @avatar, @email, datetime('now'))
  ON CONFLICT(discord_id) DO UPDATE SET
    username = @username,
    global_name = @global_name,
    avatar = @avatar,
    email = @email,
    last_login = datetime('now')
`);

function upsertUser(profile) {
  upsertStmt.run({
    discord_id: profile.id,
    username: profile.username,
    global_name: profile.global_name || null,
    avatar: profile.avatar || null,
    email: profile.email || null
  });
  return getUser(profile.id);
}

// Get user by Discord ID
const getUserStmt = db.prepare('SELECT * FROM users WHERE discord_id = ?');
function getUser(discordId) {
  return getUserStmt.get(discordId);
}

// Get all users
const getAllUsersStmt = db.prepare('SELECT * FROM users ORDER BY created_at DESC');
function getAllUsers() {
  return getAllUsersStmt.all();
}

// Set user role
const setRoleStmt = db.prepare('UPDATE users SET role = ? WHERE discord_id = ?');
function setUserRole(discordId, role) {
  const validRoles = [null, 'r123', 'r4', 'r5', 'admin'];
  if (!validRoles.includes(role)) {
    throw new Error('Invalid role: ' + role);
  }
  setRoleStmt.run(role, discordId);
  return getUser(discordId);
}

// Auto-promote first admin if ADMIN_DISCORD_ID is set
function bootstrapAdmin() {
  const adminId = process.env.ADMIN_DISCORD_ID;
  if (!adminId) return;
  const user = getUser(adminId);
  if (user && !user.role) {
    setUserRole(adminId, 'admin');
    console.log(`Auto-promoted ${user.username} (${adminId}) to admin`);
  }
}

// ===== WOS Profile Functions =====

const setWosProfileStmt = db.prepare('UPDATE users SET wos_name = ?, march_seconds = ? WHERE discord_id = ?');
function setWosProfile(discordId, wosName, marchSeconds) {
  setWosProfileStmt.run(wosName || null, marchSeconds || null, discordId);
  return getUser(discordId);
}

const getRegisteredCallersStmt = db.prepare(
  `SELECT discord_id, username, global_name, avatar, wos_name, march_seconds, role
   FROM users
   WHERE wos_name IS NOT NULL AND march_seconds IS NOT NULL AND role IS NOT NULL
   ORDER BY wos_name`
);
function getRegisteredCallers() {
  return getRegisteredCallersStmt.all();
}

// ===== Rally Functions =====

const insertRallyStmt = db.prepare(
  'INSERT INTO rallies (creator_id, arrival_ms, rally_duration_seconds) VALUES (?, ?, ?)'
);
const insertRallyCallerStmt = db.prepare(
  'INSERT INTO rally_callers (rally_id, discord_id, caller_name, march_seconds, arrival_order) VALUES (?, ?, ?, ?, ?)'
);

const createRallyTx = db.transaction((creatorId, arrivalMs, durationSec, callers) => {
  const result = insertRallyStmt.run(creatorId, arrivalMs, durationSec);
  const rallyId = Number(result.lastInsertRowid);
  for (const c of callers) {
    insertRallyCallerStmt.run(rallyId, c.discord_id || null, c.caller_name, c.march_seconds, c.arrival_order);
  }
  return rallyId;
});

function createRally(creatorId, arrivalMs, durationSec, callers) {
  return createRallyTx(creatorId, arrivalMs, durationSec, callers);
}

const getActiveRalliesStmt = db.prepare(
  `SELECT r.*, u.username AS creator_name, u.global_name AS creator_global_name
   FROM rallies r JOIN users u ON r.creator_id = u.discord_id
   WHERE r.status = 'active'
   ORDER BY r.created_at DESC`
);
function getActiveRallies() {
  return getActiveRalliesStmt.all();
}

const getRallyCallersStmt = db.prepare(
  'SELECT * FROM rally_callers WHERE rally_id = ? ORDER BY arrival_order'
);
function getRallyCallers(rallyId) {
  return getRallyCallersStmt.all(rallyId);
}

function getRallyWithCallers(rallyId) {
  const rally = db.prepare(
    `SELECT r.*, u.username AS creator_name, u.global_name AS creator_global_name
     FROM rallies r JOIN users u ON r.creator_id = u.discord_id
     WHERE r.id = ?`
  ).get(rallyId);
  if (!rally) return null;
  rally.callers = getRallyCallers(rallyId);
  return rally;
}

const cancelRallyStmt = db.prepare("UPDATE rallies SET status = 'cancelled' WHERE id = ?");
function cancelRally(rallyId) {
  cancelRallyStmt.run(rallyId);
}

function cleanupExpiredRallies() {
  const cutoff = Date.now() - 10 * 60 * 1000;
  db.prepare("UPDATE rallies SET status = 'expired' WHERE status = 'active' AND arrival_ms < ?").run(cutoff);
}

module.exports = {
  upsertUser, getUser, getAllUsers, setUserRole, bootstrapAdmin,
  setWosProfile, getRegisteredCallers,
  createRally, getActiveRallies, getRallyWithCallers, getRallyCallers, cancelRally, cleanupExpiredRallies
};
