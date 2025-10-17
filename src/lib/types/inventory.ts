import type { RpcTarget } from 'capnweb';
import type { Coffee } from '$lib/data/fixtures';

export interface CoffeeSubscription {
  close(): void;
}

export interface CoffeeNotificationTarget extends RpcTarget {
  show(message: string): void | Promise<void>;
}

export interface CoffeeSyncSession {
  send(message: string | null): Promise<void>;
  close(): void;
}

export interface CoffeeInventoryApi {
  listCoffees(): Promise<Coffee[]>;
  getCoffee(id: string): Promise<Coffee | undefined>;
  subscribeToCoffees(callback: (items: Coffee[]) => void): Promise<CoffeeSubscription>;
  createDemoCoffee(notifier: CoffeeNotificationTarget): Promise<Coffee>;
  openSyncChannel(callback: (encodedMessage: string) => void): Promise<CoffeeSyncSession>;
}
