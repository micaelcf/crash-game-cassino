import { CashOutCommand } from '@application/bet/dtos/cash-out.command'
import { Bet, BetStatus } from '@domain/bet/bet.entity'
import { NoActiveBetException } from '@domain/bet/bet.exceptions'
import { Round, RoundStatus } from '@domain/round/round.entity'
import { RoundNotFlyingException } from '@domain/round/round.exceptions'
import { CLOCK, type Clock } from '@domain/shared/clock'
import { BaseRepository } from '@infrastructure/db/base.repository'
import { EventPublisher } from '@infrastructure/messaging/outbox/event-publisher.service'
import {
	GAME_BROADCASTER,
	type GameBroadcaster,
} from '@infrastructure/websocket/game.gateway.interface'
import { InjectRepository } from '@mikro-orm/nestjs'
import { Inject, Injectable } from '@nestjs/common'

@Injectable()
export class CashOutUseCase {
	constructor(
		@InjectRepository(Round)
		private readonly rounds: BaseRepository<Round>,
		@InjectRepository(Bet)
		private readonly bets: BaseRepository<Bet>,
		private readonly events: EventPublisher,
		@Inject(CLOCK) private readonly clock: Clock,
		@Inject(GAME_BROADCASTER)
		private readonly broadcaster: GameBroadcaster,
	) {}

	async execute(command: CashOutCommand): Promise<Bet> {
		const [round] = await this.rounds.findAll({
			orderBy: { createdAt: 'desc' },
			limit: 1,
		})

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
			amount: (bet.payoutCents ?? 0).toString(),
		})

		await this.bets.flush()

		this.broadcaster.emitBetCashedOut({
			roundId: round.id,
			betId: bet.id,
			userId: bet.userId,
			username: bet.username,
			multiplierHundredths: multiplier,
			payoutCents: (bet.payoutCents ?? 0).toString(),
		})

		return bet
	}
}
