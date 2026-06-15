# Sistema Distribuído de Automação Residencial (MQTT)

**Disciplina:** N461 - Sistemas Multimídia e Distribuídos  
**Data de Apresentação:** 15/06  

### 👥 Integrantes da Equipe
* Ronald Roland Filho
* Vitor Kazuma

---

## 🌐 Links do Projeto
* **Simulador de Hardware (Wokwi):** [Acessar Circuito no Wokwi](https://wokwi.com/projects/466302787056865281)
* **Interface Web (Frontend na Vercel):** [Acessar Dashboard Web](https://vercel.com/ronald-project/sistema-distribuido-mqtt)
* **Servidor API (Backend no Render):** [Acessar Status do Backend](https://dashboard.render.com/)
* **Broker na Nuvem (HiveMQ Cloud):** [Acessar Console HiveMQ](https://console.hivemq.cloud/clusters/1721999267784c498751b6810b1c4ad3?cta_button=navigationbar&cta_ref=main)

---

## 🧠 Diagrama de Arquitetura

O sistema foi desenhado seguindo uma arquitetura distribuída e desacoplada orientada a eventos (via MQTT), integrada a uma API RESTful para consumo da interface web com atualização em tempo real e histórico em memória (*In-Memory State*).

```mermaid
graph TD
    ESP32[ESP32 - Wokwi] -- MQTT over TLS Porta 8883 --> HiveMQ[Broker HiveMQ Cloud]
    HiveMQ -- MQTT Sub Wildcard + --> Backend[Backend - Node.js/Render]
    Backend -- HTTP API JSON / Polling --> Frontend[Frontend - HTML/CSS/Vercel]
    Frontend -- Gráficos em Tempo Real --> ChartJS[Chart.js Engine]