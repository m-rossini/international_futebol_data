import {
  Calendar,
  Clock,
  Flag,
  Globe,
  MapPin,
  MessageSquare,
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
    href: '/head-to-head',
    label: 'Head to Head',
    icon: Swords,
    description: 'Compare two teams head-to-head',
    accent: 'blue',
  },
  { type: 'separator' },
  {
    type: 'link',
    href: '/elo-ranking',
    label: 'ELO Rankings',
    icon: TrendingUp,
    description: 'ELO ratings calculated from match results',
    accent: 'violet',
  },
  {
    type: 'link',
    href: '/decade-leaders',
    label: 'Decade Leaders',
    icon: Clock,
    description: 'Which teams dominated each era?',
    accent: 'amber',
  },
  { type: 'separator' },
  {
    type: 'link',
    href: '/askme',
    label: 'Ask Me',
    icon: MessageSquare,
    description: 'Ask questions in natural language',
    accent: 'emerald',
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
