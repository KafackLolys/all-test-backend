import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SqliteService } from '../database/sqlite.service.js';
import { NovuService } from '../push/novu.service.js';
import type { Product, ProductInput } from './product.types.js';

type ProductRow = {
  id: number;
  name: string;
  description: string;
  price: number;
  quantity: number;
};

@Injectable()
export class ProductsService {
  constructor(
    private readonly sqlite: SqliteService,
    private readonly novu: NovuService,
  ) {}

  findAll(): Product[] {
    const rows = this.sqlite.db
      .prepare('SELECT id, name, description, price, quantity FROM products ORDER BY id')
      .all() as ProductRow[];
    return rows.map((row) => this.toProduct(row));
  }

  findOne(id: number): Product {
    const row = this.sqlite.db
      .prepare('SELECT id, name, description, price, quantity FROM products WHERE id = ?')
      .get(id) as ProductRow | undefined;
    if (!row) throw new NotFoundException('PRODUCT_NOT_FOUND');
    return this.toProduct(row);
  }

  create(input: ProductInput): Product {
    const product = this.validate(input);
    const result = this.sqlite.db
      .prepare('INSERT INTO products (name, description, price, quantity) VALUES (?, ?, ?, ?)')
      .run(product.name, product.description, product.price, product.quantity);
    return this.findOne(Number(result.lastInsertRowid));
  }

  update(id: number, input: ProductInput): Product {
    this.findOne(id);
    const product = this.validate(input);
    this.sqlite.db.prepare(`
      UPDATE products
      SET name = ?, description = ?, price = ?, quantity = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(product.name, product.description, product.price, product.quantity, id);
    return this.findOne(id);
  }

  async remove(id: number): Promise<{
    product: Product;
    notification: { triggered: boolean; reason?: string };
  }> {
    const product = this.findOne(id);
    this.sqlite.db.prepare('DELETE FROM products WHERE id = ?').run(id);
    const notification = await this.novu.triggerProductDeleted(product.name);
    return { product, notification };
  }

  private validate(input: ProductInput): Omit<Product, 'id'> {
    if (!input || typeof input !== 'object') {
      throw new BadRequestException('INVALID_PRODUCT_BODY');
    }
    const name = typeof input.name === 'string' ? input.name.trim() : '';
    const description = typeof input.description === 'string' ? input.description.trim() : '';
    const price = input.price;
    const quantity = input.quantity;
    if (!name || name.length > 120) throw new BadRequestException('NAME_REQUIRED_MAX_120');
    if (description.length > 1000) throw new BadRequestException('DESCRIPTION_MAX_1000');
    if (typeof price !== 'number' || !Number.isFinite(price) || price < 0) {
      throw new BadRequestException('PRICE_MUST_BE_NON_NEGATIVE');
    }
    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 0) {
      throw new BadRequestException('QUANTITY_MUST_BE_NON_NEGATIVE_INTEGER');
    }
    return { name, description, price, quantity };
  }

  private toProduct(row: ProductRow): Product {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      price: row.price,
      quantity: row.quantity,
    };
  }
}
