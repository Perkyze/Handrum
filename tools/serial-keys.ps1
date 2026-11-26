<#
  Handpad serial -> keyboard bridge (Windows, no install needed).

  The ESP32-DevKitC V4 has no native USB, so it can't be a USB keyboard by
  itself. Its firmware (firmware/handpad_buttons or firmware/drum_pads) sends
  MIDI notes over the USB serial port instead. This script reads them and
  presses the matching computer key while the pad is held, so the Handpad works
  in any program, like a keyboard.

    note 48 tom 1 -> 2     note 38 snare -> V     note 46 open hi-hat   -> 8
    note 45 tom 2 -> 3     note 36 kick  -> N     note 42 closed hi-hat -> 9
    note 43 floor -> 4                            note 51 ride          -> 0

  Run (finds the ESP32's COM port by itself when only one is plugged in):
    powershell -ExecutionPolicy Bypass -File tools\serial-keys.ps1
    powershell -ExecutionPolicy Bypass -File tools\serial-keys.ps1 -Port COM5
  Stop with Ctrl+C.

  Close the browser's "Connect serial" and the Arduino Serial Monitor first:
  only one program can have the port open. Keys go to whichever window is in
  front.
#>
param(
  [string]$Port,
  [int]$Baud = 115200
)

# MIDI note -> key. Keys are sent as physical key positions (scan codes), like
# a real keyboard, so they land on the same keys with QWERTY or AZERTY.
$keyForNote = @{
  48 = @{ Name = '2'; Scan = 0x03 }  # pad 1 tom 1
  45 = @{ Name = '3'; Scan = 0x04 }  # pad 2 tom 2
  43 = @{ Name = '4'; Scan = 0x05 }  # pad 3 floor tom
  38 = @{ Name = 'V'; Scan = 0x2F }  # pad 4 snare
  36 = @{ Name = 'N'; Scan = 0x31 }  # pad 5 kick
  46 = @{ Name = '8'; Scan = 0x09 }  # pad 6 open hi-hat
  42 = @{ Name = '9'; Scan = 0x0A }  # pad 7 closed hi-hat
  51 = @{ Name = '0'; Scan = 0x0B }  # pad 8 ride
}

if (-not ('Handpad.Keyboard' -as [type])) {
  Add-Type -Namespace Handpad -Name Keyboard -MemberDefinition @'
[DllImport("user32.dll")] public static extern uint MapVirtualKey(uint uCode, uint uMapType);
[DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
'@
}

function Send-HandpadKey([int]$Scan, [bool]$Down) {
  $vk = [Handpad.Keyboard]::MapVirtualKey([uint32]$Scan, 1)  # 1 = scan code -> virtual key, in the current layout
  $flags = if ($Down) { 0 } else { 2 }                        # 2 = KEYEVENTF_KEYUP
  [Handpad.Keyboard]::keybd_event([byte]$vk, [byte]$Scan, [uint32]$flags, [UIntPtr]::Zero)
}

# ---- Find the port ------------------------------------------------------------
if (-not $Port) {
  # DevKitC boards use a Silicon Labs CP210x chip; some clones use a WCH CH340/CH9102.
  $boards = @(Get-CimInstance Win32_PnPEntity -Filter "Name LIKE '%(COM%'" |
    Where-Object { $_.Name -match 'CP210|Silicon Labs|CH340|CH910' })
  if ($boards.Count -eq 1 -and $boards[0].Name -match '\((COM\d+)\)') {
    $Port = $Matches[1]
  } else {
    if ($boards.Count -eq 0) { Write-Host 'No ESP32 board found. Is it plugged in with a data USB cable?' }
    else { Write-Host 'More than one board is plugged in. Pick one with -Port.' }
    Write-Host 'Serial ports on this PC:'
    Get-CimInstance Win32_PnPEntity -Filter "Name LIKE '%(COM%'" | ForEach-Object { Write-Host "  $($_.Name)" }
    Write-Host 'Then run again with -Port COMx.'
    exit 1
  }
}

$serial = New-Object System.IO.Ports.SerialPort $Port, $Baud, 'None', 8, 'One'
# Keep DTR and RTS off: on the DevKitC they drive the reset and boot pins.
$serial.DtrEnable = $false
$serial.RtsEnable = $false
$serial.ReadTimeout = 250  # return regularly so Ctrl+C works
try {
  $serial.Open()
} catch {
  Write-Host "Couldn't open ${Port}: $($_.Exception.Message)"
  Write-Host 'If the browser (Connect serial) or the Arduino Serial Monitor is using it, close that and try again.'
  exit 1
}
Write-Host "Listening on $Port. Press the pads; keys go to the window in front. Ctrl+C to stop."

# ---- Read MIDI bytes and press keys -----------------------------------------
$held = @{}       # note -> scan code, for keys currently held down
$status = 0       # last MIDI status byte (MIDI allows "running status")
$data = New-Object int[] 2
$count = 0

try {
  while ($true) {
    try { $b = $serial.ReadByte() } catch [System.TimeoutException] { continue }
    if ($b -lt 0) { break }                                  # port closed
    if ($b -ge 0xF8) { continue }                            # realtime bytes: skip
    if ($b -ge 0xF0) { $status = 0; continue }               # system messages: ignore until the next status
    if ($b -ge 0x80) { $status = $b; $count = 0; continue }  # new status byte
    if ($status -eq 0) { continue }                          # stray data (e.g. the ESP32's boot text)

    $data[$count] = $b
    $count++
    $type = $status -band 0xF0
    $needed = if ($type -eq 0xC0 -or $type -eq 0xD0) { 1 } else { 2 }
    if ($count -lt $needed) { continue }
    $count = 0

    $note = $data[0]
    $isOn = $type -eq 0x90 -and $data[1] -gt 0
    $isOff = $type -eq 0x80 -or ($type -eq 0x90 -and $data[1] -eq 0)
    $key = $keyForNote[$note]
    if (-not $key) { if ($isOn) { Write-Host "note $note isn't mapped to a key" }; continue }

    if ($isOn) {
      if ($held.ContainsKey($note)) { Send-HandpadKey $key.Scan $false }  # re-hit without a release
      Send-HandpadKey $key.Scan $true
      $held[$note] = $key.Scan
      Write-Host "note $note -> $($key.Name)"
    } elseif ($isOff -and $held.ContainsKey($note)) {
      Send-HandpadKey $key.Scan $false
      $held.Remove($note)
    }
  }
} catch {
  Write-Host "Stopped: $($_.Exception.Message)"
} finally {
  foreach ($scan in @($held.Values)) { Send-HandpadKey $scan $false }  # never leave a key stuck down
  try { $serial.Close() } catch {}
  Write-Host 'Port closed.'
}
