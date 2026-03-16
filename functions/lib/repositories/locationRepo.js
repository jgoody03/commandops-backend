"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocationRepo = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("../core/firestore");
class LocationRepo {
    async create(workspaceId, input) {
        const now = firestore_1.Timestamp.now();
        const ref = (0, firestore_1.locationsCol)(workspaceId).doc();
        const doc = {
            name: input.name.trim(),
            code: input.code.trim().toUpperCase(),
            type: input.type,
            isActive: true,
            createdAt: now,
            updatedAt: now,
        };
        await ref.set(doc);
        return Object.assign({ id: ref.id }, doc);
    }
    async getById(workspaceId, locationId) {
        const snap = await (0, firestore_1.locationsCol)(workspaceId).doc(locationId).get();
        if (!snap.exists) {
            throw new https_1.HttpsError("not-found", "Location not found.");
        }
        return Object.assign({ id: snap.id }, snap.data());
    }
    async getByCode(workspaceId, code) {
        const normalized = code.trim().toUpperCase();
        const q = await (0, firestore_1.locationsCol)(workspaceId)
            .where("code", "==", normalized)
            .limit(1)
            .get();
        if (q.empty)
            return null;
        const doc = q.docs[0];
        return Object.assign({ id: doc.id }, doc.data());
    }
    async assertActive(workspaceId, locationId) {
        const location = await this.getById(workspaceId, locationId);
        if (!location.isActive) {
            throw new https_1.HttpsError("failed-precondition", "Location is inactive.");
        }
        return location;
    }
}
exports.LocationRepo = LocationRepo;
//# sourceMappingURL=locationRepo.js.map