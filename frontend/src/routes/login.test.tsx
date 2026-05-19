import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
	Navigate: ({ to }: { to: string }) => (
		<div data-testid="navigate" data-to={to} />
	),
}));

const { Route } = (await import("./login")) as unknown as {
	Route: { options: { component: React.ComponentType } };
};

function LoginPage() {
	const Comp = Route.options.component;
	return <Comp />;
}

describe("/login", () => {
	it("renders loading state when Logto isLoading=true", () => {
		renderWithProviders(<LoginPage />, {
			authenticated: false,
			isLoading: true,
		});
		expect(screen.getByText(/loading/i)).toBeInTheDocument();
	});

	it("renders sign-in card when anon", () => {
		renderWithProviders(<LoginPage />, { authenticated: false });
		expect(
			screen.getByRole("button", { name: /continue with logto/i }),
		).toBeInTheDocument();
		expect(screen.getByText(/sign in to play/i)).toBeInTheDocument();
	});

	it("calls signIn(callbackUrl) when CTA clicked", async () => {
		const user = userEvent.setup();
		const { logto } = renderWithProviders(<LoginPage />, {
			authenticated: false,
		});
		await user.click(
			screen.getByRole("button", { name: /continue with logto/i }),
		);
		expect(logto.signIn).toHaveBeenCalledTimes(1);
		expect((logto.signIn as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatch(
			/\/callback$/,
		);
	});

	it("redirects to /play when already authenticated", () => {
		renderWithProviders(<LoginPage />, { authenticated: true });
		const nav = screen.getByTestId("navigate");
		expect(nav).toHaveAttribute("data-to", "/play");
	});
});
