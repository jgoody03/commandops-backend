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
    async postAdjust(input, postedBy, requestId) {
        var _a;
        if (!input.lines.length) {
            throw new https_1.HttpsError("invalid-argument", "At least one line is required.");
        }
        await this.locationRepo.assertActive(input.workspaceId, input.locationId);
        const hydratedLines = [];
        for (const line of input.lines) {
            if (!Number.isFinite(line.quantityDelta) || line.quantityDelta === 0) {
                throw new https_1.HttpsError("invalid-argument", "Adjustment quantityDelta must be a non-zero number.");
            }
            const product = await this.productRepo.getById(input.workspaceId, line.productId);
            hydratedLines.push(Object.assign({ productId: line.productId, sku: product.sku, quantity: line.quantityDelta, barcode: (_a = line.barcode) !== null && _a !== void 0 ? _a : null }, (line.note ? { note: line.note } : {})));
        }
        const postedAt = firestore_1.Timestamp.now();
        const transactionId = await firestore_1.db.runTransaction(async (tx) => {
            var _a, _b, _c, _d, _e;
            for (const line of hydratedLines) {
                const balance = await this.balanceRepo.getInTransaction(tx, input.workspaceId, input.locationId, line.productId);
                const currentOnHand = (_a = balance === null || balance === void 0 ? void 0 : balance.onHand) !== null && _a !== void 0 ? _a : 0;
                const currentAvailable = (_b = balance === null || balance === void 0 ? void 0 : balance.available) !== null && _b !== void 0 ? _b : 0;
                const nextOnHand = currentOnHand + line.quantity;
                const nextAvailable = currentAvailable + line.quantity;
                if (nextOnHand < 0 || nextAvailable < 0) {
                    throw new https_1.HttpsError("failed-precondition", `Adjustment would make inventory negative for SKU ${line.sku}.`);
                }
            }
            for (const line of hydratedLines) {
                const balance = await this.balanceRepo.getInTransaction(tx, input.workspaceId, input.locationId, line.productId);
                const currentOnHand = (_c = balance === null || balance === void 0 ? void 0 : balance.onHand) !== null && _c !== void 0 ? _c : 0;
                const currentAvailable = (_d = balance === null || balance === void 0 ? void 0 : balance.available) !== null && _d !== void 0 ? _d : 0;
                const nextOnHand = currentOnHand + line.quantity;
                const nextAvailable = currentAvailable + line.quantity;
                this.balanceRepo.setAbsoluteInTransaction(tx, {
                    workspaceId: input.workspaceId,
                    locationId: input.locationId,
                    productId: line.productId,
                    onHand: nextOnHand,
                    available: nextAvailable,
                    transactionAt: postedAt,
                });
            }
            return this.transactionRepo.createInTransaction(tx, input.workspaceId, {
                type: "adjust",
                referenceType: "manual",
                sourceLocationId: null,
                targetLocationId: input.locationId,
                note: (_e = input.note) !== null && _e !== void 0 ? _e : "",
                postedBy,
                postedAt,
                requestId,
            }, hydratedLines.map((line) => {
                var _a;
                return (Object.assign({ productId: line.productId, sku: line.sku, quantity: line.quantity, barcode: (_a = line.barcode) !== null && _a !== void 0 ? _a : null }, (line.note ? { note: line.note } : {})));
            }));
        });
        return {
            ok: true,
            transactionId,
            postedAt: postedAt.toDate().toISOString(),
            lineCount: hydratedLines.length,
            locationId: input.locationId,
        };
    }
    async postMove(input, postedBy, requestId) {
        var _a;
        if (!input.lines.length) {
            throw new https_1.HttpsError("invalid-argument", "At least one line is required.");
        }
        if (input.sourceLocationId === input.targetLocationId) {
            throw new https_1.HttpsError("invalid-argument", "Source and target locations must be different.");
        }
        await this.locationRepo.assertActive(input.workspaceId, input.sourceLocationId);
        await this.locationRepo.assertActive(input.workspaceId, input.targetLocationId);
        const hydratedLines = [];
        for (const line of input.lines) {
            if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
                throw new https_1.HttpsError("invalid-argument", "Move quantity must be greater than zero.");
            }
            const product = await this.productRepo.getById(input.workspaceId, line.productId);
            hydratedLines.push(Object.assign({ productId: line.productId, sku: product.sku, quantity: line.quantity, barcode: (_a = line.barcode) !== null && _a !== void 0 ? _a : null }, (line.note ? { note: line.note } : {})));
        }
        const postedAt = firestore_1.Timestamp.now();
        const transactionId = await firestore_1.db.runTransaction(async (tx) => {
            var _a, _b, _c, _d, _e, _f, _g;
            for (const line of hydratedLines) {
                const sourceBalance = await this.balanceRepo.getInTransaction(tx, input.workspaceId, input.sourceLocationId, line.productId);
                const currentSourceOnHand = (_a = sourceBalance === null || sourceBalance === void 0 ? void 0 : sourceBalance.onHand) !== null && _a !== void 0 ? _a : 0;
                const currentSourceAvailable = (_b = sourceBalance === null || sourceBalance === void 0 ? void 0 : sourceBalance.available) !== null && _b !== void 0 ? _b : 0;
                if (currentSourceOnHand < line.quantity || currentSourceAvailable < line.quantity) {
                    throw new https_1.HttpsError("failed-precondition", `Insufficient inventory for SKU ${line.sku} at source location.`);
                }
            }
            for (const line of hydratedLines) {
                const sourceBalance = await this.balanceRepo.getInTransaction(tx, input.workspaceId, input.sourceLocationId, line.productId);
                const targetBalance = await this.balanceRepo.getInTransaction(tx, input.workspaceId, input.targetLocationId, line.productId);
                const nextSourceOnHand = ((_c = sourceBalance === null || sourceBalance === void 0 ? void 0 : sourceBalance.onHand) !== null && _c !== void 0 ? _c : 0) - line.quantity;
                const nextSourceAvailable = ((_d = sourceBalance === null || sourceBalance === void 0 ? void 0 : sourceBalance.available) !== null && _d !== void 0 ? _d : 0) - line.quantity;
                const nextTargetOnHand = ((_e = targetBalance === null || targetBalance === void 0 ? void 0 : targetBalance.onHand) !== null && _e !== void 0 ? _e : 0) + line.quantity;
                const nextTargetAvailable = ((_f = targetBalance === null || targetBalance === void 0 ? void 0 : targetBalance.available) !== null && _f !== void 0 ? _f : 0) + line.quantity;
                if (nextSourceOnHand < 0 || nextSourceAvailable < 0) {
                    throw new https_1.HttpsError("failed-precondition", `Inventory would go negative for SKU ${line.sku} at source location.`);
                }
                this.balanceRepo.setAbsoluteInTransaction(tx, {
                    workspaceId: input.workspaceId,
                    locationId: input.sourceLocationId,
                    productId: line.productId,
                    onHand: nextSourceOnHand,
                    available: nextSourceAvailable,
                    transactionAt: postedAt,
                });
                this.balanceRepo.setAbsoluteInTransaction(tx, {
                    workspaceId: input.workspaceId,
                    locationId: input.targetLocationId,
                    productId: line.productId,
                    onHand: nextTargetOnHand,
                    available: nextTargetAvailable,
                    transactionAt: postedAt,
                });
            }
            return this.transactionRepo.createInTransaction(tx, input.workspaceId, {
                type: "move",
                referenceType: "manual",
                sourceLocationId: input.sourceLocationId,
                targetLocationId: input.targetLocationId,
                note: (_g = input.note) !== null && _g !== void 0 ? _g : "",
                postedBy,
                postedAt,
                requestId,
            }, hydratedLines.map((line) => {
                var _a;
                return (Object.assign({ productId: line.productId, sku: line.sku, quantity: line.quantity, barcode: (_a = line.barcode) !== null && _a !== void 0 ? _a : null }, (line.note ? { note: line.note } : {})));
            }));
        });
        return {
            ok: true,
            transactionId,
            postedAt: postedAt.toDate().toISOString(),
            lineCount: hydratedLines.length,
            sourceLocationId: input.sourceLocationId,
            targetLocationId: input.targetLocationId,
        };
    }
}
exports.TransactionPostingService = TransactionPostingService;
//# sourceMappingURL=transactionPostingService.js.map