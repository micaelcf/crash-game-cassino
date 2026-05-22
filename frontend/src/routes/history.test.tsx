import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "#/components/ui";
import { type PagedResult, type RoundDto, RoundStatus } from "#/lib/api/types";
import { server } from "../../test/msw/server";
import { renderWithProviders } from "../../test/providers";

const API = "http://api.test.local";

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
}));

const { Route } = (await import("./history")) as unknown as {
	Route: { options: { component: React.ComponentType } };
};

function HistoryPage() {
	const Comp = Route.options.component;
	return (
		<TooltipProvider>
			<Comp />
		</TooltipProvider>
	);
}

function makeRound(id: string, crash: number): RoundDto {
	return {
		id,
		nonce: 1,
		status: RoundStatus.CRASHED,
		hashCommitment: "0".repeat(64),
		clientSeed: "c",
		bettingEndsAt: "2026-05-19T11:59:50.000Z",
		flyingStartedAt: "2026-05-19T12:00:00.000Z",
		crashedAt: "2026-05-19T12:00:10.000Z",
		growthRate: 0.06,
		crashPointHundredths: crash,
		serverSeed: "s",
		bets: [],
		serverTime: new Date().toISOString(),
	};
}

describe("/history", () => {
	it("renders empty state when no rounds", async () => {
		server.use(
			http.get(`${API}/games/rounds/history`, () =>
				HttpResponse.json<PagedResult<RoundDto>>({
					items: [],
					page: 1,
					pageSize: 25,
					total: 0,
				}),
			),
		);
		renderWithProviders(<HistoryPage />);
		await waitFor(() =>
			expect(screen.getByText(/no rounds on this page/i)).toBeInTheDocument(),
		);
	});

	it("renders crash multipliers from MSW", async () => {
		server.use(
			http.get(`${API}/games/rounds/history`, () =>
				HttpResponse.json<PagedResult<RoundDto>>({
					items: [makeRound("r-1", 234), makeRound("r-2", 102)],
					page: 1,
					pageSize: 25,
					total: 2,
				}),
			),
		);
		renderWithProviders(<HistoryPage />);
		await waitFor(() =>
			expect(screen.getAllByText("2.34x").length).toBeGreaterThan(0),
		);
		expect(screen.getAllByText("1.02x").length).toBeGreaterThan(0);
	});

	it("verify link href encodes roundId", async () => {
		server.use(
			http.get(`${API}/games/rounds/history`, () =>
				HttpResponse.json<PagedResult<RoundDto>>({
					items: [makeRound("round-xyz", 500)],
					page: 1,
					pageSize: 25,
					total: 1,
				}),
			),
		);
		renderWithProviders(<HistoryPage />);
		await waitFor(() => {
			const links = screen.getAllByRole("link", { name: /verify/i });
			expect(links[0]).toHaveAttribute("href", "/verify/round-xyz");
		});
	});

	it("pager: Prev disabled on page 1; Next enabled when total > pageSize", async () => {
		server.use(
			http.get(`${API}/games/rounds/history`, () =>
				HttpResponse.json<PagedResult<RoundDto>>({
					items: Array.from({ length: 25 }, (_, i) =>
						makeRound(`r-${i}`, 200 + i),
					),
					page: 1,
					pageSize: 25,
					total: 100,
				}),
			),
		);
		renderWithProviders(<HistoryPage />);
		await waitFor(() =>
			expect(screen.getByText(/showing/i)).toBeInTheDocument(),
		);
		const buttons = screen.getAllByRole("button");
		const prev = buttons.find((b) => /prev/i.test(b.textContent ?? ""));
		const next = buttons.find((b) => /next/i.test(b.textContent ?? ""));
		expect(prev).toBeDisabled();
		expect(next).not.toBeDisabled();
	});

	it("pager: clicking Next advances page", async () => {
		const user = userEvent.setup();
		let pageRequested = 1;
		server.use(
			http.get(`${API}/games/rounds/history`, ({ request }) => {
				const url = new URL(request.url);
				pageRequested = Number(url.searchParams.get("page") ?? "1");
				return HttpResponse.json<PagedResult<RoundDto>>({
					items: Array.from({ length: 25 }, (_, i) =>
						makeRound(`r-${pageRequested}-${i}`, 200 + i),
					),
					page: pageRequested,
					pageSize: 25,
					total: 100,
				});
			}),
		);
		renderWithProviders(<HistoryPage />);
		await waitFor(() =>
			expect(screen.getByText(/showing/i)).toBeInTheDocument(),
		);
		const next = screen
			.getAllByRole("button")
			.find((b) => /next/i.test(b.textContent ?? ""));
		await user.click(next as HTMLElement);
		await waitFor(() => expect(pageRequested).toBe(2));
	});
});
