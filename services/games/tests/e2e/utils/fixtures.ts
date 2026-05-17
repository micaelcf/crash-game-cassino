import type { MikroORM } from '@mikro-orm/core';
import {
  Bet,
  BetStatus,
} from '../../../src/domain/bet/bet.entity';
import {
  Round,
  RoundStatus,
} from '../../../src/domain/round/round.entity';

export interface SeedRoundInput {
  status?: RoundStatus;
  nonce?: number;
  serverSeedHash?: string;
  clientSeed?: string;
  crashPointHundredths?: number;
  growthRate?: number;
  serverSeed?: string | null;
  bettingEndsAt?: Date;
  flyingStartedAt?: Date | null;
  crashedAt?: Date | null;
}

export const seedRound = async (
  orm: MikroORM,
  input: SeedRoundInput = {},
): Promise<Round> => {
  const em = orm.em.fork();
  const now = new Date();
  const round = em.create(Round, {
    nonce: input.nonce ?? 1,
    serverSeedHash: input.serverSeedHash ?? 'sha-test-seed',
    clientSeed: input.clientSeed ?? 'e2e-client-seed',
    crashPointHundredths: input.crashPointHundredths ?? 200,
    growthRate: input.growthRate ?? 0.06,
    bettingEndsAt: input.bettingEndsAt ?? new Date(now.getTime() + 10_000),
  });
  if (input.status) round.status = input.status;
  if (input.serverSeed !== undefined) round.serverSeed = input.serverSeed;
  if (input.flyingStartedAt !== undefined)
    round.flyingStartedAt = input.flyingStartedAt;
  if (input.crashedAt !== undefined) round.crashedAt = input.crashedAt;
  await em.flush();
  return round;
};

export interface SeedBetInput {
  roundId: string;
  userId: string;
  username?: string;
  amountCents?: bigint;
  status?: BetStatus;
}

export const seedBet = async (
  orm: MikroORM,
  input: SeedBetInput,
): Promise<Bet> => {
  const em = orm.em.fork();
  const bet = em.create(Bet, {
    roundId: input.roundId,
    userId: input.userId,
    username: input.username ?? input.userId,
    amountCents: input.amountCents ?? 1000n,
  });
  if (input.status) bet.status = input.status;
  await em.flush();
  return bet;
};
