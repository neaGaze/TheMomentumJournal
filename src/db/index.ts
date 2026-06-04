import { Pool } from 'pg';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

// Lazy init: don't connect (or throw) at import time. `next build` imports
// every route module during page-data collection, where DATABASE_URL isn't
// set — connecting must wait until the first actual query, at runtime.
let _pool: Pool | undefined;
let _db: NodePgDatabase<typeof schema> | undefined;

function init() {
  if (!_db) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set');
    }
    _pool = new Pool({ connectionString: process.env.DATABASE_URL });
    _db = drizzle(_pool, { schema });
  }
  return _db;
}

function bound(target: object, prop: PropertyKey) {
  const value = Reflect.get(target, prop);
  return typeof value === 'function' ? value.bind(target) : value;
}

export const pool = new Proxy({} as Pool, {
  get(_t, prop) {
    init();
    return bound(_pool as Pool, prop);
  },
});

export const db = new Proxy({} as NodePgDatabase<typeof schema>, {
  get(_t, prop) {
    return bound(init(), prop);
  },
});

export { schema };
