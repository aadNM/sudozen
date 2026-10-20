/**
 * Creates the PocketBase collections SudoZen expects and (optionally) configures SMTP2GO
 * as the mail server, so verification and password-reset emails work.
 *
 * Usage: npm run pb:setup     (reads values from .env, see .env.example)
 *
 * Safe to re-run: existing collections are left untouched.
 * Requires PocketBase v0.23 or newer.
 */
const fs = require('fs');
const path = require('path');
const PocketBase = require('pocketbase/cjs');

// Minimal .env loader (no extra dependency)
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  }
}

const env = (key, fallback = '') => process.env[key] || fallback;

const PB_URL = env('PB_URL', env('EXPO_PUBLIC_PB_URL', 'http://127.0.0.1:8090'));
const SUPERUSER_EMAIL = env('PB_SUPERUSER_EMAIL');
const SUPERUSER_PASSWORD = env('PB_SUPERUSER_PASSWORD');

const DIFFICULTIES = ['Easy', 'Medium', 'Hard', 'Extreme'];
const AUTH_ONLY = '@request.auth.id != ""';

const autodateFields = [
  { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
  { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
];

const puzzleCollection = (name) => ({
  name,
  type: 'base',
  // Anyone can read puzzles; signed-in players can add generated ones.
  listRule: '',
  viewRule: '',
  createRule: AUTH_ONLY,
  updateRule: null,
  deleteRule: null,
  fields: [
    { name: 'board', type: 'json', required: true },
    { name: 'solution', type: 'json', required: true },
    { name: 'difficulty', type: 'select', required: true, maxSelect: 1, values: DIFFICULTIES },
    { name: 'hash', type: 'text' },
    ...autodateFields,
  ],
  indexes: [`CREATE INDEX idx_${name}_difficulty ON ${name} (difficulty)`],
});

async function ensureCollection(pb, def) {
  try {
    const existing = await pb.collections.getOne(def.name);
    console.log(`  = ${def.name} already exists, skipping`);
    return existing;
  } catch (err) {
    if (err.status !== 404) throw err;
  }
  const created = await pb.collections.create(def);
  console.log(`  + created ${def.name}`);
  return created;
}

async function setupCollections(pb) {
  console.log('Collections:');
  const puzzles = await ensureCollection(pb, puzzleCollection('puzzles'));
  const dailies = await ensureCollection(pb, puzzleCollection('daily_puzzles'));

  const players = await ensureCollection(pb, {
    name: 'players',
    type: 'auth',
    // Leaderboards and sign-up checks read player records; players edit/delete only themselves.
    listRule: '',
    viewRule: '',
    createRule: '',
    updateRule: 'id = @request.auth.id',
    deleteRule: 'id = @request.auth.id',
    passwordAuth: { enabled: true, identityFields: ['email'] },
    fields: [
      { name: 'username', type: 'text', required: true, min: 3, max: 30 },
      { name: 'country', type: 'text' },
      { name: 'highest_score', type: 'number' },
      { name: 'solved_puzzles', type: 'relation', collectionId: puzzles.id, maxSelect: 999999 },
      { name: 'solved_dailies', type: 'relation', collectionId: dailies.id, maxSelect: 999999 },
      { name: 'solved_hashes', type: 'json' },
      { name: 'last_login', type: 'date' },
      ...autodateFields,
    ],
    indexes: ['CREATE UNIQUE INDEX idx_players_username ON players (username)'],
  });

  await ensureCollection(pb, {
    name: 'scores',
    type: 'base',
    // Public leaderboard; players create and delete only their own scores.
    listRule: '',
    viewRule: '',
    createRule: `${AUTH_ONLY} && @request.body.player_id = @request.auth.id`,
    updateRule: null,
    deleteRule: 'player_id = @request.auth.id',
    fields: [
      { name: 'player_id', type: 'relation', required: true, collectionId: players.id, maxSelect: 1, cascadeDelete: true },
      { name: 'score', type: 'number', required: true },
      { name: 'difficulty', type: 'select', required: true, maxSelect: 1, values: DIFFICULTIES },
      { name: 'time', type: 'text', required: true },
      { name: 'puzzle_id', type: 'relation', collectionId: puzzles.id, maxSelect: 1 },
      { name: 'is_daily_challenge', type: 'bool' },
      ...autodateFields,
    ],
    indexes: ['CREATE INDEX idx_scores_player ON scores (player_id)'],
  });
}

async function setupSmtp(pb) {
  const username = env('SMTP2GO_USERNAME');
  const password = env('SMTP2GO_PASSWORD');
  const senderAddress = env('MAIL_SENDER_ADDRESS');

  if (!username || !password || !senderAddress) {
    console.log('SMTP: SMTP2GO_USERNAME / SMTP2GO_PASSWORD / MAIL_SENDER_ADDRESS not set, skipping.');
    console.log('      Verification and password-reset emails will not be sent until SMTP is configured.');
    return;
  }

  await pb.settings.update({
    meta: {
      appName: env('MAIL_SENDER_NAME', 'SudoZen'),
      appURL: PB_URL,
      senderName: env('MAIL_SENDER_NAME', 'SudoZen'),
      senderAddress,
    },
    smtp: {
      enabled: true,
      host: env('SMTP2GO_HOST', 'mail.smtp2go.com'),
      // 2525 with STARTTLS; set SMTP2GO_PORT=465 for implicit TLS.
      port: Number(env('SMTP2GO_PORT', '2525')),
      tls: env('SMTP2GO_PORT', '2525') === '465',
      authMethod: 'PLAIN',
      username,
      password,
    },
  });
  console.log(`SMTP: configured SMTP2GO, sending as ${senderAddress}`);

  const testTo = env('SMTP_TEST_TO');
  if (testTo) {
    await pb.settings.testEmail('players', testTo, 'verification');
    console.log(`SMTP: test email sent to ${testTo}`);
  }
}

async function main() {
  if (!SUPERUSER_EMAIL || !SUPERUSER_PASSWORD) {
    console.error('Set PB_SUPERUSER_EMAIL and PB_SUPERUSER_PASSWORD in .env (see .env.example).');
    process.exit(1);
  }

  const pb = new PocketBase(PB_URL);
  console.log(`PocketBase: ${PB_URL}`);
  await pb.collection('_superusers').authWithPassword(SUPERUSER_EMAIL, SUPERUSER_PASSWORD);

  await setupCollections(pb);
  await setupSmtp(pb);
  console.log('Done.');
}

main().catch((err) => {
  console.error('Setup failed:', err?.response ?? err);
  process.exit(1);
});
