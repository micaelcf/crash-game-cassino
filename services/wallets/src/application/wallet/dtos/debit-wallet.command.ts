export class DebitWalletCommand {
  constructor(
    public readonly messageId: string,
    public readonly userId: string,
    public readonly amount: bigint,
    public readonly roundId: string,
  ) {}
}
