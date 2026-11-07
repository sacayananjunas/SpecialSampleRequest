// Runs before `npm run dev` and `npm run db:setup`.
// - creates .env from .env.example if needed
// - generates a strong JWT_SECRET if it is empty
// - stops with clear instructions if DATABASE_URL is empty
import { existsSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

const ENV = new URL('../.env', import.meta.url);
const EXAMPLE = new URL('../.env.example', import.meta.url);

if (!existsSync(ENV)) copyFileSync(EXAMPLE, ENV);
let text = readFileSync(ENV, 'utf8');
const get = (k) => (text.match(new RegExp(`^${k}=(.*)$`, 'm'))?.[1] ?? '').trim().replace(/^["']|["']$/g, '');

if (!get('JWT_SECRET')) {
  const secret = randomBytes(48).toString('base64url');
  text = /^JWT_SECRET=.*$/m.test(text) ? text.replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${secret}`) : `${text.trimEnd()}\nJWT_SECRET=${secret}\n`;
  writeFileSync(ENV, text);
  console.log('✔ Generated a strong random JWT_SECRET and saved it to .env');
}

if (!get('DATABASE_URL')) {
  console.error(`
✖ DATABASE_URL is missing in .env, so PetroSync can't reach its database yet.

  Get it from Neon (free):
    1. Open https://console.neon.tech and sign in (or create a free account).
    2. Create a project (any name, e.g. "petrosync"), or open an existing one.
    3. On the project dashboard, click the "Connect" button (top right).
    4. In the dialog keep: Branch = main, Database = neondb, Role = neondb_owner.
       Leave "Connection pooling" switched ON.
    5. Click "Show password", then copy the whole connection string.
       It looks like: postgresql://neondb_owner:...@ep-xxxx-pooler.region.aws.neon.tech/neondb?sslmode=require
    6. Paste it into the .env file in this folder:
       DATABASE_URL=postgresql://neondb_owner:...

  Then run:  npm run db:setup   (creates the tables + sample data)
  And then:  npm run dev
`);
  process.exit(1);
}
