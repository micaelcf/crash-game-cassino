import type { ApiClient } from "./http";
import type { WalletDto } from "./types";

export function createWallet(client: ApiClient): Promise<WalletDto> {
	return client.post<WalletDto>("/wallets");
}

export function getMyWallet(client: ApiClient): Promise<WalletDto> {
	return client.get<WalletDto>("/wallets/me");
}
