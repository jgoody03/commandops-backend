"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("firebase/app");
const auth_1 = require("firebase/auth");
const firestore_1 = require("firebase/firestore");
const functions_1 = require("firebase/functions");
function makeRunId() {
    return new Date().toISOString().replace(/[:.]/g, "-");
}
const RUN_ID = makeRunId();
const firebaseConfig = {
    apiKey: "demo-commandops",
    authDomain: "commandops-97fad.firebaseapp.com",
    projectId: "commandops-97fad",
    appId: "1:1234567890:web:commandops-local",
};
const app = (0, app_1.initializeApp)(firebaseConfig);
const auth = (0, auth_1.getAuth)(app);
const db = (0, firestore_1.getFirestore)(app);
const functions = (0, functions_1.getFunctions)(app, "us-central1");
(0, auth_1.connectAuthEmulator)(auth, "http://127.0.0.1:9099", { disableWarnings: true });
(0, firestore_1.connectFirestoreEmulator)(db, "127.0.0.1", 8080);
(0, functions_1.connectFunctionsEmulator)(functions, "127.0.0.1", 5001);
const TEST_EMAIL = process.env.TEST_EMAIL || "john+commandops-local@example.com";
const TEST_PASSWORD = process.env.TEST_PASSWORD || "CommandOps123!";
const WORKSPACE_ID = process.env.WORKSPACE_ID || `demo-workspace-${RUN_ID}`;
const WORKSPACE_NAME = process.env.WORKSPACE_NAME || `Demo Workspace ${RUN_ID}`;
const MAIN_CODE = "MAIN";
const TRUCK1_CODE = "TRUCK1";
const SKU = process.env.SKU || "TONER-001";
const PRODUCT_NAME = process.env.PRODUCT_NAME || "Black Toner Cartridge";
const BARCODE = process.env.BARCODE || "123456789012";
const RECEIVE_QTY = Number(process.env.RECEIVE_QTY || 12);
const MOVE_QTY = Number(process.env.MOVE_QTY || 5);
const ADJUST_DELTA = Number(process.env.ADJUST_DELTA || -2);
function printSection(title) {
    console.log(`\n${"=".repeat(72)}`);
    console.log(title);
    console.log("=".repeat(72));
}
function makeBalanceId(locationId, productId) {
    return `${locationId}_${productId}`;
}
function castDoc(snap) {
    return {
        id: snap.id,
        data: snap.data(),
    };
}
async function ensureSignedIn() {
    try {
        const cred = await (0, auth_1.createUserWithEmailAndPassword)(auth, TEST_EMAIL, TEST_PASSWORD);
        console.log("Created local auth user:", cred.user.uid);
        return cred.user;
    }
    catch (err) {
        const maybeErr = err;
        if ((maybeErr === null || maybeErr === void 0 ? void 0 : maybeErr.code) === "auth/email-already-in-use") {
            const cred = await (0, auth_1.signInWithEmailAndPassword)(auth, TEST_EMAIL, TEST_PASSWORD);
            console.log("Signed in existing local auth user:", cred.user.uid);
            return cred.user;
        }
        throw err;
    }
}
async function findLocationByCode(code) {
    const locationsRef = (0, firestore_1.collection)(db, `workspaces/${WORKSPACE_ID}/locations`);
    const q = (0, firestore_1.query)(locationsRef, (0, firestore_1.where)("code", "==", code), (0, firestore_1.limit)(1));
    const snap = await (0, firestore_1.getDocs)(q);
    if (snap.empty) {
        return null;
    }
    return castDoc(snap.docs[0]);
}
async function ensureTruckLocation() {
    const existing = await findLocationByCode(TRUCK1_CODE);
    if (existing) {
        console.log(`TRUCK1 location already exists: ${existing.id}`);
        return existing.id;
    }
    const locationsRef = (0, firestore_1.collection)(db, `workspaces/${WORKSPACE_ID}/locations`);
    const newRef = (0, firestore_1.doc)(locationsRef);
    await (0, firestore_1.setDoc)(newRef, {
        name: "Truck 1",
        code: TRUCK1_CODE,
        type: "truck",
        isActive: true,
        createdAt: (0, firestore_1.serverTimestamp)(),
        updatedAt: (0, firestore_1.serverTimestamp)(),
    });
    console.log(`Created TRUCK1 location: ${newRef.id}`);
    return newRef.id;
}
async function findMainLocationId() {
    const main = await findLocationByCode(MAIN_CODE);
    if (!main) {
        throw new Error("MAIN location not found after bootstrap.");
    }
    return main.id;
}
async function findProductBySku() {
    const productsRef = (0, firestore_1.collection)(db, `workspaces/${WORKSPACE_ID}/products`);
    const q = (0, firestore_1.query)(productsRef, (0, firestore_1.where)("sku", "==", SKU), (0, firestore_1.limit)(1));
    const snap = await (0, firestore_1.getDocs)(q);
    if (snap.empty) {
        return null;
    }
    return castDoc(snap.docs[0]);
}
async function findProductIdBySku() {
    const product = await findProductBySku();
    if (!product) {
        throw new Error(`Product with SKU ${SKU} not found.`);
    }
    return product.id;
}
async function readBalance(locationId, productId) {
    const balanceId = makeBalanceId(locationId, productId);
    const balanceRef = (0, firestore_1.doc)(db, `workspaces/${WORKSPACE_ID}/inventoryBalances/${balanceId}`);
    const balanceSnap = await (0, firestore_1.getDoc)(balanceRef);
    if (!balanceSnap.exists()) {
        return null;
    }
    const data = balanceSnap.data();
    return Object.assign({ id: balanceSnap.id }, data);
}
function expectNumberEqual(actual, expected, label) {
    if (actual !== expected) {
        throw new Error(`${label} mismatch. Expected ${expected}, got ${actual}`);
    }
}
async function callFunction(name, payload) {
    const callable = (0, functions_1.httpsCallable)(functions, name);
    const result = await callable(payload);
    return result.data;
}
async function main() {
    var _a, _b, _c, _d, _e;
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
        throw new Error(`MOVE_QTY (${MOVE_QTY}) cannot be greater than RECEIVE_QTY (${RECEIVE_QTY}).`);
    }
    if (MOVE_QTY + ADJUST_DELTA < 0) {
        throw new Error(`Adjustment would make TRUCK1 negative. MOVE_QTY=${MOVE_QTY}, ADJUST_DELTA=${ADJUST_DELTA}`);
    }
    const user = await ensureSignedIn();
    console.log("Active UID:", user.uid);
    printSection("1) bootstrapWorkspace");
    const bootstrapResult = await callFunction("bootstrapWorkspace", {
        workspaceId: WORKSPACE_ID,
        workspaceName: WORKSPACE_NAME,
    });
    console.log(JSON.stringify(bootstrapResult, null, 2));
    printSection("2) getMyWorkspaceContext");
    const contextResult = await callFunction("getMyWorkspaceContext", {});
    console.log(JSON.stringify(contextResult, null, 2));
    const mainLocationId = await findMainLocationId();
    console.log("Resolved MAIN locationId:", mainLocationId);
    const truck1LocationId = await ensureTruckLocation();
    console.log("Resolved TRUCK1 locationId:", truck1LocationId);
    printSection("3) quickCreateProduct");
    try {
        const createProductResult = await callFunction("quickCreateProduct", {
            workspaceId: WORKSPACE_ID,
            sku: SKU,
            name: PRODUCT_NAME,
            primaryBarcode: BARCODE,
        });
        console.log(JSON.stringify(createProductResult, null, 2));
    }
    catch (err) {
        const maybeErr = err;
        console.log("quickCreateProduct returned an error, likely SKU already exists in this workspace.");
        console.log((_a = maybeErr === null || maybeErr === void 0 ? void 0 : maybeErr.message) !== null && _a !== void 0 ? _a : err);
    }
    const productId = await findProductIdBySku();
    console.log("Resolved productId:", productId);
    printSection("4) resolveScanCode");
    const resolveResult = await callFunction("resolveScanCode", {
        workspaceId: WORKSPACE_ID,
        code: BARCODE,
        deviceId: "scanner-01",
        symbology: "ean13",
    });
    console.log(JSON.stringify(resolveResult, null, 2));
    printSection("5) receiveInventory into MAIN");
    const receiveResult = await callFunction("receiveInventory", {
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
    const moveResult = await callFunction("moveInventory", {
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
    });
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
    const actualMainAfterMove = (_b = mainBalanceAfterMove === null || mainBalanceAfterMove === void 0 ? void 0 : mainBalanceAfterMove.onHand) !== null && _b !== void 0 ? _b : null;
    const actualTruckAfterMove = (_c = truckBalanceAfterMove === null || truckBalanceAfterMove === void 0 ? void 0 : truckBalanceAfterMove.onHand) !== null && _c !== void 0 ? _c : null;
    console.log("\nExpected MAIN onHand after move:", expectedMainAfterMove);
    console.log("Actual   MAIN onHand after move:", actualMainAfterMove);
    console.log("Expected TRUCK1 onHand after move:", expectedTruckAfterMove);
    console.log("Actual   TRUCK1 onHand after move:", actualTruckAfterMove);
    expectNumberEqual(actualMainAfterMove, expectedMainAfterMove, "MAIN balance after move");
    expectNumberEqual(actualTruckAfterMove, expectedTruckAfterMove, "TRUCK1 balance after move");
    printSection("8) adjustInventory on TRUCK1");
    const adjustResult = await callFunction("adjustInventory", {
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
    const actualMainFinal = (_d = finalMainBalance === null || finalMainBalance === void 0 ? void 0 : finalMainBalance.onHand) !== null && _d !== void 0 ? _d : null;
    const actualTruckFinal = (_e = finalTruckBalance === null || finalTruckBalance === void 0 ? void 0 : finalTruckBalance.onHand) !== null && _e !== void 0 ? _e : null;
    console.log("\nExpected MAIN onHand final:", expectedMainFinal);
    console.log("Actual   MAIN onHand final:", actualMainFinal);
    console.log("Expected TRUCK1 onHand final:", expectedTruckFinal);
    console.log("Actual   TRUCK1 onHand final:", actualTruckFinal);
    expectNumberEqual(actualMainFinal, expectedMainFinal, "MAIN final balance");
    expectNumberEqual(actualTruckFinal, expectedTruckFinal, "TRUCK1 final balance");
    printSection("Flow complete");
    console.log("All emulator flow checks passed.");
}
main().catch((err) => {
    printSection("Flow failed");
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=runEmulatorFlow.js.map