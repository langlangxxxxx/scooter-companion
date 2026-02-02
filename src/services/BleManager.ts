// BLE Manager Service für ScooterConnect
import { BleClient, BleService, ScanResult } from '@capacitor-community/bluetooth-le';
import { 
  ScooterDevice, 
  ScooterModel, 
  BLE_UUIDS, 
  ConnectionState 
} from '@/types/scooter';

type ConnectionListener = (state: ConnectionState) => void;
type DataListener = (data: Uint8Array) => void;

type BleWriteMode = 'withResponse' | 'withoutResponse';

type BleConnectionProfile = {
  service: string;
  rx: string;
  tx: string;
  writeMode: BleWriteMode;
};

type BleProfileCandidate = {
  service: string;
  rx: string;
  tx: string;
  defaultWriteMode: BleWriteMode;
};

const NUS_PROFILE: BleProfileCandidate = {
  service: BLE_UUIDS.xiaomi.service,
  rx: BLE_UUIDS.xiaomi.rx,
  tx: BLE_UUIDS.xiaomi.tx,
  defaultWriteMode: 'withResponse',
};

const NINEBOT_PROFILE: BleProfileCandidate = {
  service: BLE_UUIDS.ninebot.service,
  rx: BLE_UUIDS.ninebot.read,
  tx: BLE_UUIDS.ninebot.write,
  defaultWriteMode: 'withResponse',
};

const normalizeUuid = (uuid?: string | null): string => (uuid ?? '').toLowerCase();

const matchesUuid = (left?: string | null, right?: string | null): boolean =>
  normalizeUuid(left) === normalizeUuid(right);

const findService = (services: BleService[], uuid: string): BleService | undefined =>
  services.find(service => matchesUuid(service.uuid, uuid));

const hasNotify = (properties: BleService['characteristics'][number]['properties']): boolean =>
  properties.notify || properties.indicate;

const hasWrite = (properties: BleService['characteristics'][number]['properties']): boolean =>
  properties.write || properties.writeWithoutResponse;

const pickCharacteristic = (
  service: BleService,
  preferredUuid: string,
  predicate: (properties: BleService['characteristics'][number]['properties']) => boolean
) => {
  const preferred = service.characteristics.find(
    characteristic => matchesUuid(characteristic.uuid, preferredUuid) && predicate(characteristic.properties)
  );

  if (preferred) return preferred;

  return service.characteristics.find(characteristic => predicate(characteristic.properties));
};

export const detectScooterModel = (
  name?: string,
  uuids?: string[]
): ScooterModel | null => {
  const normalizedName = name?.toLowerCase() ?? '';
  const normalizedUuids = (uuids ?? []).map(uuid => uuid.toLowerCase());

  const isNinebotName = ['ninebot', 'g30', 'segway', 'max', 'g2'].some(fragment =>
    normalizedName.includes(fragment)
  );
  const isXiaomiName = ['mi scooter', 'm365', 'xiaomi', '1s'].some(fragment =>
    normalizedName.includes(fragment)
  );

  if (isNinebotName) return 'ninebot-g30';
  if (isXiaomiName) return 'xiaomi-1s';

  if (normalizedUuids.includes(normalizeUuid(BLE_UUIDS.ninebot.service))) {
    return 'ninebot-g30';
  }

  if (
    normalizedUuids.includes(normalizeUuid(BLE_UUIDS.xiaomi.service)) ||
    normalizedUuids.includes(normalizeUuid(BLE_UUIDS.xiaomi.authService))
  ) {
    return 'xiaomi-1s';
  }

  return null;
};

export const resolveBleProfile = (
  device: ScooterDevice,
  services?: BleService[]
): BleConnectionProfile => {
  const candidates: BleProfileCandidate[] =
    device.model === 'ninebot-g30'
      ? [NUS_PROFILE, NINEBOT_PROFILE]
      : [NUS_PROFILE];

  if (!services || services.length === 0) {
    const fallback = candidates[0];
    return {
      service: fallback.service,
      rx: fallback.rx,
      tx: fallback.tx,
      writeMode: fallback.defaultWriteMode,
    };
  }

  for (const candidate of candidates) {
    const service = findService(services, candidate.service);
    if (!service) continue;

    const rxCharacteristic = pickCharacteristic(service, candidate.rx, hasNotify);
    const txCharacteristic = pickCharacteristic(service, candidate.tx, hasWrite);

    if (!rxCharacteristic || !txCharacteristic) continue;

    const writeMode: BleWriteMode = txCharacteristic.properties.write
      ? 'withResponse'
      : txCharacteristic.properties.writeWithoutResponse
        ? 'withoutResponse'
        : candidate.defaultWriteMode;

    return {
      service: service.uuid,
      rx: rxCharacteristic.uuid,
      tx: txCharacteristic.uuid,
      writeMode,
    };
  }

  for (const service of services) {
    const rxCharacteristic = service.characteristics.find(characteristic =>
      hasNotify(characteristic.properties)
    );
    const txCharacteristic = service.characteristics.find(characteristic =>
      hasWrite(characteristic.properties)
    );

    if (!rxCharacteristic || !txCharacteristic) continue;

    const writeMode: BleWriteMode = txCharacteristic.properties.write
      ? 'withResponse'
      : txCharacteristic.properties.writeWithoutResponse
        ? 'withoutResponse'
        : candidates[0].defaultWriteMode;

    return {
      service: service.uuid,
      rx: rxCharacteristic.uuid,
      tx: txCharacteristic.uuid,
      writeMode,
    };
  }

  const fallback = candidates[0];
  return {
    service: fallback.service,
    rx: fallback.rx,
    tx: fallback.tx,
    writeMode: fallback.defaultWriteMode,
  };
};

class BleManager {
  private static instance: BleManager;
  private isInitialized = false;
  private connectedDevice: ScooterDevice | null = null;
  private activeProfile: BleConnectionProfile | null = null;
  private connectionListeners: Set<ConnectionListener> = new Set();
  private dataListeners: Set<DataListener> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;

  private constructor() {}

  static getInstance(): BleManager {
    if (!BleManager.instance) {
      BleManager.instance = new BleManager();
    }
    return BleManager.instance;
  }

  // Initialisierung
  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      await BleClient.initialize();
      this.isInitialized = true;
      console.log('[BLE] Initialisiert');
      return true;
    } catch (error) {
      console.error('[BLE] Initialisierung fehlgeschlagen:', error);
      return false;
    }
  }

  // Bluetooth-Verfügbarkeit prüfen
  async isEnabled(): Promise<boolean> {
    try {
      return await BleClient.isEnabled();
    } catch {
      return false;
    }
  }

  // Nach Scootern scannen
  async scan(timeout = 10000): Promise<ScooterDevice[]> {
    this.notifyConnectionState({ status: 'scanning' });
    const devices: ScooterDevice[] = [];

    try {
      await BleClient.requestLEScan(
        {
          services: [
            BLE_UUIDS.xiaomi.service,
            BLE_UUIDS.ninebot.service,
            BLE_UUIDS.xiaomi.authService,
          ],
        },
        (result: ScanResult) => {
          const device = this.parseDevice(result);
          if (device && !devices.find(d => d.id === device.id)) {
            devices.push(device);
          }
        }
      );

      // Timeout für Scan
      await new Promise(resolve => setTimeout(resolve, timeout));
      await BleClient.stopLEScan();
      
      this.notifyConnectionState({ status: 'disconnected' });
      console.log(`[BLE] Scan abgeschlossen: ${devices.length} Geräte gefunden`);
      return devices;
    } catch (error) {
      console.error('[BLE] Scan fehlgeschlagen:', error);
      this.notifyConnectionState({ 
        status: 'disconnected', 
        error: 'Scan fehlgeschlagen' 
      });
      return [];
    }
  }

  // Gerät aus Scan-Ergebnis parsen
  private parseDevice(result: ScanResult): ScooterDevice | null {
    const { device, rssi, uuids } = result;
    
    const model = detectScooterModel(device.name, uuids);

    if (!model) return null;

    return {
      id: device.deviceId,
      name: device.name || `Scooter ${device.deviceId.slice(-4)}`,
      model,
      rssi: rssi || -100,
      isConnected: false,
      isAuthenticated: false,
    };
  }

  // Mit Scooter verbinden
  async connect(device: ScooterDevice): Promise<boolean> {
    this.notifyConnectionState({ status: 'connecting', device });

    try {
      await BleClient.connect(device.id, (deviceId) => {
        console.log(`[BLE] Verbindung getrennt: ${deviceId}`);
        this.handleDisconnect();
      });

      this.activeProfile = await this.resolveConnectionProfile(device);

      // Services entdecken und Notifications aktivieren
      await this.setupNotifications(device);

      this.connectedDevice = { ...device, isConnected: true };
      this.reconnectAttempts = 0;
      
      this.notifyConnectionState({ 
        status: 'connected', 
        device: this.connectedDevice 
      });
      
      console.log(`[BLE] Verbunden mit ${device.name}`);
      return true;
    } catch (error) {
      console.error('[BLE] Verbindung fehlgeschlagen:', error);
      this.notifyConnectionState({ 
        status: 'disconnected', 
        error: 'Verbindung fehlgeschlagen' 
      });
      return false;
    }
  }

  private async resolveConnectionProfile(device: ScooterDevice): Promise<BleConnectionProfile> {
    let services: BleService[] | undefined;

    try {
      await BleClient.discoverServices(device.id);
    } catch (error) {
      console.warn('[BLE] Service-Discovery nicht verfügbar:', error);
    }

    try {
      services = await BleClient.getServices(device.id);
    } catch (error) {
      console.warn('[BLE] Services konnten nicht gelesen werden:', error);
    }

    return resolveBleProfile(device, services);
  }

  // Notifications einrichten
  private async setupNotifications(device: ScooterDevice): Promise<void> {
    const profile = this.activeProfile ?? (await this.resolveConnectionProfile(device));
    this.activeProfile = profile;

    await BleClient.startNotifications(
      device.id,
      profile.service,
      profile.rx,
      (value) => {
        this.notifyDataListeners(new Uint8Array(value.buffer));
      }
    );
  }

  // Daten senden
  async write(data: Uint8Array): Promise<boolean> {
    if (!this.connectedDevice) {
      console.error('[BLE] Kein Gerät verbunden');
      return false;
    }

    if (!this.activeProfile) {
      this.activeProfile = resolveBleProfile(this.connectedDevice);
    }

    try {
      if (this.activeProfile.writeMode === 'withoutResponse') {
        await BleClient.writeWithoutResponse(
          this.connectedDevice.id,
          this.activeProfile.service,
          this.activeProfile.tx,
          new DataView(data.buffer)
        );
      } else {
        await BleClient.write(
          this.connectedDevice.id,
          this.activeProfile.service,
          this.activeProfile.tx,
          new DataView(data.buffer)
        );
      }
      return true;
    } catch (error) {
      console.error('[BLE] Schreiben fehlgeschlagen:', error);
      return false;
    }
  }

  // Verbindung trennen
  async disconnect(): Promise<void> {
    if (this.connectedDevice) {
      try {
        await BleClient.disconnect(this.connectedDevice.id);
      } catch (error) {
        console.error('[BLE] Trennen fehlgeschlagen:', error);
      }
    }
    this.connectedDevice = null;
    this.activeProfile = null;
    this.notifyConnectionState({ status: 'disconnected' });
  }

  // Disconnect-Handler
  private handleDisconnect(): void {
    const device = this.connectedDevice;
    this.connectedDevice = null;
    this.activeProfile = null;
    
    if (device && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`[BLE] Wiederverbindungsversuch ${this.reconnectAttempts}...`);
      setTimeout(() => this.connect(device), 2000);
    } else {
      this.notifyConnectionState({ 
        status: 'disconnected', 
        error: 'Verbindung verloren' 
      });
    }
  }

  // Listener-Management
  onConnectionStateChange(listener: ConnectionListener): () => void {
    this.connectionListeners.add(listener);
    return () => this.connectionListeners.delete(listener);
  }

  onData(listener: DataListener): () => void {
    this.dataListeners.add(listener);
    return () => this.dataListeners.delete(listener);
  }

  private notifyConnectionState(state: ConnectionState): void {
    this.connectionListeners.forEach(listener => listener(state));
  }

  private notifyDataListeners(data: Uint8Array): void {
    this.dataListeners.forEach(listener => listener(data));
  }

  // Getter
  getConnectedDevice(): ScooterDevice | null {
    return this.connectedDevice;
  }

  isConnected(): boolean {
    return this.connectedDevice?.isConnected ?? false;
  }
}

export const bleManager = BleManager.getInstance();
export default bleManager;
