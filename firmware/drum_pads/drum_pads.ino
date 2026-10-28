// Drum pads: piezo sensors -> MIDI Note On messages.
//
// Boards with native USB (Adafruit Feather ESP32-S3, QT Py ESP32-S3, Feather
// RP2040, SAMD21/51): appears as a USB MIDI device called "Drum Pads".
//   Libraries: "Adafruit TinyUSB Library" and "MIDI Library" (FortySevenEffects).
//   ESP32-S3: Tools > USB Mode > "USB-OTG (TinyUSB)".
//
// Boards without native USB (classic ESP32, e.g. ESP32-DevKitC V4): set
// USE_USB_MIDI to 0. The same MIDI bytes are written to Serial at 115200 baud;
// use the web app's "Connect serial" button. No extra libraries needed.
//   Arduino IDE: Tools > Board > "ESP32 Dev Module".
//   Don't Serial.print() debug text in this mode: it shares the wire with MIDI.

#define USE_USB_MIDI 0  // 0 = ESP32-DevKitC V4 (serial), 1 = native-USB boards

#if USE_USB_MIDI
#include <Adafruit_TinyUSB.h>
#include <MIDI.h>
Adafruit_USBD_MIDI usbMidi;
MIDI_CREATE_INSTANCE(Adafruit_USBD_MIDI, usbMidi, MIDI);
#endif

// ---- Settings to tune with the web app's Monitor panel ---------------------
const uint8_t  MIDI_CHANNEL = 10;     // 10 = General MIDI drums
const uint32_t SCAN_US      = 2000;   // how long to look for the peak after a hit starts
const uint32_t MASK_MS      = 40;     // ignore the pad after a hit (piezos ring)
const uint16_t PEAK_FULL    = 3000;   // ADC peak that counts as velocity 127 (12-bit ADC: 0..4095)

struct Pad {
  uint8_t  pin;
  uint8_t  note;
  uint16_t threshold;  // ADC level that counts as a hit; raise it if the pad triggers by itself
};

// Pins are GPIO numbers for the ESP32-DevKitC V4. Only ADC1 pins work once
// Wi-Fi/BLE is on: GPIO 36 (VP), 39 (VN), 34, 35, 32, 33. That's 6 pads max;
// beyond that, add an analog multiplexer (e.g. CD74HC4067).
// Only list pads that are wired: an unconnected pin floats and fires random hits.
Pad pads[] = {
  { 36, 36, 150 },  // GPIO36 (VP) -> kick
  { 39, 38, 150 },  // GPIO39 (VN) -> snare
  { 34, 42, 150 },  // GPIO34      -> closed hat
  { 35, 46, 150 },  // GPIO35      -> open hat
  // { 32, 45, 150 },  // GPIO32   -> low tom
  // { 33, 49, 150 },  // GPIO33   -> crash
};
const uint8_t NUM_PADS = sizeof(pads) / sizeof(pads[0]);

// ---- Hit detection state machine, one per pad -------------------------------
enum PadPhase : uint8_t { IDLE, SCANNING, MASKED };

struct PadState {
  PadPhase phase;
  uint16_t peak;
  uint32_t startUs;
  uint32_t hitMs;
};
PadState padState[NUM_PADS];

void sendNoteOn(uint8_t note, uint8_t velocity) {
#if USE_USB_MIDI
  MIDI.sendNoteOn(note, velocity, MIDI_CHANNEL);
#else
  uint8_t msg[3] = { (uint8_t)(0x90 | (MIDI_CHANNEL - 1)), note, velocity };
  Serial.write(msg, 3);
#endif
}

void sendNoteOff(uint8_t note) {
#if USE_USB_MIDI
  MIDI.sendNoteOff(note, 0, MIDI_CHANNEL);
#else
  uint8_t msg[3] = { (uint8_t)(0x80 | (MIDI_CHANNEL - 1)), note, 0 };
  Serial.write(msg, 3);
#endif
}

uint8_t peakToVelocity(uint16_t peak, uint16_t threshold) {
  if (peak >= PEAK_FULL) return 127;
  long v = map(peak, threshold, PEAK_FULL, 1, 127);
  return (uint8_t)constrain(v, 1, 127);
}

void setup() {
  analogReadResolution(12);

#if USE_USB_MIDI
  if (!TinyUSBDevice.isInitialized()) TinyUSBDevice.begin(0);
  TinyUSBDevice.setProductDescriptor("Drum Pads");
  usbMidi.setStringDescriptor("Drum Pads");
  MIDI.begin(MIDI_CHANNEL_OMNI);
  // Re-enumerate so the host sees the MIDI interface if USB was already up.
  if (TinyUSBDevice.mounted()) {
    TinyUSBDevice.detach();
    delay(10);
    TinyUSBDevice.attach();
  }
#else
  Serial.begin(115200);
#endif
}

void loop() {
#if USE_USB_MIDI
#ifdef TINYUSB_NEED_POLLING_TASK
  TinyUSBDevice.task();
#endif
  MIDI.read();  // drain incoming messages (later: per-pad settings via SysEx)
#endif

  uint32_t nowUs = micros();
  uint32_t nowMs = millis();

  for (uint8_t i = 0; i < NUM_PADS; i++) {
    Pad &pad = pads[i];
    PadState &s = padState[i];

    switch (s.phase) {
      case IDLE: {
        uint16_t v = analogRead(pad.pin);
        if (v >= pad.threshold) {
          s.phase = SCANNING;
          s.peak = v;
          s.startUs = nowUs;
        }
        break;
      }
      case SCANNING: {
        uint16_t v = analogRead(pad.pin);
        if (v > s.peak) s.peak = v;
        if (nowUs - s.startUs >= SCAN_US) {
          sendNoteOn(pad.note, peakToVelocity(s.peak, pad.threshold));
          s.phase = MASKED;
          s.hitMs = nowMs;
        }
        break;
      }
      case MASKED:
        if (nowMs - s.hitMs >= MASK_MS) {
          sendNoteOff(pad.note);
          s.phase = IDLE;
        }
        break;
    }
  }
}
