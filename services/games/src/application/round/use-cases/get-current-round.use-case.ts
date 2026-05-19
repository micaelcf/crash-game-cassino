import { RoundDto, toRoundDto } from '@application/round/dtos/round.dto'
import { Bet } from '@domain/bet/bet.entity'
import { Round, RoundStatus } from '@domain/round/round.entity'
import { CLOCK, type Clock } from '@domain/shared/clock'
import { BaseRepository } from '@infrastructure/db/base.repository'
import { InjectRepository } from '@mikro-orm/nestjs'
import { Inject, Injectable } from '@nestjs/common'

const ACTIVE_STATUSES = [RoundStatus.BETTING_PHASE, RoundStatus.FLYING] as const

@Injectable()
export class GetCurrentRoundUseCase {
	constructor(
		@InjectRepository(Round)
		private readonly rounds: BaseRepository<Round>,
		@InjectRepository(Bet)
		private readonly bets: BaseRepository<Bet>,
		@Inject(CLOCK) private readonly clock: Clock,
	) {}

	async execute(): Promise<RoundDto | null> {
		const round = await this.rounds.findOne(
			{ status: { $in: [...ACTIVE_STATUSES] } },
			{ orderBy: { createdAt: 'desc' } },
		)
		const now = this.clock.now()
		if (!round) return null
		const bets = await this.bets.find(
			{ roundId: round.id },
			{ orderBy: { createdAt: 'asc' } },
		)
		return toRoundDto(round, bets, now)
	}
}
