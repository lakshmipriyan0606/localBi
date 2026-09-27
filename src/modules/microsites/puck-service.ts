import type { Data } from '@measured/puck';
import { PuckComponentProps, DEFAULT_FOOD_LAYOUT, normalizePuckData } from './puck-config';

const puckDataStore: Map<string, Data<PuckComponentProps>> = new Map();

export class PuckService {
  static async getPuckData(subdomain: string): Promise<Data<PuckComponentProps> | null> {
    const data = puckDataStore.get(subdomain);
    if (data) {
      return normalizePuckData(data);
    }

    // Default template for new editor canvas
    return DEFAULT_FOOD_LAYOUT;
  }

  static async savePuckData(
    subdomain: string,
    data: Data<PuckComponentProps>
  ): Promise<boolean> {
    puckDataStore.set(subdomain, data);
    return true;
  }
}
