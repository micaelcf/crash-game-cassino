import { ApiError } from "@crash/api-client";
import {
	type RoundDto,
	useCashOut as useCashOutOrval,
	useGetMyBets as useGetMyBetsOrval,
	usePlaceBet as usePlaceBetOrval,
} from "@crash/api-client/games";
import { useQueryClient } from "@tanstack/react-query";
import { qk } from "#/lib/application/keys";
import type { Cents } from "#/lib/domain/types";

/**
 * Adapter hooks that wrap the orval-generated React Query hooks with the
 * legacy `useFoo()` names + ergonomic signatures the rest of the
 * frontend already consumes. Cross-query invalidation lives here so it
 * does not leak into the generated layer.
 */

export function useMyBets({
	page = 1,
	pageSize = 20,
}: {
	page?: number;
	pageSize?: number;
} = {}) {
	const query = useGetMyBetsOrval(
		{ page, pageSize },
		{ query: { queryKey: qk.bets.me(page, pageSize) } },
	);
	return {
		...query,
		error: query.error as ApiError | null,
	};
}

export function usePlaceBetMutation() {
	const queryClient = useQueryClient();
	const mutation = usePlaceBetOrval<ApiError>({
		mutation: {
			onSuccess: (placed) => {
				queryClient.setQueryData<RoundDto | null>(
					qk.rounds.current(),
					(prev) => {
						if (!prev) return prev;
						if (prev.bets.some((b) => b.id === placed.id)) return prev;
						return { ...prev, bets: [...prev.bets, placed] };
					},
				);
				queryClient.invalidateQueries({ queryKey: qk.wallet.me() });
			},
		},
	});
	type MutateOptions = Parameters<typeof mutation.mutate>[1];
	return {
		...mutation,
		mutate: (body: { amountCents: Cents }, options?: MutateOptions) =>
			mutation.mutate(
				{ data: { amount: body.amountCents.toString() } },
				options,
			),
		mutateAsync: (body: { amountCents: Cents }, options?: MutateOptions) =>
			mutation.mutateAsync(
				{ data: { amount: body.amountCents.toString() } },
				options,
			),
	};
}

export function useCashOutMutation() {
	const queryClient = useQueryClient();
	const mutation = useCashOutOrval<ApiError>({
		mutation: {
			onSuccess: (settled) => {
				queryClient.setQueryData<RoundDto | null>(
					qk.rounds.current(),
					(prev) => {
						if (!prev) return prev;
						return {
							...prev,
							bets: prev.bets.map((b) =>
								b.id === settled.id ? settled : b,
							),
						};
					},
				);
				queryClient.invalidateQueries({ queryKey: qk.wallet.me() });
			},
		},
	});
	return mutation;
}
