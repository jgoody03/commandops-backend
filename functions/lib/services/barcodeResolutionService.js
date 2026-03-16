"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BarcodeResolutionService = void 0;
const firestore_1 = require("../core/firestore");
const productRepo_1 = require("../repositories/productRepo");
const barcodeRepo_1 = require("../repositories/barcodeRepo");
const normalizeBarcode_1 = require("../utils/normalizeBarcode");
class BarcodeResolutionService {
    constructor() {
        this.productRepo = new productRepo_1.ProductRepo();
        this.barcodeRepo = new barcodeRepo_1.BarcodeRepo();
    }
    async resolve(params) {
        var _a, _b;
        const normalizedCode = (0, normalizeBarcode_1.normalizeBarcode)(params.code);
        const barcodeHit = await this.barcodeRepo.resolve(params.workspaceId, normalizedCode);
        let result;
        if (barcodeHit) {
            const product = await this.productRepo.getById(params.workspaceId, String(barcodeHit.productId));
            result = {
                resolutionStatus: "resolved",
                productId: String(barcodeHit.productId),
                sku: product.sku,
                productName: product.name,
            };
        }
        else {
            result = { resolutionStatus: "unresolved" };
        }
        await (0, firestore_1.scanEventsCol)(params.workspaceId).add(Object.assign({ code: params.code, normalizedCode, symbology: (_a = params.symbology) !== null && _a !== void 0 ? _a : null, deviceId: (_b = params.deviceId) !== null && _b !== void 0 ? _b : null, scannedBy: params.uid, scannedAt: firestore_1.Timestamp.now() }, result));
        return result;
    }
}
exports.BarcodeResolutionService = BarcodeResolutionService;
//# sourceMappingURL=barcodeResolutionService.js.map