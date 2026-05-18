import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "#/lib/application/api-client";
import { qk } from "#/lib/application/keys";
import { getCurrentRound, getRoundHistory, verifyRound } from "./api";

export function useCurrentRound() {
	const api = useApiClient();
	return useQuery({
		queryKey: qk.rounds.current(),
		queryFn: () => getCurrentRound(api),
		refetchInterval: false,
	});
}

export function useRoundHistory({
	page = 1,
	pageSize = 20,
}: {
	page?: number;
	pageSize?: number;
} = {}) {
	const api = useApiClient();
	return useQuery({
		queryKey: qk.rounds.history(page, pageSize),
		queryFn: () => getRoundHistory(api, { page, pageSize }),
	});
}

export function useVerifyRound(roundId: string | undefined) {
	const api = useApiClient();
	return useQuery({
		queryKey: qk.rounds.verify(roundId ?? ""),
		queryFn: () => {
			if (!roundId) {
				// `enabled` gate prevents this from running; guard appeases the type.
				throw new Error("roundId is required");
			}
			return verifyRound(api, roundId);
		},
		enabled: Boolean(roundId),
		retry: false,
	});
}
