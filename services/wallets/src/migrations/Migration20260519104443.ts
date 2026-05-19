import { Migration } from '@mikro-orm/migrations';

export class Migration20260519104443 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create table "inbox_events" ("id" varchar(255) not null, "processed_at" timestamptz not null, primary key ("id"));`);

    this.addSql(`create table "outbox_events" ("id" uuid not null, "event_type" varchar(255) not null, "aggregate_type" varchar(255) not null, "aggregate_id" varchar(255) not null, "payload" jsonb not null, "created_at" timestamptz not null, "published_at" timestamptz null, "attempts" int not null default 0, primary key ("id"));`);

    this.addSql(`create table "wallets" ("id" uuid not null, "player_id" varchar(255) not null, "balance" bigint not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, primary key ("id"));`);
  }

}
