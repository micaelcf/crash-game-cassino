import { GetRoundHistoryQuery } from '@application/round/dtos/get-round-history.query'
import { RoundDto, toRoundDto } from '@application/round/dtos/round.dto'
import { type PagedResult, paginate } from '@application/shared/paged-result'
import { Round, RoundStatus } from '@domain/round/round.entity'
import { CLOCK, type Clock } from '@domain/shared/clock'
import { BaseRepository } from '@infrastructure/db/base.repository'
import { InjectRepository } from '@mikro-orm/nestjs'
import { Inject, Injectable } from '@nestjs/common'

@Injectable()
export class GetRoundHistoryUseCase {
	constructor(
		@InjectRepository(Round)
		private readonly rounds: BaseRepository<Round>,
		@Inject(CLOCK) private readonly clock: Clock,
	) {}

	execute(query: GetRoundHistoryQuery): Promise<PagedResult<RoundDto>> {
		const now = this.clock.now()
		return paginate(
			this.rounds,
			{ status: RoundStatus.CRASHED },
			{
				page: query.page,
				pageSize: query.pageSize,
				orderBy: { crashedAt: 'desc', id: 'desc' },
			},
			(r) => toRoundDto(r, [], now),
		)
	}
}
