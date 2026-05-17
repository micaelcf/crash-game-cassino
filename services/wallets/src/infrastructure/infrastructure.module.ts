import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ApplicationModule } from '../application/application.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { JwtStrategy } from './auth/jwt.strategy';
import { CqrsBusModule } from './cqrs/cqrs.module';
import { HealthController } from './http/controllers/health.controller';
import { WalletsController } from './http/controllers/wallets.controller';
import { MessagingModule } from './messaging/messaging.module';

@Module({
  imports: [
    ApplicationModule,
    CqrsBusModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    MessagingModule,
  ],
  controllers: [HealthController, WalletsController],
  providers: [JwtStrategy, JwtAuthGuard],
  exports: [JwtAuthGuard],
})
export class InfrastructureModule {}
