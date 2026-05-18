import { Wallet } from '@domain/wallet/wallet.entity'
import type { MikroORM } from '@mikro-orm/core'

export interface SeedWalletInput {
	playerId: string
	balance?: bigint
}

export const seedWallet = async (
	orm: MikroORM,
	input: SeedWalletInput,
): Promise<Wallet> => {
	const em = orm.em.fork()
	const wallet = em.create(Wallet, {
		playerId: input.playerId,
		balance: input.balance ?? 0n,
	})
	await em.flush()
	return wallet
}
