import { BetDto, toBetDto } from '@application/bet/dtos/bet.dto'
import { GetMyBetsQuery } from '@application/bet/dtos/get-my-bets.query'
import { type PagedResult, paginate } from '@application/shared/paged-result'
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

	execute(query: GetMyBetsQuery): Promise<PagedResult<BetDto>> {
		return paginate(
			this.bets,
			{ userId: query.userId },
			{
				page: query.page,
				pageSize: query.pageSize,
				orderBy: { createdAt: 'desc', id: 'desc' },
			},
			toBetDto,
		)
	}
}
