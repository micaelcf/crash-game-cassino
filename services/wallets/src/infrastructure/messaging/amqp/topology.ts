import type { Channel } from 'amqplib';

export interface RabbitTopology {
  exchange: string;
  exchangeType: 'topic' | 'direct' | 'fanout';
  deadLetterExchange?: string;
  queues: Array<{
    name: string;
    routingKeys: string[];
    deadLetter?: boolean;
  }>;
}

export const WALLETS_TOPOLOGY: RabbitTopology = {
  exchange: 'crash.events',
  exchangeType: 'topic',
  deadLetterExchange: 'crash.events.dlx',
  queues: [
    {
      name: 'wallets.events',
      routingKeys: ['bet.placed', 'player.won'],
      deadLetter: true,
    },
  ],
};

export const declareTopology = async (
  channel: Channel,
  topology: RabbitTopology,
): Promise<void> => {
  await channel.assertExchange(topology.exchange, topology.exchangeType, {
    durable: true,
  });

  if (topology.deadLetterExchange) {
    await channel.assertExchange(topology.deadLetterExchange, 'topic', {
      durable: true,
    });
  }

  for (const q of topology.queues) {
    const args: Record<string, unknown> = {};
    if (q.deadLetter && topology.deadLetterExchange) {
      args['x-dead-letter-exchange'] = topology.deadLetterExchange;
    }
    await channel.assertQueue(q.name, { durable: true, arguments: args });
    for (const key of q.routingKeys) {
      await channel.bindQueue(q.name, topology.exchange, key);
    }
  }
};
