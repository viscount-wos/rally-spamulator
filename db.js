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

module.exports = { upsertUser, getUser, getAllUsers, setUserRole, bootstrapAdmin };
