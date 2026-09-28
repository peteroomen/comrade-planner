import type { CharacterId, EnterpriseId } from './ids';

export type CharacterRole = 'manager' | 'informant' | 'official' | 'citizen';

export interface CharacterDef {
  id: CharacterId;
  name: string;
  title: string;
  role: CharacterRole;
  /** Managers only: which enterprise they run. */
  enterprise?: EnterpriseId;
  /** Managers: starting hidden traits (jittered a little per seed). */
  honesty?: number;
  greed?: number;
  /** Informants: starting hidden reliability. */
  reliability?: number;
}

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'petrenko',
    name: 'Comrade Petrenko',
    title: 'Manager, Lesnoy Farm',
    role: 'manager',
    enterprise: 'lesnoy',
    honesty: 0.7,
    greed: 0.3,
  },
  {
    id: 'ivanova',
    name: 'Comrade Ivanova',
    title: 'Manager, Kolos Farm',
    role: 'manager',
    enterprise: 'kolos',
    honesty: 0.35,
    greed: 0.75,
  },
  {
    id: 'gromov',
    name: 'Comrade Gromov',
    title: 'Manager, Stal Steel Mill',
    role: 'manager',
    enterprise: 'stal',
    honesty: 0.6,
    greed: 0.4,
  },
  {
    id: 'volkov',
    name: 'Director Volkov',
    title: 'Director, Krasny Tractor Works',
    role: 'manager',
    enterprise: 'krasny',
    honesty: 0.45,
    greed: 0.65,
  },
  {
    id: 'sidorova',
    name: 'Comrade Sidorova',
    title: 'Manager, Zarya Textile Works',
    role: 'manager',
    enterprise: 'zarya',
    honesty: 0.8,
    greed: 0.25,
  },
  {
    id: 'nina',
    name: 'Baba Nina',
    title: "Pensioner, Dal'niy",
    role: 'informant',
    reliability: 0.85,
  },
  {
    id: 'kuzma',
    name: 'Foreman Kuzma',
    title: 'Rail foreman',
    role: 'informant',
    reliability: 0.6,
  },
  {
    id: 'zhenya',
    name: 'Clerk Zhenya',
    title: 'Records clerk',
    role: 'informant',
    reliability: 0.35,
  },
  {
    id: 'pavel',
    name: 'Student Pavel',
    title: 'Student, Oblastgrad',
    role: 'informant',
    reliability: 0.5,
  },
  {
    id: 'secretary',
    name: 'Party Secretary Orlov',
    title: 'Provincial committee',
    role: 'official',
  },
  { id: 'delegation', name: "Workers' delegation", title: 'Shop-floor committee', role: 'citizen' },
  {
    id: 'centre-clerk',
    name: 'Clerk from the Centre',
    title: 'Ministry of Planning',
    role: 'official',
  },
  { id: 'housewives', name: 'Queue at the shop', title: 'Oblastgrad housewives', role: 'citizen' },
  { id: 'stationmaster', name: 'Stationmaster', title: 'Oblastgrad Junction', role: 'official' },
];

export const CHARACTER_BY_ID: Record<CharacterId, CharacterDef> = Object.fromEntries(
  CHARACTERS.map((c) => [c.id, c]),
);
