import { PlaceBetCommand } from '@application/bet/dtos/place-bet.command'
import { PlaceBetUseCase } from '@application/bet/use-cases/place-bet.use-case'
import { Bet, BetStatus } from '@domain/bet/bet.entity'
import {
	BetAmountOutOfRangeException,
	DuplicateBetException,
} from '@domain/bet/bet.exceptions'
import { Round, RoundStatus } from '@domain/round/round.entity'
import { RoundNotBettingException } from '@domain/round/round.exceptions'
import type { BaseRepository } from '@infrastructure/db/base.repository'
import type { EventPublisher } from '@infrastructure/messaging/outbox/event-publisher.service'
import { GameMetrics } from '@infrastructure/observability/game-metrics'
import { Registry } from 'prom-client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

type EventRecord = {
	eventType: string
	payload: Record<string, unknown>
}

const newRound = (status: RoundStatus = RoundStatus.BETTING_PHASE): Round => {
	const r = Object.create(Round.prototype) as Round
	Object.assign(r, {
		id: crypto.randomUUID(),
		nonce: 1,
		serverSeedHash: 'commit',
		clientSeed: 'cs',
		crashPointHundredths: 234,
		growthRate: 0.06,
		status,
		createdAt: new Date(1_000_000),
		bettingEndsAt: new Date(1_010_000),
		flyingStartedAt: null,
		crashedAt: null,
		serverSeed: null,
		pendingServerSeed: null,
	})
	return r
}

const newBet = (overrides: Partial<Bet> = {}): Bet => {
	const b = Object.create(Bet.prototype) as Bet
	Object.assign(b, {
		id: crypto.randomUUID(),
		status: BetStatus.PENDING,
		amountCents: 1000n,
		cashoutMultiplierHundredths: null,
		payoutCents: null,
		cancellationReason: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	})
	return b
}

const makeCtx = (opts: { round: Round | null; existingBet?: Bet | null }) => {
	const created: Bet[] = []
	const flushCalls = { count: 0 }
	const published: EventRecord[] = []

	const rounds = {
		findOne: vi.fn().mockResolvedValue(opts.round),
		findAll: vi.fn().mockResolvedValue(opts.round ? [opts.round] : []),
		flush: vi.fn(async () => {
			flushCalls.count++
		}),
	}
	const bets = {
		findOne: vi.fn().mockResolvedValue(opts.existingBet ?? null),
		create: vi.fn((data: Partial<Bet>) => {
			const b = newBet(data)
			created.push(b)
			return b
		}),
		flush: vi.fn(async () => {
			flushCalls.count++
		}),
	}
	const events = {
		publish: vi.fn(
			(
				eventType: string,
				_at: string,
				_aid: string,
				payload: Record<string, unknown>,
			) => {
				published.push({ eventType, payload })
			},
		),
	} as unknown as EventPublisher
	return { rounds, bets, events, created, flushCalls, published }
}

type RoundRepo = BaseRepository<Round>
type BetRepo = BaseRepository<Bet>

describe('PlaceBetUseCase', () => {
	beforeEach(() => vi.clearAllMocks())

	it('persists a PENDING bet and publishes bet.placed in the same flush', async () => {
		const round = newRound()
		const ctx = makeCtx({ round })
		const useCase = new PlaceBetUseCase(
			ctx.rounds as unknown as RoundRepo,
			ctx.bets as unknown as BetRepo,
			ctx.events,
			new GameMetrics(new Registry()),
		)

		const bet = await useCase.execute(
			new PlaceBetCommand('u-1', 'alice', 1000n),
		)

		expect(bet.status).toBe(BetStatus.PENDING)
		expect(bet.amountCents).toBe(1000n)
		expect(ctx.published[0]).toEqual({
			eventType: 'bet.placed',
			payload: expect.objectContaining({
				userId: 'u-1',
				roundId: round.id,
				betAmount: '1000',
			}),
		})
		expect(ctx.flushCalls.count).toBe(1)
	})

	it('increments crash_bets_total{status="placed"} and bet amount sum', async () => {
		const round = newRound()
		const ctx = makeCtx({ round })
		const registry = new Registry()
		const metrics = new GameMetrics(registry)
		const useCase = new PlaceBetUseCase(
			ctx.rounds as unknown as RoundRepo,
			ctx.bets as unknown as BetRepo,
			ctx.events,
			metrics,
		)

		await useCase.execute(new PlaceBetCommand('u-1', 'alice', 1_500n))

		const total = await registry.getSingleMetric('crash_bets_total')?.get()
		const placed = total?.values.find(
			(v) => (v.labels as { status?: string }).status === 'placed',
		)
		expect(placed?.value).toBe(1)
		const stake = await registry
			.getSingleMetric('crash_bet_amount_cents_sum')
			?.get()
		expect(stake?.values[0]?.value).toBe(1_500)
	})

	it('rejects when no current round exists', async () => {
		const ctx = makeCtx({ round: null })
		const useCase = new PlaceBetUseCase(
			ctx.rounds as unknown as RoundRepo,
			ctx.bets as unknown as BetRepo,
			ctx.events,
			new GameMetrics(new Registry()),
		)

		await expect(
			useCase.execute(new PlaceBetCommand('u-1', 'alice', 1000n)),
		).rejects.toThrow(/no active round/i)
	})

	it('rejects when round is not in BETTING_PHASE', async () => {
		const round = newRound(RoundStatus.FLYING)
		const ctx = makeCtx({ round })
		const useCase = new PlaceBetUseCase(
			ctx.rounds as unknown as RoundRepo,
			ctx.bets as unknown as BetRepo,
			ctx.events,
			new GameMetrics(new Registry()),
		)

		await expect(
			useCase.execute(new PlaceBetCommand('u-1', 'alice', 1000n)),
		).rejects.toThrow(RoundNotBettingException)
	})

	it('rejects an out-of-range amount before touching the repo', async () => {
		const round = newRound()
		const ctx = makeCtx({ round })
		const useCase = new PlaceBetUseCase(
			ctx.rounds as unknown as RoundRepo,
			ctx.bets as unknown as BetRepo,
			ctx.events,
			new GameMetrics(new Registry()),
		)

		await expect(
			useCase.execute(new PlaceBetCommand('u-1', 'alice', 50n)),
		).rejects.toThrow(BetAmountOutOfRangeException)
		await expect(
			useCase.execute(new PlaceBetCommand('u-1', 'alice', 100_001n)),
		).rejects.toThrow(BetAmountOutOfRangeException)
	})

	it('rejects a duplicate bet from the same user in the current round', async () => {
		const round = newRound()
		const existing = newBet({ roundId: round.id, userId: 'u-1' })
		const ctx = makeCtx({ round, existingBet: existing })
		const useCase = new PlaceBetUseCase(
			ctx.rounds as unknown as RoundRepo,
			ctx.bets as unknown as BetRepo,
			ctx.events,
			new GameMetrics(new Registry()),
		)

		await expect(
			useCase.execute(new PlaceBetCommand('u-1', 'alice', 500n)),
		).rejects.toThrow(DuplicateBetException)
	})
})
