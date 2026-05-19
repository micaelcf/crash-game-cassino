import { GetCurrentRoundUseCase } from '@application/round/use-cases/get-current-round.use-case'
import { Bet, BetStatus } from '@domain/bet/bet.entity'
import { Round, RoundStatus } from '@domain/round/round.entity'
import type { Clock } from '@domain/shared/clock'
import type { BaseRepository } from '@infrastructure/db/base.repository'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const newRound = (status: RoundStatus): Round => {
	const r = Object.create(Round.prototype) as Round
	Object.assign(r, {
		id: crypto.randomUUID(),
		nonce: 7,
		serverSeedHash: 'commit',
		serverSeed: status === RoundStatus.CRASHED ? 'revealed' : null,
		clientSeed: 'cs',
		crashPointHundredths: 234,
		growthRate: 0.06,
		status,
		createdAt: new Date(1_000_000),
		bettingEndsAt: new Date(1_010_000),
		flyingStartedAt: status === RoundStatus.FLYING ? new Date(1_011_000) : null,
		crashedAt: status === RoundStatus.CRASHED ? new Date(1_020_000) : null,
		pendingServerSeed: null,
	})
	return r
}

const newBet = (roundId: string): Bet => {
	const b = Object.create(Bet.prototype) as Bet
	Object.assign(b, {
		id: crypto.randomUUID(),
		roundId,
		userId: 'u1',
		username: 'alice',
		amountCents: 1000n,
		status: BetStatus.CONFIRMED,
		cashoutMultiplierHundredths: null,
		payoutCents: null,
		cancellationReason: null,
		createdAt: new Date(1_005_000),
		updatedAt: new Date(1_005_000),
	})
	return b
}

const FIXED_NOW = new Date('2026-05-19T12:00:00Z')

const makeCtx = (opts: { round: Round | null; bets?: Bet[] }) => {
	const rounds = {
		findOne: vi.fn().mockResolvedValue(opts.round),
	}
	const bets = {
		find: vi.fn().mockResolvedValue(opts.bets ?? []),
	}
	const clock: Clock = { now: () => FIXED_NOW }
	return { rounds, bets, clock }
}

type RoundRepo = BaseRepository<Round>
type BetRepo = BaseRepository<Bet>

describe('GetCurrentRoundUseCase', () => {
	beforeEach(() => vi.clearAllMocks())

	it('returns the round when it is in BETTING_PHASE', async () => {
		const round = newRound(RoundStatus.BETTING_PHASE)
		const ctx = makeCtx({ round })
		const useCase = new GetCurrentRoundUseCase(
			ctx.rounds as unknown as RoundRepo,
			ctx.bets as unknown as BetRepo,
			ctx.clock,
		)

		const result = await useCase.execute()

		expect(result).not.toBeNull()
		expect(result?.id).toBe(round.id)
		expect(result?.status).toBe(RoundStatus.BETTING_PHASE)
		expect(result?.serverTime).toBe(FIXED_NOW.toISOString())
	})

	it('returns the round when it is FLYING and includes its bets', async () => {
		const round = newRound(RoundStatus.FLYING)
		const bets = [newBet(round.id)]
		const ctx = makeCtx({ round, bets })
		const useCase = new GetCurrentRoundUseCase(
			ctx.rounds as unknown as RoundRepo,
			ctx.bets as unknown as BetRepo,
			ctx.clock,
		)

		const result = await useCase.execute()

		expect(result?.status).toBe(RoundStatus.FLYING)
		expect(result?.bets).toHaveLength(1)
		expect(ctx.bets.find).toHaveBeenCalledWith(
			{ roundId: round.id },
			{ orderBy: { createdAt: 'asc' } },
		)
	})

	it('returns null when no active round exists (CRASHED is filtered out)', async () => {
		const ctx = makeCtx({ round: null })
		const useCase = new GetCurrentRoundUseCase(
			ctx.rounds as unknown as RoundRepo,
			ctx.bets as unknown as BetRepo,
			ctx.clock,
		)

		const result = await useCase.execute()

		expect(result).toBeNull()
		expect(ctx.bets.find).not.toHaveBeenCalled()
	})

	it('queries only BETTING_PHASE/FLYING rounds via $in filter', async () => {
		const ctx = makeCtx({ round: null })
		const useCase = new GetCurrentRoundUseCase(
			ctx.rounds as unknown as RoundRepo,
			ctx.bets as unknown as BetRepo,
			ctx.clock,
		)

		await useCase.execute()

		expect(ctx.rounds.findOne).toHaveBeenCalledWith(
			{ status: { $in: [RoundStatus.BETTING_PHASE, RoundStatus.FLYING] } },
			{ orderBy: { createdAt: 'desc' } },
		)
	})

	it('returns null on cold start (no rounds at all)', async () => {
		const ctx = makeCtx({ round: null })
		const useCase = new GetCurrentRoundUseCase(
			ctx.rounds as unknown as RoundRepo,
			ctx.bets as unknown as BetRepo,
			ctx.clock,
		)

		expect(await useCase.execute()).toBeNull()
	})
})
