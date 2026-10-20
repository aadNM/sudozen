/**
 * Preflight check run before `npm run ios` / `npm run android`.
 * Fails if files the native build needs are missing; warns about the rest.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const exists = (f) => fs.existsSync(path.join(root, f));
const platform = process.argv[2]; // 'ios' | 'android' | undefined (both)

const errors = [];
const warnings = [];

if (platform !== 'android' && !exists('GoogleService-Info.plist')) {
  errors.push('GoogleService-Info.plist is missing (iOS). Download it from Firebase. See README "Credentials".');
}
if (platform !== 'ios' && !exists('google-services.json')) {
  errors.push('google-services.json is missing (Android). Download it from Firebase. See README "Credentials".');
}

if (!exists('.env')) {
  warnings.push('.env not found. Run `cp .env.example .env` and fill it in. The app will default to http://127.0.0.1:8090.');
} else {
  const env = fs.readFileSync(path.join(root, '.env'), 'utf8');
  if (!/^EXPO_PUBLIC_PB_URL=\S+/m.test(env)) {
    warnings.push('EXPO_PUBLIC_PB_URL is empty in .env. The app will default to http://127.0.0.1:8090.');
  }
}

const appJson = fs.readFileSync(path.join(root, 'app.json'), 'utf8');
if (appJson.includes('ca-app-pub-0000000000000000')) {
  warnings.push('app.json still has the original AdMob app IDs. Fine for development; replace them before releasing.');
}

warnings.forEach((w) => console.warn(`⚠️  ${w}`));
if (errors.length) {
  errors.forEach((e) => console.error(`❌ ${e}`));
  process.exit(1);
}
