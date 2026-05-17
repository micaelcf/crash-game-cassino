import { Bet } from '../../../domain/bet/bet.entity';
import { Round, RoundStatus } from '../../../domain/round/round.entity';
import { BetDto, toBetDto } from '../../bet/dtos/bet.dto';

export interface RoundDto {
  id: string;
  nonce: number;
  status: RoundStatus;
  hashCommitment: string;
  clientSeed: string;
  bettingEndsAt: string;
  flyingStartedAt: string | null;
  crashedAt: string | null;
  growthRate: number;
  crashPointHundredths: number | null;
  serverSeed: string | null;
  bets: BetDto[];
}

export const toRoundDto = (round: Round, bets: Bet[]): RoundDto => ({
  id: round.id,
  nonce: round.nonce,
  status: round.status,
  hashCommitment: round.serverSeedHash,
  clientSeed: round.clientSeed,
  bettingEndsAt: round.bettingEndsAt.toISOString(),
  flyingStartedAt: round.flyingStartedAt?.toISOString() ?? null,
  crashedAt: round.crashedAt?.toISOString() ?? null,
  growthRate: round.growthRate,
  crashPointHundredths:
    round.status === RoundStatus.CRASHED ? round.crashPointHundredths : null,
  serverSeed: round.status === RoundStatus.CRASHED ? round.serverSeed : null,
  bets: bets.map(toBetDto),
});
