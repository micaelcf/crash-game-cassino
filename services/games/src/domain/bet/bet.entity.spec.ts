import { describe, it, expect } from 'vitest';
import { Bet, BetStatus } from './bet.entity';
import { BetAlreadySettledException } from './bet.exceptions';

const newBet = (overrides: Partial<Bet> = {}): Bet => {
  const b = Object.create(Bet.prototype) as Bet;
  Object.assign(b, {
    id: crypto.randomUUID(),
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
    ...overrides,
  });
  return b;
};

describe('Bet entity', () => {
  it('starts in PENDING with the given amount', () => {
    const b = newBet({ amountCents: 1000n });
    expect(b.status).toBe(BetStatus.PENDING);
    expect(b.amountCents).toBe(1000n);
    expect(b.payoutCents).toBeNull();
  });

  describe('confirm', () => {
    it('moves PENDING → CONFIRMED', () => {
      const b = newBet();
      b.confirm();
      expect(b.status).toBe(BetStatus.CONFIRMED);
    });

    it('cannot re-confirm a settled bet', () => {
      const b = newBet();
      b.confirm();
      b.markLost();
      expect(() => b.confirm()).toThrow(BetAlreadySettledException);
    });
  });

  describe('cancel', () => {
    it('cancels a pending bet', () => {
      const b = newBet();
      b.cancel('Insufficient balance');
      expect(b.status).toBe(BetStatus.CANCELLED);
      expect(b.cancellationReason).toBe('Insufficient balance');
    });

    it('cannot cancel a confirmed bet', () => {
      const b = newBet();
      b.confirm();
      expect(() => b.cancel('late')).toThrow(BetAlreadySettledException);
    });
  });

  describe('markWon', () => {
    it('settles a CONFIRMED bet with multiplier and computed payout', () => {
      const b = newBet({ amountCents: 1000n });
      b.confirm();
      b.markWon(234);
      expect(b.status).toBe(BetStatus.WON);
      expect(b.cashoutMultiplierHundredths).toBe(234);
      expect(b.payoutCents).toBe(2340n);
    });

    it('requires CONFIRMED state', () => {
      const b = newBet();
      expect(() => b.markWon(200)).toThrow(BetAlreadySettledException);
    });

    it('cannot be settled twice', () => {
      const b = newBet();
      b.confirm();
      b.markWon(150);
      expect(() => b.markWon(200)).toThrow(BetAlreadySettledException);
    });
  });

  describe('markLost', () => {
    it('settles a CONFIRMED bet with zero payout', () => {
      const b = newBet({ amountCents: 500n });
      b.confirm();
      b.markLost();
      expect(b.status).toBe(BetStatus.LOST);
      expect(b.payoutCents).toBe(0n);
      expect(b.cashoutMultiplierHundredths).toBeNull();
    });
  });
});
