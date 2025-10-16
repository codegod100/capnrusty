export type RoastProfile = 'light' | 'medium' | 'dark';

export interface Coffee {
  id: string;
  name: string;
  origin: string;
  roast: RoastProfile;
  tastingNotes: string[];
  stock: number;
  price: number;
}

export const coffees: Coffee[] = [
  {
    id: 'andromeda',
    name: 'Andromeda Blend',
    origin: 'Ethiopia & Guatemala',
    roast: 'light',
    tastingNotes: ['citrus', 'floral', 'stone fruit'],
    stock: 34,
    price: 18.5
  },
  {
    id: 'nebula',
    name: 'Nebula Night',
    origin: 'Colombia',
    roast: 'medium',
    tastingNotes: ['caramel', 'cocoa', 'hazelnut'],
    stock: 52,
    price: 16.75
  },
  {
    id: 'cosmos',
    name: 'Cosmos Reserve',
    origin: 'Kenya',
    roast: 'light',
    tastingNotes: ['cranberry', 'black tea', 'bergamot'],
    stock: 21,
    price: 21.0
  },
  {
    id: 'pulsar',
    name: 'Pulsar Decaf',
    origin: 'Peru',
    roast: 'dark',
    tastingNotes: ['molasses', 'dark chocolate', 'smoke'],
    stock: 44,
    price: 17.25
  },
  {
    id: 'zenith',
    name: 'Zenith Espresso',
    origin: 'Brazil',
    roast: 'dark',
    tastingNotes: ['almond', 'toffee', 'brown sugar'],
    stock: 63,
    price: 19.5
  }
];
