import type { EnterpriseId, GoodId, TownId } from './ids';

export interface EnterpriseDef {
  id: EnterpriseId;
  name: string;
  good: GoodId;
  town: TownId;
  station: string;
  managerId: string;
  /** Number of households employed, by home town. Sums to the town populations. */
  workforce: Partial<Record<TownId, number>>;
  /** Default quarterly quota; the player may override it in the plan. */
  baseQuota: number;
}

export const ENTERPRISES: Record<EnterpriseId, EnterpriseDef> = {
  lesnoy: {
    id: 'lesnoy',
    name: 'Lesnoy Farm',
    good: 'grain',
    town: 'dalniy',
    station: 'lesnoy',
    managerId: 'petrenko',
    workforce: { dalniy: 22 },
    baseQuota: 680,
  },
  kolos: {
    id: 'kolos',
    name: 'Kolos Farm',
    good: 'grain',
    town: 'kovrino',
    station: 'kolos',
    managerId: 'ivanova',
    workforce: { dalniy: 6, kovrino: 16 },
    baseQuota: 640,
  },
  stal: {
    id: 'stal',
    name: 'Stal Steel Mill',
    good: 'steel',
    town: 'oblastgrad',
    station: 'stal',
    managerId: 'gromov',
    workforce: { oblastgrad: 20 },
    baseQuota: 210,
  },
  krasny: {
    id: 'krasny',
    name: 'Krasny Tractor Works',
    good: 'tractors',
    town: 'oblastgrad',
    station: 'krasny',
    managerId: 'volkov',
    workforce: { oblastgrad: 18 },
    baseQuota: 7,
  },
  zarya: {
    id: 'zarya',
    name: 'Zarya Textile Works',
    good: 'consumer',
    town: 'kovrino',
    station: 'zarya',
    managerId: 'sidorova',
    workforce: { kovrino: 16, oblastgrad: 2 },
    baseQuota: 380,
  },
};
