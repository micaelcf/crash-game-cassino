import { screen, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "#/components/ui";
import {
	type LeaderboardEntryDto,
	type LeaderboardResponse,
	LeaderboardWindow,
} from "#/lib/api/types";
import { server } from "../../test/msw/server";
import { renderWithProviders } from "../../test/providers";

const API = "http://api.test.local";

let currentSearch: { window: LeaderboardWindow } = {
	window: LeaderboardWindow.TWENTY_FOUR_HOURS,
};

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => (opts: unknown) => ({
		options: opts,
		useSearch: () => currentSearch,
	}),
	Link: ({
		to,
		search,
		children,
		...props
	}: {
		to: string;
		search?: { window: LeaderboardWindow };
		children: React.ReactNode;
	} & React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
		const href = search ? `${to}?window=${search.window}` : to;
		return (
			<a href={href} {...props}>
				{children}
			</a>
		);
	},
}));

const { Route } = (await import("./leaderboard")) as unknown as {
	Route: { options: { component: React.ComponentType } };
};

function LeaderboardPage() {
	const Comp = Route.options.component;
	return (
		<TooltipProvider>
			<Comp />
		</TooltipProvider>
	);
}

function entry(
	overrides: Partial<LeaderboardEntryDto> = {},
): LeaderboardEntryDto {
	return {
		userId: "u-1",
		username: "topplayer",
		winningsCents: "5000",
		betsCount: 3,
		biggestMultiplierHundredths: 320,
		...overrides,
	};
}

describe("/leaderboard", () => {
	it("renders empty state when entries=[]", async () => {
		currentSearch = { window: LeaderboardWindow.TWENTY_FOUR_HOURS };
		server.use(
			http.get(`${API}/games/leaderboard`, () =>
				HttpResponse.json<LeaderboardResponse>({
					window: LeaderboardWindow.TWENTY_FOUR_HOURS,
					entries: [],
					generatedAt: "2026-05-19T12:00:00.000Z",
				}),
			),
		);
		renderWithProviders(<LeaderboardPage />);
		await waitFor(() =>
			expect(screen.getByText(/no champions yet/i)).toBeInTheDocument(),
		);
	});

	it("renders entries with winnings + multipliers", async () => {
		currentSearch = { window: LeaderboardWindow.TWENTY_FOUR_HOURS };
		server.use(
			http.get(`${API}/games/leaderboard`, () =>
				HttpResponse.json<LeaderboardResponse>({
					window: LeaderboardWindow.TWENTY_FOUR_HOURS,
					entries: [
						entry({
							userId: "winner",
							username: "ace",
							winningsCents: "10000",
						}),
						entry({
							userId: "runner-up",
							username: "bee",
							winningsCents: "5000",
						}),
					],
					generatedAt: "2026-05-19T12:00:00.000Z",
				}),
			),
		);
		renderWithProviders(<LeaderboardPage />);
		await waitFor(() => expect(screen.getByText("ace")).toBeInTheDocument());
		expect(screen.getByText("bee")).toBeInTheDocument();
		expect(screen.getByText("+100.00")).toBeInTheDocument();
		expect(screen.getByText("+50.00")).toBeInTheDocument();
	});

	it("highlights the current user's row", async () => {
		currentSearch = { window: LeaderboardWindow.TWENTY_FOUR_HOURS };
		server.use(
			http.get(`${API}/games/leaderboard`, () =>
				HttpResponse.json<LeaderboardResponse>({
					window: LeaderboardWindow.TWENTY_FOUR_HOURS,
					entries: [
						entry({ userId: "user-1", username: "test-user" }),
						entry({ userId: "other", username: "other" }),
					],
					generatedAt: "2026-05-19T12:00:00.000Z",
				}),
			),
		);
		renderWithProviders(<LeaderboardPage />, { authenticated: true });
		await waitFor(() => expect(screen.getByText(/you/i)).toBeInTheDocument());
	});

	it("requests the 7d window when search param is 7d", async () => {
		currentSearch = { window: LeaderboardWindow.SEVEN_DAYS };
		let requestedWindow: string | null = null;
		server.use(
			http.get(`${API}/games/leaderboard`, ({ request }) => {
				requestedWindow = new URL(request.url).searchParams.get("window");
				return HttpResponse.json<LeaderboardResponse>({
					window: LeaderboardWindow.SEVEN_DAYS,
					entries: [],
					generatedAt: "2026-05-19T12:00:00.000Z",
				});
			}),
		);
		renderWithProviders(<LeaderboardPage />);
		await waitFor(() => expect(requestedWindow).toBe("7d"));
	});
});
