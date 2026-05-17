import 'reflect-metadata'
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers'

export interface RabbitHandle {
	url: string
	managementUrl: string
	username: string
	password: string
	container: StartedTestContainer
}

export const startRabbit = async (): Promise<RabbitHandle> => {
	const username = 'admin'
	const password = 'admin'
	const container = await new GenericContainer(
		'rabbitmq:4.2.4-management-alpine',
	)
		.withEnvironment({
			RABBITMQ_DEFAULT_USER: username,
			RABBITMQ_DEFAULT_PASS: password,
		})
		.withExposedPorts(5672, 15672)
		.withWaitStrategy(Wait.forLogMessage(/Server startup complete/))
		.withStartupTimeout(120_000)
		.start()

	const amqpPort = container.getMappedPort(5672)
	const mgmtPort = container.getMappedPort(15672)
	const host = container.getHost()

	return {
		url: `amqp://${username}:${password}@${host}:${amqpPort}`,
		managementUrl: `http://${host}:${mgmtPort}`,
		username,
		password,
		container,
	}
}

export const stopContainer = async (handle: {
	container: StartedTestContainer
}) => {
	await handle.container.stop({ timeout: 10_000 })
}
