"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionPostingService = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("../core/firestore");
const locationRepo_1 = require("../repositories/locationRepo");
const productRepo_1 = require("../repositories/productRepo");
const inventoryBalanceRepo_1 = require("../repositories/inventoryBalanceRepo");
const inventoryTransactionRepo_1 = require("../repositories/inventoryTransactionRepo");
const productInventorySummaryRepo_1 = require("../repositories/productInventorySummaryRepo");
const locationInventorySummaryRepo_1 = require("../repositories/locationInventorySummaryRepo");
const recentActivityRepo_1 = require("../repositories/recentActivityRepo");
const buildProductInventorySummary_1 = require("../builders/buildProductInventorySummary");
const buildLocationInventorySummary_1 = require("../builders/buildLocationInventorySummary");
const buildRecentActivity_1 = require("../builders/buildRecentActivity");
class TransactionPostingService {
    constructor() {
        this.locationRepo = new locationRepo_1.LocationRepo();
        this.productRepo = new productRepo_1.ProductRepo();
        this.balanceRepo = new inventoryBalanceRepo_1.InventoryBalanceRepo();
        this.transactionRepo = new inventoryTransactionRepo_1.InventoryTransactionRepo();
        this.productSummaryRepo = new productInventorySummaryRepo_1.ProductInventorySummaryRepo();
        this.locationSummaryRepo = new locationInventorySummaryRepo_1.LocationInventorySummaryRepo();
        this.recentActivityRepo = new recentActivityRepo_1.RecentActivityRepo();
    }
    async refreshProductSummaries(workspaceId, productIds) {
        const uniqueProductIds = [...new Set(productIds)];
        for (const productId of uniqueProductIds) {
            const product = await this.productRepo.getById(workspaceId, productId);
            const balances = await this.balanceRepo.listByProduct(workspaceId, productId);
            const summary = (0, buildProductInventorySummary_1.buildProductInventorySummary)({
                workspaceId,
                product,
                balances,
            });
            await this.productSummaryRepo.set(workspaceId, productId, summary);
        }
    }
    async refreshLocationSummary(workspaceId, location) {
        const balances = await this.balanceRepo.listByLocation(workspaceId, location.id);
        const summary = (0, buildLocationInventorySummary_1.buildLocationInventorySummary)({
            workspaceId,
            location,
            balances,
        });
        await this.locationSummaryRepo.set(workspaceId, location.id, summary);
    }
    async postReceive(input, postedBy, requestId) {
        var _a, _b, _c;
        if (!input.lines.length) {
            throw new https_1.HttpsError("invalid-argument", "At least one line is required.");
        }
        const location = await this.locationRepo.assertActive(input.workspaceId, input.locationId);
        const hydratedLines = [];
        for (const line of input.lines) {
            if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
                throw new https_1.HttpsError("invalid-argument", "Receive quantity must be greater than zero.");
            }
            const product = await this.productRepo.getById(input.workspaceId, line.productId);
            hydratedLines.push(Object.assign(Object.assign({ productId: line.productId, sku: product.sku, quantity: line.quantity, unitCost: (_a = line.unitCost) !== null && _a !== void 0 ? _a : null, barcode: (_b = line.barcode) !== null && _b !== void 0 ? _b : null }, (line.note ? { note: line.note } : {})), { product }));
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
            relatedTransactionGroupId: null,
        }, hydratedLines.map((line) => {
            var _a, _b;
            return (Object.assign({ productId: line.productId, sku: line.sku, quantity: line.quantity, unitCost: (_a = line.unitCost) !== null && _a !== void 0 ? _a : null, barcode: (_b = line.barcode) !== null && _b !== void 0 ? _b : null }, (line.note ? { note: line.note } : {})));
        }));
        for (const line of hydratedLines) {
            await this.balanceRepo.incrementOnHand(input.workspaceId, location, line.product, line.quantity, postedAt);
        }
        await this.refreshProductSummaries(input.workspaceId, hydratedLines.map((line) => line.productId));
        await this.refreshLocationSummary(input.workspaceId, location);
        await this.recentActivityRepo.create(input.workspaceId, (0, buildRecentActivity_1.buildRecentActivity)({
            workspaceId: input.workspaceId,
            type: "receive",
            title: `Received ${hydratedLines.length} item${hydratedLines.length === 1 ? "" : "s"}`,
            subtitle: location.name,
            locationId: location.id,
            actorUserId: postedBy,
            createdAt: postedAt,
        }));
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
        const location = await this.locationRepo.assertActive(input.workspaceId, input.locationId);
        const hydratedLines = [];
        for (const line of input.lines) {
            if (!Number.isFinite(line.quantityDelta) || line.quantityDelta === 0) {
                throw new https_1.HttpsError("invalid-argument", "Adjustment quantityDelta must be a non-zero number.");
            }
            const product = await this.productRepo.getById(input.workspaceId, line.productId);
            hydratedLines.push(Object.assign(Object.assign({ productId: line.productId, sku: product.sku, quantity: line.quantityDelta, barcode: (_a = line.barcode) !== null && _a !== void 0 ? _a : null }, (line.note ? { note: line.note } : {})), { product }));
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
                    location,
                    product: line.product,
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
                relatedTransactionGroupId: null,
            }, hydratedLines.map((line) => {
                var _a;
                return (Object.assign({ productId: line.productId, sku: line.sku, quantity: line.quantity, barcode: (_a = line.barcode) !== null && _a !== void 0 ? _a : null }, (line.note ? { note: line.note } : {})));
            }));
        });
        await this.refreshProductSummaries(input.workspaceId, hydratedLines.map((line) => line.productId));
        await this.refreshLocationSummary(input.workspaceId, location);
        await this.recentActivityRepo.create(input.workspaceId, (0, buildRecentActivity_1.buildRecentActivity)({
            workspaceId: input.workspaceId,
            type: "adjust",
            title: `Adjusted ${hydratedLines.length} item${hydratedLines.length === 1 ? "" : "s"}`,
            subtitle: location.name,
            locationId: location.id,
            actorUserId: postedBy,
            createdAt: postedAt,
        }));
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
        const sourceLocation = await this.locationRepo.assertActive(input.workspaceId, input.sourceLocationId);
        const targetLocation = await this.locationRepo.assertActive(input.workspaceId, input.targetLocationId);
        const hydratedLines = [];
        for (const line of input.lines) {
            if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
                throw new https_1.HttpsError("invalid-argument", "Move quantity must be greater than zero.");
            }
            const product = await this.productRepo.getById(input.workspaceId, line.productId);
            hydratedLines.push(Object.assign(Object.assign({ productId: line.productId, sku: product.sku, quantity: line.quantity, barcode: (_a = line.barcode) !== null && _a !== void 0 ? _a : null }, (line.note ? { note: line.note } : {})), { product }));
        }
        const postedAt = firestore_1.Timestamp.now();
        const result = await firestore_1.db.runTransaction(async (tx) => {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            for (const line of hydratedLines) {
                const sourceBalance = await this.balanceRepo.getInTransaction(tx, input.workspaceId, input.sourceLocationId, line.productId);
                const currentSourceOnHand = (_a = sourceBalance === null || sourceBalance === void 0 ? void 0 : sourceBalance.onHand) !== null && _a !== void 0 ? _a : 0;
                const currentSourceAvailable = (_b = sourceBalance === null || sourceBalance === void 0 ? void 0 : sourceBalance.available) !== null && _b !== void 0 ? _b : 0;
                if (currentSourceOnHand < line.quantity ||
                    currentSourceAvailable < line.quantity) {
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
                    location: sourceLocation,
                    product: line.product,
                    onHand: nextSourceOnHand,
                    available: nextSourceAvailable,
                    transactionAt: postedAt,
                });
                this.balanceRepo.setAbsoluteInTransaction(tx, {
                    workspaceId: input.workspaceId,
                    location: targetLocation,
                    product: line.product,
                    onHand: nextTargetOnHand,
                    available: nextTargetAvailable,
                    transactionAt: postedAt,
                });
            }
            const relatedTransactionGroupId = this.transactionRepo.newId(input.workspaceId);
            const moveOutTransactionId = this.transactionRepo.createInTransaction(tx, input.workspaceId, {
                type: "move_out",
                referenceType: "manual",
                sourceLocationId: input.sourceLocationId,
                targetLocationId: input.targetLocationId,
                note: (_g = input.note) !== null && _g !== void 0 ? _g : "",
                postedBy,
                postedAt,
                requestId,
                relatedTransactionGroupId,
            }, hydratedLines.map((line) => {
                var _a;
                return (Object.assign({ productId: line.productId, sku: line.sku, quantity: line.quantity, barcode: (_a = line.barcode) !== null && _a !== void 0 ? _a : null }, (line.note ? { note: line.note } : {})));
            }));
            const moveInTransactionId = this.transactionRepo.createInTransaction(tx, input.workspaceId, {
                type: "move_in",
                referenceType: "manual",
                sourceLocationId: input.sourceLocationId,
                targetLocationId: input.targetLocationId,
                note: (_h = input.note) !== null && _h !== void 0 ? _h : "",
                postedBy,
                postedAt,
                requestId,
                relatedTransactionGroupId,
            }, hydratedLines.map((line) => {
                var _a;
                return (Object.assign({ productId: line.productId, sku: line.sku, quantity: line.quantity, barcode: (_a = line.barcode) !== null && _a !== void 0 ? _a : null }, (line.note ? { note: line.note } : {})));
            }));
            return {
                relatedTransactionGroupId,
                moveOutTransactionId,
                moveInTransactionId,
            };
        });
        await this.refreshProductSummaries(input.workspaceId, hydratedLines.map((line) => line.productId));
        await this.refreshLocationSummary(input.workspaceId, sourceLocation);
        await this.refreshLocationSummary(input.workspaceId, targetLocation);
        await this.recentActivityRepo.create(input.workspaceId, (0, buildRecentActivity_1.buildRecentActivity)({
            workspaceId: input.workspaceId,
            type: "move",
            title: `Moved ${hydratedLines.length} item${hydratedLines.length === 1 ? "" : "s"}`,
            subtitle: `${sourceLocation.name} → ${targetLocation.name}`,
            locationId: targetLocation.id,
            actorUserId: postedBy,
            createdAt: postedAt,
        }));
        return Object.assign(Object.assign({ ok: true }, result), { postedAt: postedAt.toDate().toISOString(), lineCount: hydratedLines.length, sourceLocationId: input.sourceLocationId, targetLocationId: input.targetLocationId });
    }
}
exports.TransactionPostingService = TransactionPostingService;
//# sourceMappingURL=transactionPostingService.js.map