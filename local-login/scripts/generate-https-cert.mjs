import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import selfsigned from 'selfsigned';

const __dirname = dirname(fileURLToPath(import.meta.url));
const certDir = join(__dirname, '..', 'certs');
const keyPath = join(certDir, 'localhost-key.pem');
const certPath = join(certDir, 'localhost-cert.pem');

if (existsSync(keyPath) && existsSync(certPath)) {
  console.log('HTTPS certs already exist in federation/local-login/certs');
  process.exit(0);
}

mkdirSync(certDir, { recursive: true });

const pems = await selfsigned.generate([{ name: 'commonName', value: 'localhost' }], {
  days: 365,
  keySize: 2048,
  algorithm: 'sha256',
  extensions: [
    {
      name: 'subjectAltName',
      altNames: [
        { type: 2, value: 'localhost' },
        { type: 7, ip: '127.0.0.1' },
      ],
    },
  ],
});

writeFileSync(keyPath, pems.private);
writeFileSync(certPath, pems.cert);
console.log('Created HTTPS certs:');
console.log(`  ${keyPath}`);
console.log(`  ${certPath}`);
