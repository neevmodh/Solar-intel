/**
 * ─────────────────────────────────────────────────────────
 * Test 2: RAG Service — Intent Classification & Entity Extraction
 * Validates that the RAG pipeline correctly identifies
 * plant IDs, inverter IDs, intent, and keywords.
 * ─────────────────────────────────────────────────────────
 */

import { classifyAndExtract } from "@/backend/services/rag.service";

describe("RAG Service — Entity Extraction & Intent Classification", () => {

  it("should extract plant IDs from query", () => {
    const result = classifyAndExtract("What is the status of PLANT-001?");
    expect(result.plantIds).toEqual(["PLANT-001"]);
  });

  it("should extract multiple plant and inverter IDs", () => {
    const result = classifyAndExtract(
      "Compare PLANT-001 and PLANT-002 inverter INV-003"
    );
    expect(result.plantIds).toContain("PLANT-001");
    expect(result.plantIds).toContain("PLANT-002");
    expect(result.inverterIds).toEqual(["INV-003"]);
  });

  it("should be case-insensitive for IDs", () => {
    const result = classifyAndExtract("Check plant-002 and inv-005");
    expect(result.plantIds).toContain("PLANT-002");
    expect(result.inverterIds).toEqual(["INV-005"]);
  });

  it("should extract relevant keywords", () => {
    const result = classifyAndExtract(
      "What is the risk level and temperature of PLANT-001?"
    );
    expect(result.keywords).toContain("risk");
    expect(result.keywords).toContain("temperature");
  });

  it("should extract maintenance keywords", () => {
    const result = classifyAndExtract("Generate maintenance tickets for repairs");
    expect(result.keywords).toContain("maintenance");
  });

  it("should return empty arrays for generic greetings", () => {
    const result = classifyAndExtract("Hello, how are you?");
    expect(result.plantIds).toEqual([]);
    expect(result.inverterIds).toEqual([]);
    expect(result.intent).toBe("greeting");
  });

  it("should deduplicate repeated IDs", () => {
    const result = classifyAndExtract(
      "PLANT-001 status and PLANT-001 power output"
    );
    expect(result.plantIds).toEqual(["PLANT-001"]);
  });

  // ─── NEW: Intent Classification Tests ───

  it("should classify risk-related queries", () => {
    const result = classifyAndExtract("Which inverters have critical failure risk?");
    expect(result.intent).toBe("risk_assessment");
  });

  it("should classify maintenance queries", () => {
    const result = classifyAndExtract("What maintenance actions are scheduled?");
    expect(result.intent).toBe("maintenance_query");
  });

  it("should classify performance queries", () => {
    const result = classifyAndExtract("What is the power output of PLANT-002?");
    expect(result.intent).toBe("performance_query");
  });

  it("should classify comparison queries", () => {
    const result = classifyAndExtract("Compare PLANT-001 vs PLANT-002");
    expect(result.intent).toBe("comparison");
  });

  it("should classify fleet summary queries", () => {
    const result = classifyAndExtract("Give me an overview of all plants");
    expect(result.intent).toBe("fleet_summary");
  });

  it("should classify anomaly queries", () => {
    const result = classifyAndExtract("Are there any anomalies or unusual spikes?");
    expect(result.intent).toBe("anomaly_query");
  });

  it("should classify trend queries", () => {
    const result = classifyAndExtract("Show recent trends in power output");
    expect(result.intent).toBe("trend_query");
  });

  // ─── Location → Plant Mapping ───

  it("should map location names to plant IDs", () => {
    const result = classifyAndExtract("How is the solar plant in Rajasthan performing?");
    expect(result.plantIds).toContain("PLANT-001");
  });

  it("should map Maharashtra to PLANT-004", () => {
    const result = classifyAndExtract("Check Maharashtra plant health status");
    expect(result.plantIds).toContain("PLANT-004");
  });

  // ─── Time Range Extraction ───

  it("should extract 24h time range", () => {
    const result = classifyAndExtract("What happened in the last 24h?");
    expect(result.timeRange).toBe("24h");
  });

  it("should extract 7d time range", () => {
    const result = classifyAndExtract("Show me the past week's performance");
    expect(result.timeRange).toBe("7d");
  });

  it("should extract 30d time range", () => {
    const result = classifyAndExtract("What are the trends over the past month?");
    expect(result.timeRange).toBe("30d");
  });

  // ─── Search Terms & Specific Entity Detection ───

  it("should extract block name as a search term", () => {
    const result = classifyAndExtract("Which inverter in Block Z has elevated risk?");
    expect(result.searchTerms).toContain("block z");
    expect(result.mentionsSpecificEntity).toBe(true);
  });

  it("should detect mentionsSpecificEntity when plant ID is given", () => {
    const result = classifyAndExtract("What is the status of PLANT-001?");
    expect(result.mentionsSpecificEntity).toBe(true);
  });

  it("should NOT set mentionsSpecificEntity for fleet-wide queries", () => {
    const result = classifyAndExtract("Give me an overview of all plants");
    expect(result.mentionsSpecificEntity).toBe(false);
  });

  it("should extract quoted names as search terms", () => {
    const result = classifyAndExtract('Show me inverter "Aurora-7 Block A" details');
    expect(result.searchTerms).toContain("Aurora-7 Block A");
  });
});
