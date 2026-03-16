"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryTransactionRepo = void 0;
const firestore_1 = require("../core/firestore");
class InventoryTransactionRepo {
    async create(workspaceId, header, lines) {
        const ref = (0, firestore_1.transactionsCol)(workspaceId).doc();
        const now = firestore_1.Timestamp.now();
        await ref.set(Object.assign(Object.assign({}, header), { createdAt: now }));
        const batch = ref.firestore.batch();
        lines.forEach((line) => {
            const lineRef = ref.collection("lines").doc();
            batch.set(lineRef, line);
        });
        await batch.commit();
        return ref.id;
    }
}
exports.InventoryTransactionRepo = InventoryTransactionRepo;
//# sourceMappingURL=inventoryTransactionRepo.js.map