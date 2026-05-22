import type { ApiError } from "@crash/api-client";
import {
	useGetCurrentRound as useGetCurrentRoundOrval,
	useGetRoundHistory as useGetRoundHistoryOrval,
	useVerifyRound as useVerifyRoundOrval,
} from "@crash/api-client/games";
import { qk } from "#/lib/application/keys";

// The generated hooks default `TError` to `void`, which TS narrows to
// `never` at consumption time. Adapters re-cast `error` to
// `ApiError | null` since the orval mutator throws `ApiError` on every
// non-2xx — the only thing consumers ever observe in `error`.

export function useCurrentRound() {
	const query = useGetCurrentRoundOrval({
		query: {
			queryKey: qk.rounds.current(),
			refetchInterval: false,
		},
	});
	return { ...query, error: query.error as ApiError | null };
}

export function useRoundHistory({
	page = 1,
	pageSize = 20,
}: {
	page?: number;
	pageSize?: number;
} = {}) {
	const query = useGetRoundHistoryOrval(
		{ page, pageSize },
		{ query: { queryKey: qk.rounds.history(page, pageSize) } },
	);
	return { ...query, error: query.error as ApiError | null };
}

export function useVerifyRound(roundId: string | undefined) {
	const query = useVerifyRoundOrval(roundId ?? "", {
		query: {
			queryKey: qk.rounds.verify(roundId ?? ""),
			enabled: Boolean(roundId),
			retry: false,
		},
	});
	return { ...query, error: query.error as ApiError | null };
}
