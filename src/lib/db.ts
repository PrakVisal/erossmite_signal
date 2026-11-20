import { neon } from "@neondatabase/serverless";

type Sql = ReturnType<typeof neon>;
let client: Sql | null = null;

function sql(): Sql {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    client = neon(url);
  }
  return client;
}

let ready: Promise<void> | null = null;

/** Creates the tables on first use, so there is no manual migration step. */
function ensureSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      const db = sql();
      await db.query(`CREATE TABLE IF NOT EXISTS signals (
        id          text PRIMARY KEY,
        mode        text NOT NULL,
        symbol      text NOT NULL,
        side        text NOT NULL,
        entry       double precision NOT NULL,
        sl          double precision NOT NULL,
        tp          double precision NOT NULL,
        rr          double precision NOT NULL,
        entry_tf    text NOT NULL,
        trend_tf    text NOT NULL,
        rsi         double precision,
        atr         double precision,
        bar_time    bigint NOT NULL,
        status      text NOT NULL DEFAULT 'open',
        r_result    double precision,
        created_at  timestamptz NOT NULL DEFAULT now(),
        closed_at   timestamptz
      )`);
      await db.query(`CREATE INDEX IF NOT EXISTS signals_created_idx ON signals (created_at DESC)`);
      await db.query(`CREATE TABLE IF NOT EXISTS candles (
        symbol     text NOT NULL,
        tf         text NOT NULL,
        data       jsonb NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (symbol, tf)
      )`);
      await db.query(`CREATE TABLE IF NOT EXISTS kv (
        key        text PRIMARY KEY,
        value      jsonb NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      )`);
    })().catch((e) => {
      ready = null; // retry on the next request
      throw e;
    });
  }
  return ready;
}

/** Run a parameterised query ($1, $2 ...) and get plain row objects back. */
export async function q<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  await ensureSchema();
  const rows = await sql().query(text, params);
  return rows as unknown as T[];
}
