import { bigWin } from './big-win'
import { crashAt1_5 } from './crash-at-1-5'
import type { Scenario } from './crash-seeds.types'
import { streakOfFiveCrashes } from './streak-of-five-crashes'

export const SCENARIOS: Record<string, Scenario> = {
	[crashAt1_5.name]: crashAt1_5,
	[streakOfFiveCrashes.name]: streakOfFiveCrashes,
	[bigWin.name]: bigWin,
}

export type { Scenario } from './crash-seeds.types'
