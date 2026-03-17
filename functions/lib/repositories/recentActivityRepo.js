"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecentActivityRepo = void 0;
const firestore_1 = require("../core/firestore");
class RecentActivityRepo {
    async create(workspaceId, doc) {
        const ref = (0, firestore_1.recentActivityCol)(workspaceId).doc();
        await ref.set(doc);
        return ref.id;
    }
}
exports.RecentActivityRepo = RecentActivityRepo;
//# sourceMappingURL=recentActivityRepo.js.map