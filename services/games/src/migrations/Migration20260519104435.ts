import { Migration } from '@mikro-orm/migrations';

export class Migration20260519104435 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create table "bets" ("id" uuid not null, "round_id" varchar(255) not null, "user_id" varchar(255) not null, "username" varchar(255) not null, "amount_cents" bigint not null, "status" text not null, "cashout_multiplier_hundredths" int null, "payout_cents" bigint null, "cancellation_reason" varchar(255) null, "created_at" timestamptz not null, "updated_at" timestamptz not null, primary key ("id"));`);
    this.addSql(`create index "bets_status_created_at_idx" on "bets" ("status", "created_at");`);
    this.addSql(`create index "bets_user_id_created_at_idx" on "bets" ("user_id", "created_at");`);
    this.addSql(`alter table "bets" add constraint "bets_status_check" check ("status" in ('PENDING', 'CONFIRMED', 'CANCELLED', 'WON', 'LOST'));`);

    this.addSql(`create table "inbox_events" ("id" varchar(255) not null, "processed_at" timestamptz not null, primary key ("id"));`);

    this.addSql(`create table "outbox_events" ("id" uuid not null, "event_type" varchar(255) not null, "aggregate_type" varchar(255) not null, "aggregate_id" varchar(255) not null, "payload" jsonb not null, "created_at" timestamptz not null, "published_at" timestamptz null, "attempts" int not null default 0, primary key ("id"));`);

    this.addSql(`create table "rounds" ("id" uuid not null, "nonce" int not null, "server_seed_hash" varchar(255) not null, "server_seed" varchar(255) null, "client_seed" varchar(255) not null, "crash_point_hundredths" int not null, "growth_rate" real not null, "status" text not null default 'BETTING_PHASE', "created_at" timestamptz not null, "betting_ends_at" timestamptz not null, "flying_started_at" timestamptz null, "crashed_at" timestamptz null, primary key ("id"));`);
    this.addSql(`create index "rounds_status_crashed_at_idx" on "rounds" ("status", "crashed_at");`);
    this.addSql(`alter table "rounds" add constraint "rounds_status_check" check ("status" in ('BETTING_PHASE', 'FLYING', 'CRASHED'));`);
  }

}
