"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildRecentActivity = buildRecentActivity;
const firestore_1 = require("firebase-admin/firestore");
function buildRecentActivity(params) {
    var _a, _b, _c, _d, _e;
    return {
        workspaceId: params.workspaceId,
        type: params.type,
        title: params.title,
        subtitle: (_a = params.subtitle) !== null && _a !== void 0 ? _a : null,
        productId: (_b = params.productId) !== null && _b !== void 0 ? _b : null,
        locationId: (_c = params.locationId) !== null && _c !== void 0 ? _c : null,
        actorUserId: (_d = params.actorUserId) !== null && _d !== void 0 ? _d : null,
        createdAt: (_e = params.createdAt) !== null && _e !== void 0 ? _e : firestore_1.Timestamp.now(),
    };
}
//# sourceMappingURL=buildRecentActivity.js.map