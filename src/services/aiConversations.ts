import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import type { AiChatMessage, AiConversation } from '../types';
import { firestoreDb } from '../lib/firebase';

const writeQueues = new Map<string, Promise<void>>();

function requireDatabase() {
  if (!firestoreDb) {
    throw new Error('Cloud Firestore is not configured.');
  }
  return firestoreDb;
}

function serialize<T>(key: string, operation: () => Promise<T>): Promise<T> {
  const previous = writeQueues.get(key) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(operation);
  writeQueues.set(key, next.then(() => undefined, () => undefined));
  return next;
}

export async function loadAiConversations(uid: string): Promise<AiConversation[]> {
  const database = requireDatabase();
  const conversationsRef = collection(database, 'users', uid, 'aiConversations');
  const snapshots = await getDocs(query(conversationsRef, orderBy('updatedAtEpoch', 'desc')));

  return Promise.all(snapshots.docs.map(async (snapshot) => {
    const data = snapshot.data();
    const messagesRef = collection(snapshot.ref, 'messages');
    const messagesSnapshot = await getDocs(query(messagesRef, orderBy('createdAtEpoch', 'asc')));
    const messages: AiChatMessage[] = messagesSnapshot.docs.map((messageDoc) => {
      const message = messageDoc.data();
      return {
        id: messageDoc.id,
        sender: message.sender === 'user' ? 'user' : 'assistant',
        text: typeof message.text === 'string' ? message.text : '',
        timestamp: typeof message.timestamp === 'string' ? message.timestamp : '',
        ...(typeof message.source === 'string' ? { source: message.source } : {}),
        ...(Array.isArray(message.suggestedFollowUps)
          ? { suggestedFollowUps: message.suggestedFollowUps.filter((item: unknown): item is string => typeof item === 'string') }
          : {}),
      };
    });

    return {
      id: snapshot.id,
      title: typeof data.title === 'string' ? data.title : 'New Conversation',
      createdAt: typeof data.createdAt === 'string' ? data.createdAt : '',
      updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : '',
      messages,
    };
  }));
}

export async function saveAiConversation(uid: string, conversation: AiConversation): Promise<void> {
  const database = requireDatabase();
  await serialize(`${uid}:${conversation.id}`, async () => {
    const conversationRef = doc(database, 'users', uid, 'aiConversations', conversation.id);
    const now = Date.now();
    const createdAtEpoch = Number.isFinite(Date.parse(conversation.createdAt))
      ? Date.parse(conversation.createdAt)
      : now;

    await setDoc(conversationRef, {
      title: conversation.title.slice(0, 120),
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      createdAtEpoch,
      updatedAtEpoch: now,
      updatedAtServer: serverTimestamp(),
    }, { merge: true });

    const batch = writeBatch(database);
    for (const [index, message] of conversation.messages.entries()) {
      const messageRef = doc(conversationRef, 'messages', message.id);
      const messageData = {
        sender: message.sender,
        text: message.text.slice(0, 20000),
        timestamp: message.timestamp.slice(0, 60),
        createdAtEpoch: now - conversation.messages.length + index,
        ...(message.source ? { source: message.source.slice(0, 100) } : {}),
        ...(message.suggestedFollowUps
          ? { suggestedFollowUps: message.suggestedFollowUps.slice(0, 8).map((item) => item.slice(0, 200)) }
          : {}),
      };
      batch.set(messageRef, messageData, { merge: true });
    }
    await batch.commit();
  });
}

export async function deleteAiConversation(uid: string, conversationId: string): Promise<void> {
  const database = requireDatabase();
  await serialize(`${uid}:${conversationId}`, async () => {
    const conversationRef = doc(database, 'users', uid, 'aiConversations', conversationId);
    const messages = await getDocs(collection(conversationRef, 'messages'));
    for (let offset = 0; offset < messages.docs.length; offset += 450) {
      const batch = writeBatch(database);
      messages.docs.slice(offset, offset + 450).forEach((message) => batch.delete(message.ref));
      await batch.commit();
    }
    await deleteDoc(conversationRef);
  });
}
