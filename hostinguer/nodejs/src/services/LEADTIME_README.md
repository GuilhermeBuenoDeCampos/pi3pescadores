# Leadtime Service

## Descrição
Serviço para rastrear e calcular o tempo de ciclo (leadtime) de pedidos desde a chegada do visitante até a conclusão.

## Funcionalidades Principais

### 1. Registrar Evento de Leadtime
```javascript
await leadtimeService.registrarEventoLeadtime(pedidoId, usuarioId, 'confirmado');
```

### 2. Criar Leadtime com Eventos do Visitante
```javascript
await leadtimeService.criarLeadtimeComEventos(pedidoId, usuarioId, dataPedido);
```

### 3. Calcular Média de Leadtime
```javascript
const media = await leadtimeService.calcularMediaLeadtime();
// Retorna: {
//   media_geral_dias: 2.5,
//   media_geral_horas: 60.2,
//   media_geral_minutos: 12,
//   por_etapa: {
//     visitante_carrinho: 1.5,
//     carrinho_pendente: 0.3,
//     // ... outras etapas
//   },
//   total_pedidos: 42
// }
```

### 4. Obter Leadtime por Período
```javascript
const leadtimes = await leadtimeService.obterLeadtimePorPeriodo(1); // último mês
```

## Estágios de Leadtime
- `visitante`: Primeira visita do usuário
- `carrinho`: Adição ao carrinho
- `pendente`: Pedido criado (status inicial)
- `confirmado`: Pagamento confirmado
- `preparando`: Preparando envio
- `enviado`: Pedido enviado
- `concluido`: Entrega completa

## Integração

### Com Pedidos
O leadtime é automaticamente criado quando:
1. Um pedido é criado - registra os eventos prévios do visitante
2. O status do pedido muda - atualiza a data do novo estágio

### Com Visitante Evento
O sistema busca eventos anteriores (`visitou_home`, `adicionou_produto_no_carrinho`) para preencher os estágios iniciais do leadtime.

## API Endpoints

### GET `/leadtime`
Obtém a média de leadtime geral
```json
{
  "data": {
    "media_geral_dias": 2.5,
    "media_geral_horas": 60.2,
    "media_geral_minutos": 12,
    "por_etapa": {...},
    "total_pedidos": 42
  }
}
```

### GET `/leadtime/periodo?mes=1`
Obtém leadtimes de um período específico

### POST `/leadtime` (Admin)
Registra um novo evento de leadtime
```json
{
  "pedido_id": 123,
  "usuarios_id": "uuid",
  "stage": "confirmado"
}
```

## Observações
- Leadtimes são baseados em pedidos que já foram concluídos
- Datas são capturadas automaticamente dos eventos do visitante quando disponível
- Cálculos expressam tempo em horas, que são convertidas para dias/minutos para exibição
