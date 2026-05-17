import { InjectRepository } from '@mikro-orm/nestjs'
import { Injectable } from '@nestjs/common'
import { Bet } from '../../../domain/bet/bet.entity'
import { BaseRepository } from '../../../infrastructure/db/base.repository'
import { PagedResult } from '../../shared/paged-result'
import { BetDto, toBetDto } from '../dtos/bet.dto'
import { GetMyBetsQuery } from '../dtos/get-my-bets.query'

@Injectable()
export class GetMyBetsUseCase {
	constructor(
		@InjectRepository(Bet)
		private readonly bets: BaseRepository<Bet>,
	) {}

	async execute(query: GetMyBetsQuery): Promise<PagedResult<BetDto>> {
		const [bets, total] = await this.bets.findAndCount(
			{ userId: query.userId },
			{
				orderBy: { createdAt: 'desc' },
				offset: (query.page - 1) * query.pageSize,
				limit: query.pageSize,
			},
		)
		return {
			items: bets.map(toBetDto),
			page: query.page,
			pageSize: query.pageSize,
			total,
		}
	}
}
