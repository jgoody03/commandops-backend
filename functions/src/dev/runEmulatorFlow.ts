import { initializeApp } from "firebase/app";
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
} from "firebase/auth";
import {
  connectFunctionsEmulator,
  getFunctions,
  httpsCallable,
} from "firebase/functions";
import {
  connectFirestoreEmulator,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  collection,
  query,
  where,
  limit,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "demo-commandops",
  authDomain: "commandops-97fad.firebaseapp.com",
  projectId: "commandops-97fad",
  appId: "1:1234567890:web:commandops-local",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app, "us-central1");

connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
connectFirestoreEmulator(db, "127.0.0.1", 8080);
connectFunctionsEmulator(functions, "127.0.0.1", 5001);

const TEST_EMAIL = "john+commandops-local@example.com";
const TEST_PASSWORD = "CommandOps123!";
const WORKSPACE_ID = "demo-workspace";
const WORKSPACE_NAME = "Demo Workspace";
const SKU = "TONER-001";
const PRODUCT_NAME = "Black Toner Cartridge";
const BARCODE = "123456789012";

async function ensureSignedIn() {
  try {
    const cred = await createUserWithEmailAndPassword(
      auth,
      TEST_EMAIL,
      TEST_PASSWORD
    );
    console.log("Created local auth user:", cred.user.uid);
    return cred.user;
  } catch (err: any) {
    if (err?.code === "auth/email-already-in-use") {
      const cred = await signInWithEmailAndPassword(
        auth,
        TEST_EMAIL,
        TEST_PASSWORD
      );
      console.log("Signed in existing local auth user:", cred.user.uid);
      return cred.user;
    }
    throw err;
  }
}

async function findMainLocationId(): Promise<string> {
  const locationsRef = collection(db, `workspaces/${WORKSPACE_ID}/locations`);
  const q = query(locationsRef, where("code", "==", "MAIN"), limit(1));
  const snap = await getDocs(q);

  if (snap.empty) {
    throw new Error("MAIN location not found after bootstrap.");
  }

  return snap.docs[0].id;
}

async function findProductIdBySku(): Promise<string> {
  const productsRef = collection(db, `workspaces/${WORKSPACE_ID}/products`);
  const q = query(productsRef, where("sku", "==", SKU), limit(1));
  const snap = await getDocs(q);

  if (snap.empty) {
    throw new Error(`Product with SKU ${SKU} not found.`);
  }

  return snap.docs[0].id;
}

async function readBalance(locationId: string, productId: string) {
  const balanceId = `${locationId}_${productId}`;
  const balanceRef = doc(
    db,
    `workspaces/${WORKSPACE_ID}/inventoryBalances/${balanceId}`
  );
  const balanceSnap = await getDoc(balanceRef);

  if (!balanceSnap.exists()) {
    throw new Error("Inventory balance doc not found.");
  }

  return balanceSnap.data();
}

async function main() {
  console.log("Starting CommandOps emulator flow...");
  await ensureSignedIn();

  const bootstrapWorkspace = httpsCallable(functions, "bootstrapWorkspace");
  const getMyWorkspaceContext = httpsCallable(functions, "getMyWorkspaceContext");
  const quickCreateProduct = httpsCallable(functions, "quickCreateProduct");
  const resolveScanCode = httpsCallable(functions, "resolveScanCode");
  const receiveInventory = httpsCallable(functions, "receiveInventory");

  console.log("\n1) bootstrapWorkspace");
  const bootstrapResult = await bootstrapWorkspace({
    workspaceId: WORKSPACE_ID,
    workspaceName: WORKSPACE_NAME,
  });
  console.log(JSON.stringify(bootstrapResult.data, null, 2));

  console.log("\n2) getMyWorkspaceContext");
  const contextResult = await getMyWorkspaceContext({});
  console.log(JSON.stringify(contextResult.data, null, 2));

  const locationId = await findMainLocationId();
  console.log("\nResolved MAIN locationId:", locationId);

  console.log("\n3) quickCreateProduct");
  try {
    const createProductResult = await quickCreateProduct({
      workspaceId: WORKSPACE_ID,
      sku: SKU,
      name: PRODUCT_NAME,
      primaryBarcode: BARCODE,
    });
    console.log(JSON.stringify(createProductResult.data, null, 2));
  } catch (err: any) {
    console.log(
      "quickCreateProduct returned an error, likely because the SKU already exists."
    );
    console.log(err?.message ?? err);
  }

  const productId = await findProductIdBySku();
  console.log("\nResolved productId:", productId);

  console.log("\n4) resolveScanCode");
  const resolveResult = await resolveScanCode({
    workspaceId: WORKSPACE_ID,
    code: BARCODE,
    deviceId: "scanner-01",
    symbology: "ean13",
  });
  console.log(JSON.stringify(resolveResult.data, null, 2));

  console.log("\n5) receiveInventory");
  const receiveResult = await receiveInventory({
    workspaceId: WORKSPACE_ID,
    locationId,
    note: "Initial stock",
    lines: [
      {
        productId,
        quantity: 12,
        unitCost: 48.5,
        barcode: BARCODE,
      },
    ],
  });
  console.log(JSON.stringify(receiveResult.data, null, 2));

  console.log("\n6) verify inventory balance");
  const balance = await readBalance(locationId, productId);
  console.log(JSON.stringify(balance, null, 2));

  console.log("\nFlow complete.");
}

main().catch((err) => {
  console.error("\nFlow failed:");
  console.error(err);
  process.exit(1);
});