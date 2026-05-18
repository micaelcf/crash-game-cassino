import { GameGateway } from '@infrastructure/websocket/game.gateway'
import { GAME_BROADCASTER } from '@infrastructure/websocket/game.gateway.interface'
import { Module } from '@nestjs/common'

@Module({
	providers: [
		GameGateway,
		{ provide: GAME_BROADCASTER, useExisting: GameGateway },
	],
	exports: [GAME_BROADCASTER],
})
export class WebsocketModule {}
