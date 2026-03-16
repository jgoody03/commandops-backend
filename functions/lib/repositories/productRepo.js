"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductRepo = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("../core/firestore");
class ProductRepo {
    async create(workspaceId, input) {
        var _a, _b, _c, _d;
        const now = firestore_1.Timestamp.now();
        const ref = (0, firestore_1.productsCol)(workspaceId).doc();
        const sku = input.sku.trim().toUpperCase();
        const existing = await (0, firestore_1.productsCol)(workspaceId)
            .where("sku", "==", sku)
            .limit(1)
            .get();
        if (!existing.empty) {
            throw new https_1.HttpsError("already-exists", "SKU already exists.");
        }
        const doc = {
            sku,
            name: input.name.trim(),
            description: ((_a = input.description) === null || _a === void 0 ? void 0 : _a.trim()) || "",
            primaryBarcode: (_b = input.primaryBarcode) !== null && _b !== void 0 ? _b : null,
            barcodeAliases: (_c = input.barcodeAliases) !== null && _c !== void 0 ? _c : [],
            unit: (_d = input.unit) !== null && _d !== void 0 ? _d : "each",
            isActive: true,
            createdAt: now,
            updatedAt: now,
        };
        await ref.set(doc);
        return Object.assign({ id: ref.id }, doc);
    }
    async getById(workspaceId, productId) {
        const snap = await (0, firestore_1.productsCol)(workspaceId).doc(productId).get();
        if (!snap.exists) {
            throw new https_1.HttpsError("not-found", "Product not found.");
        }
        return Object.assign({ id: snap.id }, snap.data());
    }
    async getBySku(workspaceId, sku) {
        const normalized = sku.trim().toUpperCase();
        const q = await (0, firestore_1.productsCol)(workspaceId)
            .where("sku", "==", normalized)
            .limit(1)
            .get();
        if (q.empty)
            return null;
        const doc = q.docs[0];
        return Object.assign({ id: doc.id }, doc.data());
    }
}
exports.ProductRepo = ProductRepo;
//# sourceMappingURL=productRepo.js.map