// Re-exports from the shared `@crash/contracts` workspace package.
// Single source of truth for HTTP DTOs / status unions / wire shapes lives there;
// this barrel keeps existing `#/lib/api/types` import paths stable.

export type {
	BetDto,
	LeaderboardEntryDto,
	LeaderboardResponse,
	PagedResult,
	PaginationParams,
	PlaceBetBody,
	RoundDto,
	RoundVerifyDto,
	WalletDto,
} from "@crash/contracts";
export {
	BetStatus,
	LEADERBOARD_WINDOWS,
	LeaderboardWindow,
	RoundStatus,
} from "@crash/contracts";
