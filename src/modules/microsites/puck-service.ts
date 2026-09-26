import type { Data } from '@measured/puck';
import { PuckComponentProps, INDUSTRY_STARTER_DATA, DEFAULT_FOOD_LAYOUT, normalizePuckData } from './puck-config';

const puckDataStore: Map<string, Data<PuckComponentProps>> = new Map();

function seedPuckData() {
  if (!puckDataStore.has('lakshmi-food')) {
    puckDataStore.set('lakshmi-food', DEFAULT_FOOD_LAYOUT);
  }
  if (!puckDataStore.has('apollo-annanagar')) {
    const hosp = INDUSTRY_STARTER_DATA['HOSPITAL'];
    if (hosp) puckDataStore.set('apollo-annanagar', hosp);
  }
  if (!puckDataStore.has('swarna-mahal')) {
    const jewel = INDUSTRY_STARTER_DATA['JEWELRY'];
    if (jewel) puckDataStore.set('swarna-mahal', jewel);
  }
}

seedPuckData();

export class PuckService {
  static async getPuckData(subdomain: string): Promise<Data<PuckComponentProps> | null> {
    seedPuckData();
    const data = puckDataStore.get(subdomain);
    if (data) {
      return normalizePuckData(data);
    }

    // Fallback to Food template if new subdomain
    return DEFAULT_FOOD_LAYOUT;
  }

  static async savePuckData(
    subdomain: string,
    data: Data<PuckComponentProps>
  ): Promise<boolean> {
    seedPuckData();
    puckDataStore.set(subdomain, data);
    return true;
  }
}
