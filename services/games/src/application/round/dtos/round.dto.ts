import { BetDto, toBetDto } from '@application/bet/dtos/bet.dto'
import type { Bet } from '@domain/bet/bet.entity'
import { Round, RoundStatus } from '@domain/round/round.entity'
import { ApiProperty } from '@nestjs/swagger'

export class RoundDto {
	@ApiProperty({ format: 'uuid' })
	id!: string

	@ApiProperty({ description: 'Monotonic round counter.' })
	nonce!: number

	@ApiProperty({ enum: RoundStatus, enumName: 'RoundStatus' })
	status!: RoundStatus

	@ApiProperty({
		description: 'SHA-256 commitment of the server seed.',
	})
	hashCommitment!: string

	@ApiProperty({
		description: 'Pre-published client seed mixed into the crash-point HMAC.',
	})
	clientSeed!: string

	@ApiProperty({ format: 'date-time' })
	bettingEndsAt!: string

	@ApiProperty({ format: 'date-time', nullable: true, type: String })
	flyingStartedAt!: string | null

	@ApiProperty({ format: 'date-time', nullable: true, type: String })
	crashedAt!: string | null

	@ApiProperty({
		description: 'Exponential growth rate k for m(t) = exp(k * Δt).',
	})
	growthRate!: number

	@ApiProperty({
		description: 'Crash point in integer hundredths. Null until CRASHED.',
		nullable: true,
		type: Number,
		example: 250,
	})
	crashPointHundredths!: number | null

	@ApiProperty({
		description: 'Revealed server seed. Null until the round CRASHED.',
		nullable: true,
		type: String,
	})
	serverSeed!: string | null

	@ApiProperty({ type: [BetDto] })
	bets!: BetDto[]

	@ApiProperty({
		format: 'date-time',
		description:
			'Server timestamp captured when this payload was generated. Used by the frontend to align multiplier projections.',
	})
	serverTime!: string
}

export class RoundVerifyDto {
	@ApiProperty({ format: 'uuid' })
	roundId!: string

	@ApiProperty()
	nonce!: number

	@ApiProperty({ description: 'Revealed server seed.' })
	serverSeed!: string

	@ApiProperty()
	clientSeed!: string

	@ApiProperty()
	hashCommitment!: string

	@ApiProperty({ description: 'Crash point in integer hundredths.' })
	crashPointHundredths!: number
}

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
