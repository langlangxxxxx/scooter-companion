// Scooter Types & Interfaces für ScooterConnect

export type ScooterModel = 'xiaomi-1s' | 'ninebot-g30';

export interface ScooterDevice {
  id: string;
  name: string;
  model: ScooterModel;
  rssi: number;
  isConnected: boolean;
  isAuthenticated: boolean;
}

export interface TelemetryData {
  // Batterie
  batteryPercent: number;
  voltage: number;
  current: number;
  
  // Geschwindigkeit
  speed: number;
  averageSpeed: number;
  
  // Distanz
  totalDistance: number;
  tripDistance: number;
  
  // Temperatur
  controllerTemp: number;
  batteryTemp?: number;
  
  // Trip
  tripTime: number;
  estimatedRange: number;
  
  // Zeitstempel
  timestamp: number;
}

export interface BMSData {
  voltage: number;
  current: number;
  percent: number;
  temperature: number;
  health?: number;
  cycles?: number;
  cellVoltages?: number[];
  errorCodes?: number[];
}

export interface ConnectionState {
  status: 'disconnected' | 'scanning' | 'connecting' | 'authenticating' | 'connected';
  error?: string;
  device?: ScooterDevice;
  signalStrength?: number;
}

export interface AuthToken {
  deviceId: string;
  token: Uint8Array;
  createdAt: number;
}

// BLE Service UUIDs
export const BLE_UUIDS = {
  xiaomi: {
    // Nordic UART Service
    service: '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
    tx: '6e400002-b5a3-f393-e0a9-e50e24dcca9e',
    rx: '6e400003-b5a3-f393-e0a9-e50e24dcca9e',
    // Auth Service
    authService: '0000fe95-0000-1000-8000-00805f9b34fb',
    upnp: '00000010-0000-1000-8000-00805f9b34fb',
    avdtp: '00000019-0000-1000-8000-00805f9b34fb',
  },
  ninebot: {
    service: '0000fe00-0000-1000-8000-00805f9b34fb',
    write: '0000fe01-0000-1000-8000-00805f9b34fb',
    read: '0000fe02-0000-1000-8000-00805f9b34fb',
  },
} as const;

// Protokoll-Konstanten
export const PROTOCOL = {
  xiaomi: {
    headerEncrypted: [0x55, 0xab],
    headerDecrypted: [0x55, 0xaa],
    commands: {
      motorInfo: 0xb0,
      tripInfo: 0x3a,
      range: 0x25,
    },
  },
  ninebot: {
    header: [0x5a, 0xa5],
    commands: {
      telemetry: 0x1e,
      batteryDetails: 0x31,
    },
  },
  // Spannungs-Mapping (beide Modelle)
  voltage: {
    max: 42.0,
    min: 33.0,
  },
} as const;

// Utility-Funktionen
export function voltageToPercent(voltage: number): number {
  const { max, min } = PROTOCOL.voltage;
  if (voltage >= max) return 100;
  if (voltage <= min) return 0;
  return Math.round(((voltage - min) / (max - min)) * 100);
}

export function percentToVoltage(percent: number): number {
  const { max, min } = PROTOCOL.voltage;
  return min + (percent / 100) * (max - min);
}

// Default-Werte
export const DEFAULT_TELEMETRY: TelemetryData = {
  batteryPercent: 0,
  voltage: 0,
  current: 0,
  speed: 0,
  averageSpeed: 0,
  totalDistance: 0,
  tripDistance: 0,
  controllerTemp: 0,
  tripTime: 0,
  estimatedRange: 0,
  timestamp: 0,
};

export const DEFAULT_BMS: BMSData = {
  voltage: 0,
  current: 0,
  percent: 0,
  temperature: 0,
};
