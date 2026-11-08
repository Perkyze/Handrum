# Handpad: project info

Everything we know so far about the product, the hardware we have, the research, and the design decisions in progress. Last updated: 7 Nov 2026.

## What we're building

**Handpad** is a drum pad you play with your **hands** (palms and fingers, no sticks). It has two parts:

1. **Hardware**: piezo pads read by an ESP32, sending standard MIDI Note On messages.
2. **Web app** (`web/`): runs in Chrome or Edge, receives the hits over Web MIDI or Web Serial, and plays drum sounds. Plain HTML/JS, no build step.

The open product question was: **an advanced pad for producers who use a DAW, or a simpler pad that comes with a rhythm game?**

## Hardware we have

- **3 × ESP32-DevKitC V4** (ESP32-WROOM-32, about 54.4 × 27.9 mm).
  - **No native USB.** The USB port goes through a serial chip, so the firmware runs in serial mode (`USE_USB_MIDI 0`) and the app uses **Connect serial**. The board won't show up as a USB MIDI device.
  - **6 usable analog pins per board while Bluetooth or Wi-Fi is on.** These are the ADC1 pins: GPIO 36 (VP), 39 (VN), 34, 35, 32, 33. So each board can read **6 pads directly**. More pads need a 16-channel multiplexer (CD74HC4067).
  - **Three boards means three test rigs at once.** The app opens one serial port per browser tab, so use one tab per board.
- **Per piezo:** a 1 MΩ resistor and a 3.3 V Zener diode, both between the piezo and ground, to protect the pin. Piezos can output tens of volts on a hard hit.
- **Firmware** (`firmware/drum_pads/drum_pads.ino`):
  - For each pad, it waits for a threshold, looks for the peak for 2 ms (`SCAN_US`), sends Note On, then ignores that pad for 40 ms (`MASK_MS`).
  - 4 pads are enabled (GPIO 36, 39, 34, 35) and 2 are commented out (32, 33).
  - Default threshold is 150, and `PEAK_FULL` is 3000 (12-bit ADC).
- **For a product**, the ESP32-S3 gives plug-and-play USB MIDI (set `USE_USB_MIDI 1`). Candidates:
  - Seeed XIAO ESP32S3: 21 × 17.5 mm, native USB-C, battery charging built in.
  - Adafruit Feather ESP32-S3: 52.3 × 22.7 × 7.2 mm, native USB, LiPo charger.
  - ESP32-S3-DevKitC-1: 62.7 × 25.4 mm, native USB, 10 ADC1 channels.

## MIDI map (General MIDI, channel 10)

| Pad | Note | Key in the app |
|---|---|---|
| Kick | 36 | A |
| Snare | 38 | S |
| Closed hat | 42 | D |
| Open hat | 46 | F |
| Low tom | 45 | J |
| High tom | 48 | K |
| Clap | 39 | L |
| Crash | 49 | ; |

Every pad in the app has **Learn**, so any note can be remapped without reflashing.

## Figma

- **Moodboard file:** "Moodboard - Handpad (prototypage ux)", https://www.figma.com/design/MOQOfKc3oXrAHbGpDlTmJc
- **Our original frames:** "Desktop - 1" (black 7-pad mockup) and "Desktop - 3" (white/blue version).
- **Brand:** Syncopate Bold for the "Handpad" logo, Inter for text, accent blue `#1E7EC8`.
- **Board "Handpad — Product directions (research + mockups)"** has 11 sections:
  1. How hands play drums (djembe, darbuka, tabla, taiko, conga/cajón)
  2. What already exists (market map and lessons)
  3. Two audiences (producer vs first-timer)
  4. Five directions with mockups: A Studio, B Play, C Duo, D Halo, E Tiles
  5. Side-by-side comparison table
  6. Software screens (note-highway game, Studio pad setup page)
  7. Recommendation and the 4-week plan
  8. Play-category variations, to-scale comparison with existing devices
  9. Expert-category variations, to-scale comparison
  10. The whole product: ESP32 fit, x-ray, exploded view, cross-section, angle study, parts list
  11. Photoreal AI renders
- **Frame "Handpad — Arc + Kit map exploration":** more versions of the two favourite models, a plan for our 3 DevKitC boards, and the button/pad materials list (summarised below).

## Research summary

### How hands play drums

- Hand drummers change the sound by **where** they hit (center vs edge), **how** the hand lands (bounces off or stays on the skin), and by **pressing after the hit** (tabla pitch bends, mutes).
- **Design rules** that follow:
  - Give each pad zones (center and edge).
  - Make pads palm-sized (about 10 cm or more).
  - Add pressure sensing (FSR).
  - Use soft, quiet surfaces (silicone over foam).
  - Keep response fast (under 10 ms) and even across the pad.
  - Add a slight tilt.

### What exists

| Product | What it is | Notes |
|---|---|---|
| Finger grids (Akai MPD218, Maschine Mikro MK3, Ableton Push 3) | Small pads for fingertips | Crowded market |
| Roland HandSonic HPD-20 | 13 pressure zones | About $1,000 class |
| BopPad | Velocity, pressure and position | |
| Embodme Erae 2 | Force-sensing surface | Just under $1,000 |
| Taiko / Donkey Konga controllers | 2–4 inputs | Enough for a game |
| Melodics | Lessons app for most MIDI pads | A partner more than a competitor |
| Roll-up kids' kits | $27–139 | No real game |

**The gap:** hand-sized, expressive, mid-price, and comes with a game.

### Latency

USB MIDI adds about 3 ms. Bluetooth MIDI adds about 10–20 ms and varies from hit to hit (jitter). Bluetooth is fine for a game that calibrates latency. Producers will want the cable.

### Angle

Keyboard ergonomics guidance says to keep wrist extension under about 15°. Seated djembe players tilt the drum head away from themselves.

In a simple arm model (forearm 26 cm):

| Setup | Wrist extension |
|---|---|
| Desk, tilted away −8° | ≈ 0° |
| Desk, flat | ≈ 7° |
| Desk, +8° toward you | ≈ 15° |
| Desk, +16° toward you | ≈ 23° |
| Lap, tilted −20° | ≈ 15° (35° if flat) |

**Proposal:** a 6–8° wedge toward the player on a desk, plus a flip foot to go flat. Lap versions tilt away. Test −8°, 0°, +8° and +16° foam wedges with 5 people before freezing the shape.

## Directions and current proposal

- **A Studio:** DAW pad, 8 pads × 2 zones, pressure, 10° wedge, $249–349 target.
- **B Play:** 4 big pads, rhythm game, speaker, battery, Bluetooth, $79–129 target.
- **C Duo, D Halo, E Tiles:** alternatives (lap drums, round head with zones, snap-together tiles).
- **Proposal:** one hardware core, two editions. Prototype **Play** first and keep standard MIDI so it already works in any DAW.
- **The team likes Arc and Kit map**, so both are explored further in Figma:
  - **Arc** keeps pads at an even distance from the shoulders.
  - **Kit map** sizes and places pads like a drum kit.
  - **Arc 6** and **Kit 6** need exactly 6 analog pins, so each can be built on **one DevKitC V4 today**, with no multiplexer.

## Prototype plan with our 3 DevKitC V4

| Board | Rig | Pins (ADC1) | Notes |
|---|---|---|---|
| 1 | **Kit 6**: kick, snare, hat, tom, floor tom, crash | 36, 39, 34, 35, 32, 33 | MIDI 36, 38, 42, 45, 43, 49 |
| 2 | **Arc 6**: six hand-percussion pads on a curved base | 36, 39, 34, 35, 32, 33 | e.g. bongos 60/61, congas 62/63/64, clap 39 |
| 3 | **Feel lab**: 4 sample pads with different material stacks + 1 FSR | 36, 39, 34, 35 + 32 (FSR) | Compare feel and velocity in the app's Monitor |

In `drum_pads.ino`, uncomment the GPIO 32 and 33 lines to get 6 pads. Wire only pads that are connected, because a floating pin fires random hits.

## Buttons, pads and sensors: what feels good

The goal is that every hit feels **satisfying**: instant, consistent and multi-sensory.

### Parts

| Part | Use in Handpad | Feel and satisfaction notes |
|---|---|---|
| Silicone pad over foam over piezo | Main hand pads | Good rebound. Softness and thickness set the feel: test 2–3 hardnesses. Matte texture, quiet thud. |
| Gum-rubber practice-pad surface | Alternative pad top | Lively rebound like a real drum, slightly louder. |
| Mesh head over a foam cone | Round pads (Halo, Duo) | Very quiet, adjustable tension, natural bounce. Needs a rim and tensioning. |
| MPC-style thick rubber pad + FSR | Small finger pads (Kit map cymbals) | Familiar to producers, good velocity, little travel. |
| Piezo disc (27 / 35 mm) | Hit sensor under every pad | Not felt directly. Mount it on a plate floating on foam so pads don't trigger each other. |
| FSR (Interlink 402 round / 406 square) | Pressure after the hit | Enables mute and pitch bend: the pad "listens" while you press. |
| Velostat sheet | Cheap pressure sensing for prototypes | Good enough to test ideas, not for the product. |
| Arcade button (30 mm) | Start/Play, mode, game "special" | Big, very clicky, satisfying, but on/off only (no velocity). |
| Mechanical key switch (linear, tactile or clicky) + keycap | Function buttons (Kit, Shift, Rec) | A clear actuation point. Tactile gives confirmation without noise; clicky is loud. |
| Silicone rubber keypad (dome) | Secondary buttons | Soft, quiet, can be backlit, cheap. Can feel mushy if the dome is weak. |
| Rotary encoder with detents + push (EC11-type) | Knobs | Each detent "click" confirms a step. A heavier metal knob feels premium. |
| Damped potentiometer or fader | Volume, effects | Smooth resistance feels high quality. |
| Capacitive touch strip | Pitch/FX slider on Studio | No moving parts. The classic ESP32 has built-in touch pins. |
| Haptic actuator (LRA + DRV2605L driver) | Feedback on "Perfect" hits, silent practice | A short thump or buzz adds a lot of satisfaction in a game. |

### Under-$50 starter kit (cheapest found, Nov 2026)

This kit covers one 6-pad rig (Kit 6 or Arc 6) plus the Feel lab tests, on a DevKitC V4 we already own.
- **"est."** marks a typical marketplace price that wasn't verified. Check each listing before ordering.
- **Shipping and tax are extra.** Group orders to save on shipping.

| Item | Qty | Where | Approx. price |
|---|---|---|---|
| Piezo discs 35 mm, prewired | 1 pack of 20 | [AliExpress search](https://www.aliexpress.com/w/wholesale-35mm-piezo-disc-wired.html) | ≈ $5–12 (est.) |
| 1 MΩ resistors | 20-pack | [SparkFun](https://www.sparkfun.com/resistor-1m-ohm-1-4-watt-pth-20-pack-thick-leads.html) | $0.95 |
| 3.3 V Zener 1N4728A | 10 | [DigiKey Canada](https://www.digikey.ca/en/products/detail/onsemi/1N4728A/977183) | ≈ $1–3 |
| WS2812B strip, 1 m, 60 LEDs (cut into 6 rings) | 1 | [Abra Electronics](https://abra-electronics.com/opto-illumination/led-strips/5v-addressable/led-strip-13-1m-rgb-60-5050-leds-1-meter-strip-ws2812-individually-addressable-3-pin-dupont-connector.html) | US$12.51 |
| Silicone trivets ≈ 13 cm (pad tops) | 2 sets | [Walmart search](https://www.walmart.com/search?q=round+silicone+trivet) | ≈ $4.39 each |
| EVA foam sheets 2 mm | 3 | [Hobby Lobby](https://www.hobbylobby.com/crafts-hobbies/basic-crafts/craft-foam/white---foam-sheet---12-x-18---2mm/p/28625) or any craft store | ≈ $0.99 each |
| Velostat sheet | 1 | [Adafruit #1361](https://www.adafruit.com/product/1361) | $4.95 |
| Vibrating mini motor disc | 1 | [The Pi Hut](https://thepihut.com/search?q=vibrating+mini+motor+disc) | £1.70 |
| Jumper wires (if needed) | 1 pack | [Amazon.ca search](https://www.amazon.ca/s?k=dupont+jumper+wires) | ≈ $3–5 (est.) |
| Base: cardboard or scrap plywood | — | recycling | $0 |
| **Total** | | | **≈ $40–48** |

- **Tightest budget (≈ $30):** skip the Velostat and the motor until the Feel lab needs them.
- **Later, not in this kit:**
  - XIAO ESP32S3 (≈ $7)
  - CD74HC4067 multiplexer (≈ $2)
  - [Adafruit DRV2605L](https://www.adafruit.com/product/2305) ($7.95)
  - arcade buttons ([Walmart 6-pack](https://www.walmart.com/ip/Milue-6PCS-Colors-30mm-Arcade-Game-Push-Button-Transparent-Crystal-Button/7068819641))
  - EC11 encoders ([eBay](https://www.ebay.com/shop/ec11), ≈ $12 for 10)
  - single LED rings ([Universal-Solder](https://www.universal-solder.ca/product/12-led-ring-ws2812b-rgb-addressable-50mm/), CA$2.65–2.99)

Buy links for every part are also in Figma, on the part cards in the "Buttons, pads & satisfaction" section.

### Principles for satisfaction

1. **Instant response:** sound in under 10 ms, an LED flash on the same hit, optional haptic.
2. **Rebound:** the surface gives energy back. Too soft feels dead; too hard hurts palms.
3. **Velocity you can see:** harder hits give brighter, bigger light with a short afterglow.
4. **Consistency:** the same force gives the same velocity anywhere on a pad. Calibrate.
5. **Device sound:** pads should *thud* quietly. Buttons can *click*, because that is confirmation.
6. **Weight and grip:** heavy enough not to slide, with rubber feet.
7. **Touch:** matte soft-touch silicone on pads, crisp detents on knobs.
8. **Reward moments:** in the game, "Perfect" hits get an extra light burst and haptic.
9. **Test it:**
   - Blind A/B with 5 people, rated 1–7 on "satisfying" and "comfortable after 10 min".
   - Check velocity consistency in the Monitor.

## Running the app

```bash
python -m http.server 8000 --directory web
```

Open http://localhost:8000 in Chrome or Edge, click to start audio, then **Connect serial** (for DevKitC V4) or **Connect MIDI** (for native-USB boards). Close the Arduino Serial Monitor first.

## Sources (selection)

- Roland HandSonic HPD-20: https://www.roland.com/au/products/handsonic_hpd-20/
- BopPad review: https://www.soundonsound.com/reviews/keith-mcmillen-instruments-boppad
- Melodics: https://melodics.com/finger-drumming
- BLE MIDI latency (Adafruit): https://learn.adafruit.com/web-ble-midi/ble-midi
- ESP32-DevKitC V4 guide: https://docs.espressif.com/projects/esp-idf/en/v4.4/esp32/hw-reference/esp32/get-started-devkitc.html
- Seeed XIAO ESP32S3: https://thepihut.com/products/seeed-studio-xiao-esp32s3
- Adafruit ESP32-S3 Feather: https://adafruit.com/product/5477
- Keyboard ergonomics (Microsoft): https://msdn.microsoft.com/zh-tw/library/windows/hardware/dn629628
- Djembe posture: https://afrodrumming.com/how-do-i-hold-my-djembe/

The full source list is in the Sources section of the Figma board.
