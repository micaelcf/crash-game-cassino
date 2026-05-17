import 'reflect-metadata'

export interface RabbitHandle {
	url: string
	managementUrl: string
	username: string
	password: string
	container: null
}

const DEFAULT_RABBIT_USER = process.env.TEST_RABBITMQ_USER || 'admin'
const DEFAULT_RABBIT_PASS = process.env.TEST_RABBITMQ_PASSWORD || 'admin'
const DEFAULT_RABBIT_HOST = process.env.TEST_RABBITMQ_HOST || '127.0.0.1'
const DEFAULT_RABBIT_AMQP_PORT = process.env.TEST_RABBITMQ_AMQP_PORT || '5673'
const DEFAULT_RABBIT_MGMT_PORT = process.env.TEST_RABBITMQ_MGMT_PORT || '15673'
const DEFAULT_RABBIT_URL =
	process.env.TEST_RABBITMQ_URL ||
	`amqp://${DEFAULT_RABBIT_USER}:${DEFAULT_RABBIT_PASS}@${DEFAULT_RABBIT_HOST}:${DEFAULT_RABBIT_AMQP_PORT}`
const DEFAULT_RABBIT_MGMT_URL =
	process.env.TEST_RABBITMQ_MANAGEMENT_URL ||
	`http://${DEFAULT_RABBIT_HOST}:${DEFAULT_RABBIT_MGMT_PORT}`

export const startRabbit = async (): Promise<RabbitHandle> => {
	return {
		url: DEFAULT_RABBIT_URL,
		managementUrl: DEFAULT_RABBIT_MGMT_URL,
		username: DEFAULT_RABBIT_USER,
		password: DEFAULT_RABBIT_PASS,
		container: null,
	}
}

export const stopContainer = async (_handle: {
	container: unknown
}): Promise<void> => {
	// No-op: infra is managed by docker compose (profile "test").
}
