"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveScanCode = void 0;
const https_1 = require("firebase-functions/v2/https");
const auth_1 = require("../core/auth");
const barcodeResolutionService_1 = require("../services/barcodeResolutionService");
const service = new barcodeResolutionService_1.BarcodeResolutionService();
exports.resolveScanCode = (0, https_1.onCall)(async (request) => {
    var _a;
    if (!((_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid)) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required.");
    }
    const workspaceId = String(request.data.workspaceId || "").trim();
    const code = String(request.data.code || "").trim();
    if (!workspaceId || !code) {
        throw new https_1.HttpsError("invalid-argument", "workspaceId and code are required.");
    }
    await (0, auth_1.assertWorkspaceMembership)(workspaceId, request.auth.uid);
    return service.resolve({
        workspaceId,
        code,
        uid: request.auth.uid,
        deviceId: request.data.deviceId ? String(request.data.deviceId) : undefined,
        symbology: request.data.symbology ? String(request.data.symbology) : undefined,
    });
});
//# sourceMappingURL=resolveScanCode.js.map