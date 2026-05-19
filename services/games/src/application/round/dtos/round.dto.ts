import { toBetDto } from '@application/bet/dtos/bet.dto'
import type { RoundDto } from '@crash/contracts'
import type { Bet } from '@domain/bet/bet.entity'
import { Round, RoundStatus } from '@domain/round/round.entity'

export type { RoundDto }

export const toRoundDto = (
	round: Round,
	bets: Bet[],
	serverTime: Date,
): RoundDto => ({
	id: round.id,
	nonce: round.nonce,
	status: round.status,
	hashCommitment: round.serverSeedHash,
	clientSeed: round.clientSeed,
	bettingEndsAt: round.bettingEndsAt.toISOString(),
	flyingStartedAt: round.flyingStartedAt?.toISOString() ?? null,
	crashedAt: round.crashedAt?.toISOString() ?? null,
	growthRate: round.growthRate,
	crashPointHundredths:
		round.status === RoundStatus.CRASHED ? round.crashPointHundredths : null,
	serverSeed:
		round.status === RoundStatus.CRASHED ? (round.serverSeed ?? null) : null,
	bets: bets.map(toBetDto),
	serverTime: serverTime.toISOString(),
})
