/**
 * Local persistence (IndexedDB via `idb`). Everything in Local Demo Mode
 * lives here, in the browser — nothing is sent to a server.
 */
import { openDB, type IDBPDatabase } from "idb";
import { DEFAULT_SETTINGS, type AppData } from "./types";

export const DB_NAME = "easylife";
export const DB_VERSION = 1;

export const COLLECTIONS = ["tasks", "events", "notes", "goals", "sessions", "reviews"] as const;
export type Collection = (typeof COLLECTIONS)[number];
type StoreName = Collection | "settings";
const ALL_STORES: StoreName[] = [...COLLECTIONS, "settings"];

export interface Repo {
  /** Null when nothing has ever been saved (first launch). */
  load(): Promise<AppData | null>;
  put<K extends Collection>(store: K, item: AppData[K][number]): Promise<void>;
  putMany<K extends Collection>(store: K, items: AppData[K]): Promise<void>;
  remove(store: Collection, id: string): Promise<void>;
  saveSettings(settings: AppData["settings"]): Promise<void>;
  /** Replace every store in one transaction (seed / reset). */
  replaceAll(data: AppData): Promise<void>;
  close(): void;
}

export async function openRepo(name: string = DB_NAME): Promise<Repo> {
  const db: IDBPDatabase = await openDB(name, DB_VERSION, {
    upgrade(database) {
      for (const store of ALL_STORES) {
        if (!database.objectStoreNames.contains(store)) {
          database.createObjectStore(store, { keyPath: "id" });
        }
      }
    },
  });

  return {
    async load() {
      const tx = db.transaction(ALL_STORES, "readonly");
      const [tasks, events, notes, goals, sessions, reviews, settings] = await Promise.all([
        ...COLLECTIONS.map((s) => tx.objectStore(s).getAll()),
        tx.objectStore("settings").get("settings"),
      ]);
      await tx.done;
      if (!settings) return null;
      return {
        tasks,
        events,
        notes,
        goals,
        sessions,
        reviews,
        settings: { ...DEFAULT_SETTINGS, ...settings },
      } as AppData;
    },
    async put(store, item) {
      await db.put(store, item);
    },
    async putMany(store, items) {
      const tx = db.transaction(store, "readwrite");
      await Promise.all([...items.map((i) => tx.store.put(i)), tx.done]);
    },
    async remove(store, id) {
      await db.delete(store, id);
    },
    async saveSettings(settings) {
      await db.put("settings", settings);
    },
    async replaceAll(data) {
      const tx = db.transaction(ALL_STORES, "readwrite");
      const ops: Promise<unknown>[] = [];
      for (const store of COLLECTIONS) {
        const os = tx.objectStore(store);
        ops.push(os.clear());
        for (const item of data[store]) ops.push(os.put(item));
      }
      ops.push(tx.objectStore("settings").put(data.settings));
      await Promise.all([...ops, tx.done]);
    },
    close() {
      db.close();
    },
  };
}
