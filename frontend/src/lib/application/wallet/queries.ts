import type { ApiError } from "@crash/api-client";
import { useGetMyWallet as useGetMyWalletOrval } from "@crash/api-client/wallets";
import { useLogto } from "@logto/react";
import { qk } from "#/lib/application/keys";

export function useMyWallet() {
	const { isAuthenticated } = useLogto();
	const query = useGetMyWalletOrval({
		query: {
			queryKey: qk.wallet.me(),
			retry: false,
			enabled: isAuthenticated,
		},
	});
	return {
		...query,
		error: query.error as ApiError | null,
	};
}
