"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLocation = void 0;
const https_1 = require("firebase-functions/v2/https");
const auth_1 = require("../core/auth");
const locationRepo_1 = require("../repositories/locationRepo");
const locationRepo = new locationRepo_1.LocationRepo();
exports.createLocation = (0, https_1.onCall)(async (request) => {
    var _a, _b, _c, _d, _e;
    if (!((_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid)) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required.");
    }
    const workspaceId = String(((_b = request.data) === null || _b === void 0 ? void 0 : _b.workspaceId) || "").trim();
    const name = String(((_c = request.data) === null || _c === void 0 ? void 0 : _c.name) || "").trim();
    const code = String(((_d = request.data) === null || _d === void 0 ? void 0 : _d.code) || "").trim();
    const type = String(((_e = request.data) === null || _e === void 0 ? void 0 : _e.type) || "").trim();
    if (!workspaceId || !name || !code || !type) {
        throw new https_1.HttpsError("invalid-argument", "workspaceId, name, code, and type are required.");
    }
    await (0, auth_1.assertWorkspaceMembership)(workspaceId, request.auth.uid);
    const existing = await locationRepo.getByCode(workspaceId, code);
    if (existing) {
        throw new https_1.HttpsError("already-exists", "A location with that code already exists.");
    }
    const location = await locationRepo.create(workspaceId, {
        name,
        code,
        type: type,
    });
    return {
        ok: true,
        location: {
            id: location.id,
            name: location.name,
            code: location.code,
            type: location.type,
            isActive: location.isActive,
        },
    };
});
//# sourceMappingURL=createLocation.js.map