import type { Scenario } from './crash-seeds.types'

export const streakOfFiveCrashes: Scenario = {
	name: 'streak-of-five-crashes',
	description:
		'Five consecutive low crashes (≤1.5x). Stress-tests the loss path and leaderboard exclusion of LOST bets.',
	players: [
		{
			userId: 'seed-player-streak',
			username: 'streak',
			startingBalanceCents: 500_000n,
		},
	],
	rounds: [
		{
			targetHundredths: 100,
			bets: [{ userId: 'seed-player-streak', amountCents: 1_000n }],
		},
		{
			targetHundredths: 110,
			bets: [{ userId: 'seed-player-streak', amountCents: 1_000n }],
		},
		{
			targetHundredths: 125,
			bets: [{ userId: 'seed-player-streak', amountCents: 1_000n }],
		},
		{
			targetHundredths: 100,
			bets: [{ userId: 'seed-player-streak', amountCents: 1_000n }],
		},
		{
			targetHundredths: 150,
			bets: [{ userId: 'seed-player-streak', amountCents: 1_000n }],
		},
	],
}
