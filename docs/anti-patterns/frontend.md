# Frontend Anti-Patterns

Ações e escolhas **estritamente proibidas** no desenvolvimento da interface.

## 1. Múltiplas fontes de verdade (Derivation vs State)

**O que não fazer**: Criar um estado (`useState`) para o valor do multiplicador e um `useState` em paralelo para o "lucro potencial" (aposta × multiplicador).
**Regra**: O estado deve conter o mínimo indispensável (a aposta, o multiplicador). O "lucro" é uma variável derivada: `const profit = betAmount * multiplier`.

## 2. Abuso do React State para Animações em Tempo Real

**O que não fazer**: Fazer um `setState(multiplier)` a cada milissegundo no frontend para atualizar a curva de voo, engatilhando toda a árvore de render do React.
**Regra**: A UI central do jogo não deve sofrer renders completos a cada tick. Manipule o DOM diretamente (`useRef`) para atualizar os números rápidos ou a curva, ou use Framer Motion via `MotionValue`.

## 3. Ignorar Feedback de Rede

**O que não fazer**: Enviar um request POST via fetch para apostar sem desativar o botão de aposta e não colocar um "loading spinner".
**Regra**: O utilizador nunca pode ficar no "escuro". Sempre mostre quando a rede estiver resolvendo a Promise.

## 4. Confiar Exclusivamente no WebSocket para Ações Vitais

**O que não fazer**: Tentar fazer um "Cash out" enviando uma mensagem via WebSocket.
**Regra**: O WebSocket é _apenas_ para receber dados do servidor. Ações do jogador vão pelo Gateway REST para garantir resiliência, retry de rede, e _status codes_ claros (200, 400).
