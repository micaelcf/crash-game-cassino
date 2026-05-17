import { MikroORM, RequestContext } from '@mikro-orm/core';
import { Controller } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  Ctx,
  EventPattern,
  Payload,
  type RmqContext,
} from '@nestjs/microservices';
import { WalletDebitFailedCommand } from '../../../application/bet/dtos/wallet-debit-failed.command';
import { WalletDebitedCommand } from '../../../application/bet/dtos/wallet-debited.command';

const messageIdOf = (ctx: RmqContext, fallback: unknown): string => {
  const msg = ctx.getMessage();
  return (
    msg.properties.messageId ||
    msg.properties.correlationId ||
    Buffer.from(JSON.stringify(fallback)).toString('base64')
  );
};

@Controller()
export class GamesConsumer {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly orm: MikroORM,
  ) {}

  @EventPattern('wallet.debited')
  async onWalletDebited(@Payload() data: any, @Ctx() ctx: RmqContext) {
    const messageId = messageIdOf(ctx, data);
    await RequestContext.create(this.orm.em, () =>
      this.commandBus.execute(new WalletDebitedCommand(messageId, data.betId)),
    );
  }

  @EventPattern('wallet.debit_failed')
  async onWalletDebitFailed(@Payload() data: any, @Ctx() ctx: RmqContext) {
    const messageId = messageIdOf(ctx, data);
    await RequestContext.create(this.orm.em, () =>
      this.commandBus.execute(
        new WalletDebitFailedCommand(
          messageId,
          data.betId,
          data.reason ?? 'unknown',
        ),
      ),
    );
  }
}
