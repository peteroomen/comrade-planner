import type { TownId } from './ids';

export interface TownDef {
  id: TownId;
  name: string;
  station: string;
  households: number;
  /** Provincial seat gets a slightly bigger stock buffer and a "seat" flag for the UI. */
  seat: boolean;
}

export const TOWNS: Record<TownId, TownDef> = {
  dalniy: { id: 'dalniy', name: "Dal'niy", station: 'dalniy', households: 28, seat: false },
  kovrino: { id: 'kovrino', name: 'Kovrino', station: 'kovrino', households: 32, seat: false },
  oblastgrad: {
    id: 'oblastgrad',
    name: 'Oblastgrad',
    station: 'oblastgrad',
    households: 40,
    seat: true,
  },
};

/** Where the unregistered Kovrino Distillery hides. Never exposed by the selectors. */
export const DISTILLERY_STATION = 'kovrino';
