"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bootstrapWorkspace = void 0;
const https_1 = require("firebase-functions/v2/https");
const workspaceBootstrapService_1 = require("../services/workspaceBootstrapService");
const service = new workspaceBootstrapService_1.WorkspaceBootstrapService();
exports.bootstrapWorkspace = (0, https_1.onCall)(async (request) => {
    var _a;
    if (!((_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid)) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required.");
    }
    const workspaceId = String(request.data.workspaceId || "").trim();
    const workspaceName = String(request.data.workspaceName || "").trim();
    const phoneNumber = String(request.data.phoneNumber || "").trim();
    const businessType = String(request.data.businessType || "").trim();
    const expectedLocationCount = String(request.data.expectedLocationCount || "").trim();
    const setupPreference = String(request.data.setupPreference || "").trim();
    if (!workspaceId || !workspaceName) {
        throw new https_1.HttpsError("invalid-argument", "workspaceId and workspaceName are required.");
    }
    return service.bootstrap({
        workspaceId,
        workspaceName,
        ownerUid: request.auth.uid,
        ownerEmail: request.auth.token.email,
        ownerDisplayName: request.auth.token.name,
        phoneNumber: phoneNumber || undefined,
        businessType: businessType || undefined,
        expectedLocationCount: expectedLocationCount || undefined,
        setupPreference: setupPreference === "device_later" ? "device_later" : "start_now",
    });
});
//# sourceMappingURL=bootstrapWorkspace.js.map