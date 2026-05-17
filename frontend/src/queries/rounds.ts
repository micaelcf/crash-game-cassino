import { useQuery } from "@tanstack/react-query";
import { rounds, useApiClient } from "#/api";
import { qk } from "./keys";

export function useCurrentRound() {
	const api = useApiClient();
	return useQuery({
		queryKey: qk.rounds.current(),
		queryFn: () => rounds.getCurrentRound(api),
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
		queryFn: () => rounds.getRoundHistory(api, { page, pageSize }),
	});
}

export function useVerifyRound(roundId: string | undefined) {
	const api = useApiClient();
	return useQuery({
		queryKey: qk.rounds.verify(roundId ?? ""),
		queryFn: () => rounds.verifyRound(api, roundId as string),
		enabled: Boolean(roundId),
		retry: false,
	});
}
