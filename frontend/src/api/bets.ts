import type { ApiClient } from "./http";
import type {
	BetDto,
	PagedResult,
	PaginationParams,
	PlaceBetBody,
} from "./types";

export function placeBet(
	client: ApiClient,
	{ amountCents }: PlaceBetBody,
): Promise<BetDto> {
	return client.post<BetDto>("/games/bet", {
		amount:
			typeof amountCents === "bigint" ? amountCents.toString() : amountCents,
	});
}

export function cashOut(client: ApiClient): Promise<BetDto> {
	return client.post<BetDto>("/games/bet/cashout");
}

export function getMyBets(
	client: ApiClient,
	{ page = 1, pageSize = 20 }: PaginationParams = {},
): Promise<PagedResult<BetDto>> {
	const qs = new URLSearchParams({
		page: String(page),
		pageSize: String(pageSize),
	});
	return client.get<PagedResult<BetDto>>(`/games/bets/me?${qs.toString()}`);
}
