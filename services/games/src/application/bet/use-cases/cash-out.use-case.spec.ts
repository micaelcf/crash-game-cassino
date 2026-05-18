import { CashOutCommand } from '@application/bet/dtos/cash-out.command'
import { CashOutUseCase } from '@application/bet/use-cases/cash-out.use-case'
import { Bet, BetStatus } from '@domain/bet/bet.entity'
import { NoActiveBetException } from '@domain/bet/bet.exceptions'
import { Round, RoundStatus } from '@domain/round/round.entity'
import { RoundNotFlyingException } from '@domain/round/round.exceptions'
import type { Clock } from '@domain/shared/clock'
import type { EventPublisher } from '@infrastructure/messaging/outbox/event-publisher.service'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const fixedClock = (now: Date): Clock => ({ now: () => now })

const newRound = (overrides: Partial<Round> = {}): Round => {
	const r = Object.create(Round.prototype) as Round
	Object.assign(r, {
		id: crypto.randomUUID(),
		nonce: 1,
		serverSeedHash: 'commit',
		clientSeed: 'cs',
		crashPointHundredths: 500,
		growthRate: 0.06,
		status: RoundStatus.FLYING,
		createdAt: new Date(),
		bettingEndsAt: new Date(),
		flyingStartedAt: new Date(1_000_000),
		crashedAt: null,
		serverSeed: null,
		pendingServerSeed: null,
		...overrides,
	})
	return r
}

const newConfirmedBet = (roundId: string, amount: bigint = 1000n): Bet => {
	const b = Object.create(Bet.prototype) as Bet
	Object.assign(b, {
		id: crypto.randomUUID(),
		roundId,
		userId: 'u-1',
		username: 'alice',
		amountCents: amount,
		status: BetStatus.CONFIRMED,
		cashoutMultiplierHundredths: null,
		payoutCents: null,
		cancellationReason: null,
		createdAt: new Date(),
		updatedAt: new Date(),
	})
	return b
}

const makeCtx = (opts: { round: Round | null; bet: Bet | null }) => {
	const flushCalls = { count: 0 }
	const flushOrder: string[] = []
	const published: Array<{ eventType: string; payload: any }> = []
	const rounds = {
		findOne: vi.fn().mockResolvedValue(opts.round),
		findAll: vi.fn().mockResolvedValue(opts.round ? [opts.round] : []),
		flush: vi.fn(async () => {
			flushCalls.count++
			flushOrder.push('flush')
		}),
	}
	const bets = {
		findOne: vi.fn().mockResolvedValue(opts.bet),
		flush: vi.fn(async () => {
			flushCalls.count++
			flushOrder.push('flush')
		}),
	}
	const events: EventPublisher = {
		publish: vi.fn((eventType, _at, _aid, payload) => {
			published.push({ eventType, payload })
		}),
	} as unknown as EventPublisher
	const broadcaster = {
		emitRoundBetting: vi.fn(),
		emitRoundStarted: vi.fn(),
		emitRoundCrashed: vi.fn(),
		emitBetPlaced: vi.fn(),
		emitBetCashedOut: vi.fn(() => {
			flushOrder.push('emitBetCashedOut')
		}),
		emitBetCancelled: vi.fn(),
	}
	return {
		rounds,
		bets,
		events,
		broadcaster,
		flushCalls,
		flushOrder,
		published,
	}
}

describe('CashOutUseCase', () => {
	beforeEach(() => vi.clearAllMocks())

	it('settles the bet WON, publishes player.won and broadcasts bet.cashed_out after flush', async () => {
		const flyAt = new Date(1_000_000)
		const round = newRound({ flyingStartedAt: flyAt })
		const bet = newConfirmedBet(round.id, 1000n)
		const ctx = makeCtx({ round, bet })
		const now = new Date(1_001_000)
		const useCase = new CashOutUseCase(
			ctx.rounds as any,
			ctx.bets as any,
			ctx.events,
			fixedClock(now),
			ctx.broadcaster as any,
		)

		const result = await useCase.execute(new CashOutCommand('u-1'))

		expect(result.status).toBe(BetStatus.WON)
		expect(result.cashoutMultiplierHundredths).toBe(106)
		expect(result.payoutCents).toBe(1060n)
		expect(ctx.published[0]).toEqual({
			eventType: 'player.won',
			payload: expect.objectContaining({
				userId: 'u-1',
				roundId: round.id,
				amount: '1060',
			}),
		})
		expect(ctx.flushCalls.count).toBe(1)
		expect(ctx.broadcaster.emitBetCashedOut).toHaveBeenCalledTimes(1)
		expect(ctx.broadcaster.emitBetCashedOut).toHaveBeenCalledWith({
			roundId: round.id,
			betId: bet.id,
			userId: bet.userId,
			username: bet.username,
			multiplierHundredths: 106,
			payoutCents: '1060',
		})
		expect(ctx.flushOrder).toEqual(['flush', 'emitBetCashedOut'])
	})

	it('does not broadcast bet.cashed_out when the round is not FLYING', async () => {
		const round = newRound({ status: RoundStatus.BETTING_PHASE })
		const ctx = makeCtx({ round, bet: newConfirmedBet(round.id) })
		const useCase = new CashOutUseCase(
			ctx.rounds as any,
			ctx.bets as any,
			ctx.events,
			fixedClock(new Date()),
			ctx.broadcaster as any,
		)

		await expect(useCase.execute(new CashOutCommand('u-1'))).rejects.toThrow(
			RoundNotFlyingException,
		)
		expect(ctx.broadcaster.emitBetCashedOut).not.toHaveBeenCalled()
	})

	it('does not broadcast bet.cashed_out when the user has no active bet', async () => {
		const round = newRound()
		const ctx = makeCtx({ round, bet: null })
		const useCase = new CashOutUseCase(
			ctx.rounds as any,
			ctx.bets as any,
			ctx.events,
			fixedClock(new Date()),
			ctx.broadcaster as any,
		)

		await expect(useCase.execute(new CashOutCommand('u-1'))).rejects.toThrow(
			NoActiveBetException,
		)
		expect(ctx.broadcaster.emitBetCashedOut).not.toHaveBeenCalled()
	})

	it('rejects when the round is not FLYING', async () => {
		const round = newRound({ status: RoundStatus.BETTING_PHASE })
		const ctx = makeCtx({ round, bet: newConfirmedBet(round.id) })
		const useCase = new CashOutUseCase(
			ctx.rounds as any,
			ctx.bets as any,
			ctx.events,
			fixedClock(new Date()),
			ctx.broadcaster as any,
		)

		await expect(useCase.execute(new CashOutCommand('u-1'))).rejects.toThrow(
			RoundNotFlyingException,
		)
	})

	it('rejects when the user has no active bet', async () => {
		const round = newRound()
		const ctx = makeCtx({ round, bet: null })
		const useCase = new CashOutUseCase(
			ctx.rounds as any,
			ctx.bets as any,
			ctx.events,
			fixedClock(new Date()),
			ctx.broadcaster as any,
		)

		await expect(useCase.execute(new CashOutCommand('u-1'))).rejects.toThrow(
			NoActiveBetException,
		)
	})

	it('rejects when the bet is not in CONFIRMED state', async () => {
		const round = newRound()
		const bet = newConfirmedBet(round.id)
		;(bet as any).status = BetStatus.PENDING
		const ctx = makeCtx({ round, bet })
		const useCase = new CashOutUseCase(
			ctx.rounds as any,
			ctx.bets as any,
			ctx.events,
			fixedClock(new Date()),
			ctx.broadcaster as any,
		)

		await expect(useCase.execute(new CashOutCommand('u-1'))).rejects.toThrow(
			NoActiveBetException,
		)
	})
})
