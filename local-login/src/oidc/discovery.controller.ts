import { Controller, Get } from '@nestjs/common';
import { OidcService } from './oidc.service';

@Controller('.well-known')
export class DiscoveryController {
  constructor(private readonly oidc: OidcService) {}

  @Get('openid-configuration')
  discovery() {
    return this.oidc.getDiscovery();
  }
}
