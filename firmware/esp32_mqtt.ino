#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <DHT.h>

// --- CONFIGURAÇÕES DE REDE E BROKER ---
const char* ssid = "Wokwi-GUEST"; // Wi-Fi simulado do Wokwi 
const char* password = "";

const char* mqtt_server = "1721999267784c498751b6810b1c4ad3.s1.eu.hivemq.cloud"; // Substitua pelo seu host do HiveMQ
const int mqtt_port = 8883; // Porta padrão para WebSockets/TLS seguro
const char* mqtt_user = "projeto"; // Seu usuário do HiveMQ
const char* mqtt_password = "Prj123456"; // Sua senha do HiveMQ

// --- CONFIGURAÇÃO DOS TÓPICOS (Troque 'equipe00' pelo seu número) ---
#define TOPIC_TEMP    "faculdade/equipe00/casa/quarto/temperatura"
#define TOPIC_LED     "faculdade/equipe00/casa/quarto/led"
#define TOPIC_STATUS  "faculdade/equipe00/casa/quarto/status"

#define LED_PIN 2
#define DHT_PIN 15
#define DHT_TYPE DHT22

DHT dht(DHT_PIN, DHT_TYPE);
WiFiClientSecure espClient;
PubSubClient client(espClient);

unsigned long lastMsg = 0;

void setup_wifi() {
  delay(10);
  Serial.println("\nConectando ao Wi-Fi virtual do Wokwi...");
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWi-Fi Conectado com sucesso!");
}

// Essa função roda sempre que o ESP32 recebe uma mensagem do Broker
void callback(char* topic, byte* payload, unsigned int length) {
  String messageTemp;
  for (int i = 0; i < length; i++) {
    messageTemp += (char)payload[i];
  }
  
  Serial.print("Mensagem recebida no tópico [");
  Serial.print(topic);
  Serial.print("]: ");
  Serial.println(messageTemp);

  // Se a mensagem for pro LED, liga ou desliga
  if (String(topic) == TOPIC_LED) {
    if(messageTemp == "1") {
      digitalWrite(LED_PIN, HIGH);
      Serial.println("LED ligado via MQTT!");
    } else if(messageTemp == "0") {
      digitalWrite(LED_PIN, LOW);
      Serial.println("LED desligado via MQTT!");
    }
  }
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Tentando conectar ao HiveMQ Cloud...");
    
    // Gerando um ID aleatório para o cliente
    String clientId = "ESP32Client-";
    clientId += String(random(0, 0xffff), HEX);
    
    // REQUISITO AVANÇADO: Last Will and Testament (LWT) configurado aqui!
    // Se o ESP32 desconectar abruptamente, o broker publica "offline" no tópico de status
    if (client.connect(clientId.c_str(), mqtt_user, mqtt_password, TOPIC_STATUS, 1, true, "offline")) {
      Serial.println("Conectado com sucesso!");
      
      // REQUISITO AVANÇADO: Mensagem retida (retained) para avisar que está online
      client.publish(TOPIC_STATUS, "online", true);
      
      // Se inscreve no tópico para escutar comandos do LED da página Web
      client.subscribe(TOPIC_LED);
    } else {
      Serial.print("Falhou, erro rc=");
      Serial.print(client.state());
      Serial.println(" Tentando novamente em 5 segundos...");
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  dht.begin();

  setup_wifi();
  
  // Ignora a checagem rigorosa de certificado SSL para rodar liso no ESP32 simulado
  espClient.setInsecure(); 
  
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  unsigned long now = millis();
  // Envia a temperatura a cada 5 segundos
  if (now - lastMsg > 5000) {
    lastMsg = now;
    
    float t = dht.readTemperature();

    if (isnan(t)) {
      Serial.println("Erro ao ler o sensor DHT22!");
      return;
    }

    String tempStr = String(t, 1);
    Serial.print("Enviando temperatura: ");
    Serial.println(tempStr);
    
    // Publica a temperatura (QoS 0 por padrão da biblioteca)
    client.publish(TOPIC_TEMP, tempStr.c_str());
  }
}