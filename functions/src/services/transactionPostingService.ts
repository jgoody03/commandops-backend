import { HttpsError } from "firebase-functions/v2/https";
import { db, Timestamp } from "../core/firestore";
import {
  PostAdjustInventoryInput,
  PostMoveInventoryInput,
  PostReceiveInventoryInput,
} from "../contracts/inventory";
import { LocationRepo } from "../repositories/locationRepo";
import { ProductRepo } from "../repositories/productRepo";
import { InventoryBalanceRepo } from "../repositories/inventoryBalanceRepo";
import { InventoryTransactionRepo } from "../repositories/inventoryTransactionRepo";
import { ProductInventorySummaryRepo } from "../repositories/productInventorySummaryRepo";
import { LocationInventorySummaryRepo } from "../repositories/locationInventorySummaryRepo";
import { RecentActivityRepo } from "../repositories/recentActivityRepo";
import { buildProductInventorySummary } from "../builders/buildProductInventorySummary";
import { buildLocationInventorySummary } from "../builders/buildLocationInventorySummary";
import { buildRecentActivity } from "../builders/buildRecentActivity";

type HydratedReceiveLine = {
  productId: string;
  sku: string;
  quantity: number;
  unitCost?: number | null;
  barcode?: string | null;
  note?: string;
  product: Awaited<ReturnType<ProductRepo["getById"]>>;
};

type HydratedAdjustLine = {
  productId: string;
  sku: string;
  quantity: number;
  barcode?: string | null;
  note?: string;
  product: Awaited<ReturnType<ProductRepo["getById"]>>;
};

type HydratedMoveLine = {
  productId: string;
  sku: string;
  quantity: number;
  barcode?: string | null;
  note?: string;
  product: Awaited<ReturnType<ProductRepo["getById"]>>;
};

export class TransactionPostingService {
  private locationRepo = new LocationRepo();
  private productRepo = new ProductRepo();
  private balanceRepo = new InventoryBalanceRepo();
  private transactionRepo = new InventoryTransactionRepo();
  private productSummaryRepo = new ProductInventorySummaryRepo();
  private locationSummaryRepo = new LocationInventorySummaryRepo();
  private recentActivityRepo = new RecentActivityRepo();

  private async refreshProductSummaries(
    workspaceId: string,
    productIds: string[]
  ) {
    const uniqueProductIds = [...new Set(productIds)];

    for (const productId of uniqueProductIds) {
      const product = await this.productRepo.getById(workspaceId, productId);
      const balances = await this.balanceRepo.listByProduct(workspaceId, productId);

      const summary = buildProductInventorySummary({
        workspaceId,
        product,
        balances,
      });

      await this.productSummaryRepo.set(workspaceId, productId, summary);
    }
  }

  private async refreshLocationSummary(
    workspaceId: string,
    location: Awaited<ReturnType<LocationRepo["getById"]>>
  ) {
    const balances = await this.balanceRepo.listByLocation(workspaceId, location.id);

    const summary = buildLocationInventorySummary({
      workspaceId,
      location,
      balances,
    });

    await this.locationSummaryRepo.set(workspaceId, location.id, summary);
  }

  async postReceive(
    input: PostReceiveInventoryInput,
    postedBy: string,
    requestId: string
  ) {
    if (!input.lines.length) {
      throw new HttpsError("invalid-argument", "At least one line is required.");
    }

    const location = await this.locationRepo.assertActive(
      input.workspaceId,
      input.locationId
    );

    const hydratedLines: HydratedReceiveLine[] = [];

    for (const line of input.lines) {
      if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
        throw new HttpsError(
          "invalid-argument",
          "Receive quantity must be greater than zero."
        );
      }

      const product = await this.productRepo.getById(
        input.workspaceId,
        line.productId
      );

      hydratedLines.push({
        productId: line.productId,
        sku: product.sku,
        quantity: line.quantity,
        unitCost: line.unitCost ?? null,
        barcode: line.barcode ?? null,
        ...(line.note ? { note: line.note } : {}),
        product,
      });
    }

    const postedAt = Timestamp.now();

    const transactionId = await this.transactionRepo.create(
      input.workspaceId,
      {
        type: "receive",
        referenceType: "manual",
        sourceLocationId: null,
        targetLocationId: input.locationId,
        note: input.note ?? "",
        postedBy,
        postedAt,
        requestId,
        relatedTransactionGroupId: null,
      },
      hydratedLines.map((line) => ({
        productId: line.productId,
        sku: line.sku,
        quantity: line.quantity,
        unitCost: line.unitCost ?? null,
        barcode: line.barcode ?? null,
        ...(line.note ? { note: line.note } : {}),
      }))
    );

    for (const line of hydratedLines) {
      await this.balanceRepo.incrementOnHand(
        input.workspaceId,
        location,
        line.product,
        line.quantity,
        postedAt
      );
    }

    await this.refreshProductSummaries(
      input.workspaceId,
      hydratedLines.map((line) => line.productId)
    );

    await this.refreshLocationSummary(input.workspaceId, location);

    await this.recentActivityRepo.create(
      input.workspaceId,
      buildRecentActivity({
        workspaceId: input.workspaceId,
        type: "receive",
        title: `Received ${hydratedLines.length} item${
          hydratedLines.length === 1 ? "" : "s"
        }`,
        subtitle: location.name,
        locationId: location.id,
        actorUserId: postedBy,
        createdAt: postedAt,
      })
    );

    return {
      ok: true,
      transactionId,
      postedAt: postedAt.toDate().toISOString(),
      lineCount: hydratedLines.length,
    };
  }

  async postAdjust(
    input: PostAdjustInventoryInput,
    postedBy: string,
    requestId: string
  ) {
    if (!input.lines.length) {
      throw new HttpsError("invalid-argument", "At least one line is required.");
    }

    const location = await this.locationRepo.assertActive(
      input.workspaceId,
      input.locationId
    );

    const hydratedLines: HydratedAdjustLine[] = [];

    for (const line of input.lines) {
      if (!Number.isFinite(line.quantityDelta) || line.quantityDelta === 0) {
        throw new HttpsError(
          "invalid-argument",
          "Adjustment quantityDelta must be a non-zero number."
        );
      }

      const product = await this.productRepo.getById(
        input.workspaceId,
        line.productId
      );

      hydratedLines.push({
        productId: line.productId,
        sku: product.sku,
        quantity: line.quantityDelta,
        barcode: line.barcode ?? null,
        ...(line.note ? { note: line.note } : {}),
        product,
      });
    }

    const postedAt = Timestamp.now();

    const transactionId = await db.runTransaction(async (tx) => {
      for (const line of hydratedLines) {
        const balance = await this.balanceRepo.getInTransaction(
          tx,
          input.workspaceId,
          input.locationId,
          line.productId
        );

        const currentOnHand = balance?.onHand ?? 0;
        const currentAvailable = balance?.available ?? 0;

        const nextOnHand = currentOnHand + line.quantity;
        const nextAvailable = currentAvailable + line.quantity;

        if (nextOnHand < 0 || nextAvailable < 0) {
          throw new HttpsError(
            "failed-precondition",
            `Adjustment would make inventory negative for SKU ${line.sku}.`
          );
        }
      }

      for (const line of hydratedLines) {
        const balance = await this.balanceRepo.getInTransaction(
          tx,
          input.workspaceId,
          input.locationId,
          line.productId
        );

        const currentOnHand = balance?.onHand ?? 0;
        const currentAvailable = balance?.available ?? 0;

        const nextOnHand = currentOnHand + line.quantity;
        const nextAvailable = currentAvailable + line.quantity;

        this.balanceRepo.setAbsoluteInTransaction(tx, {
          workspaceId: input.workspaceId,
          location,
          product: line.product,
          onHand: nextOnHand,
          available: nextAvailable,
          transactionAt: postedAt,
        });
      }

      return this.transactionRepo.createInTransaction(
        tx,
        input.workspaceId,
        {
          type: "adjust",
          referenceType: "manual",
          sourceLocationId: null,
          targetLocationId: input.locationId,
          note: input.note ?? "",
          postedBy,
          postedAt,
          requestId,
          relatedTransactionGroupId: null,
        },
        hydratedLines.map((line) => ({
          productId: line.productId,
          sku: line.sku,
          quantity: line.quantity,
          barcode: line.barcode ?? null,
          ...(line.note ? { note: line.note } : {}),
        }))
      );
    });

    await this.refreshProductSummaries(
      input.workspaceId,
      hydratedLines.map((line) => line.productId)
    );

    await this.refreshLocationSummary(input.workspaceId, location);

    await this.recentActivityRepo.create(
      input.workspaceId,
      buildRecentActivity({
        workspaceId: input.workspaceId,
        type: "adjust",
        title: `Adjusted ${hydratedLines.length} item${
          hydratedLines.length === 1 ? "" : "s"
        }`,
        subtitle: location.name,
        locationId: location.id,
        actorUserId: postedBy,
        createdAt: postedAt,
      })
    );

    return {
      ok: true,
      transactionId,
      postedAt: postedAt.toDate().toISOString(),
      lineCount: hydratedLines.length,
      locationId: input.locationId,
    };
  }

  async postMove(
    input: PostMoveInventoryInput,
    postedBy: string,
    requestId: string
  ) {
    if (!input.lines.length) {
      throw new HttpsError("invalid-argument", "At least one line is required.");
    }

    if (input.sourceLocationId === input.targetLocationId) {
      throw new HttpsError(
        "invalid-argument",
        "Source and target locations must be different."
      );
    }

    const sourceLocation = await this.locationRepo.assertActive(
      input.workspaceId,
      input.sourceLocationId
    );

    const targetLocation = await this.locationRepo.assertActive(
      input.workspaceId,
      input.targetLocationId
    );

    const hydratedLines: HydratedMoveLine[] = [];

    for (const line of input.lines) {
      if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
        throw new HttpsError(
          "invalid-argument",
          "Move quantity must be greater than zero."
        );
      }

      const product = await this.productRepo.getById(
        input.workspaceId,
        line.productId
      );

      hydratedLines.push({
        productId: line.productId,
        sku: product.sku,
        quantity: line.quantity,
        barcode: line.barcode ?? null,
        ...(line.note ? { note: line.note } : {}),
        product,
      });
    }

    const postedAt = Timestamp.now();

    const result = await db.runTransaction(async (tx) => {
      for (const line of hydratedLines) {
        const sourceBalance = await this.balanceRepo.getInTransaction(
          tx,
          input.workspaceId,
          input.sourceLocationId,
          line.productId
        );

        const currentSourceOnHand = sourceBalance?.onHand ?? 0;
        const currentSourceAvailable = sourceBalance?.available ?? 0;

        if (
          currentSourceOnHand < line.quantity ||
          currentSourceAvailable < line.quantity
        ) {
          throw new HttpsError(
            "failed-precondition",
            `Insufficient inventory for SKU ${line.sku} at source location.`
          );
        }
      }

      for (const line of hydratedLines) {
        const sourceBalance = await this.balanceRepo.getInTransaction(
          tx,
          input.workspaceId,
          input.sourceLocationId,
          line.productId
        );

        const targetBalance = await this.balanceRepo.getInTransaction(
          tx,
          input.workspaceId,
          input.targetLocationId,
          line.productId
        );

        const nextSourceOnHand = (sourceBalance?.onHand ?? 0) - line.quantity;
        const nextSourceAvailable =
          (sourceBalance?.available ?? 0) - line.quantity;

        const nextTargetOnHand = (targetBalance?.onHand ?? 0) + line.quantity;
        const nextTargetAvailable =
          (targetBalance?.available ?? 0) + line.quantity;

        if (nextSourceOnHand < 0 || nextSourceAvailable < 0) {
          throw new HttpsError(
            "failed-precondition",
            `Inventory would go negative for SKU ${line.sku} at source location.`
          );
        }

        this.balanceRepo.setAbsoluteInTransaction(tx, {
          workspaceId: input.workspaceId,
          location: sourceLocation,
          product: line.product,
          onHand: nextSourceOnHand,
          available: nextSourceAvailable,
          transactionAt: postedAt,
        });

        this.balanceRepo.setAbsoluteInTransaction(tx, {
          workspaceId: input.workspaceId,
          location: targetLocation,
          product: line.product,
          onHand: nextTargetOnHand,
          available: nextTargetAvailable,
          transactionAt: postedAt,
        });
      }

      const relatedTransactionGroupId =
        this.transactionRepo.newId(input.workspaceId);

      const moveOutTransactionId = this.transactionRepo.createInTransaction(
        tx,
        input.workspaceId,
        {
          type: "move_out",
          referenceType: "manual",
          sourceLocationId: input.sourceLocationId,
          targetLocationId: input.targetLocationId,
          note: input.note ?? "",
          postedBy,
          postedAt,
          requestId,
          relatedTransactionGroupId,
        },
        hydratedLines.map((line) => ({
          productId: line.productId,
          sku: line.sku,
          quantity: line.quantity,
          barcode: line.barcode ?? null,
          ...(line.note ? { note: line.note } : {}),
        }))
      );

      const moveInTransactionId = this.transactionRepo.createInTransaction(
        tx,
        input.workspaceId,
        {
          type: "move_in",
          referenceType: "manual",
          sourceLocationId: input.sourceLocationId,
          targetLocationId: input.targetLocationId,
          note: input.note ?? "",
          postedBy,
          postedAt,
          requestId,
          relatedTransactionGroupId,
        },
        hydratedLines.map((line) => ({
          productId: line.productId,
          sku: line.sku,
          quantity: line.quantity,
          barcode: line.barcode ?? null,
          ...(line.note ? { note: line.note } : {}),
        }))
      );

      return {
        relatedTransactionGroupId,
        moveOutTransactionId,
        moveInTransactionId,
      };
    });

    await this.refreshProductSummaries(
      input.workspaceId,
      hydratedLines.map((line) => line.productId)
    );

    await this.refreshLocationSummary(input.workspaceId, sourceLocation);
    await this.refreshLocationSummary(input.workspaceId, targetLocation);

    await this.recentActivityRepo.create(
      input.workspaceId,
      buildRecentActivity({
        workspaceId: input.workspaceId,
        type: "move",
        title: `Moved ${hydratedLines.length} item${
          hydratedLines.length === 1 ? "" : "s"
        }`,
        subtitle: `${sourceLocation.name} → ${targetLocation.name}`,
        locationId: targetLocation.id,
        actorUserId: postedBy,
        createdAt: postedAt,
      })
    );

    return {
      ok: true,
      ...result,
      postedAt: postedAt.toDate().toISOString(),
      lineCount: hydratedLines.length,
      sourceLocationId: input.sourceLocationId,
      targetLocationId: input.targetLocationId,
    };
  }
}