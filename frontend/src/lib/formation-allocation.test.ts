import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { FormationSlot } from "../types/formations";
import {
  allocateSlotsByTier,
  createEmptyTierInventory,
  sumTierInventory,
  type FormationTierInventory
} from "./formation-allocation";

function createSlot(id: string, needs: Partial<Pick<FormationSlot, "infantry" | "lancer" | "marksman">>) {
  return {
    id,
    name: id.toUpperCase(),
    hero: "No hero",
    infantry: needs.infantry ?? 0,
    lancer: needs.lancer ?? 0,
    marksman: needs.marksman ?? 0,
    notes: "",
    sortOrder: 1
  };
}

describe("formation allocation", () => {
  it("distributes stronger Marksman tiers across slots before weaker tiers", () => {
    const inventory = createEmptyTierInventory();
    inventory.marksman = { 10: 100, 9: 100 };
    const slots = ["j1", "j2", "j3", "j4"].map((id) => createSlot(id, { marksman: 50 }));

    const result = allocateSlotsByTier(inventory, slots);

    assert.deepEqual(result.slots.j1.marksman, [{ tier: 10, count: 50 }]);
    assert.deepEqual(result.slots.j2.marksman, [{ tier: 10, count: 50 }]);
    assert.deepEqual(result.slots.j3.marksman, [{ tier: 9, count: 50 }]);
    assert.deepEqual(result.slots.j4.marksman, [{ tier: 9, count: 50 }]);
    assert.deepEqual(sumTierInventory(result.remainingByTier), { infantry: 0, lancer: 0, marksman: 0 });
  });

  it("splits one slot across tiers from T16 down to T6 and keeps the remainder", () => {
    const inventory: FormationTierInventory = {
      infantry: { 16: 30, 10: 40, 6: 100 },
      lancer: {},
      marksman: {}
    };

    const result = allocateSlotsByTier(inventory, [createSlot("lead", { infantry: 50 })]);

    assert.deepEqual(result.slots.lead.infantry, [
      { tier: 16, count: 30 },
      { tier: 10, count: 20 }
    ]);
    assert.deepEqual(result.remainingByTier.infantry, { 10: 20, 6: 100 });
  });

  it("reports shortages without producing negative remaining troops", () => {
    const inventory = createEmptyTierInventory();
    inventory.lancer = { 8: 25 };

    const result = allocateSlotsByTier(inventory, [createSlot("support", { lancer: 40 })]);

    assert.deepEqual(result.slots.support.lancer, [{ tier: 8, count: 25 }]);
    assert.equal(result.shortages.support.lancer, 15);
    assert.deepEqual(result.remainingByTier.lancer, {});
  });
});
