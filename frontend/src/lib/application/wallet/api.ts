import type { ApiClient } from "#/lib/api/http/client";
import type { WalletDto } from "#/lib/api/types";

export function getMyWallet(client: ApiClient): Promise<WalletDto> {
	return client.get<WalletDto>("/wallets/me");
}
