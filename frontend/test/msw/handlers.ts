import { http, HttpResponse } from "msw";
import {
	type BetDto,
	BetStatus,
	type LeaderboardResponse,
	LeaderboardWindow,
	type PagedResult,
	type RoundDto,
	RoundStatus,
	type RoundVerifyDto,
	type WalletDto,
} from "#/lib/api/types";

const API = "http://api.test.local";

export const defaultWallet: WalletDto = {
	id: "wallet-1",
	playerId: "user-1",
	balance: "100000",
	createdAt: "2026-05-19T12:00:00.000Z",
};

export const defaultBettingRound: RoundDto = {
	id: "round-1",
	nonce: 1,
	status: RoundStatus.BETTING_PHASE,
	hashCommitment: "0".repeat(64),
	clientSeed: "client-seed",
	bettingEndsAt: new Date(Date.now() + 8000).toISOString(),
	flyingStartedAt: null,
	crashedAt: null,
	growthRate: 0.06,
	crashPointHundredths: null,
	serverSeed: null,
	bets: [],
	serverTime: new Date().toISOString(),
};

export const handlers = [
	http.get(`${API}/wallets/me`, () => HttpResponse.json(defaultWallet)),

	http.get(`${API}/games/rounds/current`, () =>
		HttpResponse.json<RoundDto | null>(defaultBettingRound),
	),

	http.get(`${API}/games/rounds/history`, () => {
		const body: PagedResult<RoundDto> = {
			items: [],
			page: 1,
			pageSize: 20,
			total: 0,
		};
		return HttpResponse.json(body);
	}),

	http.get(`${API}/games/rounds/:roundId/verify`, ({ params }) => {
		const body: RoundVerifyDto = {
			roundId: String(params.roundId),
			serverSeed: "server-seed",
			clientSeed: "client-seed",
			nonce: 1,
			hashCommitment: "0".repeat(64),
			crashPointHundredths: 234,
		};
		return HttpResponse.json(body);
	}),

	http.get(`${API}/games/bets/me`, () => {
		const body: PagedResult<BetDto> = {
			items: [],
			page: 1,
			pageSize: 20,
			total: 0,
		};
		return HttpResponse.json(body);
	}),

	http.post(`${API}/games/bet`, async ({ request }) => {
		const json = (await request.json()) as { amount: string };
		const placed: BetDto = {
			id: "bet-1",
			userId: "user-1",
			username: "test-user",
			amountCents: json.amount,
			status: BetStatus.CONFIRMED,
			cashoutMultiplierHundredths: null,
			payoutCents: null,
			createdAt: new Date().toISOString(),
		};
		return HttpResponse.json(placed);
	}),

	http.post(`${API}/games/bet/cashout`, () => {
		const settled: BetDto = {
			id: "bet-1",
			userId: "user-1",
			username: "test-user",
			amountCents: "1000",
			status: BetStatus.WON,
			cashoutMultiplierHundredths: 200,
			payoutCents: "2000",
			createdAt: new Date().toISOString(),
		};
		return HttpResponse.json(settled);
	}),

	http.get(`${API}/games/leaderboard`, ({ request }) => {
		const url = new URL(request.url);
		const window =
			(url.searchParams.get("window") as LeaderboardWindow | null) ??
			LeaderboardWindow.TWENTY_FOUR_HOURS;
		const body: LeaderboardResponse = {
			window,
			entries: [],
			generatedAt: new Date().toISOString(),
		};
		return HttpResponse.json(body);
	}),
];
