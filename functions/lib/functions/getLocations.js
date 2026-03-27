"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLocations = void 0;
const https_1 = require("firebase-functions/v2/https");
const auth_1 = require("../core/auth");
const firestore_1 = require("../core/firestore");
exports.getLocations = (0, https_1.onCall)(async (request) => {
    var _a, _b;
    if (!((_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid)) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required.");
    }
    const workspaceId = String(((_b = request.data) === null || _b === void 0 ? void 0 : _b.workspaceId) || "").trim();
    if (!workspaceId) {
        throw new https_1.HttpsError("invalid-argument", "workspaceId is required.");
    }
    await (0, auth_1.assertWorkspaceMembership)(workspaceId, request.auth.uid);
    const snap = await (0, firestore_1.locationsCol)(workspaceId)
        .orderBy("name", "asc")
        .get();
    return {
        items: snap.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name,
                code: data.code,
                type: data.type,
                isActive: data.isActive,
            };
        }),
    };
});
//# sourceMappingURL=getLocations.js.map