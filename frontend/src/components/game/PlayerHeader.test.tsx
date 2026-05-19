import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "#/components/ui";
import { server } from "../../../test/msw/server";
import { renderWithProviders } from "../../../test/providers";

vi.mock("@tanstack/react-router", () => ({
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
	useNavigate: () => vi.fn(),
}));

const { PlayerHeader } = await import("./PlayerHeader");

const API = "http://api.test.local";

afterEach(() => vi.clearAllMocks());

function render(opts: Parameters<typeof renderWithProviders>[1] = {}) {
	return renderWithProviders(
		<TooltipProvider>
			<PlayerHeader />
		</TooltipProvider>,
		opts,
	);
}

describe("PlayerHeader (anon)", () => {
	it("renders Sign in CTA and hides wallet/sign-out", () => {
		render({ authenticated: false });
		expect(
			screen.getByRole("button", { name: /sign in/i }),
		).toBeInTheDocument();
		expect(screen.queryByText(/sign out/i)).not.toBeInTheDocument();
		// Wallet pill is wrapped in a Tooltip with label "Wallet balance"
		expect(screen.queryByText(/wallet balance/i)).not.toBeInTheDocument();
	});

	it("nav excludes Play and My bets when anon", () => {
		render({ authenticated: false });
		const nav = screen.getAllByRole("navigation")[0];
		expect(nav).toBeTruthy();
		expect(screen.queryAllByRole("link", { name: /play/i })).toHaveLength(0);
		expect(screen.queryAllByRole("link", { name: /my bets/i })).toHaveLength(0);
		expect(
			screen.getAllByRole("link", { name: /leaderboard/i }).length,
		).toBeGreaterThan(0);
		expect(
			screen.getAllByRole("link", { name: /history/i }).length,
		).toBeGreaterThan(0);
	});

	it("calls signIn(callbackUrl) when Sign in clicked", async () => {
		const user = userEvent.setup();
		const { logto } = render({ authenticated: false });
		await user.click(screen.getByRole("button", { name: /sign in/i }));
		expect(logto.signIn).toHaveBeenCalledTimes(1);
		expect((logto.signIn as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatch(
			/\/callback$/,
		);
	});
});

describe("PlayerHeader (authed)", () => {
	it("renders wallet balance from MSW", async () => {
		server.use(
			http.get(`${API}/wallets/me`, () =>
				HttpResponse.json({
					id: "wallet-1",
					playerId: "user-1",
					balance: "250000",
					createdAt: "2026-05-19T12:00:00.000Z",
				}),
			),
		);
		render({ authenticated: true });
		await waitFor(() =>
			expect(screen.getByText("2500.00")).toBeInTheDocument(),
		);
	});

	it("shows Sign out button + full nav including Play and My bets", () => {
		render({ authenticated: true });
		expect(
			screen.getByRole("button", { name: /sign out/i }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /sign in/i }),
		).not.toBeInTheDocument();
		expect(
			screen.getAllByRole("link", { name: /play/i }).length,
		).toBeGreaterThan(0);
		expect(
			screen.getAllByRole("link", { name: /my bets/i }).length,
		).toBeGreaterThan(0);
	});

	it("calls signOut(postSignOutUrl) when Sign out clicked", async () => {
		const user = userEvent.setup();
		const { logto } = render({ authenticated: true });
		await user.click(screen.getByRole("button", { name: /sign out/i }));
		expect(logto.signOut).toHaveBeenCalledTimes(1);
		expect((logto.signOut as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(
			"http://localhost:3000/",
		);
	});
});
