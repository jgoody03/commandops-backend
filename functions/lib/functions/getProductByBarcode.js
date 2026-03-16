"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProductByBarcode = void 0;
const https_1 = require("firebase-functions/v2/https");
const auth_1 = require("../core/auth");
const firestore_1 = require("../core/firestore");
function requireAuth(uid) {
    if (!uid) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required.");
    }
    return uid;
}
function parseRequiredString(value, fieldName) {
    const parsed = String(value !== null && value !== void 0 ? value : "").trim();
    if (!parsed) {
        throw new https_1.HttpsError("invalid-argument", `${fieldName} is required.`);
    }
    return parsed;
}
exports.getProductByBarcode = (0, https_1.onCall)(async (request) => {
    var _a, _b, _c, _d;
    const uid = requireAuth((_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid);
    const workspaceId = parseRequiredString((_b = request.data) === null || _b === void 0 ? void 0 : _b.workspaceId, "workspaceId");
    const barcode = parseRequiredString((_c = request.data) === null || _c === void 0 ? void 0 : _c.barcode, "barcode");
    await (0, auth_1.assertWorkspaceMembership)(workspaceId, uid);
    const barcodeRef = (0, firestore_1.barcodeIndexCol)(workspaceId).doc(barcode);
    const barcodeSnap = await barcodeRef.get();
    if (!barcodeSnap.exists) {
        return {
            found: false,
            product: null,
        };
    }
    const barcodeData = barcodeSnap.data();
    const productId = String(barcodeData.productId || "").trim();
    if (!productId) {
        throw new https_1.HttpsError("data-loss", `Barcode index entry ${barcode} is missing productId.`);
    }
    const productRef = (0, firestore_1.productsCol)(workspaceId).doc(productId);
    const productSnap = await productRef.get();
    if (!productSnap.exists) {
        throw new https_1.HttpsError("not-found", `Product ${productId} referenced by barcode ${barcode} was not found.`);
    }
    const product = productSnap.data();
    return {
        found: true,
        product: {
            id: productSnap.id,
            sku: product.sku,
            name: product.name,
            description: product.description,
            primaryBarcode: (_d = product.primaryBarcode) !== null && _d !== void 0 ? _d : null,
            barcodeAliases: Array.isArray(product.barcodeAliases)
                ? product.barcodeAliases
                : [],
            unit: product.unit,
            isActive: product.isActive,
        },
    };
});
//# sourceMappingURL=getProductByBarcode.js.map