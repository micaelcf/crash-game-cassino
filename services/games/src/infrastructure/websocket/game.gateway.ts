import { Injectable } from '@nestjs/common'
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets'
import type { Server } from 'socket.io'
import type {
	BetCashedOutPayload,
	BetPlacedPayload,
	GameBroadcaster,
	RoundBettingPayload,
	RoundCrashedPayload,
	RoundStartedPayload,
} from './game.gateway.interface'

@Injectable()
@WebSocketGateway({ cors: { origin: '*' } })
export class GameGateway implements GameBroadcaster {
	@WebSocketServer()
	server!: Server

	emitRoundBetting(payload: RoundBettingPayload): void {
		this.server.emit('round.betting', payload)
	}

	emitRoundStarted(payload: RoundStartedPayload): void {
		this.server.emit('round.started', payload)
	}

	emitRoundCrashed(payload: RoundCrashedPayload): void {
		this.server.emit('round.crashed', payload)
	}

	emitBetPlaced(payload: BetPlacedPayload): void {
		this.server.emit('bet.placed', payload)
	}

	emitBetCashedOut(payload: BetCashedOutPayload): void {
		this.server.emit('bet.cashed_out', payload)
	}
}
