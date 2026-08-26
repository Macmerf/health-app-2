import { get, set, del } from 'idb-keyval';

const STORAGE_PREFIX = 'zabotapsy_';

export const storage = {
  async get<T>(key: string): Promise<T | undefined> {
    try {
      return await get<T>(STORAGE_PREFIX + key);
    } catch {
      return undefined;
    }
  },

  async set<T>(key: string, value: T): Promise<void> {
    try {
      await set(STORAGE_PREFIX + key, value);
    } catch (e) {
      console.error('Storage write error:', e);
    }
  },

  async remove(key: string): Promise<void> {
    try {
      await del(STORAGE_PREFIX + key);
    } catch (e) {
      console.error('Storage remove error:', e);
    }
  },
};

export function createPersistConfig(name: string) {
  return {
    name,
    storage: {
      getItem: async (key: string): Promise<string | null> => {
        const val = await storage.get<string>(key);
        return val ?? null;
      },
      setItem: async (key: string, value: string): Promise<void> => {
        await storage.set(key, value);
      },
      removeItem: async (key: string): Promise<void> => {
        await storage.remove(key);
      },
    },
  };
}
