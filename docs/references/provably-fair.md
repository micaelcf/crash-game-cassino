# Provably Fair Algorithm

A transparência de um cassino online baseia-se na criptografia para garantir que o resultado (Crash Point) foi predeterminado antes da fase de apostas e não sofreu manipulação baseada no valor que os jogadores injetaram na rodada.

## Como funciona (O Fluxo de Hashes)

### 1. Hash Chain (Server Seed)

Antes do cassino iniciar a operação, gera-se uma semente secreta final (ex: gerada aleatoriamente).
Aplica-se o algoritmo SHA-256 repetidamente a esta seed um número enorme de vezes (ex: 2.000.000 vezes), criando uma "cadeia".
A cada nova rodada do jogo, o servidor consome uma Hash dessa cadeia rodando-a _de trás para frente_ (Reverse Order).

**Mecânica para a UI:**

1. Quando a Rodada está em **BETTING_PHASE**, o servidor exibe abertamente na tela o hash gerado pela função SHA256 (Hash atual da rodada). Ninguém consegue ler o _Crash Point_ através dele porque reverter uma Hash SHA256 é impossível.
2. Quando a rodada **Crashear**, o servidor expõe a _Seed_ crua (a da rodada anterior na geração, mas próxima a ser consumida do banco) que gerou aquele Hash.
3. O jogador pode ir num validador de terceiros (ou fornecido pelo site), imputar a _Seed_ revelada e o algoritmo gerará o _Crash point_ exato. Se aplicar o SHA-256 na Seed revelada, baterá exatamente com a Hash apresentada durante a fase de apostas.

### 2. Client Seed

Para garantir que nem o servidor escolheu uma Hash Chain mágica para prejudicar, injeta-se uma `Client Seed`. Pode ser o Hash do Bloco mais recente da rede Bitcoin no dia, ou uma string aleatória pública de fora do cassino.

## Cálculo Base (Sugestão de Pseudo-Código)

O multiplicador gerado deve seguir a formula da "House Edge" (vantagem da casa - ex: 1 a 4%).

```javascript
import crypto from "crypto";

// serverSeed é o Hash revelado, clientSeed é público (ex: block hash)
function getCrashPoint(serverSeed, clientSeed) {
  const hash = crypto
    .createHmac("sha256", serverSeed)
    .update(clientSeed)
    .digest("hex");

  // Pegue os primeiros 52 bits do hash (8 primeiros bytes)
  const h = parseInt(hash.slice(0, 13), 16);
  const e = Math.pow(2, 52); // O espaço máximo dos bits

  // Caso a casa queira uma vantagem de 1% (House edge), a conta base se faz
  // A fórmula exata varia de site para site, mas usualmente é:
  const multiplier = Math.max(1, Math.floor((100 * e - h) / (e - h)) / 100);

  return multiplier; // Retorna ex: 2.34
}
```

## A API e o Jogo

Você deverá possuir uma rota `GET /games/rounds/:roundId/verify` que entrega esses parâmetros em raw após o encerramento do _Round_, para que qualquer auditor os insira no script de checagem.
