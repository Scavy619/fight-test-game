import { describe, expect, it } from 'vitest';
import { SAVE_KEY, SaveStore, defaultSave, withDefaults, type StorageLike } from './save';

function memoryStorage(initial: Record<string, string> = {}): StorageLike & { map: Map<string, string> } {
  const map = new Map(Object.entries(initial));
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

describe('withDefaults', () => {
  it('returns defaults for garbage and repairs partial data', () => {
    expect(withDefaults(null)).toEqual(defaultSave());
    expect(withDefaults('nope')).toEqual(defaultSave());
    const repaired = withDefaults({
      version: 1,
      unlocked: ['arjuna', 7, 'arjuna', 'bhima'],
      campaign: { current: 3, completed: [1, 2, 2, -4, 'x'], choices: { c2: 'talk', bad: 3 }, step: 4, chapterOrder: [] },
      arcade: { arjuna: true, bhima: 'yes' },
      seenControls: 'true',
      settings: { difficulty: 'nightmare' },
    });
    expect(repaired.unlocked).toEqual(['arjuna', 'bhima']);
    expect(repaired.campaign).toEqual({ current: 3, completed: [1, 2], choices: { c2: 'talk' }, step: 4, chapterOrder: null });
    expect(repaired.arcade).toEqual({ arjuna: true });
    expect(repaired.seenControls).toBe(false);
    expect(repaired.settings.difficulty).toBe('normal');
  });
});

describe('SaveStore', () => {
  it('starts from defaults, writes through on update and reloads what it wrote', () => {
    const storage = memoryStorage();
    const store = new SaveStore(storage);
    expect(store.data).toEqual(defaultSave());
    store.update((d) => {
      d.campaign.current = 2;
      d.campaign.completed.push(1);
      d.seenControls = true;
    });
    expect(store.unlock('karna')).toBe(true);
    expect(store.unlock('karna')).toBe(false);
    expect(storage.map.has(SAVE_KEY)).toBe(true);
    const again = new SaveStore(storage);
    expect(again.data.campaign.current).toBe(2);
    expect(again.isUnlocked('karna')).toBe(true);
    expect(again.data.seenControls).toBe(true);
  });

  it('resetCampaign keeps unlocks; reset clears everything', () => {
    const storage = memoryStorage();
    const store = new SaveStore(storage);
    store.unlock('karna');
    store.update((d) => {
      d.campaign.current = 5;
    });
    store.resetCampaign();
    expect(store.data.campaign.current).toBe(1);
    expect(store.isUnlocked('karna')).toBe(true);
    store.reset();
    expect(store.data).toEqual(defaultSave());
    expect(storage.map.has(SAVE_KEY)).toBe(false);
  });

  it('survives a storage that throws, and corrupt JSON', () => {
    const broken: StorageLike = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {},
    };
    const store = new SaveStore(broken);
    store.update((d) => {
      d.seenControls = true;
    });
    expect(store.data.seenControls).toBe(true);
    const corrupt = new SaveStore(memoryStorage({ [SAVE_KEY]: '{not json' }));
    expect(corrupt.data).toEqual(defaultSave());
    const none = new SaveStore(null);
    expect(none.data).toEqual(defaultSave());
  });
});
