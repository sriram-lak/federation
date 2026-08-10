import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import { OidcKeysService } from './oidc-keys.service';
import { OidcService } from './oidc.service';

@Controller()
export class OidcController {
  constructor(
    private readonly oidc: OidcService,
    private readonly keys: OidcKeysService,
  ) {}

  @Get('jwks')
  jwks() {
    return this.keys.getJwks();
  }

  @Get('authorize')
  authorize(
    @Query('client_id') clientId: string,
    @Query('redirect_uri') redirectUri: string,
    @Query('response_type') responseType: string,
    @Query('scope') scope: string,
    @Query('state') state: string,
    @Query('nonce') nonce: string,
    @Res() res: Response,
  ) {
    this.oidc.assertAuthorizeRequest({
      clientId,
      redirectUri,
      responseType: responseType || 'code',
      scope,
    });
    if (!state) {
      return res.status(400).send('state is required');
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: responseType || 'code',
      scope: scope || 'openid profile email',
      state,
    });
    if (nonce) params.set('nonce', nonce);
    return res.redirect(`/login.html?${params.toString()}`);
  }

  @Post('login')
  async login(
    @Body()
    body: {
      username?: string;
      password?: string;
      client_id?: string;
      redirect_uri?: string;
      response_type?: string;
      scope?: string;
      state?: string;
      nonce?: string;
    },
    @Res() res: Response,
  ) {
    try {
      const redirectTo = await this.oidc.loginAndIssueCode({
        username: body.username ?? '',
        password: body.password ?? '',
        clientId: body.client_id ?? '',
        redirectUri: body.redirect_uri ?? '',
        state: body.state ?? '',
        nonce: body.nonce,
        scope: body.scope || 'openid profile email',
      });
      return res.redirect(redirectTo);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        const params = new URLSearchParams({
          client_id: body.client_id ?? '',
          redirect_uri: body.redirect_uri ?? '',
          response_type: body.response_type || 'code',
          scope: body.scope || 'openid profile email',
          state: body.state ?? '',
          error: 'Invalid username or password',
        });
        if (body.nonce) params.set('nonce', body.nonce);
        return res.redirect(`/login.html?${params.toString()}`);
      }
      throw error;
    }
  }

  @Post('token')
  token(
    @Body()
    body: {
      grant_type?: string;
      code?: string;
      redirect_uri?: string;
      client_id?: string;
      client_secret?: string;
    },
    @Headers('authorization') authorization?: string,
  ) {
    return this.oidc.exchangeToken({
      grantType: body.grant_type,
      code: body.code,
      redirectUri: body.redirect_uri,
      clientId: body.client_id,
      clientSecret: body.client_secret,
      authorizationHeader: authorization,
    });
  }
}
