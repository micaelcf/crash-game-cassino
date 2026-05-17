// Mirrors backend DTOs.
// Sources of truth:
//   services/games/src/application/bet/dtos/bet.dto.ts
//   services/games/src/application/round/dtos/round.dto.ts
//   services/wallets/src/application/wallet/dtos/wallet.dto.ts
//   services/games/src/infrastructure/http/dtos/place-bet.dto.ts
//   services/games/src/domain/round/round.entity.ts (RoundStatus enum)
//   services/games/src/domain/bet/bet.entity.ts (BetStatus enum)
// Money on the wire = string of integer cents.
// Multipliers on the wire = number of integer hundredths.

export type RoundStatus = "BETTING_PHASE" | "FLYING" | "CRASHED";

export type BetStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "WON" | "LOST";

export interface WalletDto {
	id: string;
	playerId: string;
	balance: string;
	createdAt?: string;
}

export interface BetDto {
	id: string;
	userId: string;
	username: string;
	amountCents: string;
	status: BetStatus;
	cashoutMultiplierHundredths: number | null;
	payoutCents: string | null;
	createdAt: string;
}

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

export interface RoundVerifyDto {
	roundId: string;
	nonce: number;
	serverSeed: string;
	clientSeed: string;
	hashCommitment: string;
	crashPointHundredths: number;
}

export interface PagedResult<T> {
	items: T[];
	page: number;
	pageSize: number;
	total: number;
}

export interface PaginationParams {
	page?: number;
	pageSize?: number;
}

export interface PlaceBetBody {
	amountCents: bigint | string;
}
