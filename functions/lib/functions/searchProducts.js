"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchProducts = void 0;
const https_1 = require("firebase-functions/v2/https");
const auth_1 = require("../core/auth");
const firestore_1 = require("../core/firestore");
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
    return Math.min(normalized, 50);
}
function normalizeSearch(value) {
    return value.trim().toLowerCase();
}
function prefixUpperBound(value) {
    return `${value}\uf8ff`;
}
function toResponseItem(id, product) {
    var _a;
    return {
        id,
        sku: product.sku,
        name: product.name,
        description: product.description,
        primaryBarcode: (_a = product.primaryBarcode) !== null && _a !== void 0 ? _a : null,
        barcodeAliases: Array.isArray(product.barcodeAliases)
            ? product.barcodeAliases
            : [],
        unit: product.unit,
        isActive: product.isActive,
    };
}
function scoreProduct(product, q) {
    var _a;
    const sku = product.sku.toLowerCase();
    const name = product.name.toLowerCase();
    const barcode = ((_a = product.primaryBarcode) !== null && _a !== void 0 ? _a : "").toLowerCase();
    if (sku === q)
        return 100;
    if (barcode === q)
        return 95;
    if (sku.startsWith(q))
        return 90;
    if (name.startsWith(q))
        return 80;
    if (sku.includes(q))
        return 70;
    if (name.includes(q))
        return 60;
    return 0;
}
exports.searchProducts = (0, https_1.onCall)(async (request) => {
    var _a, _b, _c, _d;
    const uid = requireAuth((_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid);
    const workspaceId = parseRequiredString((_b = request.data) === null || _b === void 0 ? void 0 : _b.workspaceId, "workspaceId");
    const rawQuery = parseRequiredString((_c = request.data) === null || _c === void 0 ? void 0 : _c.query, "query");
    const limit = parseLimit((_d = request.data) === null || _d === void 0 ? void 0 : _d.limit);
    const q = normalizeSearch(rawQuery);
    await (0, auth_1.assertWorkspaceMembership)(workspaceId, uid);
    const productsRef = (0, firestore_1.productsCol)(workspaceId);
    const [skuSnap, nameSnap] = await Promise.all([
        productsRef
            .where("skuLower", ">=", q)
            .where("skuLower", "<=", prefixUpperBound(q))
            .limit(limit)
            .get(),
        productsRef
            .where("nameLower", ">=", q)
            .where("nameLower", "<=", prefixUpperBound(q))
            .limit(limit)
            .get(),
    ]);
    const merged = new Map();
    for (const doc of [...skuSnap.docs, ...nameSnap.docs]) {
        const item = toResponseItem(doc.id, doc.data());
        merged.set(doc.id, item);
    }
    const items = Array.from(merged.values())
        .sort((a, b) => {
        const scoreDiff = scoreProduct(b, q) - scoreProduct(a, q);
        if (scoreDiff !== 0)
            return scoreDiff;
        const skuCompare = a.sku.localeCompare(b.sku);
        if (skuCompare !== 0)
            return skuCompare;
        return a.name.localeCompare(b.name);
    })
        .slice(0, limit);
    return { items };
});
//# sourceMappingURL=searchProducts.js.map