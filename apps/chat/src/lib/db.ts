import { openDB as idbOpen, type IDBPDatabase } from 'idb';

const DB_NAME = 'refrakt-chat';
const DB_VERSION = 2;

export interface StoredConversation {
	id: string;
	title: string;
	mode?: string;
	createdAt: number;
	updatedAt: number;
}

export interface StoredMessage {
	conversationId: string;
	role: 'user' | 'assistant';
	content: string;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
	if (!dbPromise) {
		dbPromise = idbOpen(DB_NAME, DB_VERSION, {
			upgrade(db, oldVersion) {
				if (oldVersion < 1) {
					const convStore = db.createObjectStore('conversations', { keyPath: 'id' });
					convStore.createIndex('updatedAt', 'updatedAt');

					const msgStore = db.createObjectStore('messages', { autoIncrement: true });
					msgStore.createIndex('conversationId', 'conversationId');
				}
				// v1 → v2: mode field is optional, no store schema change needed.
				// Existing conversations get mode=undefined → treated as 'general'.
			},
		});
	}
	return dbPromise;
}

export async function createConversation(title: string, mode?: string): Promise<StoredConversation> {
	const db = await getDB();
	const conv: StoredConversation = {
		id: crypto.randomUUID(),
		title,
		mode,
		createdAt: Date.now(),
		updatedAt: Date.now(),
	};
	await db.put('conversations', conv);
	return conv;
}

export async function listConversations(): Promise<StoredConversation[]> {
	const db = await getDB();
	const all = await db.getAllFromIndex('conversations', 'updatedAt');
	return all.reverse();
}

export async function deleteConversation(id: string): Promise<void> {
	const db = await getDB();
	const tx = db.transaction(['conversations', 'messages'], 'readwrite');
	await tx.objectStore('conversations').delete(id);

	const msgStore = tx.objectStore('messages');
	const index = msgStore.index('conversationId');
	let cursor = await index.openCursor(IDBKeyRange.only(id));
	while (cursor) {
		await cursor.delete();
		cursor = await cursor.continue();
	}

	await tx.done;
}

export async function saveMessage(
	conversationId: string,
	message: { role: 'user' | 'assistant'; content: string },
): Promise<void> {
	const db = await getDB();
	const tx = db.transaction(['messages', 'conversations'], 'readwrite');
	await tx.objectStore('messages').add({ conversationId, ...message });
	const conv = await tx.objectStore('conversations').get(conversationId);
	if (conv) {
		conv.updatedAt = Date.now();
		await tx.objectStore('conversations').put(conv);
	}
	await tx.done;
}

export async function updateLastMessage(
	conversationId: string,
	content: string,
): Promise<void> {
	const db = await getDB();
	const tx = db.transaction(['messages', 'conversations'], 'readwrite');
	const msgStore = tx.objectStore('messages');
	const index = msgStore.index('conversationId');
	let cursor = await index.openCursor(IDBKeyRange.only(conversationId), 'prev');
	if (cursor) {
		const record = cursor.value;
		record.content = content;
		await cursor.update(record);
	}
	const conv = await tx.objectStore('conversations').get(conversationId);
	if (conv) {
		conv.updatedAt = Date.now();
		await tx.objectStore('conversations').put(conv);
	}
	await tx.done;
}

export async function loadMessages(conversationId: string): Promise<StoredMessage[]> {
	const db = await getDB();
	return db.getAllFromIndex('messages', 'conversationId', IDBKeyRange.only(conversationId));
}

export async function updateConversationTitle(id: string, title: string): Promise<void> {
	const db = await getDB();
	const conv = await db.get('conversations', id);
	if (conv) {
		conv.title = title;
		await db.put('conversations', conv);
	}
}
