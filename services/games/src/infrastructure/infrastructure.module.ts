import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ApplicationModule } from '../application/application.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { JwtStrategy } from './auth/jwt.strategy';
import { CqrsBusModule } from './cqrs/cqrs.module';
import { BetsController } from './http/controllers/bets.controller';
import { HealthController } from './http/controllers/health.controller';
import { RoundsController } from './http/controllers/rounds.controller';
import { MessagingModule } from './messaging/messaging.module';
import {
  ROUND_ORCHESTRATOR_CONFIG,
  type RoundOrchestratorConfig,
} from './scheduling/round-orchestrator.config';
import { RoundOrchestrator } from './scheduling/round-orchestrator.service';
import { GameGateway } from './websocket/game.gateway';
import { GAME_BROADCASTER } from './websocket/game.gateway.interface';

const orchestratorConfig: RoundOrchestratorConfig = {
  bettingPhaseMs: Number(process.env.BETTING_PHASE_MS ?? 10_000),
  interRoundGapMs: Number(process.env.INTER_ROUND_GAP_MS ?? 3_000),
  growthRate: Number(process.env.CRASH_GROWTH_RATE ?? 0.06),
  clientSeed: process.env.CRASH_CLIENT_SEED ?? 'btc-block-default',
};

@Module({
  imports: [
    ApplicationModule,
    CqrsBusModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    MessagingModule,
  ],
  controllers: [HealthController, BetsController, RoundsController],
  providers: [
    JwtStrategy,
    JwtAuthGuard,
    GameGateway,
    { provide: GAME_BROADCASTER, useExisting: GameGateway },
    { provide: ROUND_ORCHESTRATOR_CONFIG, useValue: orchestratorConfig },
    RoundOrchestrator,
  ],
  exports: [JwtAuthGuard],
})
export class InfrastructureModule {}
