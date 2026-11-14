// Versioned save data in localStorage with safe defaults and an in-memory fallback.
// Hero ids are plain strings here (the engine does not import content); content narrows them.

export const SAVE_KEY = 'astra.save.v1';
export const SAVE_VERSION = 1;

export type SaveDifficulty = 'easy' | 'normal' | 'hard';

export interface CampaignSave {
  /** 1-based chapter the player is on (next to play). */
  current: number;
  completed: number[];
  /** Choice id -> option id. */
  choices: Record<string, string>;
  /** Chapter order after reorder effects, or null for the default order. */
  chapterOrder: number[] | null;
}

export interface SaveData {
  version: typeof SAVE_VERSION;
  unlocked: string[];
  campaign: CampaignSave;
  /** Hero id -> cleared Arcade with that hero. */
  arcade: Record<string, boolean>;
  seenControls: boolean;
  settings: { difficulty: SaveDifficulty };
}

/** The subset of the Web Storage API the store uses (so tests can pass a plain object). */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function defaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    unlocked: [],
    campaign: { current: 1, completed: [], choices: {}, chapterOrder: null },
    arcade: {},
    seenControls: false,
    settings: { difficulty: 'normal' },
  };
}

const DIFFICULTIES: readonly SaveDifficulty[] = ['easy', 'normal', 'hard'];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function stringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

function numberArray(v: unknown): number[] {
  return Array.isArray(v) ? v.filter((x): x is number => Number.isInteger(x) && x > 0) : [];
}

/** Fills missing or malformed fields from the defaults; never throws. */
export function withDefaults(raw: unknown): SaveData {
  const d = defaultSave();
  if (!isRecord(raw)) return d;
  const c = isRecord(raw.campaign) ? raw.campaign : {};
  const choices: Record<string, string> = {};
  if (isRecord(c.choices)) {
    for (const [k, v] of Object.entries(c.choices)) if (typeof v === 'string') choices[k] = v;
  }
  const arcade: Record<string, boolean> = {};
  if (isRecord(raw.arcade)) {
    for (const [k, v] of Object.entries(raw.arcade)) if (v === true) arcade[k] = true;
  }
  const settings = isRecord(raw.settings) ? raw.settings : {};
  const difficulty = DIFFICULTIES.find((x) => x === settings.difficulty) ?? d.settings.difficulty;
  const order = numberArray(c.chapterOrder);
  return {
    version: SAVE_VERSION,
    unlocked: [...new Set(stringArray(raw.unlocked))],
    campaign: {
      current: Number.isInteger(c.current) && (c.current as number) >= 1 ? (c.current as number) : 1,
      completed: [...new Set(numberArray(c.completed))].sort((a, b) => a - b),
      choices,
      chapterOrder: order.length > 0 ? order : null,
    },
    arcade,
    seenControls: raw.seenControls === true,
    settings: { difficulty },
  };
}

function defaultStorage(): StorageLike | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const probe = `${SAVE_KEY}.probe`;
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    return null;
  }
}

/**
 * Loads once, keeps the data in memory and writes through on every change. A storage that
 * throws or is missing (private mode, blocked site data) degrades to memory only.
 */
export class SaveStore {
  private readonly storage: StorageLike | null;
  private current: SaveData;

  constructor(storage: StorageLike | null | undefined = defaultStorage(), private readonly key: string = SAVE_KEY) {
    this.storage = storage ?? null;
    this.current = this.read();
  }

  private read(): SaveData {
    try {
      const text = this.storage?.getItem(this.key);
      if (!text) return defaultSave();
      return withDefaults(JSON.parse(text));
    } catch {
      return defaultSave();
    }
  }

  private write(): void {
    try {
      this.storage?.setItem(this.key, JSON.stringify(this.current));
    } catch {
      // Memory-only from here; the game keeps working.
    }
  }

  get data(): Readonly<SaveData> {
    return this.current;
  }

  /** Applies a change and persists it; returns the new data. */
  update(fn: (draft: SaveData) => void): Readonly<SaveData> {
    const draft = withDefaults(JSON.parse(JSON.stringify(this.current)));
    fn(draft);
    this.current = withDefaults(draft);
    this.write();
    return this.current;
  }

  unlock(id: string): boolean {
    if (this.current.unlocked.includes(id)) return false;
    this.update((d) => {
      d.unlocked.push(id);
    });
    return true;
  }

  isUnlocked(id: string): boolean {
    return this.current.unlocked.includes(id);
  }

  /** Campaign progress only; unlocks, arcade clears and settings stay. */
  resetCampaign(): void {
    this.update((d) => {
      d.campaign = defaultSave().campaign;
    });
  }

  /** Everything back to defaults. */
  reset(): void {
    this.current = defaultSave();
    try {
      this.storage?.removeItem(this.key);
    } catch {
      // ignore
    }
  }
}
