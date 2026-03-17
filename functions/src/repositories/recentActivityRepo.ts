import { recentActivityCol } from "../core/firestore";
import { RecentActivityDoc } from "../contracts/activity";

export class RecentActivityRepo {
  async create(workspaceId: string, doc: RecentActivityDoc) {
    const ref = recentActivityCol(workspaceId).doc();
    await ref.set(doc);
    return ref.id;
  }
}