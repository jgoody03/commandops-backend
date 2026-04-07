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
        var _a, _b, _c;
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
                price: (_a = product.price) !== null && _a !== void 0 ? _a : null,
            };
        }
        else {
            result = { resolutionStatus: "unresolved" };
        }
        await (0, firestore_1.scanEventsCol)(params.workspaceId).add(Object.assign({ code: params.code, normalizedCode, symbology: (_b = params.symbology) !== null && _b !== void 0 ? _b : null, deviceId: (_c = params.deviceId) !== null && _c !== void 0 ? _c : null, scannedBy: params.uid, scannedAt: firestore_1.Timestamp.now() }, result));
        return result;
    }
}
exports.BarcodeResolutionService = BarcodeResolutionService;
//# sourceMappingURL=barcodeResolutionService.js.map