// Shared identifier types. Pure type/const data, safe to import from sim and ui.

export const GOODS = ['grain', 'steel', 'tractors', 'consumer'] as const;
export type GoodId = (typeof GOODS)[number];

export const TOWN_IDS = ['dalniy', 'kovrino', 'oblastgrad'] as const;
export type TownId = (typeof TOWN_IDS)[number];

export const ENTERPRISE_IDS = ['lesnoy', 'kolos', 'stal', 'krasny', 'zarya'] as const;
export type EnterpriseId = (typeof ENTERPRISE_IDS)[number];

export const BAR_IDS = ['people', 'apparatus', 'centre', 'shadow'] as const;
export type BarId = (typeof BAR_IDS)[number];

export type Side = 'left' | 'right';

export type StationId = string;
export type CharacterId = string;

/** A place on the map that can hold goods or be observed. */
export type LocationRef = { type: 'enterprise'; id: EnterpriseId } | { type: 'town'; id: TownId };

/** Node id used by shipments: enterprises, towns, or the Centre. */
export type NodeId = `ent:${EnterpriseId}` | `town:${TownId}` | 'centre';
