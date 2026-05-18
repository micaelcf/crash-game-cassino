import { WalletDebitFailedCommand } from '@application/bet/dtos/wallet-debit-failed.command'
import { WalletDebitedCommand } from '@application/bet/dtos/wallet-debited.command'
import { WalletDebitFailedUseCase } from '@application/bet/use-cases/wallet-debit-failed.use-case'
import { WalletDebitedUseCase } from '@application/bet/use-cases/wallet-debited.use-case'
import { Bet, BetStatus } from '@domain/bet/bet.entity'
import type { BaseRepository } from '@infrastructure/db/base.repository'
import { InboxEvent } from '@infrastructure/messaging/inbox/inbox-event.entity'
import type { GameBroadcaster } from '@infrastructure/websocket/game.gateway.interface'
import { beforeEach, describe, expect, it, vi } from 'vitest'

type BetRepo = BaseRepository<Bet>
type InboxRepo = BaseRepository<InboxEvent>

const newPendingBet = (id = 'bet-1'): Bet => {
	const b = Object.create(Bet.prototype) as Bet
	Object.assign(b, {
		id,
		roundId: 'r-1',
		userId: 'u-1',
		username: 'alice',
		amountCents: 1000n,
		status: BetStatus.PENDING,
		cashoutMultiplierHundredths: null,
		payoutCents: null,
		cancellationReason: null,
		createdAt: new Date(),
		updatedAt: new Date(),
	})
	return b
}

const makeCtx = (opts: { bet?: Bet | null; inbox?: InboxEvent | null }) => {
	const created: InboxEvent[] = []
	const flushCalls = { count: 0 }
	const flushOrder: string[] = []
	const emitOrder: string[] = []
	const bets = {
		findOne: vi.fn().mockResolvedValue(opts.bet ?? null),
		flush: vi.fn(async () => {
			flushCalls.count++
			flushOrder.push('flush')
		}),
	}
	const inbox = {
		findOne: vi.fn().mockResolvedValue(opts.inbox ?? null),
		create: vi.fn((data: { id: string }) => {
			const i = Object.create(InboxEvent.prototype)
			Object.assign(i, { id: data.id, processedAt: new Date() })
			created.push(i)
			return i
		}),
	}
	const broadcaster = {
		emitRoundBetting: vi.fn(),
		emitRoundStarted: vi.fn(),
		emitRoundCrashed: vi.fn(),
		emitBetPlaced: vi.fn(() => {
			emitOrder.push('emitBetPlaced')
			flushOrder.push('emitBetPlaced')
		}),
		emitBetCashedOut: vi.fn(),
		emitBetCancelled: vi.fn(() => {
			emitOrder.push('emitBetCancelled')
			flushOrder.push('emitBetCancelled')
		}),
	}
	return {
		bets,
		inbox,
		broadcaster,
		created,
		flushCalls,
		flushOrder,
		emitOrder,
	}
}

describe('WalletDebitedUseCase', () => {
	beforeEach(() => vi.clearAllMocks())

	it('confirms the bet, records the inbox event and broadcasts bet.placed after flush', async () => {
		const bet = newPendingBet()
		const ctx = makeCtx({ bet })
		const useCase = new WalletDebitedUseCase(
			ctx.bets as unknown as BetRepo,
			ctx.inbox as unknown as InboxRepo,
			ctx.broadcaster as unknown as GameBroadcaster,
		)

		await useCase.execute(new WalletDebitedCommand('msg-1', bet.id))

		expect(bet.status).toBe(BetStatus.CONFIRMED)
		expect(ctx.created.some((x) => x instanceof InboxEvent)).toBe(true)
		expect(ctx.flushCalls.count).toBe(1)
		expect(ctx.broadcaster.emitBetPlaced).toHaveBeenCalledTimes(1)
		expect(ctx.broadcaster.emitBetPlaced).toHaveBeenCalledWith({
			roundId: bet.roundId,
			betId: bet.id,
			userId: bet.userId,
			username: bet.username,
			amountCents: bet.amountCents.toString(),
		})
		expect(ctx.flushOrder).toEqual(['flush', 'emitBetPlaced'])
	})

	it('is idempotent: replaying the same messageId is a no-op and does not re-broadcast bet.placed', async () => {
		const bet = newPendingBet()
		const inbox = Object.create(InboxEvent.prototype)
		const ctx = makeCtx({ bet, inbox })
		const useCase = new WalletDebitedUseCase(
			ctx.bets as unknown as BetRepo,
			ctx.inbox as unknown as InboxRepo,
			ctx.broadcaster as unknown as GameBroadcaster,
		)

		await useCase.execute(new WalletDebitedCommand('msg-1', bet.id))

		expect(bet.status).toBe(BetStatus.PENDING)
		expect(ctx.flushCalls.count).toBe(0)
		expect(ctx.broadcaster.emitBetPlaced).not.toHaveBeenCalled()
	})

	it('still records the inbox dedupe when the bet has vanished and does not broadcast bet.placed', async () => {
		const ctx = makeCtx({ bet: null })
		const useCase = new WalletDebitedUseCase(
			ctx.bets as unknown as BetRepo,
			ctx.inbox as unknown as InboxRepo,
			ctx.broadcaster as unknown as GameBroadcaster,
		)

		await useCase.execute(new WalletDebitedCommand('msg-2', 'ghost'))

		expect(ctx.created.some((x) => x instanceof InboxEvent)).toBe(true)
		expect(ctx.flushCalls.count).toBe(1)
		expect(ctx.broadcaster.emitBetPlaced).not.toHaveBeenCalled()
	})
})

describe('WalletDebitFailedUseCase', () => {
	beforeEach(() => vi.clearAllMocks())

	it('cancels the bet, records the inbox event and broadcasts bet.cancelled after flush', async () => {
		const bet = newPendingBet()
		const ctx = makeCtx({ bet })
		const useCase = new WalletDebitFailedUseCase(
			ctx.bets as unknown as BetRepo,
			ctx.inbox as unknown as InboxRepo,
			ctx.broadcaster as unknown as GameBroadcaster,
		)

		await useCase.execute(
			new WalletDebitFailedCommand('msg-x', bet.id, 'Insufficient balance'),
		)

		expect(bet.status).toBe(BetStatus.CANCELLED)
		expect(bet.cancellationReason).toBe('Insufficient balance')
		expect(ctx.flushCalls.count).toBe(1)
		expect(ctx.broadcaster.emitBetCancelled).toHaveBeenCalledTimes(1)
		expect(ctx.broadcaster.emitBetCancelled).toHaveBeenCalledWith({
			roundId: bet.roundId,
			betId: bet.id,
			userId: bet.userId,
			reason: 'Insufficient balance',
		})
		expect(ctx.flushOrder).toEqual(['flush', 'emitBetCancelled'])
	})

	it('is idempotent on duplicate messageId and does not re-broadcast bet.cancelled', async () => {
		const bet = newPendingBet()
		const inbox = Object.create(InboxEvent.prototype)
		const ctx = makeCtx({ bet, inbox })
		const useCase = new WalletDebitFailedUseCase(
			ctx.bets as unknown as BetRepo,
			ctx.inbox as unknown as InboxRepo,
			ctx.broadcaster as unknown as GameBroadcaster,
		)

		await useCase.execute(new WalletDebitFailedCommand('msg-x', bet.id, 'r'))

		expect(bet.status).toBe(BetStatus.PENDING)
		expect(ctx.flushCalls.count).toBe(0)
		expect(ctx.broadcaster.emitBetCancelled).not.toHaveBeenCalled()
	})

	it('does not broadcast bet.cancelled when the bet has vanished', async () => {
		const ctx = makeCtx({ bet: null })
		const useCase = new WalletDebitFailedUseCase(
			ctx.bets as unknown as BetRepo,
			ctx.inbox as unknown as InboxRepo,
			ctx.broadcaster as unknown as GameBroadcaster,
		)

		await useCase.execute(new WalletDebitFailedCommand('msg-g', 'ghost', 'r'))

		expect(ctx.broadcaster.emitBetCancelled).not.toHaveBeenCalled()
		expect(ctx.flushCalls.count).toBe(1)
	})
})
