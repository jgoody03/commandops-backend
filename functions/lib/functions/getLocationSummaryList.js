"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLocationSummaryList = void 0;
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
        return 20;
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
function normalizeQuery(value) {
    if (!value)
        return undefined;
    const normalized = value.trim().toLowerCase();
    return normalized || undefined;
}
function toResponseItem(id, doc) {
    var _a, _b, _c, _d, _e;
    return {
        id,
        workspaceId: doc.workspaceId,
        locationId: doc.locationId,
        locationName: doc.locationName,
        locationCode: (_a = doc.locationCode) !== null && _a !== void 0 ? _a : null,
        totalSkus: doc.totalSkus,
        totalUnits: doc.totalUnits,
        totalAvailableUnits: doc.totalAvailableUnits,
        lowStockSkuCount: doc.lowStockSkuCount,
        outOfStockSkuCount: doc.outOfStockSkuCount,
        inStockSkuCount: doc.inStockSkuCount,
        lastTransactionAtMs: (_c = (_b = doc.lastTransactionAt) === null || _b === void 0 ? void 0 : _b.toMillis()) !== null && _c !== void 0 ? _c : null,
        updatedAtMs: (_e = (_d = doc.updatedAt) === null || _d === void 0 ? void 0 : _d.toMillis()) !== null && _e !== void 0 ? _e : null,
    };
}
function matchesQuery(item, q) {
    var _a;
    if (!q)
        return true;
    return (item.locationName.toLowerCase().includes(q) ||
        ((_a = item.locationCode) !== null && _a !== void 0 ? _a : "").toLowerCase().includes(q));
}
exports.getLocationSummaryList = (0, https_1.onCall)(async (request) => {
    var _a, _b, _c, _d, _e;
    const uid = requireAuth((_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid);
    const workspaceId = parseRequiredString((_b = request.data) === null || _b === void 0 ? void 0 : _b.workspaceId, "workspaceId");
    const limit = parseLimit((_c = request.data) === null || _c === void 0 ? void 0 : _c.limit);
    const cursor = parseCursor((_d = request.data) === null || _d === void 0 ? void 0 : _d.cursor);
    const queryText = normalizeQuery(parseOptionalString((_e = request.data) === null || _e === void 0 ? void 0 : _e.query));
    await (0, auth_1.assertWorkspaceMembership)(workspaceId, uid);
    let query = (0, firestore_2.locationInventorySummaryCol)(workspaceId)
        .orderBy("updatedAt", "desc")
        .orderBy(firestore_1.FieldPath.documentId(), "desc");
    if (cursor) {
        query = query.startAfter(firestore_1.Timestamp.fromMillis(cursor.updatedAtMs), cursor.docId);
    }
    const snapshot = await query.limit(limit + 10).get();
    const filteredDocs = snapshot.docs.filter((doc) => {
        const item = toResponseItem(doc.id, doc.data());
        return matchesQuery(item, queryText);
    });
    const pageDocs = filteredDocs.slice(0, limit);
    const hasMore = filteredDocs.length > limit || snapshot.docs.length > limit;
    const items = pageDocs.map((doc) => toResponseItem(doc.id, doc.data()));
    const lastDoc = pageDocs[pageDocs.length - 1];
    const lastItem = lastDoc === null || lastDoc === void 0 ? void 0 : lastDoc.data();
    return {
        items,
        nextCursor: hasMore && lastDoc && (lastItem === null || lastItem === void 0 ? void 0 : lastItem.updatedAt)
            ? {
                updatedAtMs: lastItem.updatedAt.toMillis(),
                docId: lastDoc.id,
            }
            : null,
    };
});
//# sourceMappingURL=getLocationSummaryList.js.map