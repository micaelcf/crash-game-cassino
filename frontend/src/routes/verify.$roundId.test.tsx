import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "#/components/ui";
import type { RoundVerifyDto } from "#/lib/api/types";
import { computeCrashHundredths } from "#/lib/domain/formula";
import { server } from "../../test/msw/server";
import { renderWithProviders } from "../../test/providers";

const API = "http://api.test.local";
const params = { roundId: "round-xyz" };

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => (opts: unknown) => ({
		options: opts,
		useParams: () => params,
	}),
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
}));

const { Route } = (await import("./verify.$roundId")) as unknown as {
	Route: { options: { component: React.ComponentType } };
};

function VerifyPage() {
	const Comp = Route.options.component;
	return (
		<TooltipProvider>
			<Comp />
		</TooltipProvider>
	);
}

describe("/verify/:roundId", () => {
	it("renders DTO rows from MSW", async () => {
		const dto: RoundVerifyDto = {
			roundId: "round-xyz",
			serverSeed: "server-seed-abc",
			clientSeed: "client-seed-xyz",
			nonce: 7,
			hashCommitment: "0".repeat(64),
			crashPointHundredths: await computeCrashHundredths(
				"server-seed-abc",
				"client-seed-xyz",
			),
		};
		server.use(
			http.get(`${API}/games/rounds/round-xyz/verify`, () =>
				HttpResponse.json(dto),
			),
		);
		renderWithProviders(<VerifyPage />);
		await waitFor(() =>
			expect(screen.getByText("round-xyz")).toBeInTheDocument(),
		);
		expect(screen.getByText("server-seed-abc")).toBeInTheDocument();
		expect(screen.getByText("client-seed-xyz")).toBeInTheDocument();
		expect(screen.getByText("7")).toBeInTheDocument();
	});

	it("shows MATCH when local computation matches server", async () => {
		const seedPair = { server: "s-correct", client: "c-correct" };
		const correctCrash = await computeCrashHundredths(
			seedPair.server,
			seedPair.client,
		);
		server.use(
			http.get(`${API}/games/rounds/round-xyz/verify`, () =>
				HttpResponse.json<RoundVerifyDto>({
					roundId: "round-xyz",
					serverSeed: seedPair.server,
					clientSeed: seedPair.client,
					nonce: 1,
					hashCommitment: "0".repeat(64),
					crashPointHundredths: correctCrash,
				}),
			),
		);
		const user = userEvent.setup();
		renderWithProviders(<VerifyPage />);
		const btn = await screen.findByRole("button", { name: /verify locally/i });
		await user.click(btn);
		await waitFor(() =>
			expect(screen.getByText(/match @/i)).toBeInTheDocument(),
		);
	});

	it("shows MISMATCH when server reports a tampered crash point", async () => {
		const seedPair = { server: "s-tampered", client: "c-tampered" };
		const correctCrash = await computeCrashHundredths(
			seedPair.server,
			seedPair.client,
		);
		server.use(
			http.get(`${API}/games/rounds/round-xyz/verify`, () =>
				HttpResponse.json<RoundVerifyDto>({
					roundId: "round-xyz",
					serverSeed: seedPair.server,
					clientSeed: seedPair.client,
					nonce: 1,
					hashCommitment: "0".repeat(64),
					crashPointHundredths: correctCrash + 100, // tampered
				}),
			),
		);
		const user = userEvent.setup();
		renderWithProviders(<VerifyPage />);
		const btn = await screen.findByRole("button", { name: /verify locally/i });
		await user.click(btn);
		await waitFor(() =>
			expect(screen.getByText(/mismatch @/i)).toBeInTheDocument(),
		);
	});

	it("renders error state when round not verifiable", async () => {
		server.use(
			http.get(`${API}/games/rounds/round-xyz/verify`, () =>
				HttpResponse.json(
					{ message: "Round not yet crashed" },
					{ status: 409 },
				),
			),
		);
		renderWithProviders(<VerifyPage />);
		await waitFor(() =>
			expect(screen.getByText(/round not yet crashed/i)).toBeInTheDocument(),
		);
	});
});
