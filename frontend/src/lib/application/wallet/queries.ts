import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { WalletDto } from "#/lib/api/types";
import { useApiClient } from "#/lib/application/api-client";
import { qk } from "#/lib/application/keys";
import { createWallet, getMyWallet } from "./api";

export function useMyWallet() {
	const api = useApiClient();
	return useQuery({
		queryKey: qk.wallet.me(),
		queryFn: () => getMyWallet(api),
		retry: false,
	});
}

export function useCreateWalletMutation() {
	const api = useApiClient();
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: () => createWallet(api),
		onSuccess: (data: WalletDto) => {
			queryClient.setQueryData(qk.wallet.me(), data);
		},
	});
}
