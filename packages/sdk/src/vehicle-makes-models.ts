/** Sentinel for free-text make/model outside the client catalog. */
export const VEHICLE_CATALOG_OTHER = "Other" as const;

export type VehicleMakeModelsEntry = {
  make: string;
  models: string[];
};

export type VehicleMakesModelsCatalog = {
  version: number;
  makes: VehicleMakeModelsEntry[];
};

export const VEHICLE_MAKES_MODELS_CATALOG: VehicleMakesModelsCatalog = {
  "version": 1,
  "makes": [
    {
      "make": "Audi",
      "models": [
        "A1",
        "A3",
        "A4",
        "A5",
        "A6",
        "A7",
        "A8",
        "e-tron",
        "e-tron GT",
        "Q2",
        "Q3",
        "Q5",
        "Q7",
        "Q8",
        "RS3",
        "RS4",
        "RS5",
        "RS6",
        "RS7",
        "S3",
        "S4",
        "S5",
        "S6",
        "S8",
        "TT"
      ]
    },
    {
      "make": "BMW",
      "models": [
        "1 Series",
        "2 Series",
        "3 Series",
        "4 Series",
        "5 Series",
        "6 Series",
        "7 Series",
        "8 Series",
        "i3",
        "i4",
        "i7",
        "iX",
        "iX1",
        "iX3",
        "M2",
        "M3",
        "M4",
        "M5",
        "X1",
        "X2",
        "X3",
        "X4",
        "X5",
        "X6",
        "X7",
        "Z4"
      ]
    },
    {
      "make": "Chevrolet",
      "models": [
        "Blazer",
        "Camaro",
        "Colorado",
        "Corvette",
        "Equinox",
        "Malibu",
        "Silverado",
        "Spark",
        "Suburban",
        "Tahoe",
        "Trailblazer",
        "Traverse",
        "Trax"
      ]
    },
    {
      "make": "Citroën",
      "models": [
        "Berlingo",
        "C1",
        "C3",
        "C3 Aircross",
        "C4",
        "C4 Cactus",
        "C4 Picasso",
        "C5",
        "C5 Aircross",
        "Dispatch",
        "Jumper",
        "SpaceTourer"
      ]
    },
    {
      "make": "Cupra",
      "models": [
        "Ateca",
        "Born",
        "Formentor",
        "Leon"
      ]
    },
    {
      "make": "Dacia",
      "models": [
        "Duster",
        "Jogger",
        "Logan",
        "Sandero",
        "Spring"
      ]
    },
    {
      "make": "Fiat",
      "models": [
        "500",
        "500L",
        "500X",
        "Doblo",
        "Ducato",
        "Panda",
        "Punto",
        "Tipo"
      ]
    },
    {
      "make": "Ford",
      "models": [
        "Bronco",
        "EcoSport",
        "Edge",
        "Escape",
        "Expedition",
        "Explorer",
        "F-150",
        "Fiesta",
        "Focus",
        "Fusion",
        "Galaxy",
        "Kuga",
        "Mondeo",
        "Mustang",
        "Mustang Mach-E",
        "Puma",
        "Ranger",
        "S-Max",
        "Tourneo",
        "Transit",
        "Transit Connect",
        "Transit Custom"
      ]
    },
    {
      "make": "Honda",
      "models": [
        "Accord",
        "Civic",
        "CR-V",
        "e",
        "Fit",
        "HR-V",
        "Jazz",
        "Odyssey",
        "Pilot"
      ]
    },
    {
      "make": "Hyundai",
      "models": [
        "Bayon",
        "Elantra",
        "i10",
        "i20",
        "i30",
        "Ioniq",
        "Ioniq 5",
        "Ioniq 6",
        "Kona",
        "Santa Fe",
        "Tucson",
        "Venue"
      ]
    },
    {
      "make": "Iveco",
      "models": [
        "Daily",
        "Eurocargo"
      ]
    },
    {
      "make": "Jaguar",
      "models": [
        "E-Pace",
        "F-Pace",
        "F-Type",
        "I-Pace",
        "XE",
        "XF",
        "XJ"
      ]
    },
    {
      "make": "Jeep",
      "models": [
        "Cherokee",
        "Compass",
        "Gladiator",
        "Grand Cherokee",
        "Renegade",
        "Wrangler"
      ]
    },
    {
      "make": "Kia",
      "models": [
        "Ceed",
        "EV6",
        "Niro",
        "Optima",
        "Picanto",
        "Rio",
        "Sorento",
        "Soul",
        "Sportage",
        "Stinger",
        "Stonic",
        "XCeed"
      ]
    },
    {
      "make": "Land Rover",
      "models": [
        "Defender",
        "Discovery",
        "Discovery Sport",
        "Range Rover",
        "Range Rover Evoque",
        "Range Rover Sport",
        "Range Rover Velar"
      ]
    },
    {
      "make": "Lexus",
      "models": [
        "CT",
        "ES",
        "IS",
        "LC",
        "LS",
        "NX",
        "RX",
        "UX"
      ]
    },
    {
      "make": "MAN",
      "models": [
        "TGE",
        "TGX"
      ]
    },
    {
      "make": "Mazda",
      "models": [
        "2",
        "3",
        "6",
        "CX-3",
        "CX-30",
        "CX-5",
        "CX-60",
        "CX-9",
        "MX-30",
        "MX-5"
      ]
    },
    {
      "make": "Mercedes-Benz",
      "models": [
        "A-Class",
        "B-Class",
        "C-Class",
        "CLA",
        "CLS",
        "E-Class",
        "EQA",
        "EQB",
        "EQC",
        "EQE",
        "EQS",
        "G-Class",
        "GLA",
        "GLB",
        "GLC",
        "GLE",
        "GLS",
        "S-Class",
        "Sprinter",
        "V-Class",
        "Vito"
      ]
    },
    {
      "make": "MG",
      "models": [
        "HS",
        "MG3",
        "MG4",
        "MG5",
        "ZS"
      ]
    },
    {
      "make": "Mini",
      "models": [
        "Clubman",
        "Convertible",
        "Countryman",
        "Hatch",
        "Paceman"
      ]
    },
    {
      "make": "Mitsubishi",
      "models": [
        "ASX",
        "Eclipse Cross",
        "L200",
        "Outlander",
        "Pajero",
        "Space Star"
      ]
    },
    {
      "make": "Nissan",
      "models": [
        "Ariya",
        "Juke",
        "Leaf",
        "Micra",
        "Navara",
        "Note",
        "NV200",
        "NV300",
        "NV400",
        "Qashqai",
        "Townstar",
        "X-Trail"
      ]
    },
    {
      "make": "Opel",
      "models": [
        "Astra",
        "Combo",
        "Corsa",
        "Crossland",
        "Grandland",
        "Insignia",
        "Mokka",
        "Movano",
        "Vivaro",
        "Zafira"
      ]
    },
    {
      "make": "Peugeot",
      "models": [
        "108",
        "2008",
        "208",
        "3008",
        "308",
        "5008",
        "508",
        "Boxer",
        "Expert",
        "Partner",
        "Rifter",
        "Traveller"
      ]
    },
    {
      "make": "Porsche",
      "models": [
        "718",
        "911",
        "Cayenne",
        "Macan",
        "Panamera",
        "Taycan"
      ]
    },
    {
      "make": "Renault",
      "models": [
        "Arkana",
        "Captur",
        "Clio",
        "Espace",
        "Kadjar",
        "Kangoo",
        "Koleos",
        "Master",
        "Megane",
        "Scenic",
        "Trafic",
        "Twingo",
        "Zoe"
      ]
    },
    {
      "make": "Seat",
      "models": [
        "Arona",
        "Ateca",
        "Ibiza",
        "Leon",
        "Tarraco"
      ]
    },
    {
      "make": "Skoda",
      "models": [
        "Citigo",
        "Enyaq",
        "Fabia",
        "Kamiq",
        "Karoq",
        "Kodiaq",
        "Octavia",
        "Rapid",
        "Scala",
        "Superb"
      ]
    },
    {
      "make": "Subaru",
      "models": [
        "Forester",
        "Impreza",
        "Legacy",
        "Outback",
        "XV"
      ]
    },
    {
      "make": "Suzuki",
      "models": [
        "Ignis",
        "Jimny",
        "S-Cross",
        "Swift",
        "Vitara"
      ]
    },
    {
      "make": "Tesla",
      "models": [
        "Model 3",
        "Model S",
        "Model X",
        "Model Y"
      ]
    },
    {
      "make": "Toyota",
      "models": [
        "Auris",
        "Aygo",
        "C-HR",
        "Camry",
        "Corolla",
        "Highlander",
        "Hilux",
        "Land Cruiser",
        "Prius",
        "Proace",
        "RAV4",
        "Supra",
        "Yaris",
        "Yaris Cross"
      ]
    },
    {
      "make": "Vauxhall",
      "models": [
        "Astra",
        "Corsa",
        "Crossland",
        "Grandland",
        "Insignia",
        "Mokka",
        "Movano",
        "Vivaro"
      ]
    },
    {
      "make": "Volkswagen",
      "models": [
        "Amarok",
        "Arteon",
        "Caddy",
        "California",
        "Caravelle",
        "Crafter",
        "Golf",
        "ID.3",
        "ID.4",
        "ID.5",
        "ID.Buzz",
        "Multivan",
        "Passat",
        "Polo",
        "T-Cross",
        "T-Roc",
        "Taigo",
        "Tiguan",
        "Touareg",
        "Touran",
        "Transporter"
      ]
    },
    {
      "make": "Volvo",
      "models": [
        "C40",
        "S60",
        "S90",
        "V60",
        "V90",
        "XC40",
        "XC60",
        "XC90"
      ]
    }
  ]
};

/** Sorted make names from the static catalog (excludes Other). */
export function vehicleCatalogMakes(): string[] {
  return VEHICLE_MAKES_MODELS_CATALOG.makes.map((entry) => entry.make);
}

/** Sorted models for a catalog make (empty when unknown / Other). */
export function vehicleCatalogModelsForMake(make: string): string[] {
  const key = make.trim().toLowerCase();
  if (!key || key === VEHICLE_CATALOG_OTHER.toLowerCase()) return [];
  const entry = VEHICLE_MAKES_MODELS_CATALOG.makes.find(
    (m) => m.make.toLowerCase() === key,
  );
  return entry ? [...entry.models] : [];
}

function equalsIgnoreCase(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * Map a stored make to a catalog option value.
 * Unknown makes resolve to Other so existing free-text values stay editable.
 */
export function vehicleMakeSelectValue(make: string | null | undefined): string {
  const trimmed = (make ?? "").trim();
  if (!trimmed) return "";
  const hit = vehicleCatalogMakes().find((m) => equalsIgnoreCase(m, trimmed));
  return hit ?? VEHICLE_CATALOG_OTHER;
}

/**
 * Map a stored model to a catalog option for the given make.
 * When make is Other or model is not listed, returns Other.
 */
export function vehicleModelSelectValue(
  make: string | null | undefined,
  model: string | null | undefined,
): string {
  const trimmedModel = (model ?? "").trim();
  if (!trimmedModel) return "";
  const makeValue = vehicleMakeSelectValue(make);
  if (!makeValue || makeValue === VEHICLE_CATALOG_OTHER) return VEHICLE_CATALOG_OTHER;
  const hit = vehicleCatalogModelsForMake(makeValue).find((m) =>
    equalsIgnoreCase(m, trimmedModel),
  );
  return hit ?? VEHICLE_CATALOG_OTHER;
}
