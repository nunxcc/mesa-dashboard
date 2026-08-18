import type { IconName } from '@/components/ui/Icon';

export interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  /** Shown in the drawer nav on small screens, where there is room for it. */
  description: string;
}

/** Single source of truth for the nav - the sidebar and the mobile drawer
 *  both read it, so they cannot fall out of step. */
export const NAV_ITEMS: NavItem[] = [
  {
    to: '/',
    label: 'Overview',
    icon: 'overview',
    description: 'Revenue, covers and service at a glance',
  },
  {
    to: '/orders',
    label: 'Orders',
    icon: 'orders',
    description: 'Every ticket, filterable and searchable',
  },
  {
    to: '/menu',
    label: 'Menu',
    icon: 'menu',
    description: 'What sells, and what actually makes money',
  },
  {
    to: '/channels',
    label: 'Channels',
    icon: 'channels',
    description: 'What the delivery platforms really cost',
  },
];

export const RESTAURANT = {
  name: 'Taberna do Bairro',
  location: 'Porto, Cedofeita',
} as const;
