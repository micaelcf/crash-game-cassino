import { useQuery } from "@tanstack/react-query";
import type { LeaderboardWindow } from "#/lib/api/types";
import { useApiClient } from "#/lib/application/api-client";
import { qk } from "#/lib/application/keys";
import { getLeaderboard } from "./api";

export function useLeaderboard(window: LeaderboardWindow, limit = 20) {
	const api = useApiClient();
	return useQuery({
		queryKey: qk.leaderboard.list(window, limit),
		queryFn: () => getLeaderboard(api, window, limit),
		staleTime: 30_000,
	});
}
