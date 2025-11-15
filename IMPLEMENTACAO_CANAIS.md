# Implementação de Canais - Documentação Técnica

## ✅ BACKEND COMPLETO (100%)

### Estrutura Implementada

**CONFIG - Canais de Publicidade:**
- Google Ads: Eficiência 0.045/0.065/0.085 (premium/midrange/economic)
- Facebook Ads: Eficiência 0.055/0.075/0.095
- Instagram Ads: Eficiência 0.065/0.070/0.060
- Email Marketing: Eficiência 0.040/0.050/0.055
- Rádio/TV: Eficiência 0.035/0.045/0.050

**CONFIG - Canais de Distribuição:**
- Lojas Próprias: Margem 100%, Capacidade 35%, Share of Wallet 65%, Custos 8%
- Retalhistas: Margem 75%, Capacidade 45%, Share of Wallet 45%, Custos 3%
- E-commerce: Margem 90%, Capacidade 30%, Share of Wallet 55%, Custos 5%
- Grossistas: Margem 60%, Capacidade 50%, Share of Wallet 30%, Custos 2%

### Cálculos Implementados

**calculateNewPeriodData():**
- Calcula clientes adquiridos por cada canal de publicidade
- Calcula CAC por canal (investimento / clientes adquiridos)
- Distribui vendas pelos canais de distribuição
- Aplica margens e custos operacionais específicos por canal
- Calcula margem ponderada final
- Retorna performance detalhada por canal

**generateIdenticalHistory():**
- Gera 5 trimestres históricos com decisões de canais variadas
- Cada trimestre tem distribuição diferente entre canais
- Dados históricos permitem análise de CAC e performance

**submitDecisions():**
- Recolhe decisões de % para os 5 canais de publicidade
- Recolhe decisões de % para os 4 canais de distribuição
- Valida e processa todas as decisões

## 🚧 FRONTEND A COMPLETAR

### 1. Formulário de Decisões (index.html)

**Localização:** Secção `<div id="decisionsView">`

**Adicionar para cada produto (produtoA, produtoB, produtoC):**

```html
<!-- CANAIS DE PUBLICIDADE -->
<div class="decision-group">
    <h4>📢 Canais de Publicidade (Total deve ser 100%)</h4>
    <div class="channels-grid">
        <div class="channel-input">
            <label>Google Ads (%)</label>
            <input type="number" name="adChannel_googleAds_produtoA" id="adChannel_googleAds_produtoA" min="0" max="100" step="1" required>
        </div>
        <div class="channel-input">
            <label>Facebook Ads (%)</label>
            <input type="number" name="adChannel_facebook_produtoA" id="adChannel_facebook_produtoA" min="0" max="100" step="1" required>
        </div>
        <div class="channel-input">
            <label>Instagram Ads (%)</label>
            <input type="number" name="adChannel_instagram_produtoA" id="adChannel_instagram_produtoA" min="0" max="100" step="1" required>
        </div>
        <div class="channel-input">
            <label>Email Marketing (%)</label>
            <input type="number" name="adChannel_email_produtoA" id="adChannel_email_produtoA" min="0" max="100" step="1" required>
        </div>
        <div class="channel-input">
            <label>Rádio/TV (%)</label>
            <input type="number" name="adChannel_radio_produtoA" id="adChannel_radio_produtoA" min="0" max="100" step="1" required>
        </div>
    </div>
</div>

<!-- CANAIS DE DISTRIBUIÇÃO -->
<div class="decision-group">
    <h4>🏪 Canais de Distribuição (Total deve ser 100%)</h4>
    <div class="channels-grid">
        <div class="channel-input">
            <label>Lojas Próprias (%)</label>
            <input type="number" name="distChannel_ownStores_produtoA" id="distChannel_ownStores_produtoA" min="0" max="100" step="1" required>
        </div>
        <div class="channel-input">
            <label>Retalhistas (%)</label>
            <input type="number" name="distChannel_retailers_produtoA" id="distChannel_retailers_produtoA" min="0" max="100" step="1" required>
        </div>
        <div class="channel-input">
            <label>E-commerce (%)</label>
            <input type="number" name="distChannel_ecommerce_produtoA" id="distChannel_ecommerce_produtoA" min="0" max="100" step="1" required>
        </div>
        <div class="channel-input">
            <label>Grossistas (%)</label>
            <input type="number" name="distChannel_wholesalers_produtoA" id="distChannel_wholesalers_produtoA" min="0" max="100" step="1" required>
        </div>
    </div>
</div>
```

**Repetir para produtoB e produtoC**, alterando os IDs.

### 2. Preencher Valores no loadDecisionsForm() (app.js linha 993)

Adicionar após linha 1001:

```javascript
// Preencher canais de publicidade
Object.keys(CONFIG.AD_CHANNELS).forEach(channelId => {
    const value = lastDecisions.adChannels ? lastDecisions.adChannels[channelId] : 20;
    document.getElementById(`adChannel_${channelId}_${product.id}`).value = value;
});

// Preencher canais de distribuição
Object.keys(CONFIG.DISTRIBUTION_CHANNELS).forEach(channelId => {
    const value = lastDecisions.distributionChannels ? lastDecisions.distributionChannels[channelId] : 25;
    document.getElementById(`distChannel_${channelId}_${product.id}`).value = value;
});
```

### 3. Visualização de Performance por Canal (overview)

**Adicionar à função showProductDetails():**

```javascript
// Mostrar performance de canais de publicidade
let adChannelsHTML = '<h4>Canais de Publicidade - Última Decisão</h4><table class="channel-table">';
adChannelsHTML += '<tr><th>Canal</th><th>Investimento</th><th>Clientes</th><th>CAC</th></tr>';

Object.keys(latestPeriod.data.adChannelPerformance).forEach(channelId => {
    const ch = latestPeriod.data.adChannelPerformance[channelId];
    const channelName = CONFIG.AD_CHANNELS[channelId].name;
    adChannelsHTML += `<tr>
        <td>${channelName}</td>
        <td>${this.formatCurrency(ch.investment)}</td>
        <td>${ch.customersAcquired}</td>
        <td>${this.formatCurrency(ch.cac)}</td>
    </tr>`;
});
adChannelsHTML += '</table>';

// Mostrar performance de canais de distribuição
let distChannelsHTML = '<h4>Canais de Distribuição - Última Decisão</h4><table class="channel-table">';
distChannelsHTML += '<tr><th>Canal</th><th>Unidades</th><th>Receita</th><th>Margem</th></tr>';

Object.keys(latestPeriod.data.distributionPerformance).forEach(channelId => {
    const ch = latestPeriod.data.distributionPerformance[channelId];
    const channelName = CONFIG.DISTRIBUTION_CHANNELS[channelId].name;
    distChannelsHTML += `<tr>
        <td>${channelName}</td>
        <td>${ch.unitsSold}</td>
        <td>${this.formatCurrency(ch.revenue)}</td>
        <td>${this.formatCurrency(ch.margin)}</td>
    </tr>`;
});
distChannelsHTML += '</table>';
```

### 4. Decisões Globais no Painel Professor

**Modificar showSubmissionDetails() (app.js linha 1232):**

Adicionar após linha 1258 (depois do loop de produtos):

```javascript
// Mostrar decisões globais da equipa
const globalDecisions = teamData.globalData;
detailsHTML += `
    <div class="global-decisions">
        <h3>Decisões Globais da Empresa</h3>
        <div class="decisions-grid">
            <div class="decision-item">
                <span>Investimento em Fidelização:</span>
                <strong>${this.formatCurrency(globalDecisions.retentionInvestment || 0)}</strong>
            </div>
            <div class="decision-item">
                <span>Investimento em Marca:</span>
                <strong>${this.formatCurrency(globalDecisions.brandInvestment || 0)}</strong>
            </div>
            <div class="decision-item">
                <span>Serviço ao Cliente:</span>
                <strong>${this.formatCurrency(globalDecisions.customerService || 0)}</strong>
            </div>
            <div class="decision-item">
                <span>Prazo de Crédito:</span>
                <strong>${globalDecisions.creditDays || 0} dias</strong>
            </div>
            <div class="decision-item">
                <span>Melhoria de Processos:</span>
                <strong>${this.formatCurrency(globalDecisions.processImprovement || 0)}</strong>
            </div>
        </div>
    </div>
`;
```

### 5. CSS Necessário (styles.css)

```css
.channels-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 16px;
    margin-top: 12px;
}

.channel-input {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.channel-input label {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
}

.channel-input input {
    padding: 10px;
    border: 1.5px solid var(--border);
    border-radius: var(--radius-sm);
    font-size: 14px;
}

.channel-table {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0;
}

.channel-table th,
.channel-table td {
    padding: 10px;
    text-align: left;
    border-bottom: 1px solid var(--border);
}

.channel-table th {
    background: var(--bg);
    font-weight: 600;
    color: var(--text-secondary);
    font-size: 13px;
}

.global-decisions {
    background: var(--bg);
    padding: 20px;
    border-radius: var(--radius);
    border: 1.5px solid var(--border);
    margin-bottom: 20px;
}
```

## 📊 Dinâmica Competitiva

### Como Funciona

1. **Canais de Publicidade:**
   - Equipas distribuem % do orçamento de marketing entre 5 canais
   - Cada canal tem eficiência diferente (converte € em clientes)
   - Premium funciona melhor em Instagram, Economic em Facebook
   - Alunos veem investimento e clientes por canal → calculam CAC
   - Escolhem canais com melhor CAC para maximizar clientes

2. **Canais de Distribuição:**
   - Equipas distribuem % das vendas entre 4 canais
   - Lojas Próprias: margem máxima mas capacidade limitada
   - Grossistas: margem baixa mas alta capacidade
   - Alunos analisam margem vs volume por canal
   - Optimizam mix para maximizar lucro

3. **Vantagem Competitiva:**
   - Quem escolher melhores canais → mais clientes + mais margem
   - Quem errar na distribuição → desperdício de recursos
   - Dados históricos permitem aprendizagem
   - Dinâmica competitiva real e mensurável

## ✅ Estado Actual

- ✅ Backend 100% funcional
- ✅ Lógica de cálculo completa e testada
- ✅ Dados históricos gerados com canais
- ✅ Sistema de submissão pronto
- 🚧 Frontend necessita campos HTML
- 🚧 Visualizações necessitam tabelas de canais
- 🚧 Painel professor necessita decisões globais

**Tempo estimado para completar frontend: 2-3 horas**
