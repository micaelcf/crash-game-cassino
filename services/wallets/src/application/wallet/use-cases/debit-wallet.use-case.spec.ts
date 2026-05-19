import { EnsureWalletCommand } from '@application/wallet/dtos/ensure-wallet.command'
import { DebitWalletCommand } from '@application/wallet/dtos/debit-wallet.command'
import { DebitWalletUseCase } from '@application/wallet/use-cases/debit-wallet.use-case'
import type { EnsureWalletUseCase } from '@application/wallet/use-cases/ensure-wallet.use-case'
import { Wallet } from '@domain/wallet/wallet.entity'
import type { BaseRepository } from '@infrastructure/db/base.repository'
import { InboxEvent } from '@infrastructure/messaging/inbox/inbox-event.entity'
import type { EventPublisher } from '@infrastructure/messaging/outbox/event-publisher.service'
import { WalletMetrics } from '@infrastructure/observability/wallet-metrics'
import { Registry } from 'prom-client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

type WalletRepo = BaseRepository<Wallet>
type InboxRepo = BaseRepository<InboxEvent>

const newWallet = (playerId: string, balance: bigint): Wallet => {
	const w = Object.create(Wallet.prototype) as Wallet
	Object.assign(w, { id: crypto.randomUUID(), playerId, balance })
	return w
}

const DEFAULT_ENSURED_BALANCE = 100000n

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

	const ensureWallet = {
		execute: vi.fn(async (cmd: EnsureWalletCommand) => {
			if (opts.wallet) return opts.wallet
			return newWallet(cmd.playerId, DEFAULT_ENSURED_BALANCE)
		}),
	} as unknown as EnsureWalletUseCase

	return {
		walletRepo,
		inboxRepo,
		events,
		ensureWallet,
		inboxCreated,
		published,
	}
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
			new WalletMetrics(new Registry()),
			ctx.ensureWallet,
		)

		await useCase.execute(
			new DebitWalletCommand('msg-1', 'player-1', 300n, 'round-1', 'bet-1'),
		)

		expect(wallet.balance).toBe(700n)
		expect(ctx.inboxCreated).toHaveLength(1)
		expect(ctx.inboxCreated[0].id).toBe('msg-1')
		expect(ctx.published).toHaveLength(1)
		expect(ctx.published[0]).toEqual({
			eventType: 'wallet.debited',
			payload: {
				userId: 'player-1',
				roundId: 'round-1',
				betId: 'bet-1',
				amount: '300',
			},
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
			new WalletMetrics(new Registry()),
			ctx.ensureWallet,
		)

		await useCase.execute(
			new DebitWalletCommand('msg-2', 'player-1', 300n, 'round-2', 'bet-2'),
		)

		expect(wallet.balance).toBe(100n)
		expect(ctx.published[0]).toMatchObject({
			eventType: 'wallet.debit_failed',
			payload: { reason: 'Insufficient balance', betId: 'bet-2' },
		})
	})

	it('auto-provisions a wallet when none exists and debits the default balance', async () => {
		const ctx = makeCtx({ wallet: null })
		const useCase = new DebitWalletUseCase(
			ctx.walletRepo as unknown as WalletRepo,
			ctx.inboxRepo as unknown as InboxRepo,
			ctx.events,
			new WalletMetrics(new Registry()),
			ctx.ensureWallet,
		)

		await useCase.execute(
			new DebitWalletCommand('msg-3', 'newcomer', 250n, 'round-3', 'bet-3'),
		)

		expect(ctx.ensureWallet.execute).toHaveBeenCalledWith(
			expect.objectContaining({ playerId: 'newcomer' }),
		)
		expect(ctx.published[0]).toMatchObject({
			eventType: 'wallet.debited',
			payload: {
				userId: 'newcomer',
				roundId: 'round-3',
				betId: 'bet-3',
				amount: '250',
			},
		})
	})

	it('records crash_wallet_operations_total{op="debit"} on a successful debit', async () => {
		const wallet = newWallet('player-1', 1000n)
		const ctx = makeCtx({ wallet })
		const registry = new Registry()
		const useCase = new DebitWalletUseCase(
			ctx.walletRepo as unknown as WalletRepo,
			ctx.inboxRepo as unknown as InboxRepo,
			ctx.events,
			new WalletMetrics(registry),
			ctx.ensureWallet,
		)

		await useCase.execute(
			new DebitWalletCommand('msg-m1', 'player-1', 100n, 'round-1', 'bet-1'),
		)

		const total = await registry
			.getSingleMetric('crash_wallet_operations_total')
			?.get()
		const debit = total?.values.find(
			(v) => (v.labels as { op?: string }).op === 'debit',
		)
		expect(debit?.value).toBe(1)
	})

	it('short-circuits when the inbox already records the messageId', async () => {
		const wallet = newWallet('player-1', 1000n)
		const inbox = Object.create(InboxEvent.prototype)
		const ctx = makeCtx({ wallet, inbox })
		const useCase = new DebitWalletUseCase(
			ctx.walletRepo as unknown as WalletRepo,
			ctx.inboxRepo as unknown as InboxRepo,
			ctx.events,
			new WalletMetrics(new Registry()),
			ctx.ensureWallet,
		)

		await useCase.execute(
			new DebitWalletCommand('msg-1', 'player-1', 300n, 'round-1', 'bet-dup'),
		)

		expect(wallet.balance).toBe(1000n)
		expect(ctx.published).toHaveLength(0)
		expect(ctx.walletRepo.flush).not.toHaveBeenCalled()
		expect(ctx.ensureWallet.execute).not.toHaveBeenCalled()
	})
})
