import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import amqpManager, { AmqpConnectionManager, ChannelWrapper } from 'amqp-connection-manager';
import type { Channel, ConfirmChannel } from 'amqplib';
import { RabbitPublisher } from './rabbit-publisher';
import { declareTopology, RabbitTopology } from './topology';

@Injectable()
export class AmqpConnection implements RabbitPublisher, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AmqpConnection.name);
  private manager!: AmqpConnectionManager;
  private channel!: ChannelWrapper;

  constructor(
    private readonly url: string,
    private readonly topology: RabbitTopology,
  ) {}

  async onModuleInit(): Promise<void> {
    this.manager = amqpManager.connect([this.url]);
    this.manager.on('connect', () => this.logger.log(`connected to ${this.url}`));
    this.manager.on('disconnect', ({ err }) => this.logger.warn(`disconnected: ${err?.message}`));

    this.channel = this.manager.createChannel({
      json: false,
      setup: (ch: ConfirmChannel) => declareTopology(ch as unknown as Channel, this.topology),
    });

    await this.channel.waitForConnect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close();
    await this.manager?.close();
  }

  async publish(
    exchange: string,
    routingKey: string,
    payload: unknown,
    options: { messageId: string; persistent?: boolean },
  ): Promise<void> {
    await this.channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(payload)), {
      contentType: 'application/json',
      persistent: options.persistent ?? true,
      messageId: options.messageId,
    });
  }
}
