import { createHash } from 'node:crypto'
import {
	generateHashChain,
	ProvablyFairService,
	sha256,
} from '@domain/round/provably-fair.service'
import { describe, expect, it } from 'vitest'

describe('ProvablyFairService', () => {
	const svc = new ProvablyFairService()

	describe('crashPointHundredths', () => {
		it('is deterministic for a given (serverSeed, clientSeed)', () => {
			const a = svc.crashPointHundredths('seed-a', 'client-x')
			const b = svc.crashPointHundredths('seed-a', 'client-x')
			expect(a).toBe(b)
		})

		it('produces a result of at least 100 (1.00x floor)', () => {
			for (let i = 0; i < 200; i++) {
				const v = svc.crashPointHundredths(`s-${i}`, 'block-hash')
				expect(v).toBeGreaterThanOrEqual(100)
			}
		})

		it('matches the documented HMAC-SHA256 formula', () => {
			const serverSeed =
				'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
			const clientSeed = 'btc-block-001'

			const crypto = require('node:crypto')
			const hex = crypto
				.createHmac('sha256', serverSeed)
				.update(clientSeed)
				.digest('hex') as string
			const h = parseInt(hex.slice(0, 13), 16)
			const e = 2 ** 52
			const expectedMultiplier = Math.max(
				1,
				Math.floor((100 * e - h) / (e - h)) / 100,
			)
			const expectedHundredths = Math.floor(expectedMultiplier * 100)

			expect(svc.crashPointHundredths(serverSeed, clientSeed)).toBe(
				expectedHundredths,
			)
		})

		it('approximates a 1% house edge across a large sample', () => {
			let busts = 0
			const N = 5_000
			for (let i = 0; i < N; i++) {
				const v = svc.crashPointHundredths(`server-${i}`, 'client-fixed')
				if (v === 100) busts += 1
			}
			const rate = busts / N
			expect(rate).toBeGreaterThan(0.005)
			expect(rate).toBeLessThan(0.02)
		})
	})

	describe('commitment / hash chain', () => {
		it('sha256() returns the lowercase hex digest', () => {
			const expected = createHash('sha256').update('hello').digest('hex')
			expect(sha256('hello')).toBe(expected)
		})

		it('generates a chain where each link is the sha256 of the next', () => {
			const chain = generateHashChain(10, 'terminal-seed')
			expect(chain).toHaveLength(10)

			for (let i = 0; i < chain.length - 1; i++) {
				expect(chain[i]).toBe(sha256(chain[i + 1]))
			}
		})

		it('verifies a revealed seed against its prior commitment', () => {
			const chain = generateHashChain(3, 'terminal')
			const revealed = chain[1]
			const previousCommitment = chain[0]

			expect(sha256(revealed)).toBe(previousCommitment)
		})
	})
})
