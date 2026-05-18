import { RoundDto, toRoundDto } from '@application/round/dtos/round.dto'
import { Bet } from '@domain/bet/bet.entity'
import { Round } from '@domain/round/round.entity'
import { BaseRepository } from '@infrastructure/db/base.repository'
import { InjectRepository } from '@mikro-orm/nestjs'
import { Injectable } from '@nestjs/common'

@Injectable()
export class GetCurrentRoundUseCase {
	constructor(
		@InjectRepository(Round)
		private readonly rounds: BaseRepository<Round>,
		@InjectRepository(Bet)
		private readonly bets: BaseRepository<Bet>,
	) {}

	async execute(): Promise<RoundDto | null> {
		const [round] = await this.rounds.findAll({
			orderBy: { createdAt: 'desc' },
			limit: 1,
		})
		if (!round) return null
		const bets = await this.bets.find(
			{ roundId: round.id },
			{ orderBy: { createdAt: 'asc' } },
		)
		return toRoundDto(round, bets)
	}
}
