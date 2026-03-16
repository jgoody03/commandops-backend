"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryBalanceRepo = void 0;
const firestore_1 = require("../core/firestore");
const makeBalanceKey_1 = require("../utils/makeBalanceKey");
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
    setAbsoluteInTransaction(tx, params) {
        const ref = this.getRef(params.workspaceId, params.locationId, params.productId);
        const payload = {
            workspaceId: params.workspaceId,
            locationId: params.locationId,
            productId: params.productId,
            onHand: params.onHand,
            hasStock: params.onHand > 0,
            available: params.available,
            lastTransactionAt: params.transactionAt,
            updatedAt: firestore_1.Timestamp.now(),
        };
        tx.set(ref, payload, { merge: true });
    }
    async incrementOnHand(workspaceId, locationId, productId, delta, transactionAt = firestore_1.Timestamp.now()) {
        const ref = this.getRef(workspaceId, locationId, productId);
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
            const payload = {
                workspaceId,
                locationId,
                productId,
                hasStock: nextOnHand > 0,
                onHand: nextOnHand,
                available: nextAvailable,
                lastTransactionAt: transactionAt,
                updatedAt: firestore_1.Timestamp.now(),
            };
            tx.set(ref, payload, { merge: true });
        });
    }
}
exports.InventoryBalanceRepo = InventoryBalanceRepo;
//# sourceMappingURL=inventoryBalanceRepo.js.map