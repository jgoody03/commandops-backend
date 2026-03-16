import { workspaceRef, membersCol, Timestamp } from "../core/firestore";
import { LocationRepo } from "../repositories/locationRepo";

export class WorkspaceBootstrapService {
  private locationRepo = new LocationRepo();

  async bootstrap(params: {
    workspaceId: string;
    ownerUid: string;
    workspaceName: string;
    ownerEmail?: string;
    ownerDisplayName?: string;
  }) {
    const now = Timestamp.now();

    await workspaceRef(params.workspaceId).set(
      {
        name: params.workspaceName.trim(),
        slug: params.workspaceName.trim().toLowerCase().replace(/\s+/g, "-"),
        status: "active",
        ownerUid: params.ownerUid,
        updatedAt: now,
        createdAt: now,
      },
      { merge: true }
    );

    await membersCol(params.workspaceId).doc(params.ownerUid).set(
      {
        uid: params.ownerUid,
        role: "owner",
        email: params.ownerEmail ?? "",
        displayName: params.ownerDisplayName ?? "",
        createdAt: now,
      },
      { merge: true }
    );

    const existingPrimary = await this.locationRepo.getByCode(
      params.workspaceId,
      "MAIN"
    );

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