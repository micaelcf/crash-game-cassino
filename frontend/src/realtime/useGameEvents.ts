import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { BetDto, RoundDto } from "#/api/types";
import { qk } from "#/queries/keys";
import { recordEvent } from "./eventLog";
import type {
	BetCashedOutPayload,
	BetPlacedPayload,
	RoundBettingPayload,
	RoundCrashedPayload,
	RoundStartedPayload,
} from "./events";
import { useSocket } from "./SocketProvider";

export function useGameEvents(): void {
	const { socket } = useSocket();
	const queryClient = useQueryClient();

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

		socket.on("round.betting", onBetting);
		socket.on("round.started", onStarted);
		socket.on("round.crashed", onCrashed);
		socket.on("bet.placed", onBetPlaced);
		socket.on("bet.cashed_out", onBetCashedOut);

		return () => {
			socket.off("round.betting", onBetting);
			socket.off("round.started", onStarted);
			socket.off("round.crashed", onCrashed);
			socket.off("bet.placed", onBetPlaced);
			socket.off("bet.cashed_out", onBetCashedOut);
		};
	}, [socket, queryClient]);
}
