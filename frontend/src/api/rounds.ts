import type { ApiClient } from "./http";
import type {
	PagedResult,
	PaginationParams,
	RoundDto,
	RoundVerifyDto,
} from "./types";

export function getCurrentRound(client: ApiClient): Promise<RoundDto | null> {
	return client.get<RoundDto | null>("/games/rounds/current");
}

export function getRoundHistory(
	client: ApiClient,
	{ page = 1, pageSize = 20 }: PaginationParams = {},
): Promise<PagedResult<RoundDto>> {
	const qs = new URLSearchParams({
		page: String(page),
		pageSize: String(pageSize),
	});
	return client.get<PagedResult<RoundDto>>(
		`/games/rounds/history?${qs.toString()}`,
	);
}

export function verifyRound(
	client: ApiClient,
	roundId: string,
): Promise<RoundVerifyDto> {
	return client.get<RoundVerifyDto>(
		`/games/rounds/${encodeURIComponent(roundId)}/verify`,
	);
}
