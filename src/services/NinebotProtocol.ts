// Ninebot G30 Protokoll-Dekodierung
import { TelemetryData, BMSData, PROTOCOL, voltageToPercent } from '@/types/scooter';

export class NinebotProtocol {
  // CRC16 Berechnung (Ninebot-spezifisch)
  static calculateCRC16(data: Uint8Array): number {
    let crc = 0;
    
    for (let i = 0; i < data.length; i++) {
      crc ^= data[i];
      for (let j = 0; j < 8; j++) {
        if (crc & 1) {
          crc = (crc >> 1) ^ 0xa001;
        } else {
          crc >>= 1;
        }
      }
    }
    
    return crc;
  }

  // Frame validieren
  static validateFrame(data: Uint8Array): boolean {
    if (data.length < 9) return false;
    
    // Header prüfen (5A A5)
    if (data[0] !== PROTOCOL.ninebot.header[0] || 
        data[1] !== PROTOCOL.ninebot.header[1]) {
      return false;
    }
    
    const length = data[2];
    if (data.length < length + 6) return false;
    
    // CRC prüfen
    const payload = data.slice(2, data.length - 2);
    const receivedCRC = (data[data.length - 1] << 8) | data[data.length - 2];
    const calculatedCRC = this.calculateCRC16(payload);
    
    return receivedCRC === calculatedCRC;
  }

  // Telemetrie Request erstellen (0x1E)
  static createTelemetryRequest(): Uint8Array {
    return this.createFrame(0x3e, 0x21, PROTOCOL.ninebot.commands.telemetry, new Uint8Array([0x02]));
  }

  // Battery Details Request erstellen (0x31)
  static createBatteryRequest(): Uint8Array {
    return this.createFrame(0x3e, 0x22, PROTOCOL.ninebot.commands.batteryDetails, new Uint8Array([0x10]));
  }

  // Frame erstellen
  static createFrame(src: number, dst: number, cmd: number, params: Uint8Array): Uint8Array {
    const length = params.length + 2;
    const payload = new Uint8Array([length, src, dst, cmd, ...params]);
    const crc = this.calculateCRC16(payload);
    
    return new Uint8Array([
      PROTOCOL.ninebot.header[0],
      PROTOCOL.ninebot.header[1],
      ...payload,
      crc & 0xff,
      (crc >> 8) & 0xff,
    ]);
  }

  // Telemetrie Response dekodieren (0x1E)
  static decodeTelemetry(data: Uint8Array): Partial<TelemetryData> {
    if (data.length < 20) {
      console.warn('[Ninebot] Telemetrie-Paket zu kurz:', data.length);
      return {};
    }

    // Payload beginnt nach Header (2) + Length (1) + Src (1) + Dst (1) + Cmd (1)
    const payload = data.slice(6);

    const voltageRaw = this.readUint16LE(payload, 0);
    const voltage = voltageRaw / 100;
    const speedRaw = this.readUint16LE(payload, 2);
    const distanceRaw = this.readUint32LE(payload, 4);
    const currentRaw = this.readInt16LE(payload, 8);
    const temperatureRaw = payload[10];

    return {
      voltage,
      batteryPercent: voltageToPercent(voltage),
      speed: speedRaw / 1000,
      totalDistance: distanceRaw / 1000,
      current: currentRaw / 100,
      controllerTemp: temperatureRaw - 20,
      timestamp: Date.now(),
    };
  }

  // Batterie-Details dekodieren (0x31)
  static decodeBatteryDetails(data: Uint8Array): Partial<BMSData> {
    if (data.length < 30) return {};

    const payload = data.slice(6);
    
    const voltage = this.readUint16LE(payload, 0) / 100;
    const current = this.readInt16LE(payload, 2) / 100;
    const percent = payload[4];
    const temperature = payload[5] - 20;
    const cycles = this.readUint16LE(payload, 6);
    const health = payload[8];

    // Zellspannungen (falls vorhanden)
    const cellVoltages: number[] = [];
    const cellCount = payload[9] || 0;
    
    for (let i = 0; i < cellCount && i < 10; i++) {
      const cellVoltage = this.readUint16LE(payload, 10 + i * 2) / 1000;
      if (cellVoltage > 0 && cellVoltage < 5) {
        cellVoltages.push(cellVoltage);
      }
    }

    return {
      voltage,
      current,
      percent,
      temperature,
      cycles,
      health,
      cellVoltages: cellVoltages.length > 0 ? cellVoltages : undefined,
    };
  }

  // Response-Typ erkennen
  static getResponseType(data: Uint8Array): number | null {
    if (data.length < 6) return null;
    return data[5]; // Command byte
  }

  // Trip-Daten dekodieren
  static decodeTripData(data: Uint8Array): Partial<TelemetryData> {
    if (data.length < 12) return {};

    const payload = data.slice(6);
    
    const tripDistance = this.readUint32LE(payload, 0) / 1000;
    const tripTime = this.readUint16LE(payload, 4);
    const avgSpeed = this.readUint16LE(payload, 6) / 1000;

    return {
      tripDistance,
      tripTime,
      averageSpeed: avgSpeed,
    };
  }

  // Hilfsfunktionen für Little-Endian Lesevorgänge
  private static readUint16LE(data: Uint8Array, offset: number): number {
    if (offset + 1 >= data.length) return 0;
    return data[offset] | (data[offset + 1] << 8);
  }

  private static readInt16LE(data: Uint8Array, offset: number): number {
    const value = this.readUint16LE(data, offset);
    return value > 32767 ? value - 65536 : value;
  }

  private static readUint32LE(data: Uint8Array, offset: number): number {
    if (offset + 3 >= data.length) return 0;
    return (
      data[offset] |
      (data[offset + 1] << 8) |
      (data[offset + 2] << 16) |
      (data[offset + 3] << 24)
    ) >>> 0;
  }
}

export default NinebotProtocol;
