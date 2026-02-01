// BLE Manager Service für ScooterConnect
import { BleClient, BleDevice, ScanResult } from '@capacitor-community/bluetooth-le';
import { 
  ScooterDevice, 
  ScooterModel, 
  BLE_UUIDS, 
  ConnectionState 
} from '@/types/scooter';

type ConnectionListener = (state: ConnectionState) => void;
type DataListener = (data: Uint8Array) => void;

class BleManager {
  private static instance: BleManager;
  private isInitialized = false;
  private connectedDevice: ScooterDevice | null = null;
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
          services: [BLE_UUIDS.xiaomi.service, BLE_UUIDS.ninebot.service],
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
    
    let model: ScooterModel | null = null;
    
    if (uuids?.includes(BLE_UUIDS.xiaomi.service)) {
      model = 'xiaomi-1s';
    } else if (uuids?.includes(BLE_UUIDS.ninebot.service)) {
      model = 'ninebot-g30';
    } else if (device.name?.toLowerCase().includes('mi scooter') || 
               device.name?.toLowerCase().includes('m365')) {
      model = 'xiaomi-1s';
    } else if (device.name?.toLowerCase().includes('ninebot') ||
               device.name?.toLowerCase().includes('g30')) {
      model = 'ninebot-g30';
    }

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

  // Notifications einrichten
  private async setupNotifications(device: ScooterDevice): Promise<void> {
    const uuids = device.model === 'xiaomi-1s' 
      ? { service: BLE_UUIDS.xiaomi.service, char: BLE_UUIDS.xiaomi.rx }
      : { service: BLE_UUIDS.ninebot.service, char: BLE_UUIDS.ninebot.read };

    await BleClient.startNotifications(
      device.id,
      uuids.service,
      uuids.char,
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

    const uuids = this.connectedDevice.model === 'xiaomi-1s'
      ? { service: BLE_UUIDS.xiaomi.service, char: BLE_UUIDS.xiaomi.tx }
      : { service: BLE_UUIDS.ninebot.service, char: BLE_UUIDS.ninebot.write };

    try {
      await BleClient.write(
        this.connectedDevice.id,
        uuids.service,
        uuids.char,
        new DataView(data.buffer)
      );
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
    this.notifyConnectionState({ status: 'disconnected' });
  }

  // Disconnect-Handler
  private handleDisconnect(): void {
    const device = this.connectedDevice;
    this.connectedDevice = null;
    
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
