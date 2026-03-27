"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMoveSuggestions = void 0;
const https_1 = require("firebase-functions/v2/https");
const auth_1 = require("../core/auth");
const firestore_1 = require("../core/firestore");
exports.getMoveSuggestions = (0, https_1.onCall)(async (request) => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const uid = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required.");
    }
    const workspaceId = String(((_b = request.data) === null || _b === void 0 ? void 0 : _b.workspaceId) || "").trim();
    const productId = String(((_c = request.data) === null || _c === void 0 ? void 0 : _c.productId) || "").trim();
    if (!workspaceId || !productId) {
        throw new https_1.HttpsError("invalid-argument", "workspaceId and productId are required.");
    }
    await (0, auth_1.assertWorkspaceMembership)(workspaceId, uid);
    const balancesSnap = await (0, firestore_1.balancesCol)(workspaceId)
        .where("productId", "==", productId)
        .get();
    if (balancesSnap.empty) {
        return {
            sourceLocationId: null,
            targetLocationId: null,
            reason: "No inventory data available.",
        };
    }
    const balances = balancesSnap.docs.map((d) => d.data());
    // Source = highest available
    const sourceCandidates = balances
        .filter((b) => { var _a; return ((_a = b.available) !== null && _a !== void 0 ? _a : 0) > 0; })
        .sort((a, b) => { var _a, _b; return ((_a = b.available) !== null && _a !== void 0 ? _a : 0) - ((_b = a.available) !== null && _b !== void 0 ? _b : 0); });
    // Target = lowest available
    const targetCandidates = [...balances].sort((a, b) => { var _a, _b; return ((_a = a.available) !== null && _a !== void 0 ? _a : 0) - ((_b = b.available) !== null && _b !== void 0 ? _b : 0); });
    // Pick source
    const source = (_d = sourceCandidates[0]) !== null && _d !== void 0 ? _d : null;
    // Pick target (must be different from source)
    let finalTarget = null;
    if (source) {
        finalTarget =
            (_e = targetCandidates.find((b) => b.locationId !== source.locationId)) !== null && _e !== void 0 ? _e : null;
    }
    else {
        finalTarget = (_f = targetCandidates[0]) !== null && _f !== void 0 ? _f : null;
    }
    return {
        sourceLocationId: (_g = source === null || source === void 0 ? void 0 : source.locationId) !== null && _g !== void 0 ? _g : null,
        targetLocationId: (_h = finalTarget === null || finalTarget === void 0 ? void 0 : finalTarget.locationId) !== null && _h !== void 0 ? _h : null,
        reason: source && finalTarget
            ? "Suggested based on highest stock → lowest stock."
            : "No strong move suggestion available.",
    };
});
//# sourceMappingURL=getMoveSuggestions.js.map