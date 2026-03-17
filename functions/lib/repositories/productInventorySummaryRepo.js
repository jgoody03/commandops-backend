"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductInventorySummaryRepo = void 0;
const firestore_1 = require("../core/firestore");
class ProductInventorySummaryRepo {
    getRef(workspaceId, productId) {
        return (0, firestore_1.productInventorySummaryCol)(workspaceId).doc(productId);
    }
    async get(workspaceId, productId) {
        const ref = this.getRef(workspaceId, productId);
        const snap = await ref.get();
        if (!snap.exists)
            return null;
        return Object.assign({ id: snap.id }, snap.data());
    }
    async set(workspaceId, productId, doc) {
        await this.getRef(workspaceId, productId).set(doc, { merge: true });
    }
}
exports.ProductInventorySummaryRepo = ProductInventorySummaryRepo;
//# sourceMappingURL=productInventorySummaryRepo.js.map