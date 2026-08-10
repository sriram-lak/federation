import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  exportJWK,
  generateKeyPair,
  SignJWT,
  type JWK,
} from 'jose';

type SignClaims = {
  issuer: string;
  subject: string;
  audience: string;
  nonce?: string;
  preferred_username?: string;
  name?: string;
  email?: string | null;
  scope?: string;
  token_use?: string;
};

type PrivateKey = Awaited<ReturnType<typeof generateKeyPair>>['privateKey'];

@Injectable()
export class OidcKeysService implements OnModuleInit {
  private privateKey!: PrivateKey;
  private publicJwk!: JWK;
  readonly kid = 'local-login-oidc-1';

  async onModuleInit(): Promise<void> {
    const { privateKey, publicKey } = await generateKeyPair('RS256', {
      extractable: true,
    });
    this.privateKey = privateKey;
    const jwk = await exportJWK(publicKey);
    this.publicJwk = {
      ...jwk,
      kid: this.kid,
      use: 'sig',
      alg: 'RS256',
    };
  }

  getJwks() {
    return { keys: [this.publicJwk] };
  }

  async signIdToken(claims: SignClaims, expiresInSec = 3600): Promise<string> {
    const { issuer, subject, audience, nonce, ...rest } = claims;
    const jwt = new SignJWT({
      ...rest,
      ...(nonce ? { nonce } : {}),
    })
      .setProtectedHeader({ alg: 'RS256', kid: this.kid, typ: 'JWT' })
      .setIssuer(issuer)
      .setSubject(subject)
      .setAudience(audience)
      .setIssuedAt()
      .setExpirationTime(`${expiresInSec}s`);

    return jwt.sign(this.privateKey);
  }
}
