// Xiaomi 1S Protokoll-Dekodierung
import { TelemetryData, BMSData, PROTOCOL } from '@/types/scooter';

export class XiaomiProtocol {
  // CRC16-CCITT Berechnung
  static calculateCRC16(data: Uint8Array): number {
    let crc = 0xffff;
    
    for (let i = 0; i < data.length; i++) {
      crc ^= data[i];
      for (let j = 0; j < 8; j++) {
        if (crc & 1) {
          crc = (crc >> 1) ^ 0x8408;
        } else {
          crc >>= 1;
        }
      }
    }
    
    return crc ^ 0xffff;
  }

  // Frame validieren (CRC prüfen)
  static validateFrame(data: Uint8Array): boolean {
    if (data.length < 6) return false;
    
    const header = [data[0], data[1]];
    if (!this.isValidHeader(header)) return false;
    
    const payloadLength = data[2];
    if (data.length < payloadLength + 6) return false;
    
    const payload = data.slice(2, data.length - 2);
    const receivedCRC = (data[data.length - 1] << 8) | data[data.length - 2];
    const calculatedCRC = this.calculateCRC16(payload);
    
    return receivedCRC === calculatedCRC;
  }

  // Header-Prüfung
  static isValidHeader(header: number[]): boolean {
    return (
      (header[0] === PROTOCOL.xiaomi.headerDecrypted[0] && 
       header[1] === PROTOCOL.xiaomi.headerDecrypted[1]) ||
      (header[0] === PROTOCOL.xiaomi.headerEncrypted[0] && 
       header[1] === PROTOCOL.xiaomi.headerEncrypted[1])
    );
  }

  // Prüfen ob Frame verschlüsselt ist
  static isEncrypted(data: Uint8Array): boolean {
    return data[0] === PROTOCOL.xiaomi.headerEncrypted[0] && 
           data[1] === PROTOCOL.xiaomi.headerEncrypted[1];
  }

  // Motor Info Request erstellen (0xB0)
  static createMotorInfoRequest(): Uint8Array {
    return this.createFrame(0x20, 0x01, PROTOCOL.xiaomi.commands.motorInfo, new Uint8Array([0x20]));
  }

  // Trip Info Request erstellen (0x3A)
  static createTripInfoRequest(): Uint8Array {
    return this.createFrame(0x20, 0x01, PROTOCOL.xiaomi.commands.tripInfo, new Uint8Array([0x04]));
  }

  // Range Request erstellen (0x25)
  static createRangeRequest(): Uint8Array {
    return this.createFrame(0x20, 0x01, PROTOCOL.xiaomi.commands.range, new Uint8Array([0x02]));
  }

  // Frame erstellen
  static createFrame(device: number, type: number, command: number, params: Uint8Array): Uint8Array {
    const length = params.length + 2;
    const payload = new Uint8Array([length, device, type, command, ...params]);
    const crc = this.calculateCRC16(payload);
    
    return new Uint8Array([
      PROTOCOL.xiaomi.headerDecrypted[0],
      PROTOCOL.xiaomi.headerDecrypted[1],
      ...payload,
      crc & 0xff,
      (crc >> 8) & 0xff,
    ]);
  }

  // Motor Info Response dekodieren (0xB0)
  static decodeMotorInfo(data: Uint8Array): Partial<TelemetryData> {
    if (data.length < 22) {
      console.warn('[Xiaomi] Motor Info zu kurz:', data.length);
      return {};
    }

    // Payload beginnt nach Header (2 Bytes) und Länge (1 Byte)
    const payload = data.slice(6);

    const batteryPercent = this.readUint16LE(payload, 8);
    const speedRaw = this.readUint16LE(payload, 10);
    const avgSpeedRaw = this.readUint16LE(payload, 12);
    const totalDistanceRaw = this.readUint32LE(payload, 14);
    const controllerTempRaw = this.readUint16LE(payload, 20);

    return {
      batteryPercent: Math.min(100, Math.max(0, batteryPercent)),
      speed: speedRaw / 1000,
      averageSpeed: avgSpeedRaw / 1000,
      totalDistance: totalDistanceRaw / 1000,
      controllerTemp: controllerTempRaw / 10,
      timestamp: Date.now(),
    };
  }

  // Trip Info dekodieren (0x3A)
  static decodeTripInfo(data: Uint8Array): Partial<TelemetryData> {
    if (data.length < 10) return {};

    const payload = data.slice(6);
    const tripTime = this.readUint16LE(payload, 0);
    const tripDistance = this.readUint16LE(payload, 2);

    return {
      tripTime,
      tripDistance: tripDistance / 1000,
    };
  }

  // Range dekodieren (0x25)
  static decodeRange(data: Uint8Array): Partial<TelemetryData> {
    if (data.length < 8) return {};

    const payload = data.slice(6);
    const range = this.readUint16LE(payload, 0);

    return {
      estimatedRange: range / 100,
    };
  }

  // BMS-Daten dekodieren
  static decodeBMS(data: Uint8Array): Partial<BMSData> {
    if (data.length < 12) return {};

    const payload = data.slice(6);
    const voltage = this.readUint16LE(payload, 0) / 100;
    const current = this.readInt16LE(payload, 2) / 100;
    const percent = payload[4];
    const temperature = payload[5] - 20;

    return {
      voltage,
      current,
      percent,
      temperature,
    };
  }

  // Response-Typ erkennen
  static getResponseType(data: Uint8Array): number | null {
    if (data.length < 6) return null;
    return data[5]; // Command byte
  }

  // Hilfsfunktionen für Little-Endian Lesevorgänge
  private static readUint16LE(data: Uint8Array, offset: number): number {
    return data[offset] | (data[offset + 1] << 8);
  }

  private static readInt16LE(data: Uint8Array, offset: number): number {
    const value = this.readUint16LE(data, offset);
    return value > 32767 ? value - 65536 : value;
  }

  private static readUint32LE(data: Uint8Array, offset: number): number {
    return (
      data[offset] |
      (data[offset + 1] << 8) |
      (data[offset + 2] << 16) |
      (data[offset + 3] << 24)
    ) >>> 0;
  }
}

export default XiaomiProtocol;
