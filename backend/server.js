const express = require('express');
const mqtt = require('mqtt');
const cors = require('cors');

const app = express();
app.use(cors()); // Permite que o frontend acesse o backend
app.use(express.json());

// --- CONFIGURAÇÕES DO BROKER (Corrigido com mqtts:// e a porta 8883) ---
const brokerUrl = 'mqtts://1721999267784c498751b6810b1c4ad3.s1.eu.hivemq.cloud:8883'; 
const mqttOptions = {
    username: 'projeto',
    password: 'Prj123456'
};

// --- TÓPICOS ---
const TOPIC_TEMP = "faculdade/equipe00/casa/quarto/temperatura";
const TOPIC_LED  = "faculdade/equipe00/casa/quarto/led";

let ultimaTemperatura = "--";

// Conectando o Backend ao Broker MQTT
const mqttClient = mqtt.connect(brokerUrl, mqttOptions);

mqttClient.on('connect', () => {
    console.log('Backend conectado ao Broker HiveMQ com sucesso!');
    mqttClient.subscribe(TOPIC_TEMP);
});

mqttClient.on('error', (err) => {
    console.error('Erro ao conectar no MQTT:', err);
});

mqttClient.on('message', (topic, message) => {
    if (topic === TOPIC_TEMP) {
        ultimaTemperatura = message.toString();
        console.log(`Temperatura atualizada no backend: ${ultimaTemperatura}°C`);
    }
});

// --- ROTAS DA API PARA O FRONTEND ---

// Rota para o Frontend pegar a temperatura atual (Polling)
app.get('/api/temperatura', (req, res) => {
    res.json({ temperatura: ultimaTemperatura });
});

// Rota para o Frontend mandar ligar/desligar o LED
app.post('/api/led', (req, res) => {
    const { comando } = req.body; // Espera {"comando": "1"} ou {"comando": "0"}
    
    if (comando === "1" || comando === "0") {
        mqttClient.publish(TOPIC_LED, comando, { qos: 1 });
        console.log(`Comando enviado para o LED: ${comando}`);
        // CORRIGIDO: Removido o espaço do nome da chave para evitar erro de sintaxe
        return res.json({ status: "sucesso", comandoEnviado: comando });
    }
    
    return res.status(400).json({ error: "Comando inválido. Use '1' ou '0'." });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor Backend rodando com sucesso na porta ${PORT}`);
});