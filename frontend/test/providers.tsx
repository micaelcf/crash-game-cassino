import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderOptions } from "@testing-library/react";
import type { HttpHandler } from "msw";
import type { ReactElement, ReactNode } from "react";
import {
	makeDefaultMockLogto,
	type MockHandleSignInCallback,
	type MockLogtoValue,
	MockLogtoProvider,
} from "./mock-logto";
import { server } from "./msw/server";

export interface RenderWithProvidersOptions extends Omit<RenderOptions, "wrapper"> {
	authenticated?: boolean;
	isLoading?: boolean;
	logto?: Partial<MockLogtoValue>;
	callback?: MockHandleSignInCallback;
	handlers?: HttpHandler[];
	queryClient?: QueryClient;
}

export function makeTestQueryClient(): QueryClient {
	return new QueryClient({
		defaultOptions: {
			queries: { retry: false, gcTime: Number.POSITIVE_INFINITY },
			mutations: { retry: false },
		},
	});
}

export function renderWithProviders(
	ui: ReactElement,
	opts: RenderWithProvidersOptions = {},
) {
	if (opts.handlers) server.use(...opts.handlers);

	const queryClient = opts.queryClient ?? makeTestQueryClient();
	const logtoValue = makeDefaultMockLogto({
		isAuthenticated: opts.authenticated ?? false,
		isLoading: opts.isLoading ?? false,
		...opts.logto,
	});

	function Wrapper({ children }: { children: ReactNode }) {
		return (
			<MockLogtoProvider value={logtoValue} callback={opts.callback}>
				<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
			</MockLogtoProvider>
		);
	}

	return {
		queryClient,
		logto: logtoValue,
		...render(ui, { wrapper: Wrapper, ...opts }),
	};
}
