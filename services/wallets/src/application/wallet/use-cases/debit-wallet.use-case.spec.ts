import { DebitWalletCommand } from '@application/wallet/dtos/debit-wallet.command'
import { DebitWalletUseCase } from '@application/wallet/use-cases/debit-wallet.use-case'
import { Wallet } from '@domain/wallet/wallet.entity'
import type { BaseRepository } from '@infrastructure/db/base.repository'
import { InboxEvent } from '@infrastructure/messaging/inbox/inbox-event.entity'
import type { EventPublisher } from '@infrastructure/messaging/outbox/event-publisher.service'
import { beforeEach, describe, expect, it, vi } from 'vitest'

type WalletRepo = BaseRepository<Wallet>
type InboxRepo = BaseRepository<InboxEvent>

const newWallet = (playerId: string, balance: bigint): Wallet => {
	const w = Object.create(Wallet.prototype) as Wallet
	Object.assign(w, { id: crypto.randomUUID(), playerId, balance })
	return w
}

const makeCtx = (
	opts: { wallet?: Wallet | null; inbox?: InboxEvent | null } = {},
) => {
	const inboxCreated: InboxEvent[] = []
	const published: Array<{
		eventType: string
		payload: Record<string, unknown>
	}> = []

	const walletRepo = {
		findOne: vi.fn().mockResolvedValue(opts.wallet ?? null),
		flush: vi.fn().mockResolvedValue(undefined),
	}
	const inboxRepo = {
		findOne: vi.fn().mockResolvedValue(opts.inbox ?? null),
		create: vi.fn((data: { id: string }) => {
			const i = Object.create(InboxEvent.prototype)
			Object.assign(i, { id: data.id, processedAt: new Date() })
			inboxCreated.push(i)
			return i
		}),
	}
	const events = {
		publish: vi.fn(
			(
				eventType: string,
				_aggregateType: string,
				_aggregateId: string,
				payload: Record<string, unknown>,
			) => {
				published.push({ eventType, payload })
			},
		),
	} as unknown as EventPublisher

	return { walletRepo, inboxRepo, events, inboxCreated, published }
}

describe('DebitWalletUseCase', () => {
	beforeEach(() => vi.clearAllMocks())

	it('debits the wallet and publishes wallet.debited on success', async () => {
		const wallet = newWallet('player-1', 1000n)
		const ctx = makeCtx({ wallet })
		const useCase = new DebitWalletUseCase(
			ctx.walletRepo as unknown as WalletRepo,
			ctx.inboxRepo as unknown as InboxRepo,
			ctx.events,
		)

		await useCase.execute(
			new DebitWalletCommand('msg-1', 'player-1', 300n, 'round-1'),
		)

		expect(wallet.balance).toBe(700n)
		expect(ctx.inboxCreated).toHaveLength(1)
		expect(ctx.inboxCreated[0].id).toBe('msg-1')
		expect(ctx.published).toHaveLength(1)
		expect(ctx.published[0]).toEqual({
			eventType: 'wallet.debited',
			payload: { userId: 'player-1', roundId: 'round-1', amount: '300' },
		})
		expect(ctx.walletRepo.flush).toHaveBeenCalledOnce()
	})

	it('publishes wallet.debit_failed when balance is insufficient', async () => {
		const wallet = newWallet('player-1', 100n)
		const ctx = makeCtx({ wallet })
		const useCase = new DebitWalletUseCase(
			ctx.walletRepo as unknown as WalletRepo,
			ctx.inboxRepo as unknown as InboxRepo,
			ctx.events,
		)

		await useCase.execute(
			new DebitWalletCommand('msg-2', 'player-1', 300n, 'round-2'),
		)

		expect(wallet.balance).toBe(100n)
		expect(ctx.published[0]).toMatchObject({
			eventType: 'wallet.debit_failed',
			payload: { reason: 'Insufficient balance' },
		})
	})

	it('publishes wallet.debit_failed when wallet is missing', async () => {
		const ctx = makeCtx({ wallet: null })
		const useCase = new DebitWalletUseCase(
			ctx.walletRepo as unknown as WalletRepo,
			ctx.inboxRepo as unknown as InboxRepo,
			ctx.events,
		)

		await useCase.execute(
			new DebitWalletCommand('msg-3', 'ghost', 50n, 'round-3'),
		)

		expect(ctx.published[0]).toMatchObject({
			eventType: 'wallet.debit_failed',
			payload: { reason: 'Wallet not found' },
		})
	})

	it('short-circuits when the inbox already records the messageId', async () => {
		const wallet = newWallet('player-1', 1000n)
		const inbox = Object.create(InboxEvent.prototype)
		const ctx = makeCtx({ wallet, inbox })
		const useCase = new DebitWalletUseCase(
			ctx.walletRepo as unknown as WalletRepo,
			ctx.inboxRepo as unknown as InboxRepo,
			ctx.events,
		)

		await useCase.execute(
			new DebitWalletCommand('msg-1', 'player-1', 300n, 'round-1'),
		)

		expect(wallet.balance).toBe(1000n)
		expect(ctx.published).toHaveLength(0)
		expect(ctx.walletRepo.flush).not.toHaveBeenCalled()
	})
})
