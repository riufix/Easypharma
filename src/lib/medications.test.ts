import { describe, it, expect } from "vitest";
import { searchMedications } from "./medications";

describe("searchMedications", () => {
  it("renvoie [] pour une requête vide", () => {
    expect(searchMedications("")).toEqual([]);
  });

  it("trouve des dénominations réelles (Doliprane)", () => {
    const res = searchMedications("doliprane");
    expect(res.length).toBeGreaterThan(0);
    expect(res.every((n) => n.toLowerCase().includes("doliprane"))).toBe(true);
  });

  it("priorise les correspondances en début de nom", () => {
    const res = searchMedications("doliprane");
    expect(res[0].toLowerCase().startsWith("doliprane")).toBe(true);
  });

  it("est insensible aux accents et à la casse", () => {
    const res = searchMedications("PARACETAMOL");
    expect(res.length).toBeGreaterThan(0);
    // la BDPM écrit « PARACÉTAMOL » (avec accent) → doit matcher sans accent
    expect(res.some((n) => /parac[eé]tamol/i.test(n))).toBe(true);
  });

  it("respecte la limite", () => {
    expect(searchMedications("a", 5).length).toBeLessThanOrEqual(5);
  });
});
