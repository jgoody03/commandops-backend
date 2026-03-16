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
        var _a, _b;
        const now = firestore_1.Timestamp.now();
        await (0, firestore_1.workspaceRef)(params.workspaceId).set({
            name: params.workspaceName.trim(),
            slug: params.workspaceName.trim().toLowerCase().replace(/\s+/g, "-"),
            status: "active",
            ownerUid: params.ownerUid,
            updatedAt: now,
            createdAt: now,
        }, { merge: true });
        await (0, firestore_1.membersCol)(params.workspaceId).doc(params.ownerUid).set({
            uid: params.ownerUid,
            role: "owner",
            email: (_a = params.ownerEmail) !== null && _a !== void 0 ? _a : "",
            displayName: (_b = params.ownerDisplayName) !== null && _b !== void 0 ? _b : "",
            createdAt: now,
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