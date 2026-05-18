import { WalletDebitFailedCommand } from '@application/bet/dtos/wallet-debit-failed.command'
import { WalletDebitedCommand } from '@application/bet/dtos/wallet-debited.command'
import { MikroORM, RequestContext } from '@mikro-orm/core'
import { Controller } from '@nestjs/common'
import { CommandBus } from '@nestjs/cqrs'
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices'

interface WalletDebitedPayload {
	betId: string
	playerId?: string
	amount?: string
}

interface WalletDebitFailedPayload {
	betId: string
	reason?: string
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
export class GamesConsumer {
	constructor(
		private readonly commandBus: CommandBus,
		private readonly orm: MikroORM,
	) {}

	@EventPattern('wallet.debited')
	async onWalletDebited(
		@Payload() data: WalletDebitedPayload,
		@Ctx() ctx: RmqContext,
	) {
		const messageId = messageIdOf(ctx, data)
		await RequestContext.create(this.orm.em, () =>
			this.commandBus.execute(new WalletDebitedCommand(messageId, data.betId)),
		)
	}

	@EventPattern('wallet.debit_failed')
	async onWalletDebitFailed(
		@Payload() data: WalletDebitFailedPayload,
		@Ctx() ctx: RmqContext,
	) {
		const messageId = messageIdOf(ctx, data)
		await RequestContext.create(this.orm.em, () =>
			this.commandBus.execute(
				new WalletDebitFailedCommand(
					messageId,
					data.betId,
					data.reason ?? 'unknown',
				),
			),
		)
	}
}
