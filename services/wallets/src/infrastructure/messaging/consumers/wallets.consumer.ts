import { MikroORM, RequestContext } from '@mikro-orm/core';
import { Controller } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  Ctx,
  EventPattern,
  Payload,
  type RmqContext,
} from '@nestjs/microservices';
import { CreditWalletCommand } from '../../../application/wallet/dtos/credit-wallet.command';
import { DebitWalletCommand } from '../../../application/wallet/dtos/debit-wallet.command';

const messageIdOf = (ctx: RmqContext, fallback: unknown): string => {
  const msg = ctx.getMessage();
  return (
    msg.properties.messageId ||
    msg.properties.correlationId ||
    Buffer.from(JSON.stringify(fallback)).toString('base64')
  );
};

@Controller()
export class WalletsConsumer {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly orm: MikroORM,
  ) {}

  @EventPattern('bet.placed')
  async onBetPlaced(@Payload() data: any, @Ctx() ctx: RmqContext) {
    const messageId = messageIdOf(ctx, data);
    await RequestContext.create(this.orm.em, () =>
      this.commandBus.execute(
        new DebitWalletCommand(
          messageId,
          data.userId,
          BigInt(data.betAmount ?? data.amount),
          data.roundId,
        ),
      ),
    );
  }

  @EventPattern('player.won')
  async onPlayerWon(@Payload() data: any, @Ctx() ctx: RmqContext) {
    const messageId = messageIdOf(ctx, data);
    await RequestContext.create(this.orm.em, () =>
      this.commandBus.execute(
        new CreditWalletCommand(messageId, data.userId, BigInt(data.amount)),
      ),
    );
  }
}
