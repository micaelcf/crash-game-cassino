export class BetAmountOutOfRangeException extends Error {
	readonly name = 'BetAmountOutOfRangeException'
	constructor(amount: bigint, min: bigint, max: bigint) {
		super(
			`Bet amount ${amount.toString()} is outside the allowed range [${min}, ${max}]`,
		)
	}
}

export class BetAlreadySettledException extends Error {
	readonly name = 'BetAlreadySettledException'
	constructor() {
		super('Bet has already been settled or is not in the required state')
	}
}

export class DuplicateBetException extends Error {
	readonly name = 'DuplicateBetException'
	constructor(userId: string, roundId: string) {
		super(`User ${userId} has already placed a bet in round ${roundId}`)
	}
}

export class NoActiveBetException extends Error {
	readonly name = 'NoActiveBetException'
	constructor(userId: string, roundId: string) {
		super(`User ${userId} has no active bet in round ${roundId}`)
	}
}
