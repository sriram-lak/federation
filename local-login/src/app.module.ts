import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';
import { OidcModule } from './oidc/oidc.module';
import { LocalUser } from './users/local-user.entity';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: Number(config.get('DB_PORT', '5432')),
        username: config.get('DB_USERNAME', 'postgres'),
        password: config.get('DB_PASSWORD', 'postgres'),
        database: config.get('DB_NAME', 'federation_local_login'),
        entities: [LocalUser],
        synchronize: config.get('DB_SYNC', 'true') === 'true',
      }),
    }),
    UsersModule,
    OidcModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
