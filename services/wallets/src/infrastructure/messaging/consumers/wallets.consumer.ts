import { CreditWalletCommand } from '@application/wallet/dtos/credit-wallet.command'
import { DebitWalletCommand } from '@application/wallet/dtos/debit-wallet.command'
import { MikroORM, RequestContext } from '@mikro-orm/core'
import { Controller } from '@nestjs/common'
import { CommandBus } from '@nestjs/cqrs'
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices'

interface BetPlacedPayload {
	userId: string
	roundId: string
	betId: string
	betAmount?: string
	amount?: string
}

interface PlayerWonPayload {
	userId: string
	amount: string
}

const messageIdOf = (ctx: RmqContext, fallback: unknown): string => {
	const msg = ctx.getMessage()
	return (
		msg.properties.messageId ||
		msg.properties.correlationId ||
		Buffer.from(JSON.stringify(fallback)).toString('base64')
	)
}

@Controller()
export class WalletsConsumer {
	constructor(
		private readonly commandBus: CommandBus,
		private readonly orm: MikroORM,
	) {}

	@EventPattern('bet.placed')
	async onBetPlaced(@Payload() data: BetPlacedPayload, @Ctx() ctx: RmqContext) {
		const messageId = messageIdOf(ctx, data)
		const amount = data.betAmount ?? data.amount
		if (amount === undefined) {
			throw new Error('bet.placed payload missing betAmount/amount')
		}
		if (!data.betId) {
			throw new Error('bet.placed payload missing betId')
		}
		await RequestContext.create(this.orm.em, () =>
			this.commandBus.execute(
				new DebitWalletCommand(
					messageId,
					data.userId,
					BigInt(amount),
					data.roundId,
					data.betId,
				),
			),
		)
	}

	@EventPattern('player.won')
	async onPlayerWon(@Payload() data: PlayerWonPayload, @Ctx() ctx: RmqContext) {
		const messageId = messageIdOf(ctx, data)
		await RequestContext.create(this.orm.em, () =>
			this.commandBus.execute(
				new CreditWalletCommand(messageId, data.userId, BigInt(data.amount)),
			),
		)
	}
}
