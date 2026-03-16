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

export class TransactionPostingService {
  private locationRepo = new LocationRepo();
  private productRepo = new ProductRepo();
  private balanceRepo = new InventoryBalanceRepo();
  private transactionRepo = new InventoryTransactionRepo();

  async postReceive(
    input: PostReceiveInventoryInput,
    postedBy: string,
    requestId: string
  ) {
    if (!input.lines.length) {
      throw new HttpsError("invalid-argument", "At least one line is required.");
    }

    await this.locationRepo.assertActive(input.workspaceId, input.locationId);

    const hydratedLines = [];
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
      },
      hydratedLines
    );

    for (const line of hydratedLines) {
      await this.balanceRepo.incrementOnHand(
        input.workspaceId,
        input.locationId,
        line.productId,
        line.quantity,
        postedAt
      );
    }

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

    await this.locationRepo.assertActive(input.workspaceId, input.locationId);

    const hydratedLines: Array<{
      productId: string;
      sku: string;
      quantity: number;
      barcode?: string | null;
      note?: string;
    }> = [];

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
          locationId: input.locationId,
          productId: line.productId,
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

    await this.locationRepo.assertActive(input.workspaceId, input.sourceLocationId);
    await this.locationRepo.assertActive(input.workspaceId, input.targetLocationId);

    const hydratedLines: Array<{
      productId: string;
      sku: string;
      quantity: number;
      barcode?: string | null;
      note?: string;
    }> = [];

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
      });
    }

    const postedAt = Timestamp.now();

    const transactionId = await db.runTransaction(async (tx) => {
      for (const line of hydratedLines) {
        const sourceBalance = await this.balanceRepo.getInTransaction(
          tx,
          input.workspaceId,
          input.sourceLocationId,
          line.productId
        );

        const currentSourceOnHand = sourceBalance?.onHand ?? 0;
        const currentSourceAvailable = sourceBalance?.available ?? 0;

        if (currentSourceOnHand < line.quantity || currentSourceAvailable < line.quantity) {
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
        const nextSourceAvailable = (sourceBalance?.available ?? 0) - line.quantity;

        const nextTargetOnHand = (targetBalance?.onHand ?? 0) + line.quantity;
        const nextTargetAvailable = (targetBalance?.available ?? 0) + line.quantity;

        if (nextSourceOnHand < 0 || nextSourceAvailable < 0) {
          throw new HttpsError(
            "failed-precondition",
            `Inventory would go negative for SKU ${line.sku} at source location.`
          );
        }

        this.balanceRepo.setAbsoluteInTransaction(tx, {
          workspaceId: input.workspaceId,
          locationId: input.sourceLocationId,
          productId: line.productId,
          onHand: nextSourceOnHand,
          available: nextSourceAvailable,
          transactionAt: postedAt,
        });

        this.balanceRepo.setAbsoluteInTransaction(tx, {
          workspaceId: input.workspaceId,
          locationId: input.targetLocationId,
          productId: line.productId,
          onHand: nextTargetOnHand,
          available: nextTargetAvailable,
          transactionAt: postedAt,
        });
      }

      return this.transactionRepo.createInTransaction(
        tx,
        input.workspaceId,
        {
          type: "move",
          referenceType: "manual",
          sourceLocationId: input.sourceLocationId,
          targetLocationId: input.targetLocationId,
          note: input.note ?? "",
          postedBy,
          postedAt,
          requestId,
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

    return {
      ok: true,
      transactionId,
      postedAt: postedAt.toDate().toISOString(),
      lineCount: hydratedLines.length,
      sourceLocationId: input.sourceLocationId,
      targetLocationId: input.targetLocationId,
    };
  }
}