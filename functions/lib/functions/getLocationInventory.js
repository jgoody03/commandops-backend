"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLocationInventory = void 0;
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const auth_1 = require("../core/auth");
const firestore_2 = require("../core/firestore");
function requireAuth(uid) {
    if (!uid) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required.");
    }
    return uid;
}
function parseRequiredString(value, fieldName) {
    const parsed = String(value !== null && value !== void 0 ? value : "").trim();
    if (!parsed) {
        throw new https_1.HttpsError("invalid-argument", `${fieldName} is required.`);
    }
    return parsed;
}
function parseLimit(value) {
    if (value == null) {
        return 50;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        throw new https_1.HttpsError("invalid-argument", "limit must be a valid number.");
    }
    const normalized = Math.floor(parsed);
    if (normalized <= 0) {
        throw new https_1.HttpsError("invalid-argument", "limit must be greater than 0.");
    }
    return Math.min(normalized, 100);
}
function parseCursor(value) {
    var _a;
    if (value == null) {
        return null;
    }
    if (typeof value !== "object") {
        throw new https_1.HttpsError("invalid-argument", "cursor must be an object.");
    }
    const cursor = value;
    const updatedAtMs = Number(cursor.updatedAtMs);
    const docId = String((_a = cursor.docId) !== null && _a !== void 0 ? _a : "").trim();
    if (!Number.isFinite(updatedAtMs) || !docId) {
        throw new https_1.HttpsError("invalid-argument", "cursor is invalid.");
    }
    return {
        updatedAtMs: Math.floor(updatedAtMs),
        docId,
    };
}
async function loadProductsById(workspaceId, productIds) {
    const uniqueIds = Array.from(new Set(productIds)).filter(Boolean);
    const results = new Map();
    if (!uniqueIds.length) {
        return results;
    }
    for (let i = 0; i < uniqueIds.length; i += 10) {
        const chunk = uniqueIds.slice(i, i + 10);
        const snap = await (0, firestore_2.productsCol)(workspaceId)
            .where(firestore_1.FieldPath.documentId(), "in", chunk)
            .get();
        for (const doc of snap.docs) {
            results.set(doc.id, doc.data());
        }
    }
    return results;
}
exports.getLocationInventory = (0, https_1.onCall)(async (request) => {
    var _a, _b, _c, _d, _e;
    try {
        const uid = requireAuth((_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid);
        const workspaceId = parseRequiredString((_b = request.data) === null || _b === void 0 ? void 0 : _b.workspaceId, "workspaceId");
        const locationId = parseRequiredString((_c = request.data) === null || _c === void 0 ? void 0 : _c.locationId, "locationId");
        const limit = parseLimit((_d = request.data) === null || _d === void 0 ? void 0 : _d.limit);
        const cursor = parseCursor((_e = request.data) === null || _e === void 0 ? void 0 : _e.cursor);
        await (0, auth_1.assertWorkspaceMembership)(workspaceId, uid);
        let query = (0, firestore_2.balancesCol)(workspaceId)
            .where("locationId", "==", locationId)
            .orderBy("updatedAt", "desc")
            .orderBy(firestore_1.FieldPath.documentId(), "desc");
        if (cursor) {
            query = query.startAfter(firestore_1.Timestamp.fromMillis(cursor.updatedAtMs), cursor.docId);
        }
        const snapshot = await query.limit(limit + 1).get();
        const pageDocs = snapshot.docs.slice(0, limit);
        const hasMore = snapshot.docs.length > limit;
        const balances = pageDocs.map((doc) => (Object.assign({ id: doc.id }, doc.data())));
        const productMap = await loadProductsById(workspaceId, balances.map((balance) => balance.productId));
        const items = balances.map((balance) => {
            var _a, _b, _c, _d, _e;
            const product = productMap.get(balance.productId);
            return {
                id: balance.id,
                workspaceId: balance.workspaceId,
                locationId: balance.locationId,
                productId: balance.productId,
                onHand: balance.onHand,
                available: balance.available,
                lastTransactionAtMs: (_b = (_a = balance.lastTransactionAt) === null || _a === void 0 ? void 0 : _a.toMillis()) !== null && _b !== void 0 ? _b : null,
                updatedAtMs: (_d = (_c = balance.updatedAt) === null || _c === void 0 ? void 0 : _c.toMillis()) !== null && _d !== void 0 ? _d : null,
                product: product
                    ? {
                        id: balance.productId,
                        sku: product.sku,
                        name: product.name,
                        description: product.description,
                        primaryBarcode: (_e = product.primaryBarcode) !== null && _e !== void 0 ? _e : null,
                        barcodeAliases: Array.isArray(product.barcodeAliases)
                            ? product.barcodeAliases
                            : [],
                        unit: product.unit,
                        isActive: product.isActive,
                    }
                    : null,
            };
        });
        const lastDoc = pageDocs[pageDocs.length - 1];
        const lastBalance = lastDoc === null || lastDoc === void 0 ? void 0 : lastDoc.data();
        return {
            items,
            nextCursor: hasMore && lastDoc && (lastBalance === null || lastBalance === void 0 ? void 0 : lastBalance.updatedAt)
                ? {
                    updatedAtMs: lastBalance.updatedAt.toMillis(),
                    docId: lastDoc.id,
                }
                : null,
        };
    }
    catch (error) {
        console.error("someCallable failed", error);
        throw new https_1.HttpsError("internal", error instanceof Error ? error.message : "someCallable failed.");
    }
});
//# sourceMappingURL=getLocationInventory.js.map