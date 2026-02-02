import { describe, it, expect } from 'vitest';
import type { BleCharacteristicProperties, BleService } from '@capacitor-community/bluetooth-le';
import { BLE_UUIDS, ScooterDevice } from '@/types/scooter';
import { detectScooterModel, resolveBleProfile } from '@/services/BleManager';

const createProperties = (
  overrides: Partial<BleCharacteristicProperties> = {}
): BleCharacteristicProperties => ({
  broadcast: false,
  read: false,
  writeWithoutResponse: false,
  write: false,
  notify: false,
  indicate: false,
  authenticatedSignedWrites: false,
  ...overrides,
});

const createService = (uuid: string, characteristics: BleService['characteristics']): BleService => ({
  uuid,
  characteristics,
});

const baseDevice: ScooterDevice = {
  id: 'device-1',
  name: 'Ninebot G30',
  model: 'ninebot-g30',
  rssi: -40,
  isConnected: false,
  isAuthenticated: false,
};

describe('detectScooterModel', () => {
  it('detects Ninebot models by name', () => {
    expect(detectScooterModel('Ninebot G30 Max', [])).toBe('ninebot-g30');
  });

  it('detects Xiaomi models by name', () => {
    expect(detectScooterModel('Mi Scooter 1S', [])).toBe('xiaomi-1s');
  });

  it('detects Ninebot by service uuid', () => {
    expect(detectScooterModel('Scooter', [BLE_UUIDS.ninebot.service])).toBe('ninebot-g30');
  });
});

describe('resolveBleProfile', () => {
  it('prefers NUS profile when available for Ninebot', () => {
    const xiaomiService = createService(BLE_UUIDS.xiaomi.service, [
      {
        uuid: BLE_UUIDS.xiaomi.rx,
        properties: createProperties({ notify: true }),
        descriptors: [],
      },
      {
        uuid: BLE_UUIDS.xiaomi.tx,
        properties: createProperties({ writeWithoutResponse: true }),
        descriptors: [],
      },
    ]);
    const ninebotService = createService(BLE_UUIDS.ninebot.service, [
      {
        uuid: BLE_UUIDS.ninebot.read,
        properties: createProperties({ notify: true }),
        descriptors: [],
      },
      {
        uuid: BLE_UUIDS.ninebot.write,
        properties: createProperties({ write: true }),
        descriptors: [],
      },
    ]);

    const profile = resolveBleProfile(baseDevice, [ninebotService, xiaomiService]);

    expect(profile.service.toLowerCase()).toBe(BLE_UUIDS.xiaomi.service);
    expect(profile.rx.toLowerCase()).toBe(BLE_UUIDS.xiaomi.rx);
    expect(profile.tx.toLowerCase()).toBe(BLE_UUIDS.xiaomi.tx);
    expect(profile.writeMode).toBe('withoutResponse');
  });

  it('falls back to Ninebot service when NUS is missing', () => {
    const ninebotService = createService(BLE_UUIDS.ninebot.service, [
      {
        uuid: BLE_UUIDS.ninebot.read,
        properties: createProperties({ notify: true }),
        descriptors: [],
      },
      {
        uuid: BLE_UUIDS.ninebot.write,
        properties: createProperties({ write: true }),
        descriptors: [],
      },
    ]);

    const profile = resolveBleProfile(baseDevice, [ninebotService]);

    expect(profile.service.toLowerCase()).toBe(BLE_UUIDS.ninebot.service);
    expect(profile.writeMode).toBe('withResponse');
  });
});
