import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import {
  getFirestore,
  Timestamp,
  type Firestore,
} from "firebase-admin/firestore";
import config from "../config.js";

function initializeFirebase(): Firestore {
  if (getApps().length > 0) {
    return getFirestore(config.env.FIRESTORE_DATABASE_ID);
  }

  const serviceAccount = JSON.parse(config.env.FIREBASE_SERVICE_ACCOUNT);
  initializeApp({ credential: cert(serviceAccount) });
  return getFirestore(config.env.FIRESTORE_DATABASE_ID);
}

export interface UserDocument {
  email: string;
  name: string;
  picture: string;
  createdAt: Timestamp;
  lastLogin: Timestamp;
}

class FirestoreService {
  private db: Firestore;
  private readonly USERS_COLLECTION = "users";

  constructor() {
    this.db = initializeFirebase();
  }

  async upsertUser(user: { email: string; name: string; picture: string }) {
    const userRef = this.db.collection(this.USERS_COLLECTION).doc(user.email);
    const now = Timestamp.now();
    const doc = await userRef.get();

    if (doc.exists) {
      await userRef.update({
        lastLogin: now,
        name: user.name,
        picture: user.picture,
      });

      return {
        ...doc.data(),
        lastLogin: now,
        name: user.name,
        picture: user.picture,
      };
    }
    const userData = {
      email: user.email,
      name: user.name,
      picture: user.picture,
      createdAt: now,
      lastLogin: now,
    };

    await userRef.set(userData);
    return userData;
  }

  async getUser(email: string) {
    const doc = await this.db
      .collection(this.USERS_COLLECTION)
      .doc(email)
      .get();
    return doc.exists ? (doc.data() as UserDocument) : null;
  }

  async getAllUsers(): Promise<UserDocument[]> {
    const snapshot = await this.db.collection(this.USERS_COLLECTION).get();
    return snapshot.docs.map((doc) => doc.data() as UserDocument);
  }
}

const firestorePlugin: FastifyPluginAsync = async (fastify) => {
  const firestore = new FirestoreService();
  fastify.decorate("firestore", firestore);
};

export default fp(firestorePlugin, { name: "firestore" });

declare module "fastify" {
  interface FastifyInstance {
    firestore: FirestoreService;
  }
}
