"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.quickCreateProduct = void 0;
const https_1 = require("firebase-functions/v2/https");
const auth_1 = require("../core/auth");
const productRepo_1 = require("../repositories/productRepo");
const barcodeRepo_1 = require("../repositories/barcodeRepo");
const productRepo = new productRepo_1.ProductRepo();
const barcodeRepo = new barcodeRepo_1.BarcodeRepo();
exports.quickCreateProduct = (0, https_1.onCall)(async (request) => {
    var _a;
    if (!((_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid)) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required.");
    }
    const workspaceId = String(request.data.workspaceId || "").trim();
    const sku = String(request.data.sku || "").trim();
    const name = String(request.data.name || "").trim();
    const primaryBarcode = request.data.primaryBarcode
        ? String(request.data.primaryBarcode).trim()
        : null;
    if (!workspaceId || !sku || !name) {
        throw new https_1.HttpsError("invalid-argument", "workspaceId, sku, and name are required.");
    }
    await (0, auth_1.assertWorkspaceMembership)(workspaceId, request.auth.uid);
    const product = await productRepo.create(workspaceId, {
        sku,
        name,
        primaryBarcode,
        unit: "each",
    });
    if (primaryBarcode) {
        await barcodeRepo.upsert(workspaceId, primaryBarcode, product.id, product.sku);
    }
    return {
        ok: true,
        product,
    };
});
//# sourceMappingURL=quickCreateProduct.js.map