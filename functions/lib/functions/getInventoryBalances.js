"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInventoryBalances = void 0;
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
function parseOptionalString(value) {
    const parsed = String(value !== null && value !== void 0 ? value : "").trim();
    return parsed || undefined;
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
function toResponseItem(id, balance) {
    var _a, _b, _c, _d;
    return {
        id,
        workspaceId: balance.workspaceId,
        locationId: balance.locationId,
        productId: balance.productId,
        onHand: balance.onHand,
        available: balance.available,
        lastTransactionAtMs: (_b = (_a = balance.lastTransactionAt) === null || _a === void 0 ? void 0 : _a.toMillis()) !== null && _b !== void 0 ? _b : null,
        updatedAtMs: (_d = (_c = balance.updatedAt) === null || _c === void 0 ? void 0 : _c.toMillis()) !== null && _d !== void 0 ? _d : null,
    };
}
exports.getInventoryBalances = (0, https_1.onCall)(async (request) => {
    var _a, _b, _c, _d, _e, _f;
    const uid = requireAuth((_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid);
    const workspaceId = parseRequiredString((_b = request.data) === null || _b === void 0 ? void 0 : _b.workspaceId, "workspaceId");
    const locationId = parseOptionalString((_c = request.data) === null || _c === void 0 ? void 0 : _c.locationId);
    const productId = parseOptionalString((_d = request.data) === null || _d === void 0 ? void 0 : _d.productId);
    const limit = parseLimit((_e = request.data) === null || _e === void 0 ? void 0 : _e.limit);
    const cursor = parseCursor((_f = request.data) === null || _f === void 0 ? void 0 : _f.cursor);
    await (0, auth_1.assertWorkspaceMembership)(workspaceId, uid);
    let query = (0, firestore_2.balancesCol)(workspaceId)
        .orderBy("updatedAt", "desc")
        .orderBy(firestore_1.FieldPath.documentId(), "desc");
    if (locationId) {
        query = query.where("locationId", "==", locationId);
    }
    if (productId) {
        query = query.where("productId", "==", productId);
    }
    if (cursor) {
        query = query.startAfter(firestore_1.Timestamp.fromMillis(cursor.updatedAtMs), cursor.docId);
    }
    const snapshot = await query.limit(limit + 1).get();
    const pageDocs = snapshot.docs.slice(0, limit);
    const hasMore = snapshot.docs.length > limit;
    const items = pageDocs.map((doc) => toResponseItem(doc.id, doc.data()));
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
});
//# sourceMappingURL=getInventoryBalances.js.map