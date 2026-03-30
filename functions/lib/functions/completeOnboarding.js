"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.completeOnboarding = void 0;
const https_1 = require("firebase-functions/v2/https");
const auth_1 = require("../core/auth");
const firestore_1 = require("../core/firestore");
exports.completeOnboarding = (0, https_1.onCall)(async (request) => {
    var _a, _b;
    if (!((_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid)) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required.");
    }
    const workspaceId = String(((_b = request.data) === null || _b === void 0 ? void 0 : _b.workspaceId) || "").trim();
    if (!workspaceId) {
        throw new https_1.HttpsError("invalid-argument", "workspaceId is required.");
    }
    await (0, auth_1.assertWorkspaceMembership)(workspaceId, request.auth.uid);
    await (0, firestore_1.workspaceRef)(workspaceId).set({
        onboarding: {
            completed: true,
            step: "complete",
            completedAt: firestore_1.Timestamp.now(),
        },
        updatedAt: firestore_1.Timestamp.now(),
    }, { merge: true });
    return { ok: true };
});
//# sourceMappingURL=completeOnboarding.js.map