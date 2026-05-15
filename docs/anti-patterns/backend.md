# Backend Anti-Patterns

Ações e arquiteturas que **invalidarão imediatamente** a solução.

## 1. Uso de Floats/Decimais em Variáveis de Linguagem (PONTO FLUTUANTE É PROIBIDO)

**O que não fazer**: `const betAmount: number = 10.50;`
A aritmética de precisão de JavaScript (IEEE 754) gera coisas como `0.1 + 0.2 = 0.30000000000000004`.
**Regra**: Valores em banco e em código são inteiros (centavos). 10 Reais = `1000`. Utilize divisões apenas para apresentação na UI.

## 2. Modelos de Domínio Anêmicos

**O que não fazer**: Criar lógicas de jogo espalhadas inteiramente num `GameService.ts` com 2000 linhas, usando `Round.ts` apenas para conter `id, status, multiplier`.
**Regra**: Centralize o invariante na Entidade. Exemplo, a transição para `CRASHED` pertence ao método `round.crash()`.

## 3. Comunicação Direta entre Base de Dados de Serviços Distintos

**O que não fazer**: O Game Service fazer `SELECT * FROM wallets.users`.
**Regra**: O Game e a Wallet estão separados (DBs separados). A comunicação é feita através do API Gateway (se síncrona/query) ou via RabbitMQ (Eventos).

## 4. Assunções Inseguras sobre o Ambiente

**O que não fazer**: Não considerar "Race Conditions" na hora do "Cash Out" (ex: dois requests na mesma fração de segundo para apostar/sacar com a mesma aposta).
**Regra**: Proteja ações de mutação de saldo ou status de aposta via controle de concorrência optimista ou _locks_ transacionais (ex: `mikro-orm` lock).
