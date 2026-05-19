import { screen, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "#/components/ui";
import {
	type BetDto,
	BetStatus,
	type PagedResult,
	type WalletDto,
} from "#/lib/api/types";
import { server } from "../../test/msw/server";
import { renderWithProviders } from "../../test/providers";

const API = "http://api.test.local";
const navigateSpy = vi.fn();

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => (opts: unknown) => ({ options: opts }),
	Link: ({
		to,
		children,
		...props
	}: {
		to: string;
		children: React.ReactNode;
	} & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
		<a href={to} {...props}>
			{children}
		</a>
	),
	useNavigate: () => navigateSpy,
}));

const { Route } = (await import("./me")) as unknown as {
	Route: { options: { component: React.ComponentType } };
};

function MePage() {
	const Comp = Route.options.component;
	return (
		<TooltipProvider>
			<Comp />
		</TooltipProvider>
	);
}

function makeBet(overrides: Partial<BetDto> = {}): BetDto {
	return {
		id: "b-1",
		userId: "user-1",
		username: "test-user",
		amountCents: "1000",
		status: BetStatus.CONFIRMED,
		cashoutMultiplierHundredths: null,
		payoutCents: null,
		createdAt: "2026-05-19T12:00:00.000Z",
		...overrides,
	};
}

describe("/me", () => {
	it("redirects to /login when not authenticated", async () => {
		navigateSpy.mockClear();
		renderWithProviders(<MePage />, { authenticated: false });
		await waitFor(() =>
			expect(navigateSpy).toHaveBeenCalledWith({ to: "/login" }),
		);
	});

	it("renders empty state when no bets", async () => {
		server.use(
			http.get(`${API}/games/bets/me`, () =>
				HttpResponse.json<PagedResult<BetDto>>({
					items: [],
					page: 1,
					pageSize: 20,
					total: 0,
				}),
			),
		);
		renderWithProviders(<MePage />, { authenticated: true });
		await waitFor(() =>
			expect(screen.getByText(/no bets yet/i)).toBeInTheDocument(),
		);
	});

	it("renders stats + populated table", async () => {
		const wallet: WalletDto = {
			id: "w-1",
			playerId: "user-1",
			balance: "150000",
			createdAt: "2026-05-19T12:00:00.000Z",
		};
		server.use(
			http.get(`${API}/wallets/me`, () => HttpResponse.json(wallet)),
			http.get(`${API}/games/bets/me`, () =>
				HttpResponse.json<PagedResult<BetDto>>({
					items: [
						makeBet({
							id: "b-1",
							status: BetStatus.WON,
							amountCents: "1000",
							payoutCents: "2500",
							cashoutMultiplierHundredths: 250,
						}),
						makeBet({
							id: "b-2",
							status: BetStatus.LOST,
							amountCents: "500",
						}),
					],
					page: 1,
					pageSize: 20,
					total: 2,
				}),
			),
		);
		renderWithProviders(<MePage />, { authenticated: true });
		await waitFor(() =>
			expect(screen.getByText("1500.00 BRL")).toBeInTheDocument(),
		);
		// WON/LOST badges appear (lowercased per StatusBadge), possibly in
		// both desktop table and mobile card layouts simultaneously in jsdom.
		expect(screen.getAllByText("won").length).toBeGreaterThan(0);
		expect(screen.getAllByText("lost").length).toBeGreaterThan(0);
		// Win-rate = 1 / 2 = 50%
		expect(screen.getByText("50%")).toBeInTheDocument();
		// Profit = (2500 - 1000) - 500 = 1000 cents = 10.00
		expect(screen.getAllByText(/\+10\.00/).length).toBeGreaterThan(0);
	});
});
