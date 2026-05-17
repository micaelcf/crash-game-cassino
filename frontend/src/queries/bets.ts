import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { bets, useApiClient } from "#/api";
import type { BetDto, PlaceBetBody, RoundDto } from "#/api/types";
import { qk } from "./keys";

export function useMyBets({
	page = 1,
	pageSize = 20,
}: {
	page?: number;
	pageSize?: number;
} = {}) {
	const api = useApiClient();
	return useQuery({
		queryKey: qk.bets.me(page, pageSize),
		queryFn: () => bets.getMyBets(api, { page, pageSize }),
	});
}

export function usePlaceBetMutation() {
	const api = useApiClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (body: PlaceBetBody) => bets.placeBet(api, body),
		onSuccess: (placed: BetDto) => {
			queryClient.setQueryData<RoundDto | null>(qk.rounds.current(), (prev) => {
				if (!prev) return prev;
				if (prev.bets.some((b) => b.id === placed.id)) return prev;
				return { ...prev, bets: [...prev.bets, placed] };
			});
			queryClient.invalidateQueries({ queryKey: qk.wallet.me() });
		},
	});
}

export function useCashOutMutation() {
	const api = useApiClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: () => bets.cashOut(api),
		onSuccess: (settled: BetDto) => {
			queryClient.setQueryData<RoundDto | null>(qk.rounds.current(), (prev) => {
				if (!prev) return prev;
				return {
					...prev,
					bets: prev.bets.map((b) => (b.id === settled.id ? settled : b)),
				};
			});
			queryClient.invalidateQueries({ queryKey: qk.wallet.me() });
		},
	});
}
