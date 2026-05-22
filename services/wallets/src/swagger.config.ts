import { DocumentBuilder } from '@nestjs/swagger'

export const buildSwaggerConfig = () =>
	new DocumentBuilder()
		.setTitle('Wallets Service')
		.setDescription('Player wallet management API for Crash Game.')
		.setVersion('0.1.0')
		.addServer('/wallets', 'Kong gateway route')
		.addServer('http://localhost:4002', 'Direct (development only)')
		.addBearerAuth(
			{ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
			'logto',
		)
		.build()
