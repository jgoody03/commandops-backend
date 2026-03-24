"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLocationOptions = void 0;
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
function toResponseItem(id, doc) {
    var _a, _b, _c, _d, _e;
    return {
        locationId: (_a = doc.locationId) !== null && _a !== void 0 ? _a : id,
        locationName: (_c = (_b = doc.name) !== null && _b !== void 0 ? _b : doc.locationName) !== null && _c !== void 0 ? _c : "Unnamed Location",
        locationCode: (_e = (_d = doc.code) !== null && _d !== void 0 ? _d : doc.locationCode) !== null && _e !== void 0 ? _e : null,
        isDefault: Boolean(doc.isDefault),
    };
}
exports.getLocationOptions = (0, https_1.onCall)(async (request) => {
    var _a, _b;
    const uid = requireAuth((_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid);
    const workspaceId = parseRequiredString((_b = request.data) === null || _b === void 0 ? void 0 : _b.workspaceId, "workspaceId");
    await (0, auth_1.assertWorkspaceMembership)(workspaceId, uid);
    const snapshot = await (0, firestore_1.locationsCol)(workspaceId).get();
    const items = snapshot.docs
        .map((doc) => toResponseItem(doc.id, doc.data()))
        .sort((a, b) => {
        if (a.isDefault !== b.isDefault) {
            return a.isDefault ? -1 : 1;
        }
        return a.locationName.localeCompare(b.locationName);
    });
    return {
        items,
    };
});
//# sourceMappingURL=getLocationOptions.js.map