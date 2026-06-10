import { describe, it, expect } from "vitest";
import { haversineKm, sortByDistance } from "./geo";

describe("haversineKm", () => {
  it("renvoie 0 pour deux points identiques", () => {
    expect(haversineKm({ lat: 48.85, lng: 2.35 }, { lat: 48.85, lng: 2.35 })).toBe(0);
  });

  it("≈ 111,19 km pour 1° de latitude", () => {
    const d = haversineKm({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
    expect(d).toBeGreaterThan(111);
    expect(d).toBeLessThan(111.4);
  });

  it("est symétrique", () => {
    const a = { lat: 48.8566, lng: 2.3522 };
    const b = { lat: 45.764, lng: 4.8357 }; // Lyon
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 6);
  });
});

describe("sortByDistance", () => {
  const origin = { lat: 48.8534, lng: 2.3488 };
  const items = [
    { id: "loin", lat: 48.90, lng: 2.40 },
    { id: "proche", lat: 48.8536, lng: 2.349 },
    { id: "moyen", lat: 48.87, lng: 2.36 },
  ];

  it("trie par distance croissante", () => {
    const sorted = sortByDistance(origin, items);
    expect(sorted.map((s) => s.id)).toEqual(["proche", "moyen", "loin"]);
  });

  it("annote chaque élément de sa distance croissante", () => {
    const sorted = sortByDistance(origin, items);
    expect(sorted[0].distanceKm).toBeLessThan(sorted[1].distanceKm);
    expect(sorted[1].distanceKm).toBeLessThan(sorted[2].distanceKm);
  });

  it("ne mute pas le tableau d'entrée", () => {
    const copy = [...items];
    sortByDistance(origin, items);
    expect(items).toEqual(copy);
  });
});
