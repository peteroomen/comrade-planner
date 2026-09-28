import type { EnterpriseId } from './types';
import * as B from './balance';

// Every production formula lives here. output = A * labour^a * input^b, capped by input availability.

export interface ProductionInputs {
  /** Effective labour: sum of worker skill, scaled by People and wage factors. */
  labour: number;
  /** Farms: tractors installed. Factories: steel actually available this tick. */
  input: number;
}

export interface ProductionResult {
  output: number;
  /** Steel consumed (factories only). */
  steelUsed: number;
}

export function steelCap(id: EnterpriseId): number {
  if (id === 'krasny') return B.STEEL_CAP_KRASNY;
  if (id === 'zarya') return B.STEEL_CAP_ZARYA;
  return 0;
}

export function peopleFactor(people: number): number {
  return B.PEOPLE_PROD_BASE + (B.PEOPLE_PROD_GAIN * people) / 100;
}

export function wageFactor(wage: number): number {
  const f = Math.pow(Math.max(wage, 0.1) / B.WAGE_FAIR, B.WAGE_PROD_EXP);
  return Math.min(B.WAGE_PROD_MAX, Math.max(B.WAGE_PROD_MIN, f));
}

export function produce(id: EnterpriseId, p: ProductionInputs): ProductionResult {
  const labour = Math.max(0, p.labour);
  switch (id) {
    case 'lesnoy':
    case 'kolos':
      return {
        output:
          B.PROD_GRAIN_A *
          Math.pow(labour, B.PROD_GRAIN_LABOUR_EXP) *
          Math.pow(1 + p.input, B.PROD_GRAIN_TRACTOR_EXP),
        steelUsed: 0,
      };
    case 'stal':
      return { output: B.PROD_STEEL_A * Math.pow(labour, B.PROD_STEEL_LABOUR_EXP), steelUsed: 0 };
    case 'krasny': {
      const steel = Math.min(p.input, steelCap('krasny'));
      if (steel <= 0) return { output: 0, steelUsed: 0 };
      return {
        output:
          B.PROD_TRACTOR_A *
          Math.pow(labour, B.PROD_TRACTOR_LABOUR_EXP) *
          Math.pow(steel, B.PROD_TRACTOR_STEEL_EXP),
        steelUsed: steel,
      };
    }
    case 'zarya': {
      const steel = Math.min(p.input, steelCap('zarya'));
      if (steel <= 0) return { output: 0, steelUsed: 0 };
      return {
        output:
          B.PROD_CONSUMER_A *
          Math.pow(labour, B.PROD_CONSUMER_LABOUR_EXP) *
          Math.pow(steel, B.PROD_CONSUMER_STEEL_EXP),
        steelUsed: steel,
      };
    }
  }
}
