import { InjectRepository } from '@mikro-orm/nestjs'
import { Inject, Injectable } from '@nestjs/common'
import { Bet, BetStatus } from '../../../domain/bet/bet.entity'
import { NoActiveBetException } from '../../../domain/bet/bet.exceptions'
import { Round, RoundStatus } from '../../../domain/round/round.entity'
import { RoundNotFlyingException } from '../../../domain/round/round.exceptions'
import { CLOCK, type Clock } from '../../../domain/shared/clock'
import { BaseRepository } from '../../../infrastructure/db/base.repository'
import { EventPublisher } from '../../../infrastructure/messaging/outbox/event-publisher.service'
import { CashOutCommand } from '../commands/cash-out.command'

@Injectable()
export class CashOutUseCase {
	constructor(
		@InjectRepository(Round)
		private readonly rounds: BaseRepository<Round>,
		@InjectRepository(Bet)
		private readonly bets: BaseRepository<Bet>,
		private readonly events: EventPublisher,
		@Inject(CLOCK) private readonly clock: Clock,
	) {}

	async execute(command: CashOutCommand): Promise<Bet> {
		const round = await this.rounds.findOne(
			{},
			{ orderBy: { createdAt: 'desc' } },
		)

		if (!round) throw new RoundNotFlyingException()
		if (round.status !== RoundStatus.FLYING) {
			throw new RoundNotFlyingException(round.id)
		}

		const bet = await this.bets.findOne({
			roundId: round.id,
			userId: command.userId,
		})

		if (!bet || bet.status !== BetStatus.CONFIRMED) {
			throw new NoActiveBetException(command.userId, round.id)
		}

		const multiplier = round.currentMultiplierHundredths(this.clock.now())
		bet.markWon(multiplier)

		this.events.publish('player.won', 'Bet', bet.id, {
			userId: command.userId,
			roundId: round.id,
			betId: bet.id,
			multiplierHundredths: multiplier,
			amount: bet.payoutCents!.toString(),
		})

		await this.bets.flush()
		return bet
	}
}
