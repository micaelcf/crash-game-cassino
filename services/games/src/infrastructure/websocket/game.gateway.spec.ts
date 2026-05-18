import { GameMetrics } from '@infrastructure/observability/game-metrics'
import { GameGateway } from '@infrastructure/websocket/game.gateway'
import { Registry } from 'prom-client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('GameGateway', () => {
	let server: { emit: ReturnType<typeof vi.fn> }
	let gateway: GameGateway
	let registry: Registry

	beforeEach(() => {
		server = { emit: vi.fn() }
		registry = new Registry()
		gateway = new GameGateway(new GameMetrics(registry))
		gateway.server = server as unknown as GameGateway['server']
	})

	it('broadcasts round.betting', () => {
		gateway.emitRoundBetting({
			roundId: 'r1',
			hashCommitment: 'h',
			bettingEndsAt: 't',
		})
		expect(server.emit).toHaveBeenCalledWith('round.betting', {
			roundId: 'r1',
			hashCommitment: 'h',
			bettingEndsAt: 't',
		})
	})

	it('broadcasts round.started', () => {
		gateway.emitRoundStarted({
			roundId: 'r1',
			startTime: 't',
			growthRate: 0.06,
		})
		expect(server.emit).toHaveBeenCalledWith('round.started', {
			roundId: 'r1',
			startTime: 't',
			growthRate: 0.06,
		})
	})

	it('broadcasts round.crashed', () => {
		gateway.emitRoundCrashed({
			roundId: 'r1',
			crashPointHundredths: 234,
			serverSeed: 's',
			clientSeed: 'c',
			nonce: 1,
		})
		expect(server.emit).toHaveBeenCalledWith(
			'round.crashed',
			expect.objectContaining({ roundId: 'r1', crashPointHundredths: 234 }),
		)
	})

	it('broadcasts bet.placed', () => {
		gateway.emitBetPlaced({
			roundId: 'r1',
			betId: 'b1',
			userId: 'u1',
			username: 'alice',
			amountCents: '1000',
		})
		expect(server.emit).toHaveBeenCalledWith(
			'bet.placed',
			expect.objectContaining({ betId: 'b1', amountCents: '1000' }),
		)
	})

	it('broadcasts bet.cashed_out', () => {
		gateway.emitBetCashedOut({
			roundId: 'r1',
			betId: 'b1',
			userId: 'u1',
			username: 'alice',
			multiplierHundredths: 150,
			payoutCents: '1500',
		})
		expect(server.emit).toHaveBeenCalledWith(
			'bet.cashed_out',
			expect.objectContaining({
				multiplierHundredths: 150,
				payoutCents: '1500',
			}),
		)
	})

	it('broadcasts bet.cancelled', () => {
		gateway.emitBetCancelled({
			roundId: 'r1',
			betId: 'b1',
			userId: 'u1',
			reason: 'Insufficient balance',
		})
		expect(server.emit).toHaveBeenCalledWith('bet.cancelled', {
			roundId: 'r1',
			betId: 'b1',
			userId: 'u1',
			reason: 'Insufficient balance',
		})
	})

	it('records crash_ws_emit_duration_ms labelled by event name', async () => {
		gateway.emitRoundBetting({
			roundId: 'r1',
			hashCommitment: 'h',
			bettingEndsAt: 't',
		})
		const hist = await registry
			.getSingleMetric('crash_ws_emit_duration_ms')
			?.get()
		const count = hist?.values.find(
			(v) =>
				(v as { metricName?: string }).metricName ===
					'crash_ws_emit_duration_ms_count' &&
				(v.labels as { event?: string }).event === 'round.betting',
		)
		expect(count?.value).toBe(1)
	})
})
