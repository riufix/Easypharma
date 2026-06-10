/**
 * Pharmacies « en dur » pour le POC (cf. POC_Brief §3).
 *
 * Données RÉELLES issues de FINESS via l'open data Île-de-France
 * (dataset « carte-des-pharmacies-de-paris », source FINESS) :
 * https://data.iledefrance.fr/explore/dataset/carte-des-pharmacies-de-paris/
 *
 * Seules l'identité et la localisation sont réelles. L'état de stock affiché par
 * l'application provient du connecteur (mock par défaut) et est, lui, SIMULÉ.
 *
 * `id` = numéro FINESS de l'établissement : c'est l'identifiant transmis au
 * connecteur de stock (`pharmacyId`).
 */

export type Pharmacy = {
  id: string; // n° FINESS établissement
  name: string;
  address: string;
  lat: number;
  lng: number;
};

export const PHARMACIES: Pharmacy[] = [
  {
    id: "750013443",
    name: "Pharmacie de Babylone",
    address: "6 rue de Babylone, 75007 Paris",
    lat: 48.8517847,
    lng: 2.3257915,
  },
  {
    id: "750018475",
    name: "Pharmacie du Métro",
    address: "83 boulevard de la Villette, 75010 Paris",
    lat: 48.8773864,
    lng: 2.3706062,
  },
  {
    id: "750024085",
    name: "Pharmacie Edgar Quinet",
    address: "43 rue Delambre, 75014 Paris",
    lat: 48.8415816,
    lng: 2.3272382,
  },
];

/** Centre de carte par défaut : Paris. */
export const MAP_CENTER: [number, number] = [48.8566, 2.3522];