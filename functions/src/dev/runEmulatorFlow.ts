import { initializeApp } from "firebase/app";
import {
  Auth,
  User,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
} from "firebase/auth";
import {
  Firestore,
  QueryDocumentSnapshot,
  DocumentData,
  collection,
  connectFirestoreEmulator,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import {
  Functions,
  HttpsCallableResult,
  connectFunctionsEmulator,
  getFunctions,
  httpsCallable,
} from "firebase/functions";

function makeRunId(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

const RUN_ID = makeRunId();

const firebaseConfig = {
  apiKey: "demo-commandops",
  authDomain: "commandops-97fad.firebaseapp.com",
  projectId: "commandops-97fad",
  appId: "1:1234567890:web:commandops-local",
};

const app = initializeApp(firebaseConfig);
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const functions: Functions = getFunctions(app, "us-central1");

connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
connectFirestoreEmulator(db, "127.0.0.1", 8080);
connectFunctionsEmulator(functions, "127.0.0.1", 5001);

const TEST_EMAIL = process.env.TEST_EMAIL || "john+commandops-local@example.com";
const TEST_PASSWORD = process.env.TEST_PASSWORD || "CommandOps123!";

const WORKSPACE_ID = process.env.WORKSPACE_ID || `demo-workspace-${RUN_ID}`;
const WORKSPACE_NAME =
  process.env.WORKSPACE_NAME || `Demo Workspace ${RUN_ID}`;

const MAIN_CODE = "MAIN";
const TRUCK1_CODE = "TRUCK1";

const SKU = process.env.SKU || "TONER-001";
const PRODUCT_NAME = process.env.PRODUCT_NAME || "Black Toner Cartridge";
const BARCODE = process.env.BARCODE || "123456789012";

const RECEIVE_QTY = Number(process.env.RECEIVE_QTY || 12);
const MOVE_QTY = Number(process.env.MOVE_QTY || 5);
const ADJUST_DELTA = Number(process.env.ADJUST_DELTA || -2);

type TimestampLike = unknown;

type WorkspaceContextResult = {
  workspaceId: string | null;
  workspace: Record<string, unknown> | null;
  membership: Record<string, unknown> | null;
};

type BootstrapWorkspaceResult = {
  workspaceId: string;
  ok: boolean;
};

type QuickCreateProductResult = {
  ok: boolean;
  product?: {
    id: string;
    sku: string;
    name: string;
    description?: string;
    primaryBarcode?: string | null;
    barcodeAliases?: string[];
    unit?: string;
    isActive?: boolean;
  };
};

type ResolveScanCodeResult =
  | {
      resolutionStatus: "resolved";
      productId: string;
      sku: string;
      productName: string;
    }
  | {
      resolutionStatus: "unresolved";
    };

type ReceiveInventoryResult = {
  ok: boolean;
  transactionId: string;
  postedAt: string;
  lineCount: number;
};

type MoveInventoryResult = {
  ok: boolean;
  transactionId: string;
  postedAt: string;
  lineCount: number;
  sourceLocationId: string;
  targetLocationId: string;
};

type AdjustInventoryResult = {
  ok: boolean;
  transactionId: string;
  postedAt: string;
  lineCount: number;
  locationId: string;
};

type LocationRecord = {
  name: string;
  code: string;
  type: string;
  isActive: boolean;
  createdAt?: TimestampLike;
  updatedAt?: TimestampLike;
};

type ProductRecord = {
  sku: string;
  name: string;
  description?: string;
  primaryBarcode?: string | null;
  barcodeAliases?: string[];
  unit?: string;
  isActive?: boolean;
  createdAt?: TimestampLike;
  updatedAt?: TimestampLike;
};

type BalanceRecord = {
  id: string;
  workspaceId: string;
  locationId: string;
  productId: string;
  onHand: number;
  available: number;
  lastTransactionAt?: TimestampLike;
  updatedAt?: TimestampLike;
};

type WithId<T> = {
  id: string;
  data: T;
};

type QuickCreateProductPayload = {
  workspaceId: string;
  sku: string;
  name: string;
  primaryBarcode?: string;
};

type ResolveScanCodePayload = {
  workspaceId: string;
  code: string;
  deviceId?: string;
  symbology?: string;
};

type ReceiveInventoryPayload = {
  workspaceId: string;
  locationId: string;
  note?: string;
  lines: Array<{
    productId: string;
    quantity: number;
    unitCost?: number;
    barcode?: string;
  }>;
};

type MoveInventoryPayload = {
  workspaceId: string;
  sourceLocationId: string;
  targetLocationId: string;
  note?: string;
  lines: Array<{
    productId: string;
    quantity: number;
    barcode?: string;
  }>;
};

type AdjustInventoryPayload = {
  workspaceId: string;
  locationId: string;
  note?: string;
  lines: Array<{
    productId: string;
    quantityDelta: number;
    barcode?: string;
    note?: string;
  }>;
};

function printSection(title: string): void {
  console.log(`\n${"=".repeat(72)}`);
  console.log(title);
  console.log("=".repeat(72));
}

function makeBalanceId(locationId: string, productId: string): string {
  return `${locationId}_${productId}`;
}

function castDoc<T>(snap: QueryDocumentSnapshot<DocumentData>): WithId<T> {
  return {
    id: snap.id,
    data: snap.data() as T,
  };
}

async function ensureSignedIn(): Promise<User> {
  try {
    const cred = await createUserWithEmailAndPassword(
      auth,
      TEST_EMAIL,
      TEST_PASSWORD
    );
    console.log("Created local auth user:", cred.user.uid);
    return cred.user;
  } catch (err: unknown) {
    const maybeErr = err as { code?: string };
    if (maybeErr?.code === "auth/email-already-in-use") {
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

async function findLocationByCode(code: string): Promise<WithId<LocationRecord> | null> {
  const locationsRef = collection(db, `workspaces/${WORKSPACE_ID}/locations`);
  const q = query(locationsRef, where("code", "==", code), limit(1));
  const snap = await getDocs(q);

  if (snap.empty) {
    return null;
  }

  return castDoc<LocationRecord>(snap.docs[0]);
}

async function ensureTruckLocation(): Promise<string> {
  const existing = await findLocationByCode(TRUCK1_CODE);

  if (existing) {
    console.log(`TRUCK1 location already exists: ${existing.id}`);
    return existing.id;
  }

  const locationsRef = collection(db, `workspaces/${WORKSPACE_ID}/locations`);
  const newRef = doc(locationsRef);

  await setDoc(newRef, {
    name: "Truck 1",
    code: TRUCK1_CODE,
    type: "truck",
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  console.log(`Created TRUCK1 location: ${newRef.id}`);
  return newRef.id;
}

async function findMainLocationId(): Promise<string> {
  const main = await findLocationByCode(MAIN_CODE);

  if (!main) {
    throw new Error("MAIN location not found after bootstrap.");
  }

  return main.id;
}

async function findProductBySku(): Promise<WithId<ProductRecord> | null> {
  const productsRef = collection(db, `workspaces/${WORKSPACE_ID}/products`);
  const q = query(productsRef, where("sku", "==", SKU), limit(1));
  const snap = await getDocs(q);

  if (snap.empty) {
    return null;
  }

  return castDoc<ProductRecord>(snap.docs[0]);
}

async function findProductIdBySku(): Promise<string> {
  const product = await findProductBySku();

  if (!product) {
    throw new Error(`Product with SKU ${SKU} not found.`);
  }

  return product.id;
}

async function readBalance(
  locationId: string,
  productId: string
): Promise<BalanceRecord | null> {
  const balanceId = makeBalanceId(locationId, productId);
  const balanceRef = doc(
    db,
    `workspaces/${WORKSPACE_ID}/inventoryBalances/${balanceId}`
  );
  const balanceSnap = await getDoc(balanceRef);

  if (!balanceSnap.exists()) {
    return null;
  }

  const data = balanceSnap.data() as Omit<BalanceRecord, "id">;

  return {
    id: balanceSnap.id,
    ...data,
  };
}

function expectNumberEqual(
  actual: number | null,
  expected: number,
  label: string
): void {
  if (actual !== expected) {
    throw new Error(`${label} mismatch. Expected ${expected}, got ${actual}`);
  }
}

async function callFunction<TReq, TRes>(
  name: string,
  payload: TReq
): Promise<TRes> {
  const callable = httpsCallable<TReq, TRes>(functions, name);
  const result: HttpsCallableResult<TRes> = await callable(payload);
  return result.data;
}

async function main(): Promise<void> {
  printSection("Starting CommandOps emulator flow");

  console.log("RUN_ID:", RUN_ID);
  console.log("WORKSPACE_ID:", WORKSPACE_ID);
  console.log("WORKSPACE_NAME:", WORKSPACE_NAME);
  console.log("SKU:", SKU);
  console.log("BARCODE:", BARCODE);
  console.log("RECEIVE_QTY:", RECEIVE_QTY);
  console.log("MOVE_QTY:", MOVE_QTY);
  console.log("ADJUST_DELTA:", ADJUST_DELTA);

  if (!Number.isFinite(RECEIVE_QTY) || RECEIVE_QTY <= 0) {
    throw new Error(`Invalid RECEIVE_QTY: ${RECEIVE_QTY}`);
  }

  if (!Number.isFinite(MOVE_QTY) || MOVE_QTY <= 0) {
    throw new Error(`Invalid MOVE_QTY: ${MOVE_QTY}`);
  }

  if (!Number.isFinite(ADJUST_DELTA) || ADJUST_DELTA === 0) {
    throw new Error(`Invalid ADJUST_DELTA: ${ADJUST_DELTA}`);
  }

  if (MOVE_QTY > RECEIVE_QTY) {
    throw new Error(
      `MOVE_QTY (${MOVE_QTY}) cannot be greater than RECEIVE_QTY (${RECEIVE_QTY}).`
    );
  }

  if (MOVE_QTY + ADJUST_DELTA < 0) {
    throw new Error(
      `Adjustment would make TRUCK1 negative. MOVE_QTY=${MOVE_QTY}, ADJUST_DELTA=${ADJUST_DELTA}`
    );
  }

  const user = await ensureSignedIn();
  console.log("Active UID:", user.uid);

  printSection("1) bootstrapWorkspace");
  const bootstrapResult = await callFunction<
    { workspaceId: string; workspaceName: string },
    BootstrapWorkspaceResult
  >("bootstrapWorkspace", {
    workspaceId: WORKSPACE_ID,
    workspaceName: WORKSPACE_NAME,
  });
  console.log(JSON.stringify(bootstrapResult, null, 2));

  printSection("2) getMyWorkspaceContext");
  const contextResult = await callFunction<Record<string, never>, WorkspaceContextResult>(
    "getMyWorkspaceContext",
    {}
  );
  console.log(JSON.stringify(contextResult, null, 2));

  const mainLocationId = await findMainLocationId();
  console.log("Resolved MAIN locationId:", mainLocationId);

  const truck1LocationId = await ensureTruckLocation();
  console.log("Resolved TRUCK1 locationId:", truck1LocationId);

  printSection("3) quickCreateProduct");
  try {
    const createProductResult = await callFunction<
      QuickCreateProductPayload,
      QuickCreateProductResult
    >("quickCreateProduct", {
      workspaceId: WORKSPACE_ID,
      sku: SKU,
      name: PRODUCT_NAME,
      primaryBarcode: BARCODE,
    });
    console.log(JSON.stringify(createProductResult, null, 2));
  } catch (err: unknown) {
    const maybeErr = err as { message?: string };
    console.log(
      "quickCreateProduct returned an error, likely SKU already exists in this workspace."
    );
    console.log(maybeErr?.message ?? err);
  }

  const productId = await findProductIdBySku();
  console.log("Resolved productId:", productId);

  printSection("4) resolveScanCode");
  const resolveResult = await callFunction<
    ResolveScanCodePayload,
    ResolveScanCodeResult
  >("resolveScanCode", {
    workspaceId: WORKSPACE_ID,
    code: BARCODE,
    deviceId: "scanner-01",
    symbology: "ean13",
  });
  console.log(JSON.stringify(resolveResult, null, 2));

  printSection("5) receiveInventory into MAIN");
  const receiveResult = await callFunction<
    ReceiveInventoryPayload,
    ReceiveInventoryResult
  >("receiveInventory", {
    workspaceId: WORKSPACE_ID,
    locationId: mainLocationId,
    note: `Initial stock for ${RUN_ID}`,
    lines: [
      {
        productId,
        quantity: RECEIVE_QTY,
        unitCost: 48.5,
        barcode: BARCODE,
      },
    ],
  });
  console.log(JSON.stringify(receiveResult, null, 2));

  const balanceAfterReceiveMain = await readBalance(mainLocationId, productId);
  console.log("\nBalance at MAIN after receive:");
  console.log(JSON.stringify(balanceAfterReceiveMain, null, 2));

  printSection("6) moveInventory MAIN -> TRUCK1");
  const moveResult = await callFunction<MoveInventoryPayload, MoveInventoryResult>(
    "moveInventory",
    {
      workspaceId: WORKSPACE_ID,
      sourceLocationId: mainLocationId,
      targetLocationId: truck1LocationId,
      note: `Restock Truck 1 for ${RUN_ID}`,
      lines: [
        {
          productId,
          quantity: MOVE_QTY,
          barcode: BARCODE,
        },
      ],
    }
  );
  console.log(JSON.stringify(moveResult, null, 2));

  printSection("7) verify balances after move");
  const mainBalanceAfterMove = await readBalance(mainLocationId, productId);
  const truckBalanceAfterMove = await readBalance(truck1LocationId, productId);

  console.log("\nMAIN balance after move:");
  console.log(JSON.stringify(mainBalanceAfterMove, null, 2));

  console.log("\nTRUCK1 balance after move:");
  console.log(JSON.stringify(truckBalanceAfterMove, null, 2));

  const expectedMainAfterMove = RECEIVE_QTY - MOVE_QTY;
  const expectedTruckAfterMove = MOVE_QTY;

  const actualMainAfterMove = mainBalanceAfterMove?.onHand ?? null;
  const actualTruckAfterMove = truckBalanceAfterMove?.onHand ?? null;

  console.log("\nExpected MAIN onHand after move:", expectedMainAfterMove);
  console.log("Actual   MAIN onHand after move:", actualMainAfterMove);
  console.log("Expected TRUCK1 onHand after move:", expectedTruckAfterMove);
  console.log("Actual   TRUCK1 onHand after move:", actualTruckAfterMove);

  expectNumberEqual(
    actualMainAfterMove,
    expectedMainAfterMove,
    "MAIN balance after move"
  );
  expectNumberEqual(
    actualTruckAfterMove,
    expectedTruckAfterMove,
    "TRUCK1 balance after move"
  );

  printSection("8) adjustInventory on TRUCK1");
  const adjustResult = await callFunction<
    AdjustInventoryPayload,
    AdjustInventoryResult
  >("adjustInventory", {
    workspaceId: WORKSPACE_ID,
    locationId: truck1LocationId,
    note: `Cycle count adjustment for ${RUN_ID}`,
    lines: [
      {
        productId,
        quantityDelta: ADJUST_DELTA,
        barcode: BARCODE,
        note: `Adjustment delta ${ADJUST_DELTA}`,
      },
    ],
  });
  console.log(JSON.stringify(adjustResult, null, 2));

  printSection("9) verify balances after adjustment");
  const finalMainBalance = await readBalance(mainLocationId, productId);
  const finalTruckBalance = await readBalance(truck1LocationId, productId);

  console.log("\nMAIN balance after adjustment:");
  console.log(JSON.stringify(finalMainBalance, null, 2));

  console.log("\nTRUCK1 balance after adjustment:");
  console.log(JSON.stringify(finalTruckBalance, null, 2));

  const expectedMainFinal = RECEIVE_QTY - MOVE_QTY;
  const expectedTruckFinal = MOVE_QTY + ADJUST_DELTA;

  const actualMainFinal = finalMainBalance?.onHand ?? null;
  const actualTruckFinal = finalTruckBalance?.onHand ?? null;

  console.log("\nExpected MAIN onHand final:", expectedMainFinal);
  console.log("Actual   MAIN onHand final:", actualMainFinal);
  console.log("Expected TRUCK1 onHand final:", expectedTruckFinal);
  console.log("Actual   TRUCK1 onHand final:", actualTruckFinal);

  expectNumberEqual(actualMainFinal, expectedMainFinal, "MAIN final balance");
  expectNumberEqual(actualTruckFinal, expectedTruckFinal, "TRUCK1 final balance");

  printSection("Flow complete");
  console.log("All emulator flow checks passed.");
}

main().catch((err: unknown) => {
  printSection("Flow failed");
  console.error(err);
  process.exit(1);
});