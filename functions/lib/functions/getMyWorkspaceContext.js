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
    const workspacesSnap = await firestore_1.db.collection("workspaces").get();
    for (const workspaceDoc of workspacesSnap.docs) {
        const memberSnap = await workspaceDoc.ref
            .collection("members")
            .doc(uid)
            .get();
        if (memberSnap.exists) {
            const membership = memberSnap.data() || {};
            const workspace = workspaceDoc.data() || {};
            const role = membership.role ||
                membership.type ||
                membership.accessLevel ||
                "admin";
            const defaultLocationId = membership.defaultLocationId ||
                workspace.defaultLocationId ||
                null;
            return {
                workspaceId: workspaceDoc.id,
                memberId: uid,
                role,
                defaultLocationId,
            };
        }
    }
    return {
        workspaceId: null,
        memberId: null,
        role: null,
        defaultLocationId: null,
    };
});
//# sourceMappingURL=getMyWorkspaceContext.js.map