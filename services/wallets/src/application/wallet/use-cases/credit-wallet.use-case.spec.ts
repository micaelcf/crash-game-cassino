import { CreditWalletCommand } from '@application/wallet/dtos/credit-wallet.command'
import { CreditWalletUseCase } from '@application/wallet/use-cases/credit-wallet.use-case'
import { Wallet } from '@domain/wallet/wallet.entity'
import type { BaseRepository } from '@infrastructure/db/base.repository'
import { InboxEvent } from '@infrastructure/messaging/inbox/inbox-event.entity'
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
	return { walletRepo, inboxRepo, inboxCreated }
}

describe('CreditWalletUseCase', () => {
	beforeEach(() => vi.clearAllMocks())

	it('credits the wallet and records the inbox event on success', async () => {
		const wallet = newWallet('player-1', 500n)
		const ctx = makeCtx({ wallet })
		const useCase = new CreditWalletUseCase(
			ctx.walletRepo as unknown as WalletRepo,
			ctx.inboxRepo as unknown as InboxRepo,
		)

		await useCase.execute(new CreditWalletCommand('msg-c1', 'player-1', 250n))

		expect(wallet.balance).toBe(750n)
		expect(ctx.inboxCreated).toHaveLength(1)
		expect(ctx.walletRepo.flush).toHaveBeenCalledOnce()
	})

	it('is idempotent on duplicate messageId', async () => {
		const wallet = newWallet('player-1', 500n)
		const inbox = Object.create(InboxEvent.prototype)
		const ctx = makeCtx({ wallet, inbox })
		const useCase = new CreditWalletUseCase(
			ctx.walletRepo as unknown as WalletRepo,
			ctx.inboxRepo as unknown as InboxRepo,
		)

		await useCase.execute(new CreditWalletCommand('msg-c1', 'player-1', 250n))

		expect(wallet.balance).toBe(500n)
		expect(ctx.walletRepo.flush).not.toHaveBeenCalled()
	})

	it('no-ops when wallet is missing', async () => {
		const ctx = makeCtx({ wallet: null })
		const useCase = new CreditWalletUseCase(
			ctx.walletRepo as unknown as WalletRepo,
			ctx.inboxRepo as unknown as InboxRepo,
		)

		await useCase.execute(new CreditWalletCommand('msg-c2', 'ghost', 50n))

		expect(ctx.walletRepo.flush).not.toHaveBeenCalled()
	})
})
