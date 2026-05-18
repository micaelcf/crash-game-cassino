export class InsufficientBalanceException extends Error {
	constructor(
		public readonly playerId: string,
		public readonly amount: bigint,
		public readonly currentBalance: bigint,
	) {
		super(
			`Insufficient balance for player ${playerId}. Tried to debit ${amount}, but balance is ${currentBalance}`,
		)
		this.name = 'InsufficientBalanceException'
	}
}
