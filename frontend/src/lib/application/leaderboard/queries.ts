import type { ApiError } from "@crash/api-client";
import { useGetLeaderboard as useGetLeaderboardOrval } from "@crash/api-client/games";
import type { LeaderboardWindow } from "#/lib/api/types";
import { qk } from "#/lib/application/keys";

export function useLeaderboard(window: LeaderboardWindow, limit = 20) {
	const query = useGetLeaderboardOrval(
		{ window, limit },
		{
			query: {
				queryKey: qk.leaderboard.list(window, limit),
				staleTime: 30_000,
			},
		},
	);
	return {
		...query,
		error: query.error as ApiError | null,
	};
}
