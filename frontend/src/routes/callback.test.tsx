import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/providers";

const navigateSpy = vi.fn();

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => (opts: unknown) => ({ options: opts }),
	useNavigate: () => navigateSpy,
}));

const { Route } = (await import("./callback")) as unknown as {
	Route: { options: { component: React.ComponentType } };
};

function CallbackPage() {
	const Comp = Route.options.component;
	return <Comp />;
}

describe("/callback", () => {
	it("renders loading state while SDK in-flight", () => {
		renderWithProviders(<CallbackPage />, {
			callback: { isLoading: true },
		});
		expect(screen.getByText(/completing sign-in/i)).toBeInTheDocument();
	});

	it("navigates to /play on success", async () => {
		navigateSpy.mockClear();
		renderWithProviders(<CallbackPage />, {
			callback: { isLoading: false, autoComplete: true },
		});
		await waitFor(() => {
			expect(navigateSpy).toHaveBeenCalledWith({ to: "/play" });
		});
	});

	it("renders error message when SDK fails", () => {
		renderWithProviders(<CallbackPage />, {
			callback: {
				isLoading: false,
				error: new Error("State mismatched"),
			},
		});
		expect(screen.getByText(/sign-in failed/i)).toBeInTheDocument();
		expect(screen.getByText(/state mismatched/i)).toBeInTheDocument();
	});
});
