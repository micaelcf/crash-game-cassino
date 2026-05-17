import { randomUUID } from 'node:crypto';
import amqp, { type Channel, type ConsumeMessage } from 'amqplib';
import {
  declareTopology,
  type RabbitTopology,
} from '../../../src/infrastructure/messaging/amqp/topology';

export interface BrokerProbe {
  connection: any;
  channel: Channel;
  close: () => Promise<void>;
}

export const openBrokerProbe = async (
  rabbitUrl: string,
  probeQueueName: string,
  routingKeys: string[],
  topology: RabbitTopology,
): Promise<BrokerProbe> => {
  const connection = await amqp.connect(rabbitUrl);
  const channel = await connection.createChannel();
  await declareTopology(channel, topology);

  await channel.assertQueue(probeQueueName, {
    durable: false,
    autoDelete: true,
    exclusive: false,
  });
  for (const key of routingKeys) {
    await channel.bindQueue(probeQueueName, topology.exchange, key);
  }

  return {
    connection,
    channel,
    close: async () => {
      try {
        await channel.close();
      } catch {
        /* ignore */
      }
      await connection.close();
    },
  };
};

export const publishEvent = async (
  channel: Channel,
  exchange: string,
  routingKey: string,
  payload: unknown,
  messageId: string = randomUUID(),
): Promise<string> => {
  channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(payload)), {
    contentType: 'application/json',
    persistent: true,
    messageId,
  });
  return messageId;
};

export interface CapturedMessage {
  routingKey: string;
  messageId: string;
  payload: any;
  raw: ConsumeMessage;
}

export const waitForEvent = async (
  channel: Channel,
  queue: string,
  predicate: (msg: CapturedMessage) => boolean,
  timeoutMs = 5_000,
): Promise<CapturedMessage> => {
  return new Promise<CapturedMessage>((resolve, reject) => {
    let consumerTag: string | undefined;
    const timer = setTimeout(async () => {
      if (consumerTag) {
        try {
          await channel.cancel(consumerTag);
        } catch {
          /* ignore */
        }
      }
      reject(new Error(`Timeout waiting for event on ${queue}`));
    }, timeoutMs);

    channel
      .consume(
        queue,
        async (msg) => {
          if (!msg) return;
          try {
            const payload = JSON.parse(msg.content.toString());
            const captured: CapturedMessage = {
              routingKey: msg.fields.routingKey,
              messageId: msg.properties.messageId ?? '',
              payload,
              raw: msg,
            };
            channel.ack(msg);
            if (predicate(captured)) {
              clearTimeout(timer);
              if (consumerTag) {
                try {
                  await channel.cancel(consumerTag);
                } catch {
                  /* ignore */
                }
              }
              resolve(captured);
            }
          } catch (err) {
            clearTimeout(timer);
            reject(err);
          }
        },
        { noAck: false },
      )
      .then((reply) => {
        consumerTag = reply.consumerTag;
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
};

export const drainQueue = async (
  channel: Channel,
  queue: string,
): Promise<void> => {
  await channel.purgeQueue(queue);
};
