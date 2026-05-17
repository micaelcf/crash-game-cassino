import { InjectRepository } from '@mikro-orm/nestjs'
import { Injectable } from '@nestjs/common'
import { Bet } from '../../../domain/bet/bet.entity'
import { Round } from '../../../domain/round/round.entity'
import { BaseRepository } from '../../../infrastructure/db/base.repository'
import { type RoundView, roundToView } from '../views/round-view.dto'

@Injectable()
export class GetCurrentRoundUseCase {
	constructor(
		@InjectRepository(Round)
		private readonly rounds: BaseRepository<Round>,
		@InjectRepository(Bet)
		private readonly bets: BaseRepository<Bet>,
	) {}

	async execute(): Promise<RoundView | null> {
		const round = await this.rounds.findOne(
			{},
			{ orderBy: { createdAt: 'desc' } },
		)
		if (!round) return null
		const bets = await this.bets.find(
			{ roundId: round.id },
			{ orderBy: { createdAt: 'asc' } },
		)
		return roundToView(round, bets)
	}
}
