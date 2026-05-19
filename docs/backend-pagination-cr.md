# Backend Change Request — Server-Paginated List Endpoints

> Audience: backend specialist agent. Frontend now drives all list views (`/history`, `/me`, future `/admin/*`) through a single `DataTable` design-system component that consumes the `PagedResult<T>` contract end-to-end. This CR locks the contract semantics and asks for guardrails so the table stays correct under load.

## Why

The frontend `DataTable` (`frontend/src/components/ui/data-table.tsx`) renders pager state from three fields:

- `total` — exact count of rows matching the query, **independent of `page`/`pageSize`**.
- `page` — 1-indexed current page that was served.
- `pageSize` — page size that was applied.

It computes `totalPages = ceil(total / pageSize)` and shows `Page X of Y` + `start–end of total`. Without an accurate `total`, the pager either lies about page count or disables Next prematurely.

Today both `GetRoundHistoryUseCase` and `GetMyBetsUseCase` already populate `total` via MikroORM `findAndCount`. This CR is about **keeping that property invariant** and adding new list endpoints in the same shape.

## Contract — `@crash/contracts`

```ts
// packages/contracts/src/pagination.ts (already exists, do not change)
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}
```

Rules:

- `total` must equal the count of rows the query would return without `LIMIT`/`OFFSET`. Same `WHERE`, same joins, same filters.
- `total` is a non-negative integer. Empty result ⇒ `total: 0`, `items: []`.
- `total` must be stable for a given query within a single sliding window of pagination clicks (see "Snapshot consistency" below).
- `page` and `pageSize` in the response echo the **applied** values after coercion/clamping. Frontend trusts these to drive the pager — don't return the raw input if you clamp.

## Endpoint inventory

| Method | Path                         | Use case                       | Status       |
| ------ | ---------------------------- | ------------------------------ | ------------ |
| `GET`  | `/games/rounds/history`      | `GetRoundHistoryUseCase`       | ✅ has `total` |
| `GET`  | `/games/bets/me`             | `GetMyBetsUseCase`             | ✅ has `total` |

Any future list endpoint **must** return `PagedResult<T>`. Don't ship a list endpoint that returns a bare `T[]` — the frontend has no path to add pagination after the fact without a contract change.

## Query parameter coercion

Required behavior:

- Default `page` = 1 when missing or `< 1`. Don't allow `page = 0`; treat as 1.
- Default `pageSize` = 20 when missing. Clamp to `[1, 100]`. Reject `pageSize > 100` with `400` rather than silently capping — otherwise the frontend pager will overshoot.
- Return 422 on non-integer `page`/`pageSize`. Don't coerce `"abc"` to NaN and let it propagate to OFFSET.

Suggested NestJS pattern (validation pipe + DTO):

```ts
// services/games/src/application/round/dtos/get-round-history.query.ts
import { IsInt, IsOptional, Max, Min } from 'class-validator'
import { Type } from 'class-transformer'

export class GetRoundHistoryQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page: number = 1

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  pageSize: number = 20
}
```

Wire `app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }))` so query strings deserialize through DTOs. The frontend sends `?page=2&pageSize=25` as strings — without `transform: true` they'll arrive as strings and MikroORM offset math will silently break (`(\"2\" - 1) * \"25\"` ⇒ NaN).

## Performance: `COUNT(*)` cost

`findAndCount` issues a second query (`SELECT COUNT(*)`). On the current data volume this is fine. As round/bet history grows, count cost rises linearly. Guardrails:

1. **Same filters as the page query.** No accidental `COUNT(*)` over the full table. Always count the filtered set. (Both current use cases already do this via `findAndCount` — keep it that way.)
2. **Index the filter+sort columns.** `Round` is filtered by `status = 'CRASHED'` and ordered by `crashedAt desc`. Add a composite index:
   ```sql
   CREATE INDEX idx_round_crashed_status ON round (status, crashed_at DESC);
   ```
   Same drill for `Bet`:
   ```sql
   CREATE INDEX idx_bet_user_created ON bet (user_id, created_at DESC);
   ```
   Verify via `EXPLAIN ANALYZE`. Without these, `OFFSET 5000 LIMIT 25` will scan the table and the count query will scan the index range.
3. **Avoid deep offsets.** Pages > 200 with `pageSize = 25` will hurt with offset pagination. Acceptable for now (admin-only territory); if needed later, switch to keyset (`crashedAt < :cursor`) and keep `total` as an estimate. **Do not** swap to keyset silently — the `DataTable` pager assumes total/page semantics.
4. **Cache `total` per (user, filter) when it's expensive.** For `/games/bets/me`, key = `userId` + filter hash. TTL ~10–30s is fine because the frontend invalidates the query when `round.crashed` fires. Don't cache `items` — only `total`.

## Snapshot consistency

Edge case: page 1 served, user clicks Next, new rows arrive in between. With `ORDER BY created_at DESC OFFSET 20`, the newly inserted row pushes the previously-page-1 row #20 onto page 2 ⇒ user sees a duplicate.

Mitigations, pick one:

- **Stable cursor (recommended for `/me`).** Take a snapshot timestamp on the first request and pass it as a sticky query param: `?createdBefore=2026-05-19T12:00:00Z&page=1`. Subsequent pages filter `WHERE created_at <= :createdBefore`. `total` is also computed against this filter. Frontend would need to thread this param — coordinate before implementing.
- **Accept the drift.** For the leaderboard and round history (write-once after crash), duplicates are unlikely. Document the limitation in the OpenAPI description.

For this CR: **accept the drift** for `/games/rounds/history` (rounds are append-only after `crashed_at` is set and ordered by `crashed_at`, so insertion races are negligible). For `/games/bets/me` (frequent inserts during play), add a TODO and revisit when complaints surface.

## Sorting

The frontend `DataTable` does not yet expose sort UI. Backend should return rows in a **deterministic** order even when the primary sort column has ties:

```ts
orderBy: { crashedAt: 'desc', id: 'desc' }  // tie-breaker on PK
```

Without this, `OFFSET`/`LIMIT` over two equal `crashedAt` rows is undefined per SQL spec → page boundaries can shuffle on refetch.

Apply to both existing use cases. Single-line change.

## Error shape

When pagination params fail validation, return:

```json
{
  "statusCode": 422,
  "message": "pageSize must not be greater than 100",
  "error": "Unprocessable Entity"
}
```

Frontend `pushNotification` reads `body.message` (see `frontend/src/lib/api/http/client.ts:50-55`). Don't return a bare string body.

## Acceptance checklist

- [ ] `GetRoundHistoryQuery` and `GetMyBetsQuery` are DTOs validated via `ValidationPipe` with `transform: true`.
- [ ] Both queries clamp `pageSize` to `[1, 100]` and reject above 100 with 422.
- [ ] Both queries have composite indexes on `(filter, sort_col)`.
- [ ] Both `orderBy` clauses include a PK tie-breaker.
- [ ] Both responses populate `total` via `findAndCount` (already done — verify it stays this way under any refactor).
- [ ] OpenAPI Swagger schema shows `total: number` on the response (`@nestjs/swagger` DTO annotations).
- [ ] Any new list endpoint defaults to `PagedResult<T>` and matches the same shape.

## Out of scope for this CR

- Keyset pagination (revisit when bet table exceeds ~1M rows).
- Sort UI / multi-column sort (frontend will own when needed).
- Filter UI on table headers (separate CR).
- Streaming long lists via WS (`round.crashed` already invalidates the cache; that's enough).
