import { Pack, User, InviteSlot, PackMember, PackPhoto, VibeFilter } from '../types/models';

const now = Date.now();
const minutes = (m: number) => new Date(now - m * 60_000).toISOString();
const hours = (h: number) => new Date(now - h * 3600_000).toISOString();
const inHours = (h: number) => new Date(now + h * 3600_000).toISOString();

export const currentUser: User = {
  id: 'u-self',
  username: 'omr',
  phoneNumber: '+90 555 000 0000',
  isAdmin: false,
  lastPostAt: undefined,
  inviteCode: 'FLASH·ÖMR·7K',
  inviteSlots: 3,
  streakDays: 47,
  isPro: false,
  vibeProfile: {
    filterUsage: { raw: 0.16, cinema: 0.34, maku: 0.22, neagh: 0.18, ontario: 0.10, summer: 0, bonboa: 0, daisy: 0, earth: 0, hibiscus: 0 },
  },
  joinedAt: hours(24 * 47),
  city: 'istanbul',
  country: 'TR',
  flag: '🇹🇷',
  packs: 47,
  countries: 18,
  saved: 3,
  packedWith: [
    { flag: '🇯🇵', name: 'japan' },
    { flag: '🇧🇷', name: 'brazil' },
    { flag: '🇺🇸', name: 'usa' },
    { flag: '🇩🇪', name: 'germany' },
    { flag: '🇲🇽', name: 'mexico' },
    { flag: '🇬🇷', name: 'greece' },
  ],
};

const mkMember = (
  id: string,
  username: string,
  flag: string,
  city: string,
  country: string,
  initials: string,
  color: string,
  hasPosted = true,
  ghostEmoji?: string,
): PackMember => ({
  id,
  userId: id,
  username,
  flag,
  city,
  country,
  hasPosted,
  ghostEmoji,
  avatarColor: color,
  initials,
});

const placeholders: [string, string][] = [
  ['#3b2a4a', '#1a1a2e'],
  ['#4a2e2a', '#2a1a1a'],
  ['#2a3a4a', '#1a2632'],
  ['#3a4a2a', '#1f2a18'],
  ['#4a3a2a', '#2a1f14'],
  ['#2a4a3a', '#152a22'],
];

let pi = 0;
const ph = (): [string, string] => placeholders[pi++ % placeholders.length];

const mkPhoto = (userId: string, filter: VibeFilter): PackPhoto => ({
  id: `p-${Math.random().toString(36).slice(2, 8)}`,
  userId,
  filter,
  capturedAt: minutes(Math.floor(Math.random() * 60)),
  expiresAt: inHours(18),
  placeholder: ph(),
});

export const mockPacks: Pack[] = [
  {
    id: 'pack-1',
    number: 47,
    members: [
      mkMember('u-self', 'you', '🇹🇷', 'istanbul', 'TR', 'OM', '#FFD60A'),
      mkMember('u-2', 'kenji', '🇯🇵', 'tokyo', 'JP', 'KN', '#5DCAA5', true, '👻'),
      mkMember('u-3', 'lara', '🇧🇷', 'rio', 'BR', 'LA', '#EF9F27', true, '🔥'),
      mkMember('u-4', 'sam', '🇺🇸', 'nyc', 'US', 'SM', '#AFA9EC', true, '🌙'),
    ],
    photos: [
      mkPhoto('u-self', 'cinema'),
      mkPhoto('u-2', 'summer'),
      mkPhoto('u-3', 'ontario'),
      mkPhoto('u-4', 'maku'),
    ],
    chemistryScore: 78,
    createdAt: minutes(14),
    expiresAt: inHours(18),
    isSaved: false,
    status: 'active',
    countriesCount: 4,
    apartMinutes: 14,
    comment: {
      messages: [
        {
          id: 'c1',
          userId: 'u-2',
          flag: '🇯🇵',
          city: 'tokyo',
          text: 'this rooftop hit different tonight.',
          sentAt: minutes(8),
        },
        {
          id: 'c2',
          userId: 'u-3',
          flag: '🇧🇷',
          city: 'rio',
          text: 'beach was empty, kinda surreal.',
          sentAt: minutes(5),
        },
      ],
      windowOpensAt: minutes(2),
      windowClosesAt: inHours(2),
      isLocked: false,
    },
  },
  {
    id: 'pack-2',
    number: 46,
    members: [
      mkMember('u-self', 'you', '🇹🇷', 'istanbul', 'TR', 'OM', '#FFD60A'),
      mkMember('u-5', 'noor', '🇩🇪', 'berlin', 'DE', 'NR', '#F09595', true, '✨'),
      mkMember('u-6', 'aki', '🇲🇽', 'cdmx', 'MX', 'AK', '#5DCAA5', true),
      mkMember('u-7', 'eva', '🇬🇷', 'athens', 'GR', 'EV', '#AFA9EC', true, '🌊'),
    ],
    photos: [
      mkPhoto('u-self', 'maku'),
      mkPhoto('u-5', 'cinema'),
      mkPhoto('u-6', 'summer'),
      mkPhoto('u-7', 'raw'),
    ],
    chemistryScore: 64,
    createdAt: hours(8),
    expiresAt: inHours(-1), // expired
    isSaved: true,
    status: 'expired',
    countriesCount: 4,
    apartMinutes: 22,
  },
  {
    id: 'pack-3',
    number: 45,
    members: [
      mkMember('u-self', 'you', '🇹🇷', 'istanbul', 'TR', 'OM', '#FFD60A'),
      mkMember('u-8', 'theo', '🇫🇷', 'paris', 'FR', 'TH', '#EF9F27'),
      mkMember('u-9', 'mai', '🇰🇷', 'seoul', 'KR', 'MA', '#5DCAA5'),
      mkMember('u-10', 'rio', '🇮🇹', 'milan', 'IT', 'RI', '#F09595'),
    ],
    photos: [
      mkPhoto('u-self', 'ontario'),
      mkPhoto('u-8', 'summer'),
      mkPhoto('u-9', 'cinema'),
      mkPhoto('u-10', 'maku'),
    ],
    chemistryScore: 42,
    createdAt: hours(20),
    expiresAt: inHours(4),
    isSaved: false,
    status: 'active',
    countriesCount: 4,
    apartMinutes: 35,
  },
];

export const mockInviteSlots: InviteSlot[] = [
  { id: 's1', invitedUsername: 'kemal', status: 'joined', sentAt: hours(48) },
  { id: 's2', invitedUsername: 'ayşe', status: 'pending', sentAt: hours(12) },
  { id: 's3', status: 'open' },
];
