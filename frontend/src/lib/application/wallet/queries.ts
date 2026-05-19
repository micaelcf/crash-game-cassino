import { useLogto } from "@logto/react";
import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "#/lib/application/api-client";
import { qk } from "#/lib/application/keys";
import { getMyWallet } from "./api";

export function useMyWallet() {
	const api = useApiClient();
	const { isAuthenticated } = useLogto();
	return useQuery({
		queryKey: qk.wallet.me(),
		queryFn: () => getMyWallet(api),
		retry: false,
		enabled: isAuthenticated,
	});
}
