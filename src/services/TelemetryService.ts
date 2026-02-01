// Telemetrie-Service für Echtzeit-Daten
import { 
  TelemetryData, 
  BMSData, 
  DEFAULT_TELEMETRY, 
  DEFAULT_BMS,
  ScooterModel,
  PROTOCOL
} from '@/types/scooter';
import { bleManager } from './BleManager';
import { XiaomiProtocol } from './XiaomiProtocol';
import { NinebotProtocol } from './NinebotProtocol';

type TelemetryListener = (data: TelemetryData) => void;
type BMSListener = (data: BMSData) => void;

class TelemetryService {
  private static instance: TelemetryService;
  private telemetry: TelemetryData = { ...DEFAULT_TELEMETRY };
  private bms: BMSData = { ...DEFAULT_BMS };
  private pollingInterval: NodeJS.Timeout | null = null;
  private telemetryListeners: Set<TelemetryListener> = new Set();
  private bmsListeners: Set<BMSListener> = new Set();
  private currentModel: ScooterModel | null = null;
  private dataBuffer: Uint8Array = new Uint8Array(0);

  private constructor() {
    // Auf BLE-Daten lauschen
    bleManager.onData(this.handleData.bind(this));
  }

  static getInstance(): TelemetryService {
    if (!TelemetryService.instance) {
      TelemetryService.instance = new TelemetryService();
    }
    return TelemetryService.instance;
  }

  // Polling starten
  startPolling(model: ScooterModel, intervalMs: number = 300): void {
    this.currentModel = model;
    this.stopPolling();

    console.log(`[Telemetry] Polling gestartet (${intervalMs}ms)`);

    this.pollingInterval = setInterval(() => {
      this.requestTelemetry();
    }, intervalMs);

    // Sofort erste Anfrage senden
    this.requestTelemetry();
  }

  // Polling stoppen
  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log('[Telemetry] Polling gestoppt');
    }
  }

  // Telemetrie anfordern
  private async requestTelemetry(): Promise<void> {
    if (!this.currentModel) return;

    try {
      if (this.currentModel === 'xiaomi-1s') {
        await bleManager.write(XiaomiProtocol.createMotorInfoRequest());
      } else {
        await bleManager.write(NinebotProtocol.createTelemetryRequest());
      }
    } catch (error) {
      console.error('[Telemetry] Anfrage fehlgeschlagen:', error);
    }
  }

  // BMS-Daten anfordern
  async requestBMSData(): Promise<void> {
    if (!this.currentModel) return;

    try {
      if (this.currentModel === 'ninebot-g30') {
        await bleManager.write(NinebotProtocol.createBatteryRequest());
      }
      // Xiaomi BMS-Anfrage würde hier hinzugefügt
    } catch (error) {
      console.error('[Telemetry] BMS-Anfrage fehlgeschlagen:', error);
    }
  }

  // Eingehende Daten verarbeiten
  private handleData(data: Uint8Array): void {
    // Buffer für fragmentierte Pakete
    this.dataBuffer = this.concatBuffers(this.dataBuffer, data);

    // Versuchen Pakete zu parsen
    this.parseBuffer();
  }

  // Buffer parsen
  private parseBuffer(): void {
    while (this.dataBuffer.length >= 6) {
      // Header suchen
      const xiaomiHeader = this.findHeader(
        this.dataBuffer, 
        PROTOCOL.xiaomi.headerDecrypted
      );
      const ninebotHeader = this.findHeader(
        this.dataBuffer, 
        PROTOCOL.ninebot.header
      );

      let headerIndex = -1;
      let isXiaomi = false;

      if (xiaomiHeader >= 0 && (ninebotHeader < 0 || xiaomiHeader <= ninebotHeader)) {
        headerIndex = xiaomiHeader;
        isXiaomi = true;
      } else if (ninebotHeader >= 0) {
        headerIndex = ninebotHeader;
        isXiaomi = false;
      }

      if (headerIndex < 0) {
        this.dataBuffer = new Uint8Array(0);
        return;
      }

      // Daten vor Header verwerfen
      if (headerIndex > 0) {
        this.dataBuffer = this.dataBuffer.slice(headerIndex);
      }

      // Länge prüfen
      const length = this.dataBuffer[2];
      const totalLength = length + 6; // Header(2) + Len(1) + Payload + CRC(2)

      if (this.dataBuffer.length < totalLength) {
        return; // Warten auf mehr Daten
      }

      // Paket extrahieren
      const packet = this.dataBuffer.slice(0, totalLength);
      this.dataBuffer = this.dataBuffer.slice(totalLength);

      // Paket verarbeiten
      if (isXiaomi) {
        this.processXiaomiPacket(packet);
      } else {
        this.processNinebotPacket(packet);
      }
    }
  }

  // Xiaomi-Paket verarbeiten
  private processXiaomiPacket(data: Uint8Array): void {
    if (!XiaomiProtocol.validateFrame(data)) {
      console.warn('[Telemetry] Xiaomi CRC-Fehler');
      return;
    }

    const command = XiaomiProtocol.getResponseType(data);

    switch (command) {
      case PROTOCOL.xiaomi.commands.motorInfo:
        this.updateTelemetry(XiaomiProtocol.decodeMotorInfo(data));
        break;
      case PROTOCOL.xiaomi.commands.tripInfo:
        this.updateTelemetry(XiaomiProtocol.decodeTripInfo(data));
        break;
      case PROTOCOL.xiaomi.commands.range:
        this.updateTelemetry(XiaomiProtocol.decodeRange(data));
        break;
    }
  }

  // Ninebot-Paket verarbeiten
  private processNinebotPacket(data: Uint8Array): void {
    if (!NinebotProtocol.validateFrame(data)) {
      console.warn('[Telemetry] Ninebot CRC-Fehler');
      return;
    }

    const command = NinebotProtocol.getResponseType(data);

    switch (command) {
      case PROTOCOL.ninebot.commands.telemetry:
        this.updateTelemetry(NinebotProtocol.decodeTelemetry(data));
        break;
      case PROTOCOL.ninebot.commands.batteryDetails:
        this.updateBMS(NinebotProtocol.decodeBatteryDetails(data));
        break;
    }
  }

  // Telemetrie aktualisieren
  private updateTelemetry(partial: Partial<TelemetryData>): void {
    this.telemetry = { ...this.telemetry, ...partial, timestamp: Date.now() };
    this.notifyTelemetryListeners();
  }

  // BMS aktualisieren
  private updateBMS(partial: Partial<BMSData>): void {
    this.bms = { ...this.bms, ...partial };
    this.notifyBMSListeners();
  }

  // Listener benachrichtigen
  private notifyTelemetryListeners(): void {
    this.telemetryListeners.forEach(listener => listener(this.telemetry));
  }

  private notifyBMSListeners(): void {
    this.bmsListeners.forEach(listener => listener(this.bms));
  }

  // Listener registrieren
  onTelemetryUpdate(listener: TelemetryListener): () => void {
    this.telemetryListeners.add(listener);
    // Sofort aktuellen Wert senden
    listener(this.telemetry);
    return () => this.telemetryListeners.delete(listener);
  }

  onBMSUpdate(listener: BMSListener): () => void {
    this.bmsListeners.add(listener);
    listener(this.bms);
    return () => this.bmsListeners.delete(listener);
  }

  // Getter
  getTelemetry(): TelemetryData {
    return { ...this.telemetry };
  }

  getBMS(): BMSData {
    return { ...this.bms };
  }

  // Reset
  reset(): void {
    this.telemetry = { ...DEFAULT_TELEMETRY };
    this.bms = { ...DEFAULT_BMS };
    this.stopPolling();
    this.currentModel = null;
    this.dataBuffer = new Uint8Array(0);
  }

  // Hilfsfunktionen
  private findHeader(buffer: Uint8Array, header: readonly number[]): number {
    for (let i = 0; i <= buffer.length - header.length; i++) {
      if (buffer[i] === header[0] && buffer[i + 1] === header[1]) {
        return i;
      }
    }
    return -1;
  }

  private concatBuffers(a: Uint8Array, b: Uint8Array): Uint8Array {
    const result = new Uint8Array(a.length + b.length);
    result.set(a, 0);
    result.set(b, a.length);
    return result;
  }
}

export const telemetryService = TelemetryService.getInstance();
export default telemetryService;
