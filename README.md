# NetDoc Live Survey

Build a production-quality web application called NetDoc WiFi Survey for real-time Wi-Fi coverage surveying and heatmap generation.

The application is intended for Wi-Fi troubleshooting, site surveys, and hackathon demonstration. It must look like a professional network engineering tool rather than a generic dashboard.

IMPORTANT ARCHITECTURE:

The browser frontend must NOT pretend that it can directly access Wi-Fi hardware. A normal browser cannot reliably access Windows Wi-Fi RSSI/BSSID information. Build the frontend around a LOCAL WIFI AGENT architecture.

The frontend communicates with a locally running FastAPI service at:

http://127.0.0.1:8765

Use REST endpoints for configuration and WebSocket communication for live measurements.

The local agent will later be implemented separately in Python and will access Windows WLAN APIs / appropriate Windows Wi-Fi interfaces.

The frontend must gracefully support three states:

DEMO MODE

CONNECTING

LIVE HARDWARE MODE

Never fabricate real measurements when LIVE HARDWARE MODE is selected. If the local agent is unavailable, clearly show "Scanner Offline" and provide a button to enter Demo Mode.

CORE PRODUCT:

Create a real-time Wi-Fi site survey application where a user can upload a floor plan, calibrate it, select a Wi-Fi network, walk around the physical location, collect measurements, and generate a live signal-strength heatmap.

MAIN FEATURES:

DASHBOARD

Create a professional dark network-engineering interface.

Top navigation:

NetDoc WiFi Survey

Live Survey

Heatmap

Networks

Access Points

Analytics

Reports

Troubleshoot

Top-right status:

Scanner status

Wi-Fi connection status

Current SSID

Live/Demo indicator

Main dashboard metrics:

RSSI

SNR

Link Rate

TX Rate

RX Rate

Channel

Frequency

Band

Ping

Download Speed

Upload Speed

Packet Loss

Use clear units such as:

RSSI: -48 dBm
SNR: 32 dB
Link Rate: 866 Mbps
Ping: 12 ms

Do not display fake values in live hardware mode.

LIVE FLOOR PLAN

Allow the user to:

Upload PNG/JPG/PDF floor plans

Draw or edit survey areas

Calibrate the floor plan using a known distance

Zoom

Pan

Reset view

Add access points

Mark walls/obstacles

Start and stop surveying

Display the user's current survey position as a pulsing location marker.

Display access points as Wi-Fi icons.

Example:

📍 = current user position
📡 = access point

LIVE HEATMAP

Create a smooth interpolated Wi-Fi heatmap over the floor plan.

Measurements arrive as points containing:

{
timestamp,
x,
y,
rssi,
snr,
link_rate,
tx_rate,
rx_rate,
channel,
frequency,
band,
ssid,
bssid
}

Render the heatmap from REAL received measurement points.

Do not invent measurements in LIVE mode.

Support heatmap layers:

Signal Strength / RSSI

SNR

Noise

Channel

Access Point Coverage

Link Rate

Download Speed

Upload Speed

Ping

Packet Loss

Allow switching between layers.

Provide a clear legend.

RSSI should use configurable thresholds and visually distinguish excellent, good, weak, and dead-zone areas.

LIVE SURVEY MODE

Create a prominent:

START SURVEY

button.

When clicked:

connect to the local Wi-Fi agent

request current Wi-Fi measurements

receive measurements through WebSocket

update the current metrics

record the current survey point

update the heatmap

update charts

update statistics

Add:

PAUSE SURVEY
STOP SURVEY
CLEAR MEASUREMENTS

Show:

Measurements: 143
Survey duration: 04:32
Area covered: 72%
Average RSSI: -56 dBm
Weakest RSSI: -78 dBm
Best RSSI: -39 dBm

POSITIONING SYSTEM

Support two positioning concepts:

A. Floor-plan positioning

The user manually clicks/taps their current position on the floor plan while walking.

B. Device/location positioning

If a compatible local agent provides location information, use it.

Do not pretend GPS coordinates automatically correspond to positions on an indoor floor plan.

Provide a calibration/mapping layer that converts physical coordinates into floor-plan x/y coordinates.

Show the positioning source clearly:

"Position: Floor Plan Manual"
or
"Position: Local Agent"

WIFI NETWORK SCANNER

Create a Networks page showing detected networks.

Columns:

SSID
BSSID
RSSI
Channel
Frequency
Band
Security
Signal Quality

Allow filtering by:

SSID

Band

Channel

Signal strength

Allow selecting one network as the survey target.

ACCESS POINT PAGE

Display detected access points.

For each AP:

SSID

BSSID

RSSI

Channel

Band

Frequency

signal history

first seen

last seen

Allow selecting an AP and showing its measurements on the heatmap.

REAL-TIME CHARTS

Create charts for:

RSSI over time
SNR over time
Link rate over time
Ping over time
Download speed over time

Charts must update as new measurements arrive.

Allow pausing chart updates.

TROUBLESHOOTING

Create an intelligent troubleshooting panel.

Analyze collected measurements and detect:

weak signal

dead zones

low SNR

high noise

channel congestion

unstable signal

poor link rate

high latency

packet loss

Example result:

CRITICAL
Dead Zone Detected

RSSI: -78 dBm
SNR: 11 dB

Possible causes:

excessive distance from AP

physical obstruction

interference

poor AP placement

Recommended action:
Investigate AP placement and channel conditions.

Add a button:

"Troubleshoot with AI"

The button should be structured so it can later call an existing backend/OpenRouter AI troubleshooting endpoint.

Do not expose an API key in frontend code.

REPORTS

Allow generating a survey report containing:

project name

survey date

selected SSID

access points

coverage percentage

average RSSI

minimum RSSI

maximum RSSI

average SNR

dead zones

channel information

charts

heatmap

Provide:

Export CSV
Export JSON
Export PNG
Print Report

PROJECT MANAGEMENT

Allow:

New Project
Open Project
Save Project
Delete Project

Project data should contain:

floor plan

calibration

survey points

access points

network metadata

heatmap settings

survey timestamps

Use browser-side storage only for temporary/demo state. Structure the code so persistent storage can later be connected to Supabase.

LOCAL AGENT CONNECTION

Create a dedicated Scanner Settings page.

Default:

Agent URL:
http://127.0.0.1:8765

Add:

Connect
Disconnect
Test Connection

Expected REST endpoints:

GET /health
GET /wifi/current
GET /wifi/networks
POST /wifi/scan
GET /wifi/interfaces

Expected WebSocket:

ws://127.0.0.1:8765/ws

WebSocket messages should use a predictable structure such as:

{
"type": "wifi_measurement",
"timestamp": "...",
"ssid": "...",
"bssid": "...",
"rssi": -52,
"snr": 31,
"channel": 36,
"frequency": 5180,
"band": "5 GHz",
"link_rate": 866,
"tx_rate": 866,
"rx_rate": 866
}

The frontend must validate incoming messages and gracefully handle missing fields.

DEMO MODE

Create a realistic Demo Mode for development and hackathon presentation.

Demo Mode should simulate a user walking across a floor plan and gradually generate measurement points.

Clearly label:

DEMO MODE — SIMULATED DATA

Never mix simulated data with real survey data.

Add a button:

"Start Demo Walk"

The simulated user marker should move across the floor plan and generate a believable heatmap.

UI DESIGN

Use a premium network engineering aesthetic.

Dark theme.

Colors should be restrained and professional.

Use:

deep dark background

translucent panels

subtle borders

professional typography

compact metric cards

clean charts

large central floor-plan workspace

Avoid excessive neon/glowing effects.

The application should feel similar in quality to professional tools such as NetSpot, Ekahau, UniFi Network, and enterprise NOC dashboards, while having its own NetDoc identity.

Make it fully responsive but prioritize desktop/laptop usage.

SAFETY / ACCURACY

CRITICAL:

Never fabricate real Wi-Fi hardware measurements.

When hardware data is unavailable:

show:

"Waiting for Wi-Fi scanner..."

When scanner is disconnected:

show:

"Scanner Offline"

When running Demo Mode:

show:

"DEMO MODE — SIMULATED DATA"

Clearly distinguish:

REAL DATA
SIMULATED DATA

TECHNICAL IMPLEMENTATION

Use:

React
TypeScript
Tailwind CSS
A suitable mapping/visualization library
WebSocket client
Clean component architecture

Create reusable components:

WifiMetricCard
ConnectionStatus
FloorPlanViewer
HeatmapLayer
SurveyPoint
AccessPointMarker
NetworkTable
SignalChart
SurveyControls
TroubleshootingPanel
ReportGenerator
ScannerConnectionPanel

Keep the code modular and production-ready.

Do not hardcode API keys.

Do not create a fake backend pretending to access Wi-Fi hardware.

Create clean API interfaces so the Python FastAPI local agent can be connected later.

INITIAL EXPERIENCE

When the application opens, show:

NetDoc WiFi Survey

"Turn real Wi-Fi measurements into a live coverage map."

Buttons:

START NEW SURVEY
OPEN PROJECT
TRY DEMO MODE

Also show:

Scanner:
● Offline

Network:
Not connected

Position:
Not available

HACKATHON PRESENTATION

Make the application visually impressive when demonstrating:

Open floor plan

Connect scanner

Select Wi-Fi network

Start survey

Move across the floor

Show live RSSI values

Show live location marker

Heatmap grows in real time

Identify dead zone

Open troubleshooting

Generate recommendation

Export final report

The application should make it obvious that this is a real Wi-Fi measurement and troubleshooting platform, not merely a decorative heatmap.

Build the frontend completely and structure the code for the local FastAPI Wi-Fi agent integration.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://wifi-mapper-live.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e1645caf-6da5-4a27-9e5e-218159630447).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
