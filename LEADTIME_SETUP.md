# Implementação Completa do Leadtime

## 📋 Resumo

Toda a lógica de leadtime foi implementada, permitindo rastrear o tempo total de ciclo de cada pedido, desde a chegada do visitante até a conclusão da entrega.

## 🎯 O que foi criado:

### Backend
- ✅ Modelo de banco de dados: `leadtime.js`
- ✅ Serviço: `leadtimeService.js` com 4 funções principais
- ✅ Controlador: `leadtimeController.js`
- ✅ Rotas: `routes/leadtime.js`
- ✅ Integração automática em `pedidoService.js`
- ✅ Migração de banco: `20260602000000-create-leadtime.js`

### Frontend
- ✅ Serviço: `services/leadtime.js`
- ✅ KPI no AdminDashboard com:
  - Média geral em dias/horas/minutos
  - Total de pedidos concluídos
  - Detalhes de tempo por etapa
  - Botão de ajuda com explicação

## 🚀 Como usar:

### 1. Executar Migração do Banco de Dados

```bash
cd backend
npm run migrate
# ou se usar sequelize-cli diretamente:
npx sequelize-cli db:migrate
```

### 2. A lógica está integrada automaticamente em:

#### Criação de Pedido
Quando um pedido é criado, o sistema:
1. Busca eventos anteriores do visitante (visitou_home, adicionou_ao_carrinho)
2. Cria registro de leadtime com essas datas
3. Registra "pendente" com data/hora atual

#### Atualização de Status do Pedido
Quando status muda (confirmado → preparando → enviado → concluido):
1. O leadtime é automaticamente atualizado
2. Registra a data/hora da transição

### 3. Ver no Admin Dashboard

No painel administrativo `/admin`:
- Novo card "Leadtime médio" mostrará:
  - Tempo total em dias e minutos
  - Quantidade de pedidos completos
  - Tempo por etapa

## 📊 Estrutura de Dados

### Tabela `leadtime`
```sql
id BIGINT PRIMARY KEY
pedido_id BIGINT (foreign key → pedido)
usuarios_id UUID (foreign key → usuario)
visitante TIMESTAMP
carrinho TIMESTAMP
pendente TIMESTAMP
confirmado TIMESTAMP
preparando TIMESTAMP
enviado TIMESTAMP
concluido TIMESTAMP
created_at TIMESTAMP
updated_at TIMESTAMP
```

## 🔄 Fluxo de Dados

1. **Visitante chega**
   - Evento "visitou_home" registrado em `visitante_evento`

2. **Visitante adiciona carrinho**
   - Evento "adicionou_produto_no_carrinho" registrado

3. **Visitante cria pedido**
   - Leadtime criado automaticamente
   - Datas de visitante/carrinho preenchidas dos eventos anteriores
   - Pendente recebe data/hora atual

4. **Pedido passa por estágios**
   - Confirmado → data registrada
   - Preparando → data registrada
   - Enviado → data registrada
   - Concluído → data registrada + cálculos finais

5. **Admin visualiza**
   - Dashboard mostra média de leadtime
   - Tempos por etapa disponíveis via API

## 🔌 Endpoints da API

### Obter Média de Leadtime
```
GET /api/leadtime
Response: {
  "data": {
    "media_geral_dias": 2.5,
    "media_geral_horas": 60.2,
    "media_geral_minutos": 12,
    "por_etapa": {
      "visitante_carrinho": 1.5,
      "carrinho_pendente": 0.3,
      ...
    },
    "total_pedidos": 42
  }
}
```

### Obter Leadtime por Período
```
GET /api/leadtime/periodo?mes=1
Response: [
  {
    id: 1,
    pedido_id: 123,
    usuarios_id: "uuid",
    pedido: {...},
    usuario: {...},
    visitante: "2026-06-01T10:00:00Z",
    ...
  }
]
```

### Registrar Evento (Admin only)
```
POST /api/leadtime
Body: {
  "pedido_id": 123,
  "usuarios_id": "uuid",
  "stage": "confirmado"
}
```

## 📝 Notas Importantes

- ⚠️ Leadtime é calculado apenas para pedidos **concluídos**
- ⚠️ Datas são capturadas automaticamente dos eventos anteriores quando disponível
- ⚠️ Se um visitante não teve eventos prévios, campos anteriores ficarão NULL
- ✅ Sistema é tolerante a erros - se leadtime falhar, pedido ainda é criado/atualizado
- ✅ Índices criados para performance: pedido_id, usuarios_id, concluido

## 🛠️ Troubleshooting

### Leadtime não aparece no dashboard
1. Verifique se migração foi executada: `SELECT * FROM leadtime;`
2. Verifique se há pedidos concluídos no sistema
3. Veja console do servidor para erros

### Dados estão truncados
- Verifique tipos de dados: BIGINT para IDs, UUID para usuários

### Performance
- Índices foram criados automaticamente na migração
- Queries de média são otimizadas com Op.ne

## 📚 Arquivos Criados/Modificados

```
backend/
  ├── src/
  │   ├── database/
  │   │   ├── models/
  │   │   │   └── leadtime.js (novo)
  │   │   ├── migrations/
  │   │   │   └── 20260602000000-create-leadtime.js (novo)
  │   ├── services/
  │   │   ├── leadtimeService.js (novo)
  │   │   ├── pedidoService.js (modificado)
  │   │   ├── carrinhoService.js (modificado - import adicionado)
  │   │   └── LEADTIME_README.md (novo)
  │   ├── controllers/
  │   │   └── leadtimeController.js (novo)
  │   ├── routes/
  │   │   ├── leadtime.js (novo)
  │   │   └── index.js (modificado)

frontend/
  ├── src/
  │   ├── services/
  │   │   └── leadtime.js (novo)
  │   ├── pages/
  │   │   └── AdminDashboard.jsx (modificado - KPI adicionado)
```

## ✅ Próximos Passos

1. Execute a migração: `npm run migrate`
2. Reinicie o servidor backend
3. Reload da página frontend
4. Crie alguns pedidos para testar
5. Veja os dados no dashboard admin

Tudo está pronto para usar!
