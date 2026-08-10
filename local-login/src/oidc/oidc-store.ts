import { Injectable } from '@nestjs/common';

export type OidcAuthCode = {
  code: string;
  clientId: string;
  redirectUri: string;
  sub: string;
  username: string;
  name: string;
  email: string | null;
  nonce?: string;
  scope: string;
  expiresAt: number;
};

@Injectable()
export class OidcStore {
  private readonly codes = new Map<string, OidcAuthCode>();

  saveCode(record: OidcAuthCode): void {
    this.codes.set(record.code, record);
  }

  consumeCode(code: string): OidcAuthCode | null {
    const record = this.codes.get(code);
    if (!record) return null;
    this.codes.delete(code);
    if (Date.now() > record.expiresAt) return null;
    return record;
  }
}
