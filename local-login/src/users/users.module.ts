import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocalUser } from './local-user.entity';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([LocalUser])],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
