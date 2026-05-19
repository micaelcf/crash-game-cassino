import { createFileRoute } from "@tanstack/react-router";
import { JsonView } from "#/components/playground/JsonView";
import { MoneyDisplay } from "#/components/playground/MoneyDisplay";
import { Section } from "#/components/playground/Section";
import { isApiError } from "#/lib/api/http/client";
import { useMyWallet } from "#/lib/application/wallet/queries";

export const Route = createFileRoute("/playground/wallet")({
	component: WalletSection,
});

function WalletSection() {
	const wallet = useMyWallet();
	const walletError = isApiError(wallet.error) ? wallet.error : null;

	return (
		<div className="space-y-4">
			<Section
				title="GET /wallets/me"
				description="Auto-provisions on first read — no explicit create call."
				actions={
					<button
						type="button"
						onClick={() => wallet.refetch()}
						className="rounded border border-slate-700 px-2 py-1 text-xs hover:bg-slate-800">
						Refetch
					</button>
				}>
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
		</div>
	);
}
