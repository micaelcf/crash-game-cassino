import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiClient, wallets } from "#/api";
import type { WalletDto } from "#/api/types";
import { qk } from "./keys";

export function useMyWallet() {
	const api = useApiClient();
	return useQuery({
		queryKey: qk.wallet.me(),
		queryFn: () => wallets.getMyWallet(api),
		retry: false,
	});
}

export function useCreateWalletMutation() {
	const api = useApiClient();
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: () => wallets.createWallet(api),
		onSuccess: (data: WalletDto) => {
			queryClient.setQueryData(qk.wallet.me(), data);
		},
	});
}
