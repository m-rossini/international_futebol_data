import {
  Calendar,
  Clock,
  Flag,
  Globe,
  Info,
  MapPin,
  MessageSquare,
  ShieldAlert,
  Swords,
  TrendingUp,
  Trophy,
  Users,
  type LucideIcon,
} from 'lucide-react';

/**
 * Single source of truth for top-level navigation.
 *
 * The sidebar, the home page cards and the sitemap all read from this list, so
 * adding an entry here is the only way to add it anywhere — they cannot drift.
 */

export type NavAccent = 'blue' | 'violet' | 'amber' | 'emerald';

export interface NavLink {
  type: 'link';
  href: string;
  label: string;
  icon: LucideIcon;
  description: string;
  accent: NavAccent;
}

export type NavEntry = NavLink | { type: 'separator' };

export const NAV_ITEMS: NavEntry[] = [
  {
    type: 'link',
    href: '/teams',
    label: 'Teams',
    icon: Users,
    description: 'Browse all teams and their stats',
    accent: 'blue',
  },
  {
    type: 'link',
    href: '/years',
    label: 'Years',
    icon: Calendar,
    description: 'Per-year statistics and charts',
    accent: 'blue',
  },
  {
    type: 'link',
    href: '/tournaments',
    label: 'Tournaments',
    icon: Trophy,
    description: 'Browse tournaments and seasons',
    accent: 'blue',
  },
  {
    type: 'link',
    href: '/countries',
    label: 'Countries',
    icon: MapPin,
    description: 'Browse countries and their cities',
    accent: 'blue',
  },
  {
    type: 'link',
    href: '/confederations',
    label: 'Confederations',
    icon: Globe,
    description: 'Browse confederations and their teams',
    accent: 'blue',
  },
  { type: 'separator' },
  {
    type: 'link',
    href: '/squads',
    label: 'Squads',
    icon: Users,
    description: 'Browse matches that have lineup data',
    accent: 'blue',
  },
  {
    type: 'link',
    href: '/players',
    label: 'Players',
    icon: Users,
    description: 'Browse every goalscorer and their career',
    accent: 'blue',
  },
  {
    type: 'link',
    href: '/former-names',
    label: 'Former Names',
    icon: Flag,
    description: 'Defunct nations and name chains',
    accent: 'blue',
  },
  {
    type: 'link',
    href: '/shot-maps',
    label: 'Shot Maps',
    icon: ShieldAlert,
    description: 'Shot maps and expected goals from open event data',
    accent: 'blue',
  },
  { type: 'separator' },
  {
    type: 'link',
    href: '/head-to-head',
    label: 'Head to Head',
    icon: Swords,
    description: 'Compare two teams head-to-head',
    accent: 'blue',
  },
  {
    type: 'link',
    href: '/elo-ranking',
    label: 'ELO Rankings',
    icon: TrendingUp,
    description: 'ELO ratings calculated from match results',
    accent: 'violet',
  },
  { type: 'separator' },
  {
    type: 'link',
    href: '/house-keeping',
    label: 'House Keeping',
    icon: Flag,
    description: 'Releases, versions and system status',
    accent: 'blue',
  },
  {
    type: 'link',
    href: '/about',
    label: 'About',
    icon: Info,
    description: 'Data sources, credits and how the ratings are calculated',
    accent: 'blue',
  },
];

/** Every navigable entry, in sidebar order, without separators. */
export const NAV_LINKS: NavLink[] = NAV_ITEMS.filter(
  (item): item is NavLink => item.type === 'link',
);

/** Tailwind classes per accent, kept static so they survive the build. */
export const NAV_ACCENTS: Record<NavAccent, { icon: string; hover: string }> = {
  blue: { icon: 'text-blue-600', hover: 'hover:border-blue-300' },
  violet: { icon: 'text-violet-500', hover: 'hover:border-violet-300' },
  amber: { icon: 'text-amber-500', hover: 'hover:border-amber-300' },
  emerald: { icon: 'text-emerald-600', hover: 'hover:border-emerald-300' },
};
