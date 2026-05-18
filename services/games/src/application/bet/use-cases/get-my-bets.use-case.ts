import { BetDto, toBetDto } from '@application/bet/dtos/bet.dto'
import { GetMyBetsQuery } from '@application/bet/dtos/get-my-bets.query'
import { PagedResult } from '@application/shared/paged-result'
import { Bet } from '@domain/bet/bet.entity'
import { BaseRepository } from '@infrastructure/db/base.repository'
import { InjectRepository } from '@mikro-orm/nestjs'
import { Injectable } from '@nestjs/common'

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
