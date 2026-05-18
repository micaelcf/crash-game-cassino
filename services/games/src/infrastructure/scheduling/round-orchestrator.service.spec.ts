import { Bet, BetStatus } from '@domain/bet/bet.entity'
import type { ProvablyFairService } from '@domain/round/provably-fair.service'
import { Round, RoundStatus } from '@domain/round/round.entity'
import type { BaseRepository } from '@infrastructure/db/base.repository'
import type { EventPublisher } from '@infrastructure/messaging/outbox/event-publisher.service'
import { GameMetrics } from '@infrastructure/observability/game-metrics'
import { RoundOrchestrator } from '@infrastructure/scheduling/round-orchestrator.service'
import type { GameBroadcaster } from '@infrastructure/websocket/game.gateway.interface'
import type { EntityManager, MikroORM } from '@mikro-orm/core'
import { Registry } from 'prom-client'
import {
	afterAll,
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from 'vitest'

type RoundRepo = BaseRepository<Round>
type BetRepo = BaseRepository<Bet>
type EventRecord = { eventType: string; payload: Record<string, unknown> }

const fakeProvablyFair: ProvablyFairService = {
	crashPointHundredths: () => 200,
	commitment: (s: string) => `sha-${s}`,
	verifyCommitment: (s: string, c: string) => `sha-${s}` === c,
} as unknown as ProvablyFairService

const makeBroadcaster = (): GameBroadcaster => ({
	emitRoundBetting: vi.fn(),
	emitRoundStarted: vi.fn(),
	emitRoundCrashed: vi.fn(),
	emitBetPlaced: vi.fn(),
	emitBetCashedOut: vi.fn(),
	emitBetCancelled: vi.fn(),
})

const stubRound = (data: Partial<Round>): Round => {
	const r = Object.create(Round.prototype) as Round
	Object.assign(r, {
		id: crypto.randomUUID(),
		serverSeed: null,
		flyingStartedAt: null,
		crashedAt: null,
		pendingServerSeed: null,
		...data,
	})
	return r
}

interface OrchestratorCtx {
	state: {
		rounds: Round[]
		bets: Bet[]
		published: EventRecord[]
	}
	rounds: RoundRepo
	bets: BetRepo
	events: EventPublisher
}

const makeCtx = (): OrchestratorCtx => {
	const state: OrchestratorCtx['state'] = {
		rounds: [],
		bets: [],
		published: [],
	}
	const rounds = {
		create: vi.fn((data: Partial<Round>) => {
			const r = stubRound({
				status: RoundStatus.BETTING_PHASE,
				createdAt: new Date(),
				...data,
			})
			state.rounds.push(r)
			return r
		}),
		findOne: vi.fn(
			async (where: { id: string }) =>
				state.rounds.find((r) => r.id === where.id) ?? null,
		),
		flush: vi.fn().mockResolvedValue(undefined),
	} as unknown as RoundRepo
	const bets = {
		find: vi.fn(async (where: { roundId?: string; status?: BetStatus }) =>
			state.bets.filter(
				(b) =>
					(!where.roundId || b.roundId === where.roundId) &&
					(!where.status || b.status === where.status),
			),
		),
		flush: vi.fn().mockResolvedValue(undefined),
	} as unknown as BetRepo
	const events = {
		publish: vi.fn(
			(
				eventType: string,
				_at: string,
				_aid: string,
				payload: Record<string, unknown>,
			) => {
				state.published.push({ eventType, payload })
			},
		),
	} as unknown as EventPublisher
	return { state, rounds, bets, events }
}

const config = {
	bettingPhaseMs: 10_000,
	interRoundGapMs: 3_000,
	growthRate: 0.06,
	clientSeed: 'client-x',
}

const fakeOrm = { em: {} as EntityManager } as unknown as MikroORM

const buildOrchestrator = (
	ctx: OrchestratorCtx,
	broadcaster: GameBroadcaster,
	metrics: GameMetrics = new GameMetrics(new Registry()),
) =>
	new RoundOrchestrator(
		fakeOrm,
		ctx.rounds,
		ctx.bets,
		ctx.events,
		fakeProvablyFair,
		broadcaster,
		config,
		metrics,
	)

import { RequestContext } from '@mikro-orm/core'

const originalCreate = RequestContext.create
RequestContext.create = ((_em: EntityManager, next: () => unknown): unknown =>
	next()) as typeof RequestContext.create

describe('RoundOrchestrator', () => {
	beforeEach(() => {
		vi.useFakeTimers({ shouldAdvanceTime: false })
		vi.setSystemTime(new Date(1_000_000))
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it('opens a Round in BETTING_PHASE on start and broadcasts round.betting', async () => {
		const ctx = makeCtx()
		const broadcaster = makeBroadcaster()
		const orch = buildOrchestrator(ctx, broadcaster)

		await orch.start()

		expect(ctx.state.rounds).toHaveLength(1)
		const round = ctx.state.rounds[0]
		expect(round.status).toBe(RoundStatus.BETTING_PHASE)
		expect(round.crashPointHundredths).toBe(200)
		expect(round.serverSeedHash.startsWith('sha-')).toBe(true)
		expect(broadcaster.emitRoundBetting).toHaveBeenCalledWith(
			expect.objectContaining({
				roundId: round.id,
				hashCommitment: round.serverSeedHash,
			}),
		)
	})

	it('transitions to FLYING after the betting phase elapses', async () => {
		const ctx = makeCtx()
		const broadcaster = makeBroadcaster()
		const orch = buildOrchestrator(ctx, broadcaster)

		await orch.start()
		await vi.advanceTimersByTimeAsync(10_000)

		expect(ctx.state.rounds[0].status).toBe(RoundStatus.FLYING)
		expect(broadcaster.emitRoundStarted).toHaveBeenCalledOnce()
	})

	it('crashes at t = ln(M)/k seconds and reveals the server seed', async () => {
		const ctx = makeCtx()
		const broadcaster = makeBroadcaster()
		const orch = buildOrchestrator(ctx, broadcaster)

		await orch.start()
		await vi.advanceTimersByTimeAsync(10_000)
		await vi.advanceTimersByTimeAsync(11_600)

		const round = ctx.state.rounds[0]
		expect(round.status).toBe(RoundStatus.CRASHED)
		expect(round.serverSeed).not.toBeNull()
		expect(broadcaster.emitRoundCrashed).toHaveBeenCalledOnce()
	})

	it('marks confirmed bets as LOST when the round crashes', async () => {
		const ctx = makeCtx()
		const broadcaster = makeBroadcaster()
		const registry = new Registry()
		const metrics = new GameMetrics(registry)
		const orch = buildOrchestrator(ctx, broadcaster, metrics)

		await orch.start()
		const round = ctx.state.rounds[0]
		const bet = Object.create(Bet.prototype) as Bet
		Object.assign(bet, {
			id: crypto.randomUUID(),
			roundId: round.id,
			userId: 'u-1',
			username: 'alice',
			amountCents: 1000n,
			status: BetStatus.CONFIRMED,
			cashoutMultiplierHundredths: null,
			payoutCents: null,
			cancellationReason: null,
			createdAt: new Date(),
			updatedAt: new Date(),
		})
		ctx.state.bets.push(bet)

		await vi.advanceTimersByTimeAsync(10_000)
		await vi.advanceTimersByTimeAsync(11_600)

		expect(bet.status).toBe(BetStatus.LOST)

		const total = await registry.getSingleMetric('crash_bets_total')?.get()
		const lost = total?.values.find(
			(v) => (v.labels as { status?: string }).status === 'lost',
		)
		expect(lost?.value).toBe(1)
	})

	it('opens a new round after the inter-round gap', async () => {
		const ctx = makeCtx()
		const broadcaster = makeBroadcaster()
		const orch = buildOrchestrator(ctx, broadcaster)

		await orch.start()
		await vi.advanceTimersByTimeAsync(10_000)
		await vi.advanceTimersByTimeAsync(11_600)
		await vi.advanceTimersByTimeAsync(3_000)

		expect(ctx.state.rounds).toHaveLength(2)
		expect(ctx.state.rounds[1].status).toBe(RoundStatus.BETTING_PHASE)
	})

	it('stop() cancels pending timers', async () => {
		const ctx = makeCtx()
		const broadcaster = makeBroadcaster()
		const orch = buildOrchestrator(ctx, broadcaster)

		await orch.start()
		orch.stop()
		await vi.advanceTimersByTimeAsync(60_000)

		expect(ctx.state.rounds[0].status).toBe(RoundStatus.BETTING_PHASE)
	})
})

afterAll(() => {
	RequestContext.create = originalCreate
})
