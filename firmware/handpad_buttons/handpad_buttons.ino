// Handpad buttons: 8 tactile switches (Omron B3F-4055) -> MIDI notes over serial.
//
// For the ESP32-DevKitC V4, with a WROOM or a WROVER module. This board has no
// native USB (its USB port goes through a serial chip), so it can't be a USB
// keyboard on its own. Instead it writes the same 3-byte MIDI messages as
// drum_pads.ino at 115200 baud. Two ways to use that:
//   1. The web apps (web/ and learn/): click "Connect serial". Nothing to install.
//   2. Any program, as keyboard keys: run tools/serial-keys.ps1 on the PC. It
//      presses 2 3 4 V N 8 9 0 while the matching button is held.
// Only one program can have the port open at a time: the browser, the bridge,
// or the Arduino Serial Monitor.
//
// Arduino IDE: Tools > Board > esp32 > "ESP32 Dev Module" (or "ESP32 Wrover Module").
// Don't Serial.print() debug text: it shares the wire with the MIDI bytes.
//
// Wiring, no resistors needed (the ESP32's internal pull-ups are used):
//   each switch: one leg -> its GPIO, the diagonally opposite leg -> GND.
//   Diagonal legs are always on opposite sides of the contact, so this works
//   whichever way the switch is turned. Pressed = the pin reads LOW.
//
//     top view     A ●───────● B
//                    │  B3F  │      A -> GPIO
//                    │       │      D -> GND   (A and D are diagonal)
//                  C ●───────● D
//
// All 8 switches can share one GND wire: run a GND pin to the breadboard's
// blue rail and connect every switch's D leg to that rail.
//
// Pins left out on purpose: 6-11 (flash), 16-17 (PSRAM on WROVER modules),
// 34-39 (input only, no pull-ups), 0 2 5 12 15 (boot straps), 1 3 (USB serial).

const uint8_t  MIDI_CHANNEL = 10;  // 10 = General MIDI drums, same as drum_pads.ino
const uint8_t  VELOCITY     = 100; // buttons have no velocity, so every hit is the same
const uint32_t DEBOUNCE_MS  = 10;  // ignore contact bounce for this long after each change

struct Button {
  uint8_t pin;
  uint8_t note;
};

// The Handpad kit (pad number -> General MIDI note -> computer key in the apps).
// GPIO 32 to 13 sit in a row on the DevKitC's left header (skip 12), with a GND
// pin between 12 and 13. GPIO 23 is on the right header, next to GND.
Button buttons[] = {
  { 32, 48 },  // pad 1  tom 1          key 2
  { 33, 45 },  // pad 2  tom 2          key 3
  { 25, 43 },  // pad 3  floor tom      key 4
  { 26, 38 },  // pad 4  snare          key V
  { 27, 36 },  // pad 5  kick           key N
  { 14, 46 },  // pad 6  open hi-hat    key 8
  { 13, 42 },  // pad 7  closed hi-hat  key 9
  { 23, 51 },  // pad 8  ride           key 0
};
const uint8_t NUM_BUTTONS = sizeof(buttons) / sizeof(buttons[0]);

bool     isDown[NUM_BUTTONS];
uint32_t changedMs[NUM_BUTTONS];

void sendMidi(uint8_t status, uint8_t note, uint8_t velocity) {
  uint8_t msg[3] = { (uint8_t)(status | (MIDI_CHANNEL - 1)), note, velocity };
  Serial.write(msg, 3);
}

void setup() {
  Serial.begin(115200);
  for (uint8_t i = 0; i < NUM_BUTTONS; i++) {
    pinMode(buttons[i].pin, INPUT_PULLUP);
    isDown[i] = false;
    changedMs[i] = 0;
  }
}

void loop() {
  uint32_t now = millis();

  for (uint8_t i = 0; i < NUM_BUTTONS; i++) {
    bool pressed = digitalRead(buttons[i].pin) == LOW;
    // React to the first edge right away (no added latency), then ignore the
    // bounces that follow it for DEBOUNCE_MS.
    if (pressed != isDown[i] && now - changedMs[i] >= DEBOUNCE_MS) {
      isDown[i] = pressed;
      changedMs[i] = now;
      if (pressed) sendMidi(0x90, buttons[i].note, VELOCITY);  // Note On
      else         sendMidi(0x80, buttons[i].note, 0);         // Note Off
    }
  }
}
