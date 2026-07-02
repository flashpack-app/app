// Filters are real 3D LUTs (.cube) baked into GPU textures. `raw` = no LUT.
export type VibeFilter =
  | 'raw'
  | 'cinema'
  | 'maku'
  | 'neagh'
  | 'ontario'
  | 'summer'
  | 'bonboa'
  | 'daisy'
  | 'earth'
  | 'hibiscus';
export const FREE_FILTERS: VibeFilter[] = ['raw', 'cinema', 'maku', 'neagh', 'ontario', 'summer'];
export const PRO_FILTERS: VibeFilter[] = ['bonboa', 'daisy', 'earth', 'hibiscus'];
export const ALL_FILTERS: VibeFilter[] = [...FREE_FILTERS, ...PRO_FILTERS];

export type PackStatus = 'forming' | 'active' | 'expired';
export type InviteStatus = 'open' | 'pending' | 'joined';

export interface VibeProfile {
  filterUsage: Record<VibeFilter, number>; // 0..1
}

export interface User {
  id: string;
  username: string;
  phoneNumber: string;
  email?: string;
  isAdmin: boolean;
  banned?: boolean;
  avatarUrl?: string;
  lastPostAt?: string;
  inviteCode: string; // FLASH·XXX·XX
  invitedBy?: string;
  inviteSlots: number;
  streakDays: number;
  isPro: boolean;
  proBorder?: string;
  vibeProfile: VibeProfile;
  joinedAt: string;
  city: string;
  country: string;
  flag: string;
  packs: number;
  countries: number;
  saved: number;
  packedWith: { flag: string; name: string }[];
  hasPongBadge?: boolean;
}

export interface AdminUserRow extends User {
  inviteeCount: number;
}

export interface AdminStats {
  users: number;
  admins: number;
  openGenesis: number;
  usedGenesis: number;
}

export interface GenesisCode {
  code: string;
  used: boolean;
  used_by: string | null;
  used_at: string | null;
}

export interface PackMember {
  id: string;
  userId: string;
  username: string;
  flag: string;
  city: string;
  country: string;
  lat?: number;
  lng?: number;
  hasPosted: boolean;
  ghostEmoji?: string;
  avatarColor: string;
  avatarUrl?: string;
  isPro?: boolean;
  proBorder?: string;
  initials: string;
}

export interface PhotoReaction {
  userId: string;
  emoji: string;
}

export interface PackPhoto {
  id: string;
  userId: string;
  imageURL?: string; // optional in mock
  thumbnailURL?: string;
  videoURL?: string; // flash.live 3-second silent clip (Pro)
  filter: VibeFilter;
  capturedAt: string;
  expiresAt: string;
  // Mock placeholder gradient colors when no real image yet
  placeholder?: [string, string];
  reactions?: PhotoReaction[];
}

export interface CommentMessage {
  id: string;
  userId: string;
  username: string;
  flag: string;
  city: string;
  text: string;
  sentAt: string;
  avatarUrl?: string;
}

export interface PackComment {
  messages: CommentMessage[];
  windowOpensAt?: string;
  windowClosesAt?: string;
  isLocked: boolean;
}

export interface Pack {
  id: string;
  number: number;
  members: PackMember[];
  photos: PackPhoto[];
  chemistryScore: number; // 0-100
  createdAt: string;
  expiresAt: string;
  isSaved: boolean;
  comment?: PackComment;
  status: PackStatus;
  countriesCount: number;
  apartMinutes: number;
  reactions?: { userId: string; emoji: string }[];
  screenshots?: PackScreenshot[];
  // 'duet' = 2-person pack rendered as a 1×2 split screen; default 'squad'
  packType?: 'duet' | 'squad';
}

export interface PackScreenshot {
  userId: string;
  username: string;
  takenAt: string;
}

export interface InviteSlot {
  id: string;
  invitedUserId?: string;
  invitedUsername?: string;
  status: InviteStatus;
  sentAt?: string;
}
