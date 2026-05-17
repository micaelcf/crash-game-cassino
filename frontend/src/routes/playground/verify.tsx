import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import type { ApiError } from "#/api/http";
import type { RoundVerifyDto } from "#/api/types";
import { Field } from "#/components/playground/Field";
import { JsonView } from "#/components/playground/JsonView";
import { Section } from "#/components/playground/Section";
import { useVerifyRound } from "#/queries/rounds";

export const Route = createFileRoute("/playground/verify")({
	component: VerifySection,
});

interface VerifyResult {
	hashOk: boolean;
	computedHash: string;
	computedCrashHundredths: number;
	crashOk: boolean;
}

function VerifySection() {
	const [draft, setDraft] = useState("");
	const [submittedId, setSubmittedId] = useState<string | undefined>();
	const verify = useVerifyRound(submittedId);
	const [result, setResult] = useState<VerifyResult | null>(null);
	const [verifyError, setVerifyError] = useState<string | null>(null);
	const err = verify.error as ApiError | undefined;

	const run = async () => {
		setVerifyError(null);
		setResult(null);
		if (!verify.data) return;
		try {
			const r = await computeVerification(verify.data);
			setResult(r);
		} catch (e) {
			setVerifyError((e as Error).message);
		}
	};

	return (
		<div className="space-y-4">
			<Section title="Verify a past round">
				<Field label="Round ID" hint="Get one from /playground/history.">
					{({ id }) => (
						<input
							id={id}
							type="text"
							value={draft}
							onChange={(e) => setDraft(e.target.value)}
							className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 font-mono text-sm"
							placeholder="round id"
						/>
					)}
				</Field>
				<div className="flex gap-2">
					<button
						type="button"
						onClick={() => setSubmittedId(draft.trim() || undefined)}
						disabled={!draft.trim()}
						className="rounded bg-emerald-500 px-2 py-1 font-semibold text-slate-950 text-xs disabled:opacity-50"
					>
						Fetch verify payload
					</button>
					<button
						type="button"
						onClick={run}
						disabled={!verify.data}
						className="rounded border border-slate-700 px-2 py-1 text-xs disabled:opacity-50"
					>
						Recompute client-side
					</button>
				</div>
			</Section>

			<Section title="Server verify payload">
				{err ? (
					<p className="text-rose-400 text-xs">
						HTTP {err.status}: {err.message}
					</p>
				) : null}
				<JsonView value={verify.data ?? null} />
			</Section>

			<Section title="Client-side verification">
				{verifyError ? (
					<p className="text-rose-400 text-xs">{verifyError}</p>
				) : null}
				<JsonView value={result} />
				{result ? (
					<p className="text-sm">
						Hash chain:{" "}
						<strong
							className={result.hashOk ? "text-emerald-300" : "text-rose-400"}
						>
							{result.hashOk ? "PASS" : "FAIL"}
						</strong>
						{" · "}
						Crash point:{" "}
						<strong
							className={result.crashOk ? "text-emerald-300" : "text-rose-400"}
						>
							{result.crashOk ? "PASS" : "FAIL"}
						</strong>
					</p>
				) : null}
			</Section>
		</div>
	);
}

async function computeVerification(
	payload: RoundVerifyDto,
): Promise<VerifyResult> {
	const encoder = new TextEncoder();
	const seedBytes = encoder.encode(payload.serverSeed);
	const hashBuf = await crypto.subtle.digest("SHA-256", seedBytes);
	const computedHash = bufToHex(hashBuf);
	const hashOk =
		computedHash.toLowerCase() === payload.hashCommitment.toLowerCase();

	const key = await crypto.subtle.importKey(
		"raw",
		seedBytes,
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const hmac = await crypto.subtle.sign(
		"HMAC",
		key,
		encoder.encode(payload.clientSeed),
	);
	const hmacHex = bufToHex(hmac);
	const h = Number.parseInt(hmacHex.slice(0, 13), 16);
	const e = 2 ** 52;
	const m = Math.max(1, Math.floor((100 * e - h) / (e - h)) / 100);
	const computedCrashHundredths = Math.round(m * 100);
	const crashOk = computedCrashHundredths === payload.crashPointHundredths;

	return { hashOk, computedHash, computedCrashHundredths, crashOk };
}

function bufToHex(buf: ArrayBuffer): string {
	const bytes = new Uint8Array(buf);
	let out = "";
	for (const b of bytes) out += b.toString(16).padStart(2, "0");
	return out;
}
