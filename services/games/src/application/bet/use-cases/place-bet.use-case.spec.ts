import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Bet, BetStatus } from '../../../domain/bet/bet.entity'
import {
	BetAmountOutOfRangeException,
	DuplicateBetException,
} from '../../../domain/bet/bet.exceptions'
import { Round, RoundStatus } from '../../../domain/round/round.entity'
import { RoundNotBettingException } from '../../../domain/round/round.exceptions'
import type { EventPublisher } from '../../../infrastructure/messaging/outbox/event-publisher.service'
import { PlaceBetCommand } from '../dtos/place-bet.command'
import { PlaceBetUseCase } from './place-bet.use-case'

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
	const created: any[] = []
	const flushCalls = { count: 0 }
	const published: Array<{ eventType: string; payload: any }> = []

	const rounds = {
		findOne: vi.fn().mockResolvedValue(opts.round),
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
	const events: EventPublisher = {
		publish: vi.fn((eventType, _at, _aid, payload) => {
			published.push({ eventType, payload })
		}),
	} as unknown as EventPublisher
	return { rounds, bets, events, created, flushCalls, published }
}

describe('PlaceBetUseCase', () => {
	beforeEach(() => vi.clearAllMocks())

	it('persists a PENDING bet and publishes bet.placed in the same flush', async () => {
		const round = newRound()
		const ctx = makeCtx({ round })
		const useCase = new PlaceBetUseCase(
			ctx.rounds as any,
			ctx.bets as any,
			ctx.events,
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

	it('rejects when no current round exists', async () => {
		const ctx = makeCtx({ round: null })
		const useCase = new PlaceBetUseCase(
			ctx.rounds as any,
			ctx.bets as any,
			ctx.events,
		)

		await expect(
			useCase.execute(new PlaceBetCommand('u-1', 'alice', 1000n)),
		).rejects.toThrow(/no active round/i)
	})

	it('rejects when round is not in BETTING_PHASE', async () => {
		const round = newRound(RoundStatus.FLYING)
		const ctx = makeCtx({ round })
		const useCase = new PlaceBetUseCase(
			ctx.rounds as any,
			ctx.bets as any,
			ctx.events,
		)

		await expect(
			useCase.execute(new PlaceBetCommand('u-1', 'alice', 1000n)),
		).rejects.toThrow(RoundNotBettingException)
	})

	it('rejects an out-of-range amount before touching the repo', async () => {
		const round = newRound()
		const ctx = makeCtx({ round })
		const useCase = new PlaceBetUseCase(
			ctx.rounds as any,
			ctx.bets as any,
			ctx.events,
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
			ctx.rounds as any,
			ctx.bets as any,
			ctx.events,
		)

		await expect(
			useCase.execute(new PlaceBetCommand('u-1', 'alice', 500n)),
		).rejects.toThrow(DuplicateBetException)
	})
})
