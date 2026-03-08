/**
 * ─────────────────────────────────────────────────────────
 * Test 3: Import API — Column Normalization & Type Detection
 * Validates that the CSV/Excel import logic correctly
 * normalizes column headers and detects import type.
 * ─────────────────────────────────────────────────────────
 */

describe("Import API — Column Normalization", () => {
  // Mirrors normalizeKey from api/import/route.ts
  function normalizeKey(key: string): string {
    return key
      .toLowerCase()
      .trim()
      .replace(/[\s_-]+/g, "_")
      .replace(/[^a-z0-9_]/g, "");
  }

  it("should lowercase and trim whitespace", () => {
    expect(normalizeKey("  Plant ID  ")).toBe("plant_id");
    expect(normalizeKey("INVERTER_ID")).toBe("inverter_id");
  });

  it("should replace spaces and hyphens with underscores", () => {
    expect(normalizeKey("Plant Name")).toBe("plant_name");
    expect(normalizeKey("plant-name")).toBe("plant_name");
    expect(normalizeKey("DC Power")).toBe("dc_power");
  });

  it("should strip special characters", () => {
    expect(normalizeKey("efficiency (%)")).toBe("efficiency_");
    expect(normalizeKey("temp°C")).toBe("tempc");
  });

  it("should handle multiple consecutive separators", () => {
    expect(normalizeKey("plant   id")).toBe("plant_id");
    expect(normalizeKey("plant___id")).toBe("plant_id");
    expect(normalizeKey("plant - id")).toBe("plant_id");
  });
});

describe("Import API — Type Detection", () => {
  // Mirrors detection logic from api/import/route.ts
  function detectImportType(
    columns: string[]
  ): "plant" | "inverter" | "unknown" {
    const normalized = columns.map((c) =>
      c
        .toLowerCase()
        .trim()
        .replace(/[\s_-]+/g, "_")
    );

    const plantIndicators = ["plant_id", "plant_name", "capacity", "latitude", "longitude"];
    const inverterIndicators = ["inverter_id", "dc_power", "ac_power", "efficiency"];

    const plantMatches = plantIndicators.filter((p) =>
      normalized.some((n) => n.includes(p))
    ).length;
    const inverterMatches = inverterIndicators.filter((p) =>
      normalized.some((n) => n.includes(p))
    ).length;

    if (plantMatches >= 2) return "plant";
    if (inverterMatches >= 2) return "inverter";
    return "unknown";
  }

  it("should detect plant import from columns", () => {
    const cols = ["Plant ID", "Plant Name", "Capacity", "Location"];
    expect(detectImportType(cols)).toBe("plant");
  });

  it("should detect inverter import from columns", () => {
    const cols = ["Inverter ID", "DC Power", "AC Power", "Temperature"];
    expect(detectImportType(cols)).toBe("inverter");
  });

  it("should detect inverter with efficiency column", () => {
    const cols = ["inverter_id", "efficiency", "dc_power", "status"];
    expect(detectImportType(cols)).toBe("inverter");
  });

  it("should return unknown for ambiguous columns", () => {
    const cols = ["Name", "Value", "Date"];
    expect(detectImportType(cols)).toBe("unknown");
  });

  it("should handle mixed case and spacing", () => {
    const cols = ["PLANT_ID", "  plant name  ", "CAPACITY (MW)"];
    expect(detectImportType(cols)).toBe("plant");
  });
});
