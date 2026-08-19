# instructions

## setup

1. Fill in .env with Postgres user, Meta token, `API_TOKEN`, AWS keys, and existing FIFO `QUEUE_URL`.
2. Database `postgres` on `127.0.0.1:5432` must already exist (schema `public`).
3. `npm ci`
4. `npm run migration:run` (also runs on process start via TypeORM `migrationsRun`)
5. `npm start`

## vars

- `PORT`
- `POSTGRES_HOSTNAME`, `POSTGRES_PORT`, `POSTGRES_DATABASE`, `POSTGRES_USERNAME`, `POSTGRES_PASSWORD`
- `IG_PAGE_TOKEN`, `IG_USER_ID`, `META_GRAPH_BASE_URL`
- `API_TOKEN` — `Authorization: Bearer` for `GET /hashtags`
- `STORAGE_DIR`
- `SYNC_INTERVAL_MS` — default 10800000 (3 hours)
- `QUEUE_POLL_MS`
- `QUEUE_URL` — existing FIFO queue; this app does not create it
- `region`, `accessKeyId`, `secretAccessKey`

## tradeoffs

- Producer reads `hashtags` and enqueues top+recent; one FIFO queue / one consumer for all types in favor of making a lean service initially 
- top/recent only bulk-upsert (batch 50 on `ig_media_id`); downloads fanned out after.
- `created_at` / `updated_at` on both tables.
- List API ordered by internal `id` desc.
- Local disk, not S3.
- `console` logger, not pino.
- No carousel children crawl; skip download when `media_url` is missing.
- Like/comment counts omitted.

## ai-usage

- **Cursor** (Grok) was used to plan the service from the assignment, draft the phased design, and write the implementation.
- I reviewed schema, queue hashing, Meta rate-limit handling, upsert conflict behavior, and the public API shape myself.
- Runtime verification (queue credentials, Meta token, a real sync pass) is left to the person running `.env`.
