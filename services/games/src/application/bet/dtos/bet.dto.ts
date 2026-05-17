import { Bet } from '../../../domain/bet/bet.entity';

export interface BetDto {
  id: string;
  userId: string;
  username: string;
  amountCents: string;
  status: string;
  cashoutMultiplierHundredths: number | null;
  payoutCents: string | null;
  createdAt: string;
}

export const toBetDto = (bet: Bet): BetDto => ({
  id: bet.id,
  userId: bet.userId,
  username: bet.username,
  amountCents: bet.amountCents.toString(),
  status: bet.status,
  cashoutMultiplierHundredths: bet.cashoutMultiplierHundredths,
  payoutCents: bet.payoutCents !== null ? bet.payoutCents.toString() : null,
  createdAt: bet.createdAt.toISOString(),
});
