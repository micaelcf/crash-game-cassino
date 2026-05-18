import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { BetDto, RoundDto } from "#/lib/api/types";
import { useApiClient } from "#/lib/application/api-client";
import { qk } from "#/lib/application/keys";
import type { Cents } from "#/lib/domain/types";
import { cashOut, getMyBets, placeBet } from "./api";

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
		queryFn: () => getMyBets(api, { page, pageSize }),
	});
}

export function usePlaceBetMutation() {
	const api = useApiClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (body: { amountCents: Cents }) => placeBet(api, body),
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
		mutationFn: () => cashOut(api),
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
