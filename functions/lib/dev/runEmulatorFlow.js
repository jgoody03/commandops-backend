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
function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}
function expectNumberEqual(actual, expected, label) {
    if (actual !== expected) {
        throw new Error(`${label} mismatch. Expected ${expected}, got ${actual}`);
    }
}
function expectStringEqual(actual, expected, label) {
    if (actual !== expected) {
        throw new Error(`${label} mismatch. Expected ${expected}, got ${actual}`);
    }
}
function expectDescendingCreatedAt(items, label) {
    var _a, _b;
    for (let i = 1; i < items.length; i += 1) {
        const prev = items[i - 1];
        const curr = items[i];
        const prevMs = (_a = prev.createdAtMs) !== null && _a !== void 0 ? _a : 0;
        const currMs = (_b = curr.createdAtMs) !== null && _b !== void 0 ? _b : 0;
        if (prevMs < currMs) {
            throw new Error(`${label} sort order invalid at index ${i}. ${prev.id} (${prevMs}) came before ${curr.id} (${currMs}).`);
        }
        if (prevMs === currMs && prev.id < curr.id) {
            throw new Error(`${label} tiebreak order invalid at index ${i}. Expected documentId desc for equal timestamps.`);
        }
    }
}
function expectArrayLength(arr, expected, label) {
    if (arr.length !== expected) {
        throw new Error(`${label} mismatch. Expected ${expected}, got ${arr.length}`);
    }
}
function expectDescendingUpdatedAt(items, label) {
    var _a, _b;
    for (let i = 1; i < items.length; i += 1) {
        const prev = items[i - 1];
        const curr = items[i];
        const prevMs = (_a = prev.updatedAtMs) !== null && _a !== void 0 ? _a : 0;
        const currMs = (_b = curr.updatedAtMs) !== null && _b !== void 0 ? _b : 0;
        if (prevMs < currMs) {
            throw new Error(`${label} sort order invalid at index ${i}. ${prev.id} (${prevMs}) came before ${curr.id} (${currMs}).`);
        }
        if (prevMs === currMs && prev.id < curr.id) {
            throw new Error(`${label} tiebreak order invalid at index ${i}. Expected documentId desc for equal timestamps.`);
        }
    }
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
async function readProductInventorySummary(productId) {
    const ref = (0, firestore_1.doc)(db, `workspaces/${WORKSPACE_ID}/productInventorySummary/${productId}`);
    const snap = await (0, firestore_1.getDoc)(ref);
    if (!snap.exists()) {
        return null;
    }
    return Object.assign({ id: snap.id }, snap.data());
}
async function readLocationInventorySummary(locationId) {
    const ref = (0, firestore_1.doc)(db, `workspaces/${WORKSPACE_ID}/locationInventorySummary/${locationId}`);
    const snap = await (0, firestore_1.getDoc)(ref);
    if (!snap.exists()) {
        return null;
    }
    return Object.assign({ id: snap.id }, snap.data());
}
async function readRecentActivity() {
    const ref = (0, firestore_1.collection)(db, `workspaces/${WORKSPACE_ID}/recentActivity`);
    const snap = await (0, firestore_1.getDocs)(ref);
    return snap.docs.map((d) => (Object.assign({ id: d.id }, d.data())));
}
async function callFunction(name, payload) {
    const callable = (0, functions_1.httpsCallable)(functions, name);
    const result = await callable(payload);
    return result.data;
}
async function main() {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16, _17;
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
    const mainLocationRecord = await findLocationByCode(MAIN_CODE);
    const truck1LocationRecord = await findLocationByCode(TRUCK1_CODE);
    assert(mainLocationRecord, "Expected MAIN location record.");
    assert(truck1LocationRecord, "Expected TRUCK1 location record.");
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
    printSection("5) getProductByBarcode");
    const barcodeLookupResult = await callFunction("getProductByBarcode", {
        workspaceId: WORKSPACE_ID,
        barcode: BARCODE,
    });
    console.log(JSON.stringify(barcodeLookupResult, null, 2));
    assert(barcodeLookupResult.found, "Expected barcode lookup to succeed.");
    assert(barcodeLookupResult.product, "Expected product payload.");
    expectStringEqual((_b = barcodeLookupResult.product) === null || _b === void 0 ? void 0 : _b.id, productId, "getProductByBarcode productId");
    expectStringEqual((_c = barcodeLookupResult.product) === null || _c === void 0 ? void 0 : _c.sku, SKU, "getProductByBarcode sku");
    expectStringEqual((_d = barcodeLookupResult.product) === null || _d === void 0 ? void 0 : _d.name, PRODUCT_NAME, "getProductByBarcode name");
    expectStringEqual((_f = (_e = barcodeLookupResult.product) === null || _e === void 0 ? void 0 : _e.primaryBarcode) !== null && _f !== void 0 ? _f : null, BARCODE, "getProductByBarcode primaryBarcode");
    printSection("6) getProductByBarcode - not found");
    const missingBarcodeResult = await callFunction("getProductByBarcode", {
        workspaceId: WORKSPACE_ID,
        barcode: `missing-${RUN_ID}`,
    });
    console.log(JSON.stringify(missingBarcodeResult, null, 2));
    assert(missingBarcodeResult.found === false, "Expected missing barcode lookup to return found=false.");
    assert(missingBarcodeResult.product === null, "Expected missing barcode lookup to return null product.");
    printSection("7) receiveInventory into MAIN");
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
    printSection("8) moveInventory MAIN -> TRUCK1");
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
    printSection("9) verify balances after move");
    const mainBalanceAfterMove = await readBalance(mainLocationId, productId);
    const truckBalanceAfterMove = await readBalance(truck1LocationId, productId);
    console.log("\nMAIN balance after move:");
    console.log(JSON.stringify(mainBalanceAfterMove, null, 2));
    console.log("\nTRUCK1 balance after move:");
    console.log(JSON.stringify(truckBalanceAfterMove, null, 2));
    const expectedMainAfterMove = RECEIVE_QTY - MOVE_QTY;
    const expectedTruckAfterMove = MOVE_QTY;
    const actualMainAfterMove = (_g = mainBalanceAfterMove === null || mainBalanceAfterMove === void 0 ? void 0 : mainBalanceAfterMove.onHand) !== null && _g !== void 0 ? _g : null;
    const actualTruckAfterMove = (_h = truckBalanceAfterMove === null || truckBalanceAfterMove === void 0 ? void 0 : truckBalanceAfterMove.onHand) !== null && _h !== void 0 ? _h : null;
    console.log("\nExpected MAIN onHand after move:", expectedMainAfterMove);
    console.log("Actual   MAIN onHand after move:", actualMainAfterMove);
    console.log("Expected TRUCK1 onHand after move:", expectedTruckAfterMove);
    console.log("Actual   TRUCK1 onHand after move:", actualTruckAfterMove);
    expectNumberEqual(actualMainAfterMove, expectedMainAfterMove, "MAIN balance after move");
    expectNumberEqual(actualTruckAfterMove, expectedTruckAfterMove, "TRUCK1 balance after move");
    printSection("10) adjustInventory on TRUCK1");
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
    printSection("11) verify balances after adjustment");
    const finalMainBalance = await readBalance(mainLocationId, productId);
    const finalTruckBalance = await readBalance(truck1LocationId, productId);
    console.log("\nMAIN balance after adjustment:");
    console.log(JSON.stringify(finalMainBalance, null, 2));
    console.log("\nTRUCK1 balance after adjustment:");
    console.log(JSON.stringify(finalTruckBalance, null, 2));
    const expectedMainFinal = RECEIVE_QTY - MOVE_QTY;
    const expectedTruckFinal = MOVE_QTY + ADJUST_DELTA;
    const actualMainFinal = (_j = finalMainBalance === null || finalMainBalance === void 0 ? void 0 : finalMainBalance.onHand) !== null && _j !== void 0 ? _j : null;
    const actualTruckFinal = (_k = finalTruckBalance === null || finalTruckBalance === void 0 ? void 0 : finalTruckBalance.onHand) !== null && _k !== void 0 ? _k : null;
    console.log("\nExpected MAIN onHand final:", expectedMainFinal);
    console.log("Actual   MAIN onHand final:", actualMainFinal);
    console.log("Expected TRUCK1 onHand final:", expectedTruckFinal);
    console.log("Actual   TRUCK1 onHand final:", actualTruckFinal);
    expectNumberEqual(actualMainFinal, expectedMainFinal, "MAIN final balance");
    expectNumberEqual(actualTruckFinal, expectedTruckFinal, "TRUCK1 final balance");
    printSection("12) verify enriched balance fields");
    assert(finalMainBalance, "Expected final MAIN balance record.");
    assert(finalTruckBalance, "Expected final TRUCK1 balance record.");
    expectStringEqual(finalMainBalance === null || finalMainBalance === void 0 ? void 0 : finalMainBalance.sku, SKU, "MAIN balance sku");
    expectStringEqual(finalMainBalance === null || finalMainBalance === void 0 ? void 0 : finalMainBalance.name, PRODUCT_NAME, "MAIN balance name");
    expectStringEqual(finalMainBalance === null || finalMainBalance === void 0 ? void 0 : finalMainBalance.locationName, mainLocationRecord.data.name, "MAIN balance locationName");
    expectStringEqual(finalTruckBalance === null || finalTruckBalance === void 0 ? void 0 : finalTruckBalance.locationName, truck1LocationRecord.data.name, "TRUCK1 balance locationName");
    expectStringEqual(finalMainBalance === null || finalMainBalance === void 0 ? void 0 : finalMainBalance.stockStatus, "ok", "MAIN balance stockStatus");
    expectStringEqual(finalTruckBalance === null || finalTruckBalance === void 0 ? void 0 : finalTruckBalance.stockStatus, "ok", "TRUCK1 balance stockStatus");
    assert((finalMainBalance === null || finalMainBalance === void 0 ? void 0 : finalMainBalance.isOutOfStock) === false, "Expected MAIN isOutOfStock=false.");
    assert((finalTruckBalance === null || finalTruckBalance === void 0 ? void 0 : finalTruckBalance.isOutOfStock) === false, "Expected TRUCK1 isOutOfStock=false.");
    printSection("12) getInventoryBalances - all balances");
    const allBalances = await callFunction("getInventoryBalances", {
        workspaceId: WORKSPACE_ID,
        limit: 10,
    });
    console.log(JSON.stringify(allBalances, null, 2));
    expectArrayLength(allBalances.items, 2, "all balances item count");
    expectDescendingUpdatedAt(allBalances.items, "all balances");
    const allBalanceIds = allBalances.items.map((item) => item.id).sort();
    const expectedBalanceIds = [
        makeBalanceId(mainLocationId, productId),
        makeBalanceId(truck1LocationId, productId),
    ].sort();
    expectStringEqual(JSON.stringify(allBalanceIds), JSON.stringify(expectedBalanceIds), "all balances ids");
    const mainBalanceFromApi = allBalances.items.find((item) => item.locationId === mainLocationId && item.productId === productId);
    const truckBalanceFromApi = allBalances.items.find((item) => item.locationId === truck1LocationId && item.productId === productId);
    assert(mainBalanceFromApi, "MAIN balance missing from getInventoryBalances.");
    assert(truckBalanceFromApi, "TRUCK1 balance missing from getInventoryBalances.");
    expectNumberEqual((_l = mainBalanceFromApi === null || mainBalanceFromApi === void 0 ? void 0 : mainBalanceFromApi.onHand) !== null && _l !== void 0 ? _l : null, expectedMainFinal, "getInventoryBalances MAIN onHand");
    expectNumberEqual((_m = truckBalanceFromApi === null || truckBalanceFromApi === void 0 ? void 0 : truckBalanceFromApi.onHand) !== null && _m !== void 0 ? _m : null, expectedTruckFinal, "getInventoryBalances TRUCK1 onHand");
    printSection("13) getInventoryBalances - filter by locationId");
    const mainOnlyBalances = await callFunction("getInventoryBalances", {
        workspaceId: WORKSPACE_ID,
        locationId: mainLocationId,
        limit: 10,
    });
    console.log(JSON.stringify(mainOnlyBalances, null, 2));
    expectArrayLength(mainOnlyBalances.items, 1, "main-only balances item count");
    expectStringEqual((_o = mainOnlyBalances.items[0]) === null || _o === void 0 ? void 0 : _o.locationId, mainLocationId, "main-only locationId");
    expectStringEqual((_p = mainOnlyBalances.items[0]) === null || _p === void 0 ? void 0 : _p.productId, productId, "main-only productId");
    expectNumberEqual((_r = (_q = mainOnlyBalances.items[0]) === null || _q === void 0 ? void 0 : _q.onHand) !== null && _r !== void 0 ? _r : null, expectedMainFinal, "main-only onHand");
    printSection("14) getInventoryBalances - filter by productId");
    const productOnlyBalances = await callFunction("getInventoryBalances", {
        workspaceId: WORKSPACE_ID,
        productId,
        limit: 10,
    });
    console.log(JSON.stringify(productOnlyBalances, null, 2));
    expectArrayLength(productOnlyBalances.items, 2, "product-only balances item count");
    for (const item of productOnlyBalances.items) {
        expectStringEqual(item.productId, productId, "product-only productId");
    }
    printSection("15) getInventoryBalances - pagination");
    const firstPage = await callFunction("getInventoryBalances", {
        workspaceId: WORKSPACE_ID,
        limit: 1,
    });
    console.log("First page:");
    console.log(JSON.stringify(firstPage, null, 2));
    expectArrayLength(firstPage.items, 1, "first page item count");
    assert(firstPage.nextCursor, "Expected nextCursor on first page.");
    const secondPage = await callFunction("getInventoryBalances", {
        workspaceId: WORKSPACE_ID,
        limit: 1,
        cursor: firstPage.nextCursor,
    });
    console.log("Second page:");
    console.log(JSON.stringify(secondPage, null, 2));
    expectArrayLength(secondPage.items, 1, "second page item count");
    const firstPageId = (_s = firstPage.items[0]) === null || _s === void 0 ? void 0 : _s.id;
    const secondPageId = (_t = secondPage.items[0]) === null || _t === void 0 ? void 0 : _t.id;
    assert(firstPageId, "Missing first page item id.");
    assert(secondPageId, "Missing second page item id.");
    assert(firstPageId !== secondPageId, "Pagination returned duplicate items.");
    const pagedIds = [firstPageId, secondPageId].sort();
    expectStringEqual(JSON.stringify(pagedIds), JSON.stringify(expectedBalanceIds), "paged ids");
    printSection("16) searchProducts");
    const searchProductsResult = await callFunction("searchProducts", {
        workspaceId: WORKSPACE_ID,
        query: SKU.slice(0, 4),
        limit: 10,
    });
    console.log(JSON.stringify(searchProductsResult, null, 2));
    assert(searchProductsResult.items.length >= 1, "Expected at least one product search result.");
    const searchedProduct = searchProductsResult.items.find((item) => item.id === productId);
    assert(searchedProduct, "Expected created product in search results.");
    expectStringEqual(searchedProduct === null || searchedProduct === void 0 ? void 0 : searchedProduct.sku, SKU, "searchProducts sku");
    expectStringEqual(searchedProduct === null || searchedProduct === void 0 ? void 0 : searchedProduct.name, PRODUCT_NAME, "searchProducts name");
    printSection("17) getLocationInventory");
    const locationInventoryResult = await callFunction("getLocationInventory", {
        workspaceId: WORKSPACE_ID,
        locationId: truck1LocationId,
        limit: 10,
    });
    console.log(JSON.stringify(locationInventoryResult, null, 2));
    assert(locationInventoryResult.items.length >= 1, "Expected at least one location inventory result.");
    const truckInventoryItem = locationInventoryResult.items.find((item) => item.productId === productId);
    assert(truckInventoryItem, "Expected created product in truck location inventory.");
    expectStringEqual(truckInventoryItem === null || truckInventoryItem === void 0 ? void 0 : truckInventoryItem.locationId, truck1LocationId, "getLocationInventory locationId");
    expectNumberEqual((_u = truckInventoryItem === null || truckInventoryItem === void 0 ? void 0 : truckInventoryItem.onHand) !== null && _u !== void 0 ? _u : null, expectedTruckFinal, "getLocationInventory onHand");
    expectStringEqual((_v = truckInventoryItem === null || truckInventoryItem === void 0 ? void 0 : truckInventoryItem.product) === null || _v === void 0 ? void 0 : _v.sku, SKU, "getLocationInventory product sku");
    expectStringEqual((_w = truckInventoryItem === null || truckInventoryItem === void 0 ? void 0 : truckInventoryItem.product) === null || _w === void 0 ? void 0 : _w.name, PRODUCT_NAME, "getLocationInventory product name");
    printSection("18) verify product inventory summary");
    const productSummary = await readProductInventorySummary(productId);
    console.log(JSON.stringify(productSummary, null, 2));
    assert(productSummary, "Expected product inventory summary.");
    expectStringEqual(productSummary === null || productSummary === void 0 ? void 0 : productSummary.productId, productId, "product summary productId");
    expectStringEqual(productSummary === null || productSummary === void 0 ? void 0 : productSummary.sku, SKU, "product summary sku");
    expectStringEqual(productSummary === null || productSummary === void 0 ? void 0 : productSummary.name, PRODUCT_NAME, "product summary name");
    expectNumberEqual((_x = productSummary === null || productSummary === void 0 ? void 0 : productSummary.totalOnHand) !== null && _x !== void 0 ? _x : null, expectedMainFinal + expectedTruckFinal, "product summary totalOnHand");
    expectNumberEqual((_y = productSummary === null || productSummary === void 0 ? void 0 : productSummary.totalAvailable) !== null && _y !== void 0 ? _y : null, expectedMainFinal + expectedTruckFinal, "product summary totalAvailable");
    expectNumberEqual((_z = productSummary === null || productSummary === void 0 ? void 0 : productSummary.totalLocations) !== null && _z !== void 0 ? _z : null, 2, "product summary totalLocations");
    expectNumberEqual((_0 = productSummary === null || productSummary === void 0 ? void 0 : productSummary.locationsInStock) !== null && _0 !== void 0 ? _0 : null, 2, "product summary locationsInStock");
    expectNumberEqual((_1 = productSummary === null || productSummary === void 0 ? void 0 : productSummary.locationsOutOfStock) !== null && _1 !== void 0 ? _1 : null, 0, "product summary locationsOutOfStock");
    expectNumberEqual((_2 = productSummary === null || productSummary === void 0 ? void 0 : productSummary.locationsLowStock) !== null && _2 !== void 0 ? _2 : null, 0, "product summary locationsLowStock");
    expectStringEqual(productSummary === null || productSummary === void 0 ? void 0 : productSummary.stockStatus, "ok", "product summary stockStatus");
    printSection("19) verify location inventory summaries");
    const mainLocationSummary = await readLocationInventorySummary(mainLocationId);
    const truckLocationSummary = await readLocationInventorySummary(truck1LocationId);
    console.log("MAIN location summary:");
    console.log(JSON.stringify(mainLocationSummary, null, 2));
    console.log("TRUCK1 location summary:");
    console.log(JSON.stringify(truckLocationSummary, null, 2));
    assert(mainLocationSummary, "Expected MAIN location summary.");
    assert(truckLocationSummary, "Expected TRUCK1 location summary.");
    expectStringEqual(mainLocationSummary === null || mainLocationSummary === void 0 ? void 0 : mainLocationSummary.locationId, mainLocationId, "MAIN location summary locationId");
    expectStringEqual(truckLocationSummary === null || truckLocationSummary === void 0 ? void 0 : truckLocationSummary.locationId, truck1LocationId, "TRUCK1 location summary locationId");
    expectNumberEqual((_3 = mainLocationSummary === null || mainLocationSummary === void 0 ? void 0 : mainLocationSummary.totalSkus) !== null && _3 !== void 0 ? _3 : null, 1, "MAIN location summary totalSkus");
    expectNumberEqual((_4 = mainLocationSummary === null || mainLocationSummary === void 0 ? void 0 : mainLocationSummary.totalUnits) !== null && _4 !== void 0 ? _4 : null, expectedMainFinal, "MAIN location summary totalUnits");
    expectNumberEqual((_5 = mainLocationSummary === null || mainLocationSummary === void 0 ? void 0 : mainLocationSummary.totalAvailableUnits) !== null && _5 !== void 0 ? _5 : null, expectedMainFinal, "MAIN location summary totalAvailableUnits");
    expectNumberEqual((_6 = mainLocationSummary === null || mainLocationSummary === void 0 ? void 0 : mainLocationSummary.inStockSkuCount) !== null && _6 !== void 0 ? _6 : null, 1, "MAIN location summary inStockSkuCount");
    expectNumberEqual((_7 = mainLocationSummary === null || mainLocationSummary === void 0 ? void 0 : mainLocationSummary.lowStockSkuCount) !== null && _7 !== void 0 ? _7 : null, 0, "MAIN location summary lowStockSkuCount");
    expectNumberEqual((_8 = mainLocationSummary === null || mainLocationSummary === void 0 ? void 0 : mainLocationSummary.outOfStockSkuCount) !== null && _8 !== void 0 ? _8 : null, 0, "MAIN location summary outOfStockSkuCount");
    expectNumberEqual((_9 = truckLocationSummary === null || truckLocationSummary === void 0 ? void 0 : truckLocationSummary.totalSkus) !== null && _9 !== void 0 ? _9 : null, 1, "TRUCK1 location summary totalSkus");
    expectNumberEqual((_10 = truckLocationSummary === null || truckLocationSummary === void 0 ? void 0 : truckLocationSummary.totalUnits) !== null && _10 !== void 0 ? _10 : null, expectedTruckFinal, "TRUCK1 location summary totalUnits");
    expectNumberEqual((_11 = truckLocationSummary === null || truckLocationSummary === void 0 ? void 0 : truckLocationSummary.totalAvailableUnits) !== null && _11 !== void 0 ? _11 : null, expectedTruckFinal, "TRUCK1 location summary totalAvailableUnits");
    expectNumberEqual((_12 = truckLocationSummary === null || truckLocationSummary === void 0 ? void 0 : truckLocationSummary.inStockSkuCount) !== null && _12 !== void 0 ? _12 : null, 1, "TRUCK1 location summary inStockSkuCount");
    expectNumberEqual((_13 = truckLocationSummary === null || truckLocationSummary === void 0 ? void 0 : truckLocationSummary.lowStockSkuCount) !== null && _13 !== void 0 ? _13 : null, 0, "TRUCK1 location summary lowStockSkuCount");
    expectNumberEqual((_14 = truckLocationSummary === null || truckLocationSummary === void 0 ? void 0 : truckLocationSummary.outOfStockSkuCount) !== null && _14 !== void 0 ? _14 : null, 0, "TRUCK1 location summary outOfStockSkuCount");
    printSection("20) verify recent activity");
    const recentActivity = await readRecentActivity();
    console.log(JSON.stringify(recentActivity, null, 2));
    assert(recentActivity.length >= 3, "Expected at least 3 recent activity records.");
    const activityTypes = recentActivity.map((item) => item.type);
    assert(activityTypes.includes("receive"), "Expected receive activity.");
    assert(activityTypes.includes("move"), "Expected move activity.");
    assert(activityTypes.includes("adjust"), "Expected adjust activity.");
    printSection("21) getProductSummaryList");
    const productSummaryList = await callFunction("getProductSummaryList", {
        workspaceId: WORKSPACE_ID,
        limit: 10,
    });
    console.log(JSON.stringify(productSummaryList, null, 2));
    assert(productSummaryList.items.length >= 1, "Expected at least one product summary item.");
    const summaryItem = productSummaryList.items.find((item) => item.productId === productId);
    assert(summaryItem, "Expected created product in product summary list.");
    expectStringEqual(summaryItem === null || summaryItem === void 0 ? void 0 : summaryItem.sku, SKU, "product summary list sku");
    expectStringEqual(summaryItem === null || summaryItem === void 0 ? void 0 : summaryItem.name, PRODUCT_NAME, "product summary list name");
    expectNumberEqual((_15 = summaryItem === null || summaryItem === void 0 ? void 0 : summaryItem.totalOnHand) !== null && _15 !== void 0 ? _15 : null, expectedMainFinal + expectedTruckFinal, "product summary list totalOnHand");
    expectStringEqual(summaryItem === null || summaryItem === void 0 ? void 0 : summaryItem.stockStatus, "ok", "product summary list stockStatus");
    printSection("22) getLocationSummaryList");
    const locationSummaryList = await callFunction("getLocationSummaryList", {
        workspaceId: WORKSPACE_ID,
        limit: 10,
    });
    console.log(JSON.stringify(locationSummaryList, null, 2));
    expectArrayLength(locationSummaryList.items, 2, "location summary list item count");
    const mainSummaryItem = locationSummaryList.items.find((item) => item.locationId === mainLocationId);
    const truckSummaryItem = locationSummaryList.items.find((item) => item.locationId === truck1LocationId);
    assert(mainSummaryItem, "Expected MAIN in location summary list.");
    assert(truckSummaryItem, "Expected TRUCK1 in location summary list.");
    expectNumberEqual((_16 = mainSummaryItem === null || mainSummaryItem === void 0 ? void 0 : mainSummaryItem.totalUnits) !== null && _16 !== void 0 ? _16 : null, expectedMainFinal, "location summary MAIN totalUnits");
    expectNumberEqual((_17 = truckSummaryItem === null || truckSummaryItem === void 0 ? void 0 : truckSummaryItem.totalUnits) !== null && _17 !== void 0 ? _17 : null, expectedTruckFinal, "location summary TRUCK1 totalUnits");
    printSection("23) getRecentActivityFeed");
    const recentActivityFeed = await callFunction("getRecentActivityFeed", {
        workspaceId: WORKSPACE_ID,
        limit: 10,
    });
    console.log(JSON.stringify(recentActivityFeed, null, 2));
    assert(recentActivityFeed.items.length >= 3, "Expected at least 3 recent activity feed items.");
    expectDescendingCreatedAt(recentActivityFeed.items, "recent activity feed");
    const feedTypes = recentActivityFeed.items.map((item) => item.type);
    assert(feedTypes.includes("receive"), "Expected receive in activity feed.");
    assert(feedTypes.includes("move"), "Expected move in activity feed.");
    assert(feedTypes.includes("adjust"), "Expected adjust in activity feed.");
    printSection("24) getTodaySnapshot");
    const todaySnapshot = await callFunction("getTodaySnapshot", {
        workspaceId: WORKSPACE_ID,
    });
    console.log(JSON.stringify(todaySnapshot, null, 2));
    expectNumberEqual(todaySnapshot.totals.totalProducts, 1, "today snapshot totalProducts");
    expectNumberEqual(todaySnapshot.totals.totalLocations, 2, "today snapshot totalLocations");
    expectNumberEqual(todaySnapshot.totals.totalUnits, expectedMainFinal + expectedTruckFinal, "today snapshot totalUnits");
    expectNumberEqual(todaySnapshot.activity.receiveCount, 1, "today snapshot receiveCount");
    expectNumberEqual(todaySnapshot.activity.moveCount, 1, "today snapshot moveCount");
    expectNumberEqual(todaySnapshot.activity.adjustCount, 1, "today snapshot adjustCount");
    assert(todaySnapshot.recentActivity.length >= 3, "Expected recent activity preview in today snapshot.");
    printSection("Flow complete");
    console.log("All emulator flow checks passed.");
}
main().catch((err) => {
    printSection("Flow failed");
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=runEmulatorFlow.js.map