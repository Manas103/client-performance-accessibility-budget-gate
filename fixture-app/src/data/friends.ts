import { mulberry32 } from '../bloat/gen';

export type Friend = {
  id: number;
  name: string;
  status: 'online' | 'away' | 'offline';
  favorite: boolean;
};

const FIRST_NAMES = [
  'Ava', 'Liam', 'Noah', 'Mia', 'Zoe', 'Kai', 'Luna', 'Finn', 'Nora', 'Theo',
  'Isla', 'Owen', 'Ruby', 'Leo', 'Ivy', 'Jude', 'Wren', 'Milo', 'Sage', 'Remy',
];
const LAST_NAMES = [
  'Park', 'Chen', 'Diaz', 'Khan', 'Ito', 'Silva', 'Adler', 'Nash', 'Voss', 'Reyes',
];
const STATUSES: Friend['status'][] = ['online', 'away', 'offline'];

export function generateFriends(count: number, seed = 42): Friend[] {
  const rand = mulberry32(seed);
  const friends: Friend[] = [];
  for (let i = 0; i < count; i++) {
    const first = FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)];
    const last = LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)];
    friends.push({
      id: i,
      name: `${first} ${last} ${i}`,
      status: STATUSES[Math.floor(rand() * STATUSES.length)],
      favorite: rand() < 0.15,
    });
  }
  return friends;
}
