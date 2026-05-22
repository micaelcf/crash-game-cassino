// Re-exports of HTTP wire types from the orval-generated client.
// Status enums + WS payload types live in `@crash/contracts`; this
// barrel keeps existing `#/lib/api/types` imports stable.

export type {
	BetDto,
	LeaderboardEntryDto,
	LeaderboardResponseDto as LeaderboardResponse,
	PagedBetDto,
	PagedRoundDto,
	PlaceBetDto as PlaceBetBody,
	RoundDto,
	RoundVerifyDto,
} from "@crash/api-client/games";
export type { WalletDto } from "@crash/api-client/wallets";
export type { PagedResult, PaginationParams } from "@crash/contracts";
export { BetStatus, RoundStatus } from "@crash/contracts";

/**
 * Leaderboard sliding window. The orval-generated enum keys the values
 * by their wire-format strings (`"24h"`, `"7d"`); the frontend prefers
 * intent-revealing identifiers (`TWENTY_FOUR_HOURS`, `SEVEN_DAYS`), so
 * we shadow it here with friendlier keys. Values still match the wire.
 */
export const LeaderboardWindow = {
	TWENTY_FOUR_HOURS: "24h",
	SEVEN_DAYS: "7d",
} as const;
export type LeaderboardWindow =
	(typeof LeaderboardWindow)[keyof typeof LeaderboardWindow];

export const LEADERBOARD_WINDOWS = Object.values(
	LeaderboardWindow,
) as ReadonlyArray<LeaderboardWindow>;
