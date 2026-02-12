#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <Adafruit_INA219.h>

/* ====== WIFI DEL CELULAR ====== */
const char* WIFI_SSID = "effen";
const char* WIFI_PASS = "kevin3001";

/* ====== API ====== */

const char* API_HOST    = "192.168.43.123";   
const uint16_t API_PORT = 3002;
const char* API_PATH    = "/api/v1/lecturas";

// Identificación del dispositivo (según tu tabla eolicos)
const char* DEVICE_CODE = "0001";
const char* DEVICE_KEY  = "bf4df3f2679a4caa9e274ee22ae627d31619d74c44e6c0ec5ebfdab46378a7c5";

/* ====== AJUSTES ====== */
const uint32_t SEND_EVERY_MS = 5000;
Adafruit_INA219 ina219(0x45);
bool sensorOk = false;
unsigned long lastSend = 0;

/* ====== HELPERS ====== */
float estimateBatteryPercent(float v){
  const float VMIN = 11.0, VMAX = 12.6;
  float pct = (v - VMIN) / (VMAX - VMIN) * 100.0;
  if (pct < 0) pct = 0; if (pct > 100) pct = 100; return pct;
}

bool wifiConnectOnce(){
  WiFi.mode(WIFI_STA);
  WiFi.persistent(false);
  WiFi.setSleep(false);
  WiFi.disconnect(true,true);
  delay(250);

  Serial.print("\nConectando WiFi "); Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  for (int i=0;i<40;i++){ // ~20s
    if (WiFi.status()==WL_CONNECTED){
      Serial.print("WiFi OK. IP: "); Serial.println(WiFi.localIP()); return true;
    }
    delay(500); Serial.print(".");
  }
  Serial.println("\nWiFi FAIL");
  return false;
}

/* ====== SETUP ====== */
void setup(){
  Serial.begin(115200); delay(300);
  Wire.begin(21,22);                  // SDA=21 (verde), SCL=22 (azul)
  sensorOk = ina219.begin();
  Serial.println(sensorOk ? "INA219 OK (0x45)" : "ERROR INA219");
  wifiConnectOnce();
}

/* ====== LOOP ====== */
void loop(){
  // Lecturas
  float vbatt=0,pct=0,consumoW=0;
  if (sensorOk){
    float busV = ina219.getBusVoltage_V();
    float shuntmV = ina219.getShuntVoltage_mV();
    float powermW = ina219.getPower_mW();
    vbatt   = busV + (shuntmV/1000.0);
    pct     = estimateBatteryPercent(vbatt);
    consumoW= powermW/1000.0;
  }

  Serial.println("----- MEDIDA -----");
  Serial.printf("Voltaje bateria: %.2f V\n", vbatt);
  Serial.printf("Bateria:         %.1f %%\n", pct);
  Serial.printf("Consumo:         %.2f W\n", consumoW);
  Serial.println("------------------");

  // Envío
  if (millis()-lastSend >= SEND_EVERY_MS){
    lastSend = millis();

    if (WiFi.status()!=WL_CONNECTED) wifiConnectOnce();

    if (WiFi.status()==WL_CONNECTED){
      String url = String("http://")+API_HOST+":"+String(API_PORT)+API_PATH;
      String payload = String("{\"voltaje\":")+String(vbatt,2)+
                       ",\"bateria\":"+String(pct,1)+
                       ",\"consumo\":"+String(consumoW,2)+"}";

      Serial.println("POST "+url);
      Serial.println(payload);

      HTTPClient http;
      http.begin(url);
      http.addHeader("Content-Type","application/json");
      http.addHeader("X-Device-Code", DEVICE_CODE);
      http.addHeader("X-Device-Key",  DEVICE_KEY);
      int code = http.POST((uint8_t*)payload.c_str(), payload.length());
      String resp = http.getString();
      Serial.printf("HTTP %d\n", code);
      Serial.println(resp);
      http.end();
    } else {
      Serial.println("Sin WiFi -> no se envió");
    }
  }

  delay(1000);
}
