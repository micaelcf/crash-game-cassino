import { createFileRoute } from "@tanstack/react-router";
import { JsonView } from "#/components/playground/JsonView";
import { MoneyDisplay } from "#/components/playground/MoneyDisplay";
import { Section } from "#/components/playground/Section";
import { isApiError } from "#/lib/api/http/client";
import {
	useCreateWalletMutation,
	useMyWallet,
} from "#/lib/application/wallet/queries";

export const Route = createFileRoute("/playground/wallet")({
	component: WalletSection,
});

function WalletSection() {
	const wallet = useMyWallet();
	const create = useCreateWalletMutation();
	const walletError = isApiError(wallet.error) ? wallet.error : null;
	const createError = isApiError(create.error) ? create.error : null;

	return (
		<div className="space-y-4">
			<Section
				title="GET /wallets/me"
				actions={
					<button
						type="button"
						onClick={() => wallet.refetch()}
						className="rounded border border-slate-700 px-2 py-1 text-xs hover:bg-slate-800"
					>
						Refetch
					</button>
				}
			>
				{walletError ? (
					<p className="text-rose-400 text-xs">
						HTTP {walletError.status}: {walletError.message}
					</p>
				) : null}
				<p>
					Balance:{" "}
					<MoneyDisplay cents={wallet.data?.balance ?? null} suffix=" cents" />
				</p>
				<JsonView value={wallet.data ?? null} />
			</Section>

			<Section
				title="POST /wallets"
				description="201 first call, 409 if a wallet already exists for this player."
				actions={
					<button
						type="button"
						onClick={() => create.mutate()}
						disabled={create.isPending}
						className="rounded bg-emerald-500 px-2 py-1 font-semibold text-slate-950 text-xs disabled:opacity-50"
					>
						{create.isPending ? "Creating…" : "Create wallet"}
					</button>
				}
			>
				{createError ? (
					<p className="text-rose-400 text-xs">
						HTTP {createError.status}: {createError.message}
					</p>
				) : null}
				<JsonView value={create.data ?? null} />
			</Section>
		</div>
	);
}
