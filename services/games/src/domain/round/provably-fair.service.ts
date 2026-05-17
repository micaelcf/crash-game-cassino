import { createHash, createHmac, randomBytes } from 'node:crypto'
import { Injectable } from '@nestjs/common'

export const sha256 = (input: string): string =>
	createHash('sha256').update(input).digest('hex')

const hmacSha256 = (key: string, payload: string): string =>
	createHmac('sha256', key).update(payload).digest('hex')

const TWO_POW_52 = 2 ** 52

export const generateHashChain = (
	length: number,
	terminalSeed?: string,
): string[] => {
	if (length < 1) throw new RangeError('chain length must be >= 1')
	const seed = terminalSeed ?? randomBytes(32).toString('hex')
	const chain = new Array<string>(length)
	chain[length - 1] = seed
	for (let i = length - 2; i >= 0; i--) {
		chain[i] = sha256(chain[i + 1])
	}
	return chain
}

@Injectable()
export class ProvablyFairService {
	/**
	 * Computes the crash point (as integer hundredths, e.g. 234 = 2.34x) for a
	 * given (serverSeed, clientSeed) pair following the documented HMAC-SHA256
	 * formula with a 1% house edge.
	 */
	crashPointHundredths(serverSeed: string, clientSeed: string): number {
		const hex = hmacSha256(serverSeed, clientSeed)
		const h = parseInt(hex.slice(0, 13), 16)
		if (h === TWO_POW_52) {
			return 100
		}
		const multiplier = Math.max(
			1,
			Math.floor((100 * TWO_POW_52 - h) / (TWO_POW_52 - h)) / 100,
		)
		return Math.floor(multiplier * 100)
	}

	commitment(serverSeed: string): string {
		return sha256(serverSeed)
	}

	verifyCommitment(revealedSeed: string, expectedCommitment: string): boolean {
		return sha256(revealedSeed) === expectedCommitment
	}
}
