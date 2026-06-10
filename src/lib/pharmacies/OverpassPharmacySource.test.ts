import { describe, it, expect } from "vitest";
import { mapOverpassElements } from "./OverpassPharmacySource";

describe("mapOverpassElements", () => {
  it("mappe un node avec FINESS, adresse et horaires", () => {
    const [p] = mapOverpassElements([
      {
        type: "node",
        id: 1,
        lat: 48.86,
        lon: 2.35,
        tags: {
          name: "Pharmacie Centrale",
          "ref:FR:FINESS": "750012345",
          "addr:housenumber": "10",
          "addr:street": "rue de Rivoli",
          "addr:postcode": "75001",
          "addr:city": "Paris",
          opening_hours: "Mo-Sa 09:00-19:00",
        },
      },
    ]);
    expect(p.id).toBe("750012345"); // FINESS prioritaire
    expect(p.name).toBe("Pharmacie Centrale");
    expect(p.address).toBe("10 rue de Rivoli, 75001 Paris");
    expect(p.hours).toBe("Lun-Sam 09:00-19:00"); // jours traduits
    expect(p.lat).toBe(48.86);
  });

  it("utilise center pour un way et un id osm sans FINESS", () => {
    const [p] = mapOverpassElements([
      {
        type: "way",
        id: 42,
        center: { lat: 48.85, lon: 2.34 },
        tags: { name: "Grande Pharmacie" },
      },
    ]);
    expect(p.id).toBe("osm:way/42");
    expect(p.lat).toBe(48.85);
    expect(p.address).toBe("Adresse non renseignée (OSM)");
    expect(p.hours).toBe("Horaires non renseignés");
  });

  it("ignore les éléments sans coordonnées et dédoublonne par FINESS", () => {
    const out = mapOverpassElements([
      { type: "node", id: 1, tags: { name: "Sans coords" } }, // pas de lat/lon → ignoré
      { type: "node", id: 2, lat: 48.8, lon: 2.3, tags: { "ref:FR:FINESS": "750000001", name: "A" } },
      { type: "way", id: 3, center: { lat: 48.8, lon: 2.3 }, tags: { "ref:FR:FINESS": "750000001", name: "A bis" } },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("750000001");
  });

  it("retombe sur un nom par défaut si name absent", () => {
    const [p] = mapOverpassElements([{ type: "node", id: 9, lat: 1, lon: 2, tags: {} }]);
    expect(p.name).toBe("Pharmacie");
  });
});
