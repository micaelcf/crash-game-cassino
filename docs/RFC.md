# Game Rules and Technical RFC

**Título:** Engine do Crash Game (Microservices + DDD)
**Autores:** Arquitetura (Jungle Gaming)

## 1. Visão Geral

Este RFC descreve a mecânica básica e os fluxos de arquitetura para a execução de uma partida do Crash Game.

## 2. A Mecânica do Jogo (Máquina de Estados)

Uma Rodada (`Round`) tem o seguinte ciclo de vida:

1. `BETTING_PHASE` (Fase de Apostas): Dura um tempo fixo (ex: 5 a 10 segundos). Jogadores submetem pedidos HTTP POST para colocar apostas.
2. `FLYING` (Voando/Em Progresso): O jogo não aceita mais apostas. O frontend começa a aumentar o multiplicador visualmente, a partir de `1.00x`. Jogadores podem fazer "Cash out".
3. `CRASHED` (Encerrado): O backend atinge o ponto exato do Crash Point calculado no início. Emite o evento final via Websocket. Quem não sacou é marcado como perda.

## 3. Arquitetura de Request/Response & Mensageria

### Flow: Realizar Aposta

1. Cliente envia REST POST `/games/bet` para o Kong.
2. Kong autentica o token via Logto e repassa ao **Game Service**.
3. **Game Service** valida se a rodada está `BETTING_PHASE`.
4. Game Service cria a aposta como `PENDING` no banco e envia o evento (RabbitMQ) `BetPlaced { userId, betAmount, roundId }`.
5. **Wallet Service** ouve `BetPlaced`, verifica saldo:
   - Se OK: Subtrai saldo, envia evento `WalletDebited`.
   - Se Falha: Envia evento `WalletDebitFailed`.
6. **Game Service** escuta o resultado. Se `WalletDebited`, marca a aposta como `CONFIRMED`. Se falhar, marca `CANCELLED`.
   _(Nota: Pelo requisito de tempo, estratégias de reserva síncrona com fallback também são aceitáveis caso haja latência de rede no RabbitMQ na janela curta de aposta)._

### Flow: Cash Out

1. Cliente envia POST `/games/bet/cashout` ao **Game Service**.
2. **Game Service** verifica se a rodada está `FLYING` e calcula se o multiplicador exato requisitado é <= ao multiplicador atual do motor backend.
3. Se válido, a aposta transita para `WON`. O lucro é calculado e um evento `PlayerWon { userId, amount }` é despachado ao broker.
4. **Wallet Service** ouve e debita os fundos na carteira.

### Sincronização de Relógio

O multiplicador `M` cresce de forma exponencial no tempo. O Game Service deve enviar um pacote WebSocket para todos de "Início do Voo" contendo um `startTime`. O cliente renderiza o multiplicador derivando-o do tempo atual `Date.now() - startTime` usando a mesma fórmula (ex: $M = e^{k \cdot t}$). O _Crash_ é emitido ao vivo com o valor rígido exato gerado para que a UI pare exatamente naquele dígito.
