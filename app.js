// ===== SIMULADOR DE MÉTRICAS DE MARKETING - VERSÃO 4.0 =====
// ESTGD - Instituto Politécnico de Portalegre
// Professor: André Antão | Ano Letivo 2025-2026
// Sistema com 3 produtos por equipa

// ===== CONFIGURAÇÃO =====
const CONFIG = {
    TOTAL_PERIODS: 10,  // 5 históricos + 5 decisões
    HISTORICAL_PERIODS: 5,
    NUM_TEAMS: 9,
    NUM_PRODUCTS: 3,
    START_YEAR: 2024,
    PRODUCTS: [
        { id: 'produtoA', name: 'Produto A (Premium)', type: 'premium' },
        { id: 'produtoB', name: 'Produto B (Mid-Range)', type: 'midrange' },
        { id: 'produtoC', name: 'Produto C (Económico)', type: 'economic' }
    ],
    DEFAULT_ADMIN_PASSWORD: 'professor2026',
    MARKET_POTENTIAL: 300000, // mercado total (dividido por 3 produtos)
    STORAGE_KEYS: {
        ADMIN_PASSWORD: 'adminPassword',
        SIMULATION_DATA: 'simulationData',
        TEAMS_DATA: 'teamsData',
        TEAM_CODES: 'teamCodes'
    },
    // Sazonalidade por trimestre e tipo de produto
    SEASONALITY: {
        1: { // Q1 (Jan-Mar): Pós-Natal, vendas baixas
            premium: { demand: 0.95, price: 1.00, churn: 0.95 },
            midrange: { demand: 0.85, price: 0.98, churn: 1.10 },
            economic: { demand: 0.80, price: 0.95, churn: 1.15 }
        },
        2: { // Q2 (Abr-Jun): Primavera, vendas normais
            premium: { demand: 1.00, price: 1.00, churn: 1.00 },
            midrange: { demand: 1.00, price: 1.00, churn: 1.00 },
            economic: { demand: 1.00, price: 1.00, churn: 1.00 }
        },
        3: { // Q3 (Jul-Set): Verão, vendas baixas (férias)
            premium: { demand: 0.98, price: 1.02, churn: 0.90 },
            midrange: { demand: 0.90, price: 0.97, churn: 1.05 },
            economic: { demand: 0.85, price: 0.95, churn: 1.12 }
        },
        4: { // Q4 (Out-Dez): Natal, vendas altas
            premium: { demand: 1.15, price: 1.05, churn: 0.85 },
            midrange: { demand: 1.25, price: 1.00, churn: 0.90 },
            economic: { demand: 1.30, price: 0.98, churn: 0.95 }
        }
    },
    // Canais de Publicidade - Eficiência (clientes por €100 investidos)
    AD_CHANNELS: {
        googleAds: {
            name: 'Google Ads',
            efficiency: { premium: 0.045, midrange: 0.065, economic: 0.085 }
        },
        facebook: {
            name: 'Facebook Ads',
            efficiency: { premium: 0.055, midrange: 0.075, economic: 0.095 }
        },
        instagram: {
            name: 'Instagram Ads',
            efficiency: { premium: 0.065, midrange: 0.070, economic: 0.060 }
        },
        email: {
            name: 'Email Marketing',
            efficiency: { premium: 0.040, midrange: 0.050, economic: 0.055 }
        },
        radio: {
            name: 'Rádio/TV',
            efficiency: { premium: 0.035, midrange: 0.045, economic: 0.050 }
        }
    },
    // Canais de Distribuição - Margens e características
    DISTRIBUTION_CHANNELS: {
        ownStores: {
            name: 'Lojas Próprias',
            marginMultiplier: 1.00,      // Margem base
            volumeCapacity: 0.35,         // Máx 35% das vendas
            shareOfWallet: 0.65,          // Clientes gastam 65%
            costs: 0.08                   // 8% custos operacionais extra
        },
        retailers: {
            name: 'Retalhistas',
            marginMultiplier: 0.75,       // 25% comissão retalhista
            volumeCapacity: 0.45,         // Máx 45% das vendas
            shareOfWallet: 0.45,
            costs: 0.03
        },
        ecommerce: {
            name: 'E-commerce',
            marginMultiplier: 0.90,       // 10% custos plataforma
            volumeCapacity: 0.30,
            shareOfWallet: 0.55,
            costs: 0.05
        },
        wholesalers: {
            name: 'Grossistas',
            marginMultiplier: 0.60,       // 40% desconto grossista
            volumeCapacity: 0.50,
            shareOfWallet: 0.30,
            costs: 0.02
        }
    }
};

// ===== APLICAÇÃO PRINCIPAL =====
class SimulatorApp {
    constructor() {
        this.currentUser = null;
        this.isAdmin = false;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkInitialState();
    }

    // ===== FUNÇÕES AUXILIARES =====
    getQuarterLabel(periodNum) {
        const quarter = ((periodNum - 1) % 4) + 1;
        const year = CONFIG.START_YEAR + Math.floor((periodNum - 1) / 4);
        return `Trimestre ${quarter} - ${year}`;
    }

    getQuarterNumber(periodNum) {
        return ((periodNum - 1) % 4) + 1;
    }

    getSeasonalityFactors(periodNum, productType) {
        const quarter = this.getQuarterNumber(periodNum);
        return CONFIG.SEASONALITY[quarter][productType];
    }

    // ===== NAVEGAÇÃO =====
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
    }

    showAdminLogin() {
        this.showScreen('adminLoginScreen');
    }

    backToLogin() {
        this.showScreen('loginScreen');
    }

    logout() {
        this.currentUser = null;
        this.isAdmin = false;
        this.showScreen('loginScreen');
        document.getElementById('loginForm').reset();
    }

    switchView(viewName) {
        document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-view="${viewName}"]`).classList.add('active');

        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(`${viewName}View`).classList.add('active');

        if (viewName === 'overview') this.loadOverviewData();
        if (viewName === 'decisions') this.loadDecisionsForm();
        if (viewName === 'market') this.loadMarketData();
        if (viewName === 'history') this.loadHistoryData();
    }

    // ===== AUTENTICAÇÃO =====
    loginTeam(teamCode) {
        teamCode = teamCode.trim().toUpperCase();

        const teamCodes = this.getTeamCodes();
        if (!teamCodes.includes(teamCode)) {
            alert('Código de equipa inválido!');
            return;
        }

        const simData = this.getSimulationData();
        if (!simData || !simData.initialized) {
            alert('A simulação ainda não foi inicializada. Contacte o professor.');
            return;
        }

        const teamData = this.getTeamData(teamCode);
        if (!teamData) {
            alert('Dados da equipa não encontrados. Contacte o professor.');
            return;
        }

        this.currentUser = teamCode;
        this.isAdmin = false;
        this.showScreen('dashboardScreen');
        this.loadDashboard();
    }

    loginAdmin(password) {
        const storedPassword = localStorage.getItem(CONFIG.STORAGE_KEYS.ADMIN_PASSWORD);
        const correctPassword = storedPassword || CONFIG.DEFAULT_ADMIN_PASSWORD;

        if (password !== correctPassword) {
            alert('Palavra-passe incorreta!');
            return;
        }

        this.isAdmin = true;
        this.showScreen('adminScreen');
        this.loadAdminPanel();
    }

    // ===== DADOS =====
    getSimulationData() {
        const data = localStorage.getItem(CONFIG.STORAGE_KEYS.SIMULATION_DATA);
        return data ? JSON.parse(data) : null;
    }

    saveSimulationData(data) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.SIMULATION_DATA, JSON.stringify(data));
    }

    getAllTeamsData() {
        const data = localStorage.getItem(CONFIG.STORAGE_KEYS.TEAMS_DATA);
        return data ? JSON.parse(data) : null;
    }

    saveAllTeamsData(data) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.TEAMS_DATA, JSON.stringify(data));
    }

    getTeamData(teamCode) {
        const allTeams = this.getAllTeamsData();
        return allTeams ? allTeams[teamCode] : null;
    }

    saveTeamData(teamCode, data) {
        let allTeams = this.getAllTeamsData() || {};
        allTeams[teamCode] = data;
        this.saveAllTeamsData(allTeams);
    }

    getTeamCodes() {
        const data = localStorage.getItem(CONFIG.STORAGE_KEYS.TEAM_CODES);
        return data ? JSON.parse(data) : [];
    }

    saveTeamCodes(codes) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.TEAM_CODES, JSON.stringify(codes));
    }

    // ===== INICIALIZAÇÃO =====
    showTeamCodesSetup() {
        const container = document.getElementById('teamCodesSetup');
        container.innerHTML = `
            <h3>Definir Códigos das Equipas</h3>
            <p>Defina os códigos para as 9 equipas (ex: EQUIPA01, GRUPO_A, etc.)</p>
            <div style="margin-bottom: 15px;">
                <button onclick="app.gerarCodigosAleatorios()" class="btn-secondary">🎲 Gerar Códigos Aleatórios (10 dígitos)</button>
            </div>
            <div class="team-codes-grid">
                ${Array.from({length: CONFIG.NUM_TEAMS}, (_, i) => `
                    <div class="form-group">
                        <label>Equipa ${i + 1}</label>
                        <input type="text" id="teamCode${i}" value="EQUIPA${String(i + 1).padStart(2, '0')}" required>
                    </div>
                `).join('')}
            </div>
            <button onclick="app.initializeWithCodes()" class="btn-primary" style="margin-top: 20px;">Inicializar com estes Códigos</button>
            <button onclick="document.getElementById('teamCodesSetup').style.display='none'" class="btn-secondary">Cancelar</button>
        `;
        container.style.display = 'block';
    }

    gerarCodigosAleatorios() {
        const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sem 0, O, I, 1 para evitar confusão
        const codigosGerados = new Set();

        while (codigosGerados.size < CONFIG.NUM_TEAMS) {
            let codigo = '';
            for (let i = 0; i < 10; i++) {
                codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
            }
            codigosGerados.add(codigo);
        }

        const codigosArray = Array.from(codigosGerados);
        for (let i = 0; i < CONFIG.NUM_TEAMS; i++) {
            document.getElementById(`teamCode${i}`).value = codigosArray[i];
        }

        alert('Códigos aleatórios gerados! Guarde-os antes de inicializar.');
    }

    initializeWithCodes() {
        // Recolher códigos
        const codes = [];
        for (let i = 0; i < CONFIG.NUM_TEAMS; i++) {
            const code = document.getElementById(`teamCode${i}`).value.trim().toUpperCase();
            if (!code) {
                alert(`Código da equipa ${i + 1} está vazio!`);
                return;
            }
            if (codes.includes(code)) {
                alert(`Código "${code}" está duplicado!`);
                return;
            }
            codes.push(code);
        }

        if (!confirm(`Isto irá criar ${CONFIG.HISTORICAL_PERIODS} períodos históricos IDÊNTICOS para as ${CONFIG.NUM_TEAMS} equipas. Continuar?`)) {
            return;
        }

        // Salvar códigos
        this.saveTeamCodes(codes);

        // Gerar dados históricos IDÊNTICOS
        const historicalData = this.generateIdenticalHistory();

        // Criar equipas com dados idênticos
        const teamsData = {};
        codes.forEach((code, index) => {
            const team = {
                code: code,
                name: `Equipa ${index + 1}`,
                products: CONFIG.PRODUCTS.map(product => ({
                    id: product.id,
                    name: product.name,
                    periods: JSON.parse(JSON.stringify(historicalData[product.id])) // deep copy
                })),
                globalData: {
                    totalAssets: 500000,
                    equity: 300000,
                    totalLiabilities: 200000
                }
            };
            teamsData[code] = team;
        });

        this.saveAllTeamsData(teamsData);

        const simData = {
            initialized: true,
            currentPeriod: CONFIG.HISTORICAL_PERIODS + 1,
            startDate: new Date().toISOString()
        };
        this.saveSimulationData(simData);

        document.getElementById('teamCodesSetup').style.display = 'none';
        alert(`Simulação inicializada! ${CONFIG.HISTORICAL_PERIODS} trimestres históricos criados. Próximo: ${this.getQuarterLabel(simData.currentPeriod)}`);
        this.loadAdminPanel();
    }

    generateIdenticalHistory() {
        // Gera histórico IDÊNTICO para todos os produtos
        // Com 3 produtos MUITO diferentes e decisões variadas por período
        const history = {};

        // Definir características distintas de cada produto
        const productProfiles = {
            produtoA: {
                name: 'Premium',
                basePrice: 150,
                baseCustomers: 5000,
                baseCost: 45,
                fixedCosts: 50000,
                description: 'Produto premium de alta qualidade'
            },
            produtoB: {
                name: 'Mid-Range',
                basePrice: 100,
                baseCustomers: 8000,
                baseCost: 35,
                fixedCosts: 45000,
                description: 'Produto equilibrado para mercado médio'
            },
            produtoC: {
                name: 'Económico',
                basePrice: 60,
                baseCustomers: 12000,
                baseCost: 25,
                fixedCosts: 40000,
                description: 'Produto de volume com preço competitivo'
            }
        };

        // Estratégias diferentes por período (para demonstrar impactos)
        const periodStrategies = {
            1: { desc: 'Conservadora', marketing: 0.8, discount: 0.3, quality: 0.7, commission: 0.6 },
            2: { desc: 'Agressiva em Marketing', marketing: 1.5, discount: 0.4, quality: 0.8, commission: 0.7 },
            3: { desc: 'Desconto Promocional', marketing: 1.0, discount: 1.8, quality: 0.6, commission: 0.9 },
            4: { desc: 'Foco em Qualidade', marketing: 1.0, discount: 0.2, quality: 1.6, commission: 0.5 },
            5: { desc: 'Equilibrada', marketing: 1.2, discount: 0.8, quality: 1.0, commission: 0.7 }
        };

        CONFIG.PRODUCTS.forEach((product) => {
            const profile = productProfiles[product.id];
            const periods = [];

            let previousCustomers = profile.baseCustomers;

            for (let p = 1; p <= CONFIG.HISTORICAL_PERIODS; p++) {
                const strategy = periodStrategies[p];

                // === DECISÕES VARIADAS POR PERÍODO E PRODUTO ===
                let baseMarketing, baseDiscount, baseQuality, baseCommission;

                if (product.id === 'produtoA') {
                    // Premium: marketing alto, desconto baixo, qualidade muito alta
                    baseMarketing = 18000;
                    baseDiscount = 2;
                    baseQuality = 8000;
                    baseCommission = 8;
                } else if (product.id === 'produtoB') {
                    // Mid-Range: valores equilibrados
                    baseMarketing = 12000;
                    baseDiscount = 5;
                    baseQuality = 4000;
                    baseCommission = 5;
                } else {
                    // Económico: marketing moderado, desconto alto, qualidade baixa
                    baseMarketing = 10000;
                    baseDiscount = 10;
                    baseQuality = 2000;
                    baseCommission = 3;
                }

                // Distribuição de canais varia por período (para demonstrar diferentes estratégias)
                const adChannelDist = {
                    1: { googleAds: 25, facebook: 30, instagram: 20, email: 15, radio: 10 },
                    2: { googleAds: 30, facebook: 35, instagram: 15, email: 10, radio: 10 },
                    3: { googleAds: 20, facebook: 25, instagram: 30, email: 15, radio: 10 },
                    4: { googleAds: 25, facebook: 20, instagram: 25, email: 20, radio: 10 },
                    5: { googleAds: 28, facebook: 27, instagram: 22, email: 13, radio: 10 }
                };

                const distChannelDist = {
                    1: { ownStores: 30, retailers: 40, ecommerce: 20, wholesalers: 10 },
                    2: { ownStores: 25, retailers: 35, ecommerce: 30, wholesalers: 10 },
                    3: { ownStores: 35, retailers: 30, ecommerce: 25, wholesalers: 10 },
                    4: { ownStores: 28, retailers: 37, ecommerce: 25, wholesalers: 10 },
                    5: { ownStores: 30, retailers: 35, ecommerce: 25, wholesalers: 10 }
                };

                // Decisões globais variam por período
                const globalDecisions = {
                    1: { retentionInvestment: 15000, brandInvestment: 8000, customerService: 5000, creditDays: 30, processImprovement: 3000 },
                    2: { retentionInvestment: 18000, brandInvestment: 10000, customerService: 6000, creditDays: 45, processImprovement: 4000 },
                    3: { retentionInvestment: 12000, brandInvestment: 6000, customerService: 4000, creditDays: 30, processImprovement: 2000 },
                    4: { retentionInvestment: 20000, brandInvestment: 12000, customerService: 7000, creditDays: 60, processImprovement: 5000 },
                    5: { retentionInvestment: 16000, brandInvestment: 9000, customerService: 5500, creditDays: 45, processImprovement: 3500 }
                };

                const decisions = {
                    price: profile.basePrice,
                    discount: Math.round(baseDiscount * strategy.discount * 10) / 10,
                    marketingInvestment: Math.round(baseMarketing * strategy.marketing),
                    qualityInvestment: Math.round(baseQuality * strategy.quality),
                    salesCommission: Math.round(baseCommission * strategy.commission * 10) / 10,
                    adChannels: adChannelDist[p],
                    distributionChannels: distChannelDist[p]
                };

                // === SAZONALIDADE ===
                const quarter = ((p - 1) % 4) + 1;
                const seasonality = CONFIG.SEASONALITY[quarter][product.type];

                // === CANAIS DE PUBLICIDADE - Calcular clientes por canal ===
                const adChannelPerformance = {};
                let totalNewCustomers = 0;

                Object.keys(CONFIG.AD_CHANNELS).forEach(channelId => {
                    const channel = CONFIG.AD_CHANNELS[channelId];
                    const channelPercentage = decisions.adChannels[channelId] / 100;
                    const channelInvestment = decisions.marketingInvestment * channelPercentage;

                    const efficiency = channel.efficiency[product.type];
                    const qualityBonus = 1 + (decisions.qualityInvestment / 80000) * 0.15;

                    const customersAcquired = Math.round(
                        channelInvestment * efficiency * qualityBonus * seasonality.demand * (1 + p * 0.08)
                    );

                    totalNewCustomers += customersAcquired;

                    adChannelPerformance[channelId] = {
                        investment: Math.round(channelInvestment * 100) / 100,
                        customersAcquired: customersAcquired,
                        cac: customersAcquired > 0 ? Math.round((channelInvestment / customersAcquired) * 100) / 100 : 0
                    };
                });

                // === CHURN ===
                const baseChurnRate = product.id === 'produtoA' ? 0.08 :
                                     product.id === 'produtoB' ? 0.12 : 0.15;
                const qualityImpact = Math.min(decisions.qualityInvestment / 50000, 1);
                const churnRate = Math.max(0.04, (baseChurnRate - (qualityImpact * 0.06)) * seasonality.churn);
                const lostCustomers = Math.round(previousCustomers * churnRate);

                const customerBase = previousCustomers + totalNewCustomers - lostCustomers;
                const retainedCustomers = previousCustomers - lostCustomers;

                // === VENDAS BASE ===
                const basePrice = decisions.price * (1 - decisions.discount / 100) * seasonality.price;
                const priceImpact = Math.max(0.7, 1 - (decisions.discount / 100) * 0.5);
                const qualityImprovement = 1 + (decisions.qualityInvestment / 40000) * 0.15;
                const baseUnitsSold = Math.round(customerBase * priceImpact * qualityImprovement * seasonality.demand);

                // === CANAIS DE DISTRIBUIÇÃO ===
                const distributionPerformance = {};
                let totalRevenue = 0;
                let totalUnitsSold = 0;
                let totalDistributionCosts = 0;

                Object.keys(CONFIG.DISTRIBUTION_CHANNELS).forEach(channelId => {
                    const channel = CONFIG.DISTRIBUTION_CHANNELS[channelId];
                    const channelPercentage = decisions.distributionChannels[channelId] / 100;

                    const maxUnits = baseUnitsSold * channel.volumeCapacity;
                    const targetUnits = baseUnitsSold * channelPercentage;
                    const unitsInChannel = Math.min(targetUnits, maxUnits);

                    const effectivePrice = basePrice * channel.shareOfWallet;
                    const channelRevenue = unitsInChannel * effectivePrice;
                    const channelMargin = (effectivePrice - profile.baseCost) * channel.marginMultiplier;
                    const channelCosts = channelRevenue * channel.costs;

                    totalRevenue += channelRevenue;
                    totalUnitsSold += unitsInChannel;
                    totalDistributionCosts += channelCosts;

                    distributionPerformance[channelId] = {
                        percentage: Math.round(channelPercentage * 100 * 10) / 10,
                        unitsSold: Math.round(unitsInChannel),
                        revenue: Math.round(channelRevenue * 100) / 100,
                        margin: Math.round(channelMargin * 100) / 100,
                        operationalCosts: Math.round(channelCosts * 100) / 100,
                        shareOfWallet: channel.shareOfWallet
                    };
                });

                // === CUSTOS FINAIS ===
                const unitVariableCost = profile.baseCost;
                const variableCosts = totalUnitsSold * unitVariableCost;
                const fixedCosts = profile.fixedCosts;
                const salesCommissions = totalRevenue * (decisions.salesCommission / 100);

                const totalCosts = variableCosts + fixedCosts + salesCommissions + totalDistributionCosts;
                const totalInvestments = decisions.marketingInvestment + decisions.qualityInvestment;

                // Margem média ponderada
                let weightedMargin = 0;
                Object.values(distributionPerformance).forEach(ch => {
                    weightedMargin += ch.margin * (ch.unitsSold / totalUnitsSold);
                });

                const profit = totalRevenue - totalCosts - totalInvestments;

                const data = {
                    // Clientes
                    customerBase: customerBase,
                    newCustomers: totalNewCustomers,
                    lostCustomers: lostCustomers,
                    previousCustomers: previousCustomers,
                    retainedCustomers: retainedCustomers,

                    // Vendas
                    revenue: Math.round(totalRevenue * 100) / 100,
                    unitsSold: totalUnitsSold,
                    unitPrice: Math.round(basePrice * 100) / 100,
                    appliedDiscount: decisions.discount,

                    // Custos
                    variableCosts: Math.round(variableCosts * 100) / 100,
                    unitVariableCost: unitVariableCost,
                    fixedCosts: fixedCosts,
                    distributionCosts: Math.round(totalDistributionCosts * 100) / 100,

                    // Investimentos
                    marketingCost: decisions.marketingInvestment,
                    qualityCost: decisions.qualityInvestment,
                    salesCommissions: Math.round(salesCommissions * 100) / 100,

                    // Resultados
                    margem: Math.round(weightedMargin * 100) / 100,
                    profit: Math.round(profit * 100) / 100,

                    // Performance por canal
                    adChannelPerformance: adChannelPerformance,
                    distributionPerformance: distributionPerformance
                };

                // Gerar timestamp histórico (3 meses atrás por cada período)
                const monthsAgo = (CONFIG.HISTORICAL_PERIODS - p + 1) * 3;
                const historicalDate = new Date();
                historicalDate.setMonth(historicalDate.getMonth() - monthsAgo);
                historicalDate.setHours(9, 0, 0, 0); // 09:00 da manhã

                periods.push({
                    period: p,
                    decisions: decisions,
                    globalDecisions: globalDecisions[p],
                    data: data,
                    submittedAt: historicalDate.toISOString()
                });

                // Atualizar para próximo período
                previousCustomers = customerBase;
            }

            history[product.id] = periods;
        });

        return history;
    }

    // ===== DECISÕES =====
    submitDecisions(formData) {
        const simData = this.getSimulationData();
        if (!simData) {
            alert('Simulação não inicializada!');
            return;
        }

        const currentPeriod = simData.currentPeriod;

        if (currentPeriod > CONFIG.TOTAL_PERIODS) {
            alert('A simulação já terminou!');
            return;
        }

        const teamData = this.getTeamData(this.currentUser);

        // Verificar se já submeteu
        const hasDecision = teamData.products[0].periods.some(p => p.period === currentPeriod);
        if (hasDecision) {
            alert('Já submeteu decisões para este período!');
            return;
        }

        // Recolher decisões globais
        const globalDecisions = {
            retentionInvestment: parseFloat(formData.get('retentionInvestment')),
            brandInvestment: parseFloat(formData.get('brandInvestment')),
            customerService: parseFloat(formData.get('customerService')),
            creditDays: parseInt(formData.get('creditDays')),
            processImprovement: parseFloat(formData.get('processImprovement'))
        };

        // Recolher decisões por produto
        CONFIG.PRODUCTS.forEach(product => {
            const productDecisions = {
                price: parseFloat(formData.get(`price_${product.id}`)),
                discount: parseFloat(formData.get(`discount_${product.id}`)),
                marketingInvestment: parseFloat(formData.get(`marketing_${product.id}`)),
                qualityInvestment: parseFloat(formData.get(`quality_${product.id}`)),
                salesCommission: parseFloat(formData.get(`commission_${product.id}`)),
                adChannels: {
                    googleAds: parseFloat(formData.get(`adChannel_googleAds_${product.id}`)),
                    facebook: parseFloat(formData.get(`adChannel_facebook_${product.id}`)),
                    instagram: parseFloat(formData.get(`adChannel_instagram_${product.id}`)),
                    email: parseFloat(formData.get(`adChannel_email_${product.id}`)),
                    radio: parseFloat(formData.get(`adChannel_radio_${product.id}`))
                },
                distributionChannels: {
                    ownStores: parseFloat(formData.get(`distChannel_ownStores_${product.id}`)),
                    retailers: parseFloat(formData.get(`distChannel_retailers_${product.id}`)),
                    ecommerce: parseFloat(formData.get(`distChannel_ecommerce_${product.id}`)),
                    wholesalers: parseFloat(formData.get(`distChannel_wholesalers_${product.id}`))
                }
            };

            const productData = teamData.products.find(p => p.id === product.id);
            const previousPeriod = productData.periods[productData.periods.length - 1];

            const newPeriodData = this.calculateNewPeriodData(
                previousPeriod,
                productDecisions,
                globalDecisions,
                teamData.globalData,
                currentPeriod,
                product.type
            );

            const newPeriod = {
                period: currentPeriod,
                decisions: productDecisions,
                globalDecisions: globalDecisions,
                data: newPeriodData,
                submittedAt: new Date().toISOString()
            };

            productData.periods.push(newPeriod);
        });

        this.saveTeamData(this.currentUser, teamData);

        alert('Decisões submetidas com sucesso!');
        this.loadDashboard();
    }

    calculateNewPeriodData(previousPeriod, decisions, globalDecisions, globalData, periodNum, productType) {
        const prevData = previousPeriod.data;
        const prevCustomers = prevData.customerBase;

        // === SAZONALIDADE ===
        const seasonality = this.getSeasonalityFactors(periodNum, productType);

        // === CANAIS DE PUBLICIDADE - Calcular clientes por canal ===
        const adChannelPerformance = {};
        let totalNewCustomers = 0;

        Object.keys(CONFIG.AD_CHANNELS).forEach(channelId => {
            const channel = CONFIG.AD_CHANNELS[channelId];
            const channelPercentage = decisions.adChannels[channelId] / 100;
            const channelInvestment = decisions.marketingInvestment * channelPercentage;

            // Eficiência do canal para este tipo de produto
            const efficiency = channel.efficiency[productType];
            const qualityBonus = 1 + (decisions.qualityInvestment / 80000) * 0.15;

            // Clientes adquiridos = investimento * eficiência * qualidade * sazonalidade
            const customersAcquired = Math.round(
                channelInvestment * efficiency * qualityBonus * seasonality.demand
            );

            totalNewCustomers += customersAcquired;

            adChannelPerformance[channelId] = {
                investment: Math.round(channelInvestment * 100) / 100,
                customersAcquired: customersAcquired,
                cac: customersAcquired > 0 ? Math.round((channelInvestment / customersAcquired) * 100) / 100 : 0
            };
        });

        // === CHURN (Abandono de clientes) ===
        const baseChurnRate = 0.12;
        const retentionImpact = Math.min(globalDecisions.retentionInvestment / 60000, 1);
        const serviceImpact = Math.min(globalDecisions.customerService / 40000, 1);
        const churnReduction = (retentionImpact * 0.05) + (serviceImpact * 0.04);
        const churnRate = Math.max(0.04, (baseChurnRate - churnReduction) * seasonality.churn);
        const lostCustomers = Math.round(prevCustomers * churnRate);

        const customerBase = prevCustomers + totalNewCustomers - lostCustomers;
        const retainedCustomers = prevCustomers - lostCustomers;

        // === VENDAS BASE ===
        const basePrice = decisions.price * (1 - decisions.discount / 100) * seasonality.price;
        const priceImpact = Math.max(0.7, 1 - (decisions.discount / 100) * 0.5);
        const qualityImpact = 1 + (decisions.qualityInvestment / 40000) * 0.15;
        const brandImpact = 1 + (globalDecisions.brandInvestment / 50000) * 0.1;

        const baseUnitsSold = Math.round(customerBase * priceImpact * qualityImpact * brandImpact * seasonality.demand);

        // === CANAIS DE DISTRIBUIÇÃO - Calcular vendas e margem por canal ===
        const distributionPerformance = {};
        let totalRevenue = 0;
        let totalUnitsSold = 0;
        let totalDistributionCosts = 0;

        Object.keys(CONFIG.DISTRIBUTION_CHANNELS).forEach(channelId => {
            const channel = CONFIG.DISTRIBUTION_CHANNELS[channelId];
            const channelPercentage = decisions.distributionChannels[channelId] / 100;

            // Unidades vendidas neste canal (limitado pela capacidade)
            const maxUnits = baseUnitsSold * channel.volumeCapacity;
            const targetUnits = baseUnitsSold * channelPercentage;
            const unitsInChannel = Math.min(targetUnits, maxUnits);

            // Preço efectivo com share of wallet do canal
            const effectivePrice = basePrice * channel.shareOfWallet;

            // Receita do canal
            const channelRevenue = unitsInChannel * effectivePrice;

            // Margem ajustada pelo canal (retalhistas ficam com parte)
            const channelMargin = (effectivePrice - 35) * channel.marginMultiplier;

            // Custos operacionais do canal
            const channelCosts = channelRevenue * channel.costs;

            totalRevenue += channelRevenue;
            totalUnitsSold += unitsInChannel;
            totalDistributionCosts += channelCosts;

            distributionPerformance[channelId] = {
                percentage: Math.round(channelPercentage * 100 * 10) / 10,
                unitsSold: Math.round(unitsInChannel),
                revenue: Math.round(channelRevenue * 100) / 100,
                margin: Math.round(channelMargin * 100) / 100,
                operationalCosts: Math.round(channelCosts * 100) / 100,
                shareOfWallet: channel.shareOfWallet
            };
        });

        // === CUSTOS FINAIS ===
        const processEfficiency = Math.min(globalDecisions.processImprovement / 30000, 1);
        const costReduction = 1 - (processEfficiency * 0.25);
        const unitVariableCost = 35 * costReduction;
        const variableCosts = totalUnitsSold * unitVariableCost;

        const fixedCosts = prevData.fixedCosts || 45000;
        const salesCommissions = totalRevenue * (decisions.salesCommission / 100);

        const totalCosts = variableCosts + fixedCosts + salesCommissions + totalDistributionCosts;
        const totalInvestments = decisions.marketingInvestment + decisions.qualityInvestment +
                                globalDecisions.retentionInvestment + globalDecisions.brandInvestment +
                                globalDecisions.customerService + globalDecisions.processImprovement;

        // Margem média ponderada
        let weightedMargin = 0;
        Object.values(distributionPerformance).forEach(ch => {
            weightedMargin += ch.margin * (ch.unitsSold / totalUnitsSold);
        });

        const profit = totalRevenue - totalCosts - totalInvestments;

        return {
            // Clientes
            customerBase: customerBase,
            newCustomers: totalNewCustomers,
            lostCustomers: lostCustomers,
            previousCustomers: prevCustomers,
            retainedCustomers: retainedCustomers,

            // Vendas
            revenue: Math.round(totalRevenue * 100) / 100,
            unitsSold: totalUnitsSold,
            unitPrice: Math.round(basePrice * 100) / 100,
            appliedDiscount: decisions.discount,

            // Custos
            variableCosts: Math.round(variableCosts * 100) / 100,
            unitVariableCost: Math.round(unitVariableCost * 100) / 100,
            fixedCosts: fixedCosts,
            distributionCosts: Math.round(totalDistributionCosts * 100) / 100,

            // Investimentos
            marketingCost: decisions.marketingInvestment,
            qualityCost: decisions.qualityInvestment,
            salesCommissions: Math.round(salesCommissions * 100) / 100,

            // Resultados
            margem: Math.round(weightedMargin * 100) / 100,
            profit: Math.round(profit * 100) / 100,

            // Performance por canal
            adChannelPerformance: adChannelPerformance,
            distributionPerformance: distributionPerformance
        };
    }

    // ===== DASHBOARD =====
    loadDashboard() {
        const teamData = this.getTeamData(this.currentUser);
        const simData = this.getSimulationData();

        document.getElementById('teamName').textContent = teamData.name;
        document.getElementById('currentPeriod').textContent = this.getQuarterLabel(simData.currentPeriod);

        this.switchView('overview');
    }

    loadOverviewData() {
        const teamData = this.getTeamData(this.currentUser);

        // Mostrar dados de cada produto
        const productsContainer = document.getElementById('productsDataContainer');
        productsContainer.innerHTML = '';

        let totalRevenue = 0;
        let totalCustomers = 0;
        let totalProfit = 0;

        teamData.products.forEach(product => {
            const latestPeriod = product.periods[product.periods.length - 1];
            const data = latestPeriod.data;

            totalRevenue += data.revenue;
            totalCustomers += data.customerBase;
            totalProfit += data.profit;

            const productCard = document.createElement('div');
            productCard.className = 'product-summary-card';
            productCard.innerHTML = `
                <h3>${product.name}</h3>
                <div class="product-stats">
                    <div class="stat-item">
                        <span>Receita</span>
                        <strong>${this.formatCurrency(data.revenue)}</strong>
                    </div>
                    <div class="stat-item">
                        <span>Clientes</span>
                        <strong>${data.customerBase.toLocaleString('pt-PT')}</strong>
                    </div>
                    <div class="stat-item">
                        <span>Lucro</span>
                        <strong>${this.formatCurrency(data.profit)}</strong>
                    </div>
                    <div class="stat-item">
                        <span>Preço</span>
                        <strong>${this.formatCurrency(data.unitPrice)}</strong>
                    </div>
                </div>
                <button onclick="app.showProductDetails('${product.id}')" class="btn-secondary">Ver Detalhes</button>
            `;
            productsContainer.appendChild(productCard);
        });

        // Totais da empresa
        document.getElementById('totalRevenue').textContent = this.formatCurrency(totalRevenue);
        document.getElementById('totalCustomers').textContent = totalCustomers.toLocaleString('pt-PT');
        document.getElementById('totalProfit').textContent = this.formatCurrency(totalProfit);

        // Balanço
        document.getElementById('totalAssets').textContent = this.formatCurrency(teamData.globalData.totalAssets);
        document.getElementById('equity').textContent = this.formatCurrency(teamData.globalData.equity);
        document.getElementById('totalLiabilities').textContent = this.formatCurrency(teamData.globalData.totalLiabilities);
    }

    showProductDetails(productId) {
        const teamData = this.getTeamData(this.currentUser);
        const product = teamData.products.find(p => p.id === productId);
        const latestPeriod = product.periods[product.periods.length - 1];
        const data = latestPeriod.data;

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${product.name} - Dados Detalhados</h2>
                    <button onclick="this.closest('.modal-overlay').remove()" class="btn-ghost">✕</button>
                </div>
                <div class="modal-body">
                    <div class="data-grid">
                        <div class="data-card">
                            <h3>Clientes</h3>
                            <div class="data-row"><span>Base Atual</span><strong>${data.customerBase.toLocaleString('pt-PT')}</strong></div>
                            <div class="data-row"><span>Novos</span><strong>${data.newCustomers.toLocaleString('pt-PT')}</strong></div>
                            <div class="data-row"><span>Perdidos</span><strong>${data.lostCustomers.toLocaleString('pt-PT')}</strong></div>
                            <div class="data-row"><span>Base Anterior</span><strong>${data.previousCustomers.toLocaleString('pt-PT')}</strong></div>
                            <div class="data-row"><span>Mantidos</span><strong>${data.retainedCustomers.toLocaleString('pt-PT')}</strong></div>
                        </div>
                        <div class="data-card">
                            <h3>Receitas</h3>
                            <div class="data-row"><span>Receita Total</span><strong>${this.formatCurrency(data.revenue)}</strong></div>
                            <div class="data-row"><span>Unidades Vendidas</span><strong>${data.unitsSold.toLocaleString('pt-PT')}</strong></div>
                            <div class="data-row"><span>Preço Unitário</span><strong>${this.formatCurrency(data.unitPrice)}</strong></div>
                            <div class="data-row"><span>Desconto</span><strong>${data.appliedDiscount}%</strong></div>
                        </div>
                        <div class="data-card">
                            <h3>Custos</h3>
                            <div class="data-row"><span>Custos Variáveis</span><strong>${this.formatCurrency(data.variableCosts)}</strong></div>
                            <div class="data-row"><span>Custo Var. Unit.</span><strong>${this.formatCurrency(data.unitVariableCost)}</strong></div>
                            <div class="data-row"><span>Custos Fixos</span><strong>${this.formatCurrency(data.fixedCosts)}</strong></div>
                            <div class="data-row"><span>Comissões</span><strong>${this.formatCurrency(data.salesCommissions)}</strong></div>
                        </div>
                        <div class="data-card">
                            <h3>Investimentos</h3>
                            <div class="data-row"><span>Marketing</span><strong>${this.formatCurrency(data.marketingCost)}</strong></div>
                            <div class="data-row"><span>Qualidade</span><strong>${this.formatCurrency(data.qualityCost)}</strong></div>
                        </div>
                        <div class="data-card">
                            <h3>Resultados</h3>
                            <div class="data-row"><span>Margem Unitária</span><strong>${this.formatCurrency(data.margem)}</strong></div>
                            <div class="data-row"><span>Lucro</span><strong>${this.formatCurrency(data.profit)}</strong></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    loadDecisionsForm() {
        const simData = this.getSimulationData();
        const currentPeriod = simData.currentPeriod;
        const quarterLabel = this.getQuarterLabel(currentPeriod);

        document.getElementById('decisionPeriod').textContent = quarterLabel;

        const teamData = this.getTeamData(this.currentUser);
        const hasDecision = teamData.products[0].periods.some(p => p.period === currentPeriod);

        const alert = document.getElementById('decisionAlert');
        const form = document.getElementById('decisionsForm');

        if (currentPeriod > CONFIG.TOTAL_PERIODS) {
            alert.className = 'alert alert-info';
            alert.textContent = 'A simulação terminou. Não é possível tomar mais decisões.';
            form.style.display = 'none';
            return;
        }

        if (hasDecision) {
            alert.className = 'alert alert-success';
            alert.textContent = '✓ Decisões já submetidas para este trimestre!';
            form.style.display = 'none';
        } else {
            alert.className = 'alert alert-warning';
            alert.textContent = '⚠ Submeta as suas decisões para ' + quarterLabel;
            form.style.display = 'block';

            // Preencher com valores anteriores
            teamData.products.forEach(product => {
                const lastPeriod = product.periods[product.periods.length - 1];
                const lastDecisions = lastPeriod.decisions;

                document.getElementById(`price_${product.id}`).value = lastDecisions.price;
                document.getElementById(`discount_${product.id}`).value = lastDecisions.discount || 0;
                document.getElementById(`marketing_${product.id}`).value = lastDecisions.marketingInvestment;
                document.getElementById(`quality_${product.id}`).value = lastDecisions.qualityInvestment || 3500;
                document.getElementById(`commission_${product.id}`).value = lastDecisions.salesCommission || 5;

                // Preencher canais de publicidade
                if (lastDecisions.adChannels) {
                    Object.keys(CONFIG.AD_CHANNELS).forEach(channelId => {
                        const value = lastDecisions.adChannels[channelId] || 20;
                        document.getElementById(`adChannel_${channelId}_${product.id}`).value = value;
                    });
                } else {
                    // Valores default se não existirem
                    document.getElementById(`adChannel_googleAds_${product.id}`).value = 25;
                    document.getElementById(`adChannel_facebook_${product.id}`).value = 30;
                    document.getElementById(`adChannel_instagram_${product.id}`).value = 20;
                    document.getElementById(`adChannel_email_${product.id}`).value = 15;
                    document.getElementById(`adChannel_radio_${product.id}`).value = 10;
                }

                // Preencher canais de distribuição
                if (lastDecisions.distributionChannels) {
                    Object.keys(CONFIG.DISTRIBUTION_CHANNELS).forEach(channelId => {
                        const value = lastDecisions.distributionChannels[channelId] || 25;
                        document.getElementById(`distChannel_${channelId}_${product.id}`).value = value;
                    });
                } else {
                    // Valores default se não existirem
                    document.getElementById(`distChannel_ownStores_${product.id}`).value = 30;
                    document.getElementById(`distChannel_retailers_${product.id}`).value = 40;
                    document.getElementById(`distChannel_ecommerce_${product.id}`).value = 20;
                    document.getElementById(`distChannel_wholesalers_${product.id}`).value = 10;
                }
            });

            // Decisões globais (valores default)
            document.getElementById('retentionInvestment').value = 8000;
            document.getElementById('brandInvestment').value = 5000;
            document.getElementById('customerService').value = 6000;
            document.getElementById('creditDays').value = 30;
            document.getElementById('processImprovement').value = 4000;
        }
    }

    loadMarketData() {
        const allTeams = this.getAllTeamsData();
        const simData = this.getSimulationData();
        const currentPeriod = simData.currentPeriod - 1;

        const tbody = document.getElementById('marketTableBody');
        tbody.innerHTML = '';

        const teamCodes = this.getTeamCodes();
        let totalMarketRevenue = 0;
        let totalMarketCustomers = 0;
        let yourRevenue = 0;
        let yourCustomers = 0;

        teamCodes.forEach(code => {
            const team = allTeams[code];
            if (!team) return;

            let teamRevenue = 0;
            let teamCustomers = 0;

            team.products.forEach(product => {
                const period = product.periods.find(p => p.period === currentPeriod) || product.periods[product.periods.length - 1];
                teamRevenue += period.data.revenue;
                teamCustomers += period.data.customerBase;
            });

            const row = document.createElement('tr');
            if (code === this.currentUser) {
                row.classList.add('highlight');
                yourRevenue = teamRevenue;
                yourCustomers = teamCustomers;
            }

            row.innerHTML = `
                <td>${team.name}</td>
                <td>${this.formatCurrency(teamRevenue)}</td>
                <td>${teamCustomers.toLocaleString('pt-PT')}</td>
            `;
            tbody.appendChild(row);

            totalMarketRevenue += teamRevenue;
            totalMarketCustomers += teamCustomers;
        });

        document.getElementById('totalMarket').textContent = this.formatCurrency(totalMarketRevenue);
        document.getElementById('totalMarketCustomers').textContent = totalMarketCustomers.toLocaleString('pt-PT');
        document.getElementById('yourRevenue').textContent = this.formatCurrency(yourRevenue);
        document.getElementById('yourCustomers').textContent = yourCustomers.toLocaleString('pt-PT');
    }

    loadHistoryData() {
        const teamData = this.getTeamData(this.currentUser);
        const historyContent = document.getElementById('historyContent');
        historyContent.innerHTML = '';

        // Agrupar por período
        const numPeriods = teamData.products[0].periods.length;

        for (let p = 0; p < numPeriods; p++) {
            const periodDiv = document.createElement('div');
            periodDiv.className = 'history-period';

            const period = teamData.products[0].periods[p].period;
            const quarterLabel = this.getQuarterLabel(period);
            const quarter = this.getQuarterNumber(period);
            const isHistorical = period <= CONFIG.HISTORICAL_PERIODS;

            // Descrição da sazonalidade
            const seasonalityDesc = {
                1: '❄️ Pós-Natal (vendas baixas)',
                2: '🌸 Primavera (vendas normais)',
                3: '☀️ Verão (férias, vendas reduzidas)',
                4: '🎄 Natal (vendas altas)'
            };

            let productsHTML = '';
            teamData.products.forEach(product => {
                const periodData = product.periods[p];
                const d = periodData.decisions;
                const data = periodData.data;

                let channelTablesHTML = '';

                // Tabela de canais de publicidade (se existir)
                if (data.adChannelPerformance) {
                    channelTablesHTML += `
                        <div class="channel-performance" style="margin-top: 16px;">
                            <h5 style="font-size: 14px; margin: 0 0 8px 0;">📢 Dados por Canal de Publicidade</h5>
                            <table class="channel-table" style="font-size: 12px;">
                                <tr>
                                    <th>Canal</th>
                                    <th>Investimento (€)</th>
                                    <th>Clientes Adquiridos</th>
                                </tr>`;

                    Object.keys(data.adChannelPerformance).forEach(channelId => {
                        const ch = data.adChannelPerformance[channelId];
                        const channelName = CONFIG.AD_CHANNELS[channelId].name;
                        channelTablesHTML += `
                            <tr>
                                <td>${channelName}</td>
                                <td>${this.formatCurrency(ch.investment)}</td>
                                <td>${ch.customersAcquired}</td>
                            </tr>`;
                    });

                    channelTablesHTML += `</table></div>`;
                }

                // Tabela de canais de distribuição (se existir)
                if (data.distributionPerformance) {
                    channelTablesHTML += `
                        <div class="channel-performance" style="margin-top: 16px;">
                            <h5 style="font-size: 14px; margin: 0 0 8px 0;">🏪 Dados por Canal de Distribuição</h5>
                            <table class="channel-table" style="font-size: 12px;">
                                <tr>
                                    <th>Canal</th>
                                    <th>Unidades Vendidas</th>
                                    <th>Receita (€)</th>
                                </tr>`;

                    Object.keys(data.distributionPerformance).forEach(channelId => {
                        const ch = data.distributionPerformance[channelId];
                        const channelName = CONFIG.DISTRIBUTION_CHANNELS[channelId].name;
                        channelTablesHTML += `
                            <tr>
                                <td>${channelName}</td>
                                <td>${ch.unitsSold}</td>
                                <td>${this.formatCurrency(ch.revenue)}</td>
                            </tr>`;
                    });

                    channelTablesHTML += `</table></div>`;
                }

                // Decisões tomadas
                let decisionsHTML = `
                    <div class="history-decisions">
                        <h5 style="font-size: 14px; margin: 12px 0 8px 0; color: var(--text-secondary);">📋 Decisões Tomadas</h5>
                        <div class="decisions-compact">
                            <div class="decision-compact"><span>Preço:</span><strong>${this.formatCurrency(d.price)}</strong></div>
                            <div class="decision-compact"><span>Desconto:</span><strong>${d.discount}%</strong></div>
                            <div class="decision-compact"><span>Marketing:</span><strong>${this.formatCurrency(d.marketingInvestment)}</strong></div>
                            <div class="decision-compact"><span>Qualidade:</span><strong>${this.formatCurrency(d.qualityInvestment)}</strong></div>
                            <div class="decision-compact"><span>Comissões:</span><strong>${d.salesCommission}%</strong></div>
                        </div>
                    </div>
                `;

                // Distribuição de canais de publicidade
                if (d.adChannels) {
                    decisionsHTML += `
                        <div class="channel-decisions">
                            <h5 style="font-size: 14px; margin: 12px 0 8px 0; color: var(--text-secondary);">📢 Distribuição Publicidade</h5>
                            <div class="channel-percentages">
                                <span>Google Ads: ${d.adChannels.googleAds}%</span>
                                <span>Facebook: ${d.adChannels.facebook}%</span>
                                <span>Instagram: ${d.adChannels.instagram}%</span>
                                <span>Email: ${d.adChannels.email}%</span>
                                <span>Rádio/TV: ${d.adChannels.radio}%</span>
                            </div>
                        </div>
                    `;
                }

                // Distribuição de canais de distribuição
                if (d.distributionChannels) {
                    decisionsHTML += `
                        <div class="channel-decisions">
                            <h5 style="font-size: 14px; margin: 12px 0 8px 0; color: var(--text-secondary);">🏪 Distribuição Vendas</h5>
                            <div class="channel-percentages">
                                <span>Lojas Próprias: ${d.distributionChannels.ownStores}%</span>
                                <span>Retalhistas: ${d.distributionChannels.retailers}%</span>
                                <span>E-commerce: ${d.distributionChannels.ecommerce}%</span>
                                <span>Grossistas: ${d.distributionChannels.wholesalers}%</span>
                            </div>
                        </div>
                    `;
                }

                productsHTML += `
                    <div class="product-history">
                        <h4>${product.name}</h4>

                        <div class="history-data">
                            <div class="history-item"><span>Receita</span><strong>${this.formatCurrency(data.revenue)}</strong></div>
                            <div class="history-item"><span>Lucro</span><strong>${this.formatCurrency(data.profit)}</strong></div>
                            <div class="history-item"><span>Clientes</span><strong>${data.customerBase.toLocaleString('pt-PT')}</strong></div>
                            <div class="history-item"><span>Novos</span><strong>${data.newCustomers.toLocaleString('pt-PT')}</strong></div>
                            <div class="history-item"><span>Perdidos</span><strong>${data.lostCustomers.toLocaleString('pt-PT')}</strong></div>
                            <div class="history-item"><span>Unidades</span><strong>${data.unitsSold.toLocaleString('pt-PT')}</strong></div>
                        </div>

                        ${decisionsHTML}
                        ${channelTablesHTML}
                    </div>
                `;
            });

            // Decisões globais (se existirem)
            let globalHTML = '';
            const globalDec = teamData.products[0].periods[p].globalDecisions;
            if (globalDec) {
                globalHTML = `
                    <div class="global-decisions-history" style="background: var(--surface); padding: 20px; border-radius: var(--radius-sm); border: 1.5px solid var(--border); margin-top: 20px;">
                        <h4 style="font-size: 16px; margin: 0 0 16px 0; color: var(--primary);">🌐 Decisões Globais da Empresa</h4>
                        <div class="decisions-compact">
                            <div class="decision-compact"><span>Fidelização:</span><strong>${this.formatCurrency(globalDec.retentionInvestment)}</strong></div>
                            <div class="decision-compact"><span>Marca Corporativa:</span><strong>${this.formatCurrency(globalDec.brandInvestment)}</strong></div>
                            <div class="decision-compact"><span>Serviço ao Cliente:</span><strong>${this.formatCurrency(globalDec.customerService)}</strong></div>
                            <div class="decision-compact"><span>Prazo de Crédito:</span><strong>${globalDec.creditDays} dias</strong></div>
                            <div class="decision-compact"><span>Melhoria Processos:</span><strong>${this.formatCurrency(globalDec.processImprovement)}</strong></div>
                        </div>
                    </div>
                `;
            }

            periodDiv.innerHTML = `
                <h3>${quarterLabel}${isHistorical ? ' (Histórico)' : ''}</h3>
                <p class="quarter-info">${seasonalityDesc[quarter]}</p>
                ${productsHTML}
                ${globalHTML}
            `;

            historyContent.appendChild(periodDiv);
        }
    }

    // ===== ADMIN =====
    loadAdminPanel() {
        const simData = this.getSimulationData();

        if (simData && simData.initialized) {
            document.getElementById('adminCurrentPeriod').textContent = this.getQuarterLabel(simData.currentPeriod);
            document.getElementById('adminState').textContent = 'Inicializado';

            const teamCodes = this.getTeamCodes();
            const teamCodesList = document.getElementById('teamCodesList');
            teamCodesList.innerHTML = '';

            teamCodes.forEach(code => {
                const div = document.createElement('div');
                div.className = 'team-code-item';
                div.textContent = code;
                teamCodesList.appendChild(div);
            });

            document.getElementById('teamCodesSetup').style.display = 'none';

            // Mostrar submissões
            this.loadSubmissionsStatus();
        } else {
            document.getElementById('adminCurrentPeriod').textContent = '-';
            document.getElementById('adminState').textContent = 'Não Inicializado';
            document.getElementById('teamCodesList').innerHTML = '<p>Inicialize a simulação primeiro</p>';
            document.getElementById('submissionsStatus').innerHTML = '<p class="info-text">Inicialize a simulação primeiro</p>';
        }
    }

    loadSubmissionsStatus() {
        const simData = this.getSimulationData();
        const teamsData = this.getAllTeamsData();
        const teamCodes = this.getTeamCodes();
        const currentPeriod = simData.currentPeriod;

        if (currentPeriod > CONFIG.TOTAL_PERIODS) {
            document.getElementById('submissionsStatus').innerHTML = '<p class="info-text">A simulação já terminou!</p>';
            return;
        }

        const container = document.getElementById('submissionsStatus');
        container.innerHTML = '';

        let submittedCount = 0;
        const submissionsHTML = [];

        teamCodes.forEach((code, index) => {
            const teamData = teamsData[code];
            if (!teamData) return;

            // Verificar se submeteu para o período actual
            const hasSubmitted = teamData.products[0].periods.some(p => p.period === currentPeriod);

            if (hasSubmitted) {
                submittedCount++;
                const submission = teamData.products[0].periods.find(p => p.period === currentPeriod);
                const submittedAt = new Date(submission.submittedAt);
                const timeStr = submittedAt.toLocaleString('pt-PT', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                });

                submissionsHTML.push(`
                    <div class="submission-item submitted">
                        <div class="submission-header">
                            <strong>Equipa ${index + 1}</strong>
                            <span class="submission-status submitted">✓ Submetido</span>
                        </div>
                        <div class="submission-details">
                            <span class="submission-code">${code}</span>
                            <span class="submission-time">⏰ ${timeStr}</span>
                        </div>
                        <button onclick="app.showSubmissionDetails('${code}', ${currentPeriod})" class="btn-details">Ver Decisões</button>
                    </div>
                `);
            } else {
                submissionsHTML.push(`
                    <div class="submission-item pending">
                        <div class="submission-header">
                            <strong>Equipa ${index + 1}</strong>
                            <span class="submission-status pending">⏳ Pendente</span>
                        </div>
                        <div class="submission-details">
                            <span class="submission-code">${code}</span>
                        </div>
                    </div>
                `);
            }
        });

        const summary = `
            <div class="submissions-summary">
                <h3>Estado das Submissões - ${this.getQuarterLabel(currentPeriod)}</h3>
                <p><strong>${submittedCount}/${teamCodes.length}</strong> equipas submeteram decisões</p>
            </div>
        `;

        container.innerHTML = summary + submissionsHTML.join('');
    }

    showSubmissionDetails(teamCode, period) {
        const teamsData = this.getAllTeamsData();
        const teamData = teamsData[teamCode];

        if (!teamData) {
            alert('Equipa não encontrada!');
            return;
        }

        let detailsHTML = `<div class="modal-overlay" onclick="this.remove()">
            <div class="modal-content" onclick="event.stopPropagation()">
                <h2>Decisões Submetidas - ${teamData.name}</h2>
                <p class="modal-subtitle">${this.getQuarterLabel(period)}</p>`;

        teamData.products.forEach(product => {
            const periodData = product.periods.find(p => p.period === period);
            if (!periodData) return;

            const d = periodData.decisions;
            const submittedAt = new Date(periodData.submittedAt).toLocaleString('pt-PT');

            detailsHTML += `
                <div class="product-decisions">
                    <h3>${product.name}</h3>
                    <p class="submission-timestamp">Submetido: ${submittedAt}</p>
                    <div class="decisions-grid">
                        <div class="decision-item">
                            <span>Preço de Venda:</span>
                            <strong>${d.price.toFixed(2)}€</strong>
                        </div>
                        <div class="decision-item">
                            <span>Desconto:</span>
                            <strong>${d.discount.toFixed(1)}%</strong>
                        </div>
                        <div class="decision-item">
                            <span>Marketing:</span>
                            <strong>${d.marketingInvestment.toFixed(0)}€</strong>
                        </div>
                        <div class="decision-item">
                            <span>Qualidade:</span>
                            <strong>${d.qualityInvestment.toFixed(0)}€</strong>
                        </div>
                        <div class="decision-item">
                            <span>Comissões:</span>
                            <strong>${d.salesCommission.toFixed(1)}%</strong>
                        </div>
                    </div>

                    ${d.adChannels ? `
                    <h4 style="margin-top: 20px;">📢 Canais de Publicidade</h4>
                    <table class="channel-table">
                        <tr>
                            <th>Canal</th>
                            <th>% Orçamento</th>
                        </tr>
                        <tr><td>Google Ads</td><td>${d.adChannels.googleAds}%</td></tr>
                        <tr><td>Facebook Ads</td><td>${d.adChannels.facebook}%</td></tr>
                        <tr><td>Instagram Ads</td><td>${d.adChannels.instagram}%</td></tr>
                        <tr><td>Email Marketing</td><td>${d.adChannels.email}%</td></tr>
                        <tr><td>Rádio/TV</td><td>${d.adChannels.radio}%</td></tr>
                    </table>
                    ` : ''}

                    ${d.distributionChannels ? `
                    <h4 style="margin-top: 20px;">🏪 Canais de Distribuição</h4>
                    <table class="channel-table">
                        <tr>
                            <th>Canal</th>
                            <th>% Vendas</th>
                        </tr>
                        <tr><td>Lojas Próprias</td><td>${d.distributionChannels.ownStores}%</td></tr>
                        <tr><td>Retalhistas</td><td>${d.distributionChannels.retailers}%</td></tr>
                        <tr><td>E-commerce</td><td>${d.distributionChannels.ecommerce}%</td></tr>
                        <tr><td>Grossistas</td><td>${d.distributionChannels.wholesalers}%</td></tr>
                    </table>
                    ` : ''}
                </div>
            `;
        });

        // Adicionar decisões globais
        const firstProduct = teamData.products[0];
        const periodData = firstProduct.periods.find(p => p.period === period);

        if (periodData && periodData.data) {
            detailsHTML += `
                <div class="product-decisions">
                    <h3>🏢 Decisões Globais da Empresa</h3>
                    <div class="decisions-grid">
                        <div class="decision-item">
                            <span>Fidelização:</span>
                            <strong>${teamData.globalData && teamData.globalData.retentionInvestment ? this.formatCurrency(teamData.globalData.retentionInvestment) : '-'}</strong>
                        </div>
                        <div class="decision-item">
                            <span>Marca Corporativa:</span>
                            <strong>${teamData.globalData && teamData.globalData.brandInvestment ? this.formatCurrency(teamData.globalData.brandInvestment) : '-'}</strong>
                        </div>
                        <div class="decision-item">
                            <span>Serviço ao Cliente:</span>
                            <strong>${teamData.globalData && teamData.globalData.customerService ? this.formatCurrency(teamData.globalData.customerService) : '-'}</strong>
                        </div>
                        <div class="decision-item">
                            <span>Prazo de Crédito:</span>
                            <strong>${teamData.globalData && teamData.globalData.creditDays ? teamData.globalData.creditDays + ' dias' : '-'}</strong>
                        </div>
                        <div class="decision-item">
                            <span>Melhoria de Processos:</span>
                            <strong>${teamData.globalData && teamData.globalData.processImprovement ? this.formatCurrency(teamData.globalData.processImprovement) : '-'}</strong>
                        </div>
                    </div>
                </div>
            `;
        }

        detailsHTML += `
                <button onclick="this.closest('.modal-overlay').remove()" class="btn-primary">Fechar</button>
            </div>
        </div>`;

        document.body.insertAdjacentHTML('beforeend', detailsHTML);
    }

    advancePeriod() {
        const simData = this.getSimulationData();
        if (!simData || !simData.initialized) {
            alert('Simulação não inicializada!');
            return;
        }

        if (simData.currentPeriod > CONFIG.TOTAL_PERIODS) {
            alert('A simulação já terminou!');
            return;
        }

        const nextQuarter = this.getQuarterLabel(simData.currentPeriod + 1);
        if (!confirm(`Avançar para ${nextQuarter}?`)) {
            return;
        }

        simData.currentPeriod++;
        this.saveSimulationData(simData);

        alert(`Avançado para ${this.getQuarterLabel(simData.currentPeriod)}!`);
        this.loadAdminPanel();
    }

    resetSimulation() {
        if (!confirm('ATENÇÃO: Isto irá apagar TODOS os dados. Tem certeza?')) {
            return;
        }

        if (!confirm('Confirmação final: Todos os dados serão perdidos!')) {
            return;
        }

        localStorage.removeItem(CONFIG.STORAGE_KEYS.SIMULATION_DATA);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.TEAMS_DATA);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.TEAM_CODES);

        alert('Simulação resetada com sucesso!');
        this.loadAdminPanel();
    }

    changePassword(newPassword) {
        if (!newPassword || newPassword.length < 6) {
            alert('A palavra-passe deve ter pelo menos 6 caracteres!');
            return;
        }

        localStorage.setItem(CONFIG.STORAGE_KEYS.ADMIN_PASSWORD, newPassword);
        alert('Palavra-passe alterada com sucesso!');
        document.getElementById('changePasswordForm').reset();
    }

    // ===== EXPORTAÇÃO EXCEL =====
    exportTeamData() {
        const teamData = this.getTeamData(this.currentUser);

        const wb = XLSX.utils.book_new();

        // Sheet 1: Resumo Geral
        const resumoData = [
            ['SIMULADOR DE MÉTRICAS DE MARKETING'],
            ['Equipa:', teamData.name],
            ['Código:', teamData.code],
            ['Data de Exportação:', new Date().toLocaleString('pt-PT')],
            []
        ];

        teamData.products.forEach(product => {
            resumoData.push([`${product.name}`], []);
            resumoData.push(['Período', 'Receita', 'Lucro', 'Clientes', 'Novos', 'Perdidos', 'Preço', 'Desconto', 'Marketing', 'Qualidade']);

            product.periods.forEach(period => {
                const d = period.decisions;
                const data = period.data;
                resumoData.push([
                    period.period,
                    data.revenue,
                    data.profit,
                    data.customerBase,
                    data.newCustomers,
                    data.lostCustomers,
                    d.price,
                    d.discount,
                    d.marketingInvestment,
                    d.qualityInvestment
                ]);
            });
            resumoData.push([]);
        });

        const wsResumo = XLSX.utils.aoa_to_sheet(resumoData);
        XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');

        // Exportar ficheiro
        XLSX.writeFile(wb, `${teamData.code}_Dados_Simulador.xlsx`);
    }

    exportAllData() {
        const simData = this.getSimulationData();
        const teamsData = this.getAllTeamsData();
        const teamCodes = this.getTeamCodes();

        if (!simData || !teamsData) {
            alert('Não há dados para exportar!');
            return;
        }

        const wb = XLSX.utils.book_new();

        // ===== SHEET 1: RANKING GERAL =====
        const ranking = [];
        ranking.push(['RANKING GERAL - ' + this.getQuarterLabel(simData.currentPeriod - 1)]);
        ranking.push([]);
        ranking.push(['Posição', 'Equipa', 'Código', 'Receita Total (€)', 'Lucro Total (€)', 'Clientes Totais', 'Períodos Completos']);

        const rankingData = [];
        teamCodes.forEach(code => {
            const team = teamsData[code];
            if (!team) return;

            let totalRevenue = 0;
            let totalProfit = 0;
            let totalCustomers = 0;

            team.products.forEach(product => {
                const lastPeriod = product.periods[product.periods.length - 1];
                totalRevenue += lastPeriod.data.revenue;
                totalProfit += lastPeriod.data.profit;
                totalCustomers += lastPeriod.data.customerBase;
            });

            rankingData.push({
                name: team.name,
                code: code,
                revenue: totalRevenue,
                profit: totalProfit,
                customers: totalCustomers,
                periods: team.products[0].periods.length
            });
        });

        // Ordenar por receita
        rankingData.sort((a, b) => b.revenue - a.revenue);

        rankingData.forEach((team, index) => {
            ranking.push([
                index + 1,
                team.name,
                team.code,
                team.revenue.toFixed(2),
                team.profit.toFixed(2),
                team.customers,
                team.periods
            ]);
        });

        const wsRanking = XLSX.utils.aoa_to_sheet(ranking);
        XLSX.utils.book_append_sheet(wb, wsRanking, 'Ranking');

        // ===== SHEET 2: EVOLUÇÃO POR TRIMESTRE =====
        const numPeriods = teamsData[teamCodes[0]].products[0].periods.length;

        for (let p = 0; p < numPeriods; p++) {
            const periodNum = teamsData[teamCodes[0]].products[0].periods[p].period;
            const quarterLabel = this.getQuarterLabel(periodNum);
            const periodData = [];

            periodData.push([quarterLabel]);
            periodData.push([]);
            periodData.push(['Equipa', 'Produto', 'Receita (€)', 'Lucro (€)', 'Clientes', 'Novos', 'Perdidos', 'Preço (€)', 'Desconto (%)', 'Marketing (€)']);

            teamCodes.forEach(code => {
                const team = teamsData[code];
                if (!team) return;

                team.products.forEach(product => {
                    const period = product.periods[p];
                    if (!period) return;

                    const d = period.decisions;
                    const data = period.data;

                    periodData.push([
                        team.name,
                        product.name,
                        data.revenue.toFixed(2),
                        data.profit.toFixed(2),
                        data.customerBase,
                        data.newCustomers,
                        data.lostCustomers,
                        d.price.toFixed(2),
                        d.discount,
                        d.marketingInvestment
                    ]);
                });
            });

            const wsPeriod = XLSX.utils.aoa_to_sheet(periodData);
            // Nome da sheet limitado a 31 caracteres no Excel
            const sheetName = `T${this.getQuarterNumber(periodNum)}-${CONFIG.START_YEAR + Math.floor((periodNum - 1) / 4)}`;
            XLSX.utils.book_append_sheet(wb, wsPeriod, sheetName);
        }

        // ===== SHEET 3: RESUMO COMPARATIVO =====
        const resumo = [];
        resumo.push(['RESUMO COMPARATIVO - TODAS AS EQUIPAS']);
        resumo.push([]);
        resumo.push(['Equipa', 'Receita Total', 'Receita Média/Período', 'Lucro Total', 'Lucro Médio/Período', 'Clientes Finais', 'Taxa Crescimento Clientes']);

        teamCodes.forEach(code => {
            const team = teamsData[code];
            if (!team) return;

            let totalRevenue = 0;
            let totalProfit = 0;
            let totalCustomers = 0;
            let initialCustomers = 0;

            team.products.forEach(product => {
                product.periods.forEach((period, index) => {
                    totalRevenue += period.data.revenue;
                    totalProfit += period.data.profit;
                    if (index === 0) initialCustomers += period.data.customerBase;
                });
                const lastPeriod = product.periods[product.periods.length - 1];
                totalCustomers += lastPeriod.data.customerBase;
            });

            const numPeriods = team.products[0].periods.length;
            const avgRevenue = totalRevenue / numPeriods;
            const avgProfit = totalProfit / numPeriods;
            const growthRate = ((totalCustomers - initialCustomers) / initialCustomers * 100).toFixed(2);

            resumo.push([
                team.name,
                totalRevenue.toFixed(2),
                avgRevenue.toFixed(2),
                totalProfit.toFixed(2),
                avgProfit.toFixed(2),
                totalCustomers,
                growthRate + '%'
            ]);
        });

        const wsResumo = XLSX.utils.aoa_to_sheet(resumo);
        XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo Comparativo');

        // ===== EXPORTAR FICHEIRO =====
        const timestamp = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(wb, `Desempenho_Equipas_${timestamp}.xlsx`);
    }

    downloadJSON(data, filename) {
        const content = JSON.stringify(data, null, 2);
        const blob = new Blob([content], { type: 'application/json' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // ===== FORMATAÇÃO =====
    formatCurrency(value) {
        return new Intl.NumberFormat('pt-PT', {
            style: 'currency',
            currency: 'EUR'
        }).format(value);
    }

    // ===== EVENT LISTENERS =====
    setupEventListeners() {
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const teamCode = document.getElementById('teamCode').value;
            this.loginTeam(teamCode);
        });

        document.getElementById('adminLoginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const password = document.getElementById('adminPassword').value;
            this.loginAdmin(password);
        });

        document.getElementById('decisionsForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            this.submitDecisions(formData);
        });

        document.getElementById('changePasswordForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const newPassword = document.getElementById('newPassword').value;
            this.changePassword(newPassword);
        });
    }

    checkInitialState() {
        const hasPassword = localStorage.getItem(CONFIG.STORAGE_KEYS.ADMIN_PASSWORD);
        if (!hasPassword) {
            localStorage.setItem(CONFIG.STORAGE_KEYS.ADMIN_PASSWORD, CONFIG.DEFAULT_ADMIN_PASSWORD);
        }
    }
}

// ===== INICIALIZAÇÃO =====
let app;

document.addEventListener('DOMContentLoaded', () => {
    app = new SimulatorApp();
});
