import type { Coffee } from '$lib/data/fixtures';

export interface CoffeeSubscription {
  close(): void;
}

export interface CoffeeSyncSession {
  send(message: string | null): Promise<void>;
  close(): void;
}

export interface CoffeeInventoryApi {
  listCoffees(): Promise<Coffee[]>;
  getCoffee(id: string): Promise<Coffee | undefined>;
  subscribeToCoffees(callback: (items: Coffee[]) => void): Promise<CoffeeSubscription>;
  createDemoCoffee(): Promise<Coffee>;
  openSyncChannel(callback: (encodedMessage: string) => void): Promise<CoffeeSyncSession>;
}
