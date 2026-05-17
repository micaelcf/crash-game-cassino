import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WalletDebitedUseCase } from './wallet-debited.use-case';
import { WalletDebitFailedUseCase } from './wallet-debit-failed.use-case';
import { WalletDebitedCommand } from '../dtos/wallet-debited.command';
import { WalletDebitFailedCommand } from '../dtos/wallet-debit-failed.command';
import { Bet, BetStatus } from '../../../domain/bet/bet.entity';
import { InboxEvent } from '../../../infrastructure/messaging/inbox/inbox-event.entity';

const newPendingBet = (id = 'bet-1'): Bet => {
  const b = Object.create(Bet.prototype) as Bet;
  Object.assign(b, {
    id,
    roundId: 'r-1',
    userId: 'u-1',
    username: 'alice',
    amountCents: 1000n,
    status: BetStatus.PENDING,
    cashoutMultiplierHundredths: null,
    payoutCents: null,
    cancellationReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return b;
};

const makeCtx = (opts: { bet?: Bet | null; inbox?: InboxEvent | null }) => {
  const created: any[] = [];
  const flushCalls = { count: 0 };
  const bets = {
    findOne: vi.fn().mockResolvedValue(opts.bet ?? null),
    flush: vi.fn(async () => {
      flushCalls.count++;
    }),
  };
  const inbox = {
    findOne: vi.fn().mockResolvedValue(opts.inbox ?? null),
    create: vi.fn((data: { id: string }) => {
      const i = Object.create(InboxEvent.prototype);
      Object.assign(i, { id: data.id, processedAt: new Date() });
      created.push(i);
      return i;
    }),
  };
  return { bets, inbox, created, flushCalls };
};

describe('WalletDebitedUseCase', () => {
  beforeEach(() => vi.clearAllMocks());

  it('confirms the bet and records the inbox event', async () => {
    const bet = newPendingBet();
    const ctx = makeCtx({ bet });
    const useCase = new WalletDebitedUseCase(
      ctx.bets as any,
      ctx.inbox as any,
    );

    await useCase.execute(new WalletDebitedCommand('msg-1', bet.id));

    expect(bet.status).toBe(BetStatus.CONFIRMED);
    expect(ctx.created.some((x) => x instanceof InboxEvent)).toBe(true);
    expect(ctx.flushCalls.count).toBe(1);
  });

  it('is idempotent: replaying the same messageId is a no-op', async () => {
    const bet = newPendingBet();
    const inbox = Object.create(InboxEvent.prototype);
    const ctx = makeCtx({ bet, inbox });
    const useCase = new WalletDebitedUseCase(
      ctx.bets as any,
      ctx.inbox as any,
    );

    await useCase.execute(new WalletDebitedCommand('msg-1', bet.id));

    expect(bet.status).toBe(BetStatus.PENDING);
    expect(ctx.flushCalls.count).toBe(0);
  });

  it('still records the inbox dedupe when the bet has vanished', async () => {
    const ctx = makeCtx({ bet: null });
    const useCase = new WalletDebitedUseCase(
      ctx.bets as any,
      ctx.inbox as any,
    );

    await useCase.execute(new WalletDebitedCommand('msg-2', 'ghost'));

    expect(ctx.created.some((x) => x instanceof InboxEvent)).toBe(true);
    expect(ctx.flushCalls.count).toBe(1);
  });
});

describe('WalletDebitFailedUseCase', () => {
  beforeEach(() => vi.clearAllMocks());

  it('cancels the bet with the reason and records the inbox event', async () => {
    const bet = newPendingBet();
    const ctx = makeCtx({ bet });
    const useCase = new WalletDebitFailedUseCase(
      ctx.bets as any,
      ctx.inbox as any,
    );

    await useCase.execute(
      new WalletDebitFailedCommand('msg-x', bet.id, 'Insufficient balance'),
    );

    expect(bet.status).toBe(BetStatus.CANCELLED);
    expect(bet.cancellationReason).toBe('Insufficient balance');
    expect(ctx.flushCalls.count).toBe(1);
  });

  it('is idempotent on duplicate messageId', async () => {
    const bet = newPendingBet();
    const inbox = Object.create(InboxEvent.prototype);
    const ctx = makeCtx({ bet, inbox });
    const useCase = new WalletDebitFailedUseCase(
      ctx.bets as any,
      ctx.inbox as any,
    );

    await useCase.execute(new WalletDebitFailedCommand('msg-x', bet.id, 'r'));

    expect(bet.status).toBe(BetStatus.PENDING);
    expect(ctx.flushCalls.count).toBe(0);
  });
});
