import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameGateway } from './game.gateway';

describe('GameGateway', () => {
  let server: { emit: ReturnType<typeof vi.fn> };
  let gateway: GameGateway;

  beforeEach(() => {
    server = { emit: vi.fn() };
    gateway = new GameGateway();
    (gateway as any).server = server;
  });

  it('broadcasts round.betting', () => {
    gateway.emitRoundBetting({ roundId: 'r1', hashCommitment: 'h', bettingEndsAt: 't' });
    expect(server.emit).toHaveBeenCalledWith('round.betting', {
      roundId: 'r1',
      hashCommitment: 'h',
      bettingEndsAt: 't',
    });
  });

  it('broadcasts round.started', () => {
    gateway.emitRoundStarted({ roundId: 'r1', startTime: 't', growthRate: 0.06 });
    expect(server.emit).toHaveBeenCalledWith('round.started', {
      roundId: 'r1',
      startTime: 't',
      growthRate: 0.06,
    });
  });

  it('broadcasts round.crashed', () => {
    gateway.emitRoundCrashed({
      roundId: 'r1',
      crashPointHundredths: 234,
      serverSeed: 's',
      clientSeed: 'c',
      nonce: 1,
    });
    expect(server.emit).toHaveBeenCalledWith(
      'round.crashed',
      expect.objectContaining({ roundId: 'r1', crashPointHundredths: 234 }),
    );
  });

  it('broadcasts bet.placed', () => {
    gateway.emitBetPlaced({
      roundId: 'r1',
      betId: 'b1',
      userId: 'u1',
      username: 'alice',
      amountCents: '1000',
    });
    expect(server.emit).toHaveBeenCalledWith(
      'bet.placed',
      expect.objectContaining({ betId: 'b1', amountCents: '1000' }),
    );
  });

  it('broadcasts bet.cashed_out', () => {
    gateway.emitBetCashedOut({
      roundId: 'r1',
      betId: 'b1',
      userId: 'u1',
      username: 'alice',
      multiplierHundredths: 150,
      payoutCents: '1500',
    });
    expect(server.emit).toHaveBeenCalledWith(
      'bet.cashed_out',
      expect.objectContaining({ multiplierHundredths: 150, payoutCents: '1500' }),
    );
  });
});
