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
        TEAM_CODES: 'teamCodes',
        SESSION: 'currentSession',
        ACCESS_LOGS: 'accessLogs'
    },
    // Sazonalidade por trimestre e tipo de produto
    SEASONALITY: {
        1: { // Q1 (Jan-Mar): Pós-Natal, vendas baixas
            premium: { demand: 0.90, price: 1.00, churn: 1.00 },
            midrange: { demand: 0.86, price: 0.98, churn: 1.08 },
            economic: { demand: 0.82, price: 0.96, churn: 1.12 }
        },
        2: { // Q2 (Abr-Jun): Primavera, vendas normais
            premium: { demand: 1.00, price: 1.00, churn: 1.00 },
            midrange: { demand: 1.00, price: 1.00, churn: 1.00 },
            economic: { demand: 1.00, price: 1.00, churn: 1.00 }
        },
        3: { // Q3 (Jul-Set): Verão, vendas moderadas
            premium: { demand: 0.94, price: 1.00, churn: 0.98 },
            midrange: { demand: 0.90, price: 0.98, churn: 1.05 },
            economic: { demand: 0.85, price: 0.96, churn: 1.08 }
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
            marginMultiplier: 0.65,       // Margem líquida do canal
            volumeCapacity: 0.35,         // Máx 35% das vendas
            costs: 0.08                   // 8% custos operacionais extra
        },
        retailers: {
            name: 'Retalhistas',
            marginMultiplier: 0.45,       // Margem líquida do canal
            volumeCapacity: 0.45,         // Máx 45% das vendas
            costs: 0.03
        },
        ecommerce: {
            name: 'E-commerce',
            marginMultiplier: 0.55,       // Margem líquida do canal
            volumeCapacity: 0.30,
            costs: 0.05
        },
        wholesalers: {
            name: 'Grossistas',
            marginMultiplier: 0.30,       // Margem líquida do canal
            volumeCapacity: 0.50,
            costs: 0.02
        }
    }
};

// ===== FIREBASE SYNC MANAGER =====
// Sincroniza localStorage com Firebase automaticamente
class FirebaseSyncManager {
    constructor() {
        this.ready = false;
        this.syncedKeys = [
            CONFIG.STORAGE_KEYS.ADMIN_PASSWORD,
            CONFIG.STORAGE_KEYS.SIMULATION_DATA,
            CONFIG.STORAGE_KEYS.TEAMS_DATA,
            CONFIG.STORAGE_KEYS.TEAM_CODES,
            CONFIG.STORAGE_KEYS.ACCESS_LOGS
        ];
        this.init();
    }

    async init() {
        // Aguarda Firebase estar disponível
        while (!window.firebaseDB) {
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        this.db = window.firebaseDB;

        // Carrega dados do Firebase para localStorage
        await this.loadFromFirebase();

        // Configura listeners em tempo real
        this.setupRealtimeListeners();

        this.ready = true;
        console.log('🔥 Firebase sincronizado!');
    }

    async loadFromFirebase() {
        // Carrega todos os dados do Firebase para localStorage
        for (const key of this.syncedKeys) {
            try {
                const snapshot = await this.db.get(this.db.child(this.db.ref(this.db.database), key));
                if (snapshot.exists()) {
                    const value = snapshot.val();
                    localStorage.setItem(key, JSON.stringify(value));
                }
            } catch (error) {
                console.error(`Erro ao carregar ${key} do Firebase:`, error);
            }
        }
    }

    setupRealtimeListeners() {
        // Ouve mudanças em tempo real e atualiza localStorage
        for (const key of this.syncedKeys) {
            this.db.onValue(this.db.ref(this.db.database, key), (snapshot) => {
                if (snapshot.exists()) {
                    const value = snapshot.val();
                    localStorage.setItem(key, JSON.stringify(value));
                    // Notificar que houve atualização (para recarregar UI)
                    window.dispatchEvent(new CustomEvent('firebase-update', { detail: { key, value } }));
                }
            });
        }
    }

    // Salva no Firebase E localStorage
    save(key, value) {
        // Salva localmente (síncrono)
        localStorage.setItem(key, JSON.stringify(value));

        // Salva no Firebase (assíncrono, não bloqueia)
        if (this.ready && this.syncedKeys.includes(key)) {
            this.db.set(this.db.ref(this.db.database, key), value)
                .catch(error => console.error(`Erro ao salvar ${key} no Firebase:`, error));
        }
    }

    // Remove do Firebase E localStorage
    remove(key) {
        localStorage.removeItem(key);

        if (this.ready && this.syncedKeys.includes(key)) {
            this.db.remove(this.db.ref(this.db.database, key))
                .catch(error => console.error(`Erro ao remover ${key} do Firebase:`, error));
        }
    }
}

// Instância global
const firebaseSync = new FirebaseSyncManager();

// ===== APLICAÇÃO PRINCIPAL =====
class SimulatorApp {
    constructor() {
        this.currentUser = null;
        this.isAdmin = false;
        this.init();
    }

    async init() {
        this.setupEventListeners();

        // Aguardar Firebase estar pronto
        await this.waitForFirebase();

        this.loadSession(); // Restaurar sessão se existir
        this.checkInitialState();
    }

    async waitForFirebase() {
        while (!firebaseSync.ready) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    // ===== GESTÃO DE SESSÃO =====
    saveSession() {
        const session = {
            currentUser: this.currentUser,
            isAdmin: this.isAdmin
        };
        localStorage.setItem(CONFIG.STORAGE_KEYS.SESSION, JSON.stringify(session));
    }

    loadSession() {
        try {
            const sessionData = localStorage.getItem(CONFIG.STORAGE_KEYS.SESSION);
            if (sessionData) {
                const session = JSON.parse(sessionData);
                this.currentUser = session.currentUser;
                this.isAdmin = session.isAdmin;

                // Restaurar ecrã apropriado
                if (this.isAdmin) {
                    this.showScreen('adminScreen');
                    this.loadAdminPanel();
                } else if (this.currentUser) {
                    // Verificar se os dados da equipa existem
                    const teamData = this.getTeamData(this.currentUser);
                    const simData = this.getSimulationData();

                    if (teamData && simData && simData.initialized) {
                        this.showScreen('dashboardScreen');
                        this.loadDashboard();
                    } else {
                        // Dados não existem, limpar sessão
                        this.clearSession();
                    }
                }
            }
        } catch (error) {
            // Em caso de erro, limpar sessão
            this.clearSession();
        }
    }

    clearSession() {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.SESSION);
        this.currentUser = null;
        this.isAdmin = false;
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
        this.clearSession();
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
        this.saveSession();

        // Registar acesso
        this.addAccessLog('team', teamCode, teamData.name);

        this.showScreen('dashboardScreen');
        this.loadDashboard();
    }

    loginAdmin(password) {
        const storedPasswordData = localStorage.getItem(CONFIG.STORAGE_KEYS.ADMIN_PASSWORD);
        let correctPassword = CONFIG.DEFAULT_ADMIN_PASSWORD;

        if (storedPasswordData) {
            try {
                correctPassword = JSON.parse(storedPasswordData);
            } catch (e) {
                correctPassword = CONFIG.DEFAULT_ADMIN_PASSWORD;
            }
        }

        if (password !== correctPassword) {
            alert('Palavra-passe incorreta!');
            return;
        }

        this.isAdmin = true;
        this.saveSession();

        // Registar acesso
        this.addAccessLog('admin', 'Professor', 'Painel Administrativo');

        this.showScreen('adminScreen');
        this.loadAdminPanel();
    }

    // ===== DADOS =====
    getSimulationData() {
        const data = localStorage.getItem(CONFIG.STORAGE_KEYS.SIMULATION_DATA);
        return data ? JSON.parse(data) : null;
    }

    saveSimulationData(data) {
        firebaseSync.save(CONFIG.STORAGE_KEYS.SIMULATION_DATA, data);
    }

    getAllTeamsData() {
        const data = localStorage.getItem(CONFIG.STORAGE_KEYS.TEAMS_DATA);
        return data ? JSON.parse(data) : null;
    }

    saveAllTeamsData(data) {
        firebaseSync.save(CONFIG.STORAGE_KEYS.TEAMS_DATA, data);
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
        firebaseSync.save(CONFIG.STORAGE_KEYS.TEAM_CODES, codes);
    }

    // ===== ACCESS LOGS =====
    getAccessLogs() {
        const data = localStorage.getItem(CONFIG.STORAGE_KEYS.ACCESS_LOGS);
        return data ? JSON.parse(data) : [];
    }

    addAccessLog(userType, identifier, teamName = null) {
        const logs = this.getAccessLogs();
        const newLog = {
            timestamp: new Date().toISOString(),
            userType: userType, // 'admin' ou 'team'
            identifier: identifier, // teamCode ou 'admin'
            teamName: teamName,
            date: new Date().toLocaleString('pt-PT')
        };

        logs.unshift(newLog); // Adiciona no início (mais recente primeiro)

        // Manter apenas últimos 100 logs
        if (logs.length > 100) {
            logs.pop();
        }

        firebaseSync.save(CONFIG.STORAGE_KEYS.ACCESS_LOGS, logs);
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
                    type: product.type,
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

                    // Preço efectivo com margem do canal
                    const effectivePrice = basePrice * channel.marginMultiplier;
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
                        marginMultiplier: channel.marginMultiplier
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

            // Guardar apenas as decisões, SEM calcular resultados
            // Os resultados serão calculados quando o admin correr a simulação
            const newPeriod = {
                period: currentPeriod,
                decisions: productDecisions,
                globalDecisions: globalDecisions,
                data: null, // Resultados pendentes - serão calculados pelo admin
                submittedAt: new Date().toISOString(),
                status: 'pending' // Indica que aguarda simulação
            };

            productData.periods.push(newPeriod);
        });

        this.saveTeamData(this.currentUser, teamData);

        alert('Decisões submetidas com sucesso!\n\nOs resultados estarão disponíveis após o professor correr a simulação do trimestre.');
        this.loadDashboard();
    }

    // ===== SIMULAÇÃO COMPETITIVA =====

    // Reverter submissões do período atual para estado pendente
    // (útil para submissões feitas antes da implementação do sistema de simulação diferida)
    revertCurrentPeriodSubmissions() {
        const simData = this.getSimulationData();
        if (!simData || !simData.initialized) {
            alert('Simulação não inicializada!');
            return;
        }

        const currentPeriod = simData.currentPeriod;
        const teamCodes = this.getTeamCodes();
        const teamsData = this.getAllTeamsData();

        if (!confirm(`Isto irá reverter todas as submissões do ${this.getQuarterLabel(currentPeriod)} para o estado pendente.\n\nAs decisões serão mantidas, mas os resultados calculados serão apagados.\n\nContinuar?`)) {
            return;
        }

        let revertedCount = 0;

        teamCodes.forEach(code => {
            const teamData = teamsData[code];
            if (!teamData) return;

            teamData.products.forEach(product => {
                const periodIndex = product.periods.findIndex(p => p.period === currentPeriod);
                if (periodIndex === -1) return;

                const periodData = product.periods[periodIndex];

                // Reverter para estado pendente
                periodData.data = null;
                periodData.status = 'pending';
                delete periodData.simulatedAt;

                revertedCount++;
            });

            this.saveTeamData(code, teamData);
        });

        alert(`${revertedCount / 3} equipa(s) revertida(s) para estado pendente.\n\nAgora pode correr a simulação quando todas as equipas tiverem submetido.`);
        this.loadAdminPanel();
    }

    recalculatePreviousPeriods() {
        const simData = this.getSimulationData();
        if (!simData || !simData.initialized) {
            alert('Simulação não inicializada!');
            return;
        }

        const teamCodes = this.getTeamCodes();
        const teamsData = this.getAllTeamsData();

        // Encontrar todos os períodos que já foram processados
        let periodsToRecalculate = [];
        let changes = [];

        teamCodes.forEach(code => {
            const teamData = teamsData[code];
            if (!teamData) return;

            teamData.products.forEach(product => {
                product.periods.forEach((periodData, periodIndex) => {
                    // Só recalcular períodos que já têm dados calculados
                    // (excluir período 0 que é histórico inicial e períodos pendentes)
                    if (periodData.data && periodIndex > 0) {
                        const periodNum = periodData.period;

                        // Verificar se este período já está na lista
                        if (!periodsToRecalculate.includes(periodNum)) {
                            periodsToRecalculate.push(periodNum);
                        }
                    }
                });
            });
        });

        if (periodsToRecalculate.length === 0) {
            alert('Não há períodos processados para recalcular.');
            return;
        }

        periodsToRecalculate.sort((a, b) => a - b);

        // Recalcular cada período
        periodsToRecalculate.forEach(periodNum => {
            // Recolher todas as decisões para calcular efeitos competitivos
            const allDecisions = this.collectAllDecisions(teamCodes, teamsData, periodNum);
            const marketMetrics = this.calculateMarketMetrics(allDecisions);

            teamCodes.forEach(code => {
                const teamData = teamsData[code];
                if (!teamData) return;

                teamData.products.forEach(product => {
                    const periodIndex = product.periods.findIndex(p => p.period === periodNum);
                    if (periodIndex === -1) return;

                    const periodData = product.periods[periodIndex];
                    if (!periodData.data) return;

                    const previousPeriod = product.periods[periodIndex - 1];
                    if (!previousPeriod || !previousPeriod.data) return;

                    const productType = product.type || (product.id === 'produtoA' ? 'premium' : product.id === 'produtoB' ? 'midrange' : 'economic');

                    // Guardar valores antigos
                    const oldRevenue = periodData.data.revenue;
                    const oldProfit = periodData.data.profit;
                    const oldUnitVariableCost = periodData.data.unitVariableCost;

                    // Recalcular com fórmulas corrigidas
                    const allDecisions = this.collectAllDecisions(teamCodes, teamsData, periodNum);
                    const newData = this.calculateCompetitivePeriodData(
                        previousPeriod,
                        periodData.decisions,
                        periodData.globalDecisions,
                        null,
                        periodNum,
                        productType,
                        marketMetrics,
                        allDecisions
                    );

                    // Registar alterações significativas
                    if (Math.abs(newData.revenue - oldRevenue) > 1 || Math.abs(newData.profit - oldProfit) > 1) {
                        changes.push({
                            team: code,
                            product: product.name,
                            period: this.getQuarterLabel(periodNum),
                            oldRevenue: oldRevenue,
                            newRevenue: newData.revenue,
                            oldProfit: oldProfit,
                            newProfit: newData.profit
                        });
                    }

                    // Atualizar dados
                    periodData.data = newData;
                });
            });
        });

        // Mostrar resumo das alterações
        let summaryHTML;
        if (changes.length === 0) {
            summaryHTML = `<h3>Recálculo completo</h3><p>Não foram encontradas diferenças significativas nos valores de receita/lucro, mas a estrutura dos dados será atualizada (campos em falta, etc.).</p>`;
        } else {
            summaryHTML = `<h3>Alterações a aplicar (${changes.length} produtos afetados):</h3><div style="max-height: 400px; overflow-y: auto;"><table style="width:100%; border-collapse: collapse; font-size: 12px;">
            <tr style="background:#f0f0f0;"><th style="padding:8px;border:1px solid #ddd;">Equipa</th><th style="padding:8px;border:1px solid #ddd;">Produto</th><th style="padding:8px;border:1px solid #ddd;">Período</th><th style="padding:8px;border:1px solid #ddd;">Receita Antiga</th><th style="padding:8px;border:1px solid #ddd;">Receita Nova</th><th style="padding:8px;border:1px solid #ddd;">Lucro Antigo</th><th style="padding:8px;border:1px solid #ddd;">Lucro Novo</th></tr>`;

            changes.forEach(change => {
                const revDiff = change.newRevenue - change.oldRevenue;
                const profDiff = change.newProfit - change.oldProfit;
                summaryHTML += `<tr>
                    <td style="padding:6px;border:1px solid #ddd;">${change.team}</td>
                    <td style="padding:6px;border:1px solid #ddd;">${change.product}</td>
                    <td style="padding:6px;border:1px solid #ddd;">${change.period}</td>
                    <td style="padding:6px;border:1px solid #ddd;">${this.formatCurrency(change.oldRevenue)}</td>
                    <td style="padding:6px;border:1px solid #ddd;">${this.formatCurrency(change.newRevenue)} <span style="color:${revDiff >= 0 ? 'green' : 'red'}">(${revDiff >= 0 ? '+' : ''}${this.formatCurrency(revDiff)})</span></td>
                    <td style="padding:6px;border:1px solid #ddd;">${this.formatCurrency(change.oldProfit)}</td>
                    <td style="padding:6px;border:1px solid #ddd;">${this.formatCurrency(change.newProfit)} <span style="color:${profDiff >= 0 ? 'green' : 'red'}">(${profDiff >= 0 ? '+' : ''}${this.formatCurrency(profDiff)})</span></td>
                </tr>`;
            });

            summaryHTML += '</table></div>';
        }

        // Criar modal de confirmação
        const modal = document.createElement('div');
        modal.className = 'preview-modal';
        modal.innerHTML = `
            <div class="preview-modal-content" style="max-width: 900px;">
                <span class="preview-modal-close" onclick="this.parentElement.parentElement.remove()">&times;</span>
                <h2>🔄 Recalcular Períodos Anteriores</h2>
                ${summaryHTML}
                <div style="margin-top: 20px; text-align: center;">
                    <button onclick="app.confirmRecalculation()" class="btn-success" style="margin-right: 10px;">✅ Aplicar Alterações</button>
                    <button onclick="this.closest('.preview-modal').remove()" class="btn-secondary">❌ Cancelar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Guardar dados temporariamente para confirmação
        this._recalculatedTeamsData = teamsData;
    }

    confirmRecalculation() {
        if (!this._recalculatedTeamsData) {
            alert('Erro: dados de recálculo não encontrados.');
            return;
        }

        // Guardar todos os dados recalculados e atualizar posição financeira
        // (só decisões reais afetam, não o histórico)
        const teamCodes = this.getTeamCodes();
        const initialEquity = 300000;
        const initialLiabilities = 200000;

        teamCodes.forEach(code => {
            const teamData = this._recalculatedTeamsData[code];
            if (teamData) {
                // Calcular lucro apenas das decisões reais (período >= 6, ou seja, Q2 2025+)
                let realDecisionsProfit = 0;
                teamData.products.forEach(product => {
                    product.periods.forEach((period, index) => {
                        // Períodos 1-5 são histórico (índices 0-4), período 6+ são decisões reais
                        if (index >= 5 && period.data && period.data.profit) {
                            realDecisionsProfit += period.data.profit;
                        }
                    });
                });

                // Atualizar posição financeira baseada apenas em decisões reais
                teamData.globalData.equity = initialEquity + realDecisionsProfit;

                if (teamData.globalData.equity < 0) {
                    teamData.globalData.totalLiabilities = initialLiabilities - teamData.globalData.equity;
                } else {
                    teamData.globalData.totalLiabilities = initialLiabilities;
                }

                teamData.globalData.totalAssets = teamData.globalData.equity + teamData.globalData.totalLiabilities;

                this.saveTeamData(code, teamData);
            }
        });

        // Limpar dados temporários
        delete this._recalculatedTeamsData;

        // Fechar modal
        const modal = document.querySelector('.preview-modal');
        if (modal) modal.remove();

        alert('Recálculo aplicado com sucesso! Os dados e posição financeira foram atualizados.');
        this.loadAdminPanel();
    }

    previewSimulation() {
        const simData = this.getSimulationData();
        if (!simData || !simData.initialized) {
            alert('Simulação não inicializada!');
            return;
        }

        const currentPeriod = simData.currentPeriod;
        const teamCodes = this.getTeamCodes();
        const teamsData = this.getAllTeamsData();

        // Verificar se há decisões submetidas
        let hasDecisions = false;
        teamCodes.forEach(code => {
            const teamData = teamsData[code];
            if (teamData && teamData.products[0].periods.some(p => p.period === currentPeriod)) {
                hasDecisions = true;
            }
        });

        if (!hasDecisions) {
            alert('Nenhuma equipa submeteu decisões para este período.');
            return;
        }

        // Recolher todas as decisões
        const allDecisions = this.collectAllDecisions(teamCodes, teamsData, currentPeriod);
        const marketMetrics = this.calculateMarketMetrics(allDecisions);

        // Calcular resultados (sem guardar)
        const previewResults = [];

        teamCodes.forEach(code => {
            const teamData = teamsData[code];
            if (!teamData) return;

            const teamResults = {
                code: code,
                products: []
            };

            teamData.products.forEach(product => {
                const periodIndex = product.periods.findIndex(p => p.period === currentPeriod);
                if (periodIndex === -1) return;

                const periodData = product.periods[periodIndex];
                const previousPeriod = product.periods[periodIndex - 1];

                // Determinar tipo do produto (fallback para equipas existentes sem type)
                const productType = product.type || (product.id === 'produtoA' ? 'premium' : product.id === 'produtoB' ? 'midrange' : 'economic');

                // Calcular resultados
                const result = this.calculateCompetitivePeriodData(
                    previousPeriod,
                    periodData.decisions,
                    periodData.globalDecisions,
                    teamData.globalData,
                    currentPeriod,
                    productType,
                    marketMetrics,
                    allDecisions
                );

                // Adicionar explicações de cálculo
                const explanations = this.generateCalculationExplanations(
                    periodData.decisions,
                    periodData.globalDecisions,
                    previousPeriod,
                    result,
                    productType,
                    marketMetrics,
                    allDecisions,
                    code
                );

                teamResults.products.push({
                    id: product.id,
                    name: product.name,
                    type: productType,
                    decisions: periodData.decisions,
                    globalDecisions: periodData.globalDecisions,
                    result: result,
                    explanations: explanations
                });
            });

            if (teamResults.products.length > 0) {
                previewResults.push(teamResults);
            }
        });

        // Mostrar modal com resultados
        this.showPreviewModal(previewResults, currentPeriod, marketMetrics);
    }

    generateCalculationExplanations(decisions, globalDecisions, previousPeriod, result, productType, marketMetrics, allDecisions, teamCode) {
        const prevData = previousPeriod.data;
        const productIdMap = { 'premium': 'produtoA', 'midrange': 'produtoB', 'economic': 'produtoC' };
        const productId = productIdMap[productType] || 'produtoA';
        const productMetrics = marketMetrics.products[productId];

        // Sazonalidade
        const quarter = this.getQuarterNumber(previousPeriod.period + 1);
        const seasonality = CONFIG.SEASONALITY[quarter][productType];
        const seasonalityNames = { 1: 'Pós-Natal', 2: 'Primavera', 3: 'Verão', 4: 'Natal' };

        // Preço base
        const basePrice = decisions.price * (1 - decisions.discount / 100) * seasonality.price;

        // Vantagem competitiva de preço
        const priceCompetitiveness = productMetrics.avgPrice > 0 ?
            (productMetrics.avgPrice - decisions.price) / productMetrics.avgPrice : 0;
        const priceAdvantage = 1 + (priceCompetitiveness * 0.3);

        // Share of voice
        const numTeams = Object.keys(allDecisions).length;
        const expectedShare = 1 / numTeams;
        const marketingShare = productMetrics.totalMarketing > 0 ?
            decisions.marketingInvestment / productMetrics.totalMarketing : 1;
        const marketingAdvantage = marketingShare / expectedShare;

        // Vantagem de qualidade
        const qualityAdvantage = productMetrics.avgQuality > 0 ?
            1 + ((decisions.qualityInvestment - productMetrics.avgQuality) / productMetrics.avgQuality) * 0.2 : 1;

        return {
            // Métricas de mercado
            marketAvgPrice: productMetrics.avgPrice,
            marketTotalMarketing: productMetrics.totalMarketing,
            marketAvgQuality: productMetrics.avgQuality,
            numTeams: numTeams,

            // Factores competitivos
            seasonality: { ...seasonality, name: seasonalityNames[quarter] },
            basePrice: basePrice,
            priceCompetitiveness: priceCompetitiveness,
            priceAdvantage: priceAdvantage,
            marketingShare: marketingShare,
            expectedShare: expectedShare,
            marketingAdvantage: marketingAdvantage,
            qualityAdvantage: qualityAdvantage,

            // Clientes
            prevCustomers: prevData.customerBase,
            retentionRate: result.retainedCustomers / prevData.customerBase,

            // Custos
            unitVariableCost: result.unitVariableCost,
            fixedCosts: result.fixedCosts
        };
    }

    showPreviewModal(previewResults, currentPeriod, marketMetrics) {
        const quarterLabel = this.getQuarterLabel(currentPeriod);

        let teamsHTML = '';

        previewResults.forEach(team => {
            let productsHTML = '';
            let totalProfit = 0;

            team.products.forEach(product => {
                const r = product.result;
                const e = product.explanations;
                const d = product.decisions;

                totalProfit += r.profit;

                productsHTML += `
                    <div class="preview-product">
                        <h4>${product.name}</h4>

                        <div class="preview-section">
                            <h5>📊 Métricas de Mercado</h5>
                            <div class="explanation-grid">
                                <div class="exp-item">
                                    <span>Preço Médio do Mercado</span>
                                    <strong>${this.formatCurrency(e.marketAvgPrice)}</strong>
                                    <small>Média dos preços de todas as ${e.numTeams} equipas</small>
                                </div>
                                <div class="exp-item">
                                    <span>Marketing Total do Mercado</span>
                                    <strong>${this.formatCurrency(e.marketTotalMarketing)}</strong>
                                    <small>Soma do marketing de todas as equipas</small>
                                </div>
                                <div class="exp-item">
                                    <span>Qualidade Média do Mercado</span>
                                    <strong>${this.formatCurrency(e.marketAvgQuality)}</strong>
                                    <small>Média do investimento em qualidade</small>
                                </div>
                            </div>
                        </div>

                        <div class="preview-section">
                            <h5>⚡ Factores Competitivos</h5>
                            <div class="explanation-grid">
                                <div class="exp-item">
                                    <span>Sazonalidade (${e.seasonality.name})</span>
                                    <strong>${(e.seasonality.demand * 100).toFixed(0)}% procura</strong>
                                    <small>Afecta vendas: ×${e.seasonality.demand}, preço: ×${e.seasonality.price}</small>
                                </div>
                                <div class="exp-item">
                                    <span>Preço Base (com desconto e sazonalidade)</span>
                                    <strong>${this.formatCurrency(e.basePrice)}</strong>
                                    <small>${this.formatCurrency(d.price)} × (1 - ${d.discount}%) × ${e.seasonality.price}</small>
                                </div>
                                <div class="exp-item ${e.priceAdvantage >= 1 ? 'positive' : 'negative'}">
                                    <span>Vantagem de Preço</span>
                                    <strong>×${e.priceAdvantage.toFixed(3)}</strong>
                                    <small>Preço ${d.price < e.marketAvgPrice ? 'abaixo' : 'acima'} da média (${((e.priceCompetitiveness) * 100).toFixed(1)}%)</small>
                                </div>
                                <div class="exp-item ${e.marketingAdvantage >= 1 ? 'positive' : 'negative'}">
                                    <span>Vantagem de Marketing (Share of Voice)</span>
                                    <strong>×${e.marketingAdvantage.toFixed(3)}</strong>
                                    <small>Share: ${(e.marketingShare * 100).toFixed(1)}% vs esperado ${(e.expectedShare * 100).toFixed(1)}%</small>
                                </div>
                                <div class="exp-item ${e.qualityAdvantage >= 1 ? 'positive' : 'negative'}">
                                    <span>Vantagem de Qualidade</span>
                                    <strong>×${e.qualityAdvantage.toFixed(3)}</strong>
                                    <small>Investimento ${d.qualityInvestment > e.marketAvgQuality ? 'acima' : 'abaixo'} da média</small>
                                </div>
                            </div>
                        </div>

                        <div class="preview-section">
                            <h5>👥 Clientes</h5>
                            <div class="explanation-grid">
                                <div class="exp-item">
                                    <span>Clientes Anteriores</span>
                                    <strong>${e.prevCustomers.toLocaleString('pt-PT')}</strong>
                                </div>
                                <div class="exp-item">
                                    <span>Taxa de Retenção</span>
                                    <strong>${(e.retentionRate * 100).toFixed(1)}%</strong>
                                    <small>Retidos: ${r.retainedCustomers.toLocaleString('pt-PT')}</small>
                                </div>
                                <div class="exp-item">
                                    <span>Novos Clientes</span>
                                    <strong>${r.newCustomers.toLocaleString('pt-PT')}</strong>
                                    <small>Via publicidade e crescimento orgânico</small>
                                </div>
                                <div class="exp-item">
                                    <span>Clientes Perdidos</span>
                                    <strong>${r.lostCustomers.toLocaleString('pt-PT')}</strong>
                                </div>
                                <div class="exp-item highlight">
                                    <span>Base Final de Clientes</span>
                                    <strong>${r.customerBase.toLocaleString('pt-PT')}</strong>
                                </div>
                            </div>
                        </div>

                        <div class="preview-section">
                            <h5>💰 Resultados Financeiros</h5>
                            <div class="explanation-grid">
                                <div class="exp-item">
                                    <span>Unidades Vendidas</span>
                                    <strong>${r.unitsSold.toLocaleString('pt-PT')}</strong>
                                </div>
                                <div class="exp-item">
                                    <span>Receita</span>
                                    <strong>${this.formatCurrency(r.revenue)}</strong>
                                    <small>${r.unitsSold.toLocaleString('pt-PT')} × preço médio por canal</small>
                                </div>
                                <div class="exp-item">
                                    <span>Custos Variáveis</span>
                                    <strong>${this.formatCurrency(r.variableCosts)}</strong>
                                    <small>${r.unitsSold.toLocaleString('pt-PT')} × ${this.formatCurrency(e.unitVariableCost)}</small>
                                </div>
                                <div class="exp-item">
                                    <span>Custos Fixos</span>
                                    <strong>${this.formatCurrency(e.fixedCosts)}</strong>
                                </div>
                                <div class="exp-item">
                                    <span>Custos Distribuição</span>
                                    <strong>${this.formatCurrency(r.distributionCosts)}</strong>
                                </div>
                                <div class="exp-item">
                                    <span>Comissões (${d.salesCommission}%)</span>
                                    <strong>${this.formatCurrency(r.salesCommissions)}</strong>
                                </div>
                                <div class="exp-item">
                                    <span>Marketing + Qualidade</span>
                                    <strong>${this.formatCurrency(r.marketingCost + r.qualityCost)}</strong>
                                </div>
                                <div class="exp-item highlight ${r.profit >= 0 ? 'positive' : 'negative'}">
                                    <span>Lucro</span>
                                    <strong>${this.formatCurrency(r.profit)}</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });

            teamsHTML += `
                <div class="preview-team">
                    <div class="preview-team-header">
                        <h3>${team.code}</h3>
                        <span class="team-total-profit ${totalProfit >= 0 ? 'positive' : 'negative'}">
                            Lucro Total: ${this.formatCurrency(totalProfit)}
                        </span>
                    </div>
                    ${productsHTML}
                </div>
            `;
        });

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal preview-modal">
                <div class="modal-header">
                    <h2>🔍 Pré-visualização da Simulação - ${quarterLabel}</h2>
                    <button onclick="this.closest('.modal-overlay').remove()" class="modal-close">✕</button>
                </div>
                <div class="modal-body">
                    <div class="preview-notice">
                        <strong>⚠️ Esta é apenas uma pré-visualização.</strong>
                        Os resultados NÃO foram guardados. Para publicar os resultados para os alunos, clique em "Correr Simulação".
                    </div>
                    ${teamsHTML}
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    runSimulation() {
        const simData = this.getSimulationData();
        if (!simData || !simData.initialized) {
            alert('Simulação não inicializada!');
            return;
        }

        const currentPeriod = simData.currentPeriod;
        const teamCodes = this.getTeamCodes();
        const teamsData = this.getAllTeamsData();

        // Verificar se todas as equipas submeteram
        let allSubmitted = true;
        let pendingTeams = [];

        teamCodes.forEach(code => {
            const teamData = teamsData[code];
            if (!teamData) return;

            const hasSubmitted = teamData.products[0].periods.some(p => p.period === currentPeriod);
            if (!hasSubmitted) {
                allSubmitted = false;
                pendingTeams.push(code);
            }
        });

        if (!allSubmitted) {
            const proceed = confirm(`Atenção: ${pendingTeams.length} equipa(s) ainda não submeteram decisões.\n\nAs decisões do período anterior serão usadas automaticamente.\n\nEquipas pendentes: ${pendingTeams.join(', ')}\n\nDeseja continuar?`);
            if (!proceed) return;

            // Criar submissões automáticas para equipas que não submeteram
            pendingTeams.forEach(code => {
                const teamData = teamsData[code];
                if (!teamData) return;

                teamData.products.forEach(product => {
                    // Encontrar último período com decisões
                    const lastPeriod = product.periods[product.periods.length - 1];

                    // Criar novo período com as mesmas decisões do anterior
                    const newPeriod = {
                        period: currentPeriod,
                        decisions: JSON.parse(JSON.stringify(lastPeriod.decisions)),
                        globalDecisions: JSON.parse(JSON.stringify(lastPeriod.globalDecisions)),
                        data: null,
                        submittedAt: new Date().toISOString(),
                        status: 'pending',
                        autoSubmitted: true // Marcar como submissão automática
                    };

                    product.periods.push(newPeriod);
                });

                this.saveTeamData(code, teamData);
            });

            // Recarregar dados após criar submissões automáticas
            Object.assign(teamsData, this.getAllTeamsData());
        }

        // Recolher todas as decisões para calcular efeitos competitivos
        const allDecisions = this.collectAllDecisions(teamCodes, teamsData, currentPeriod);

        // Calcular métricas de mercado (médias, totais) para efeitos competitivos
        const marketMetrics = this.calculateMarketMetrics(allDecisions);

        // Calcular resultados para cada equipa considerando a competição
        teamCodes.forEach(code => {
            const teamData = teamsData[code];
            if (!teamData) return;

            let periodTotalProfit = 0; // Lucro total deste período (soma dos 3 produtos)

            // Verificar se tem decisões pendentes para este período
            teamData.products.forEach(product => {
                const periodIndex = product.periods.findIndex(p => p.period === currentPeriod);
                if (periodIndex === -1) return; // Não submeteu

                const periodData = product.periods[periodIndex];
                if (periodData.data !== null && periodData.status !== 'pending') return; // Já calculado

                const previousPeriod = product.periods[periodIndex - 1];

                // Determinar tipo do produto (fallback para equipas existentes sem type)
                const productType = product.type || (product.id === 'produtoA' ? 'premium' : product.id === 'produtoB' ? 'midrange' : 'economic');

                // Calcular resultados considerando a competição
                const newPeriodData = this.calculateCompetitivePeriodData(
                    previousPeriod,
                    periodData.decisions,
                    periodData.globalDecisions,
                    teamData.globalData,
                    currentPeriod,
                    productType,
                    marketMetrics,
                    allDecisions
                );

                // Atualizar com os resultados calculados
                periodData.data = newPeriodData;
                periodData.status = 'simulated';
                periodData.simulatedAt = new Date().toISOString();

                // Somar lucro deste produto ao total do período
                periodTotalProfit += newPeriodData.profit;
            });

            // Atualizar posição financeira com base no lucro líquido
            const initialLiabilities = 200000; // Passivo inicial fixo

            // Capitais próprios = valor anterior + lucro do período
            teamData.globalData.equity += periodTotalProfit;

            // Equação contabilística: Ativo = Capitais Próprios + Passivo
            if (teamData.globalData.equity < 0) {
                // Se capitais próprios negativos, passivo aumenta para cobrir (empresa endivida-se)
                teamData.globalData.totalLiabilities = initialLiabilities - teamData.globalData.equity;
            } else {
                // Passivo mantém-se no valor inicial
                teamData.globalData.totalLiabilities = initialLiabilities;
            }

            // Ativo = Capitais Próprios + Passivo
            teamData.globalData.totalAssets = teamData.globalData.equity + teamData.globalData.totalLiabilities;

            this.saveTeamData(code, teamData);
        });

        alert(`Simulação do ${this.getQuarterLabel(currentPeriod)} concluída!\n\nOs resultados estão agora disponíveis para todas as equipas.`);
        this.loadAdminPanel();
    }

    collectAllDecisions(teamCodes, teamsData, period) {
        const allDecisions = {};

        teamCodes.forEach(code => {
            const teamData = teamsData[code];
            if (!teamData) return;

            allDecisions[code] = {
                products: {}
            };

            teamData.products.forEach(product => {
                const periodData = product.periods.find(p => p.period === period);
                if (periodData) {
                    allDecisions[code].products[product.id] = {
                        decisions: periodData.decisions,
                        globalDecisions: periodData.globalDecisions
                    };
                }
            });
        });

        return allDecisions;
    }

    calculateMarketMetrics(allDecisions) {
        const metrics = {
            products: {}
        };

        // Inicializar métricas por produto
        CONFIG.PRODUCTS.forEach(product => {
            metrics.products[product.id] = {
                avgPrice: 0,
                avgMarketing: 0,
                avgQuality: 0,
                avgDiscount: 0,
                totalMarketing: 0,
                teamCount: 0,
                priceRange: { min: Infinity, max: 0 },
                marketingRange: { min: Infinity, max: 0 }
            };
        });

        // Calcular totais e médias
        Object.values(allDecisions).forEach(teamDecisions => {
            Object.entries(teamDecisions.products).forEach(([productId, data]) => {
                const d = data.decisions;
                const m = metrics.products[productId];

                m.avgPrice += d.price;
                m.avgMarketing += d.marketingInvestment;
                m.avgQuality += d.qualityInvestment;
                m.avgDiscount += d.discount;
                m.totalMarketing += d.marketingInvestment;
                m.teamCount++;

                m.priceRange.min = Math.min(m.priceRange.min, d.price);
                m.priceRange.max = Math.max(m.priceRange.max, d.price);
                m.marketingRange.min = Math.min(m.marketingRange.min, d.marketingInvestment);
                m.marketingRange.max = Math.max(m.marketingRange.max, d.marketingInvestment);
            });
        });

        // Calcular médias
        Object.values(metrics.products).forEach(m => {
            if (m.teamCount > 0) {
                m.avgPrice /= m.teamCount;
                m.avgMarketing /= m.teamCount;
                m.avgQuality /= m.teamCount;
                m.avgDiscount /= m.teamCount;
            }
        });

        return metrics;
    }

    calculateCompetitivePeriodData(previousPeriod, decisions, globalDecisions, globalData, periodNum, productType, marketMetrics, allDecisions) {
        const prevData = previousPeriod.data;
        const prevCustomers = prevData.customerBase;

        // === SAZONALIDADE ===
        const seasonality = this.getSeasonalityFactors(periodNum, productType);

        // === MÉTRICAS DE MERCADO PARA ESTE PRODUTO ===
        // Mapear type para id do produto
        const productIdMap = { 'premium': 'produtoA', 'midrange': 'produtoB', 'economic': 'produtoC' };
        const productId = productIdMap[productType] || 'produtoA';
        const productMetrics = marketMetrics.products[productId] ||
                              { avgPrice: decisions.price, avgMarketing: decisions.marketingInvestment, avgQuality: decisions.qualityInvestment, totalMarketing: decisions.marketingInvestment, teamCount: 1 };

        // === EFEITOS COMPETITIVOS ===
        // Posição de preço relativa ao mercado (abaixo da média = vantagem)
        const priceCompetitiveness = productMetrics.avgPrice > 0 ?
            (productMetrics.avgPrice - decisions.price) / productMetrics.avgPrice : 0;
        const priceAdvantage = 1 + (priceCompetitiveness * 0.3); // Até 30% mais/menos clientes

        // Quota de marketing (share of voice)
        const marketingShare = productMetrics.totalMarketing > 0 ?
            decisions.marketingInvestment / productMetrics.totalMarketing : 1;
        const expectedShare = 1 / Math.max(productMetrics.teamCount, 1);
        const marketingAdvantage = marketingShare / expectedShare; // >1 = acima da média

        // Vantagem de qualidade
        const qualityAdvantage = productMetrics.avgQuality > 0 ?
            1 + ((decisions.qualityInvestment - productMetrics.avgQuality) / productMetrics.avgQuality) * 0.2 : 1;

        // === CANAIS DE PUBLICIDADE - Calcular clientes por canal ===
        const adChannelPerformance = {};
        let totalNewCustomers = 0;

        Object.keys(CONFIG.AD_CHANNELS).forEach(channelId => {
            const channel = CONFIG.AD_CHANNELS[channelId];
            const channelPercentage = decisions.adChannels[channelId] / 100;
            const channelInvestment = decisions.marketingInvestment * channelPercentage;

            // Eficiência base do canal para este tipo de produto
            const efficiency = channel.efficiency[productType] || 0.05;

            // Clientes adquiridos = investimento × eficiência × sazonalidade × vantagem competitiva
            const baseNewCustomers = channelInvestment * efficiency * seasonality.demand;
            const competitiveNewCustomers = baseNewCustomers * priceAdvantage * Math.sqrt(marketingAdvantage);

            const newCustomers = Math.round(competitiveNewCustomers);
            totalNewCustomers += newCustomers;

            adChannelPerformance[channelId] = {
                investment: Math.round(channelInvestment * 100) / 100,
                customersAcquired: newCustomers,
                cac: newCustomers > 0 ? Math.round((channelInvestment / newCustomers) * 100) / 100 : 0
            };
        });

        // === RETENÇÃO ===
        const baseChurnRate = 0.06;
        const retentionBonus = globalDecisions.retentionInvestment / 50000;
        const serviceBonus = globalDecisions.customerService / 20000;
        const qualityBonus = decisions.qualityInvestment / 40000;

        // Churn afetado pela competição (preços mais altos = mais churn)
        const competitiveChurn = priceCompetitiveness < 0 ? Math.abs(priceCompetitiveness) * 0.02 : 0;

        const adjustedChurnRate = Math.max(0.02, baseChurnRate * seasonality.churn - retentionBonus * 0.3 - serviceBonus * 0.2 - qualityBonus * 0.15 + competitiveChurn);
        const lostCustomers = Math.round(prevCustomers * adjustedChurnRate);

        const customerBase = prevCustomers + totalNewCustomers - lostCustomers;
        const retainedCustomers = prevCustomers - lostCustomers;

        // === VENDAS BASE ===
        const basePrice = decisions.price * (1 - decisions.discount / 100) * seasonality.price;
        const priceImpact = Math.max(0.7, 1 - (decisions.discount / 100) * 0.5);
        const qualityImpact = 1 + (decisions.qualityInvestment / 40000) * 0.15;
        const brandImpact = 1 + (globalDecisions.brandInvestment / 50000) * 0.1;

        // Vendas afetadas pela competição
        const competitiveSalesBonus = priceAdvantage * qualityAdvantage;
        const baseUnitsSold = Math.round(customerBase * priceImpact * qualityImpact * brandImpact * seasonality.demand * competitiveSalesBonus);

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

            // Preço efectivo com margem do canal
            const effectivePrice = basePrice * channel.marginMultiplier;

            // Receita do canal
            const channelRevenue = unitsInChannel * effectivePrice;

            // Margem ajustada pelo canal (retalhistas ficam com parte)
            const baseCost = productType === 'premium' ? 45 : productType === 'midrange' ? 35 : 25;
            const channelMargin = (effectivePrice - baseCost) * channel.marginMultiplier;

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
                marginMultiplier: channel.marginMultiplier
            };
        });

        // === CUSTOS FINAIS ===
        const processEfficiency = Math.min(globalDecisions.processImprovement / 30000, 1);
        const costReduction = 1 - (processEfficiency * 0.25);

        const baseCost = productType === 'premium' ? 45 : productType === 'midrange' ? 35 : 25;
        const unitVariableCost = baseCost * costReduction;
        const variableCosts = totalUnitsSold * unitVariableCost;
        const fixedCosts = productType === 'premium' ? 60000 : productType === 'midrange' ? 55000 : 50000;
        const salesCommissions = totalRevenue * (decisions.salesCommission / 100);

        const totalCosts = variableCosts + fixedCosts + salesCommissions + totalDistributionCosts;
        // Investimentos globais divididos por 3 produtos
        const globalInvestmentsShare = (globalDecisions.retentionInvestment + globalDecisions.brandInvestment +
                                globalDecisions.customerService + globalDecisions.processImprovement) / 3;
        const totalInvestments = decisions.marketingInvestment + decisions.qualityInvestment + globalInvestmentsShare;

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
            marketingCost: decisions.marketingInvestment,
            qualityCost: decisions.qualityInvestment,
            salesCommissions: Math.round(salesCommissions * 100) / 100,

            // Resultados
            margem: Math.round(weightedMargin * 100) / 100,
            profit: Math.round(profit * 100) / 100,

            // Performance por canal
            adChannelPerformance: adChannelPerformance,
            distributionPerformance: distributionPerformance,

            // Métricas competitivas (para análise)
            competitiveMetrics: {
                priceAdvantage: Math.round(priceAdvantage * 100) / 100,
                marketingShare: Math.round(marketingShare * 100) / 100,
                qualityAdvantage: Math.round(qualityAdvantage * 100) / 100
            }
        };
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

            // Preço efectivo com margem do canal
            const effectivePrice = basePrice * channel.marginMultiplier;
            const channelRevenue = unitsInChannel * effectivePrice;
            const baseCost = productType === 'premium' ? 45 : productType === 'midrange' ? 35 : 25;
            const channelMargin = (effectivePrice - baseCost) * channel.marginMultiplier;

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
                marginMultiplier: channel.marginMultiplier
            };
        });

        // === CUSTOS FINAIS ===
        const processEfficiency = Math.min(globalDecisions.processImprovement / 30000, 1);
        const costReduction = 1 - (processEfficiency * 0.25);
        const baseProductCost = productType === 'premium' ? 45 : productType === 'midrange' ? 35 : 25;
        const unitVariableCost = baseProductCost * costReduction;
        const variableCosts = totalUnitsSold * unitVariableCost;

        const fixedCosts = prevData.fixedCosts || 45000;
        const salesCommissions = totalRevenue * (decisions.salesCommission / 100);

        const totalCosts = variableCosts + fixedCosts + salesCommissions + totalDistributionCosts;
        // Investimentos globais divididos por 3 produtos
        const globalInvestmentsShare = (globalDecisions.retentionInvestment + globalDecisions.brandInvestment +
                                globalDecisions.customerService + globalDecisions.processImprovement) / 3;
        const totalInvestments = decisions.marketingInvestment + decisions.qualityInvestment + globalInvestmentsShare;

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
        const simData = this.getSimulationData();

        // Mostrar dados de cada produto
        const productsContainer = document.getElementById('productsDataContainer');
        productsContainer.innerHTML = '';

        let totalRevenue = 0;
        let totalCustomers = 0;
        let totalProfit = 0;

        // Verificar se há resultados pendentes (a aguardar simulação)
        let hasPendingResults = false;

        teamData.products.forEach(product => {
            const latestPeriod = product.periods[product.periods.length - 1];
            const data = latestPeriod.data;

            // Se data é null, significa que os resultados ainda não foram calculados
            if (data === null || latestPeriod.status === 'pending') {
                hasPendingResults = true;

                // Mostrar o período anterior (último com dados)
                const previousPeriod = product.periods[product.periods.length - 2];
                if (previousPeriod && previousPeriod.data) {
                    const prevData = previousPeriod.data;
                    totalRevenue += prevData.revenue;
                    totalCustomers += prevData.customerBase;
                    totalProfit += prevData.profit;

                    const productCard = document.createElement('div');
                    productCard.className = 'product-summary-card pending-results';
                    productCard.innerHTML = `
                        <h3>${product.name}</h3>
                        <div class="pending-notice">
                            <span class="pending-icon">⏳</span>
                            <p>Decisões submetidas para o ${this.getQuarterLabel(simData.currentPeriod)}</p>
                            <p class="pending-text">A aguardar simulação do professor</p>
                        </div>
                        <div class="product-stats previous-period">
                            <p class="previous-label">Dados do ${this.getQuarterLabel(latestPeriod.period - 1)}:</p>
                            <div class="stat-item">
                                <span>Receita</span>
                                <strong>${this.formatCurrency(prevData.revenue)}</strong>
                            </div>
                            <div class="stat-item">
                                <span>Clientes</span>
                                <strong>${prevData.customerBase.toLocaleString('pt-PT')}</strong>
                            </div>
                            <div class="stat-item">
                                <span>Lucro</span>
                                <strong>${this.formatCurrency(prevData.profit)}</strong>
                            </div>
                        </div>
                        <button onclick="app.showSubmittedDecisions('${product.id}')" class="btn-secondary">Ver Decisões Submetidas</button>
                    `;
                    productsContainer.appendChild(productCard);
                }
            } else {
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
                            <strong>${this.formatCurrency(latestPeriod.decisions.price)}</strong>
                        </div>
                    </div>
                    <button onclick="app.showProductDetails('${product.id}')" class="btn-secondary">Ver Detalhes</button>
                `;
                productsContainer.appendChild(productCard);
            }
        });

        // Totais da empresa
        document.getElementById('totalRevenue').textContent = this.formatCurrency(totalRevenue);
        document.getElementById('totalCustomers').textContent = totalCustomers.toLocaleString('pt-PT');
        document.getElementById('totalProfit').textContent = this.formatCurrency(totalProfit);

        // Balanço
        document.getElementById('totalAssets').textContent = this.formatCurrency(teamData.globalData.totalAssets);
        document.getElementById('equity').textContent = this.formatCurrency(teamData.globalData.equity);
        document.getElementById('totalLiabilities').textContent = this.formatCurrency(teamData.globalData.totalLiabilities);

        // Mostrar aviso se há resultados pendentes
        if (hasPendingResults) {
            const periodLabel = this.getQuarterLabel(simData.currentPeriod);
            const notice = document.createElement('div');
            notice.className = 'pending-simulation-notice';
            notice.innerHTML = `
                <div class="notice-content">
                    <span class="notice-icon">📊</span>
                    <div>
                        <strong>Decisões submetidas para o ${periodLabel}</strong>
                        <p>Os resultados estarão disponíveis após o professor correr a simulação do trimestre.</p>
                    </div>
                </div>
            `;
            productsContainer.insertBefore(notice, productsContainer.firstChild);
        }
    }

    showSubmittedDecisions(productId) {
        const teamData = this.getTeamData(this.currentUser);
        const product = teamData.products.find(p => p.id === productId);
        const latestPeriod = product.periods[product.periods.length - 1];
        const d = latestPeriod.decisions;
        const g = latestPeriod.globalDecisions;

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${product.name} - Decisões Submetidas</h2>
                    <button onclick="this.closest('.modal-overlay').remove()" class="btn-ghost">✕</button>
                </div>
                <div class="modal-body">
                    <div class="pending-notice-modal">
                        <span class="pending-icon">⏳</span>
                        <p>A aguardar simulação do trimestre</p>
                    </div>
                    <div class="data-grid">
                        <div class="data-card">
                            <h3>Decisões de Produto</h3>
                            <div class="data-row"><span>Preço de Venda</span><strong>${this.formatCurrency(d.price)}</strong></div>
                            <div class="data-row"><span>Desconto</span><strong>${d.discount}%</strong></div>
                            <div class="data-row"><span>Marketing</span><strong>${this.formatCurrency(d.marketingInvestment)}</strong></div>
                            <div class="data-row"><span>Qualidade</span><strong>${this.formatCurrency(d.qualityInvestment)}</strong></div>
                            <div class="data-row"><span>Comissões</span><strong>${d.salesCommission}%</strong></div>
                        </div>
                        <div class="data-card">
                            <h3>Decisões Globais</h3>
                            <div class="data-row"><span>Fidelização</span><strong>${this.formatCurrency(g.retentionInvestment)}</strong></div>
                            <div class="data-row"><span>Marca</span><strong>${this.formatCurrency(g.brandInvestment)}</strong></div>
                            <div class="data-row"><span>Serviço Cliente</span><strong>${this.formatCurrency(g.customerService)}</strong></div>
                            <div class="data-row"><span>Processos</span><strong>${this.formatCurrency(g.processImprovement)}</strong></div>
                            <div class="data-row"><span>Prazo Crédito</span><strong>${g.creditDays} dias</strong></div>
                        </div>
                        <div class="data-card">
                            <h3>Canais de Publicidade</h3>
                            <div class="data-row"><span>Google Ads</span><strong>${d.adChannels.googleAds}%</strong></div>
                            <div class="data-row"><span>Facebook</span><strong>${d.adChannels.facebook}%</strong></div>
                            <div class="data-row"><span>Instagram</span><strong>${d.adChannels.instagram}%</strong></div>
                            <div class="data-row"><span>Email</span><strong>${d.adChannels.email}%</strong></div>
                            <div class="data-row"><span>Rádio/TV</span><strong>${d.adChannels.radio}%</strong></div>
                        </div>
                        <div class="data-card">
                            <h3>Canais de Distribuição</h3>
                            <div class="data-row"><span>Lojas Próprias</span><strong>${d.distributionChannels.ownStores}%</strong></div>
                            <div class="data-row"><span>Retalhistas</span><strong>${d.distributionChannels.retailers}%</strong></div>
                            <div class="data-row"><span>E-commerce</span><strong>${d.distributionChannels.ecommerce}%</strong></div>
                            <div class="data-row"><span>Grossistas</span><strong>${d.distributionChannels.wholesalers}%</strong></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    showProductDetails(productId) {
        const teamData = this.getTeamData(this.currentUser);
        const product = teamData.products.find(p => p.id === productId);
        const latestPeriod = product.periods[product.periods.length - 1];
        const data = latestPeriod.data;
        const globalDec = latestPeriod.globalDecisions;

        // Investimentos globais divididos por 3 produtos
        const globalInvestmentsShare = (globalDec.retentionInvestment + globalDec.brandInvestment + globalDec.customerService + globalDec.processImprovement) / 3;

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
                            <div class="data-row"><span>Preço Unitário</span><strong>${this.formatCurrency(latestPeriod.decisions.price)}</strong></div>
                            <div class="data-row"><span>Desconto</span><strong>${data.appliedDiscount}%</strong></div>
                        </div>
                        <div class="data-card">
                            <h3>Custos</h3>
                            <div class="data-row"><span>Custos Variáveis</span><strong>${this.formatCurrency(data.variableCosts)}</strong></div>
                            <div class="data-row"><span>Custo Var. Unit.</span><strong>${this.formatCurrency(data.unitVariableCost)}</strong></div>
                            <div class="data-row"><span>Custos Fixos Produção</span><strong>${this.formatCurrency(data.fixedCosts)}</strong></div>
                            <div class="data-row"><span>Custos Distribuição</span><strong>${this.formatCurrency(data.distributionCosts)}</strong></div>
                            <div class="data-row"><span>Comissões</span><strong>${this.formatCurrency(data.salesCommissions)}</strong></div>
                        </div>
                        <div class="data-card">
                            <h3>Investimentos</h3>
                            <div class="data-row"><span>Marketing</span><strong>${this.formatCurrency(data.marketingCost)}</strong></div>
                            <div class="data-row"><span>Qualidade</span><strong>${this.formatCurrency(data.qualityCost)}</strong></div>
                        </div>
                        <div class="data-card">
                            <h3>Cálculo do Lucro</h3>
                            <div class="data-row"><span>Receita</span><strong>${this.formatCurrency(data.revenue)}</strong></div>
                            <div class="data-row"><span>− Custos Variáveis</span><strong>${this.formatCurrency(data.variableCosts)}</strong></div>
                            <div class="data-row"><span>− Custos Fixos</span><strong>${this.formatCurrency(data.fixedCosts)}</strong></div>
                            <div class="data-row"><span>− Custos Distribuição</span><strong>${this.formatCurrency(data.distributionCosts)}</strong></div>
                            <div class="data-row"><span>− Comissões</span><strong>${this.formatCurrency(data.salesCommissions)}</strong></div>
                            <div class="data-row"><span>− Marketing</span><strong>${this.formatCurrency(data.marketingCost)}</strong></div>
                            <div class="data-row"><span>− Qualidade</span><strong>${this.formatCurrency(data.qualityCost)}</strong></div>
                            <div class="data-row"><span>− Invest. Globais (1/3)</span><strong>${this.formatCurrency(globalInvestmentsShare)}</strong></div>
                            <div class="data-row" style="border-top: 2px solid #e5e7eb; padding-top: 8px; margin-top: 8px;"><span><strong>= Lucro</strong></span><strong style="color: ${data.profit >= 0 ? '#10b981' : '#ef4444'}">${this.formatCurrency(data.profit)}</strong></div>
                        </div>
                        <div class="data-card">
                            <h3>📊 Estimativa Break-Even</h3>
                            <p style="font-size: 11px; color: #6b7280; margin-bottom: 12px;">Valores pré-calculados para facilitar a estimativa do ponto de equilíbrio.</p>
                            <div class="data-row"><span>Custos Fixos Totais</span><strong>${this.formatCurrency(data.fixedCosts + data.marketingCost + data.qualityCost + globalInvestmentsShare)}</strong></div>
                            <div class="data-row" style="font-size: 10px; color: #6b7280;"><span>(Produção + Marketing + Qualidade + Invest. Globais)</span></div>
                            <div class="data-row"><span>Custo Var. Unit. Total</span><strong>${this.formatCurrency((data.variableCosts + data.distributionCosts + data.salesCommissions) / data.unitsSold)}</strong></div>
                            <div class="data-row" style="font-size: 10px; color: #6b7280;"><span>(Produção + Distribuição + Comissões)</span></div>
                            <div class="data-row"><span>Preço Médio de Venda</span><strong>${this.formatCurrency(data.revenue / data.unitsSold)}</strong></div>
                            <div class="data-row"><span>Margem de Contribuição Unitária</span><strong>${this.formatCurrency((data.revenue / data.unitsSold) - ((data.variableCosts + data.distributionCosts + data.salesCommissions) / data.unitsSold))}</strong></div>
                            <div class="data-row" style="border-top: 2px solid #e5e7eb; padding-top: 8px; margin-top: 8px;"><span><strong>BEP = CF ÷ MC</strong></span><strong>${Math.ceil((data.fixedCosts + data.marketingCost + data.qualityCost + globalInvestmentsShare) / ((data.revenue / data.unitsSold) - ((data.variableCosts + data.distributionCosts + data.salesCommissions) / data.unitsSold))).toLocaleString('pt-PT')} unid.</strong></div>
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

            // Limpar todos os campos (não preencher valores para não influenciar decisões)
            form.reset();
        }
    }

    loadMarketData() {
        const allTeams = this.getAllTeamsData();
        const simData = this.getSimulationData();

        const tbody = document.getElementById('marketTableBody');
        tbody.innerHTML = '';

        const teamCodes = this.getTeamCodes();
        let totalMarketRevenue = 0;
        let totalMarketCustomers = 0;
        let yourRevenue = 0;
        let yourProfit = 0;
        let yourCustomers = 0;
        let yourAccumulatedProfit = 0;

        // Dados para o gráfico: { teamName: [lucro_T1, lucro_T2, ...] }
        const profitEvolution = {};

        // Encontrar o último período com dados simulados (não pendentes)
        let lastSimulatedPeriod = 0;
        teamCodes.forEach(code => {
            const team = allTeams[code];
            if (!team) return;
            team.products.forEach(product => {
                product.periods.forEach(p => {
                    if (p.data !== null && p.status !== 'pending' && p.period > lastSimulatedPeriod) {
                        lastSimulatedPeriod = p.period;
                    }
                });
            });
        });

        const currentPeriod = lastSimulatedPeriod || simData.currentPeriod - 1;
        const periodsCount = allTeams[teamCodes[0]]?.products[0]?.periods.filter(p => p.data !== null).length || 0;

        // Recolher dados de todas as equipas
        const teamsData = [];

        teamCodes.forEach(code => {
            const team = allTeams[code];
            if (!team) return;

            let teamRevenue = 0;
            let teamProfit = 0;
            let teamCustomers = 0;

            team.products.forEach(product => {
                // Encontrar o último período com dados (não pendente)
                const period = product.periods.filter(p => p.data !== null && p.status !== 'pending').pop();
                if (period && period.data) {
                    teamRevenue += period.data.revenue;
                    teamProfit += period.data.profit;
                    teamCustomers += period.data.customerBase;
                }
            });

            // Calcular lucro acumulado e dados para gráfico
            profitEvolution[team.name] = [];
            let teamAccumulatedProfit = 0;
            for (let p = 0; p < team.products[0].periods.length; p++) {
                const periodData = team.products[0].periods[p];
                // Só incluir períodos com dados calculados
                if (periodData.data === null || periodData.status === 'pending') continue;

                let periodProfit = 0;
                team.products.forEach(product => {
                    if (product.periods[p] && product.periods[p].data) {
                        periodProfit += product.periods[p].data.profit;
                    }
                });
                profitEvolution[team.name].push(periodProfit);
                teamAccumulatedProfit += periodProfit;
            }

            // Guardar dados da equipa
            teamsData.push({
                code,
                team,
                teamRevenue,
                teamProfit,
                teamCustomers,
                teamAccumulatedProfit
            });

            totalMarketRevenue += teamRevenue;
            totalMarketCustomers += teamCustomers;
        });

        // Ordenar por lucro acumulado (maior para menor)
        teamsData.sort((a, b) => b.teamAccumulatedProfit - a.teamAccumulatedProfit);

        // Renderizar tabela ordenada
        teamsData.forEach(({ code, team, teamRevenue, teamProfit, teamCustomers, teamAccumulatedProfit }) => {
            const row = document.createElement('tr');
            if (code === this.currentUser) {
                row.classList.add('highlight');
                yourRevenue = teamRevenue;
                yourProfit = teamProfit;
                yourCustomers = teamCustomers;
                yourAccumulatedProfit = teamAccumulatedProfit;
            }

            row.innerHTML = `
                <td>${team.name}</td>
                <td>${this.formatCurrency(teamRevenue)}</td>
                <td style="${teamProfit >= 0 ? 'color: #10b981;' : 'color: #ef4444;'} font-weight: 600;">${this.formatCurrency(teamProfit)}</td>
                <td>${teamCustomers.toLocaleString('pt-PT')}</td>
                <td style="${teamAccumulatedProfit >= 0 ? 'color: #10b981;' : 'color: #ef4444;'} font-weight: 700; font-size: 15px;">${this.formatCurrency(teamAccumulatedProfit)}</td>
            `;
            tbody.appendChild(row);
        });

        document.getElementById('totalMarket').textContent = this.formatCurrency(totalMarketRevenue);
        document.getElementById('totalMarketCustomers').textContent = totalMarketCustomers.toLocaleString('pt-PT');
        document.getElementById('yourRevenue').textContent = this.formatCurrency(yourRevenue);
        document.getElementById('yourProfit').textContent = this.formatCurrency(yourProfit);
        document.getElementById('yourCustomers').textContent = yourCustomers.toLocaleString('pt-PT');
        document.getElementById('accumulatedProfit').textContent = this.formatCurrency(yourAccumulatedProfit);

        // Gerar gráfico
        this.renderProfitChart(profitEvolution, periodsCount);
    }

    renderProfitChart(profitEvolution, periodsCount) {
        const chartContainer = document.getElementById('profitChart');
        const width = chartContainer.clientWidth || 900;
        const height = 500;
        const padding = { top: 50, right: 100, bottom: 80, left: 150 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        // Encontrar min e max dos lucros
        let minProfit = 0;
        let maxProfit = 0;
        Object.values(profitEvolution).forEach(profits => {
            profits.forEach(p => {
                if (p < minProfit) minProfit = p;
                if (p > maxProfit) maxProfit = p;
            });
        });

        // Adicionar margem
        const range = maxProfit - minProfit || 1;
        minProfit -= range * 0.1;
        maxProfit += range * 0.1;

        // Cores para cada equipa
        const colors = ['#dc3545', '#97bcd1', '#dcbcd1', '#97dcd1', '#dcbb14', '#33bbd4', '#dc57d1', '#97dc05', '#6366f1'];
        const teamNames = Object.keys(profitEvolution);
        const teamCount = teamNames.length;

        // Criar container com gráfico e legenda lado a lado
        let html = `<div style="display: flex; gap: 20px; align-items: flex-start;">`;

        // SVG do gráfico
        html += `<div style="flex: 1;"><svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" style="background: white; border-radius: 8px;">
            <defs>
                <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.3"/>
                </filter>
            </defs>`;

        // Grid horizontal
        const gridLines = 5;
        for (let i = 0; i <= gridLines; i++) {
            const y = padding.top + (chartHeight / gridLines) * i;
            const value = maxProfit - ((maxProfit - minProfit) / gridLines) * i;

            html += `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}"
                    stroke="#e5e7eb" stroke-width="1"/>`;
            html += `<text x="${padding.left - 10}" y="${y + 5}" text-anchor="end"
                    font-size="13" fill="#6b7280">${this.formatCurrency(value)}</text>`;
        }

        // Eixo X (trimestres)
        for (let i = 0; i < periodsCount; i++) {
            const x = padding.left + (chartWidth / Math.max(periodsCount - 1, 1)) * i;
            const quarterLabel = this.getQuarterLabel(i + 1);
            html += `<text x="${x}" y="${height - padding.bottom + 30}" text-anchor="middle"
                    font-size="13" fill="#374151">${quarterLabel}</text>`;
        }

        // Desenhar linhas para cada equipa
        teamNames.forEach((teamName, teamIndex) => {
            const profits = profitEvolution[teamName];
            const color = colors[teamIndex % colors.length];

            let path = 'M ';
            profits.forEach((profit, i) => {
                const x = padding.left + (chartWidth / Math.max(periodsCount - 1, 1)) * i;
                const y = padding.top + chartHeight - ((profit - minProfit) / (maxProfit - minProfit)) * chartHeight;
                path += i === 0 ? `${x},${y}` : ` L ${x},${y}`;
            });

            html += `<path d="${path}" fill="none" stroke="${color}" stroke-width="2.5" class="chart-line" data-team="${teamIndex}"/>`;
        });

        // Desenhar pontos (sem offset)
        teamNames.forEach((teamName, teamIndex) => {
            const profits = profitEvolution[teamName];
            const color = colors[teamIndex % colors.length];

            profits.forEach((profit, i) => {
                const x = padding.left + (chartWidth / Math.max(periodsCount - 1, 1)) * i;
                const y = padding.top + chartHeight - ((profit - minProfit) / (maxProfit - minProfit)) * chartHeight;

                html += `<circle cx="${x}" cy="${y}" r="5" fill="${color}" stroke="white" stroke-width="2" class="chart-point" data-team="${teamIndex}"/>`;
            });
        });

        // Áreas de hover verticais por trimestre (para mostrar todas as equipas)
        for (let i = 0; i < periodsCount; i++) {
            const x = padding.left + (chartWidth / Math.max(periodsCount - 1, 1)) * i;
            const quarterLabel = this.getQuarterLabel(i + 1);
            const tooltipId = `tooltip-period-${i}`;

            // Área de hover vertical
            const areaWidth = chartWidth / Math.max(periodsCount, 1);
            html += `<rect x="${x - areaWidth/2}" y="${padding.top}" width="${areaWidth}" height="${chartHeight}"
                    fill="transparent" style="cursor: crosshair;"
                    onmouseenter="document.getElementById('${tooltipId}').style.display='block'; document.getElementById('hover-line-${i}').style.display='block';"
                    onmouseleave="document.getElementById('${tooltipId}').style.display='none'; document.getElementById('hover-line-${i}').style.display='none';"/>`;

            // Linha vertical de hover
            html += `<line id="hover-line-${i}" x1="${x}" y1="${padding.top}" x2="${x}" y2="${padding.top + chartHeight}"
                    stroke="#9ca3af" stroke-width="1" stroke-dasharray="4,4" style="display: none; pointer-events: none;"/>`;

            // Tooltip com todas as equipas
            let tooltipHeight = 30 + teamCount * 22;
            let tooltipY = padding.top + 10;
            let tooltipX = x + 15;

            // Ajustar posição se perto da borda direita
            if (tooltipX + 180 > width - padding.right) {
                tooltipX = x - 195;
            }

            html += `<g id="${tooltipId}" style="display: none; pointer-events: none;">
                <rect x="${tooltipX}" y="${tooltipY}" width="180" height="${tooltipHeight}"
                      fill="#ffffff" stroke="#e5e7eb" stroke-width="1" rx="6" filter="url(#shadow)"/>
                <text x="${tooltipX + 90}" y="${tooltipY + 18}" text-anchor="middle" font-size="12" font-weight="600" fill="#374151">${quarterLabel}</text>
                <line x1="${tooltipX + 10}" y1="${tooltipY + 26}" x2="${tooltipX + 170}" y2="${tooltipY + 26}" stroke="#e5e7eb" stroke-width="1"/>`;

            // Listar todas as equipas ordenadas por lucro
            const periodData = teamNames.map((name, idx) => ({
                name,
                profit: profitEvolution[name][i] || 0,
                color: colors[idx % colors.length]
            })).sort((a, b) => b.profit - a.profit);

            periodData.forEach((team, idx) => {
                const textY = tooltipY + 44 + idx * 22;
                html += `<circle cx="${tooltipX + 15}" cy="${textY - 4}" r="4" fill="${team.color}"/>`;
                html += `<text x="${tooltipX + 25}" y="${textY}" font-size="10" fill="#374151">${team.name}</text>`;
                html += `<text x="${tooltipX + 170}" y="${textY}" text-anchor="end" font-size="10" font-weight="600"
                        fill="${team.profit >= 0 ? '#10b981' : '#ef4444'}">${this.formatCurrency(team.profit)}</text>`;
            });

            html += `</g>`;
        }

        html += '</svg></div>';

        // Legenda lateral
        html += `<div style="min-width: 140px; padding: 10px 0;">`;
        teamNames.forEach((teamName, index) => {
            const color = colors[index % colors.length];
            html += `<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 12px; color: ${color}; font-weight: 500;">
                <span style="display: inline-block; width: 20px; height: 3px; background: ${color}; border-radius: 2px;"></span>
                ${teamName}
            </div>`;
        });
        html += `</div></div>`;

        chartContainer.innerHTML = html;
    }

    loadHistoryData() {
        const teamData = this.getTeamData(this.currentUser);
        const historyContent = document.getElementById('historyContent');
        historyContent.innerHTML = '';

        const numPeriods = teamData.products[0].periods.length;

        // Criar grid de trimestres
        historyContent.innerHTML = '<div class="quarters-grid"></div>';
        const quartersGrid = historyContent.querySelector('.quarters-grid');

        for (let p = 0; p < numPeriods; p++) {
            const period = teamData.products[0].periods[p].period;
            const quarterLabel = this.getQuarterLabel(period);
            const quarter = this.getQuarterNumber(period);
            const isHistorical = period <= CONFIG.HISTORICAL_PERIODS;

            const seasonalityDesc = {
                1: '❄️ Pós-Natal (vendas baixas)',
                2: '🌸 Primavera (vendas normais)',
                3: '☀️ Verão (férias, vendas reduzidas)',
                4: '🎄 Natal (vendas altas)'
            };

            // Criar card do trimestre
            const quarterCard = document.createElement('div');
            quarterCard.className = 'quarter-card';
            quarterCard.innerHTML = `
                <div class="quarter-header">
                    <div class="quarter-title">
                        <h3>${quarterLabel}${isHistorical ? ' (Histórico)' : ''}</h3>
                        <p>${seasonalityDesc[quarter]}</p>
                    </div>
                    <div class="quarter-actions">
                        <button class="btn-excel" onclick="app.downloadQuarterExcel(${p})" title="Descarregar Excel">
                            📥 Excel
                        </button>
                        <button class="btn-toggle" onclick="app.toggleQuarterDetails(${p})">
                            <span class="toggle-icon">▼</span> Ver Dados
                        </button>
                    </div>
                </div>
                <div class="quarter-content" id="quarter-content-${p}" style="display: none;">
                    <div class="loading">A carregar dados...</div>
                </div>
            `;

            quartersGrid.appendChild(quarterCard);
        }
    }

    toggleQuarterDetails(periodIndex) {
        const content = document.getElementById(`quarter-content-${periodIndex}`);
        const isVisible = content.style.display !== 'none';

        if (isVisible) {
            content.style.display = 'none';
            return;
        }

        // Mostrar e carregar dados se ainda não foram carregados
        content.style.display = 'block';

        if (content.innerHTML.includes('loading')) {
            this.loadQuarterData(periodIndex);
        }
    }

    loadQuarterData(p) {
        const teamData = this.getTeamData(this.currentUser);
        const content = document.getElementById(`quarter-content-${p}`);

        const periodInfo = teamData.products[0].periods[p];
        const period = periodInfo.period;
        const quarter = this.getQuarterNumber(period);

        // Verificar se é um período pendente (sem resultados calculados)
        if (periodInfo.data === null || periodInfo.status === 'pending') {
            // Mostrar apenas as decisões submetidas
            let pendingHTML = `
                <div class="pending-simulation-notice" style="margin-bottom: 20px;">
                    <div class="notice-content">
                        <span class="notice-icon">⏳</span>
                        <div>
                            <strong>A Aguardar Simulação</strong>
                            <p>Os resultados deste trimestre serão calculados quando o professor correr a simulação.</p>
                        </div>
                    </div>
                </div>
            `;

            teamData.products.forEach(product => {
                const pData = product.periods[p];
                const d = pData.decisions;
                const g = pData.globalDecisions;

                pendingHTML += `
                    <div class="product-history">
                        <h4>${product.name}</h4>
                        <div class="history-decisions">
                            <h5 style="font-size: 14px; margin: 12px 0 8px 0; color: var(--text-secondary);">📋 Decisões Submetidas</h5>
                            <div class="decisions-compact">
                                <div class="decision-compact"><span>Preço:</span><strong>${this.formatCurrency(d.price)}</strong></div>
                                <div class="decision-compact"><span>Desconto:</span><strong>${d.discount}%</strong></div>
                                <div class="decision-compact"><span>Marketing:</span><strong>${this.formatCurrency(d.marketingInvestment)}</strong></div>
                                <div class="decision-compact"><span>Qualidade:</span><strong>${this.formatCurrency(d.qualityInvestment)}</strong></div>
                                <div class="decision-compact"><span>Comissões:</span><strong>${d.salesCommission}%</strong></div>
                            </div>
                        </div>
                    </div>
                `;
            });

            content.innerHTML = pendingHTML;
            return;
        }

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

                // Calcular valores para Break-Even
                const globalDec = periodData.globalDecisions;
                const globalInvestmentsShare = (globalDec.retentionInvestment + globalDec.brandInvestment + globalDec.customerService + globalDec.processImprovement) / 3;
                const custosFixosTotais = data.fixedCosts + data.marketingCost + data.qualityCost + globalInvestmentsShare;
                const custoVarUnitTotal = (data.variableCosts + data.distributionCosts + data.salesCommissions) / data.unitsSold;
                const precoMedioVenda = data.revenue / data.unitsSold;
                const margemContribuicao = precoMedioVenda - custoVarUnitTotal;
                const breakEvenPoint = Math.ceil(custosFixosTotais / margemContribuicao);

                // Separar tabelas de canais em decisões (%) e resultados (valores)
                let channelDecisionsHTML = '';
                let channelResultsHTML = '';

                // Tabela de canais de publicidade - Resultados
                if (data.adChannelPerformance) {
                    channelResultsHTML += `
                        <div class="channel-performance" style="margin-top: 16px;">
                            <h5 style="font-size: 14px; margin: 0 0 8px 0;">📢 Resultados por Canal de Publicidade</h5>
                            <table class="channel-table" style="font-size: 12px;">
                                <tr>
                                    <th>Canal</th>
                                    <th>Investimento (€)</th>
                                    <th>Clientes Adquiridos</th>
                                </tr>`;

                    Object.keys(data.adChannelPerformance).forEach(channelId => {
                        const ch = data.adChannelPerformance[channelId];
                        const channelName = CONFIG.AD_CHANNELS[channelId].name;
                        channelResultsHTML += `
                            <tr>
                                <td>${channelName}</td>
                                <td>${this.formatCurrency(ch.investment)}</td>
                                <td>${ch.customersAcquired !== undefined ? ch.customersAcquired.toLocaleString('pt-PT') : 'N/A'}</td>
                            </tr>`;
                    });

                    channelResultsHTML += `</table></div>`;
                }

                // Tabela de canais de distribuição - Resultados
                if (data.distributionPerformance) {
                    channelResultsHTML += `
                        <div class="channel-performance" style="margin-top: 16px;">
                            <h5 style="font-size: 14px; margin: 0 0 8px 0;">🏪 Resultados por Canal de Distribuição</h5>
                            <table class="channel-table" style="font-size: 12px;">
                                <tr>
                                    <th>Canal</th>
                                    <th>Unidades Vendidas</th>
                                    <th>Receita (€)</th>
                                </tr>`;

                    Object.keys(data.distributionPerformance).forEach(channelId => {
                        const ch = data.distributionPerformance[channelId];
                        const channelName = CONFIG.DISTRIBUTION_CHANNELS[channelId].name;
                        channelResultsHTML += `
                            <tr>
                                <td>${channelName}</td>
                                <td>${ch.unitsSold}</td>
                                <td>${this.formatCurrency(ch.revenue)}</td>
                            </tr>`;
                    });

                    channelResultsHTML += `</table></div>`;
                }

                productsHTML += `
                    <div class="product-history">
                        <h4>${product.name}</h4>

                        <div class="history-section decisions-section">
                            ${decisionsHTML}
                        </div>

                        <div class="history-section results-section">
                            <h5 class="section-title">📈 Resultados</h5>
                            <div class="history-data">
                                <div class="history-item"><span>Receita</span><strong>${this.formatCurrency(data.revenue)}</strong></div>
                                <div class="history-item"><span>Lucro</span><strong style="color: ${data.profit >= 0 ? '#10b981' : '#ef4444'}">${this.formatCurrency(data.profit)}</strong></div>
                                <div class="history-item"><span>Clientes</span><strong>${data.customerBase.toLocaleString('pt-PT')}</strong></div>
                                <div class="history-item"><span>Novos</span><strong>${data.newCustomers.toLocaleString('pt-PT')}</strong></div>
                                <div class="history-item"><span>Perdidos</span><strong>${data.lostCustomers.toLocaleString('pt-PT')}</strong></div>
                                <div class="history-item"><span>Unidades</span><strong>${data.unitsSold.toLocaleString('pt-PT')}</strong></div>
                            </div>
                        </div>

                        <div class="history-section channels-results-section">
                            <h5 class="section-title">📊 Resultados por Canal</h5>
                            ${channelResultsHTML}
                        </div>

                        <div class="history-section costs-section">
                            <h5 class="section-title">💰 Custos e Investimentos</h5>
                            <div class="history-data">
                                <div class="history-item"><span>Custos Variáveis</span><strong>${this.formatCurrency(data.variableCosts)}</strong></div>
                                <div class="history-item"><span>Custo Var. Unit.</span><strong>${this.formatCurrency(data.unitVariableCost)}</strong></div>
                                <div class="history-item"><span>Custos Fixos</span><strong>${this.formatCurrency(data.fixedCosts)}</strong></div>
                                <div class="history-item"><span>Custos Distrib.</span><strong>${this.formatCurrency(data.distributionCosts)}</strong></div>
                                <div class="history-item"><span>Comissões</span><strong>${this.formatCurrency(data.salesCommissions)}</strong></div>
                            </div>
                        </div>

                        <div class="history-section profit-calc-section">
                            <h5 class="section-title">🧮 Cálculo do Lucro</h5>
                            <div class="profit-calculation">
                                <div class="calc-row"><span>Receita</span><strong>${this.formatCurrency(data.revenue)}</strong></div>
                                <div class="calc-row negative"><span>− Custos Variáveis</span><strong>${this.formatCurrency(data.variableCosts)}</strong></div>
                                <div class="calc-row negative"><span>− Custos Fixos</span><strong>${this.formatCurrency(data.fixedCosts)}</strong></div>
                                <div class="calc-row negative"><span>− Custos Distribuição</span><strong>${this.formatCurrency(data.distributionCosts)}</strong></div>
                                <div class="calc-row negative"><span>− Comissões</span><strong>${this.formatCurrency(data.salesCommissions)}</strong></div>
                                <div class="calc-row negative"><span>− Marketing</span><strong>${this.formatCurrency(data.marketingCost)}</strong></div>
                                <div class="calc-row negative"><span>− Qualidade</span><strong>${this.formatCurrency(data.qualityCost)}</strong></div>
                                <div class="calc-row negative"><span>− Invest. Globais (1/3)</span><strong>${this.formatCurrency(globalInvestmentsShare)}</strong></div>
                                <div class="calc-row total"><span>= Lucro</span><strong style="color: ${data.profit >= 0 ? '#10b981' : '#ef4444'}">${this.formatCurrency(data.profit)}</strong></div>
                            </div>
                        </div>

                        <div class="history-section bep-section">
                            <h5 class="section-title">📊 Estimativa Break-Even</h5>
                            <p class="section-note">Valores pré-calculados para facilitar a estimativa do ponto de equilíbrio.</p>
                            <div class="bep-data">
                                <div class="bep-item">
                                    <span>Custos Fixos Totais</span>
                                    <strong>${this.formatCurrency(custosFixosTotais)}</strong>
                                    <small>(Produção + Marketing + Qualidade + Invest. Globais)</small>
                                </div>
                                <div class="bep-item">
                                    <span>Custo Var. Unit. Total</span>
                                    <strong>${this.formatCurrency(custoVarUnitTotal)}</strong>
                                    <small>(Produção + Distribuição + Comissões)</small>
                                </div>
                                <div class="bep-item">
                                    <span>Preço Médio de Venda</span>
                                    <strong>${this.formatCurrency(precoMedioVenda)}</strong>
                                </div>
                                <div class="bep-item">
                                    <span>Margem de Contribuição Unitária</span>
                                    <strong>${this.formatCurrency(margemContribuicao)}</strong>
                                </div>
                                <div class="bep-item total">
                                    <span>Break-Even Point</span>
                                    <strong>${breakEvenPoint.toLocaleString('pt-PT')} unidades</strong>
                                    <small>(Custos Fixos Totais ÷ Margem de Contribuição Unitária)</small>
                                </div>
                            </div>
                        </div>
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

            content.innerHTML = `
                ${productsHTML}
                ${globalHTML}
            `;
    }

    downloadQuarterExcel(p) {
        const teamData = this.getTeamData(this.currentUser);
        const period = teamData.products[0].periods[p].period;
        const quarterLabel = this.getQuarterLabel(period);

        // Criar workbook
        const wb = XLSX.utils.book_new();

        // Para cada produto, criar uma sheet
        teamData.products.forEach(product => {
            const periodData = product.periods[p];
            const d = periodData.decisions;
            const data = periodData.data;

            const sheetData = [];

            // Cabeçalho
            sheetData.push([product.name.toUpperCase()]);
            sheetData.push([]);

            // Dados Principais
            sheetData.push(['DADOS PRINCIPAIS']);
            sheetData.push(['Receita', data.revenue]);
            sheetData.push(['Lucro', data.profit]);
            sheetData.push(['Clientes (Base)', data.customerBase]);
            sheetData.push(['Clientes Novos', data.newCustomers]);
            sheetData.push(['Clientes Perdidos', data.lostCustomers]);
            sheetData.push(['Unidades Vendidas', data.unitsSold]);
            sheetData.push(['Preço Unitário', data.unitPrice]);
            sheetData.push([]);

            // Decisões Básicas
            sheetData.push(['DECISÕES BÁSICAS']);
            sheetData.push(['Preço', d.price]);
            sheetData.push(['Desconto (%)', d.discount]);
            sheetData.push(['Investimento Marketing', d.marketingInvestment]);
            sheetData.push(['Investimento Qualidade', d.qualityInvestment]);
            sheetData.push(['Comissões Vendas (%)', d.salesCommission]);
            sheetData.push([]);

            // Canais de Publicidade
            if (d.adChannels) {
                sheetData.push(['CANAIS DE PUBLICIDADE']);
                sheetData.push(['Canal', 'Distribuição (%)', 'Investimento (€)', 'Clientes Adquiridos']);

                Object.keys(CONFIG.AD_CHANNELS).forEach(channelId => {
                    const channelName = CONFIG.AD_CHANNELS[channelId].name;
                    const percentage = d.adChannels[channelId];
                    const perf = data.adChannelPerformance ? data.adChannelPerformance[channelId] : null;

                    sheetData.push([
                        channelName,
                        percentage,
                        perf ? perf.investment : '',
                        perf ? perf.customersAcquired : ''
                    ]);
                });
                sheetData.push([]);
            }

            // Canais de Distribuição
            if (d.distributionChannels) {
                sheetData.push(['CANAIS DE DISTRIBUIÇÃO']);
                sheetData.push(['Canal', 'Distribuição (%)', 'Unidades Vendidas', 'Receita (€)']);

                Object.keys(CONFIG.DISTRIBUTION_CHANNELS).forEach(channelId => {
                    const channelName = CONFIG.DISTRIBUTION_CHANNELS[channelId].name;
                    const percentage = d.distributionChannels[channelId];
                    const perf = data.distributionPerformance ? data.distributionPerformance[channelId] : null;

                    sheetData.push([
                        channelName,
                        percentage,
                        perf ? perf.unitsSold : '',
                        perf ? perf.revenue : ''
                    ]);
                });
                sheetData.push([]);
            }

            // Custos
            sheetData.push(['CUSTOS E INVESTIMENTOS']);
            sheetData.push(['Custos Variáveis', data.variableCosts]);
            sheetData.push(['Custo Variável Unitário', data.unitVariableCost]);
            sheetData.push(['Custos Fixos', data.fixedCosts]);
            sheetData.push(['Custos Distribuição', data.distributionCosts]);
            sheetData.push(['Comissões Pagas', data.salesCommissions]);
            sheetData.push([]);

            // Cálculo do Lucro
            sheetData.push(['CÁLCULO DO LUCRO']);
            sheetData.push(['Receita', data.revenue]);
            sheetData.push(['− Custos Variáveis', data.variableCosts]);
            sheetData.push(['− Custos Fixos', data.fixedCosts]);
            sheetData.push(['− Custos Distribuição', data.distributionCosts]);
            sheetData.push(['− Comissões', data.salesCommissions]);
            sheetData.push(['− Marketing', data.marketingCost]);
            sheetData.push(['− Qualidade', data.qualityCost]);
            const globalDecExcel = periodData.globalDecisions;
            const globalInvestmentsShareExcel = (globalDecExcel.retentionInvestment + globalDecExcel.brandInvestment + globalDecExcel.customerService + globalDecExcel.processImprovement) / 3;
            sheetData.push(['− Invest. Globais (1/3)', globalInvestmentsShareExcel]);
            sheetData.push(['= Lucro', data.profit]);
            sheetData.push([]);

            // Break-Even Point
            const custosFixosTotais = data.fixedCosts + data.marketingCost + data.qualityCost + globalInvestmentsShareExcel;
            const custoVarUnitTotal = (data.variableCosts + data.distributionCosts + data.salesCommissions) / data.unitsSold;
            const precoMedioVenda = data.revenue / data.unitsSold;
            const margemContribuicao = precoMedioVenda - custoVarUnitTotal;
            const breakEvenPoint = Math.ceil(custosFixosTotais / margemContribuicao);

            sheetData.push(['ESTIMATIVA BREAK-EVEN POINT']);
            sheetData.push(['Custos Fixos Totais (Produção + Marketing + Qualidade + Invest. Globais)', custosFixosTotais]);
            sheetData.push(['Custo Variável Unitário Total (Produção + Distribuição + Comissões)', custoVarUnitTotal]);
            sheetData.push(['Preço Médio de Venda', precoMedioVenda]);
            sheetData.push(['Margem de Contribuição Unitária', margemContribuicao]);
            sheetData.push(['Break-Even Point (unidades)', breakEvenPoint]);
            sheetData.push([]);

            const ws = XLSX.utils.aoa_to_sheet(sheetData);
            XLSX.utils.book_append_sheet(wb, ws, product.id);
        });

        // Sheet com Decisões Globais
        const globalDec = teamData.products[0].periods[p].globalDecisions;
        if (globalDec) {
            const globalData = [
                ['DECISÕES GLOBAIS DA EMPRESA'],
                [],
                ['Investimento em Fidelização', globalDec.retentionInvestment],
                ['Investimento em Marca Corporativa', globalDec.brandInvestment],
                ['Investimento em Serviço ao Cliente', globalDec.customerService],
                ['Prazo de Crédito (dias)', globalDec.creditDays],
                ['Investimento em Melhoria de Processos', globalDec.processImprovement]
            ];

            const wsGlobal = XLSX.utils.aoa_to_sheet(globalData);
            XLSX.utils.book_append_sheet(wb, wsGlobal, 'Global');
        }

        // Download
        XLSX.writeFile(wb, `${quarterLabel}_${this.currentUser}.xlsx`);
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

            // Mostrar logs de acesso
            this.loadAccessLogs();
        } else {
            document.getElementById('adminCurrentPeriod').textContent = '-';
            document.getElementById('adminState').textContent = 'Não Inicializado';
            document.getElementById('teamCodesList').innerHTML = '<p>Inicialize a simulação primeiro</p>';
            document.getElementById('submissionsStatus').innerHTML = '<p class="info-text">Inicialize a simulação primeiro</p>';
            document.getElementById('accessLogsContainer').innerHTML = '<p class="info-text">Inicialize a simulação primeiro</p>';
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
            const globalDec = periodData.globalDecisions;

            detailsHTML += `
                <div class="product-decisions">
                    <h3>🏢 Decisões Globais da Empresa</h3>
                    <div class="decisions-grid">
                        <div class="decision-item">
                            <span>Fidelização:</span>
                            <strong>${globalDec && globalDec.retentionInvestment ? this.formatCurrency(globalDec.retentionInvestment) : '-'}</strong>
                        </div>
                        <div class="decision-item">
                            <span>Marca Corporativa:</span>
                            <strong>${globalDec && globalDec.brandInvestment ? this.formatCurrency(globalDec.brandInvestment) : '-'}</strong>
                        </div>
                        <div class="decision-item">
                            <span>Serviço ao Cliente:</span>
                            <strong>${globalDec && globalDec.customerService ? this.formatCurrency(globalDec.customerService) : '-'}</strong>
                        </div>
                        <div class="decision-item">
                            <span>Prazo de Crédito:</span>
                            <strong>${globalDec && globalDec.creditDays ? globalDec.creditDays + ' dias' : '-'}</strong>
                        </div>
                        <div class="decision-item">
                            <span>Melhoria de Processos:</span>
                            <strong>${globalDec && globalDec.processImprovement ? this.formatCurrency(globalDec.processImprovement) : '-'}</strong>
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

    loadAccessLogs() {
        const logs = this.getAccessLogs();
        const container = document.getElementById('accessLogsContainer');

        if (logs.length === 0) {
            container.innerHTML = '<p class="info-text">Nenhum acesso registado ainda</p>';
            return;
        }

        let logsHTML = '<div class="access-logs-table">';
        logsHTML += '<table style="width: 100%; border-collapse: collapse;">';
        logsHTML += '<thead><tr>';
        logsHTML += '<th style="text-align: left; padding: 12px; border-bottom: 2px solid var(--border); font-weight: 600;">Data/Hora</th>';
        logsHTML += '<th style="text-align: left; padding: 12px; border-bottom: 2px solid var(--border); font-weight: 600;">Tipo</th>';
        logsHTML += '<th style="text-align: left; padding: 12px; border-bottom: 2px solid var(--border); font-weight: 600;">Utilizador</th>';
        logsHTML += '<th style="text-align: left; padding: 12px; border-bottom: 2px solid var(--border); font-weight: 600;">Código/Nome</th>';
        logsHTML += '</tr></thead><tbody>';

        logs.forEach(log => {
            const typeIcon = log.userType === 'admin' ? '👨‍🏫' : '👥';
            const typeBadge = log.userType === 'admin'
                ? '<span style="background: #3b82f6; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">PROFESSOR</span>'
                : '<span style="background: #10b981; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">EQUIPA</span>';

            logsHTML += '<tr style="border-bottom: 1px solid var(--border);">';
            logsHTML += `<td style="padding: 12px; font-size: 13px;">${log.date}</td>`;
            logsHTML += `<td style="padding: 12px;">${typeIcon} ${typeBadge}</td>`;
            logsHTML += `<td style="padding: 12px; font-weight: 600;">${log.teamName || '-'}</td>`;
            logsHTML += `<td style="padding: 12px; font-family: monospace; font-size: 12px; color: var(--text-secondary);">${log.identifier}</td>`;
            logsHTML += '</tr>';
        });

        logsHTML += '</tbody></table></div>';
        container.innerHTML = logsHTML;
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

        firebaseSync.remove(CONFIG.STORAGE_KEYS.SIMULATION_DATA);
        firebaseSync.remove(CONFIG.STORAGE_KEYS.TEAMS_DATA);
        firebaseSync.remove(CONFIG.STORAGE_KEYS.TEAM_CODES);

        alert('Simulação resetada com sucesso!');
        this.loadAdminPanel();
    }

    changePassword(newPassword) {
        if (!newPassword || newPassword.length < 6) {
            alert('A palavra-passe deve ter pelo menos 6 caracteres!');
            return;
        }

        firebaseSync.save(CONFIG.STORAGE_KEYS.ADMIN_PASSWORD, newPassword);
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
        // Usar espaço não quebrável visível como separador de milhares
        return new Intl.NumberFormat('pt-PT', {
            style: 'currency',
            currency: 'EUR',
            useGrouping: true
        }).format(value).replace(/\s/g, '\u00A0');
    }

    formatNumber(value) {
        // Usar espaço não quebrável visível como separador de milhares
        return new Intl.NumberFormat('pt-PT', {
            useGrouping: true
        }).format(value).replace(/\s/g, '\u00A0');
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
        const passwordData = localStorage.getItem(CONFIG.STORAGE_KEYS.ADMIN_PASSWORD);

        // Se não existe password OU está vazia, criar a default
        if (!passwordData) {
            firebaseSync.save(CONFIG.STORAGE_KEYS.ADMIN_PASSWORD, CONFIG.DEFAULT_ADMIN_PASSWORD);
        } else {
            try {
                JSON.parse(passwordData);
            } catch (e) {
                // Se houver erro ao fazer parse, recriar
                firebaseSync.save(CONFIG.STORAGE_KEYS.ADMIN_PASSWORD, CONFIG.DEFAULT_ADMIN_PASSWORD);
            }
        }
    }
}

// ===== INICIALIZAÇÃO =====
let app;

document.addEventListener('DOMContentLoaded', () => {
    app = new SimulatorApp();
});
