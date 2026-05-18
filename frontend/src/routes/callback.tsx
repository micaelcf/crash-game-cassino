import { useHandleSignInCallback } from "@logto/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { POST_SIGN_IN_REDIRECT } from "#/lib/application/auth/config";

export const Route = createFileRoute("/callback")({ component: CallbackPage });

function CallbackPage() {
	const navigate = useNavigate();
	const { isLoading, error } = useHandleSignInCallback(() => {
		navigate({ to: POST_SIGN_IN_REDIRECT });
	});

	if (error) {
		return (
			<main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
				<div className="max-w-md rounded-xl border border-red-800 bg-red-950/40 p-6">
					<h1 className="text-xl font-semibold text-red-300">Sign-in failed</h1>
					<p className="mt-2 text-sm text-red-200">{error.message}</p>
				</div>
			</main>
		);
	}

	return (
		<main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
			<p>{isLoading ? "Completing sign-in..." : "Redirecting..."}</p>
		</main>
	);
}
