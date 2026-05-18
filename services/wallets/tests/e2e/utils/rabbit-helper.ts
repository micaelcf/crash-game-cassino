import { randomUUID } from 'node:crypto'
import {
	declareTopology,
	type RabbitTopology,
} from '@infrastructure/messaging/amqp/topology'
import amqp, {
	type ChannelModel,
	type Channel,
	type ConsumeMessage,
} from 'amqplib'

export interface BrokerProbe {
	connection: ChannelModel
	channel: Channel
	close: () => Promise<void>
}

/**
 * Opens a separate amqp connection for the test driver: publishes inbound
 * events and consumes from a dedicated probe queue bound to the desired
 * routing keys, so the test can assert outbound events emitted by the app.
 */
export const openBrokerProbe = async (
	rabbitUrl: string,
	probeQueueName: string,
	routingKeys: string[],
	topology: RabbitTopology,
): Promise<BrokerProbe> => {
	const connection = await amqp.connect(rabbitUrl)
	const channel = await connection.createChannel()
	await declareTopology(channel, topology)

	await channel.assertQueue(probeQueueName, {
		durable: true,
		autoDelete: false,
		exclusive: false,
	})
	await channel.purgeQueue(probeQueueName)
	for (const key of routingKeys) {
		await channel.bindQueue(probeQueueName, topology.exchange, key)
	}

	return {
		connection,
		channel,
		close: async () => {
			try {
				await channel.close()
			} catch {
				/* ignore */
			}
			await connection.close()
		},
	}
}

export const publishEvent = async (
	channel: Channel,
	exchange: string,
	routingKey: string,
	payload: unknown,
	messageId: string = randomUUID(),
): Promise<string> => {
	const envelope = { pattern: routingKey, data: payload }
	channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(envelope)), {
		contentType: 'application/json',
		persistent: true,
		messageId,
	})
	return messageId
}

export interface CapturedMessage<P = Record<string, unknown>> {
	routingKey: string
	messageId: string
	payload: P
	raw: ConsumeMessage
}

export const waitForEvent = async <P = Record<string, unknown>>(
	channel: Channel,
	queue: string,
	predicate: (msg: CapturedMessage<P>) => boolean,
	timeoutMs = 5_000,
): Promise<CapturedMessage<P>> => {
	return new Promise<CapturedMessage<P>>((resolve, reject) => {
		let consumerTag: string | undefined
		const timer = setTimeout(async () => {
			if (consumerTag) {
				try {
					await channel.cancel(consumerTag)
				} catch {
					/* ignore */
				}
			}
			reject(new Error(`Timeout waiting for event on ${queue}`))
		}, timeoutMs)

		channel
			.consume(
				queue,
				async (msg) => {
					if (!msg) return
					try {
						const body = JSON.parse(msg.content.toString()) as
							| { data?: unknown }
							| unknown
						const payload =
							body && typeof body === 'object' && 'data' in body
								? (body as { data: unknown }).data
								: body
						const captured: CapturedMessage<P> = {
							routingKey: msg.fields.routingKey,
							messageId: msg.properties.messageId ?? '',
							payload: payload as P,
							raw: msg,
						}
						channel.ack(msg)
						if (predicate(captured)) {
							clearTimeout(timer)
							if (consumerTag) {
								try {
									await channel.cancel(consumerTag)
								} catch {
									/* ignore */
								}
							}
							resolve(captured)
						}
					} catch (err) {
						clearTimeout(timer)
						reject(err)
					}
				},
				{ noAck: false },
			)
			.then((reply) => {
				consumerTag = reply.consumerTag
			})
			.catch((err) => {
				clearTimeout(timer)
				reject(err)
			})
	})
}

export const drainQueue = async (
	channel: Channel,
	queue: string,
): Promise<void> => {
	await channel.purgeQueue(queue)
}
