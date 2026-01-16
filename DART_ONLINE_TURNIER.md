# Dart Online Turnier - Projekt Spezifikation

## 🎯 Projektübersicht

Ein Online-Turnier-System für Dart, bei dem Spieler auf ihrer eigenen Dartscheibe spielen und sich mit anderen messen können. Das System nutzt Multi-Kamera-Verification mit KI-Bildanalyse und Peer-Verification, um Cheating zu verhindern.

---

## 🚨 Das Kernproblem

### Warum einfache Eingabe nicht funktioniert

**Beim Online-Poker:**
- Server kennt alle Karten
- Jeder Spielzug ist verifizierbar
- Manipulationen unmöglich

**Beim Online-Dart (ohne Verification):**
- Spieler könnte "Triple-20" eingeben, auch wenn daneben geworfen
- Keine Überprüfungsmöglichkeit
- Turniere mit Echtgeld unmöglich

### Die Lösung: Multi-Kamera + Gegner-Verification

1. **4 Kameras** aus verschiedenen Winkeln (wie Videoschiedsrichter)
2. **Künstliche Intelligenz** erkennt automatisch Punkte
3. **Gegner-Bestätigung** (wie beim echten Dart - Caller ruft Score an)
4. **Statistik-Überprüfung** erkennt unrealistische Ergebnisse

---

## 💰 Hardware-Setup Optionen

### Option A: Budget-Setup (75€)

**Komponenten:**
- 4× ESP32-CAM Module (Mini-Computer mit Kamera): 28€
- 4× Micro-USB Kabel (Stromversorgung): 8€
- 1× USB-Hub (4-Port, powered): 12€
- 1× Netzteil 5V/4A: 10€
- 3D-Druck Mount (PLA, ~200g): 4€
- Kleinteile (Schrauben, Kabel): 5€
- Versand/Verpackung: 8€

**Verkaufspreis:** 99€  
**Marge:** 24€

**Vorteile:**
- Sehr günstig
- Einfach zu bauen
- WiFi-fähig
- 3D-Halter selbst druckbar

**Nachteile:**
- Begrenzte Bildqualität
- Keine lokale KI-Verarbeitung
- Internetverbindung nötig

---

### Option B: Premium-Setup (266€)

**Komponenten:**
- 1× Raspberry Pi 4 (4GB): 60€
- 4× Raspberry Pi Camera Module v2: 100€
- 1× Camera Multiplexer (Arducam): 35€
- 1× MicroSD Card 32GB: 8€
- 1× Netzteil Raspberry Pi: 12€
- 1× Gehäuse für Pi: 10€
- 3D-Druck Mount (verstärkt, ~300g): 6€
- 4× Ribbon-Kabel: 20€
- Kleinteile: 5€
- Versand/Verpackung: 10€

**Verkaufspreis:** 349€  
**Marge:** 83€

**Vorteile:**
- Beste Bildqualität (HD)
- KI läuft lokal (kein Server nötig)
- Funktioniert offline
- Nur 1 Stromkabel
- DSGVO-konform

**Nachteile:**
- Teurer
- Komplexere Installation
- Raspberry Pi Lieferprobleme möglich

---

### Option C: Hybrid-Setup (80€) 🏆 EMPFOHLEN

**Komponenten:**
- 1× Raspberry Pi Zero 2 W: 18€
- 4× ESP32-CAM Module: 28€
- 1× USB-Hub Mini: 8€
- 1× Netzteil kompakt: 8€
- 3D-Druck Mount (optimiert): 4€
- Kabel + Kleinteile: 6€
- Versand/Verpackung: 8€

**Verkaufspreis:** 119€  
**Marge:** 39€

**Warum empfohlen:**
- Günstig wie Option A (80€)
- KI läuft lokal wie Option B
- Beste Preis-Leistung
- Kompakt (Pi Zero ist winzig)
- Perfekt zum Skalieren

**Bei Massenproduktion (100+ Stück):**
- Kosten fallen auf 60€
- Verkauf für 99€
- Marge: 39€

---

## 🏗️ Hardware-Architektur

### Kamera-Positionierung

```
Blick von oben auf die Dartscheibe:

          📷 Kamera 1 (oben)
                ↓
                
📷 ← [🎯 DARTBOARD] → 📷
Kamera 4    ⚫        Kamera 2
(links)   Bulls Eye  (rechts)
                
                ↑
          📷 Kamera 3 (unten)

Alle 4 Kameras sind ca. 50cm von der 
Scheibe entfernt und auf den Ring gerichtet.
```

### Hybrid-Setup (Empfohlen)

```
ESP32-Cam macht Fotos (günstig)
    ↓↓↓↓
[💻 Pi Zero 2] verarbeitet Fotos (smart)

          📷 Kamera 1
            ↓
📷 → [🎯] ← 📷
     ↓ ↘
📷 ↓   [Pi Zero]
          ↓
     (WiFi zum Gegner)
```

**Arbeitsteilung:**
- **ESP32-Kameras:** Machen nur Fotos (billig)
- **Pi Zero 2:** Führt KI-Analyse aus (smart)
- Zusammen: Schnell + Günstig + Zuverlässig

---

## 💻 Software-Architektur

### Tech-Stack

#### Frontend (Mobile App)
```
React Native
├── iOS
├── Android
└── Web (Progressive Web App)

Libraries:
- TensorFlow.js Lite (On-Device-Erkennung)
- WebRTC (Live-Stream)
- React Navigation
- AsyncStorage
```

#### Backend (VPS - bereits vorhanden)
```
Python + FastAPI
├── YOLOv8 (Dart-Erkennung)
├── Custom Model (Segment-Klassifikation)
├── PostgreSQL (Game-States, User-Data)
└── Redis (Caching, Real-time)

Alternative KI-Services:
- OpenAI GPT-4 Vision API
- Claude 3.5 Sonnet Vision API
```

#### ESP32-CAM Firmware
```c
// Arduino/PlatformIO
#include <WiFi.h>
#include <esp_camera.h>
#include <HTTPClient.h>
```

#### Raspberry Pi Zero Software
```python
# Python
- OpenCV (Bildverarbeitung)
- YOLOv8 (Dart-Detection)
- FastAPI (lokale API)
- MQTT (Event-Kommunikation)
```

---

## 🔄 Workflow: Wie funktioniert ein Spiel?

### 1. Wurf-Erkennung

```
Spieler A wirft
    ↓
4 Kameras triggern gleichzeitig
    ↓
Fotos → Server/Pi Zero (oder Cloud API)
    ↓
KI analysiert & schlägt vor: "T20, 5, 1 = 46"
    ↓
Spieler B (Gegner) sieht:
  - 4 Kamera-Angles
  - KI-Vorschlag: "46 Punkte"
    ↓
Spieler B bestätigt: ✅ oder korrigiert 🚫
    ↓
Bei Dispute: Community-Review-Queue
```

### 2. Code-Beispiel: ESP32-CAM

```cpp
#include <WiFi.h>
#include <esp_camera.h>
#include <HTTPClient.h>

const char* serverUrl = "https://your-api.celox.io/upload";
int cameraId = 1; // 1-4 für jede Kamera

void setup() {
  // Kamera initialisieren
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  // ... weitere Pins
  
  esp_camera_init(&config);
  WiFi.begin("YourSSID", "password");
}

void loop() {
  // Warte auf Trigger (Button oder MQTT-Signal)
  if (digitalRead(TRIGGER_PIN) == HIGH) {
    captureAndSend();
    delay(2000); // Debounce
  }
}

void captureAndSend() {
  camera_fb_t *fb = esp_camera_fb_get();
  
  if (!fb) return;
  
  HTTPClient http;
  http.begin(serverUrl);
  http.addHeader("Content-Type", "image/jpeg");
  http.addHeader("Camera-ID", String(cameraId));
  
  int httpCode = http.POST(fb->buf, fb->len);
  
  esp_camera_fb_return(fb);
  http.end();
}
```

### 3. Backend API Endpoints

```python
from fastapi import FastAPI, File, UploadFile
from typing import List
import cv2
import numpy as np

app = FastAPI()

@app.post("/api/v1/analyze-throw")
async def analyze_throw(
    game_id: str,
    player_id: str,
    images: List[UploadFile] = File(...)
):
    """
    Analysiert 4 Bilder eines Wurfs
    Returns: Vorgeschlagener Score
    """
    
    # Bilder verarbeiten
    dart_positions = []
    for image in images:
        img_bytes = await image.read()
        img = cv2.imdecode(np.frombuffer(img_bytes, np.uint8), cv2.IMREAD_COLOR)
        
        # YOLOv8 Detection
        position = detect_dart_position(img)
        dart_positions.append(position)
    
    # Triangulation aus 4 Winkeln
    final_score = triangulate_score(dart_positions)
    
    # Speichern für Gegner-Review
    await store_for_review(game_id, player_id, images, final_score)
    
    return {
        "suggested_score": final_score,
        "confidence": 0.92,
        "review_required": False
    }

@app.get("/api/v1/pending-reviews/{opponent_id}")
async def get_pending_reviews(opponent_id: str):
    """
    Gegner holt offene Würfe zum Bestätigen
    """
    pending = await get_pending_throws(opponent_id)
    return pending

@app.post("/api/v1/confirm-throw")
async def confirm_throw(
    throw_id: str,
    confirmed: bool,
    corrected_score: int = None
):
    """
    Gegner bestätigt oder korrigiert Score
    """
    if confirmed:
        await finalize_throw(throw_id)
    else:
        await flag_for_review(throw_id, corrected_score)
    
    return {"status": "ok"}
```

---

## 🤖 KI-Integration

### Option 1: Vision API (Start-Phase)

**Empfohlen für schnellen Start:**

```python
# OpenAI GPT-4 Vision
import openai

async def analyze_with_vision_api(image_base64: str):
    response = await openai.ChatCompletion.acreate(
        model="gpt-4-vision-preview",
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": "Analyze this dartboard image. Where did the dart land? Return: segment number, ring (single/double/triple), exact score."
                    },
                    {
                        "type": "image_url",
                        "image_url": f"data:image/jpeg;base64,{image_base64}"
                    }
                ]
            }
        ],
        max_tokens=100
    )
    
    return response.choices[0].message.content
```

**Kosten:**
- OpenAI GPT-4 Vision: ~0,01€ pro Bild
- 4 Bilder pro Wurf: 0,04€
- 20 Würfe pro Spiel: 0,80€
- 10 Spiele/Monat: **8€/User/Monat**

**Claude 3.5 Sonnet Alternative:**
```python
# Anthropic Claude Vision
import anthropic

client = anthropic.Anthropic(api_key="your-key")

async def analyze_with_claude(image_base64: str):
    message = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=100,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/jpeg",
                            "data": image_base64,
                        },
                    },
                    {
                        "type": "text",
                        "text": "Analyze dartboard: segment, ring, score?"
                    }
                ],
            }
        ],
    )
    return message.content[0].text
```

**Kosten:**
- Claude 3.5 Sonnet: ~0,008€ pro Bild
- 4 Bilder: 0,032€
- **Günstiger als OpenAI!**

---

### Option 2: Eigenes Modell (nach 6 Monaten)

**YOLOv8 Custom Training:**

```python
from ultralytics import YOLO

# 1. Dataset vorbereiten
# - Sammle 5000+ Bilder von Würfen
# - Labelieren mit Roboflow/LabelImg
# - Format: YOLO (bounding boxes)

# 2. Model trainieren
model = YOLO('yolov8n.pt')  # Nano model als Basis

results = model.train(
    data='dartboard.yaml',
    epochs=100,
    imgsz=640,
    batch=16,
    device='cuda'  # GPU nötig
)

# 3. Export für Pi Zero
model.export(format='onnx')  # Optimiert für CPU

# 4. Inference auf Pi Zero
model = YOLO('dartboard.onnx')
results = model.predict('image.jpg')
```

**Kosten:**
- Einmalig GPU-Training: ~200€ (z.B. Lambda Labs, RunPod)
- Danach: **0€ laufende Kosten**
- Läuft auf deinem VPS oder Pi Zero

**Training-Dataset:**
- Kaggle: "Dartboard Segmentation Dataset"
- Eigene Fotos: ~5000 Bilder sammeln
- Data Augmentation (Rotation, Beleuchtung)

---

## 🎮 UI/UX Flow

### Mobile App Screens

```
1. HOME
   - Aktive Spiele
   - Freunde online
   - Turnier-Lobby
   
2. GAME SETUP
   - Gegner wählen
   - Spielmodus (301, 501, Cricket)
   - Buy-In festlegen
   
3. GAME PLAY
   ┌─────────────────────┐
   │  Du: 301 Punkte     │
   │  Gegner: 275 Punkte │
   ├─────────────────────┤
   │                     │
   │   [4-Kamera-Grid]   │
   │   📷 📷 📷 📷       │
   │                     │
   │ KI: "60 Punkte"     │
   │ [✅ Bestätigen]     │
   │ [🚫 Korrigieren]    │
   └─────────────────────┘

4. REVIEW (Gegner-Sicht)
   ┌─────────────────────┐
   │ Gegner hat geworfen │
   ├─────────────────────┤
   │ [Foto-Galerie 4×]   │
   │ KI-Vorschlag: 85    │
   │                     │
   │ [✅ Korrekt]        │
   │ [✏️ Korrigieren]    │
   │ [🚩 Melden]         │
   └─────────────────────┘
```

---

## 🛡️ Anti-Cheat System

### Trust-System

```python
class PlayerTrust:
    def __init__(self):
        self.verification_accuracy = 0.0  # Wie oft korrekt verifiziert
        self.dispute_rate = 0.0           # Wie oft angezweifelt
        self.games_played = 0
        self.avg_score = 0.0              # Durchschnittlicher Score
    
    def can_play_for_money(self) -> bool:
        """Darf User in Echtgeld-Turnieren spielen?"""
        return (
            self.games_played >= 20 and
            self.verification_accuracy > 0.90 and
            self.dispute_rate < 0.05
        )
    
    def trust_level(self) -> str:
        """Trust-Level für Auto-Verification"""
        if self.verification_accuracy > 0.95:
            return "GOLD"    # Auto-verified
        elif self.verification_accuracy > 0.85:
            return "SILVER"  # Peer-review
        else:
            return "BRONZE"  # Full review

    def is_suspicious(self) -> bool:
        """Statistische Anomalie-Erkennung"""
        if self.avg_triple_20_rate > 0.45:  # Selbst Profis: ~35%
            return True
        if self.avg_checkout_rate > 0.55:   # Unrealistisch
            return True
        if self.sudden_skill_jump():        # Plötzlich viel besser
            return True
        return False
```

### Anomalie-Detection

```python
def detect_cheating(player_stats):
    """Erkennt unrealistische Statistiken"""
    
    flags = []
    
    # Pro-Level Checks
    if player_stats.triple_20_rate > 0.45:
        flags.append("triple_rate_too_high")
    
    if player_stats.average_score > 95:  # Pro-Durchschnitt: ~85
        flags.append("avg_score_too_high")
    
    # Sudden Jump
    if player_stats.recent_avg > player_stats.historical_avg * 1.5:
        flags.append("sudden_skill_increase")
    
    # Consistency Check
    if player_stats.std_deviation < 5:  # Zu konsistent
        flags.append("suspiciously_consistent")
    
    # Foto-Quality Check
    if player_stats.blurry_photo_rate > 0.3:
        flags.append("suspicious_photo_quality")
    
    return flags
```

---

## 💳 Monetarisierung & Business-Modelle

### Modell 1: Hardware + Abo (Empfohlen)

**Pricing:**
- Hardware-Kit: 119€ (einmalig)
- Monatliches Abo: 10€/Monat

**Kunde zahlt:**
- Jahr 1: 119€ + 120€ = 239€
- Jahr 2+: nur 120€/Jahr

**Dein Gewinn:**
- Hardware: 39€ sofort
- Abo (mit Vision API): 24€/Jahr
- **Nach eigenem KI-Modell: 117€/Jahr** 🚀

---

### Modell 2: Alles-Inklusive

**Pricing:**
- 20€/Monat (Hardware inklusive)

**Kosten:**
- Hardware: 80€ (in 5 Monaten abbezahlt)
- KI-API: 8€/Monat

**Dein Gewinn:**
- Ab Monat 6: ~12€/Monat
- Bei 100 Kunden: 1.200€/Monat
- **Mit eigenem Modell: 20€/Monat = 2.000€/Monat**

---

### Modell 3: Freemium

**Pricing:**
- Basis: Kostenlos (Phone-Kamera)
- Premium: 15€/Monat (mit Kit)

**Strategie:**
1. User starten kostenlos (keine KI-Kosten!)
2. Merken: Mit Kit besser spielen
3. Upgrade zu Premium

**Conversion:**
- 10% upgraden bei 1000 Free-Usern
- = 100 Premium × 15€ = 1.500€/Monat
- Minus 800€ KI = **700€ Profit**

---

## 📊 ROI-Berechnung

### Startkosten (First 100 Kits)

| Position | Kosten |
|----------|--------|
| 1× Prototyp-Kit | 80€ |
| Marketing (Social Media, Ads) | 2.500€ |
| KI-API (OpenAI/Anthropic) | 1.000€ |
| 3D-Druck Filament (Bulk) | 200€ |
| VPS-Server | **0€** ✓ |
| Entwicklung mit KI | **0€** ✓ |
| **TOTAL** | **3.780€** |

### Break-Even bei 100 Kits

| Position | Betrag |
|----------|--------|
| **Einnahmen** | 100 × 119€ = **11.900€** |
| Kosten Hardware | 100 × 80€ = **-8.000€** |
| Startkosten | **-3.780€** |
| **GEWINN** | **+120€** ✅ |

✅ **Bereits bei 100 verkauften Kits profitabel!**

---

### Jahr 1: 500 verkaufte Kits

| Position | Betrag |
|----------|--------|
| **EINNAHMEN** | |
| Hardware | 500 × 119€ = 59.500€ |
| Abos (70% Conversion) | 350 × 120€ = 21.000€ |
| **Total Einnahmen** | **80.500€** |
| | |
| **KOSTEN** | |
| Produktion | 500 × 80€ = 40.000€ |
| KI-API | ~500 User × 10€ = 5.000€ |
| Marketing | 10.000€ |
| VPS-Server | 0€ (vorhanden) |
| Entwicklung | 0€ (selbst mit KI) |
| **Total Kosten** | **55.000€** |
| | |
| **GEWINN JAHR 1** | **+25.500€** 🎉 |

---

### Jahr 2: 1000 verkaufte Kits (kumulativ)

**Gewinn:** +76.500€

**Bei eigenem KI-Modell (nach 6 Monaten):**
- KI-Kosten fallen weg
- **Gewinn steigt auf +153.000€/Jahr** 🚀

---

## 🎯 KI-Kosten im Detail

### Vision API (Start-Phase)

**OpenAI GPT-4 Vision:**
- 0,01€ pro Bildanalyse
- 4 Bilder = 0,04€
- Pro Spiel (20 Würfe): 20 × 0,04€ = **0,80€**
- Pro User/Monat (10 Spiele): **8€**

**Claude 3.5 Sonnet Vision:**
- 0,008€ pro Bildanalyse
- 4 Bilder = 0,032€
- Pro Spiel: **0,64€**
- Pro User/Monat: **~6,40€** (günstiger!)

---

### Eigenes Modell (nach 6 Monaten)

**YOLOv8 Training:**
- Einmalige GPU-Zeit: ~200€
- Dataset sammeln: Eigene User-Fotos
- Training: 100 Epochen auf V100 GPU

**Laufende Kosten:**
- **0€** (läuft auf deinem VPS)
- Nur Strom + Server (bereits vorhanden)

---

## 🚀 Implementierungs-Roadmap

### Phase 1: MVP (Wochen 1-4)

**Ziel:** Proof-of-Concept mit minimaler Funktionalität

**Hardware:**
- [ ] 1× Hybrid-Setup bestellen (80€)
- [ ] 3D-Modell für Mount erstellen
- [ ] Mount drucken & Hardware montieren

**Software:**
- [ ] ESP32-CAM Firmware flashen
- [ ] Backend API Setup (FastAPI)
  - [ ] POST /api/v1/analyze-throw
  - [ ] GET /api/v1/pending-reviews
  - [ ] POST /api/v1/confirm-throw
- [ ] Vision API Integration (Claude 3.5)
- [ ] Basic React Native App
  - [ ] Camera Upload Screen
  - [ ] Review Screen (für Gegner)
  - [ ] Simple Game Logic (301)

**Deliverable:**
- 2 Spieler können gegeneinander spielen
- Fotos werden hochgeladen
- KI schlägt Score vor
- Gegner bestätigt
- Spiel wird gezählt

---

### Phase 2: Beta (Wochen 5-12)

**Ziel:** Erste Beta-Tester, Feedback sammeln

**Features:**
- [ ] User-Registrierung & Login
- [ ] Freunde-System
- [ ] Live-Spiele (WebRTC)
- [ ] Verschiedene Spielmodi (301, 501, Cricket)
- [ ] Statistik-Dashboard
- [ ] Trust-System V1
- [ ] Dispute-Handling

**Hardware:**
- [ ] 10 Test-Kits produzieren
- [ ] An Beta-Tester schicken

**Testing:**
- [ ] 10 aktive Tester
- [ ] Minimum 100 Spiele
- [ ] Feedback-Loop

---

### Phase 3: Launch (Wochen 13-20)

**Ziel:** Öffentlicher Launch, erste 100 zahlende Kunden

**Features:**
- [ ] Payment-Integration (Stripe)
- [ ] Turniere mit Preisgeldern
- [ ] Anti-Cheat System V2
- [ ] Community-Features
- [ ] Leaderboards
- [ ] Push-Notifications

**Marketing:**
- [ ] Landing Page
- [ ] Social Media (Instagram, TikTok)
- [ ] Dart-Foren & Communities
- [ ] Influencer-Kooperationen

**Sales:**
- [ ] 100 Kits verkaufen
- [ ] Break-Even erreichen

---

### Phase 4: Scale (Monate 6-12)

**Ziel:** Eigenes KI-Modell, Expansion

**ML/AI:**
- [ ] Dataset sammeln (5000+ User-Fotos)
- [ ] YOLOv8 Custom Model trainieren
- [ ] Migration von Vision API zu eigenem Modell
- [ ] KI-Kosten auf 0€ senken

**Hardware:**
- [ ] Massenproduktion (500+ Kits)
- [ ] Lieferanten-Verträge
- [ ] Qualitätssicherung

**Expansion:**
- [ ] UK/USA Märkte
- [ ] Kooperationen mit Dart-Clubs
- [ ] White-Label für Organisationen

---

## 📁 Projekt-Struktur

```
dart-online-turnier/
├── hardware/
│   ├── esp32-cam/
│   │   ├── firmware.ino
│   │   └── config.h
│   ├── raspberry-pi/
│   │   ├── setup.sh
│   │   └── inference.py
│   └── 3d-models/
│       └── camera-mount.stl
│
├── backend/
│   ├── api/
│   │   ├── main.py
│   │   ├── routes/
│   │   │   ├── game.py
│   │   │   ├── review.py
│   │   │   └── user.py
│   │   └── models/
│   │       ├── game.py
│   │       └── player.py
│   ├── ml/
│   │   ├── vision_api.py
│   │   ├── yolo_inference.py
│   │   └── training/
│   │       └── train_yolo.py
│   └── requirements.txt
│
├── mobile/
│   ├── src/
│   │   ├── screens/
│   │   │   ├── HomeScreen.tsx
│   │   │   ├── GameScreen.tsx
│   │   │   └── ReviewScreen.tsx
│   │   ├── components/
│   │   │   ├── CameraGrid.tsx
│   │   │   └── ScoreBoard.tsx
│   │   └── services/
│   │       ├── api.ts
│   │       └── websocket.ts
│   └── package.json
│
├── docs/
│   ├── API.md
│   ├── HARDWARE_SETUP.md
│   └── USER_GUIDE.md
│
└── README.md
```

---

## 🔧 Development Setup

### Backend (VPS)

```bash
# Python Environment
python3 -m venv venv
source venv/bin/activate

# Install Dependencies
pip install fastapi uvicorn sqlalchemy psycopg2-binary
pip install opencv-python ultralytics
pip install anthropic openai  # Vision APIs

# Database Setup
createdb dart_online_turnier
alembic upgrade head

# Run Server
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

### Mobile App

```bash
# React Native Setup
npx react-native init DartOnlineTurnier

# Install Dependencies
npm install @react-navigation/native
npm install react-native-webrtc
npm install @anthropic-ai/sdk

# Run on Android
npx react-native run-android

# Run on iOS
npx react-native run-ios
```

### ESP32-CAM

```bash
# Arduino IDE / PlatformIO
platformio init --board esp32cam

# Flash Firmware
pio run -t upload
```

---

## 🧪 Testing

### Unit Tests

```python
# backend/tests/test_game_logic.py
import pytest
from api.models.game import Game

def test_calculate_score():
    game = Game(mode="301")
    assert game.calculate_remaining(301, 60) == 241
    
def test_checkout_validation():
    assert Game.is_valid_checkout(32) == True  # D16
    assert Game.is_valid_checkout(31) == False # Ungerade
```

### Integration Tests

```python
# backend/tests/test_api.py
from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)

def test_analyze_throw():
    response = client.post(
        "/api/v1/analyze-throw",
        files=[
            ("images", ("cam1.jpg", img1_bytes)),
            ("images", ("cam2.jpg", img2_bytes)),
        ],
        data={"game_id": "123", "player_id": "456"}
    )
    assert response.status_code == 200
    assert "suggested_score" in response.json()
```

---

## 📈 Monitoring & Analytics

### Key Metrics

```python
# Track wichtige KPIs
METRICS = {
    # Business
    "active_users": 0,
    "paying_customers": 0,
    "mrr": 0,  # Monthly Recurring Revenue
    "churn_rate": 0.0,
    
    # Product
    "games_played_today": 0,
    "avg_game_duration": 0,
    "dispute_rate": 0.0,
    
    # Technical
    "api_response_time": 0,
    "ki_accuracy": 0.95,
    "uptime": 0.999,
    
    # Costs
    "ki_api_costs_today": 0,
    "bandwidth_usage": 0,
}
```

### Logging

```python
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

# Log jede KI-Anfrage für Kostentracking
@app.post("/api/v1/analyze-throw")
async def analyze_throw(...):
    start_time = datetime.now()
    
    # Vision API Call
    result = await vision_api.analyze(images)
    
    duration = (datetime.now() - start_time).total_seconds()
    cost = len(images) * 0.008  # Claude 3.5 Sonnet
    
    logger.info(f"Vision API Call: {duration}s, ${cost}, accuracy={result.confidence}")
    
    # Track in DB für Reporting
    await db.track_api_usage(user_id, cost, duration)
    
    return result
```

---

## 🛠️ Troubleshooting

### Häufige Probleme

**Problem:** ESP32-CAM verbindet nicht mit WiFi
```
Lösung:
1. WiFi-Credentials prüfen
2. 2.4GHz WiFi nutzen (nicht 5GHz!)
3. Serial Monitor checken für Fehlermeldungen
```

**Problem:** KI erkennt Dart nicht
```
Lösung:
1. Beleuchtung verbessern (LED-Ring?)
2. Kamera-Fokus justieren
3. Mehr Training-Daten sammeln
```

**Problem:** Hohe Latenz bei Gegner-Review
```
Lösung:
1. Bilder komprimieren (JPEG Quality: 80)
2. WebP statt JPEG verwenden
3. CDN nutzen (Cloudflare)
```

---

## 🔐 Sicherheit & DSGVO

### Datenschutz

```
Gespeicherte Daten:
- User-Profil (Name, Email, Hash)
- Spiel-Statistiken
- Fotos (temporär, max. 7 Tage)
- Payment-Info (Stripe hosted)

NICHT gespeichert:
- Rohe Kreditkarten-Daten
- Fotos nach Dispute-Resolution
- IP-Adressen (nur gehashed)
```

### Compliance

- [ ] DSGVO-konform (EU)
- [ ] Cookie-Consent
- [ ] Datenexport-Funktion
- [ ] Löschfunktion ("Recht auf Vergessen")
- [ ] Verschlüsselte Kommunikation (HTTPS/TLS)

---

## 📞 Support & Community

### User-Support

- **Email:** support@celox.io
- **Discord:** (Community-Channel)
- **FAQ:** docs.celox.io/faq
- **Video-Tutorials:** YouTube-Kanal

### Developer-Support

- **GitHub:** github.com/celox-io/dart-online-turnier
- **API Docs:** api.celox.io/docs
- **Slack:** (für Beta-Tester)

---

## 🎉 Launch-Checklist

### Pre-Launch

- [ ] MVP funktioniert stabil
- [ ] 10 Beta-Tester haben positive Erfahrungen
- [ ] Payment-Integration live
- [ ] Landing Page optimiert
- [ ] Social Media Accounts aktiv
- [ ] Support-System eingerichtet
- [ ] Legal (AGB, Datenschutz, Impressum)

### Launch-Day

- [ ] Product Hunt Post
- [ ] Reddit r/darts, r/SideProject
- [ ] Instagram/TikTok Launch-Video
- [ ] Email an Warteliste
- [ ] Influencer-Seeding (5 Kits)

### Post-Launch

- [ ] Daily Monitoring (Bugs, Feedback)
- [ ] Wöchentliche Updates
- [ ] User-Interviews (5-10 pro Woche)
- [ ] Iterations basierend auf Feedback

---

## 💡 Weitere Ideen & Features

### Future Features

- [ ] **Turniere:** Bracket-System, Preisgelder
- [ ] **Training-Modus:** KI-Coach gibt Tipps
- [ ] **AR-Overlay:** Zeige Zielpunkt auf Scheibe
- [ ] **Sponsoring:** Brands können Turniere sponsoren
- [ ] **Merchandise:** Branded Darts, Shirts
- [ ] **API für Clubs:** White-Label für Dart-Vereine

### Kooperations-Möglichkeiten

- **Dart-Hersteller:** Bundle mit Dart-Sets
- **Bar/Pub-Ketten:** Installation in Locations
- **Streaming-Plattformen:** Live-Turniere auf Twitch
- **Sportswear-Brands:** Co-Branding

---

## 📝 Zusammenfassung

### Das Wichtigste auf einen Blick

✅ **Problem gelöst:** Online-Dart mit Cheat-Protection  
✅ **Hardware-Kosten:** 80€ pro Set (Option C)  
✅ **Verkaufspreis:** 119€ (39€ Marge)  
✅ **Startkosten:** 3.780€ (ohne Entwicklung!)  
✅ **Break-Even:** 100 verkaufte Kits  
✅ **Jahr 1 Gewinn:** +25.500€ bei 500 Kits  
✅ **Tech-Stack:** Python, FastAPI, React Native, YOLOv8  
✅ **KI-Kosten:** Start mit Vision API (8€/User), später eigenes Modell (0€)  
✅ **Zeitrahmen:** MVP in 4 Wochen, Launch in 20 Wochen  

---

## 🤝 Credits & Danksagung

Entwickelt von: **Martin Pfeffer | celox.io**  
Projekt-Start: Januar 2026  
Dokumentations-Datum: 2026-01-16

---

**Let's build this! 🎯🚀**
