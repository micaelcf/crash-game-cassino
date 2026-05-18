import { useHandleSignInCallback } from "@logto/react";
import { WarningIcon } from "@phosphor-icons/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "#/components/shared/AppShell";
import { POST_SIGN_IN_REDIRECT } from "#/lib/application/auth/config";

export const Route = createFileRoute("/callback")({ component: CallbackPage });

function CallbackPage() {
	const navigate = useNavigate();
	const { isLoading, error } = useHandleSignInCallback(() => {
		navigate({ to: POST_SIGN_IN_REDIRECT });
	});

	if (error) {
		return (
			<AppShell>
				<div className="mx-auto flex w-full max-w-md flex-1 items-center justify-center px-4">
					<div className="rounded-(--radius-card) bg-(--color-danger)/10 p-6 ring-1 ring-inset ring-(--color-danger)/40">
						<h1 className="flex items-center gap-2 text-lg font-bold text-(--color-danger)">
							<WarningIcon size={18} weight="duotone" />
							Sign-in failed
						</h1>
						<p className="mt-2 text-sm text-(--color-fg-muted)">
							{error.message}
						</p>
					</div>
				</div>
			</AppShell>
		);
	}

	return (
		<AppShell>
			<div className="flex flex-1 items-center justify-center text-(--color-fg-muted)">
				<p>{isLoading ? "Completing sign-in…" : "Redirecting…"}</p>
			</div>
		</AppShell>
	);
}
