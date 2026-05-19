import { screen, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "#/components/ui";
import { type PagedResult, type RoundDto, RoundStatus } from "#/lib/api/types";
import { server } from "../../test/msw/server";
import { renderWithProviders } from "../../test/providers";

const API = "http://api.test.local";
const navigateSpy = vi.fn();

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => (opts: unknown) => ({ options: opts }),
	Link: ({
		to,
		children,
		params,
		...props
	}: {
		to: string;
		params?: Record<string, string>;
		children: React.ReactNode;
	} & React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
		const href = params
			? Object.entries(params).reduce(
					(acc, [k, v]) => acc.replace(`$${k}`, v),
					to,
				)
			: to;
		return (
			<a href={href} {...props}>
				{children}
			</a>
		);
	},
	useNavigate: () => navigateSpy,
}));

const { Route } = (await import("./play")) as unknown as {
	Route: { options: { component: React.ComponentType } };
};

function PlayPage() {
	const Comp = Route.options.component;
	return (
		<TooltipProvider>
			<Comp />
		</TooltipProvider>
	);
}

function bettingRound(): RoundDto {
	return {
		id: "round-1",
		nonce: 1,
		status: RoundStatus.BETTING_PHASE,
		hashCommitment: "0".repeat(64),
		clientSeed: "c",
		bettingEndsAt: new Date(Date.now() + 8000).toISOString(),
		flyingStartedAt: null,
		crashedAt: null,
		growthRate: 0.06,
		crashPointHundredths: null,
		serverSeed: null,
		bets: [],
		serverTime: new Date().toISOString(),
	};
}

function freshlyCrashedRound(): RoundDto {
	return {
		id: "round-2",
		nonce: 2,
		status: RoundStatus.CRASHED,
		hashCommitment: "0".repeat(64),
		clientSeed: "c",
		bettingEndsAt: new Date(Date.now() - 12_000).toISOString(),
		flyingStartedAt: new Date(Date.now() - 2_000).toISOString(),
		crashedAt: new Date(Date.now() - 500).toISOString(), // fresh
		growthRate: 0.06,
		crashPointHundredths: 234,
		serverSeed: "s",
		bets: [],
		serverTime: new Date().toISOString(),
	};
}

function staleCrashedRound(): RoundDto {
	return {
		...freshlyCrashedRound(),
		id: "round-stale",
		crashedAt: new Date(Date.now() - 10_000).toISOString(), // > STALE_CRASH_MS
	};
}

function configureRound(round: RoundDto | null) {
	server.use(
		http.get(`${API}/games/rounds/current`, () =>
			HttpResponse.json<RoundDto | null>(round),
		),
		http.get(`${API}/games/rounds/history`, () =>
			HttpResponse.json<PagedResult<RoundDto>>({
				items: [],
				page: 1,
				pageSize: 20,
				total: 0,
			}),
		),
		http.get(`${API}/wallets/me`, () =>
			HttpResponse.json({
				id: "w",
				playerId: "user-1",
				balance: "100000",
				createdAt: "2026-05-19T12:00:00.000Z",
			}),
		),
	);
}

describe("/play", () => {
	it("redirects to /login when not authenticated", async () => {
		navigateSpy.mockClear();
		renderWithProviders(<PlayPage />, { authenticated: false });
		await waitFor(() =>
			expect(navigateSpy).toHaveBeenCalledWith({ to: "/login" }),
		);
	});

	it("shows 'Place your bets' overlay during BETTING phase", async () => {
		configureRound(bettingRound());
		renderWithProviders(<PlayPage />, { authenticated: true });
		await waitFor(() => {
			const matches = screen.getAllByText(/place your bets/i);
			expect(matches.length).toBeGreaterThan(0);
		});
	});

	it("suppresses crash overlay for a fresh CRASHED arrival when FLYING was never witnessed", async () => {
		// The chart's sawFlyingRef gates the overlay: refreshing directly into
		// CRASHED (without having seen FLYING this mount) must NOT flash the
		// overlay. Phase tag in the top-bar is still allowed.
		configureRound(freshlyCrashedRound());
		renderWithProviders(<PlayPage />, { authenticated: true });
		await waitFor(() => {
			expect(screen.getByText(/#2/)).toBeInTheDocument();
		});
		// Overlay-specific badge text "Crashed" must not appear (note: phase-tag
		// also has "Crashed" but is uppercase-tracked; the overlay variant lives
		// inside the bg-danger div with text-[0.4em] tracking — there's exactly
		// one "Crashed" in the DOM when overlay shows, none when suppressed).
		const crashed = screen.queryAllByText(/^crashed$/i);
		// Only the phase-tag should be present; if overlay rendered too, we'd
		// see 2 occurrences.
		expect(crashed.length).toBeLessThanOrEqual(1);
	});

	it("treats stale CRASHED round as IDLE (overlay suppressed, no 'Round in flight')", async () => {
		configureRound(staleCrashedRound());
		renderWithProviders(<PlayPage />, { authenticated: true });
		await waitFor(() => expect(screen.getByText(/#2/)).toBeInTheDocument());
		// Bet panel: should NOT show "Round in flight" (FLYING-specific copy)
		// since stale crash is coerced to IDLE → BetPanel sees round=null.
		expect(screen.queryByText(/round in flight/i)).not.toBeInTheDocument();
		// Phase tag in chart top-bar should show "Idle" (the IDLE state).
		expect(screen.getAllByText(/^idle$/i).length).toBeGreaterThan(0);
	});
});
