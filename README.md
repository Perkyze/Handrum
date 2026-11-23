# Drum Pad Project

Two parts:

1. **Hardware** – piezo pads read by an ESP32-S3 / Adafruit board. It sends hits to a computer.
2. **Web app** – runs in the browser, receives the hits, and plays drum sounds.

## The key decision: the hardware speaks MIDI

The pads and the app only agree on one thing: **standard MIDI Note On messages**.

| Message | Bytes | Meaning |
|---|---|---|
| Note On | `0x99 note velocity` | Pad hit (channel 10 = drums). Velocity 1–127 = how hard. |
| Note Off | `0x89 note 0` | Optional. The app ignores it (drums are one-shot). |

Why MIDI instead of a custom protocol:

- **No drivers.** A board with native USB (ESP32-S3, RP2040, SAMD21/51) shows up as a "USB MIDI device" on Windows, macOS, Linux, iPad and Android.
- **The browser can read it directly** with the Web MIDI API (Chrome / Edge / Opera).
- **Your pads also work in any DAW** (Ableton, GarageBand, FL Studio…) for free. Useful for testing and a nice selling point.
- **Your app works with any MIDI drum pad**, so you can build the app before the hardware is finished.

Fallback for boards **without** native USB (classic ESP32 DevKit with a CP2102/CH340 chip): the firmware writes the same 3 MIDI bytes over the serial port at 115200 baud, and the app reads them with the Web Serial API ("Connect serial" button). Same parser, same mapping.

### The Handpad kit

Eight pads: three toms top left, three cymbals top right (the middle one of each trio sits a little higher), and two bigger pads at the bottom for snare and kick. Both apps draw the pads in that layout, and the computer keys mirror it.

```
  [1]  [2]  [3]           [6]  [7]  [8]
            [ 4 ]   [ 5 ]
```

Default note map (General MIDI drums, matches what DAWs expect):

| # | Pad | Note | Key |
|---|---|---|---|
| 1 | Tom 1 | 48 | 2 |
| 2 | Tom 2 | 45 | 3 |
| 3 | Floor tom | 43 | 4 |
| 4 | Snare | 38 | V |
| 5 | Kick | 36 | N |
| 6 | Open hi-hat | 46 | 8 |
| 7 | Closed hi-hat | 42 | 9 |
| 8 | Ride | 51 | 0 |

The keys also work by position on other keyboard layouts (the key under "2" plays tom 1 on AZERTY too). Every pad has a **Learn** button, so whatever note the hardware sends can be assigned without reflashing.

## Folder layout

```
web/                    the app (plain HTML/JS, no build step)
  index.html
  style.css
  app.js
learn/                  Backbeat: a game that teaches drums from zero (see learn/README.md)
firmware/drum_pads/
  drum_pads.ino         Arduino sketch for the pads
```

## Running the app

Web MIDI and Web Serial need Chrome or Edge, and a page served from `localhost` (or https):

```bash
python -m http.server 8000 --directory web
```

Then open http://localhost:8000 (no Python? `powershell -ExecutionPolicy Bypass -File learn/serve.ps1 -Port 8150 -Root web` serves it at http://localhost:8150). Click once to enable audio. Play with the keyboard or mouse right away; click **Connect MIDI** or **Connect serial** for hardware.

## Hardware

### Current board: ESP32-DevKitC V4

The DevKitC V4 (ESP32-WROOM-32) has no native USB: its USB port goes through a USB-to-serial chip (CP2102 or CH340). So it uses **serial mode** (`USE_USB_MIDI 0`, already the default in the sketch) and the app's **Connect serial** button.

| Pad | GPIO (label on board) | Note |
|---|---|---|
| 5 · Kick | 36 (VP) | 36 |
| 4 · Snare | 39 (VN) | 38 |
| 7 · Closed hi-hat | 34 | 42 |
| 6 · Open hi-hat | 35 | 46 |
| 1 · Tom 1 (commented out) | 32 | 48 |
| 8 · Ride (commented out) | 33 | 51 |

- Those six are the ADC1 pins: max 6 pads directly, so tom 2 and the floor tom need a 16-channel analog mux (CD74HC4067) or a second board.
- Only enable pads that are wired. A floating pin triggers random hits.
- Upload: Arduino IDE → board **ESP32 Dev Module**, no extra libraries. If the upload hangs on "Connecting…", hold **BOOT** until it starts.
- **Close the Arduino Serial Monitor** before clicking Connect serial in the app: only one program can open the port.
- Connecting from the browser may reset the board; its boot text is ignored by the app.
- Missing COM port in Windows: install the CP210x (Silicon Labs) or CH340 driver, depending on the chip next to the USB port.

Later, for a product: the ESP32-S3 gives you plug-and-play USB MIDI (flip `USE_USB_MIDI` to 1). The classic ESP32 still has Bluetooth, so the wireless BLE MIDI phase works on the DevKit too.

### Suggested parts (per kit of 4–8 pads)

- **Board:** Adafruit Feather ESP32-S3 (native USB, Wi-Fi + BLE for later, LiPo charger built in). Alternatives: Adafruit QT Py ESP32-S3, Feather RP2040, any ESP32-S3 DevKit.
- **Sensors:** 27–35 mm piezo discs, one per pad.
- **Per pad:** 1 MΩ resistor + 3.3 V Zener diode (or two Schottky diodes to 3V3/GND) to protect the pin.
- **Pads:** piezo glued under a rubber/foam practice-pad surface, foam underneath to reduce cross-talk.

### Piezo wiring (one pad)

```
piezo (+) ──┬──────┬──────── analog pin (A0…)
            │      │
          1 MΩ   Zener 3.3 V (cathode to pin)
            │      │
piezo (–) ──┴──────┴──────── GND
```

Notes:
- On ESP32, use **ADC1** pins (ADC2 stops working once Wi-Fi is on, which matters for the wireless phase).
- Piezos can output tens of volts on a hard hit; the Zener is not optional.

### Firmware behaviour

For each pad: wait for the signal to cross a threshold → keep reading for ~2 ms to find the peak → send Note On with velocity from the peak → ignore that pad for ~40 ms (piezos ring and would retrigger). Thresholds, scan time and mask time are constants at the top of the sketch.

Arduino setup:
1. Install the board package (esp32 by Espressif, or Adafruit's for RP2040/SAMD).
2. Library Manager: **Adafruit TinyUSB Library** and **MIDI Library** (FortySevenEffects).
3. ESP32-S3: *Tools → USB Mode → USB-OTG (TinyUSB)*.
4. Upload. The board appears as "Drum Pads" in the app's MIDI list.

## Roadmap

**Phase 1 – App without hardware (done here)**
Synth drum sounds, keyboard/mouse/touch pads, Web MIDI + Web Serial input, MIDI learn, velocity curve, drop-your-own-sample per pad, input monitor for debugging.

**Phase 2 – First physical pad**
One piezo on a breadboard. Use the app's monitor to tune threshold, velocity range and mask time. Then scale to 4, then 8 pads (watch for cross-talk between pads).

**Phase 3 – Product polish**
- Hi-hat pedal: a foot switch or FSR sending MIDI CC 4 so the app can blend open/closed hat.
- Per-pad sensitivity settings sent from the app to the board (MIDI SysEx), stored in flash — no reflashing for end users.
- Sample kits saved in the browser (IndexedDB), installable as a PWA so it works offline.

**Phase 4 – Wireless**
- **BLE MIDI** on the ESP32-S3: macOS/iOS/Android/Windows pair it as a MIDI device, so the app needs no change.
- Or Wi-Fi + WebSocket if you need many devices or a phone without BLE MIDI support. Adds latency jitter; prefer BLE MIDI.

**Watch-outs**
- Latency budget: aim for <10 ms pad-to-sound. USB MIDI adds ~1 ms; the rest is the audio output. The app shows the audio output latency; on Windows, wired headphones/speakers beat Bluetooth by a lot.
- Safari and Firefox (desktop) don't support Web MIDI/Web Serial. If that matters later, wrap the same web code in Electron or Tauri.
