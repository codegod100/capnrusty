import type { Coffee, RoastProfile } from '$lib/data/fixtures';

const blendPrefixes = ['Aurora', 'Lunar', 'Solar', 'Nebula', 'Quasar', 'Eclipse', 'Zenith', 'Celestial'];
const blendSuffixes = ['Bloom', 'Drift', 'Pulse', 'Voyage', 'Beacon', 'Horizon', 'Echo', 'Current'];
const origins = [
  'Ethiopia',
  'Kenya',
  'Guatemala',
  'Peru',
  'Brazil',
  'Colombia',
  'Costa Rica',
  'Sumatra'
];
const roastLevels: RoastProfile[] = ['light', 'medium', 'dark'];
const tastingPalette = [
  'cocoa',
  'berries',
  'molasses',
  'hibiscus',
  'stone fruit',
  'spice',
  'vanilla',
  'jasmine',
  'maple',
  'black tea',
  'nougat',
  'citrus'
];

export function cloneCoffees(coffees: Coffee[]): Coffee[] {
  return coffees.map((coffee) => ({ ...coffee, tastingNotes: [...coffee.tastingNotes] }));
}

export function generateCoffee(): Coffee {
  return {
    id: crypto.randomUUID(),
    name: `${randomFrom(blendPrefixes)} ${randomFrom(blendSuffixes)}`,
    origin: randomFrom(origins),
    roast: randomFrom(roastLevels),
    tastingNotes: randomNotes(),
    stock: Math.floor(20 + Math.random() * 45),
    price: Math.round((14 + Math.random() * 9) * 100) / 100
  };
}

function randomFrom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function randomNotes(): string[] {
  const noteCount = 3;
  const selected = new Set<string>();
  while (selected.size < noteCount) {
    selected.add(randomFrom(tastingPalette));
  }
  return Array.from(selected);
}
