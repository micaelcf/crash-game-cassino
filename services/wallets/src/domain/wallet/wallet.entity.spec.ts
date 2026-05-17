import { describe, it, expect, beforeEach } from 'vitest';
import { Wallet } from './wallet.entity';
import { InsufficientBalanceException } from './insufficient-balance.exception';

const newWallet = (playerId = 'player-1', balance: bigint = 0n): Wallet => {
  const w = Object.create(Wallet.prototype) as Wallet;
  Object.assign(w, { id: crypto.randomUUID(), playerId, balance });
  return w;
};

describe('Wallet Entity', () => {
  let wallet: Wallet;

  beforeEach(() => {
    wallet = newWallet();
  });

  it('initializes with zero balance', () => {
    expect(wallet.playerId).toBe('player-1');
    expect(wallet.balance).toBe(0n);
  });

  it('credits balance correctly', () => {
    wallet.credit(5000n);
    expect(wallet.balance).toBe(5000n);

    wallet.credit(150n);
    expect(wallet.balance).toBe(5150n);
  });

  it('debits balance correctly if sufficient funds exist', () => {
    wallet.credit(5000n);
    wallet.debit(1000n);
    expect(wallet.balance).toBe(4000n);
  });

  it('throws InsufficientBalanceException if debiting more than balance', () => {
    wallet.credit(1000n);

    expect(() => wallet.debit(1500n)).toThrow(InsufficientBalanceException);
    expect(wallet.balance).toBe(1000n);
  });

  it('rejects negative credit', () => {
    expect(() => wallet.credit(-100n)).toThrow('Amount must be positive');
  });

  it('rejects negative debit', () => {
    expect(() => wallet.debit(-100n)).toThrow('Amount must be positive');
  });

  it('maintains BigInt precision', () => {
    const huge = newWallet('player-1', 1000000000000000000n);
    huge.credit(1n);
    expect(huge.balance).toBe(1000000000000000001n);
  });
});
