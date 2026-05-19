import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";

import { ToastProvider, TooltipProvider } from "#/components/ui";
import { AuthProvider } from "#/providers/AuthProvider";
import { NotificationsBridge } from "#/providers/NotificationsBridge";
import TanStackQueryDevtools from "#/providers/QueryDevtools";
import TanstackQueryProvider from "#/providers/QueryProvider";
import { SocketProvider } from "#/providers/SocketProvider";
import appCss from "#/styles.css?url";

interface MyRouterContext {
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ name: "theme-color", content: "#1a0f08" },
			{ title: "Crash Game" },
		],
		links: [
			{ rel: "stylesheet", href: appCss },
			{ rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
			{ rel: "alternate icon", href: "/favicon.ico" },
			{ rel: "preconnect", href: "https://fonts.googleapis.com" },
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous",
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap",
			},
		],
	}),
	notFoundComponent: NotFoundPage,
	errorComponent: ErrorPage,
	shellComponent: RootDocument,
});

function NotFoundPage() {
	return (
		<main className="flex min-h-screen flex-col items-center justify-center gap-4 text-fg">
			<h1 className="font-mono text-6xl font-black tracking-tight text-(--color-neon-pink)">
				404
			</h1>
			<p className="text-fg-muted">Page not found.</p>
			<a
				href="/"
				className="rounded-control bg-(--color-neon-green) px-5 py-2 font-semibold text-bg-0">
				Go home
			</a>
		</main>
	);
}

function ErrorPage({ error }: { error: Error }) {
	return (
		<main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-fg">
			<h1 className="font-mono text-3xl font-bold text-danger">
				Something broke
			</h1>
			<pre className="max-w-2xl overflow-auto rounded-(--radius-card) border border-border bg-bg-1 p-4 text-xs text-fg-muted">
				{error?.message ?? String(error)}
			</pre>
			<a
				href="/"
				className="rounded-control bg-(--color-neon-green) px-5 py-2 font-semibold text-bg-0">
				Reload
			</a>
		</main>
	);
}

function RootDocument({ children }: { children: React.ReactNode }) {
	const { queryClient } = Route.useRouteContext();

	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body>
				<TanstackQueryProvider queryClient={queryClient}>
					<AuthProvider>
						<SocketProvider>
							<TooltipProvider>
								<ToastProvider>
									<NotificationsBridge />
									{children}
								</ToastProvider>
							</TooltipProvider>
						</SocketProvider>
					</AuthProvider>
				</TanstackQueryProvider>
				<TanStackDevtools
					config={{ position: "bottom-right" }}
					plugins={[
						{
							name: "Tanstack Router",
							render: <TanStackRouterDevtoolsPanel />,
						},
						TanStackQueryDevtools,
					]}
				/>
				<Scripts />
			</body>
		</html>
	);
}
