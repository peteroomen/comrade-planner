import { GOODS } from '@/content/ids';
import type { GoodId } from '@/content/ids';
import type { Stock } from './types';

export function emptyStock(): Stock {
  return { grain: 0, steel: 0, tractors: 0, consumer: 0 };
}

export function addStock(target: Stock, good: GoodId, qty: number): void {
  target[good] = Math.max(0, target[good] + qty);
}

export function totalStock(stock: Stock): number {
  return GOODS.reduce((sum, g) => sum + stock[g], 0);
}

export function cloneStock(stock: Stock): Stock {
  return { ...stock };
}
