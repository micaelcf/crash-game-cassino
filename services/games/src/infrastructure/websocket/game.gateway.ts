import { GameMetrics } from '@infrastructure/observability/game-metrics'
import {
	BetCancelledPayload,
	BetCashedOutPayload,
	BetPlacedPayload,
	type GameBroadcaster,
	RoundBettingPayload,
	RoundCrashedPayload,
	RoundStartedPayload,
} from '@infrastructure/websocket/game.gateway.interface'
import { Injectable } from '@nestjs/common'
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets'
import { type Server } from 'socket.io'

@Injectable()
@WebSocketGateway({ cors: { origin: '*' } })
export class GameGateway implements GameBroadcaster {
	@WebSocketServer()
	server!: Server

	constructor(private readonly metrics: GameMetrics) {}

	private timed(event: string, fn: () => void): void {
		const stop = this.metrics.timeWsEmit(event)
		try {
			fn()
		} finally {
			stop()
		}
	}

	emitRoundBetting(payload: RoundBettingPayload): void {
		this.timed('round.betting', () =>
			this.server.emit('round.betting', payload),
		)
	}

	emitRoundStarted(payload: RoundStartedPayload): void {
		this.timed('round.started', () =>
			this.server.emit('round.started', payload),
		)
	}

	emitRoundCrashed(payload: RoundCrashedPayload): void {
		this.timed('round.crashed', () =>
			this.server.emit('round.crashed', payload),
		)
	}

	emitBetPlaced(payload: BetPlacedPayload): void {
		this.timed('bet.placed', () => this.server.emit('bet.placed', payload))
	}

	emitBetCashedOut(payload: BetCashedOutPayload): void {
		this.timed('bet.cashed_out', () =>
			this.server.emit('bet.cashed_out', payload),
		)
	}

	emitBetCancelled(payload: BetCancelledPayload): void {
		this.timed('bet.cancelled', () =>
			this.server.emit('bet.cancelled', payload),
		)
	}
}
