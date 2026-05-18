import { randomUUID } from 'node:crypto'
import { InsufficientBalanceException } from '@domain/wallet/insufficient-balance.exception'
import { BigIntType } from '@infrastructure/db/bigint.type'
import { defineEntity, type InferEntity } from '@mikro-orm/core'

export const WalletSchema = defineEntity({
	name: 'Wallet',
	tableName: 'wallets',
	properties: (p) => ({
		id: p.uuid().primary().defaultRaw('uuidv7()'),
		playerId: p.string(),
		balance: p.type(BigIntType).onCreate(() => 0n),
		createdAt: p.datetime().onCreate(() => new Date()),
		updatedAt: p
			.datetime()
			.onCreate(() => new Date())
			.onUpdate(() => new Date()),
	}),
})

export type IWallet = InferEntity<typeof WalletSchema>

export class Wallet extends WalletSchema.class {
	credit(amount: bigint): void {
		if (amount < 0n) {
			throw new Error('Amount must be positive')
		}
		this.balance += amount
	}

	debit(amount: bigint): void {
		if (amount < 0n) {
			throw new Error('Amount must be positive')
		}
		if (this.balance < amount) {
			throw new InsufficientBalanceException(
				this.playerId,
				amount,
				this.balance,
			)
		}
		this.balance -= amount
	}
}

WalletSchema.setClass(Wallet)
