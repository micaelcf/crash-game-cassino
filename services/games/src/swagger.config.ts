import { DocumentBuilder } from '@nestjs/swagger'

export const buildSwaggerConfig = () =>
	new DocumentBuilder()
		.setTitle('Games Service')
		.setDescription('Crash Game engine API: rounds, bets, provably fair.')
		.setVersion('0.1.0')
		.addServer('/games', 'Kong gateway route')
		.addServer('http://localhost:4001', 'Direct (development only)')
		.addBearerAuth(
			{ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
			'logto',
		)
		.build()
