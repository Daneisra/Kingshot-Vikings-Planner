import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { registrationSchema } from "./registration-schema";

const basePayload = {
  nickname: "Ragnar",
  partnerNames: ["Lagertha"],
  personalScore: null,
  comment: "",
  isAvailable: true
};

describe("registrationSchema", () => {
  it("accepts the supported T6 and T16 boundaries", () => {
    for (const tier of [6, 16]) {
      const result = registrationSchema.safeParse({
        ...basePayload,
        troopLoadout: [{ type: "infantry", tier, count: 100 }]
      });

      assert.equal(result.success, true, `Expected T${tier} to be accepted`);
    }
  });

  it("rejects troop tiers outside T6 to T16", () => {
    for (const tier of [5, 17]) {
      const result = registrationSchema.safeParse({
        ...basePayload,
        troopLoadout: [{ type: "infantry", tier, count: 100 }]
      });

      assert.equal(result.success, false, `Expected T${tier} to be rejected`);
    }
  });

  it("accepts at most two distinct troop tiers", () => {
    const twoTiers = registrationSchema.safeParse({
      ...basePayload,
      troopLoadout: [
        { type: "infantry", tier: 10, count: 100 },
        { type: "lancer", tier: 9, count: 100 }
      ]
    });
    const threeTiers = registrationSchema.safeParse({
      ...basePayload,
      troopLoadout: [
        { type: "infantry", tier: 10, count: 100 },
        { type: "lancer", tier: 9, count: 100 },
        { type: "marksman", tier: 8, count: 100 }
      ]
    });

    assert.equal(twoTiers.success, true);
    assert.equal(threeTiers.success, false);
  });

  it("rejects duplicate troop type and tier combinations", () => {
    const result = registrationSchema.safeParse({
      ...basePayload,
      troopLoadout: [
        { type: "marksman", tier: 10, count: 100 },
        { type: "marksman", tier: 10, count: 50 }
      ]
    });

    assert.equal(result.success, false);
  });

  it("deduplicates partner names case-insensitively", () => {
    const result = registrationSchema.safeParse({
      ...basePayload,
      partnerNames: ["Lagertha", "lagertha", "Bjorn"],
      troopLoadout: [{ type: "lancer", tier: 12, count: 100 }]
    });

    assert.equal(result.success, true);
    if (result.success) {
      assert.deepEqual(result.data.partnerNames, ["Lagertha", "Bjorn"]);
    }
  });
});
