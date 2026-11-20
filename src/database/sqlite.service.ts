import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

@Injectable()
export class SqliteService implements OnModuleDestroy {
  readonly db: DatabaseSync;

  constructor() {
    const databasePath = resolve(
      process.env.SQLITE_DATABASE_PATH ?? './data/learn_flutter.sqlite',
    );
    mkdirSync(dirname(databasePath), { recursive: true });
    this.db = new DatabaseSync(databasePath, { timeout: 5000 });
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        price REAL NOT NULL CHECK (price >= 0),
        quantity INTEGER NOT NULL CHECK (quantity >= 0),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS app_metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
    this.seedProductsOnce();
  }

  onModuleDestroy(): void {
    this.db.close();
  }

  private seedProductsOnce(): void {
    const key = 'learn_flutter_products_seeded_v1';
    const marker = this.db
      .prepare('SELECT value FROM app_metadata WHERE key = ?')
      .get(key) as { value: string } | undefined;
    if (marker) return;

    this.db.exec('BEGIN');
    try {
      const insert = this.db.prepare(`
        INSERT OR IGNORE INTO products (id, name, description, price, quantity)
        VALUES (?, ?, ?, ?, ?)
      `);
      insert.run(1, 'Ordinateur portable', 'Ordinateur Lenovo Core i5', 450000, 10);
      insert.run(2, 'Smartphone', 'Samsung Galaxy', 180000, 15);
      insert.run(3, 'Casque Bluetooth', 'Casque sans fil', 25000, 20);
      this.db
        .prepare('INSERT INTO app_metadata (key, value) VALUES (?, ?)')
        .run(key, new Date().toISOString());
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
}
