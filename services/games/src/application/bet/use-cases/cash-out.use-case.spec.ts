import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CashOutUseCase } from './cash-out.use-case';
import { CashOutCommand } from '../dtos/cash-out.command';
import { Round, RoundStatus } from '../../../domain/round/round.entity';
import { Bet, BetStatus } from '../../../domain/bet/bet.entity';
import type { Clock } from '../../../domain/shared/clock';
import { NoActiveBetException } from '../../../domain/bet/bet.exceptions';
import { RoundNotFlyingException } from '../../../domain/round/round.exceptions';
import type { EventPublisher } from '../../../infrastructure/messaging/outbox/event-publisher.service';

const fixedClock = (now: Date): Clock => ({ now: () => now });

const newRound = (overrides: Partial<Round> = {}): Round => {
  const r = Object.create(Round.prototype) as Round;
  Object.assign(r, {
    id: crypto.randomUUID(),
    nonce: 1,
    serverSeedHash: 'commit',
    clientSeed: 'cs',
    crashPointHundredths: 500,
    growthRate: 0.06,
    status: RoundStatus.FLYING,
    createdAt: new Date(),
    bettingEndsAt: new Date(),
    flyingStartedAt: new Date(1_000_000),
    crashedAt: null,
    serverSeed: null,
    pendingServerSeed: null,
    ...overrides,
  });
  return r;
};

const newConfirmedBet = (roundId: string, amount: bigint = 1000n): Bet => {
  const b = Object.create(Bet.prototype) as Bet;
  Object.assign(b, {
    id: crypto.randomUUID(),
    roundId,
    userId: 'u-1',
    username: 'alice',
    amountCents: amount,
    status: BetStatus.CONFIRMED,
    cashoutMultiplierHundredths: null,
    payoutCents: null,
    cancellationReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return b;
};

const makeCtx = (opts: { round: Round | null; bet: Bet | null }) => {
  const flushCalls = { count: 0 };
  const published: Array<{ eventType: string; payload: any }> = [];
  const rounds = {
    findOne: vi.fn().mockResolvedValue(opts.round),
    flush: vi.fn(async () => {
      flushCalls.count++;
    }),
  };
  const bets = {
    findOne: vi.fn().mockResolvedValue(opts.bet),
    flush: vi.fn(async () => {
      flushCalls.count++;
    }),
  };
  const events: EventPublisher = {
    publish: vi.fn((eventType, _at, _aid, payload) => {
      published.push({ eventType, payload });
    }),
  } as unknown as EventPublisher;
  return { rounds, bets, events, flushCalls, published };
};

describe('CashOutUseCase', () => {
  beforeEach(() => vi.clearAllMocks());

  it('settles the bet WON with the multiplier at "now" and publishes player.won', async () => {
    const flyAt = new Date(1_000_000);
    const round = newRound({ flyingStartedAt: flyAt });
    const bet = newConfirmedBet(round.id, 1000n);
    const ctx = makeCtx({ round, bet });
    const now = new Date(1_001_000);
    const useCase = new CashOutUseCase(
      ctx.rounds as any,
      ctx.bets as any,
      ctx.events,
      fixedClock(now),
    );

    const result = await useCase.execute(new CashOutCommand('u-1'));

    expect(result.status).toBe(BetStatus.WON);
    expect(result.cashoutMultiplierHundredths).toBe(106);
    expect(result.payoutCents).toBe(1060n);
    expect(ctx.published[0]).toEqual({
      eventType: 'player.won',
      payload: expect.objectContaining({
        userId: 'u-1',
        roundId: round.id,
        amount: '1060',
      }),
    });
    expect(ctx.flushCalls.count).toBe(1);
  });

  it('rejects when the round is not FLYING', async () => {
    const round = newRound({ status: RoundStatus.BETTING_PHASE });
    const ctx = makeCtx({ round, bet: newConfirmedBet(round.id) });
    const useCase = new CashOutUseCase(
      ctx.rounds as any,
      ctx.bets as any,
      ctx.events,
      fixedClock(new Date()),
    );

    await expect(useCase.execute(new CashOutCommand('u-1'))).rejects.toThrow(
      RoundNotFlyingException,
    );
  });

  it('rejects when the user has no active bet', async () => {
    const round = newRound();
    const ctx = makeCtx({ round, bet: null });
    const useCase = new CashOutUseCase(
      ctx.rounds as any,
      ctx.bets as any,
      ctx.events,
      fixedClock(new Date()),
    );

    await expect(useCase.execute(new CashOutCommand('u-1'))).rejects.toThrow(
      NoActiveBetException,
    );
  });

  it('rejects when the bet is not in CONFIRMED state', async () => {
    const round = newRound();
    const bet = newConfirmedBet(round.id);
    (bet as any).status = BetStatus.PENDING;
    const ctx = makeCtx({ round, bet });
    const useCase = new CashOutUseCase(
      ctx.rounds as any,
      ctx.bets as any,
      ctx.events,
      fixedClock(new Date()),
    );

    await expect(useCase.execute(new CashOutCommand('u-1'))).rejects.toThrow(
      NoActiveBetException,
    );
  });
});
