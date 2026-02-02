export type NinebotModelInfo = {
  model: string;
  generation: number;
};

export function detectNinebotModel(serial: string): NinebotModelInfo {
  if (!serial) return { model: "unknown", generation: 0 };

  if (serial.startsWith("N4G")) {
    return { model: "G30 / G30D", generation: 1 };
  }

  if (serial.startsWith("N5G")) {
    return { model: "Max G2", generation: 2 };
  }

  return { model: "Ninebot (unknown)", generation: 0 };
}