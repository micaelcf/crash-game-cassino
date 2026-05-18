import { Round, RoundStatus } from '@domain/round/round.entity'
import {
	RoundAlreadyCrashedException,
	RoundNotBettingException,
	RoundNotFlyingException,
} from '@domain/round/round.exceptions'
import { describe, expect, it } from 'vitest'

const K = 0.06
const BETTING_MS = 10_000

const newRound = (overrides: Partial<Round> = {}): Round => {
	const r = Object.create(Round.prototype) as Round
	const createdAt = (overrides.createdAt as Date) ?? new Date(1_000_000)
	Object.assign(r, {
		id: crypto.randomUUID(),
		nonce: 1,
		serverSeedHash: 'commit-hash',
		clientSeed: 'block-hash',
		crashPointHundredths: 234,
		growthRate: K,
		status: RoundStatus.BETTING_PHASE,
		createdAt,
		bettingEndsAt: new Date(createdAt.getTime() + BETTING_MS),
		flyingStartedAt: null,
		crashedAt: null,
		serverSeed: null,
		pendingServerSeed: null,
		...overrides,
	})
	return r
}

describe('Round entity', () => {
	it('opens in BETTING_PHASE', () => {
		const r = newRound()
		expect(r.status).toBe(RoundStatus.BETTING_PHASE)
		expect(r.serverSeed).toBeNull()
	})

	describe('startFlight', () => {
		it('transitions BETTING_PHASE → FLYING and records flyingStartedAt', () => {
			const r = newRound()
			r.startFlight(new Date(1_010_000))
			expect(r.status).toBe(RoundStatus.FLYING)
			expect(r.flyingStartedAt?.getTime()).toBe(1_010_000)
		})

		it('rejects when not in BETTING_PHASE', () => {
			const r = newRound()
			r.startFlight(new Date(1_010_000))
			expect(() => r.startFlight(new Date(1_010_001))).toThrow(
				RoundNotBettingException,
			)
		})
	})

	describe('crash', () => {
		it('transitions FLYING → CRASHED and exposes the server seed', () => {
			const r = newRound()
			r.startFlight(new Date(1_010_000))
			r.crash(new Date(1_020_000), 'revealed-seed')
			expect(r.status).toBe(RoundStatus.CRASHED)
			expect(r.serverSeed).toBe('revealed-seed')
			expect(r.crashedAt?.getTime()).toBe(1_020_000)
		})

		it('rejects when round is still in BETTING_PHASE', () => {
			const r = newRound()
			expect(() => r.crash(new Date(1_010_000), 'seed')).toThrow(
				RoundNotFlyingException,
			)
		})

		it('rejects a second crash', () => {
			const r = newRound()
			r.startFlight(new Date(1_010_000))
			r.crash(new Date(1_020_000), 'seed')
			expect(() => r.crash(new Date(1_021_000), 'seed-2')).toThrow(
				RoundAlreadyCrashedException,
			)
		})
	})

	describe('currentMultiplierHundredths', () => {
		it('returns 100 at t=0 of the flight', () => {
			const r = newRound()
			r.startFlight(new Date(1_010_000))
			expect(r.currentMultiplierHundredths(new Date(1_010_000))).toBe(100)
		})

		it('grows exponentially with k', () => {
			const r = newRound()
			r.startFlight(new Date(1_010_000))
			expect(r.currentMultiplierHundredths(new Date(1_011_000))).toBe(106)
			expect(r.currentMultiplierHundredths(new Date(1_020_000))).toBe(182)
		})

		it('is capped at the crash point after the round has crashed', () => {
			const r = newRound({ crashPointHundredths: 234 })
			r.startFlight(new Date(1_010_000))
			r.crash(new Date(1_025_000), 'seed')
			expect(r.currentMultiplierHundredths(new Date(1_030_000))).toBe(234)
		})

		it('throws when called before flight has started', () => {
			const r = newRound()
			expect(() => r.currentMultiplierHundredths(new Date(1_005_000))).toThrow(
				RoundNotFlyingException,
			)
		})
	})

	describe('verify', () => {
		it('returns the verification payload only after crash', () => {
			const r = newRound()
			expect(() => r.verify()).toThrow(/not crashed/i)

			r.startFlight(new Date(1_010_000))
			expect(() => r.verify()).toThrow(/not crashed/i)

			r.crash(new Date(1_020_000), 'srv-seed')

			expect(r.verify()).toEqual({
				nonce: 1,
				serverSeed: 'srv-seed',
				clientSeed: 'block-hash',
				crashPointHundredths: 234,
			})
		})
	})
})
