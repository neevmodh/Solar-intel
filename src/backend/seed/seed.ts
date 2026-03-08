import { connectDB } from "@/backend/config";
import { Plant, Inverter, TelemetryRecord } from "@/backend/models";
import logger from "@/backend/utils/logger";

const PLANT_SEED_DATA = [
  {
    plantId: "Plant 1",
    name: "Plant 1",
    location: "Rajasthan, India",
    latitude: 26.9124,
    longitude: 70.9001,
    capacity: 0.5,
    area: 2.5,
    commissionDate: "2024-06-01",
    status: "active" as const,
    description: "Utility-scale solar park in Rajasthan with 23 inverters.",
  },
  {
    plantId: "Plant 2",
    name: "Plant 2",
    location: "Gujarat, India",
    latitude: 23.0225,
    longitude: 72.5714,
    capacity: 0.39,
    area: 1.8,
    commissionDate: "2024-03-15",
    status: "active" as const,
    description: "Mixed fleet installation with 5 inverters.",
  },
  {
    plantId: "Plant 3",
    name: "Plant 3",
    location: "Karnataka, India",
    latitude: 12.9716,
    longitude: 77.5946,
    capacity: 0.625,
    area: 3.2,
    commissionDate: "2024-08-01",
    status: "active" as const,
    description: "Modern installation with 1 inverter plus rooftop arrays.",
  },
];

const INVERTER_SEED_DATA = [
  {
    inverterId: "INV-Plant1-1", plantId: "Plant 1",
    name: "Inverter 1", location: "Rajasthan, India",
    status: "healthy",
    inverterPower: 248500, inverterPv1Power: 136675, inverterPv1Voltage: 620, inverterPv1Current: 9.2,
    inverterPv2Power: 111825, inverterPv2Voltage: 618, inverterPv2Current: 9.1,
    inverterKwhToday: 1842, inverterKwhTotal: 1245600, inverterTemp: 42,
    inverterOpState: 5120, inverterAlarmCode: 0, inverterLimitPercent: 0,
    ambientTemp: 36, meterActivePower: 248.5,
    riskScore: 8, performanceRatio: 94.2, efficiency: 98.1,
    uptime: 99.7, inverterModel: "SolarEdge SE250K", capacity: 250,
    installDate: "2024-06-15", firmware: "v4.12.3",
    strings: [
      { stringId: "S1", voltage: 620, current: 9.2, power: 5704, status: "healthy" },
      { stringId: "S2", voltage: 618, current: 9.1, power: 5624, status: "healthy" },
    ],
  },
  {
    inverterId: "INV-Plant1-2", plantId: "Plant 1",
    name: "Inverter 2", location: "Rajasthan, India",
    status: "healthy",
    inverterPower: 235100, inverterPv1Power: 129305, inverterPv1Voltage: 615, inverterPv1Current: 8.9,
    inverterPv2Power: 105795, inverterPv2Voltage: 614, inverterPv2Current: 8.8,
    inverterKwhToday: 1756, inverterKwhTotal: 1198300, inverterTemp: 44,
    inverterOpState: 5120, inverterAlarmCode: 0, inverterLimitPercent: 0,
    ambientTemp: 35, meterActivePower: 235.1,
    riskScore: 12, performanceRatio: 91.8, efficiency: 97.6,
    uptime: 99.2, inverterModel: "SolarEdge SE250K", capacity: 250,
    installDate: "2024-06-15", firmware: "v4.12.3",
    strings: [
      { stringId: "S1", voltage: 616, current: 9.0, power: 5544, status: "healthy" },
      { stringId: "S2", voltage: 614, current: 8.9, power: 5465, status: "warning" },
    ],
  },
  {
    inverterId: "INV-Plant2-1", plantId: "Plant 2",
    name: "Inverter 1", location: "Gujarat, India",
    status: "warning",
    inverterPower: 187300, inverterPv1Power: 103015, inverterPv1Voltage: 580, inverterPv1Current: 8.4,
    inverterPv2Power: 84285, inverterPv2Voltage: 560, inverterPv2Current: 7.2,
    inverterKwhToday: 1320, inverterKwhTotal: 945700, inverterTemp: 58,
    inverterOpState: 5120, inverterAlarmCode: 0, inverterLimitPercent: 0,
    ambientTemp: 38, meterActivePower: 187.3,
    riskScore: 45, performanceRatio: 78.4, efficiency: 91.4,
    uptime: 96.1, inverterModel: "Huawei SUN2000-215", capacity: 215,
    installDate: "2024-03-22", firmware: "v3.8.1",
    strings: [
      { stringId: "S1", voltage: 582, current: 8.4, power: 4889, status: "healthy" },
      { stringId: "S2", voltage: 560, current: 7.2, power: 4032, status: "warning" },
    ],
  },
  {
    inverterId: "INV-Plant2-2", plantId: "Plant 2",
    name: "Inverter 2", location: "Gujarat, India",
    status: "critical",
    inverterPower: 98600, inverterPv1Power: 54230, inverterPv1Voltage: 480, inverterPv1Current: 6.2,
    inverterPv2Power: 44370, inverterPv2Voltage: 440, inverterPv2Current: 4.1,
    inverterKwhToday: 624, inverterKwhTotal: 712300, inverterTemp: 72,
    inverterOpState: 5120, inverterAlarmCode: 1, inverterLimitPercent: 0,
    ambientTemp: 40, meterActivePower: 98.6,
    riskScore: 87, performanceRatio: 52.1, efficiency: 78.2,
    uptime: 88.4, inverterModel: "ABB PVS-175", capacity: 175,
    installDate: "2023-11-08", firmware: "v2.9.7",
    strings: [
      { stringId: "S1", voltage: 485, current: 6.2, power: 3007, status: "warning" },
      { stringId: "S2", voltage: 440, current: 4.1, power: 1804, status: "critical" },
    ],
  },
  {
    inverterId: "INV-Plant3-1", plantId: "Plant 3",
    name: "Inverter 1", location: "Karnataka, India",
    status: "healthy",
    inverterPower: 262400, inverterPv1Power: 144320, inverterPv1Voltage: 640, inverterPv1Current: 9.5,
    inverterPv2Power: 118080, inverterPv2Voltage: 638, inverterPv2Current: 9.4,
    inverterKwhToday: 1920, inverterKwhTotal: 680400, inverterTemp: 38,
    inverterOpState: 5120, inverterAlarmCode: 0, inverterLimitPercent: 0,
    ambientTemp: 32, meterActivePower: 262.4,
    riskScore: 5, performanceRatio: 96.7, efficiency: 98.8,
    uptime: 99.9, inverterModel: "SMA Sunny Tripower 250", capacity: 250,
    installDate: "2025-01-10", firmware: "v5.1.0",
    strings: [
      { stringId: "S1", voltage: 642, current: 9.5, power: 6099, status: "healthy" },
      { stringId: "S2", voltage: 638, current: 9.4, power: 5997, status: "healthy" },
    ],
  },
];

function generateTelemetry(inverterId: string, plantId: string, basePower: number, baseTemp: number, basePv1V: number) {
  const records = [];
  const now = new Date();
  for (let day = 29; day >= 0; day--) {
    for (let hour = 6; hour <= 18; hour++) {
      const ts = new Date(now);
      ts.setDate(ts.getDate() - day);
      ts.setHours(hour, 0, 0, 0);
      const solarFactor = Math.sin(((hour - 6) / 12) * Math.PI);
      const power = basePower * solarFactor + (Math.random() - 0.5) * 20;
      records.push({
        inverterId, plantId, timestamp: ts,
        inverterPower: Math.max(0, power),
        inverterPv1Power: Math.max(0, power * 0.55),
        inverterPv1Voltage: basePv1V + (Math.random() - 0.5) * 20,
        inverterPv1Current: Math.max(0, power * 0.55 / (basePv1V || 1)),
        inverterPv2Power: Math.max(0, power * 0.45),
        inverterPv2Voltage: (basePv1V - 5) + (Math.random() - 0.5) * 20,
        inverterPv2Current: Math.max(0, power * 0.45 / (basePv1V || 1)),
        inverterKwhToday: Math.max(0, power * solarFactor * 0.8),
        inverterKwhTotal: 500000 + Math.random() * 200000,
        inverterTemp: baseTemp + (Math.random() - 0.5) * 6 + solarFactor * 5,
        inverterOpState: power > 10 ? 5120 : 0,
        inverterAlarmCode: 0,
        inverterLimitPercent: 0,
        ambientTemp: 28 + Math.sin(((hour - 6) / 24) * Math.PI * 2) * 8,
        meterActivePower: Math.max(0, power / 1000),
      });
    }
  }
  return records;
}

export async function seedDatabase(): Promise<{ plants: number; inverters: number; telemetry: number }> {
  await connectDB();
  const existingInverters = await Inverter.countDocuments();
  const existingPlants = await Plant.countDocuments();
  if (existingInverters > 0 && existingPlants > 0) {
    logger.info("Database already seeded, skipping", { existingPlants, existingInverters });
    return { plants: existingPlants, inverters: existingInverters, telemetry: 0 };
  }
  await Plant.deleteMany({});
  await Inverter.deleteMany({});
  await TelemetryRecord.deleteMany({});

  const plantDocs = PLANT_SEED_DATA.map((p) => ({
    ...p, commissionDate: new Date(p.commissionDate),
    inverterCount: INVERTER_SEED_DATA.filter((inv) => inv.plantId === p.plantId).length,
  }));
  await Plant.insertMany(plantDocs);
  logger.info("Plants seeded", { count: plantDocs.length });

  const inverterDocs = INVERTER_SEED_DATA.map((inv) => ({
    ...inv, installDate: new Date(inv.installDate), lastUpdated: new Date(),
  }));
  await Inverter.insertMany(inverterDocs);
  logger.info("Inverters seeded", { count: inverterDocs.length });

  const allTelemetry: ReturnType<typeof generateTelemetry> = [];
  // [inverterId, plantId, basePower(W), baseTemp(C), basePv1V]
  const baseParams: [string, string, number, number, number][] = [
    ["INV-Plant1-1", "Plant 1", 248500, 42, 620],
    ["INV-Plant1-2", "Plant 1", 235100, 44, 615],
    ["INV-Plant2-1", "Plant 2", 187300, 58, 580],
    ["INV-Plant2-2", "Plant 2", 98600, 72, 480],
    ["INV-Plant3-1", "Plant 3", 262400, 38, 640],
  ];
  for (const [id, pid, power, temp, v] of baseParams) {
    allTelemetry.push(...generateTelemetry(id, pid, power, temp, v));
  }
  for (let i = 0; i < allTelemetry.length; i += 500) {
    await TelemetryRecord.insertMany(allTelemetry.slice(i, i + 500), { ordered: false });
  }
  logger.info("Telemetry seeded", { count: allTelemetry.length });
  return { plants: plantDocs.length, inverters: inverterDocs.length, telemetry: allTelemetry.length };
}
