import { InjectRepository } from '@mikro-orm/nestjs'
import { Injectable } from '@nestjs/common'
import { Bet } from '../../../domain/bet/bet.entity'
import {
	BetAmountOutOfRangeException,
	DuplicateBetException,
} from '../../../domain/bet/bet.exceptions'
import { Round, RoundStatus } from '../../../domain/round/round.entity'
import { RoundNotBettingException } from '../../../domain/round/round.exceptions'
import type { BaseRepository } from '../../../infrastructure/db/base.repository'
import { EventPublisher } from '../../../infrastructure/messaging/outbox/event-publisher.service'
import { MAX_BET_CENTS, MIN_BET_CENTS } from '../../bet-limits'
import type { PlaceBetCommand } from '../dtos/place-bet.command'

@Injectable()
export class PlaceBetUseCase {
	constructor(
		@InjectRepository(Round)
		private readonly rounds: BaseRepository<Round>,
		@InjectRepository(Bet)
		private readonly bets: BaseRepository<Bet>,
		private readonly events: EventPublisher,
	) {}

	async execute(command: PlaceBetCommand): Promise<Bet> {
		if (
			command.amountCents < MIN_BET_CENTS ||
			command.amountCents > MAX_BET_CENTS
		) {
			throw new BetAmountOutOfRangeException(
				command.amountCents,
				MIN_BET_CENTS,
				MAX_BET_CENTS,
			)
		}

		const [round] = await this.rounds.findAll({
			orderBy: { createdAt: 'desc' },
			limit: 1,
		})

		if (!round) {
			throw new Error('No active round available for betting')
		}

		if (round.status !== RoundStatus.BETTING_PHASE) {
			throw new RoundNotBettingException(round.id)
		}

		const existing = await this.bets.findOne({
			roundId: round.id,
			userId: command.userId,
		})
		if (existing) {
			throw new DuplicateBetException(command.userId, round.id)
		}

		const bet = this.bets.create({
			roundId: round.id,
			userId: command.userId,
			username: command.username,
			amountCents: command.amountCents,
		})

		this.events.publish('bet.placed', 'Bet', bet.id, {
			userId: command.userId,
			username: command.username,
			roundId: round.id,
			betId: bet.id,
			betAmount: command.amountCents.toString(),
		})

		await this.bets.flush()
		return bet
	}
}
