import { HttpsError } from "firebase-functions/v2/https";
import { Timestamp } from "../core/firestore";
import { PostReceiveInventoryInput } from "../contracts/inventory";
import { LocationRepo } from "../repositories/locationRepo";
import { ProductRepo } from "../repositories/productRepo";
import { InventoryBalanceRepo } from "../repositories/inventoryBalanceRepo";
import { InventoryTransactionRepo } from "../repositories/inventoryTransactionRepo";

export class TransactionPostingService {
  private locationRepo = new LocationRepo();
  private productRepo = new ProductRepo();
  private balanceRepo = new InventoryBalanceRepo();
  private transactionRepo = new InventoryTransactionRepo();

  async postReceive(input: PostReceiveInventoryInput, postedBy: string, requestId: string) {
    if (!input.lines.length) {
      throw new HttpsError("invalid-argument", "At least one line is required.");
    }

    await this.locationRepo.assertActive(input.workspaceId, input.locationId);

    const hydratedLines = [];
    for (const line of input.lines) {
      if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
        throw new HttpsError("invalid-argument", "Receive quantity must be greater than zero.");
      }

      const product = await this.productRepo.getById(input.workspaceId, line.productId);

hydratedLines.push({
  productId: line.productId,
  sku: product.sku,
  quantity: line.quantity,
  unitCost: line.unitCost ?? null,
  barcode: line.barcode ?? null,
  ...(line.note ? { note: line.note } : {}),
});    }

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
}