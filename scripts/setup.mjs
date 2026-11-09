import { randomBytes, scryptSync } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
if (existsSync('.env.local')) { console.log('.env.local já existe. Nenhuma alteração feita.'); process.exit(0); }
const password = randomBytes(12).toString('base64url');
const salt = randomBytes(16).toString('hex');
const hash = salt + ':' + scryptSync(password, salt, 64).toString('hex');
writeFileSync('.env.local', `DEMO_MODE=true\nSESSION_SECRET=${randomBytes(32).toString('hex')}\nMANAGER_EMAIL=gestor@dellas.local\nMANAGER_PASSWORD_HASH=${hash}\nWHATSAPP_LIVE=false\n`);
console.log('Configuração local criada. Guarde estas credenciais:');
console.log('E-mail: gestor@dellas.local');
console.log('Senha: ' + password);
console.log('Use o mesmo hash e segredo nas variáveis da Vercel. Não compartilhe .env.local.');
