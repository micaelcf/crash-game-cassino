import { ApplicationModule } from '@application/application.module'
import { JwtStrategy } from '@infrastructure/auth/jwt.strategy'
import { JwtAuthGuard } from '@infrastructure/auth/jwt-auth.guard'
import { CqrsBusModule } from '@infrastructure/cqrs/cqrs.module'
import { HealthController } from '@infrastructure/http/controllers/health.controller'
import { WalletsController } from '@infrastructure/http/controllers/wallets.controller'
import { MessagingModule } from '@infrastructure/messaging/messaging.module'
import { Module } from '@nestjs/common'
import { PassportModule } from '@nestjs/passport'

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
