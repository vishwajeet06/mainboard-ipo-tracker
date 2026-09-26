import { 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebaseAuth';
import { MainboardIPO } from '../types/ipo';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface CloudIpoFeed {
  ipos: MainboardIPO[];
  sheetTitle: string;
  sheetUrl?: string;
  updatedAt: string;
  updatedBy: string;
}

const FEED_DOC_PATH = 'ipo_feed';
const FEED_DOC_ID = 'latest_mainboard_feed';

/**
 * Publishes the latest parsed Google Sheet IPO data to Firestore
 * so all other devices and users immediately receive it in real-time.
 */
export async function publishIpoFeedToCloud(
  ipos: MainboardIPO[], 
  sheetTitle: string, 
  sheetUrl?: string
): Promise<void> {
  const path = `${FEED_DOC_PATH}/${FEED_DOC_ID}`;
  try {
    const payload = {
      ipos,
      sheetTitle: sheetTitle || 'Mainboard IPO Dashboard',
      sheetUrl: sheetUrl || '',
      updatedAt: new Date().toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }) + ', ' + new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' }),
      updatedBy: 'Automated Feed',
      timestamp: serverTimestamp(),
    };

    await setDoc(doc(db, FEED_DOC_PATH, FEED_DOC_ID), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Gets the latest IPO data stored in the cloud (one-time fetch)
 */
export async function getCloudIpoFeed(): Promise<CloudIpoFeed | null> {
  const path = `${FEED_DOC_PATH}/${FEED_DOC_ID}`;
  try {
    const docSnap = await getDoc(doc(db, FEED_DOC_PATH, FEED_DOC_ID));
    if (docSnap.exists()) {
      return docSnap.data() as CloudIpoFeed;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

/**
 * Attaches a real-time listener to the cloud IPO feed.
 * Any device running this dashboard receives immediate updates
 * the moment a new sheet is synced or published, with zero login required!
 */
export function subscribeToCloudIpoFeed(
  onUpdate: (feed: CloudIpoFeed) => void,
  onError?: (err: Error) => void
) {
  const path = `${FEED_DOC_PATH}/${FEED_DOC_ID}`;
  return onSnapshot(
    doc(db, FEED_DOC_PATH, FEED_DOC_ID),
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as CloudIpoFeed;
        if (data && Array.isArray(data.ipos) && data.ipos.length > 0) {
          onUpdate(data);
        }
      }
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (e: any) {
        if (onError) onError(e);
      }
    }
  );
}
