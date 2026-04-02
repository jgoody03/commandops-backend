"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listVendors = void 0;
const https_1 = require("firebase-functions/v2/https");
const auth_1 = require("../core/auth");
const vendorRepo_1 = require("../repositories/vendorRepo");
const vendorRepo = new vendorRepo_1.VendorRepo();
exports.listVendors = (0, https_1.onCall)(async (request) => {
    var _a;
    if (!((_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid)) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required.");
    }
    const workspaceId = String(request.data.workspaceId || "").trim();
    const limit = Number.isFinite(Number(request.data.limit)) && Number(request.data.limit) > 0
        ? Number(request.data.limit)
        : 20;
    if (!workspaceId) {
        throw new https_1.HttpsError("invalid-argument", "workspaceId is required.");
    }
    await (0, auth_1.assertWorkspaceMembership)(workspaceId, request.auth.uid);
    const items = await vendorRepo.list(workspaceId, limit);
    return { items };
});
//# sourceMappingURL=listVendors.js.map