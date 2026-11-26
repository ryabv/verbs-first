/**
 * Учебные данные ученика — в IndexedDB, по схеме будущего сервера (docs/ARCHITECTURE.md, «Хранилище учебных данных»).
 *
 * - Таблица — набор записей с `id` (строка, составной ключ — явно: `1:ermis`), `updatedAt` и надгробием `deletedAt`:
 *   удаление не стирает запись, иначе оно не дойдёт до другого устройства.
 * - При старте (`initDb`) вся база читается в память: данных мало, а React читает синхронно (`useSyncExternalStore`).
 *   Запись — в память сразу, в базу следом. Другие вкладки узнают об изменении через BroadcastChannel.
 * - Нет IndexedDB (старый браузер, приватный режим, скрипты в Node) — данные живут в памяти до перезагрузки.
 */

import { DB_VERSION, MIGRATIONS, TABLES, type DbRecord, type RecordOf, type TableName } from './schema';

export { TABLE_INFO, TABLES, type DbRecord, type Rank, type RecordOf, type Schema, type SrsFields, type TableName } from './schema';

const DB_NAME = 'verbs-first';

/** Запись без служебных полей — их ставит таблица. */
export type Fields<T extends DbRecord> = Omit<T, 'updatedAt' | 'deletedAt'>;

let db: IDBDatabase | null = null;
const memory = new Map<TableName, Map<string, DbRecord>>(TABLES.map((t) => [t, new Map()]));
const listeners = new Map<TableName, Set<() => void>>(TABLES.map((t) => [t, new Set()]));
/** Счётчик изменений таблицы: снимки пересобираются только при его смене. */
const versions = new Map<TableName, number>(TABLES.map((t) => [t, 0]));
let channel: BroadcastChannel | null = null;

/** Применить миграции по порядку: из версии `from` в DB_VERSION. */
function upgrade(database: IDBDatabase, from: number) {
  for (let v = from + 1; v <= DB_VERSION; v++) MIGRATIONS[v]?.(database);
}

const request = <T>(req: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    req.addEventListener('success', () => resolve(req.result));
    req.addEventListener('error', () => reject(req.error ?? new Error('IndexedDB')));
  });

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.addEventListener('upgradeneeded', (e) => upgrade(req.result, e.oldVersion));
    req.addEventListener('success', () => resolve(req.result));
    req.addEventListener('error', () => reject(req.error ?? new Error('IndexedDB')));
    req.addEventListener('blocked', () => reject(new Error('IndexedDB blocked')));
  });
}

function changed(name: TableName) {
  versions.set(name, (versions.get(name) ?? 0) + 1);
  listeners.get(name)?.forEach((l) => l());
}

/**
 * Открыть базу и прочитать её в память. Вызывается один раз до первого кадра (app/index.tsx).
 * Ошибки не роняют приложение: без базы оно работает в памяти.
 */
export async function initDb(): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  try {
    db = await open();
    // Другая вкладка открыла новую версию схемы — эту закрываем, данные дозапишет она.
    db.addEventListener('versionchange', () => db?.close());
    const tx = db.transaction(TABLES, 'readonly');
    await Promise.all(
      TABLES.map(async (name) => {
        const rows = await request(tx.objectStore(name).getAll() as IDBRequest<DbRecord[]>);
        const map = memory.get(name)!;
        for (const row of rows) map.set(row.id, row);
        changed(name);
      }),
    );
  } catch {
    db = null;
  }
  if (typeof BroadcastChannel !== 'undefined') {
    channel = new BroadcastChannel(DB_NAME);
    channel.addEventListener('message', (e: MessageEvent<Message>) => {
      const map = memory.get(e.data.table);
      if (!map) return;
      for (const row of e.data.rows) map.set(row.id, row);
      changed(e.data.table);
    });
  }
  // Просим браузер не стирать данные при нехватке места (Safari всё равно может — см. ARCHITECTURE.md).
  void navigator.storage?.persist?.().catch(() => false);
}

/** Сообщение другим вкладкам: эти записи изменились. */
interface Message {
  table: TableName;
  rows: DbRecord[];
}

function broadcast(message: Message) {
  // У BroadcastChannel нет targetOrigin (канал и так только своего сайта) — вызываем через apply, а не как window.postMessage.
  if (channel) Reflect.apply(channel.postMessage, channel, [message]);
}

function write(name: TableName, rows: DbRecord[]) {
  if (rows.length === 0) return;
  const map = memory.get(name)!;
  for (const row of rows) map.set(row.id, row);
  changed(name);
  broadcast({ table: name, rows });
  if (!db) return;
  try {
    const tx = db.transaction(name, 'readwrite');
    const store = tx.objectStore(name);
    for (const row of rows) store.put(row);
  } catch {
    /* база закрыта (смена версии в другой вкладке) — запись осталась в памяти */
  }
}

/** Таблица: синхронное чтение из памяти, запись — в память и в базу. */
export interface Table<T extends DbRecord> {
  /** Живая запись (без надгробия). */
  get(id: string): T | undefined;
  /** Все живые записи; один и тот же массив, пока таблица не менялась — годится для useSyncExternalStore. */
  all(): readonly T[];
  /** Записать (создать или заменить); updatedAt ставится сам, надгробие снимается. */
  put(...records: Fields<T>[]): void;
  /** Удалить — надгробие. */
  remove(...ids: string[]): void;
  subscribe(listener: () => void): () => void;
}

/** Таблица схемы; тип записи — из schema.ts. */
export function table<N extends TableName>(name: N): Table<RecordOf<N>> {
  type T = RecordOf<N>;
  const map = memory.get(name)!;
  let cachedVersion = -1;
  let cached: readonly T[] = [];
  return {
    get(id) {
      const row = map.get(id) as T | undefined;
      return row && !row.deletedAt ? row : undefined;
    },
    all() {
      const version = versions.get(name) ?? 0;
      if (version !== cachedVersion) {
        cachedVersion = version;
        cached = [...map.values()].filter((r) => !r.deletedAt) as T[];
      }
      return cached;
    },
    put(...records) {
      const now = new Date().toISOString();
      const out: DbRecord[] = [];
      for (const r of records) out.push({ ...r, updatedAt: now, deletedAt: undefined });
      write(name, out);
    },
    remove(...ids) {
      const now = new Date().toISOString();
      write(
        name,
        ids.flatMap((id) => {
          const row = map.get(id);
          return row && !row.deletedAt ? [{ ...row, updatedAt: now, deletedAt: now }] : [];
        }),
      );
    },
    subscribe(listener) {
      const set = listeners.get(name)!;
      set.add(listener);
      return () => set.delete(listener);
    },
  };
}

/** Снимок данных: записи по таблицам, без служебных полей. */
export type Snapshot = { [N in TableName]?: Fields<RecordOf<N>>[] };

/**
 * Заменить все данные в памяти снимком (Storybook: состояние экрана задаётся историей, docs/ARCHITECTURE.md).
 * В IndexedDB не пишет — вызывать без `initDb`.
 */
export function loadSnapshot(snapshot: Snapshot): void {
  const at = '2026-01-01T00:00:00.000Z';
  for (const name of TABLES) {
    const map = memory.get(name)!;
    map.clear();
    for (const row of snapshot[name] ?? []) map.set(row.id, { ...row, updatedAt: at } as DbRecord);
    changed(name);
  }
}

/** Новый id записи (карточка, набор, ответ): время + случайный хвост — без сервера и без столкновений. */
export function newId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

const settings = table('settings');

/** Настройка с проверкой значения: чужое или пустое — значение по умолчанию. */
export function setting<T extends string>(id: string, fallback: T, valid: readonly T[]) {
  const read = (): T => {
    const v = settings.get(id)?.value;
    return valid.find((x) => x === v) ?? fallback;
  };
  return {
    read,
    write: (value: T) => {
      if (settings.get(id)?.value !== value) settings.put({ id, value });
    },
    subscribe: settings.subscribe,
  };
}

/** Журнал ответов (таблица `attempts`, только дописывается) — см. schema.ts. */
const attempts = table('attempts');

export function logAttempt(attempt: Omit<Fields<RecordOf<'attempts'>>, 'id' | 'at'>): void {
  attempts.put({ ...attempt, id: newId(), at: new Date().toISOString() });
}
