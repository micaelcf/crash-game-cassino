import { GetRoundVerifyQuery } from '@application/round/dtos/get-round-verify.query'
import { Round, RoundVerification } from '@domain/round/round.entity'
import { BaseRepository } from '@infrastructure/db/base.repository'
import { InjectRepository } from '@mikro-orm/nestjs'
import { Injectable, NotFoundException } from '@nestjs/common'

@Injectable()
export class GetRoundVerifyUseCase {
	constructor(
		@InjectRepository(Round)
		private readonly rounds: BaseRepository<Round>,
	) {}

	async execute(query: GetRoundVerifyQuery): Promise<RoundVerification> {
		const round = await this.rounds.findOne({ id: query.roundId })
		if (!round) {
			throw new NotFoundException(`Round ${query.roundId} not found`)
		}
		return round.verify()
	}
}
