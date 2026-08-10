import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { UsersService } from '../users/users.service';
import { OidcKeysService } from './oidc-keys.service';
import { OidcStore } from './oidc-store';

type OidcClient = {
  clientId: string;
  clientSecret: string;
  redirectUris: string[];
};

@Injectable()
export class OidcService {
  constructor(
    private readonly config: ConfigService,
    private readonly usersService: UsersService,
    private readonly keys: OidcKeysService,
    private readonly store: OidcStore,
  ) {}

  getIssuer(): string {
    return this.config.getOrThrow<string>('PUBLIC_ISSUER_URL').replace(/\/$/, '');
  }

  getDiscovery() {
    const issuer = this.getIssuer();
    return {
      issuer,
      authorization_endpoint: `${issuer}/authorize`,
      token_endpoint: `${issuer}/token`,
      jwks_uri: `${issuer}/jwks`,
      userinfo_endpoint: `${issuer}/userinfo`,
      response_types_supported: ['code'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256'],
      scopes_supported: ['openid', 'profile', 'email'],
      token_endpoint_auth_methods_supported: [
        'client_secret_post',
        'client_secret_basic',
      ],
      claims_supported: [
        'sub',
        'iss',
        'aud',
        'exp',
        'iat',
        'nonce',
        'preferred_username',
        'name',
        'email',
      ],
    };
  }

  getClients(): OidcClient[] {
    const entraRedirects = (this.config.get<string>('ENTRA_OIDC_REDIRECT_URIS') ?? '')
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);

    const clients: OidcClient[] = [
      {
        clientId: this.config.getOrThrow('ENTRA_OIDC_CLIENT_ID'),
        clientSecret: this.config.getOrThrow('ENTRA_OIDC_CLIENT_SECRET'),
        redirectUris: entraRedirects.length
          ? entraRedirects
          : ['https://login.microsoftonline.com/common/oauth2/login'],
      },
    ];

    const brokerId = this.config.get<string>('BROKER_CLIENT_ID');
    const brokerSecret = this.config.get<string>('BROKER_CLIENT_SECRET');
    const brokerRedirect = this.config.get<string>('BROKER_REDIRECT_URI');
    if (brokerId && brokerSecret && brokerRedirect) {
      clients.push({
        clientId: brokerId,
        clientSecret: brokerSecret,
        redirectUris: [brokerRedirect],
      });
    }

    return clients;
  }

  getClient(clientId: string): OidcClient {
    const client = this.getClients().find((item) => item.clientId === clientId);
    if (!client) throw new BadRequestException('invalid_client');
    return client;
  }

  assertAuthorizeRequest(input: {
    clientId: string;
    redirectUri: string;
    responseType: string;
    scope?: string;
  }) {
    if (input.responseType !== 'code') {
      throw new BadRequestException('unsupported_response_type');
    }
    const client = this.getClient(input.clientId);
    if (!client.redirectUris.includes(input.redirectUri)) {
      throw new BadRequestException('invalid_redirect_uri');
    }
    const scope = input.scope ?? 'openid profile email';
    if (!scope.split(/\s+/).includes('openid')) {
      throw new BadRequestException('openid scope required');
    }
    return { client, scope };
  }

  async loginAndIssueCode(input: {
    username: string;
    password: string;
    clientId: string;
    redirectUri: string;
    state: string;
    nonce?: string;
    scope: string;
  }): Promise<string> {
    this.assertAuthorizeRequest({
      clientId: input.clientId,
      redirectUri: input.redirectUri,
      responseType: 'code',
      scope: input.scope,
    });

    const user = await this.usersService.validate(input.username, input.password);
    if (!user) {
      throw new UnauthorizedException('invalid_credentials');
    }

    const code = randomUUID();
    this.store.saveCode({
      code,
      clientId: input.clientId,
      redirectUri: input.redirectUri,
      sub: user.id,
      username: user.username,
      name: user.displayName,
      email: user.email,
      nonce: input.nonce,
      scope: input.scope,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    const target = new URL(input.redirectUri);
    target.searchParams.set('code', code);
    target.searchParams.set('state', input.state);
    return target.toString();
  }

  async exchangeToken(input: {
    grantType?: string;
    code?: string;
    redirectUri?: string;
    clientId?: string;
    clientSecret?: string;
    authorizationHeader?: string;
  }) {
    if (input.grantType !== 'authorization_code') {
      throw new BadRequestException('unsupported_grant_type');
    }

    let clientId = input.clientId ?? '';
    let clientSecret = input.clientSecret ?? '';

    if ((!clientId || !clientSecret) && input.authorizationHeader?.startsWith('Basic ')) {
      const decoded = Buffer.from(input.authorizationHeader.slice(6), 'base64').toString(
        'utf8',
      );
      const [id, secret] = decoded.split(':');
      clientId = id;
      clientSecret = secret;
    }

    const client = this.getClient(clientId);
    if (client.clientSecret !== clientSecret) {
      throw new UnauthorizedException('invalid_client');
    }

    const record = this.store.consumeCode(input.code ?? '');
    if (
      !record ||
      record.clientId !== clientId ||
      record.redirectUri !== input.redirectUri
    ) {
      throw new UnauthorizedException('invalid_grant');
    }

    const issuer = this.getIssuer();
    const idToken = await this.keys.signIdToken({
      issuer,
      subject: record.sub,
      audience: clientId,
      nonce: record.nonce,
      preferred_username: record.username,
      name: record.name,
      email: record.email,
    });

    const accessToken = await this.keys.signIdToken({
      issuer,
      subject: record.sub,
      audience: clientId,
      scope: record.scope,
      preferred_username: record.username,
      name: record.name,
      email: record.email,
      token_use: 'access',
    });

    return {
      access_token: accessToken,
      id_token: idToken,
      token_type: 'Bearer',
      expires_in: 3600,
      scope: record.scope,
    };
  }
}
