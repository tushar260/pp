# pp

Lean Instagram `#matcha` ingest: Express + TypeORM + Postgres. One process produces and consumes. Files stay on local disk.

## Startup

Requires Node.js 20+ (the start script uses `--env-file`) and Postgres already running.

1. Copy env and fill in values (Postgres user, Meta token, `API_TOKEN`, AWS keys, existing FIFO `QUEUE_URL`):

```bash
cp .env.template .env
```

2. Database `postgres` on `127.0.0.1:5432` must exist (schema `public`).

3. Install from the lockfile and run migrations:

```bash
npm ci
npm run migration:run
```

Migrations also run on process start (`migrationsRun`).

4. Start the API, producer, and queue consumer:

```bash
npm start
```

Default port is `4057`. List media with:

```bash
curl -H "Authorization: Bearer ${API_TOKEN}" "http://127.0.0.1:4057/hashtags"
```

`QUEUE_URL` empty skips enqueue; producer still starts.

## Current setup

- Producer (`setInterval` + in-process `syncLock`) reads `hashtags` and enqueues `top` and `recent` per row on a single FIFO SQS queue.
- One consumer switch handles `top`, `recent`, and `download`.
- `top` / `recent` only bulk-upsert (batch size 50, conflict on `ig_media_id`).
- Downloads are a separate message, hashed group/dedup from `media_url`.
- Logging uses `console.log`.

## Future: horizontal scaling

These are not required now.

1. **Move the trigger out of the service** — EventBridge Scheduler every 3 hours. One instance takes a distributed lock, reads `hashtags`, enqueues `top` + `recent` per row.
2. **Queues per job type** — today one FIFO queue and one consumer for all types. Later: separate queues per action (traffic differs) without a large extra infra bill.
3. **Upsert batch size** — now 50 (Meta page size). Decrease if the database cannot take 50-row upserts. Meta `limit` can stay 50 while DB batches shrink.
4. **Rate limit at each level** — Meta sequential paging + `X-App-Usage` / 429 on sync workers. Bound download concurrency. Keep API traffic off ingest workers.
5. **File store** — swap local `storage/` for S3; `storage_key` becomes the object key.
6. **Split API server and queue consumer** — they scale differently. Same DB + SQS.
7. **Optional first-page cache** — hottest `GET /hashtags` page is stable for ~3 hours after a sync. Same instance: in-memory. Split processes: Redis. Not a requirement now.
8. **Logging** — replace the `console` wrapper with **pino** so logging is async; keep `info` / `error` / `debug` call sites.
