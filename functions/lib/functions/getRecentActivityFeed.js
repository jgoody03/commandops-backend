"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecentActivityFeed = void 0;
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
    const createdAtMs = Number(cursor.createdAtMs);
    const docId = String((_a = cursor.docId) !== null && _a !== void 0 ? _a : "").trim();
    if (!Number.isFinite(createdAtMs) || !docId) {
        throw new https_1.HttpsError("invalid-argument", "cursor is invalid.");
    }
    return {
        createdAtMs: Math.floor(createdAtMs),
        docId,
    };
}
function toResponseItem(id, doc) {
    var _a, _b, _c, _d, _e, _f;
    return {
        id,
        workspaceId: doc.workspaceId,
        type: doc.type,
        productId: (_a = doc.productId) !== null && _a !== void 0 ? _a : null,
        locationId: (_b = doc.locationId) !== null && _b !== void 0 ? _b : null,
        title: doc.title,
        subtitle: (_c = doc.subtitle) !== null && _c !== void 0 ? _c : null,
        actorUserId: (_d = doc.actorUserId) !== null && _d !== void 0 ? _d : null,
        createdAtMs: (_f = (_e = doc.createdAt) === null || _e === void 0 ? void 0 : _e.toMillis()) !== null && _f !== void 0 ? _f : null,
    };
}
exports.getRecentActivityFeed = (0, https_1.onCall)(async (request) => {
    var _a, _b, _c, _d, _e, _f, _g;
    const uid = requireAuth((_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid);
    const workspaceId = parseRequiredString((_b = request.data) === null || _b === void 0 ? void 0 : _b.workspaceId, "workspaceId");
    const limit = parseLimit((_c = request.data) === null || _c === void 0 ? void 0 : _c.limit);
    const cursor = parseCursor((_d = request.data) === null || _d === void 0 ? void 0 : _d.cursor);
    const type = parseOptionalString((_e = request.data) === null || _e === void 0 ? void 0 : _e.type);
    const locationId = parseOptionalString((_f = request.data) === null || _f === void 0 ? void 0 : _f.locationId);
    const productId = parseOptionalString((_g = request.data) === null || _g === void 0 ? void 0 : _g.productId);
    await (0, auth_1.assertWorkspaceMembership)(workspaceId, uid);
    let query = (0, firestore_2.recentActivityCol)(workspaceId)
        .orderBy("createdAt", "desc")
        .orderBy(firestore_1.FieldPath.documentId(), "desc");
    if (type) {
        query = query.where("type", "==", type);
    }
    if (locationId) {
        query = query.where("locationId", "==", locationId);
    }
    if (productId) {
        query = query.where("productId", "==", productId);
    }
    if (cursor) {
        query = query.startAfter(firestore_1.Timestamp.fromMillis(cursor.createdAtMs), cursor.docId);
    }
    const snapshot = await query.limit(limit + 1).get();
    const pageDocs = snapshot.docs.slice(0, limit);
    const hasMore = snapshot.docs.length > limit;
    const items = pageDocs.map((doc) => toResponseItem(doc.id, doc.data()));
    const lastDoc = pageDocs[pageDocs.length - 1];
    const lastItem = lastDoc === null || lastDoc === void 0 ? void 0 : lastDoc.data();
    return {
        items,
        nextCursor: hasMore && lastDoc && (lastItem === null || lastItem === void 0 ? void 0 : lastItem.createdAt)
            ? {
                createdAtMs: lastItem.createdAt.toMillis(),
                docId: lastDoc.id,
            }
            : null,
    };
});
//# sourceMappingURL=getRecentActivityFeed.js.map