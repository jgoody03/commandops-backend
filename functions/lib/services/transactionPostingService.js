"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionPostingService = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("../core/firestore");
const locationRepo_1 = require("../repositories/locationRepo");
const productRepo_1 = require("../repositories/productRepo");
const inventoryBalanceRepo_1 = require("../repositories/inventoryBalanceRepo");
const inventoryTransactionRepo_1 = require("../repositories/inventoryTransactionRepo");
class TransactionPostingService {
    constructor() {
        this.locationRepo = new locationRepo_1.LocationRepo();
        this.productRepo = new productRepo_1.ProductRepo();
        this.balanceRepo = new inventoryBalanceRepo_1.InventoryBalanceRepo();
        this.transactionRepo = new inventoryTransactionRepo_1.InventoryTransactionRepo();
    }
    async postReceive(input, postedBy, requestId) {
        var _a, _b, _c;
        if (!input.lines.length) {
            throw new https_1.HttpsError("invalid-argument", "At least one line is required.");
        }
        await this.locationRepo.assertActive(input.workspaceId, input.locationId);
        const hydratedLines = [];
        for (const line of input.lines) {
            if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
                throw new https_1.HttpsError("invalid-argument", "Receive quantity must be greater than zero.");
            }
            const product = await this.productRepo.getById(input.workspaceId, line.productId);
            hydratedLines.push(Object.assign({ productId: line.productId, sku: product.sku, quantity: line.quantity, unitCost: (_a = line.unitCost) !== null && _a !== void 0 ? _a : null, barcode: (_b = line.barcode) !== null && _b !== void 0 ? _b : null }, (line.note ? { note: line.note } : {})));
        }
        const postedAt = firestore_1.Timestamp.now();
        const transactionId = await this.transactionRepo.create(input.workspaceId, {
            type: "receive",
            referenceType: "manual",
            sourceLocationId: null,
            targetLocationId: input.locationId,
            note: (_c = input.note) !== null && _c !== void 0 ? _c : "",
            postedBy,
            postedAt,
            requestId,
        }, hydratedLines);
        for (const line of hydratedLines) {
            await this.balanceRepo.incrementOnHand(input.workspaceId, input.locationId, line.productId, line.quantity, postedAt);
        }
        return {
            ok: true,
            transactionId,
            postedAt: postedAt.toDate().toISOString(),
            lineCount: hydratedLines.length,
        };
    }
}
exports.TransactionPostingService = TransactionPostingService;
//# sourceMappingURL=transactionPostingService.js.map