"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BarcodeRepo = void 0;
const firestore_1 = require("../core/firestore");
const normalizeBarcode_1 = require("../utils/normalizeBarcode");
class BarcodeRepo {
    async upsert(workspaceId, barcode, productId, sku) {
        const normalized = (0, normalizeBarcode_1.normalizeBarcode)(barcode);
        const now = firestore_1.Timestamp.now();
        await (0, firestore_1.barcodeIndexCol)(workspaceId).doc(normalized).set({
            barcode,
            normalizedBarcode: normalized,
            productId,
            sku,
            createdAt: now,
            updatedAt: now,
        }, { merge: true });
    }
    async resolve(workspaceId, barcode) {
        const normalized = (0, normalizeBarcode_1.normalizeBarcode)(barcode);
        const snap = await (0, firestore_1.barcodeIndexCol)(workspaceId).doc(normalized).get();
        if (!snap.exists) {
            return null;
        }
        return Object.assign({ id: snap.id }, snap.data());
    }
}
exports.BarcodeRepo = BarcodeRepo;
//# sourceMappingURL=barcodeRepo.js.map