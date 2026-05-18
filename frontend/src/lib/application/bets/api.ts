import type { ApiClient } from "#/lib/api/http/client";
import type {
	BetDto,
	PagedResult,
	PaginationParams,
	PlaceBetBody,
} from "#/lib/api/types";
import type { Cents } from "#/lib/domain/types";

export function placeBet(
	client: ApiClient,
	body: { amountCents: Cents },
): Promise<BetDto> {
	// Backend field name is `amount` (string-cents), not `amountCents`.
	return client.post<BetDto>("/games/bet", {
		amount: body.amountCents.toString(),
	} satisfies PlaceBetBody);
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
