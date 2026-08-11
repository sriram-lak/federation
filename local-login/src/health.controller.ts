import { Controller, Get, Header } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller()
export class HealthController {
  constructor(private readonly config: ConfigService) {}

  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  home() {
    const issuer = (
      this.config.get('PUBLIC_ISSUER_URL') ?? 'https://gislen-local-login.onrender.com'
    ).replace(/\/$/, '');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Local Login IdP</title>
  <style>
    body { font-family: Segoe UI, system-ui, sans-serif; max-width: 720px; margin: 48px auto; padding: 0 16px; color: #1a1a1a; line-height: 1.5; }
    h1 { margin-bottom: 8px; }
    .ok { color: #0a7a32; font-weight: 600; }
    code, a { word-break: break-all; }
    ul { padding-left: 1.2rem; }
    li { margin: 8px 0; }
  </style>
</head>
<body>
  <h1>Local Login OIDC IdP</h1>
  <p class="ok">Service is running.</p>
  <p>This is the federation identity provider. There is no public app UI at <code>/</code> — use the endpoints below.</p>
  <ul>
    <li><a href="${issuer}/.well-known/openid-configuration">OIDC discovery</a></li>
    <li><a href="${issuer}/jwks">JWKS (signing keys)</a></li>
    <li><a href="${issuer}/authorize">Authorize</a> (used by Entra redirect)</li>
  </ul>
  <p>Issuer: <code>${issuer}</code></p>
</body>
</html>`;
  }

  @Get('health')
  health() {
    const issuer = (
      this.config.get('PUBLIC_ISSUER_URL') ?? 'https://gislen-local-login.onrender.com'
    ).replace(/\/$/, '');
    return {
      status: 'ok',
      service: 'local-login-oidc-idp',
      issuer,
      discovery: `${issuer}/.well-known/openid-configuration`,
      jwks: `${issuer}/jwks`,
    };
  }
}
