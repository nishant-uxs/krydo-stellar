import admin from "firebase-admin";
import fs from "fs";
import path from "path";

let initialized = false;

function ensureFirebase() {
  if (initialized || admin.apps.length) {
    initialized = true;
    return;
  }

  const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const inlineJson = process.env.FIREBASE_SERVICE_ACCOUNT;

  let serviceAccount: admin.ServiceAccount | null = null;

  if (inlineJson) {
    try {
      serviceAccount = JSON.parse(inlineJson) as admin.ServiceAccount;
    } catch (err) {
      throw new Error(`FIREBASE_SERVICE_ACCOUNT is not valid JSON: ${(err as Error).message}`);
    }
  } else if (credsPath) {
    const resolved = path.isAbsolute(credsPath) ? credsPath : path.resolve(process.cwd(), credsPath);
    if (!fs.existsSync(resolved)) {
      throw new Error(`Firebase credentials file not found at: ${resolved}`);
    }
    serviceAccount = JSON.parse(fs.readFileSync(resolved, "utf8")) as admin.ServiceAccount;
  } else {
    throw new Error(
      "Firebase credentials not configured. Set GOOGLE_APPLICATION_CREDENTIALS (path to JSON) or FIREBASE_SERVICE_ACCOUNT (JSON string) in your .env",
    );
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID || (serviceAccount as any).project_id,
  });

  console.log(
    `Firebase initialized. Project: ${process.env.FIREBASE_PROJECT_ID || (serviceAccount as any).project_id}`,
  );
  initialized = true;
}

function getFirestore() {
  ensureFirebase();
  const db = admin.firestore();
  // Allow undefined values in writes (zk proof publicInputs can have undefined fields)
  try {
    db.settings({ ignoreUndefinedProperties: true });
  } catch {
    // settings() throws if called more than once on the same instance
  }
  return db;
}

export const firestore = new Proxy({} as FirebaseFirestore.Firestore, {
  get(_target, prop, receiver) {
    return Reflect.get(getFirestore(), prop, receiver);
  },
});

export const Timestamp = admin.firestore.Timestamp;
export const FieldValue = admin.firestore.FieldValue;

function col(name: string) {
  return getFirestore().collection(name);
}

// Collection references used across storage layer (lazy via getters)
export const collections = {
  get wallets() {
    return col("wallets");
  },
  get issuers() {
    return col("issuers");
  },
  get credentials() {
    return col("credentials");
  },
  get credentialRequests() {
    return col("credentialRequests");
  },
  get transactions() {
    return col("transactions");
  },
  get zkProofs() {
    return col("zkProofs");
  },
};

export const db = firestore;
