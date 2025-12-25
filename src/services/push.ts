import admin from 'firebase-admin';

const initialized = initFirebase();

function initFirebase(): boolean {
  const projectId = process.env['FIREBASE_PROJECT_ID'];
  const clientEmail = process.env['FIREBASE_CLIENT_EMAIL'];
  const privateKey = process.env['FIREBASE_PRIVATE_KEY']?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    console.warn('Firebase credentials not configured, push notifications disabled');
    return false;
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    return true;
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
    return false;
  }
}

export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export async function sendPush(token: string, message: PushMessage): Promise<boolean> {
  if (!initialized) {
    console.warn('Firebase not initialized, skipping push');
    return false;
  }

  try {
    await admin.messaging().send({
      token,
      notification: {
        title: message.title,
        body: message.body,
      },
      data: message.data,
    });
    return true;
  } catch (error) {
    console.error('Failed to send push notification:', error);
    return false;
  }
}

export async function sendPushToMany(tokens: string[], message: PushMessage): Promise<number> {
  if (!initialized || tokens.length === 0) {
    return 0;
  }

  try {
    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: {
        title: message.title,
        body: message.body,
      },
      data: message.data,
    });
    return response.successCount;
  } catch (error) {
    console.error('Failed to send multicast push:', error);
    return 0;
  }
}
