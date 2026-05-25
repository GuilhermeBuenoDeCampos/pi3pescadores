# Sistema de Rastreamento de Eventos de Visitante

## Configuração

O sistema está configurado para registrar os seguintes eventos:
- `visitou_home` - Quando o usuário acessa a página inicial
- `visualizou_produto` - Quando visualiza detalhes de um produto
- `adicionou_produto_no_carrinho` - Quando adiciona um produto ao carrinho
- `checkout` - Quando inicia o processo de checkout
- `comprou` - Quando completa uma compra

## Como usar no Frontend

### 1. Importar a função
```javascript
import { registrarEventoVisitante } from '../services/visitanteEvento';
```

### 2. Registrar um evento
```javascript
// Na página inicial (useEffect)
useEffect(() => {
  registrarEventoVisitante('visitou_home');
}, []);

// Ao visualizar um produto
const handleVerProduto = (produtoId) => {
  registrarEventoVisitante('visualizou_produto');
  // ... resto da lógica
};

// Ao adicionar ao carrinho
const handleAdicionarCarrinho = () => {
  registrarEventoVisitante('adicionado_produto_no_carrinho');
  // ... resto da lógica
};

// No checkout
const handleCheckout = () => {
  registrarEventoVisitante('checkout');
  // ... resto da lógica
};

// Após compra bem-sucedida
const handleCompraCompleta = () => {
  registrarEventoVisitante('comprou');
  // ... resto da lógica
};
```

## APIs Disponíveis

### Registrar Evento
```
POST /api/visitante-evento
Content-Type: application/json

{
  "evento": "visitou_home"
}

Response:
{
  "id": 1,
  "evento": "visitou_home",
  "ip": "192.168.1.1",
  "dispositivo": "Mozilla/5.0...",
  "criado_em": "2024-01-15T10:30:00Z"
}
```

### Obter Estatísticas
```
GET /api/visitante-evento/stats

Response:
[
  {
    "evento": "visitou_home",
    "total": 150
  },
  {
    "evento": "visualizou_produto",
    "total": 120
  },
  {
    "evento": "adicionado_produto_no_carrinho",
    "total": 45
  },
  {
    "evento": "checkout",
    "total": 30
  },
  {
    "evento": "comprou",
    "total": 25
  }
]
```

### Obter Eventos Recentes
```
GET /api/visitante-evento/recentes?dias=7

Response: Array de eventos dos últimos 7 dias
```

## Informações Capturadas

Cada evento registra automaticamente:
- **IP**: Endereço IP do visitante (considerando proxies)
- **Dispositivo**: User-Agent do navegador
- **Evento**: Tipo do evento
- **Data/Hora**: Timestamp da criação

## Próximas Integrações

Para integrar completamente, você precisa:

1. **Home Page** (`App.jsx` ou página inicial):
   ```javascript
   useEffect(() => {
     registrarEventoVisitante('visitou_home');
   }, []);
   ```

2. **Página de Produto** (`ProductDetails.jsx` ou similar):
   ```javascript
   useEffect(() => {
     registrarEventoVisitante('visualizou_produto');
   }, [productId]);
   ```

3. **Carrinho** (`CartPage.jsx` ou componente de adicionar ao carrinho):
   ```javascript
   const handleAdicionarCarrinho = () => {
     registrarEventoVisitante('adicionado_produto_no_carrinho');
     // ... resto
   };
   ```

4. **Checkout** (iniciar checkout):
   ```javascript
   const handleIniciarCheckout = () => {
     registrarEventoVisitante('checkout');
     // ... resto
   };
   ```

5. **Confirmação de Compra** (após sucesso):
   ```javascript
   const handleCompraCompleta = () => {
     registrarEventoVisitante('comprou');
     // ... resto
   };
   ```
