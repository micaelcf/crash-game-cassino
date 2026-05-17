import { InjectRepository } from '@mikro-orm/nestjs'
import { Injectable, NotFoundException } from '@nestjs/common'
import {
	Round,
	type RoundVerification,
} from '../../../domain/round/round.entity'
import { BaseRepository } from '../../../infrastructure/db/base.repository'
import { GetRoundVerifyQuery } from '../queries/get-round-verify.query'

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
