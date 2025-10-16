import type { Coffee } from '$lib/data/fixtures';

export interface CoffeeSubscription {
  close(): void;
}

export interface CoffeeInventoryApi {
  listCoffees(): Promise<Coffee[]>;
  getCoffee(id: string): Promise<Coffee | undefined>;
  subscribeToCoffees(callback: (items: Coffee[]) => void): Promise<CoffeeSubscription>;
}
