// All tunable coefficients live here. One line of comment per constant.

// ---- time
export const TICKS_PER_QUARTER = 13; // 1 tick = 1 week
export const QUARTERS_PER_YEAR = 4; // quota ratchet runs at year end

// ---- bars
export const BAR_START = 50; // every bar starts here
export const BAR_MIN = 0; // hitting this ends the run
export const BAR_MAX = 100; // hitting this ends the run
export const BAR_DRIFT = 0.06; // fraction of the gap to 50 that each bar closes per quarter

// ---- households and consumption
export const GRAIN_NEED = 1; // grain units each household needs per tick
export const CONSUMER_WANT = 0.6; // max consumer units a household wants per tick at pref 1.0
export const HOUSEHOLD_START_MONEY = 40; // starting savings per household
export const HOUSEHOLD_KEEP = 5; // cash a household keeps back before buying consumer goods
export const PREF_START_MIN = 0.25; // lowest starting consumer preference
export const PREF_START_MAX = 0.75; // highest starting consumer preference
export const PREF_DRIFT = 0.012; // max weekly random change in preference
export const PREF_FLOOR = 0.1; // preference never drops below this
export const PREF_CEIL = 0.9; // preference never exceeds this
export const SKILL_MIN = 0.7; // lowest household skill
export const SKILL_MAX = 1.3; // highest household skill

// ---- prices, wages and the money supply
export const WAGE_DEFAULT = 11; // default wage per household per tick
export const WAGE_MIN = 4; // lowest wage the planner may set
export const WAGE_MAX = 24; // highest wage the planner may set
export const WAGE_FAIR = 11; // wage households consider fair
export const PRICE_GRAIN_DEFAULT = 2; // default state shop grain price
export const PRICE_GRAIN_MIN = 1; // lowest grain price allowed
export const PRICE_GRAIN_MAX = 6; // highest grain price allowed
export const PRICE_CONSUMER_DEFAULT = 8; // default state shop consumer goods price
export const PRICE_CONSUMER_MIN = 3; // lowest consumer price allowed
export const PRICE_CONSUMER_MAX = 24; // highest consumer price allowed
export const BLACK_PRICE_MULT = 2.6; // black market price as a multiple of the state price
export const BLACK_PRICE_SHADOW_GAIN = 0.6; // extra black price multiplier per unit of (1 - shadow/100)
export const BLACK_ENTERPRISE_SHARE = 0.55; // share of black sale value paid to the skimming enterprise
export const TREASURY_START = 6000; // treasury balance at newGame
export const CENTRE_START = 400000; // Centre balance at newGame
export const BLACK_START = 1500; // black market float at newGame
export const ENTERPRISE_START = 800; // starting balance of each enterprise
export const CENTRE_FUNDING_BASE = 700; // Centre grant to the treasury per tick at Centre bar 50
export const CENTRE_FUNDING_GAIN = 0.8; // how strongly Centre bar scales the grant (0 = flat)
export const TREASURY_TAX_FLOOR = 12000; // treasury balance above this is remitted to the Centre

// ---- production: output = A * labour^a * input^b
export const PROD_GRAIN_A = 5.9; // grain scale factor
export const PROD_GRAIN_LABOUR_EXP = 0.6; // grain labour exponent
export const PROD_GRAIN_TRACTOR_EXP = 0.2; // grain exponent on (1 + tractors)
export const PROD_STEEL_A = 2.05; // steel scale factor
export const PROD_STEEL_LABOUR_EXP = 0.7; // steel labour exponent
export const PROD_TRACTOR_A = 0.032; // tractor scale factor
export const PROD_TRACTOR_LABOUR_EXP = 0.6; // tractor labour exponent
export const PROD_TRACTOR_STEEL_EXP = 0.5; // tractor steel-input exponent
export const PROD_CONSUMER_A = 2.1; // consumer goods scale factor
export const PROD_CONSUMER_LABOUR_EXP = 0.6; // consumer labour exponent
export const PROD_CONSUMER_STEEL_EXP = 0.5; // consumer steel-input exponent
export const STEEL_CAP_KRASNY = 10; // max steel Krasny can use per tick
export const STEEL_CAP_ZARYA = 8; // max steel Zarya can use per tick
export const ORE_PER_STEEL = 1.5; // notional ore consumed per unit of steel, for Stal's reported inputs
export const TRACTORS_START = 2; // tractors at each farm at newGame
export const TRACTOR_WEAR = 0.02; // share of a farm's tractors lost per tick
export const WAGE_PROD_EXP = 0.3; // exponent on (wage / fair wage) in labour productivity
export const WAGE_PROD_MIN = 0.8; // floor on the wage productivity factor
export const WAGE_PROD_MAX = 1.15; // cap on the wage productivity factor
export const PEOPLE_PROD_BASE = 0.7; // productivity at People 0
export const PEOPLE_PROD_GAIN = 0.6; // extra productivity at People 100 (so 1.0 at People 50)

// ---- storage and shipping
export const GRAIN_SPOIL_RATE = 0.03; // share of stored grain that spoils each tick
export const SHIP_MIN_QTY = 0.5; // shipments smaller than this are held back
export const CENTRE_STEEL_BASE = 9; // steel the Centre ships in per tick at Centre bar 50
export const CENTRE_STEEL_GAIN = 0.9; // how strongly Centre bar scales steel imports
export const ARRIVED_KEEP_TICKS = 26; // how long finished shipments are remembered: return legs, and rail manifests for the last quarter

// ---- black market and shadow
export const DISTILLERY_OUTPUT = 4; // consumer units the distillery makes per tick at Shadow 50
export const BLACK_IMPORT_GRAIN = 4; // grain smuggled in per tick at Shadow 50
export const BLACK_LAUNDER = 0.02; // share of black market cash above its float paid to the treasury as bribes per tick
export const BLACK_DECAY = 0.04; // share of black market stock that goes off per tick
export const SKIM_SCALE = 0.35; // max skim share = greed * (1 - honesty) * this
export const SKIM_SHADOW_GAIN = 0.8; // skim multiplier slope with Shadow (0.6 + gain*shadow/100)
export const SKIM_APPARATUS_GAIN = 0.5; // extra skim when Apparatus is low
export const SKIM_HIDE_MIN = 0.02; // skim below this is treated as zero (petty pilfering is ignored)
export const SKIM_TIP_THRESHOLD = 0.03; // skim above this makes a "skimming" tip true

// ---- reports and distortion
export const DISTORT_BASE = 0.12; // base output inflation for a fully dishonest manager
export const DISTORT_GREED_GAIN = 0.35; // extra inflation per unit of greed
export const DISTORT_APPARATUS_GAIN = 1.0; // multiplier slope: distortion * (1 + gain*(50-app)/50)
export const DISTORT_CHANCE_BASE = 0.55; // chance a dishonest manager distorts a given report
export const DISTORT_CHANCE_APPARATUS = 0.5; // extra chance when Apparatus is low
export const DISTORT_NOISE = 0.5; // random spread on the distortion size (0.5 + noise*rand)
export const INPUT_PAD_SKIM = 1.0; // reported inputs padded by skim share * this to hide diversion
export const REQUEST_PAD = 0.6; // request padding = distortion * this
export const REQUEST_BASE_COVER = 1.05; // an honest request covers this multiple of true steel use
export const REJECT_HAIRCUT = 0.85; // rejected report counts upward at this share of its figure

// ---- audits and inspectors
export const INSPECTORS_BASE = 1; // inspectors available at Centre bar 0
export const INSPECTORS_PER_CENTRE = 30; // one more inspector for each this many Centre points
export const INSPECTORS_MAX = 4; // hard cap on inspectors per quarter
export const INSPECTOR_CORRUPT_BASE = 0.04; // chance an inspector is captured at Apparatus 0
export const INSPECTOR_CORRUPT_GAIN = 0.35; // extra capture chance at Apparatus 100
export const PADDED_TOLERANCE = 0.04; // reported/true above 1 + this counts as padded
export const CENTRE_CHECK_BASE = 0.12; // chance per quarter the Centre spot-checks our upward report
export const CENTRE_CHECK_INFLATE_GAIN = 2.5; // extra spot-check chance per unit of own inflation

// ---- bar coefficients (per quarter)
export const PEOPLE_FED_TARGET = 0.97; // fed share that leaves People unchanged
export const PEOPLE_FED_GAIN = 30; // People change per unit of fed share above target
export const PEOPLE_CONSUMER_TARGET = 0.25; // consumer units per household per tick that is neutral
export const PEOPLE_CONSUMER_GAIN = 14; // People change per unit of consumer goods above neutral
export const PEOPLE_WAGE_GAIN = 8; // People change per unit of (avg wage / fair wage - 1)
export const PEOPLE_UNPAID_GAIN = 25; // People loss per unit of unpaid wage share
export const PEOPLE_QUEUE_GAIN = 12; // People loss per unit of share of ticks with queues
export const APPARATUS_APPROVE = 0.15; // Apparatus gain per approved report
export const APPARATUS_PADDED_APPROVE = 0.25; // extra Apparatus gain when approving a padded report
export const APPARATUS_REJECT = 3.0; // Apparatus loss per rejected report
export const APPARATUS_AUDIT = 1.5; // Apparatus loss per audit launched
export const APPARATUS_CAUGHT = 3.5; // extra Apparatus loss when an audit catches padding
export const APPARATUS_REQUEST_GRANTED = 0.05; // Apparatus gain per granted next-quarter request
export const CENTRE_MEET_GAIN = 28; // Centre change per unit of (reported / target - 1)
export const CENTRE_MEET_CAP = 0.5; // largest |reported / target - 1| the Centre counts
export const CENTRE_CAUGHT_INFLATION = 40; // Centre loss per unit of own inflation when caught
export const SHADOW_UNMET_GAIN = 12; // Shadow gain per unit of unmet grain share
export const SHADOW_SKIM_GAIN = 25; // Shadow gain per unit of average skim share
export const SHADOW_FULL_SHOP_GAIN = 5; // Shadow loss per share of ticks with full shops
export const SHADOW_TOLERATED_TIP = 1.2; // Shadow gain when the player dismisses a tip that was true
export const QUEUE_THRESHOLD = 0.1; // share of a town's grain demand unmet that counts as a queue tick
export const FULL_SHOP_GRAIN_PER_HH = 2; // grain stock per household counted as a "full shop"

// ---- feedbacks from bars
export const TIP_SHORTAGE_THRESHOLD = 0.15; // share of a town's grain demand unmet that makes a "shortage" tip true
export const TIP_IDLE_SHARE = 0.5; // weekly output below this share of quota/13 makes an "idle" tip true
export const AUDIT_CAUGHT_HONESTY_GAIN = 0.1; // honesty a manager gains after being caught by an audit
export const TIPS_PER_SHADOW = 40; // one extra tip card per this many Shadow points
export const CARDS_MIN = 3; // fewest cards drawn per quarter
export const CARDS_MAX = 5; // most cards drawn per quarter
export const CARD_COOLDOWN = 12; // cards seen in the last N draws are not repeated
export const PIN_TTL_QUARTERS = 3; // open pins expire after this many quarters
export const OBSERVERS_MAX = 2; // observers the player may place per quarter
export const OBSERVER_KEEP = 8; // observer records kept in state
export const REPORTS_KEEP = 3; // quarters of reports kept in state

// ---- ratchet and quotas
export const RATCHET_BLEND = 0.6; // year-end: target moves this share toward reported average
export const OWN_INFLATE_MIN = 1.0; // honest upward report
export const OWN_INFLATE_MAX = 1.5; // maximum inflation of the upward report
export const QUOTA_MIN_SHARE = 0.3; // plan quota floor as a share of base quota
export const QUOTA_MAX_SHARE = 2.0; // plan quota cap as a share of base quota

// ---- card effect sizes
export const RESERVE_GRAIN_START = 120; // province grain reserve at newGame
export const CRACKDOWN_BLACK_CUT = 0.6; // share of black stock destroyed in a crackdown
export const CRACKDOWN_SKIM_MULT = 0.4; // skim multiplier during a crackdown quarter
