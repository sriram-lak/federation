import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const httpsEnabled = (process.env.ENABLE_HTTPS ?? 'true').toLowerCase() === 'true';
  const certDir = join(__dirname, '..', 'certs');
  const keyPath = join(certDir, 'localhost-key.pem');
  const certPath = join(certDir, 'localhost-cert.pem');

  const httpsOptions =
    httpsEnabled && existsSync(keyPath) && existsSync(certPath)
      ? {
          key: readFileSync(keyPath),
          cert: readFileSync(certPath),
        }
      : undefined;

  if (httpsEnabled && !httpsOptions) {
    console.warn(
      'ENABLE_HTTPS=true but certs missing. Run: npm run cert:https',
    );
  }

  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    httpsOptions ? { httpsOptions } : undefined,
  );
  app.use(json());
  app.use(urlencoded({ extended: true }));
  app.useStaticAssets(join(__dirname, '..', 'public'));
  app.enableCors({ origin: true, credentials: true });

  const port = Number(process.env.PORT ?? 4000);
  const protocol = httpsOptions ? 'https' : 'http';
  const issuer =
    process.env.PUBLIC_ISSUER_URL ?? `${protocol}://localhost:${port}`;

  await app.listen(port);
  console.log(`Local Login OIDC IdP on ${protocol}://localhost:${port}`);
  console.log(`Issuer / discovery base: ${issuer}`);
  console.log(
    `Discovery: ${issuer.replace(/\/$/, '')}/.well-known/openid-configuration`,
  );
}
void bootstrap();
