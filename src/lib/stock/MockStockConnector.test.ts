import { describe, it, expect } from "vitest";
import { MockStockConnector } from "./MockStockConnector";

/**
 * Tests du connecteur de stock simulé : couvre les 3 statuts du contrat
 * (available / unavailable / unknown) et quelques garanties de robustesse.
 *
 * Identifiants pharmacie (n° FINESS) utilisés, cf. data/pharmacies.ts :
 *   750013443 = Pharmacie de Babylone
 *   750018475 = Pharmacie du Métro
 */
describe("MockStockConnector", () => {
  const connector = new MockStockConnector();

  it("renvoie 'available' quand le stock est positif", async () => {
    // Babylone a 42 Doliprane en stock.
    const res = await connector.checkAvailability("Doliprane", "750013443");
    expect(res.status).toBe("available");
  });

  it("renvoie 'unavailable' quand le produit est en rupture (stock 0)", async () => {
    // Babylone est en rupture d'Amoxicilline (quantité 0).
    const res = await connector.checkAvailability("Amoxicilline", "750013443");
    expect(res.status).toBe("unavailable");
  });

  it("renvoie 'unknown' pour un médicament hors catalogue", async () => {
    const res = await connector.checkAvailability("MedicamentInexistant", "750013443");
    expect(res.status).toBe("unknown");
    expect(res.raw).toMatchObject({ produit: null, stock: null });
  });

  it("renvoie 'unknown' pour une pharmacie inconnue", async () => {
    const res = await connector.checkAvailability("Doliprane", "000000000");
    expect(res.status).toBe("unknown");
  });

  it("est insensible à la casse et aux accents", async () => {
    const a = await connector.checkAvailability("doliprane", "750013443");
    const b = await connector.checkAvailability("DOLIPRANE", "750013443");
    expect(a.status).toBe("available");
    expect(b.status).toBe("available");
  });

  it("est déterministe (même entrée → même statut)", async () => {
    const a = await connector.checkAvailability("Ventoline", "750013443");
    const b = await connector.checkAvailability("Ventoline", "750013443");
    expect(a.status).toBe(b.status);
  });

  it("expose un statut différent selon la pharmacie pour un même médicament", async () => {
    // Doliprane : dispo à Babylone, en rupture au Métro.
    const babylone = await connector.checkAvailability("Doliprane", "750013443");
    const metro = await connector.checkAvailability("Doliprane", "750018475");
    expect(babylone.status).toBe("available");
    expect(metro.status).toBe("unavailable");
  });

  it("expose une charge brute imitant la forme du contrat Smart Rx", async () => {
    const res = await connector.checkAvailability("Doliprane", "750013443");
    expect(res.raw).toMatchObject({
      produit: { cip13: expect.any(String), libelle: expect.any(String) },
      stock: { quantite: expect.any(Number), disponible: true },
      _source: "mock",
    });
  });
});
