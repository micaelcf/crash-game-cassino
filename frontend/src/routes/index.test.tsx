import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/providers";

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
}));

const { Route } = (await import("./index")) as unknown as {
	Route: { options: { component: React.ComponentType } };
};

function HomePage() {
	const Comp = Route.options.component;
	return <Comp />;
}

describe("/ (landing)", () => {
	it("anon sees Sign in CTA", () => {
		renderWithProviders(<HomePage />, { authenticated: false });
		const cta = screen.getByRole("link", { name: /sign in to play/i });
		expect(cta).toHaveAttribute("href", "/login");
	});

	it("authed sees Enter CTA pointing to /play", () => {
		renderWithProviders(<HomePage />, { authenticated: true });
		const cta = screen.getByRole("link", { name: /enter the game/i });
		expect(cta).toHaveAttribute("href", "/play");
	});

	it("renders the Provably fair callout", () => {
		renderWithProviders(<HomePage />, { authenticated: false });
		expect(screen.getAllByText(/provably fair/i).length).toBeGreaterThan(0);
	});
});
