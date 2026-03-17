"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryBalanceRepo = void 0;
const firestore_1 = require("../core/firestore");
const makeBalanceKey_1 = require("../utils/makeBalanceKey");
const buildInventoryBalance_1 = require("../builders/buildInventoryBalance");
class InventoryBalanceRepo {
    getRef(workspaceId, locationId, productId) {
        const key = (0, makeBalanceKey_1.makeBalanceKey)(locationId, productId);
        return (0, firestore_1.balancesCol)(workspaceId).doc(key);
    }
    async get(workspaceId, locationId, productId) {
        const ref = this.getRef(workspaceId, locationId, productId);
        const snap = await ref.get();
        if (!snap.exists)
            return null;
        return Object.assign({ id: snap.id }, snap.data());
    }
    async getInTransaction(tx, workspaceId, locationId, productId) {
        const ref = this.getRef(workspaceId, locationId, productId);
        const snap = await tx.get(ref);
        if (!snap.exists)
            return null;
        return Object.assign({ id: snap.id, ref }, snap.data());
    }
    async listByProduct(workspaceId, productId) {
        const snap = await (0, firestore_1.balancesCol)(workspaceId)
            .where("productId", "==", productId)
            .get();
        return snap.docs.map((doc) => (Object.assign({ id: doc.id }, doc.data())));
    }
    async listByLocation(workspaceId, locationId) {
        const snap = await (0, firestore_1.balancesCol)(workspaceId)
            .where("locationId", "==", locationId)
            .orderBy("nameLower")
            .get();
        return snap.docs.map((doc) => (Object.assign({ id: doc.id }, doc.data())));
    }
    setAbsoluteInTransaction(tx, params) {
        const ref = this.getRef(params.workspaceId, params.location.id, params.product.id);
        const payload = (0, buildInventoryBalance_1.buildInventoryBalance)({
            workspaceId: params.workspaceId,
            location: params.location,
            product: params.product,
            onHand: params.onHand,
            available: params.available,
            transactionAt: params.transactionAt,
        });
        tx.set(ref, payload, { merge: true });
    }
    async incrementOnHand(workspaceId, location, product, delta, transactionAt = firestore_1.Timestamp.now()) {
        const ref = this.getRef(workspaceId, location.id, product.id);
        await ref.firestore.runTransaction(async (tx) => {
            var _a, _b;
            const snap = await tx.get(ref);
            const current = snap.exists
                ? snap.data()
                : null;
            const nextOnHand = ((_a = current === null || current === void 0 ? void 0 : current.onHand) !== null && _a !== void 0 ? _a : 0) + delta;
            const nextAvailable = ((_b = current === null || current === void 0 ? void 0 : current.available) !== null && _b !== void 0 ? _b : 0) + delta;
            if (nextOnHand < 0 || nextAvailable < 0) {
                throw new Error("Insufficient inventory balance.");
            }
            const payload = (0, buildInventoryBalance_1.buildInventoryBalance)({
                existing: current,
                workspaceId,
                location,
                product,
                onHand: nextOnHand,
                available: nextAvailable,
                transactionAt,
            });
            tx.set(ref, payload, { merge: true });
        });
    }
}
exports.InventoryBalanceRepo = InventoryBalanceRepo;
//# sourceMappingURL=inventoryBalanceRepo.js.map