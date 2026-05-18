import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { BetDto, RoundDto } from "#/api/types";
import { useCurrentUserSub } from "#/auth/useCurrentUserSub";
import { qk } from "#/queries/keys";
import { recordEvent } from "./eventLog";
import type {
	BetCancelledPayload,
	BetCashedOutPayload,
	BetPlacedPayload,
	RoundBettingPayload,
	RoundCrashedPayload,
	RoundStartedPayload,
} from "./events";
import { pushNotification } from "./notifications";
import { useSocket } from "./SocketProvider";

export function useGameEvents(): void {
	const { socket } = useSocket();
	const queryClient = useQueryClient();
	const userSub = useCurrentUserSub();

	useEffect(() => {
		if (!socket) return;

		const onBetting = (payload: RoundBettingPayload) => {
			recordEvent({ type: "round.betting", payload });
			queryClient.invalidateQueries({ queryKey: qk.rounds.current() });
		};

		const onStarted = (payload: RoundStartedPayload) => {
			recordEvent({ type: "round.started", payload });
			queryClient.setQueryData<RoundDto | null>(qk.rounds.current(), (prev) => {
				if (!prev || prev.id !== payload.roundId) {
					queryClient.invalidateQueries({ queryKey: qk.rounds.current() });
					return prev;
				}
				return {
					...prev,
					status: "FLYING",
					flyingStartedAt: payload.startTime,
					growthRate: payload.growthRate,
				};
			});
		};

		const onCrashed = (payload: RoundCrashedPayload) => {
			recordEvent({ type: "round.crashed", payload });
			queryClient.setQueryData<RoundDto | null>(qk.rounds.current(), (prev) => {
				if (!prev || prev.id !== payload.roundId) {
					queryClient.invalidateQueries({ queryKey: qk.rounds.current() });
					return prev;
				}
				return {
					...prev,
					status: "CRASHED",
					crashPointHundredths: payload.crashPointHundredths,
					serverSeed: payload.serverSeed,
					clientSeed: payload.clientSeed,
					nonce: payload.nonce,
					crashedAt: new Date().toISOString(),
				};
			});
			queryClient.invalidateQueries({ queryKey: qk.wallet.me() });
			queryClient.invalidateQueries({
				queryKey: ["rounds", "history"],
				exact: false,
			});
		};

		const onBetPlaced = (payload: BetPlacedPayload) => {
			recordEvent({ type: "bet.placed", payload });

			// Late-debit race: wallet confirmed after the round already crashed.
			// Backend still emits bet.placed because the money moved. Do NOT append
			// a phantom bet to a CRASHED round — warn the owning user and let the
			// bet history surface the lost stake on next refetch.
			const cached = queryClient.getQueryData<RoundDto | null>(
				qk.rounds.current(),
			);
			if (
				cached &&
				cached.id === payload.roundId &&
				cached.status === "CRASHED"
			) {
				if (payload.userId === userSub) {
					pushNotification(
						"warning",
						"Your bet was confirmed after the round crashed. The stake was lost.",
					);
				}
				queryClient.invalidateQueries({ queryKey: qk.wallet.me() });
				queryClient.invalidateQueries({
					queryKey: ["rounds", "history"],
					exact: false,
				});
				queryClient.invalidateQueries({
					queryKey: ["bets", "me"],
					exact: false,
				});
				return;
			}

			queryClient.setQueryData<RoundDto | null>(qk.rounds.current(), (prev) => {
				if (!prev || prev.id !== payload.roundId) return prev;
				const exists = prev.bets.some((b) => b.id === payload.betId);
				const next: BetDto = exists
					? (prev.bets
							.map((b) =>
								b.id === payload.betId
									? ({
											...b,
											status: "CONFIRMED",
										} satisfies BetDto)
									: b,
							)
							.find((b) => b.id === payload.betId) ?? prev.bets[0])
					: {
							id: payload.betId,
							userId: payload.userId,
							username: payload.username,
							amountCents: payload.amountCents,
							status: "CONFIRMED",
							cashoutMultiplierHundredths: null,
							payoutCents: null,
							createdAt: new Date().toISOString(),
						};
				const merged = exists
					? prev.bets.map((b) => (b.id === payload.betId ? next : b))
					: [...prev.bets, next];
				return { ...prev, bets: merged };
			});
			queryClient.invalidateQueries({ queryKey: qk.wallet.me() });
		};

		const onBetCashedOut = (payload: BetCashedOutPayload) => {
			recordEvent({ type: "bet.cashed_out", payload });
			queryClient.setQueryData<RoundDto | null>(qk.rounds.current(), (prev) => {
				if (!prev || prev.id !== payload.roundId) return prev;
				return {
					...prev,
					bets: prev.bets.map((b) =>
						b.id === payload.betId
							? {
									...b,
									status: "WON",
									cashoutMultiplierHundredths: payload.multiplierHundredths,
									payoutCents: payload.payoutCents,
								}
							: b,
					),
				};
			});
			queryClient.invalidateQueries({ queryKey: qk.wallet.me() });
			queryClient.invalidateQueries({
				queryKey: ["bets", "me"],
				exact: false,
			});
		};

		const onBetCancelled = (payload: BetCancelledPayload) => {
			recordEvent({ type: "bet.cancelled", payload });
			queryClient.setQueryData<RoundDto | null>(qk.rounds.current(), (prev) => {
				if (!prev || prev.id !== payload.roundId) return prev;
				return {
					...prev,
					bets: prev.bets.filter((b) => b.id !== payload.betId),
				};
			});
			queryClient.invalidateQueries({ queryKey: qk.wallet.me() });
			queryClient.invalidateQueries({
				queryKey: ["bets", "me"],
				exact: false,
			});

			if (payload.userId === userSub) {
				pushNotification("error", `Bet rejected: ${payload.reason}`);
			}
		};

		socket.on("round.betting", onBetting);
		socket.on("round.started", onStarted);
		socket.on("round.crashed", onCrashed);
		socket.on("bet.placed", onBetPlaced);
		socket.on("bet.cashed_out", onBetCashedOut);
		socket.on("bet.cancelled", onBetCancelled);

		return () => {
			socket.off("round.betting", onBetting);
			socket.off("round.started", onStarted);
			socket.off("round.crashed", onCrashed);
			socket.off("bet.placed", onBetPlaced);
			socket.off("bet.cashed_out", onBetCashedOut);
			socket.off("bet.cancelled", onBetCancelled);
		};
	}, [socket, queryClient, userSub]);
}
