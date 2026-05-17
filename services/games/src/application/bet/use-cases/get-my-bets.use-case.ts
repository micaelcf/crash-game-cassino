import { InjectRepository } from '@mikro-orm/nestjs'
import { Injectable } from '@nestjs/common'
import { Bet } from '../../../domain/bet/bet.entity'
import { BaseRepository } from '../../../infrastructure/db/base.repository'
import { PagedResult } from '../../shared/paged-result'
import { GetMyBetsQuery } from '../queries/get-my-bets.query'
import { BetView, betToView } from '../views/bet-view.dto'

@Injectable()
export class GetMyBetsUseCase {
	constructor(
		@InjectRepository(Bet)
		private readonly bets: BaseRepository<Bet>,
	) {}

	async execute(query: GetMyBetsQuery): Promise<PagedResult<BetView>> {
		const [bets, total] = await this.bets.findAndCount(
			{ userId: query.userId },
			{
				orderBy: { createdAt: 'desc' },
				offset: (query.page - 1) * query.pageSize,
				limit: query.pageSize,
			},
		)
		return {
			items: bets.map(betToView),
			page: query.page,
			pageSize: query.pageSize,
			total,
		}
	}
}
