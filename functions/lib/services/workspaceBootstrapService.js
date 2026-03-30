"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkspaceBootstrapService = void 0;
const firestore_1 = require("../core/firestore");
const locationRepo_1 = require("../repositories/locationRepo");
class WorkspaceBootstrapService {
    constructor() {
        this.locationRepo = new locationRepo_1.LocationRepo();
    }
    async bootstrap(params) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        const now = firestore_1.Timestamp.now();
        await (0, firestore_1.workspaceRef)(params.workspaceId).set({
            name: params.workspaceName.trim(),
            slug: params.workspaceName.trim().toLowerCase().replace(/\s+/g, "-"),
            status: "active",
            ownerUid: params.ownerUid,
            updatedAt: now,
            createdAt: now,
            onboarding: {
                completed: false,
                step: "welcome",
                completedAt: null,
            },
            businessProfile: {
                businessName: params.workspaceName.trim(),
                businessType: (_a = params.businessType) !== null && _a !== void 0 ? _a : "",
                expectedLocationCount: (_b = params.expectedLocationCount) !== null && _b !== void 0 ? _b : "",
                setupPreference: (_c = params.setupPreference) !== null && _c !== void 0 ? _c : "start_now",
            },
        }, { merge: true });
        await (0, firestore_1.membersCol)(params.workspaceId).doc(params.ownerUid).set({
            uid: params.ownerUid,
            role: "owner",
            email: (_d = params.ownerEmail) !== null && _d !== void 0 ? _d : "",
            displayName: (_e = params.ownerDisplayName) !== null && _e !== void 0 ? _e : "",
            phoneNumber: (_f = params.phoneNumber) !== null && _f !== void 0 ? _f : "",
            createdAt: now,
            updatedAt: now,
        }, { merge: true });
        await (0, firestore_1.userRef)(params.ownerUid).set({
            uid: params.ownerUid,
            email: (_g = params.ownerEmail) !== null && _g !== void 0 ? _g : "",
            displayName: (_h = params.ownerDisplayName) !== null && _h !== void 0 ? _h : "",
            phoneNumber: (_j = params.phoneNumber) !== null && _j !== void 0 ? _j : "",
            activeWorkspaceId: params.workspaceId,
            workspaceIds: [params.workspaceId],
            createdAt: now,
            updatedAt: now,
        }, { merge: true });
        const existingPrimary = await this.locationRepo.getByCode(params.workspaceId, "MAIN");
        if (!existingPrimary) {
            await this.locationRepo.create(params.workspaceId, {
                name: "Main Inventory",
                code: "MAIN",
                type: "stockroom",
            });
        }
        return {
            workspaceId: params.workspaceId,
            ok: true,
        };
    }
}
exports.WorkspaceBootstrapService = WorkspaceBootstrapService;
//# sourceMappingURL=workspaceBootstrapService.js.map