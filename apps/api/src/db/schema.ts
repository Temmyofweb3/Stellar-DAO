/**
 * Postgres schema (drizzle). The in-memory repos above are the default
 * scaffold behaviour; if `DATABASE_URL` is set, these tables back them
 * via a swap-in `DrizzleAssetRepository`. Future migrations live in
 * `apps/api/drizzle/`.
 */
import { pgTable, serial, text, varchar, timestamp, bigint, integer } from 'drizzle-orm/pg-core';

export const assets = pgTable('assets', {
  id: serial('id').primaryKey(),
  wrapperToken: varchar('wrapper_token', { length: 64 }).notNull(),
  chain: varchar('chain', { length: 16 }).notNull(),
  sourceAddress: varchar('source_address', { length: 128 }).notNull(),
  symbol: varchar('symbol', { length: 16 }).notNull(),
  name: varchar('name', { length: 128 }).notNull(),
  decimals: integer('decimals').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const transactions = pgTable('transactions', {
  id: varchar('id', { length: 64 }).primaryKey(),
  type: varchar('type', { length: 8 }).notNull(),
  sourceChain: varchar('source_chain', { length: 16 }).notNull(),
  sourceToken: varchar('source_token', { length: 128 }).notNull(),
  wrapperToken: varchar('wrapper_token', { length: 64 }).notNull(),
  recipient: varchar('recipient', { length: 64 }).notNull(),
  amount: bigint('amount', { mode: 'bigint' }).notNull(),
  status: varchar('status', { length: 16 }).notNull(),
  sourceTxHash: varchar('source_tx_hash', { length: 128 }),
  stellarTxHash: varchar('stellar_tx_hash', { length: 128 }),
  nonce: varchar('nonce', { length: 64 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  error: text('error'),
});
