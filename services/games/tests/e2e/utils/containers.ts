import 'reflect-metadata'

export interface RabbitHandle {
	url: string
	managementUrl: string
	username: string
	password: string
	container: null
}

export interface PgHandle {
	url: string
	container: null
}

const DEFAULT_PG_URL =
	process.env.TEST_DATABASE_URL_GAMES ||
	process.env.TEST_DATABASE_URL ||
	'postgresql://admin:admin@127.0.0.1:5432/games_test'

const DEFAULT_RABBIT_USER = process.env.TEST_RABBITMQ_USER || 'admin'
const DEFAULT_RABBIT_PASS = process.env.TEST_RABBITMQ_PASSWORD || 'admin'
const DEFAULT_RABBIT_HOST = process.env.TEST_RABBITMQ_HOST || '127.0.0.1'
const DEFAULT_RABBIT_AMQP_PORT = process.env.TEST_RABBITMQ_AMQP_PORT || '5672'
const DEFAULT_RABBIT_MGMT_PORT = process.env.TEST_RABBITMQ_MGMT_PORT || '15672'
const DEFAULT_RABBIT_URL =
	process.env.TEST_RABBITMQ_URL ||
	`amqp://${DEFAULT_RABBIT_USER}:${DEFAULT_RABBIT_PASS}@${DEFAULT_RABBIT_HOST}:${DEFAULT_RABBIT_AMQP_PORT}`
const DEFAULT_RABBIT_MGMT_URL =
	process.env.TEST_RABBITMQ_MANAGEMENT_URL ||
	`http://${DEFAULT_RABBIT_HOST}:${DEFAULT_RABBIT_MGMT_PORT}`

export const startPostgres = async (): Promise<PgHandle> => {
	return { url: DEFAULT_PG_URL, container: null }
}

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
