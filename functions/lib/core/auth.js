"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertWorkspaceMembership = assertWorkspaceMembership;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("./firestore");
async function assertWorkspaceMembership(workspaceId, uid) {
    const snap = await (0, firestore_1.membersCol)(workspaceId).doc(uid).get();
    if (!snap.exists) {
        throw new https_1.HttpsError("permission-denied", "User is not a member of this workspace.");
    }
}
//# sourceMappingURL=auth.js.map