import type { ApiClient } from "#/lib/api/http/client";
import type { LeaderboardResponse, LeaderboardWindow } from "#/lib/api/types";

export function getLeaderboard(
	client: ApiClient,
	window: LeaderboardWindow,
	limit = 20,
): Promise<LeaderboardResponse> {
	const qs = new URLSearchParams({ window, limit: String(limit) });
	return client.get<LeaderboardResponse>(`/games/leaderboard?${qs.toString()}`);
}
