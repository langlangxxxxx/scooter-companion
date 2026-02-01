
# 🛴 ScooterConnect - E-Scooter Telemetrie App (Vollständig)

## Übersicht
Eine Android-App zur Verbindung mit **Xiaomi 1S** und **Ninebot G30** E-Scootern via Bluetooth Low Energy. Die App implementiert das vollständige BLE-Protokoll inkl. Verschlüsselung und zeigt alle Telemetrie-Daten in Echtzeit an.

---

## Phase 1: Projekt-Setup & Capacitor-Konfiguration

### Capacitor für Native Android
- Installation von `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`
- BLE-Plugin: `@capawesome-team/capacitor-bluetooth-low-energy`
- Crypto-Bibliotheken für ECDH, HKDF, AES-CCM (z.B. `@noble/curves`, `@noble/hashes`, `@noble/ciphers`)

### Android-Berechtigungen
- `BLUETOOTH`, `BLUETOOTH_ADMIN`, `BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT`
- `ACCESS_FINE_LOCATION` (für BLE-Scan erforderlich)

---

## Phase 2: BLE Manager Service

### Zentrale BLE-Verwaltung
- **Initialisierung** – Bluetooth-Verfügbarkeit prüfen
- **Scan-Funktion** – Nach Scootern suchen mit Filter auf bekannte Service-UUIDs
- **Verbindungsmanagement** – Connect, Disconnect, Auto-Reconnect
- **Notification-Handler** – Echtzeit-Datenempfang via BLE Notify

### Service-UUIDs & Characteristics

**Xiaomi 1S (Nordic UART Service):**
- Service: `6e400001-b5a3-f393-e0a9-e50e24dcca9e`
- TX (Write): `6e400002-b5a3-f393-e0a9-e50e24dcca9e`
- RX (Notify): `6e400003-b5a3-f393-e0a9-e50e24dcca9e`

**Xiaomi Auth Service:**
- Service: `0000fe95-0000-1000-8000-00805f9b34fb`
- UPNP (Control): `00000010-0000-1000-8000-00805f9b34fb`
- AVDTP (Data): `00000019-0000-1000-8000-00805f9b34fb`

**Ninebot G30:**
- Service: `0000fe00-0000-1000-8000-00805f9b34fb`
- Write: `0000fe01-0000-1000-8000-00805f9b34fb`
- Read/Notify: `0000fe02-0000-1000-8000-00805f9b34fb`

---

## Phase 3: Authentifizierungs-System (KRITISCH!)

### Xiaomi 1S - MiBLE Authentication
Das moderne Xiaomi-Protokoll erfordert **verschlüsselte Kommunikation**:

**Erstmalige Registrierung:**
1. `CMD_GET_INFO` senden → Scooter-Info empfangen
2. ECDH-Schlüsselpaar generieren (SECP256R1/P-256)
3. Benutzer muss **Power-Button am Scooter drücken** (30 Sek. Timeout)
4. Public Keys austauschen
5. Shared Secret berechnen → HKDF-SHA256 → Token (12 Bytes) ableiten
6. **Token sicher speichern** für zukünftige Verbindungen

**Login (bei jeder Verbindung):**
1. `CMD_LOGIN` senden
2. Zufällige Bytes austauschen
3. Session-Keys ableiten (app_key, dev_key, app_iv, dev_iv)
4. HMAC-Verifikation

### Ninebot G30 - Authentifizierung
- Seriennummer-basierter Schlüssel
- Verschlüsselungsalgorithmus basierend auf Community-Tools

### Sichere Token-Speicherung
- Capacitor Secure Storage für Token-Persistenz
- Automatische Erkennung: Registrierung vs. Login

---

## Phase 4: Protokoll-Dekodierung

### Xiaomi 1S Frame-Format

**Verschlüsselt (Header: 55 AB):**
```
55 AB [Länge 2B] [AES-CCM Ciphertext] [CRC16]
```

**Entschlüsselt (Header: 55 AA):**
```
55 AA [Len] [Device] [Type] [Command] [Data...] [CRC16]
```

### Telemetrie-Befehle (Xiaomi)

| Befehl | Adresse | Param | Rückgabe |
|--------|---------|-------|----------|
| Motor Info | `0xB0` | 32 Bytes | Geschwindigkeit, Batterie, Temperatur, Kilometerstand |
| Trip Info | `0x3A` | 4 Bytes | Fahrzeit (Sek), Strecke (m) |
| Reichweite | `0x25` | 2 Bytes | Verbleibende km |

### Motor Info Payload-Dekodierung (0xB0)

| Offset | Bytes | Feld | Berechnung |
|--------|-------|------|------------|
| 8-9 | 2 | Batterie % | Direkt (0-100) |
| 10-11 | 2 | Geschwindigkeit | value / 1000 = km/h |
| 12-13 | 2 | Durchschnitts-Geschw. | value / 1000 = km/h |
| 14-17 | 4 | Gesamtkilometer | value / 1000 = km |
| 20-21 | 2 | Controller-Temp. | value / 10 = °C |

### Ninebot G30 Frame-Format

**Header: 5A A5**
```
5A A5 [Len] [Src] [Dst] [Cmd] [Data...] [CRC16]
```

### Telemetrie-Befehle (Ninebot)

| Befehl | Rückgabe |
|--------|----------|
| `0x1E` | Spannung, Akku %, Geschwindigkeit, Distanz |
| `0x31` | Batterie-Details, Zellenspannungen |

### Spannungs-Mapping (Beide Modelle)
- **100%** = 42V
- **0%** = 33V
- Lineare Interpolation dazwischen

---

## Phase 5: BMS (Battery Management System) Daten

### Batterie-Telemetrie
- **Gesamtspannung** – Aktueller Spannungswert in Volt
- **Stromstärke** – Aktuelle Entladung in Ampere
- **Akkustand** – Prozent (0-100%)
- **Temperatur** – Batterie-/Controller-Temperatur

### Erweiterte BMS-Daten (falls verfügbar)
- Zellenspannungen (einzelne Zellen)
- Lade-/Entladezyklen
- BMS-Fehlercodes
- Batteriezustand (Health)

---

## Phase 6: Dashboard UI

### Hauptbildschirm

**Großes Speed-Display:**
- Aktuelle Geschwindigkeit (km/h) als zentrales Element
- Durchschnittsgeschwindigkeit als Nebenwert

**Batterie-Widget:**
- Prozentanzeige mit Farbverlauf (Grün → Gelb → Rot)
- Spannung in Volt (z.B. "39.2V")
- Geschätzte Reichweite

**Status-Karten:**
- Gesamtkilometer
- Aktuelle Fahrt (km + Zeit)
- Controller-Temperatur
- Verbindungsstatus + Signalstärke

### Verbindungsseite
- Scan-Button mit Ladeanimation
- Liste gefundener Scooter (Icon für Xiaomi/Ninebot)
- Registrierungs-Flow mit Anleitung ("Drücke Power-Button")
- Verbindungshistorie

### Einstellungen
- Einheiten (km/h vs mph, °C vs °F)
- Theme (Hell/Dunkel)
- Verbundene Scooter verwalten
- Token löschen (Neu-Registrierung erzwingen)

---

## Phase 7: Echtzeit-Updates & Fehlerbehandlung

### Live-Datenstream
- Polling-Intervall: 200-300ms
- Sanfte UI-Animationen bei Wertänderungen
- Offline-Pufferung wenn Verbindung kurz unterbrochen

### Warnungen & Alerts
- Niedriger Akkustand (<20%)
- Hohe Temperatur
- Verbindungsverlust
- Fehler-Codes vom Scooter

### Fehlerbehandlung
- Automatische Wiederverbindung
- Timeout-Handling bei Authentifizierung
- CRC-Validierung aller Pakete
- Logging für Debugging

---

## Technische Architektur

### Service-Module
```
src/
├── services/
│   ├── BleManager.ts          # BLE-Verbindungsverwaltung
│   ├── ScooterProtocol.ts     # Protokoll-Abstraktion
│   ├── XiaomiProtocol.ts      # Xiaomi 1S Dekodierung
│   ├── NinebotProtocol.ts     # Ninebot G30 Dekodierung
│   ├── AuthService.ts         # Authentifizierung & Crypto
│   └── TelemetryService.ts    # Daten-Polling & State
├── crypto/
│   ├── ecdh.ts                # ECDH Key Exchange
│   ├── hkdf.ts                # Key Derivation
│   └── aesCcm.ts              # AES-128-CCM Encryption
└── types/
    └── scooter.ts             # TypeScript Interfaces
```

### State Management
- React Context für globalen Scooter-State
- TanStack Query für Daten-Caching

---

## Deployment-Schritte

1. **In Lovable entwickeln** – UI, Services, Protokoll-Logik
2. **Zu GitHub exportieren** – "Export to GitHub" Button
3. **Lokal klonen** – `git clone` + `npm install`
4. **Capacitor hinzufügen:**
   ```bash
   npx cap add android
   npx cap sync
   ```
5. **In Android Studio öffnen** – `npx cap open android`
6. **Auf echtem Gerät testen** – APK deployen

---

## Erwartetes Ergebnis

Eine vollständig funktionale Android-App mit:
- ✅ Verschlüsselte BLE-Verbindung zu Xiaomi 1S
- ✅ BLE-Verbindung zu Ninebot G30
- ✅ Sichere Authentifizierung mit Token-Speicherung
- ✅ Echtzeit-Telemetrie aller wichtigen Daten
- ✅ Professionelles Dashboard mit Live-Updates
- ✅ BMS-Daten (Spannung, Strom, Temperatur)
- ✅ Fehlerbehandlung und Auto-Reconnect
