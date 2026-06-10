import { describe, it, expect } from "vitest";
import { MockStockConnector } from "./MockStockConnector";
import { computeCoverage } from "./StockConnector";
import { PHARMACIES } from "@/data/pharmacies";

const connector = new MockStockConnector();

describe("MockStockConnector", () => {
  it("renvoie un résultat par pharmacie, un produit par médicament", async () => {
    const res = await connector.checkAvailability(
      ["Doliprane", "Ventoline"],
      ["750010266", "750010597"],
    );
    expect(res).toHaveLength(2);
    for (const r of res) {
      expect(r.products).toHaveLength(2);
      expect(r.coverage.total).toBe(2);
      expect(r.pharmacyId).toMatch(/^\d+$/);
      expect(() => new Date(r.updatedAt).toISOString()).not.toThrow();
    }
  });

  it("est stable : même (médicament, pharmacie) → même statut", async () => {
    const a = await connector.checkAvailability(["Amoxicilline"], ["750010266"]);
    const b = await connector.checkAvailability(["Amoxicilline"], ["750010266"]);
    expect(a[0].products[0].status).toBe(b[0].products[0].status);
  });

  it("couvre les 3 statuts sur l'ensemble des pharmacies", async () => {
    const meds = ["Doliprane", "Ventoline", "Amoxicilline", "Spasfon", "Levothyrox"];
    const ids = PHARMACIES.map((p) => p.id);
    const res = await connector.checkAvailability(meds, ids);
    const statuses = new Set(res.flatMap((r) => r.products.map((p) => p.status)));
    expect(statuses.has("available")).toBe(true);
    expect(statuses.has("unavailable")).toBe(true);
    expect(statuses.has("unknown")).toBe(true);
  });

  it("calcule la couverture = nb de médicaments disponibles", async () => {
    const res = await connector.checkAvailability(
      ["Doliprane", "Ventoline", "Amoxicilline"],
      ["750010266"],
    );
    const r = res[0];
    const expected = r.products.filter((p) => p.status === "available").length;
    expect(r.coverage.found).toBe(expected);
    expect(r.coverage.total).toBe(3);
    expect(r.coverage).toEqual(computeCoverage(r.products));
  });

  it("gère 0 médicament : couverture 0/0", async () => {
    const res = await connector.checkAvailability([], ["750010266"]);
    expect(res[0].products).toHaveLength(0);
    expect(res[0].coverage).toEqual({ found: 0, total: 0 });
  });
});

describe("computeCoverage", () => {
  it("compte les statuts 'available' uniquement", () => {
    expect(
      computeCoverage([
        { medication: "a", status: "available" },
        { medication: "b", status: "unavailable" },
        { medication: "c", status: "available" },
        { medication: "d", status: "unknown" },
      ]),
    ).toEqual({ found: 2, total: 4 });
  });
});
