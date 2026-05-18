import type { RoundStatus } from "#/lib/api/types";

export type RoundPhase = RoundStatus;

declare const __brand: unique symbol;
export type Brand<T, B extends string> = T & { readonly [__brand]: B };

export type UserId = Brand<string, "UserId">;
export type RoundId = Brand<string, "RoundId">;
export type BetId = Brand<string, "BetId">;
export type WalletId = Brand<string, "WalletId">;
export type Cents = Brand<bigint, "Cents">;
export type Hundredths = Brand<number, "Hundredths">;

export const UserId = (raw: string): UserId => raw as UserId;
export const RoundId = (raw: string): RoundId => raw as RoundId;
export const BetId = (raw: string): BetId => raw as BetId;
export const WalletId = (raw: string): WalletId => raw as WalletId;
export const Cents = (raw: bigint): Cents => raw as Cents;
export const Hundredths = (raw: number): Hundredths => raw as Hundredths;

export const BET_MIN_CENTS: Cents = Cents(100n);
export const BET_MAX_CENTS: Cents = Cents(100_000n);
