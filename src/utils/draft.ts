/** 本地草稿持久化（IndexedDB）——刷新/关闭浏览器后可恢复上次编辑内容 */

import type { FileNode } from '../types';

const DB_NAME = 'deckforge';
const DB_VERSION = 1;
const STORE_NAME = 'drafts';
const DRAFT_KEY = 'current';

export interface DraftPayload {
  fileTree: FileNode[];
  currentFile: string | null;
  savedAt: number;
}

function openDraftDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('打开 IndexedDB 失败'));
  });
}

export async function saveDraft(payload: DraftPayload): Promise<void> {
  const db = await openDraftDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(payload, DRAFT_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('写入草稿失败'));
    tx.onabort = () => reject(tx.error || new Error('写入草稿被中止'));
  });
  db.close();
}

export async function loadDraft(): Promise<DraftPayload | null> {
  const db = await openDraftDb();
  try {
    return await new Promise<DraftPayload | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).get(DRAFT_KEY);
      request.onsuccess = () => resolve((request.result as DraftPayload | undefined) ?? null);
      request.onerror = () => reject(request.error || new Error('读取草稿失败'));
    });
  } finally {
    db.close();
  }
}

export async function clearDraft(): Promise<void> {
  const db = await openDraftDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(DRAFT_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('清理草稿失败'));
    });
  } finally {
    db.close();
  }
}
