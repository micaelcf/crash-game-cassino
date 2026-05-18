import { GetRoundHistoryQuery } from '@application/round/dtos/get-round-history.query'
import { RoundDto, toRoundDto } from '@application/round/dtos/round.dto'
import { PagedResult } from '@application/shared/paged-result'
import { Round, RoundStatus } from '@domain/round/round.entity'
import { BaseRepository } from '@infrastructure/db/base.repository'
import { InjectRepository } from '@mikro-orm/nestjs'
import { Injectable } from '@nestjs/common'

@Injectable()
export class GetRoundHistoryUseCase {
	constructor(
		@InjectRepository(Round)
		private readonly rounds: BaseRepository<Round>,
	) {}

	async execute(query: GetRoundHistoryQuery): Promise<PagedResult<RoundDto>> {
		const [rounds, total] = await this.rounds.findAndCount(
			{ status: RoundStatus.CRASHED },
			{
				orderBy: { crashedAt: 'desc' },
				offset: (query.page - 1) * query.pageSize,
				limit: query.pageSize,
			},
		)
		return {
			items: rounds.map((r) => toRoundDto(r, [])),
			page: query.page,
			pageSize: query.pageSize,
			total,
		}
	}
}
