import { ApplicationModule } from '@application/application.module'
import { Bet } from '@domain/bet/bet.entity'
import { Round } from '@domain/round/round.entity'
import { JwtStrategy } from '@infrastructure/auth/jwt.strategy'
import { JwtAuthGuard } from '@infrastructure/auth/jwt-auth.guard'
import { CqrsBusModule } from '@infrastructure/cqrs/cqrs.module'
import { BetsController } from '@infrastructure/http/controllers/bets.controller'
import { HealthController } from '@infrastructure/http/controllers/health.controller'
import { RoundsController } from '@infrastructure/http/controllers/rounds.controller'
import { MessagingModule } from '@infrastructure/messaging/messaging.module'
import {
	ROUND_ORCHESTRATOR_CONFIG,
	RoundOrchestratorConfig,
} from '@infrastructure/scheduling/round-orchestrator.config'
import { RoundOrchestrator } from '@infrastructure/scheduling/round-orchestrator.service'
import { WebsocketModule } from '@infrastructure/websocket/websocket.module'
import { MikroOrmModule } from '@mikro-orm/nestjs'
import { Module } from '@nestjs/common'
import { PassportModule } from '@nestjs/passport'

const orchestratorConfig: RoundOrchestratorConfig = {
	bettingPhaseMs: Number(process.env.BETTING_PHASE_MS ?? 10_000),
	interRoundGapMs: Number(process.env.INTER_ROUND_GAP_MS ?? 3_000),
	growthRate: Number(process.env.CRASH_GROWTH_RATE ?? 0.06),
	clientSeed: process.env.CRASH_CLIENT_SEED ?? 'btc-block-default',
}

@Module({
	imports: [
		ApplicationModule,
		CqrsBusModule,
		PassportModule.register({ defaultStrategy: 'jwt' }),
		MessagingModule,
		WebsocketModule,
		MikroOrmModule.forFeature([Round, Bet]),
	],
	controllers: [HealthController, BetsController, RoundsController],
	providers: [
		JwtStrategy,
		JwtAuthGuard,
		{ provide: ROUND_ORCHESTRATOR_CONFIG, useValue: orchestratorConfig },
		RoundOrchestrator,
	],
	exports: [JwtAuthGuard],
})
export class InfrastructureModule {}
