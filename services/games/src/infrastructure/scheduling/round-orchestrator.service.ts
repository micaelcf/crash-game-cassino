import { randomBytes } from 'node:crypto'
import { MikroORM, RequestContext } from '@mikro-orm/core'
import { InjectRepository } from '@mikro-orm/nestjs'
import {
	Inject,
	Injectable,
	Logger,
	type OnModuleDestroy,
	type OnModuleInit,
} from '@nestjs/common'
import { Bet, BetStatus } from '../../domain/bet/bet.entity'
import { ProvablyFairService } from '../../domain/round/provably-fair.service'
import { Round, RoundStatus } from '../../domain/round/round.entity'
import { BaseRepository } from '../db/base.repository'
import { EventPublisher } from '../messaging/outbox/event-publisher.service'
import {
	GAME_BROADCASTER,
	type GameBroadcaster,
} from '../websocket/game.gateway.interface'
import {
	ROUND_ORCHESTRATOR_CONFIG,
	type RoundOrchestratorConfig,
} from './round-orchestrator.config'

@Injectable()
export class RoundOrchestrator implements OnModuleInit, OnModuleDestroy {
	private readonly logger = new Logger(RoundOrchestrator.name)
	private timers: NodeJS.Timeout[] = []
	private currentNonce = 0
	private seedCache = new Map<string, string>()

	constructor(
		private readonly orm: MikroORM,
		@InjectRepository(Round)
		private readonly rounds: BaseRepository<Round>,
		@InjectRepository(Bet)
		private readonly bets: BaseRepository<Bet>,
		private readonly events: EventPublisher,
		private readonly provablyFair: ProvablyFairService,
		@Inject(GAME_BROADCASTER) private readonly broadcaster: GameBroadcaster,
		@Inject(ROUND_ORCHESTRATOR_CONFIG)
		private readonly config: RoundOrchestratorConfig,
	) {}

	async onModuleInit(): Promise<void> {
		await this.start()
	}

	onModuleDestroy(): void {
		this.stop()
	}

	async start(): Promise<void> {
		await this.withContext(() => this.openBettingPhase())
	}

	stop(): void {
		for (const t of this.timers) clearTimeout(t)
		this.timers = []
	}

	private withContext<T>(fn: () => Promise<T>): Promise<T> {
		return RequestContext.create(this.orm.em, fn)
	}

	private schedule(fn: () => Promise<void> | void, ms: number): void {
		const t = setTimeout(async () => {
			try {
				await this.withContext(() => Promise.resolve(fn()))
			} catch (err) {
				this.logger.error('scheduled task failed', err as Error)
			}
		}, ms)
		this.timers.push(t)
	}

	private async openBettingPhase(): Promise<void> {
		const serverSeed = randomBytes(32).toString('hex')
		const hashCommitment = this.provablyFair.commitment(serverSeed)
		const crashPointHundredths = this.provablyFair.crashPointHundredths(
			serverSeed,
			this.config.clientSeed,
		)

		this.currentNonce += 1
		const now = new Date()
		const round = this.rounds.create({
			nonce: this.currentNonce,
			serverSeedHash: hashCommitment,
			clientSeed: this.config.clientSeed,
			crashPointHundredths,
			growthRate: this.config.growthRate,
			bettingEndsAt: new Date(now.getTime() + this.config.bettingPhaseMs),
		})
		round.pendingServerSeed = serverSeed
		this.seedCache.set(round.id, serverSeed)

		await this.rounds.flush()

		this.broadcaster.emitRoundBetting({
			roundId: round.id,
			hashCommitment,
			bettingEndsAt: round.bettingEndsAt.toISOString(),
		})

		this.schedule(() => this.startFlight(round.id), this.config.bettingPhaseMs)
	}

	private async startFlight(roundId: string): Promise<void> {
		const round = await this.rounds.findOne({ id: roundId })
		if (!round || round.status !== RoundStatus.BETTING_PHASE) {
			this.schedule(
				() => this.openBettingPhase(),
				this.config.interRoundGapMs,
			)
			return
		}
		const now = new Date()
		round.startFlight(now)
		await this.rounds.flush()

		this.broadcaster.emitRoundStarted({
			roundId: round.id,
			startTime: now.toISOString(),
			growthRate: this.config.growthRate,
		})

		const crashMultiplier = round.crashPointHundredths / 100
		const crashAtMs = Math.max(
			0,
			(Math.log(crashMultiplier) / this.config.growthRate) * 1000,
		)
		this.schedule(() => this.crashRound(round.id), crashAtMs)
	}

	private async crashRound(roundId: string): Promise<void> {
		const round = await this.rounds.findOne({ id: roundId })
		if (!round || round.status !== RoundStatus.FLYING) {
			this.schedule(
				() => this.openBettingPhase(),
				this.config.interRoundGapMs,
			)
			return
		}
		const now = new Date()
		const serverSeed = this.seedCache.get(round.id) ?? ''
		round.crash(now, serverSeed)
		this.seedCache.delete(round.id)

		const confirmed = await this.bets.find({
			roundId: round.id,
			status: BetStatus.CONFIRMED,
		})
		for (const bet of confirmed) {
			bet.markLost()
		}

		this.events.publish('round.crashed', 'Round', round.id, {
			roundId: round.id,
			crashPointHundredths: round.crashPointHundredths,
			nonce: round.nonce,
			serverSeed,
			clientSeed: round.clientSeed,
		})

		await this.rounds.flush()

		this.broadcaster.emitRoundCrashed({
			roundId: round.id,
			crashPointHundredths: round.crashPointHundredths,
			serverSeed,
			clientSeed: round.clientSeed,
			nonce: round.nonce,
		})

		this.schedule(() => this.openBettingPhase(), this.config.interRoundGapMs)
	}
}
