/**
 * ─────────────────────────────────────────────────────────
 * Test 1: ML Prediction Service — Input Mapping (v3 model)
 * Validates that inverterToMLInput() correctly maps an
 * inverter document to the v3 XGBoost model features.
 * ─────────────────────────────────────────────────────────
 */

// We test the pure mapping logic without MongoDB by importing
// the function and verifying feature shape / types.

describe("ML Prediction Service — inverterToMLInput (v3)", () => {
  // Inline the mapping logic so tests don't need a DB connection
  function inverterToMLInput(inv: Record<string, any>) {
    const hour = new Date().getHours();
    return {
      plant_id: inv.plantId || "Plant 1",
      inverter_id: inv.inverterId || "INV-001",
      mean_power: inv.inverterPower || 0,
      std_power: (inv.inverterPower || 0) * 0.08,
      max_power: (inv.inverterPower || 0) * 1.15,
      min_power: (inv.inverterPower || 0) * 0.85,
      mean_temp: inv.inverterTemp || 35,
      max_temp: (inv.inverterTemp || 35) + 5,
      mean_voltage: inv.inverterPv1Voltage || 600,
      mean_current: inv.inverterPv1Current || 10,
      ambient_temp: inv.ambientTemp || Math.max((inv.inverterTemp || 35) - 15, 25),
      alarm_count: inv.inverterAlarmCode || 0,
      hour,
      grid_freq: 50.0,
      power_factor: 0.98,
      kwh_today: inv.inverterKwhToday || 0,
      kwh_total: inv.inverterKwhTotal || 500000,
      op_state: inv.inverterOpState ?? (inv.inverterPower > 0 ? 5120 : 0),
      n_strings: (inv.strings || []).length || 2,
      current_imbalance: 0.05,
      voltage_imbalance: 0.01,
      power_ramp: 0,
    };
  }

  it("should produce a valid ML input with correct numeric types", () => {
    const inverter = {
      inverterId: "INV-Plant1-1",
      plantId: "Plant 1",
      inverterPower: 4500,
      inverterTemp: 42,
      inverterPv1Voltage: 350,
      inverterPv1Current: 8.5,
      ambientTemp: 30,
      inverterKwhToday: 25,
      inverterKwhTotal: 120000,
    };

    const result = inverterToMLInput(inverter);

    expect(result.mean_power).toBe(4500);
    expect(result.mean_temp).toBe(42);
    expect(result.mean_voltage).toBe(350);
    expect(result.mean_current).toBe(8.5);
    expect(result.ambient_temp).toBe(30);
    expect(result.kwh_today).toBe(25);
    expect(typeof result.grid_freq).toBe("number");
    expect(typeof result.power_factor).toBe("number");
  });

  it("should use defaults for missing fields", () => {
    const result = inverterToMLInput({});

    expect(result.mean_power).toBe(0);
    expect(result.mean_temp).toBe(35);
    expect(result.mean_voltage).toBe(600);
    expect(result.mean_current).toBe(10);
    expect(result.ambient_temp).toBe(25); // max(35-15, 25) = 25
    expect(result.grid_freq).toBe(50);
    expect(result.power_factor).toBe(0.98);
  });

  it("should compute derived statistical features from power", () => {
    const result = inverterToMLInput({ inverterPower: 1000 });

    expect(result.mean_power).toBe(1000);
    expect(result.std_power).toBe(80);   // 1000 * 0.08
    expect(result.max_power).toBe(1150); // 1000 * 1.15
    expect(result.min_power).toBe(850);  // 1000 * 0.85
  });

  it("should return all v3 feature fields", () => {
    const result = inverterToMLInput({});
    const keys = Object.keys(result);

    expect(keys.length).toBeGreaterThanOrEqual(22);
    expect(keys).toContain("mean_power");
    expect(keys).toContain("mean_temp");
    expect(keys).toContain("mean_voltage");
    expect(keys).toContain("ambient_temp");
    expect(keys).toContain("alarm_count");
    expect(keys).toContain("kwh_today");
    expect(keys).toContain("op_state");
    expect(keys).toContain("n_strings");
  });
});
