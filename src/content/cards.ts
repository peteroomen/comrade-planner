import type { CharacterId, LocationRef, Side, TipClaim } from '@/sim/types';
import type { Effect, GameState } from '@/sim/types';
import type { LaterHint } from '@/sim/hints';

export type CardType = 'petition' | 'tip' | 'event';

export interface CardChoice {
  label: string;
  effects: Effect[];
  /** Tips only: accepting drops a pin on the target. */
  pin?: boolean;
  /** Hand-written hints for world effects with a delayed bar consequence (never numbers). */
  later?: LaterHint[];
}

export interface TipSpec {
  target: LocationRef;
  claim: TipClaim;
  /** Short text on the map pin. */
  pinLabel: string;
}

export interface CardDef {
  id: string;
  type: CardType;
  character: CharacterId;
  text: string;
  /** Predicate over state: can this card come up right now? */
  condition: (s: GameState) => boolean;
  left: CardChoice;
  right: CardChoice;
  tip?: TipSpec;
}

const always = (): boolean => true;
const bars = (
  delta: Partial<Record<'people' | 'apparatus' | 'centre' | 'shadow', number>>,
): Effect => ({
  kind: 'bars',
  delta,
});

const petitions: CardDef[] = [
  {
    id: 'petition-lesnoy-tractors',
    type: 'petition',
    character: 'petrenko',
    text: 'Comrade Petrenko begs for two more tractors. "The fields will not plough themselves, Comrade Planner."',
    condition: always,
    left: { label: 'Refuse', effects: [bars({ apparatus: -4 })] },
    right: {
      label: 'Grant them',
      later: [{ bar: 'people', dir: 'up', size: 'small' }],
      effects: [
        { kind: 'tractors', enterprise: 'lesnoy', n: 2 },
        bars({ apparatus: 5, centre: -2 }),
      ],
    },
  },
  {
    id: 'petition-stal-bonus',
    type: 'petition',
    character: 'gromov',
    text: 'The Stal furnace crews want a bonus for last winter. Gromov says morale is "brittle".',
    condition: (s) => s.bars.people < 80,
    left: { label: 'No bonus', effects: [bars({ people: -3, apparatus: -1 })] },
    right: {
      label: 'Pay it',
      later: [
        { bar: 'centre', dir: 'down', size: 'small', uncertain: true },
        { bar: 'shadow', dir: 'up', size: 'small', uncertain: true },
      ],
      effects: [
        { kind: 'bonus', enterprise: 'stal', amount: 1200 },
        bars({ people: 3, apparatus: 3, centre: -2 }),
      ],
    },
  },
  {
    id: 'petition-queue-reserve',
    type: 'petition',
    character: 'housewives',
    text: 'The Oblastgrad queue asks you to open the grain reserve. Someone has brought a baby to the shop door.',
    condition: (s) => s.reserveGrain > 20,
    left: { label: 'Hold the reserve', effects: [bars({ people: -4, shadow: 2 })] },
    right: {
      label: 'Open it',
      later: [{ bar: 'shadow', dir: 'down', size: 'small' }],
      effects: [
        { kind: 'reserveGrain', town: 'oblastgrad', qty: 60 },
        bars({ people: 5, centre: -3 }),
      ],
    },
  },
  {
    id: 'petition-zarya-steel',
    type: 'petition',
    character: 'sidorova',
    text: 'Sidorova asks for a bigger steel ration for Zarya. "People want shirts, not only tractors."',
    condition: always,
    left: { label: 'Krasny comes first', effects: [bars({ apparatus: -2 })] },
    right: {
      label: 'Shift steel to Zarya',
      later: [{ bar: 'people', dir: 'up', size: 'small', uncertain: true }],
      effects: [
        { kind: 'steelShare', delta: -0.15 },
        bars({ apparatus: 4, centre: -1, people: 1 }),
      ],
    },
  },
  {
    id: 'petition-kolos-arrears',
    type: 'petition',
    character: 'delegation',
    text: 'A delegation from Kolos Farm says wages are in arrears. They have brought their own chairs and intend to wait.',
    condition: (s) => s.bars.people < 75,
    left: { label: 'Send them home', effects: [bars({ people: -5, apparatus: 2 })] },
    right: {
      label: 'Pay the arrears',
      later: [
        { bar: 'centre', dir: 'down', size: 'small', uncertain: true },
        { bar: 'shadow', dir: 'up', size: 'small', uncertain: true },
      ],
      effects: [
        { kind: 'bonus', enterprise: 'kolos', amount: 1000 },
        bars({ people: 4, centre: -2 }),
      ],
    },
  },
  {
    id: 'petition-brother-in-law',
    type: 'petition',
    character: 'secretary',
    text: 'Party Secretary Orlov would like his brother-in-law made a deputy at Krasny. It is only a small post.',
    condition: always,
    left: { label: 'Decline', effects: [bars({ apparatus: -5, centre: 1 })] },
    right: { label: 'Arrange it', effects: [bars({ apparatus: 6, people: -2, shadow: 3 })] },
  },
  {
    id: 'petition-distillery',
    type: 'petition',
    character: 'delegation',
    text: 'Kovrino residents ask that their "cooperative" be recognised. Everyone knows what it makes.',
    condition: (s) => s.bars.shadow > 35,
    left: { label: 'Deny recognition', effects: [bars({ shadow: -2 })] },
    right: { label: 'Look away', effects: [bars({ shadow: 6, people: 2, centre: -4 })] },
  },
];

const tips: CardDef[] = [
  {
    id: 'tip-kolos-night-trucks',
    type: 'tip',
    character: 'nina',
    text: '"Trucks leave Kolos Farm after dark, heavy, and come back light," whispers Baba Nina.',
    condition: always,
    tip: {
      target: { type: 'enterprise', id: 'kolos' },
      claim: 'skimming',
      pinLabel: 'Kolos night trucks',
    },
    left: {
      label: 'Dismiss',
      later: [{ bar: 'shadow', dir: 'up', size: 'small', uncertain: true }],
      effects: [],
    },
    right: { label: 'Look into it', pin: true, effects: [bars({ apparatus: -1 })] },
  },
  {
    id: 'tip-oblastgrad-queue',
    type: 'tip',
    character: 'nina',
    text: '"The shop in Oblastgrad has been empty since Tuesday," says Baba Nina. "The queue goes round the block."',
    condition: always,
    tip: {
      target: { type: 'town', id: 'oblastgrad' },
      claim: 'shortage',
      pinLabel: 'Oblastgrad shop empty',
    },
    left: {
      label: 'Dismiss',
      later: [{ bar: 'shadow', dir: 'up', size: 'small', uncertain: true }],
      effects: [],
    },
    right: { label: 'Look into it', pin: true, effects: [] },
  },
  {
    id: 'tip-stal-cold',
    type: 'tip',
    character: 'kuzma',
    text: 'Foreman Kuzma: "The Stal furnaces stood cold this week. No trains loading at the mill."',
    condition: always,
    tip: {
      target: { type: 'enterprise', id: 'stal' },
      claim: 'idle',
      pinLabel: 'Stal furnaces cold',
    },
    left: {
      label: 'Dismiss',
      later: [{ bar: 'shadow', dir: 'up', size: 'small', uncertain: true }],
      effects: [],
    },
    right: { label: 'Look into it', pin: true, effects: [] },
  },
  {
    id: 'tip-krasny-shed',
    type: 'tip',
    character: 'kuzma',
    text: 'Foreman Kuzma lowers his voice: "Volkov keeps steel in a private shed behind the tractor works."',
    condition: always,
    tip: {
      target: { type: 'enterprise', id: 'krasny' },
      claim: 'skimming',
      pinLabel: 'Volkov private shed',
    },
    left: {
      label: 'Dismiss',
      later: [{ bar: 'shadow', dir: 'up', size: 'small', uncertain: true }],
      effects: [],
    },
    right: { label: 'Look into it', pin: true, effects: [bars({ apparatus: -1 })] },
  },
  {
    id: 'tip-zarya-back-door',
    type: 'tip',
    character: 'zhenya',
    text: 'Clerk Zhenya, quickly: "Zarya sells cloth from the back door. I have seen the queue."',
    condition: always,
    tip: {
      target: { type: 'enterprise', id: 'zarya' },
      claim: 'skimming',
      pinLabel: 'Zarya back door',
    },
    left: {
      label: 'Dismiss',
      later: [{ bar: 'shadow', dir: 'up', size: 'small', uncertain: true }],
      effects: [],
    },
    right: { label: 'Look into it', pin: true, effects: [bars({ apparatus: -1 })] },
  },
  {
    id: 'tip-lesnoy-fallow',
    type: 'tip',
    character: 'zhenya',
    text: 'Clerk Zhenya: "Lesnoy Farm has stopped work. The fields lie fallow, the barns are empty."',
    condition: always,
    tip: { target: { type: 'enterprise', id: 'lesnoy' }, claim: 'idle', pinLabel: 'Lesnoy idle' },
    left: {
      label: 'Dismiss',
      later: [{ bar: 'shadow', dir: 'up', size: 'small', uncertain: true }],
      effects: [],
    },
    right: { label: 'Look into it', pin: true, effects: [] },
  },
  {
    id: 'tip-dalniy-hunger',
    type: 'tip',
    character: 'pavel',
    text: 'Student Pavel: "People in Dal\'niy are going hungry. The shop has nothing but salt."',
    condition: always,
    tip: { target: { type: 'town', id: 'dalniy' }, claim: 'shortage', pinLabel: "Dal'niy hungry" },
    left: {
      label: 'Dismiss',
      later: [{ bar: 'shadow', dir: 'up', size: 'small', uncertain: true }],
      effects: [],
    },
    right: { label: 'Look into it', pin: true, effects: [] },
  },
];

const events: CardDef[] = [
  {
    id: 'event-rail-delay',
    type: 'event',
    character: 'stationmaster',
    text: 'A landslide blocks the line near Oblastgrad Junction. Every train in transit will run late.',
    condition: (s) => s.shipments.length > 0,
    left: {
      label: 'Wait it out',
      later: [{ bar: 'people', dir: 'down', size: 'small', uncertain: true }],
      effects: [{ kind: 'delayShipments', ticks: 1 }, bars({ people: -1 })],
    },
    right: {
      label: 'Pay for a detour',
      later: [{ bar: 'people', dir: 'down', size: 'small', uncertain: true }],
      effects: [{ kind: 'delayShipments', ticks: 1 }, bars({ centre: -2, apparatus: 2 })],
    },
  },
  {
    id: 'event-early-frost',
    type: 'event',
    character: 'petrenko',
    text: 'An early frost has hit the fields. The grain will suffer this quarter.',
    condition: always,
    left: {
      label: 'Report it honestly',
      later: [{ bar: 'people', dir: 'down', size: 'small' }],
      effects: [
        { kind: 'modifier', name: 'grainMult', value: 0.85, quarters: 1 },
        bars({ centre: 1 }),
      ],
    },
    right: {
      label: 'Say nothing',
      later: [{ bar: 'people', dir: 'down', size: 'small' }],
      effects: [
        { kind: 'modifier', name: 'grainMult', value: 0.85, quarters: 1 },
        bars({ centre: -2, apparatus: 2 }),
      ],
    },
  },
  {
    id: 'event-crackdown',
    type: 'event',
    character: 'centre-clerk',
    text: 'The Ministry orders a crackdown on speculators. Militia await your word.',
    condition: (s) => s.bars.shadow > 45,
    left: {
      label: 'Cooperate zealously',
      later: [{ bar: 'shadow', dir: 'down', size: 'small' }],
      effects: [{ kind: 'crackdown' }, bars({ shadow: -6, people: -2, apparatus: -3 })],
    },
    right: { label: 'Look the other way', effects: [bars({ shadow: 2, centre: -2 })] },
  },
  {
    id: 'event-good-rains',
    type: 'event',
    character: 'ivanova',
    text: 'Good rains across the province. Ivanova promises a splendid harvest.',
    condition: always,
    left: {
      label: 'Keep quiet',
      later: [{ bar: 'people', dir: 'up', size: 'small' }],
      effects: [
        { kind: 'modifier', name: 'grainMult', value: 1.1, quarters: 1 },
        bars({ shadow: 1 }),
      ],
    },
    right: {
      label: 'Announce it',
      later: [{ bar: 'people', dir: 'up', size: 'small' }],
      effects: [
        { kind: 'modifier', name: 'grainMult', value: 1.1, quarters: 1 },
        bars({ centre: 4 }),
      ],
    },
  },
  {
    id: 'event-extra-inspector',
    type: 'event',
    character: 'centre-clerk',
    text: 'The Centre offers an extra inspector for this quarter. He is very thorough, and expects to be fed.',
    condition: always,
    left: { label: 'Send him away', effects: [bars({ centre: -1, apparatus: 1 })] },
    right: {
      label: 'Welcome him',
      later: [{ bar: 'shadow', dir: 'down', size: 'small', uncertain: true }],
      effects: [{ kind: 'extraInspectors', n: 1 }, bars({ centre: 3, apparatus: -2 })],
    },
  },
  {
    id: 'event-stal-breakdown',
    type: 'event',
    character: 'gromov',
    text: 'The Stal rolling mill has broken down. Gromov asks for money to repair it.',
    condition: always,
    left: {
      label: 'Push through',
      later: [
        { bar: 'people', dir: 'down', size: 'small' },
        { bar: 'centre', dir: 'down', size: 'small', uncertain: true },
      ],
      effects: [{ kind: 'jam', enterprise: 'stal', ticks: 2 }, bars({ people: -3 })],
    },
    right: {
      label: 'Pay for repairs',
      later: [{ bar: 'centre', dir: 'down', size: 'small', uncertain: true }],
      effects: [{ kind: 'repair', enterprise: 'stal', cost: 600 }, bars({ apparatus: 2 })],
    },
  },
  {
    id: 'event-militia-raid',
    type: 'event',
    character: 'secretary',
    text: 'Party Secretary Orlov offers the militia for a Saturday raid on the Kovrino bazaar. "They will find nothing, but they will find it thoroughly."',
    condition: (s) => s.bars.shadow > 40,
    left: {
      label: 'Send the militia',
      later: [{ bar: 'people', dir: 'down', size: 'small', uncertain: true }],
      effects: [{ kind: 'blackRaid', cut: 0.35 }, bars({ shadow: -4, people: -3, apparatus: -1 })],
    },
    right: { label: 'Not this week', effects: [bars({ shadow: 1, apparatus: 1 })] },
  },
  {
    id: 'event-gromov-names-dealer',
    type: 'event',
    character: 'gromov',
    text: 'Gromov clears his throat. He will name the dealer who buys the mill\'s "lost" steel, if the paperwork from last year is forgotten.',
    condition: (s) => s.bars.shadow > 40,
    left: {
      label: 'Take the name',
      later: [{ bar: 'people', dir: 'down', size: 'small', uncertain: true }],
      effects: [{ kind: 'blackRaid', cut: 0.2 }, bars({ shadow: -5, apparatus: -4 })],
    },
    right: {
      label: 'Forget the paperwork',
      effects: [bars({ apparatus: 2, shadow: 2, centre: -1 })],
    },
  },
  {
    id: 'event-kolkhoz-amnesty',
    type: 'event',
    character: 'petrenko',
    text: 'A neighbouring kolkhoz chairman will hand back the grain he "misplaced", provided nobody writes down his name.',
    condition: (s) => s.bars.shadow > 45,
    left: {
      label: 'Grant amnesty',
      effects: [bars({ shadow: -5, centre: -3, people: 1 })],
    },
    right: { label: 'Prosecute him', effects: [bars({ shadow: -2, apparatus: -2, people: -2 })] },
  },
  {
    id: 'event-close-bazaar',
    type: 'event',
    character: 'housewives',
    text: 'The Sunday bazaar in Oblastgrad sells what the shops never have. The militia wants it closed. The queue wants to know where else to go.',
    condition: (s) => s.bars.shadow > 40,
    left: {
      label: 'Close it',
      later: [{ bar: 'people', dir: 'down', size: 'small', uncertain: true }],
      effects: [{ kind: 'blackRaid', cut: 0.25 }, bars({ shadow: -5, people: -4 })],
    },
    right: { label: 'Let it trade', effects: [bars({ shadow: 3, people: 1, centre: -1 })] },
  },
  {
    id: 'event-party-purge',
    type: 'event',
    character: 'secretary',
    text: 'Orlov proposes a purge: one manager "of doubtful habits" is to be replaced by a comrade from the district committee.',
    condition: (s) => s.bars.shadow > 50,
    left: {
      label: 'Approve the purge',
      later: [{ bar: 'shadow', dir: 'down', size: 'small' }],
      effects: [
        { kind: 'modifier', name: 'skimMult', value: 0.7, quarters: 1 },
        bars({ shadow: -3, apparatus: -5, people: -1 }),
      ],
    },
    right: {
      label: 'Protect your people',
      effects: [bars({ apparatus: 3, centre: -2, shadow: 2 })],
    },
  },
];

export const CARDS: CardDef[] = [...petitions, ...tips, ...events];
export const CARD_BY_ID: Record<string, CardDef> = Object.fromEntries(CARDS.map((c) => [c.id, c]));

export type { Side };
