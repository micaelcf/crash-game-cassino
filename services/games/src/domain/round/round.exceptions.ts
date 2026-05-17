export class RoundNotBettingException extends Error {
  readonly name = 'RoundNotBettingException';
  constructor(roundId?: string) {
    super(`Round ${roundId ?? ''} is not in BETTING_PHASE`.trim());
  }
}

export class RoundNotFlyingException extends Error {
  readonly name = 'RoundNotFlyingException';
  constructor(roundId?: string) {
    super(`Round ${roundId ?? ''} is not FLYING`.trim());
  }
}

export class RoundAlreadyCrashedException extends Error {
  readonly name = 'RoundAlreadyCrashedException';
  constructor(roundId?: string) {
    super(`Round ${roundId ?? ''} has already crashed`.trim());
  }
}

export class RoundNotCrashedException extends Error {
  readonly name = 'RoundNotCrashedException';
  constructor(roundId?: string) {
    super(`Round ${roundId ?? ''} has not crashed yet`.trim());
  }
}
