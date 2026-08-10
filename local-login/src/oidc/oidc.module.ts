import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { DiscoveryController } from './discovery.controller';
import { OidcController } from './oidc.controller';
import { OidcKeysService } from './oidc-keys.service';
import { OidcService } from './oidc.service';
import { OidcStore } from './oidc-store';

@Module({
  imports: [UsersModule],
  controllers: [OidcController, DiscoveryController],
  providers: [OidcService, OidcKeysService, OidcStore],
})
export class OidcModule {}
