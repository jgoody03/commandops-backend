"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyWorkspaceContext = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("../core/firestore");
exports.getMyWorkspaceContext = (0, https_1.onCall)(async (request) => {
    var _a;
    if (!((_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid)) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required.");
    }
    const uid = request.auth.uid;
    const userSnap = await firestore_1.db.collection("users").doc(uid).get();
    if (!userSnap.exists) {
        return {
            workspaceId: null,
            memberId: null,
            role: null,
            defaultLocationId: null,
            onboarding: {
                completed: false,
                step: "welcome",
            },
        };
    }
    const user = userSnap.data() || {};
    const workspaceId = String(user.activeWorkspaceId || "").trim();
    if (!workspaceId) {
        return {
            workspaceId: null,
            memberId: null,
            role: null,
            defaultLocationId: null,
            onboarding: {
                completed: false,
                step: "welcome",
            },
        };
    }
    const [workspaceSnap, memberSnap] = await Promise.all([
        firestore_1.db.collection("workspaces").doc(workspaceId).get(),
        firestore_1.db.collection("workspaces").doc(workspaceId).collection("members").doc(uid).get(),
    ]);
    if (!workspaceSnap.exists || !memberSnap.exists) {
        return {
            workspaceId: null,
            memberId: null,
            role: null,
            defaultLocationId: null,
            onboarding: {
                completed: false,
                step: "welcome",
            },
        };
    }
    const workspace = workspaceSnap.data() || {};
    const membership = memberSnap.data() || {};
    const onboarding = workspace.onboarding || {};
    const role = membership.role ||
        membership.type ||
        membership.accessLevel ||
        "admin";
    const defaultLocationId = membership.defaultLocationId ||
        workspace.defaultLocationId ||
        null;
    return {
        workspaceId,
        memberId: uid,
        role,
        defaultLocationId,
        onboarding: {
            completed: Boolean(onboarding.completed),
            step: onboarding.step || "welcome",
        },
    };
});
//# sourceMappingURL=getMyWorkspaceContext.js.map