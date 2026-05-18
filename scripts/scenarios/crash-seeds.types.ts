export interface CrashSeedRow {
	targetHundredths: number
	serverSeed: string
	clientSeed: string
	nonce: number
	hashCommitment: string
}

export interface BetSpec {
	userId: string
	username?: string
	amountCents: bigint
	cashout?: { atHundredths: number }
}

export interface RoundSpec {
	targetHundredths: number
	bets?: BetSpec[]
}

export interface PlayerSpec {
	userId: string
	username: string
	startingBalanceCents: bigint
}

export interface Scenario {
	name: string
	description: string
	players: PlayerSpec[]
	rounds: RoundSpec[]
}
