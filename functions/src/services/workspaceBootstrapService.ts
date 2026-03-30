import {
  workspaceRef,
  membersCol,
  userRef,
  Timestamp,
} from "../core/firestore";
import { LocationRepo } from "../repositories/locationRepo";

export class WorkspaceBootstrapService {
  private locationRepo = new LocationRepo();

  async bootstrap(params: {
    workspaceId: string;
    ownerUid: string;
    workspaceName: string;
    ownerEmail?: string;
    ownerDisplayName?: string;
    phoneNumber?: string;
    businessType?: string;
    expectedLocationCount?: string;
    setupPreference?: "start_now" | "device_later";
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
        onboarding: {
          completed: false,
          step: "welcome",
          completedAt: null,
        },
        businessProfile: {
          businessName: params.workspaceName.trim(),
          businessType: params.businessType ?? "",
          expectedLocationCount: params.expectedLocationCount ?? "",
          setupPreference: params.setupPreference ?? "start_now",
        },
      },
      { merge: true }
    );

    await membersCol(params.workspaceId).doc(params.ownerUid).set(
      {
        uid: params.ownerUid,
        role: "owner",
        email: params.ownerEmail ?? "",
        displayName: params.ownerDisplayName ?? "",
        phoneNumber: params.phoneNumber ?? "",
        createdAt: now,
        updatedAt: now,
      },
      { merge: true }
    );

    await userRef(params.ownerUid).set(
      {
        uid: params.ownerUid,
        email: params.ownerEmail ?? "",
        displayName: params.ownerDisplayName ?? "",
        phoneNumber: params.phoneNumber ?? "",
        activeWorkspaceId: params.workspaceId,
        workspaceIds: [params.workspaceId],
        createdAt: now,
        updatedAt: now,
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