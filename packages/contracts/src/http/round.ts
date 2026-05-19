import type { RoundStatus } from '../status'
import type { BetDto } from './bet'

export interface RoundDto {
	id: string
	nonce: number
	status: RoundStatus
	hashCommitment: string
	clientSeed: string
	bettingEndsAt: string
	flyingStartedAt: string | null
	crashedAt: string | null
	growthRate: number
	crashPointHundredths: number | null
	serverSeed: string | null
	bets: BetDto[]
	/**
	 * ISO-8601 timestamp captured when the server generated this payload.
	 * Frontend computes one-sided clock skew (`serverTime - Date.now()`) to
	 * keep multiplier projections aligned across slow/skewed clients.
	 */
	serverTime: string
}

export interface RoundVerifyDto {
	roundId: string
	nonce: number
	serverSeed: string
	clientSeed: string
	hashCommitment: string
	crashPointHundredths: number
}
