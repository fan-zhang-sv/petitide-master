import type { EvidenceLevel, RouteType } from './types';

export const EVIDENCE_LABELS: Record<EvidenceLevel, string> = {
  clinical: 'Clinical context',
  wellness: 'Wellness use',
  limited: 'Limited evidence',
  experimental: 'Experimental',
  advanced: 'Advanced caution',
};

export const ROUTE_OPTIONS: RouteType[] = [
  'subcutaneous',
  'intranasal',
  'oral',
  'topical',
  'iv',
  'implant',
  'mixed',
];

export const DEFAULT_SITES = ['Abdomen L', 'Abdomen R', 'Thigh L', 'Thigh R', 'Arm L', 'Arm R'];
