import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { LocalUser } from './local-user.entity';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectRepository(LocalUser)
    private readonly usersRepository: Repository<LocalUser>,
  ) {}

  async onModuleInit(): Promise<void> {
    const count = await this.usersRepository.count();
    if (count > 0) return;

    const seeds = [
      { username: 'alice', password: 'Password123!', displayName: 'Alice Admin', email: 'alice@local.test' },
      { username: 'bob', password: 'Password123!', displayName: 'Bob User', email: 'bob@local.test' },
    ];

    for (const seed of seeds) {
      const user = this.usersRepository.create({
        username: seed.username,
        displayName: seed.displayName,
        email: seed.email,
        passwordHash: await bcrypt.hash(seed.password, 10),
      });
      await this.usersRepository.save(user);
    }

    console.log('Seeded local users: alice / bob (password: Password123!)');
  }

  findByUsername(username: string): Promise<LocalUser | null> {
    return this.usersRepository.findOne({ where: { username } });
  }

  async validate(username: string, password: string): Promise<LocalUser | null> {
    const user = await this.findByUsername(username);
    if (!user) return null;
    const ok = await bcrypt.compare(password, user.passwordHash);
    return ok ? user : null;
  }
}
