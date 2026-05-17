import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import amqp from 'amqplib';
import { startRabbit, stopContainer, type RabbitHandle } from '../setup';
import {
  declareTopology,
  WALLETS_TOPOLOGY,
} from '../../../src/infrastructure/messaging/amqp/topology';

const skipIntegration = process.env.SKIP_INTEGRATION === '1';

describe.skipIf(skipIntegration)('rabbit topology', () => {
  let rabbit: RabbitHandle;

  beforeAll(async () => {
    rabbit = await startRabbit();
  }, 180_000);

  afterAll(async () => {
    if (rabbit) await stopContainer(rabbit);
  });

  it('asserts the crash.events exchange, wallets queue and routing key bindings', async () => {
    const conn = await amqp.connect(rabbit.url);
    const channel = await conn.createChannel();

    await declareTopology(channel, WALLETS_TOPOLOGY);

    const passive = await amqp.connect(rabbit.url);
    const passiveCh = await passive.createChannel();

    await expect(passiveCh.checkExchange('crash.events')).resolves.toBeTruthy();
    const queueInfo = await passiveCh.checkQueue('wallets.events');
    expect(queueInfo.queue).toBe('wallets.events');

    await channel.close();
    await conn.close();
    await passiveCh.close();
    await passive.close();
  });

  it('routes a message published with bet.placed to the wallets queue', async () => {
    const conn = await amqp.connect(rabbit.url);
    const channel = await conn.createChannel();
    await declareTopology(channel, WALLETS_TOPOLOGY);

    await channel.purgeQueue('wallets.events');

    channel.publish(
      'crash.events',
      'bet.placed',
      Buffer.from(JSON.stringify({ userId: 'p1', betAmount: '100', roundId: 'r1' })),
      { contentType: 'application/json', persistent: true },
    );

    const received = await new Promise<amqp.ConsumeMessage>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timeout')), 5_000);
      channel.consume(
        'wallets.events',
        (msg) => {
          if (!msg) return;
          clearTimeout(timer);
          channel.ack(msg);
          resolve(msg);
        },
        { noAck: false },
      );
    });

    const body = JSON.parse(received.content.toString());
    expect(body.userId).toBe('p1');
    expect(received.fields.routingKey).toBe('bet.placed');

    await channel.close();
    await conn.close();
  });
});
