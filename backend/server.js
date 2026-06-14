const express = require('express');
const mqtt = require('mqtt');
const cors = require('cors');

const app = express();
app.use(cors()); 
app.use(express.json());

// --- CONFIGURAÇÕES DO BROKER ---
const BROKER_URL = process.env.BROKER_URL || 'mqtts://1721999267784c498751b6810b1c4ad3.s1.eu.hivemq.cloud:8883'; 
const MQTT_OPTIONS = {
    username: process.env.MQTT_USER || 'projeto',
    password: process.env.MQTT_PASSWORD || 'Prj123456'
};

// --- TÓPICOS (Wildcard) ---
const TOPIC_SUBSCRIBE_TEMP = "faculdade/equipe00/casa/+/temperatura"; // O '+' captura qualquer cômodo dinamicamente
const TOPIC_PUBLISH_LED    = "faculdade/equipe00/casa/quarto/led";

// --- ESTADO DA APLICAÇÃO (Dados guardados em memória para o Gráfico) ---
let ultimaTemperatura = "--";
let historicoTemperaturas = []; // Armazena as últimas 10 leituras com horário

// Inicializando a conexão com o Broker MQTT
const mqttClient = mqtt.connect(BROKER_URL, MQTT_OPTIONS);

mqttClient.on('connect', () => {
    console.log('🚀 Backend conectado ao Broker HiveMQ com sucesso!');
    mqttClient.subscribe(TOPIC_SUBSCRIBE_TEMP, (err) => {
        if (!err) {
            console.log(`📡 Inscrito com sucesso no padrão wildcard: ${TOPIC_SUBSCRIBE_TEMP}`);
        }
    });
});

mqttClient.on('error', (err) => {
    console.error('❌ Erro crítico de conexão no MQTT:', err.message);
});

// Processamento de mensagens recebidas
mqttClient.on('message', (topic, message) => {
    const payload = message.toString();
    
    // Filtro profissional para garantir que estamos lendo um tópico de temperatura
    if (topic.endsWith('/temperatura')) {
        ultimaTemperatura = payload;
        
        // Cria um objeto estruturado com o dado e o horário exato da leitura
        const novaLeitura = {
            temperatura: parseFloat(payload),
            horario: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };

        // Adiciona ao histórico do gráfico
        historicoTemperaturas.push(novaLeitura);
        
        // Regra de negócio: Mantém apenas os últimos 10 registros para poupar memória
        if (historicoTemperaturas.length > 10) {
            historicoTemperaturas.shift(); 
        }

        console.log(`[MQTT] Nova leitura processada de ${topic}: ${payload}°C`);
    }
});

// --- ROTAS DA API RESTFUL ---

// 1. Rota do mostrador simples
app.get('/api/temperatura', (req, res) => {
    res.json({ temperatura: ultimaTemperatura });
});

// 2. Rota que Alimenta o gráfico do Frontend com dados estruturados
app.get('/api/historico', (req, res) => {
    res.json(historicoTemperaturas);
});

// 3. Rota de controle do LED com tratamento de erro
app.post('/api/led', (req, res) => {
    const { comando } = req.body; 
    
    if (comando === "1" || comando === "0") {
        mqttClient.publish(TOPIC_PUBLISH_LED, comando, { qos: 1 }, (err) => {
            if (err) {
                console.error('❌ Falha ao publicar comando:', err.message);
                return res.status(500).json({ error: "Erro interno ao enviar comando ao broker." });
            }
            console.log(`[API] Comando enviado com sucesso para o hardware: ${comando}`);
            return res.json({ status: "sucesso", comandoEnviado: comando });
        });
    } else {
        return res.status(400).json({ error: "Comando inválido. Use '1' ou '0'." });
    }
});

// Inicialização segura do servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🌍 Servidor Backend rodando com sucesso na porta ${PORT}`);
});