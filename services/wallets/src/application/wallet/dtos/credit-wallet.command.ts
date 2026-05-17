export class CreditWalletCommand {
  constructor(
    public readonly messageId: string,
    public readonly userId: string,
    public readonly amount: bigint,
  ) {}
}
