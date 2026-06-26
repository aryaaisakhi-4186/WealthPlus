/* ==========================================================================
   WEALTH PLUS - APPLICATION ENGINE (v3.5)
   ========================================================================== */

// --- 1. GLOBAL STATE & LOCAL STORAGE ---
let state = {
    clients: [],
    incomeLogs: [],
    transactions: [],
    accounts: [], // Dynamic Accounts: { id, name, type }
    budgets: {},  // Monthly Budgets: { Category: Amount }
    customClientFields: [], // Custom Columns: { id, name, type }
    customTxFields: [],     // Custom Columns: { id, name, type }
    members: [],  // Registered Members: { id, name, mobile, pin, role }
    currentUser: null, // Logged-in session: { id, name, mobile, role }
    cloudSyncEnabled: false, // Firebase sync status
    firebaseConfig: null,    // Firebase Config JSON
    geminiApiKey: null,      // Gemini AI API Key
    githubToken: null,       // GitHub Personal Access Token
    githubRepo: "aryaaisakhi-4186/WealthPlus",        // GitHub repo path (owner/repo)
    githubBranch: 'main',    // GitHub branch (defaults to main)
    categoriesConfig: {
        Food: { color: '#f59e0b', icon: 'utensils' },
        Shopping: { color: '#ec4899', icon: 'shopping-bag' },
        Bills: { color: '#3b82f6', icon: 'credit-card' },
        Transport: { color: '#06b6d4', icon: 'car' },
        Rent: { color: '#8b5cf6', icon: 'home' },
        Others: { color: '#64748b', icon: 'more-horizontal' }
    },
    activePage: 'dashboard',
    activeReportTab: 'client',
    activeMasterTab: 'accounts',
    selectedPeriod: 'financial-year',
    customStartDate: '',
    customEndDate: '',
    selectedLedgerAccountId: ''
};

// Seed Data
const defaultClients = [
    { id: "c1", name: "Acme Corporation", monthlyPay: 35000 },
    { id: "c2", name: "StarLabs Ltd", monthlyPay: 20000 }
];

const defaultAccounts = [
    { id: "acc_1", name: "Main Cash", type: "Cash" },
    { id: "acc_2", name: "HDFC Bank", type: "Bank" }
];

const defaultBudgets = {
    Food: 5000,
    Shopping: 3000,
    Bills: 10000,
    Transport: 4000,
    Rent: 15000,
    Others: 3000
};

const defaultMembers = [
    { id: "m_1", name: "Admin Manager", mobile: "9999999999", pin: "1234", role: "Admin" },
    { id: "m_2", name: "Staff Member", mobile: "9876543210", pin: "5678", role: "Staff" }
];

const defaultIncomeLogs = [
    { id: "i1", clientId: "c1", amount: 70000, date: "2026-04-05", mode: "HDFC Bank" },
    { id: "i2", clientId: "c2", amount: 20000, date: "2026-04-10", mode: "HDFC Bank" },
    { id: "i3", clientId: "c1", amount: 15000, date: "2026-05-02", mode: "Main Cash" }
];

const defaultTransactions = [
    { id: "t1", description: "Office Rent Deposit", category: "Rent", amount: 15000, date: "2026-04-06", mode: "HDFC Bank", clientId: "c1" },
    { id: "t2", description: "Team Lunch", category: "Food", amount: 2500, date: "2026-04-12", mode: "Main Cash", clientId: "" },
    { id: "t3", description: "AWS Cloud Server", category: "Bills", amount: 4800, date: "2026-04-15", mode: "HDFC Bank", clientId: "c1" },
    { id: "t4", description: "Office Stationeries", category: "Shopping", amount: 1200, date: "2026-04-20", mode: "Main Cash", clientId: "c2" },
    { id: "t5", description: "Client Travel", category: "Transport", amount: 3500, date: "2026-05-04", mode: "HDFC Bank", clientId: "c1" },
    { id: "t6", description: "Electricity Bill", category: "Bills", amount: 6200, date: "2026-05-10", mode: "HDFC Bank", clientId: "" }
];

const defaultCategoriesConfig = {
    Food: { color: '#f59e0b', icon: 'utensils' },
    Shopping: { color: '#ec4899', icon: 'shopping-bag' },
    Bills: { color: '#3b82f6', icon: 'credit-card' },
    Transport: { color: '#06b6d4', icon: 'car' },
    Rent: { color: '#8b5cf6', icon: 'home' },
    Others: { color: '#64748b', icon: 'more-horizontal' }
};

// Load state & run format migrations
function loadState() {
    let saved = null;
    try {
        saved = localStorage.getItem('wealth_plus_state');
        if (!saved) {
            // Fallback migration for existing users
            saved = localStorage.getItem('kharcha_ledger_state');
            if (saved) {
                localStorage.setItem('wealth_plus_state', saved);
                localStorage.removeItem('kharcha_ledger_state');
            }
        }
    } catch (e) {
        console.warn("localStorage is not accessible:", e);
    }
    if (saved) {
        try {
            state = JSON.parse(saved);
            runStateMigrations();
        } catch (e) {
            console.error("Error parsing state:", e);
            seedState();
        }
    } else {
        seedState();
    }
    populateCategoryDropdowns();
}

// Seed initial state
function seedState() {
    state.clients = [...defaultClients];
    state.accounts = [...defaultAccounts];
    state.budgets = { ...defaultBudgets };
    state.members = [...defaultMembers];
    state.currentUser = null;
    state.incomeLogs = [...defaultIncomeLogs];
    state.transactions = [...defaultTransactions];
    state.customClientFields = [];
    state.customTxFields = [];
    state.categoriesConfig = { ...defaultCategoriesConfig };
    state.activePage = 'dashboard';
    state.activeReportTab = 'client';
    state.activeMasterTab = 'accounts';
    state.selectedPeriod = 'financial-year';
    state.selectedLedgerAccountId = state.accounts[0]?.id || '';
    saveState();
}

// Migrate old formats
function runStateMigrations() {
    let updated = false;

    if (!state.accounts || state.accounts.length === 0) { state.accounts = [...defaultAccounts]; updated = true; }
    if (!state.budgets || Object.keys(state.budgets).length === 0) { state.budgets = { ...defaultBudgets }; updated = true; }
    if (!state.members || state.members.length === 0) { state.members = [...defaultMembers]; updated = true; }
    if (!state.customClientFields) { state.customClientFields = []; updated = true; }
    if (!state.customTxFields) { state.customTxFields = []; updated = true; }
    if (!state.activeMasterTab) { state.activeMasterTab = 'accounts'; updated = true; }
    if (!state.categoriesConfig) { state.categoriesConfig = { ...defaultCategoriesConfig }; updated = true; }

    state.incomeLogs.forEach(log => {
        if (log.mode === 'Cash') { log.mode = 'Main Cash'; updated = true; }
        else if (log.mode === 'Bank') { log.mode = 'HDFC Bank'; updated = true; }
    });

    state.transactions.forEach(tx => {
        if (tx.mode === 'Cash') { tx.mode = 'Main Cash'; updated = true; }
        else if (tx.mode === 'Bank' || tx.mode === 'UPI') { tx.mode = 'HDFC Bank'; updated = true; }
    });

    if (!state.selectedLedgerAccountId && state.accounts.length > 0) {
        state.selectedLedgerAccountId = state.accounts[0].id;
        updated = true;
    }

    if (state.cloudSyncEnabled === undefined) { state.cloudSyncEnabled = false; updated = true; }
    if (state.firebaseConfig === undefined) { state.firebaseConfig = null; updated = true; }
    if (state.geminiApiKey === undefined) { state.geminiApiKey = null; updated = true; }
    if (state.githubToken === undefined) { state.githubToken = null; updated = true; }
    if (state.githubRepo === undefined) { state.githubRepo = null; updated = true; }
    if (state.githubBranch === undefined) { state.githubBranch = 'main'; updated = true; }

    if (updated) {
        saveState();
    }
}

// Save state to local storage
function saveState() {
    try {
        localStorage.setItem('wealth_plus_state', JSON.stringify(state));
    } catch (e) {
        console.warn("Failed to save state to localStorage:", e);
    }
}

function saveStateLocalOnly() {
    try {
        localStorage.setItem('wealth_plus_state', JSON.stringify(state));
    } catch (e) {
        console.warn("Failed to save state to localStorage:", e);
    }
}

// --- FIREBASE SYNC ENGINE ---
let firebaseDb = null;

function initFirebaseApp() {
    if (!state.cloudSyncEnabled || !state.firebaseConfig || !window.firebase) return;
    try {
        if (firebase.apps.length === 0) {
            firebase.initializeApp(state.firebaseConfig);
        }
        firebaseDb = firebase.firestore();
        
        // Enable offline persistence
        firebaseDb.enablePersistence().catch(err => {
            console.warn("Firestore persistence failed:", err.code);
        });
        
        initFirebaseSyncListeners();
    } catch (e) {
        console.error("Firebase init failed:", e);
    }
}

function firebaseWrite(collection, docId, data) {
    if (firebaseDb) {
        firebaseDb.collection(collection).doc(docId).set(data).catch(e => console.error("Firebase write error:", e));
    }
}

function firebaseDelete(collection, docId) {
    if (firebaseDb) {
        firebaseDb.collection(collection).doc(docId).delete().catch(e => console.error("Firebase delete error:", e));
    }
}

function firebaseWriteSettings() {
    if (firebaseDb) {
        firebaseDb.collection('settings').doc('config').set({
            budgets: state.budgets,
            customClientFields: state.customClientFields,
            customTxFields: state.customTxFields,
            categoriesConfig: state.categoriesConfig
        }).catch(e => console.error("Firebase settings write error:", e));
    }
}

// Firestore snapshot listeners
function initFirebaseSyncListeners() {
    if (!state.cloudSyncEnabled || !firebaseDb) return;
    
    const isSame = (a, b) => JSON.stringify(a) === JSON.stringify(b);

    // 1. Clients
    firebaseDb.collection('clients').onSnapshot(snapshot => {
        if (snapshot.empty) return;
        let items = [];
        snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
        if (!isSame(state.clients, items)) {
            state.clients = items;
            saveStateLocalOnly();
            if (state.activePage === 'clients' || state.activePage === 'master') renderPage(state.activePage);
        }
    }, err => console.error("Clients sync error:", err));

    // 2. Income Logs
    firebaseDb.collection('incomeLogs').onSnapshot(snapshot => {
        if (snapshot.empty) return;
        let items = [];
        snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
        if (!isSame(state.incomeLogs, items)) {
            state.incomeLogs = items;
            saveStateLocalOnly();
            if (state.activePage === 'clients') renderPage('clients');
        }
    }, err => console.error("Income logs sync error:", err));

    // 3. Transactions
    firebaseDb.collection('transactions').onSnapshot(snapshot => {
        if (snapshot.empty) return;
        let items = [];
        snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
        if (!isSame(state.transactions, items)) {
            state.transactions = items;
            saveStateLocalOnly();
            renderPage(state.activePage);
        }
    }, err => console.error("Transactions sync error:", err));

    // 4. Accounts
    firebaseDb.collection('accounts').onSnapshot(snapshot => {
        if (snapshot.empty) return;
        let items = [];
        snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
        if (!isSame(state.accounts, items)) {
            state.accounts = items;
            saveStateLocalOnly();
            if (state.activePage === 'dashboard' || state.activePage === 'master' || state.activePage === 'reports') renderPage(state.activePage);
        }
    }, err => console.error("Accounts sync error:", err));

    // 5. Members
    firebaseDb.collection('members').onSnapshot(snapshot => {
        if (snapshot.empty) return;
        let items = [];
        snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
        if (!isSame(state.members, items)) {
            state.members = items;
            saveStateLocalOnly();
            if (state.currentUser && !state.members.some(m => m.id === state.currentUser.id)) {
                state.currentUser = null;
                saveStateLocalOnly();
                initLoginSession();
            } else if (state.activePage === 'master') {
                renderPage('master');
            }
        }
    }, err => console.error("Members sync error:", err));

    // 6. Settings (config doc)
    firebaseDb.collection('settings').doc('config').onSnapshot(doc => {
        if (!doc.exists) return;
        const data = doc.data();
        let changed = false;
        if (data.budgets && !isSame(state.budgets, data.budgets)) {
            state.budgets = data.budgets;
            changed = true;
        }
        if (data.customClientFields && !isSame(state.customClientFields, data.customClientFields)) {
            state.customClientFields = data.customClientFields;
            changed = true;
        }
        if (data.customTxFields && !isSame(state.customTxFields, data.customTxFields)) {
            state.customTxFields = data.customTxFields;
            changed = true;
        }
        if (data.categoriesConfig && !isSame(state.categoriesConfig, data.categoriesConfig)) {
            state.categoriesConfig = data.categoriesConfig;
            changed = true;
            populateCategoryDropdowns();
        }
        if (changed) {
            saveStateLocalOnly();
            renderPage(state.activePage);
        }
    }, err => console.error("Config sync error:", err));
}

// --- CENTRAL DATA MUTATION FUNCTIONS ---
function addClientDirect(clientObj, syncToCloud = true) {
    const idx = state.clients.findIndex(c => c.id === clientObj.id);
    if (idx !== -1) {
        state.clients[idx] = { ...state.clients[idx], ...clientObj };
    } else {
        state.clients.push(clientObj);
    }
    saveStateLocalOnly();
    if (syncToCloud) firebaseWrite('clients', clientObj.id, clientObj);
}

function deleteClientDirect(id, syncToCloud = true) {
    state.clients = state.clients.filter(c => c.id !== id);
    saveStateLocalOnly();
    if (syncToCloud) firebaseDelete('clients', id);
}

function addIncomeDirect(incomeObj, syncToCloud = true) {
    const idx = state.incomeLogs.findIndex(i => i.id === incomeObj.id);
    if (idx !== -1) {
        state.incomeLogs[idx] = { ...state.incomeLogs[idx], ...incomeObj };
    } else {
        state.incomeLogs.push(incomeObj);
    }
    saveStateLocalOnly();
    if (syncToCloud) firebaseWrite('incomeLogs', incomeObj.id, incomeObj);
}

function deleteIncomeDirect(id, syncToCloud = true) {
    state.incomeLogs = state.incomeLogs.filter(i => i.id !== id);
    saveStateLocalOnly();
    if (syncToCloud) firebaseDelete('incomeLogs', id);
}

function addExpenseDirect(txObj, syncToCloud = true) {
    const idx = state.transactions.findIndex(t => t.id === txObj.id);
    if (idx !== -1) {
        state.transactions[idx] = { ...state.transactions[idx], ...txObj };
    } else {
        state.transactions.push(txObj);
    }
    saveStateLocalOnly();
    if (syncToCloud) firebaseWrite('transactions', txObj.id, txObj);
}

function deleteExpenseDirect(id, syncToCloud = true) {
    state.transactions = state.transactions.filter(t => t.id !== id);
    saveStateLocalOnly();
    if (syncToCloud) firebaseDelete('transactions', id);
}

function addAccountDirect(accountObj, syncToCloud = true) {
    const idx = state.accounts.findIndex(a => a.id === accountObj.id);
    if (idx !== -1) {
        state.accounts[idx] = { ...state.accounts[idx], ...accountObj };
    } else {
        state.accounts.push(accountObj);
    }
    saveStateLocalOnly();
    if (syncToCloud) firebaseWrite('accounts', accountObj.id, accountObj);
}

function deleteAccountDirect(id, syncToCloud = true) {
    state.accounts = state.accounts.filter(a => a.id !== id);
    saveStateLocalOnly();
    if (syncToCloud) firebaseDelete('accounts', id);
}

function addMemberDirect(memberObj, syncToCloud = true) {
    const idx = state.members.findIndex(m => m.id === memberObj.id);
    if (idx !== -1) {
        state.members[idx] = { ...state.members[idx], ...memberObj };
    } else {
        state.members.push(memberObj);
    }
    saveStateLocalOnly();
    if (syncToCloud) firebaseWrite('members', memberObj.id, memberObj);
}

function deleteMemberDirect(id, syncToCloud = true) {
    state.members = state.members.filter(m => m.id !== id);
    saveStateLocalOnly();
    if (syncToCloud) firebaseDelete('members', id);
}

function saveBudgetsDirect(budgetsObj, syncToCloud = true) {
    state.budgets = budgetsObj;
    saveStateLocalOnly();
    if (syncToCloud) firebaseWriteSettings();
}

function saveCustomFieldsDirect(customClientFields, customTxFields, syncToCloud = true) {
    state.customClientFields = customClientFields;
    state.customTxFields = customTxFields;
    saveStateLocalOnly();
    if (syncToCloud) firebaseWriteSettings();
}

// --- 2. AUTHENTICATION CONTROLLER ---

function initLoginSession() {
    const loginOverlay = document.getElementById('login-screen');
    const userBadge = document.getElementById('current-user-badge');
    const shreeWidget = document.getElementById('shree-chat-widget');

    if (state.currentUser) {
        // Logged in
        loginOverlay.classList.add('hidden');
        userBadge.innerText = `${state.currentUser.name} (${state.currentUser.role})`;
        if (shreeWidget) shreeWidget.style.display = 'block';
        
        // Dynamic Role access checks: Hide Master link for Staff
        const masterLinks = document.querySelectorAll('[data-page="master"]');
        if (state.currentUser.role === 'Staff') {
            masterLinks.forEach(el => el.style.display = 'none');
            // Hide delete buttons across directories
            document.documentElement.style.setProperty('--staff-access-display', 'none');
        } else {
            masterLinks.forEach(el => el.style.display = 'flex');
            document.documentElement.style.setProperty('--staff-access-display', 'inline-flex');
        }
    } else {
        // Not logged in
        loginOverlay.classList.remove('hidden');
        if (shreeWidget) shreeWidget.style.display = 'none';
    }
}

function handleLoginSubmit(e) {
    e.preventDefault();
    const mobile = document.getElementById('login-mobile').value.trim();
    const pin = document.getElementById('login-pin').value.trim();
    const errorMsg = document.getElementById('login-error-msg');

    const member = state.members.find(m => m.mobile === mobile && m.pin === pin);
    if (member) {
        errorMsg.style.display = 'none';
        state.currentUser = {
            id: member.id,
            name: member.name,
            mobile: member.mobile,
            role: member.role
        };
        saveState();
        initLoginSession();
        
        // Reset forms inputs
        document.getElementById('form-login').reset();
        
        // Refresh page view
        renderPage(state.activePage);
        

    } else {
        errorMsg.style.display = 'block';
        errorMsg.innerText = "Access Denied: Mobile number or PIN is incorrect.";
    }
}

function handleLogoutUser() {
    if (confirm("Are you sure you want to log out from this session?")) {
        state.currentUser = null;
        saveState();
        
        // Redirect to dashboard page state secretly
        state.activePage = 'dashboard';
        saveState();

        initLoginSession();
        if (window.speechSynthesis) window.speechSynthesis.cancel();
    }
}

// --- 3. DATE & PERIOD BOUNDS UTILITIES ---

function getIndianFinancialYearBounds(date = new Date()) {
    const year = date.getFullYear();
    const month = date.getMonth();
    let startYear, endYear;

    if (month >= 3) {
        startYear = year;
        endYear = year + 1;
    } else {
        startYear = year - 1;
        endYear = year;
    }

    const startDate = new Date(startYear, 3, 1);
    const endDate = new Date(endYear, 2, 31);
    return { startDate, endDate };
}

function getPeriodFilterBounds() {
    const today = new Date();
    let start, end;

    switch (state.selectedPeriod) {
        case 'this-month':
            start = new Date(today.getFullYear(), today.getMonth(), 1);
            end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            break;
        case 'this-quarter':
            const month = today.getMonth();
            let qStartMonth;
            if (month >= 3 && month <= 5) qStartMonth = 3;
            else if (month >= 6 && month <= 8) qStartMonth = 6;
            else if (month >= 9 && month <= 11) qStartMonth = 9;
            else qStartMonth = 0;
            
            const qStartYear = (qStartMonth === 0 && month >= 3) ? today.getFullYear() + 1 : (month < 3 && qStartMonth !== 0) ? today.getFullYear() - 1 : today.getFullYear();
            start = new Date(qStartYear, qStartMonth, 1);
            end = new Date(qStartYear, qStartMonth + 3, 0);
            break;
        case 'custom':
            start = state.customStartDate ? new Date(state.customStartDate) : new Date(2000, 0, 1);
            end = state.customEndDate ? new Date(state.customEndDate) : new Date(2099, 11, 31);
            break;
        case 'financial-year':
        default:
            const bounds = getIndianFinancialYearBounds(today);
            start = bounds.startDate;
            end = bounds.endDate;
            break;
    }
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
}

function formatDateString(dateObj) {
    const d = new Date(dateObj);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

function formatDbDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return formatDateString(new Date(dateStr));
}

// --- 4. CORE LEDGER ENGINE CALCULATIONS ---

function getAccountLedger(accountId) {
    const account = state.accounts.find(a => a.id === accountId);
    if (!account) return [];

    let ledger = [];

    // Filter inflows
    state.incomeLogs.forEach(log => {
        if (log.mode === account.name) {
            const client = state.clients.find(c => c.id === log.clientId);
            ledger.push({
                date: log.date,
                particulars: `Received from ${client ? client.name : 'Unknown Client'}`,
                category: 'Inflow (Revenue)',
                debit: Number(log.amount),
                credit: 0,
                timestamp: new Date(log.date).getTime()
            });
        }
    });

    // Filter outflows
    state.transactions.forEach(tx => {
        if (tx.mode === account.name) {
            const client = state.clients.find(c => c.id === tx.clientId);
            ledger.push({
                date: tx.date,
                particulars: `${tx.description}` + (client ? ` [Client: ${client.name}]` : ''),
                category: tx.category,
                debit: 0,
                credit: Number(tx.amount),
                timestamp: new Date(tx.date).getTime()
            });
        }
    });

    // Sort chronologically
    ledger.sort((a, b) => a.timestamp - b.timestamp || a.particulars.localeCompare(b.particulars));

    // Calculate running balance
    let runningBalance = 0;
    ledger.forEach(row => {
        runningBalance += (row.debit - row.credit);
        row.balance = runningBalance;
    });

    return ledger;
}

function getGlobalStats() {
    let totalCashBalance = 0;
    let totalBankBalance = 0;

    state.accounts.forEach(acc => {
        const ledger = getAccountLedger(acc.id);
        const closingBal = ledger.length > 0 ? ledger[ledger.length - 1].balance : 0;
        
        if (acc.type === 'Cash') {
            totalCashBalance += closingBal;
        } else if (acc.type === 'Bank') {
            totalBankBalance += closingBal;
        }
    });

    // Period Filtered Expenses
    const bounds = getPeriodFilterBounds();
    const periodExpenses = state.transactions
        .filter(tx => {
            const txDate = new Date(tx.date);
            return txDate >= bounds.start && txDate <= bounds.end;
        })
        .reduce((sum, tx) => sum + Number(tx.amount), 0);

    return { cashBalance: totalCashBalance, bankBalance: totalBankBalance, periodExpenses };
}

function getClientReportStats(clientId) {
    const client = state.clients.find(c => c.id === clientId);
    if (!client) return { totalReceived: 0, totalSpent: 0, balance: 0, yearlyContract: 0, balanceReceivable: 0 };

    const yearlyContract = Number(client.monthlyPay) * 12;

    const totalReceived = state.incomeLogs
        .filter(log => log.clientId === clientId)
        .reduce((sum, log) => sum + Number(log.amount), 0);

    const totalSpent = state.transactions
        .filter(tx => tx.clientId === clientId)
        .reduce((sum, tx) => sum + Number(tx.amount), 0);

    const balance = totalReceived - totalSpent;
    const balanceReceivable = yearlyContract - totalReceived;

    return { yearlyContract, totalReceived, totalSpent, balance, balanceReceivable };
}

// --- 5. NAVIGATION CONTROLLER ---

function navigateToPage(pageId) {
    // Staff cannot navigate to Master settings
    if (pageId === 'master' && state.currentUser && state.currentUser.role === 'Staff') {
        alert("Access Denied: Staff accounts do not have Master administration permissions.");
        return;
    }

    state.activePage = pageId;
    saveState();

    document.querySelectorAll('.sidebar-menu .menu-item').forEach(el => {
        el.classList.toggle('active', el.getAttribute('data-page') === pageId);
    });
    document.querySelectorAll('.bottom-nav-item').forEach(el => {
        el.classList.toggle('active', el.getAttribute('data-page') === pageId);
    });

    document.querySelectorAll('.app-page').forEach(el => {
        el.classList.toggle('active', el.id === `page-${pageId}`);
    });

    const titles = {
        'dashboard': 'Dashboard Overview',
        'clients': 'Clients & Income Book',
        'expenses': 'Wealth Plus Entries',
        'reports': 'Reports & Bookkeeping',
        'master': 'Master Settings Dashboard'
    };
    document.getElementById('page-title').innerText = titles[pageId] || 'Wealth Plus';

    renderPage(pageId);
}

function setReportType(type) {
    state.activeReportTab = type;
    saveState();

    document.querySelectorAll('.report-tab').forEach(el => {
        el.classList.toggle('active', el.getAttribute('data-report-type') === type);
    });

    document.querySelectorAll('.report-sub-screen').forEach(el => {
        el.classList.toggle('active', el.id === `report-screen-${type}`);
    });

    renderReportSubScreen(type);
}

function setMasterTab(tabId) {
    state.activeMasterTab = tabId;
    saveState();

    document.querySelectorAll('.master-tab').forEach(el => {
        el.classList.toggle('active', el.getAttribute('data-master-sub') === tabId);
    });

    document.querySelectorAll('.master-sub-panel').forEach(el => {
        el.classList.toggle('active', el.id === `master-panel-${tabId}`);
    });

    renderMasterSubPanel(tabId);
}

// --- 6. RENDER LOGIC ---

function renderPage(pageId) {
    if (!state.currentUser) return; // Wait for login

    updateDateDisplay();
    updateGlobalStatsUI();
    populateCategoryDropdowns();

    switch (pageId) {
        case 'dashboard':
            renderDashboard();
            break;
        case 'clients':
            renderClientsPage();
            break;
        case 'expenses':
            renderExpensesPage();
            break;
        case 'reports':
            renderReportsPage();
            break;
        case 'master':
            renderMasterPage();
            break;
    }
}

function updateDateDisplay() {
    const bounds = getPeriodFilterBounds();
    const formatted = `${formatDateString(bounds.start)} to ${formatDateString(bounds.end)}`;
    document.getElementById('current-date-display').innerText = `Active Period: ${formatted}`;
}

function updateGlobalStatsUI() {
    const stats = getGlobalStats();
    const fC = v => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);
    
    document.getElementById('stat-cash-balance').innerText = fC(stats.cashBalance);
    document.getElementById('stat-bank-balance').innerText = fC(stats.bankBalance);
    document.getElementById('stat-period-expenses').innerText = fC(stats.periodExpenses);
}

// DASHBOARD RENDERER
let trendChartInstance = null;
let categoryChartInstance = null;

function renderDashboard() {
    const bounds = getPeriodFilterBounds();
    const fC = v => '₹' + Math.round(v).toLocaleString('en-IN');

    // 1. Render Account balances list
    const balancesGrid = document.getElementById('dash-account-balances-grid');
    balancesGrid.innerHTML = '';
    
    state.accounts.forEach(acc => {
        const ledger = getAccountLedger(acc.id);
        const closingBal = ledger.length > 0 ? ledger[ledger.length - 1].balance : 0;
        
        const card = document.createElement('div');
        card.className = 'dash-acc-bal-card';
        card.innerHTML = `
            <span class="acc-name">${acc.name} (${acc.type})</span>
            <span class="acc-bal ${closingBal < 0 ? 'neg-bal' : 'pos-bal'}">${fC(closingBal)}</span>
        `;
        card.addEventListener('click', () => {
            state.selectedLedgerAccountId = acc.id;
            saveState();
            navigateToPage('reports');
            setReportType('ledger');
        });
        balancesGrid.appendChild(card);
    });

    const filteredTx = state.transactions.filter(tx => {
        const d = new Date(tx.date);
        return d >= bounds.start && d <= bounds.end;
    });

    // 2. Category chart
    const catAmounts = {};
    Object.keys(state.categoriesConfig).forEach(cat => catAmounts[cat] = 0);
    filteredTx.forEach(tx => {
        if (catAmounts[tx.category] !== undefined) {
            catAmounts[tx.category] += Number(tx.amount);
        } else {
            const firstCat = Object.keys(state.categoriesConfig)[0] || 'Others';
            if (catAmounts[firstCat] !== undefined) {
                catAmounts[firstCat] += Number(tx.amount);
            }
        }
    });

    renderCategoryChart(catAmounts);
    renderTrendChart(filteredTx, bounds.start, bounds.end);

    // 3. Render Recent list
    const recentContainer = document.getElementById('dashboard-recent-transactions');
    recentContainer.innerHTML = '';
    
    const sortedAll = [...state.transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const latestTx = sortedAll.slice(0, 5);

    if (latestTx.length === 0) {
        recentContainer.innerHTML = `<div class="empty-state" style="padding: 24px; text-align: center; color: var(--text-muted);">No expenses logged in this period.</div>`;
    } else {
        latestTx.forEach(tx => {
            const client = state.clients.find(c => c.id === tx.clientId);
            const clientLabel = client ? client.name : 'General';
            const firstCat = Object.keys(state.categoriesConfig)[0] || 'Others';
            const catMeta = state.categoriesConfig[tx.category] || state.categoriesConfig[firstCat] || { color: '#64748b', icon: 'tag' };
            
            const item = document.createElement('div');
            item.className = 'recent-item';
            item.innerHTML = `
                <div class="item-left">
                    <div class="item-cat-icon" style="background: ${catMeta.color}15; color: ${catMeta.color};">
                        <i data-lucide="${catMeta.icon}"></i>
                    </div>
                    <div class="item-details">
                        <h5>${tx.description}</h5>
                        <span>${formatDbDate(tx.date)} &bull; ${tx.category}</span>
                    </div>
                </div>
                <div class="item-right">
                    <span class="item-amount expense-txt">-₹${Number(tx.amount).toLocaleString('en-IN')}</span>
                    <div class="item-subtext">${tx.mode} &bull; ${clientLabel}</div>
                </div>
            `;
            recentContainer.appendChild(item);
        });
        lucide.createIcons();
    }

    // 4. Render Yearly Budget Progress list
    const currentFYBounds = getIndianFinancialYearBounds(new Date());
    const fyTx = state.transactions.filter(tx => {
        const d = new Date(tx.date);
        return d >= currentFYBounds.startDate && d <= currentFYBounds.endDate;
    });

    const overallBudgetMonthlyTotal = Object.values(state.budgets).reduce((sum, val) => sum + Number(val), 0);
    const overallBudgetYearly = overallBudgetMonthlyTotal * 12;
    const overallSpentYearly = fyTx.reduce((sum, tx) => sum + Number(tx.amount), 0);
    const overallRemaining = overallBudgetYearly - overallSpentYearly;

    const overallStatsBox = document.getElementById('dash-budget-overall-stats');
    overallStatsBox.innerHTML = `
        <div class="overall-stat">
            <span class="lbl">Yearly Budget</span>
            <span class="val">${fC(overallBudgetYearly)}</span>
        </div>
        <div class="overall-stat">
            <span class="lbl">Spent (FY)</span>
            <span class="val">${fC(overallSpentYearly)}</span>
        </div>
        <div class="overall-stat">
            <span class="lbl">${overallRemaining >= 0 ? 'Remaining' : 'Overspent'}</span>
            <span class="val" style="color: ${overallRemaining >= 0 ? 'var(--success)' : 'var(--danger)'};">${fC(Math.abs(overallRemaining))}</span>
        </div>
    `;

    const budgetCatList = document.getElementById('dash-budget-category-list');
    budgetCatList.innerHTML = '';

    Object.keys(state.categoriesConfig).forEach(cat => {
        const monthlyB = Number(state.budgets[cat]) || 0;
        const yearlyB = monthlyB * 12;
        const spentY = fyTx.filter(tx => tx.category === cat).reduce((sum, tx) => sum + Number(tx.amount), 0);
        const pct = yearlyB > 0 ? (spentY / yearlyB) * 100 : 0;
        const isOverspent = spentY > yearlyB;
        const variance = yearlyB - spentY;

        const pItem = document.createElement('div');
        pItem.className = 'budget-progress-item';
        pItem.innerHTML = `
            <div class="progress-item-label">
                <span class="cat-name">${cat}</span>
                <span class="cat-fraction">${fC(spentY)} of ${fC(yearlyB)}</span>
            </div>
            <div class="progress-bar-bg">
                <div class="progress-bar-fill" style="width: ${Math.min(pct, 100)}%; background-color: ${isOverspent ? 'var(--danger)' : 'var(--primary)'};"></div>
            </div>
            <div class="progress-item-footer">
                <span class="variance-lbl">${isOverspent ? 'Extra Kharch:' : 'Bacha Hai:'}</span>
                <span class="variance-val" style="color: ${isOverspent ? 'var(--danger)' : 'var(--success)'};">${fC(Math.abs(variance))} (${Math.round(pct)}%)</span>
            </div>
        `;
        budgetCatList.appendChild(pItem);
    });
}

function renderCategoryChart(dataObj) {
    const ctx = document.getElementById('categoryChart').getContext('2d');
    if (categoryChartInstance) categoryChartInstance.destroy();

    const labels = Object.keys(dataObj);
    const datasetData = Object.values(dataObj);
    const colors = labels.map(l => state.categoriesConfig[l].color);
    const hasData = datasetData.some(v => v > 0);

    if (!hasData) {
        categoryChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['No Data'],
                datasets: [{ data: [1], backgroundColor: ['#e2e8f0'], borderWidth: 0 }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { enabled: false } }
            }
        });
        return;
    }

    categoryChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{ data: datasetData, backgroundColor: colors, borderColor: '#ffffff', borderWidth: 2 }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { boxWidth: 10, font: { family: 'Plus Jakarta Sans', size: 10 } }
                }
            }
        }
    });
}

function renderTrendChart(txList, startDate, endDate) {
    const ctx = document.getElementById('trendChart').getContext('2d');
    if (trendChartInstance) trendChartInstance.destroy();

    const diffDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    let labels = [];
    let dataMap = {};

    if (diffDays <= 31) {
        const dateWalker = new Date(startDate);
        while (dateWalker <= endDate) {
            const key = dateWalker.toISOString().split('T')[0];
            const labelStr = dateWalker.getDate() + ' ' + dateWalker.toLocaleString('en-US', { month: 'short' });
            labels.push({ key, labelStr });
            dataMap[key] = 0;
            dateWalker.setDate(dateWalker.getDate() + 1);
        }
        txList.forEach(tx => {
            if (dataMap[tx.date] !== undefined) dataMap[tx.date] += Number(tx.amount);
        });
    } else {
        const dateWalker = new Date(startDate);
        for (let i = 0; i < 12; i++) {
            const m = dateWalker.getMonth();
            const y = dateWalker.getFullYear();
            const key = `${y}-${String(m + 1).padStart(2, '0')}`;
            const labelStr = dateWalker.toLocaleString('en-US', { month: 'short' }) + ' ' + String(y).slice(-2);
            labels.push({ key, labelStr });
            dataMap[key] = 0;
            dateWalker.setMonth(dateWalker.getMonth() + 1);
            if (dateWalker > endDate) break;
        }
        txList.forEach(tx => {
            const txDate = new Date(tx.date);
            const key = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
            if (dataMap[key] !== undefined) dataMap[key] += Number(tx.amount);
        });
    }

    const chartLabels = labels.map(l => l.labelStr);
    const chartData = labels.map(l => dataMap[l.key]);

    trendChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartLabels,
            datasets: [{
                label: 'Expenses',
                data: chartData,
                borderColor: '#0d9488',
                backgroundColor: 'rgba(13, 148, 136, 0.05)',
                borderWidth: 2,
                fill: true,
                tension: 0.3,
                pointBackgroundColor: '#0d9488',
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    grid: { color: 'rgba(15, 23, 42, 0.04)' },
                    ticks: {
                        font: { family: 'Plus Jakarta Sans', size: 9 },
                        callback: function(value) { return '₹' + value.toLocaleString('en-IN'); }
                    }
                },
                x: { grid: { display: false }, ticks: { font: { family: 'Plus Jakarta Sans', size: 9 } } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

// CLIENTS PAGE RENDERER
function renderClientsPage() {
    const container = document.getElementById('clients-list-container');
    container.innerHTML = '';
    const fC = v => '₹' + Math.round(v).toLocaleString('en-IN');

    if (state.clients.length === 0) {
        container.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">No clients added.</div>`;
    } else {
        state.clients.forEach(client => {
            const stats = getClientReportStats(client.id);
            const isCompleted = stats.balanceReceivable <= 0;
            const receivableClass = isCompleted ? 'receivable-complete' : 'receivable-active';
            const receivableText = isCompleted ? 'Fully Received' : fC(stats.balanceReceivable);

            let customFieldsHTML = '';
            state.customClientFields.forEach(field => {
                const val = client[field.name] || '-';
                customFieldsHTML += `
                    <div class="c-stat-row">
                        <span class="c-stat-label">${field.name}:</span>
                        <span class="c-stat-val">${val}</span>
                    </div>
                `;
            });

            const card = document.createElement('div');
            card.className = 'client-card';
            card.innerHTML = `
                <div class="client-card-header">
                    <h4>${client.name}</h4>
                    <span class="badge">Active Retainer</span>
                </div>
                <div class="client-stats">
                    <div class="c-stat-row">
                        <span class="c-stat-label">Monthly Retainer:</span>
                        <span class="c-stat-val">${fC(client.monthlyPay)}</span>
                    </div>
                    <div class="c-stat-row">
                        <span class="c-stat-label">Yearly Contract:</span>
                        <span class="c-stat-val">${fC(stats.yearlyContract)}</span>
                    </div>
                    <div class="c-stat-row">
                        <span class="c-stat-label">Received Amount:</span>
                        <span class="c-stat-val" style="color:var(--success);">${fC(stats.totalReceived)}</span>
                    </div>
                    <div class="c-stat-row" style="border-top:1px dashed var(--border-color); padding-top:6px; margin-top:2px;">
                        <span class="c-stat-label" style="font-weight:600;">Balance Receivable:</span>
                        <span class="c-stat-val ${receivableClass}">${receivableText}</span>
                    </div>
                    ${customFieldsHTML}
                </div>
                <div class="client-card-footer" style="display: var(--staff-access-display, inline-flex);">
                    <button class="btn-icon-only edit-btn" onclick="openEditClient('${client.id}')"><i data-lucide="edit-3"></i></button>
                    <button class="btn-icon-only delete-btn" onclick="deleteClient('${client.id}')"><i data-lucide="trash-2"></i></button>
                </div>
            `;
            container.appendChild(card);
        });
    }

    renderIncomeLogsTable();
}

function renderIncomeLogsTable() {
    const trHeaders = document.getElementById('income-table-headers');
    trHeaders.innerHTML = `
        <th>Client Name</th>
        <th>Received Date</th>
        <th>Destination Account</th>
        <th>Amount</th>
    `;
    state.customClientFields.forEach(f => {
        trHeaders.innerHTML += `<th>${f.name}</th>`;
    });
    trHeaders.innerHTML += `<th class="actions-col" style="display: var(--staff-access-display, table-cell);">Actions</th>`;

    const tbody = document.getElementById('income-logs-tbody');
    tbody.innerHTML = '';
    const sorted = [...state.incomeLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (sorted.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${5 + state.customClientFields.length}" style="text-align:center; color:var(--text-muted); padding:24px;">No income logged.</td></tr>`;
        return;
    }

    sorted.forEach(log => {
        const client = state.clients.find(c => c.id === log.clientId);
        const clientName = client ? client.name : 'Unknown Client';
        
        let customCells = '';
        state.customClientFields.forEach(f => {
            const val = log[f.name] || '-';
            customCells += `<td>${val}</td>`;
        });

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight:600;">${clientName}</td>
            <td>${formatDbDate(log.date)}</td>
            <td><span class="badge-acctype">${log.mode}</span></td>
            <td style="font-weight:700; color:var(--success);">+₹${Number(log.amount).toLocaleString('en-IN')}</td>
            ${customCells}
            <td class="actions-col" style="display: var(--staff-access-display, table-cell);">
                <div class="actions-wrapper">
                    <button class="btn-icon-only edit-btn" onclick="openEditIncome('${log.id}')"><i data-lucide="edit-3"></i></button>
                    <button class="btn-icon-only delete-btn" onclick="deleteIncome('${log.id}')"><i data-lucide="trash-2"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    lucide.createIcons();
}

// EXPENSES PAGE RENDERER
function renderExpensesPage() {
    const trHeaders = document.getElementById('expense-table-headers');
    trHeaders.innerHTML = `
        <th>Date</th>
        <th>Description</th>
        <th>Category</th>
        <th>Paid From Account</th>
        <th>Fund Source Client</th>
        <th>Amount</th>
    `;
    state.customTxFields.forEach(f => {
        trHeaders.innerHTML += `<th>${f.name}</th>`;
    });
    trHeaders.innerHTML += `<th class="actions-col">Actions</th>`;

    const tbody = document.getElementById('expenses-tbody');
    tbody.innerHTML = '';
    const sorted = [...state.transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (sorted.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${7 + state.customTxFields.length}" style="text-align:center; color:var(--text-muted); padding:32px;">No expense entries logged.</td></tr>`;
        return;
    }

    sorted.forEach(tx => {
        const client = state.clients.find(c => c.id === tx.clientId);
        const clientLabel = client ? client.name : '<span style="color:var(--text-muted); font-style:italic;">General</span>';
        
        let customCells = '';
        state.customTxFields.forEach(f => {
            const val = tx[f.name] || '-';
            customCells += `<td>${val}</td>`;
        });

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${formatDbDate(tx.date)}</td>
            <td style="font-weight:600;">${tx.description}</td>
            <td><span class="cat-pill" style="background:${state.categoriesConfig[tx.category]?.color || '#64748b'}">${tx.category}</span></td>
            <td><span class="badge-acctype">${tx.mode}</span></td>
            <td>${clientLabel}</td>
            <td style="font-weight:700;">-₹${Number(tx.amount).toLocaleString('en-IN')}</td>
            ${customCells}
            <td class="actions-col">
                <div class="actions-wrapper">
                    <button class="btn-icon-only edit-btn" onclick="openEditExpense('${tx.id}')"><i data-lucide="edit-3"></i></button>
                    <button class="btn-icon-only delete-btn" style="display: var(--staff-access-display, inline-flex);" onclick="deleteExpense('${tx.id}')"><i data-lucide="trash-2"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    lucide.createIcons();
}

// REPORTS PAGE RENDERER
function renderReportsPage() {
    const clientSelect = document.getElementById('report-client-select');
    clientSelect.innerHTML = '';
    if (state.clients.length === 0) {
        clientSelect.innerHTML = '<option value="">No clients registered</option>';
    } else {
        state.clients.forEach(c => {
            clientSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
        });
    }

    const ledgerSelect = document.getElementById('ledger-account-select');
    ledgerSelect.innerHTML = '';
    state.accounts.forEach(acc => {
        ledgerSelect.innerHTML += `<option value="${acc.id}">${acc.name} (${acc.type})</option>`;
    });

    if (state.selectedLedgerAccountId) {
        ledgerSelect.value = state.selectedLedgerAccountId;
    } else if (state.accounts.length > 0) {
        state.selectedLedgerAccountId = state.accounts[0].id;
        ledgerSelect.value = state.selectedLedgerAccountId;
    }

    setReportType(state.activeReportTab);
}

function renderReportSubScreen(type) {
    if (type === 'client') {
        const clientVal = document.getElementById('report-client-select').value;
        renderClientReportDetails(clientVal);
    } else if (type === 'ledger') {
        renderAccountLedgerDetails();
    } else if (type === 'budget') {
        renderBudgetAnalysisReport();
    }
}

function renderClientReportDetails(clientId) {
    const statsContainer = document.getElementById('client-report-stats-grid');
    const tableBody = document.getElementById('client-expenses-tbody');
    const progressList = document.getElementById('client-category-progress');
    
    statsContainer.innerHTML = '';
    tableBody.innerHTML = '';
    progressList.innerHTML = '';

    if (!clientId) {
        statsContainer.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">Please select a client to view reports.</div>`;
        return;
    }

    const stats = getClientReportStats(clientId);
    const fC = v => '₹' + Math.round(v).toLocaleString('en-IN');

    statsContainer.innerHTML = `
        <div class="report-stat-card val-primary">
            <h5>Retainer Total (Yearly)</h5>
            <span class="val">${fC(stats.yearlyContract)}</span>
        </div>
        <div class="report-stat-card val-success">
            <h5>Total Received</h5>
            <span class="val">${fC(stats.totalReceived)}</span>
        </div>
        <div class="report-stat-card val-danger">
            <h5>Spent (Allocated)</h5>
            <span class="val">${fC(stats.totalSpent)}</span>
        </div>
        <div class="report-stat-card val-primary">
            <h5>Client Balance</h5>
            <span class="val" style="color: ${stats.balance >= 0 ? 'var(--success)' : 'var(--danger)'};">${fC(stats.balance)}</span>
        </div>
    `;

    const clientTx = state.transactions.filter(t => t.clientId === clientId);
    const catTotals = {};
    Object.keys(state.categoriesConfig).forEach(cat => catTotals[cat] = 0);
    clientTx.forEach(t => {
        if (catTotals[t.category] !== undefined) catTotals[t.category] += Number(t.amount);
    });

    Object.keys(state.categoriesConfig).forEach(cat => {
        const amt = catTotals[cat];
        const pct = stats.totalSpent > 0 ? (amt / stats.totalSpent) * 100 : 0;
        const color = state.categoriesConfig[cat].color;

        const pItem = document.createElement('div');
        pItem.innerHTML = `
            <div class="progress-item-label">
                <span>${cat}</span>
                <span>${fC(amt)} (${Math.round(pct)}%)</span>
            </div>
            <div class="progress-bar-bg">
                <div class="progress-bar-fill" style="width: ${pct}%; background-color: ${color};"></div>
            </div>
        `;
        progressList.appendChild(pItem);
    });

    if (clientTx.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 20px;">No expenses linked to this client.</td></tr>`;
    } else {
        const sorted = [...clientTx].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        sorted.forEach(tx => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${formatDbDate(tx.date)}</td>
                <td style="font-weight:600;">${tx.description}</td>
                <td><span class="cat-pill" style="font-size:10px; padding:2px 6px; background:${state.categoriesConfig[tx.category]?.color || '#64748b'}">${tx.category}</span></td>
                <td>${tx.mode}</td>
                <td style="font-weight:700;">-₹${Number(tx.amount).toLocaleString('en-IN')}</td>
            `;
            tableBody.appendChild(tr);
        });
    }
}

function renderAccountLedgerDetails() {
    const tbody = document.getElementById('account-ledger-tbody');
    tbody.innerHTML = '';
    
    const accId = state.selectedLedgerAccountId;
    if (!accId) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:24px;">Please select an account.</td></tr>`;
        return;
    }

    const ledger = getAccountLedger(accId);
    const fC = v => '₹' + Math.round(v).toLocaleString('en-IN');
    const closingBal = ledger.length > 0 ? ledger[ledger.length - 1].balance : 0;
    
    document.getElementById('selected-ledger-closing-balance').innerText = fC(closingBal);

    if (ledger.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:32px;">No transactions logged in this account book.</td></tr>`;
        return;
    }

    ledger.forEach(row => {
        const deb = row.debit > 0 ? `+${fC(row.debit)}` : '-';
        const cre = row.credit > 0 ? `-${fC(row.credit)}` : '-';
        const balanceColor = row.balance < 0 ? 'color: var(--danger);' : '';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${formatDbDate(row.date)}</td>
            <td style="font-weight:600;">${row.particulars}</td>
            <td><span style="font-size:11px; color:var(--text-secondary);">${row.category}</span></td>
            <td class="text-right debit-amt">${deb}</td>
            <td class="text-right credit-amt">${cre}</td>
            <td class="text-right bal-amt" style="${balanceColor}">${fC(row.balance)}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderBudgetAnalysisReport() {
    const tbody = document.getElementById('budget-analysis-tbody');
    tbody.innerHTML = '';
    const fC = v => '₹' + Math.round(v).toLocaleString('en-IN');

    const bounds = getPeriodFilterBounds();
    const periodTx = state.transactions.filter(tx => {
        const d = new Date(tx.date);
        return d >= bounds.start && d <= bounds.end;
    });

    const diffDays = Math.ceil(Math.abs(bounds.end - bounds.start) / (1000 * 60 * 60 * 24));
    let scaleMonths = 12;
    if (state.selectedPeriod === 'this-month') scaleMonths = 1;
    else if (state.selectedPeriod === 'this-quarter') scaleMonths = 3;
    else if (state.selectedPeriod === 'custom') scaleMonths = Math.max(1, Math.round(diffDays / 30));

    Object.keys(state.categoriesConfig).forEach(cat => {
        const monthlyB = Number(state.budgets[cat]) || 0;
        const targetBudget = monthlyB * scaleMonths;
        const actualSpent = periodTx.filter(t => t.category === cat).reduce((sum, t) => sum + Number(t.amount), 0);
        const variance = targetBudget - actualSpent;
        const isOverspent = actualSpent > targetBudget;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight:600;">${cat}</td>
            <td class="text-right">${fC(monthlyB)}</td>
            <td class="text-right" style="font-weight:500;">${fC(targetBudget)}</td>
            <td class="text-right" style="font-weight:600;">${fC(actualSpent)}</td>
            <td class="text-right" style="color:var(--success); font-weight:600;">${variance >= 0 ? fC(variance) : '-'}</td>
            <td class="text-right" style="color:var(--danger); font-weight:600;">${isOverspent ? fC(Math.abs(variance)) : '-'}</td>
            <td>
                <span class="badge" style="background: ${isOverspent ? 'var(--danger-glow); color:var(--danger)' : 'var(--success-glow); color:var(--success)'}; font-size:11px; font-weight:600; padding:4px 10px; border-radius:10px;">
                    ${isOverspent ? 'Extra Kharch' : 'Bacha Hai'}
                </span>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// MASTER PAGE
function renderMasterPage() {
    // Hide Members tab header if Staff
    const membersTabHeader = document.getElementById('tab-master-members');
    if (state.currentUser && state.currentUser.role === 'Staff') {
        membersTabHeader.style.display = 'none';
        if (state.activeMasterTab === 'members') {
            state.activeMasterTab = 'accounts';
            saveState();
        }
    } else {
        membersTabHeader.style.display = 'inline-flex';
    }

    setMasterTab(state.activeMasterTab);
}

function renderMasterSubPanel(tabId) {
    if (tabId === 'accounts') {
        renderMasterAccounts();
    } else if (tabId === 'clients-config') {
        renderMasterClients();
    } else if (tabId === 'budgets') {
        renderMasterBudgetsEditor();
    } else if (tabId === 'columns') {
        renderMasterCustomColumns();
    } else if (tabId === 'members') {
        renderMasterMembers();
    } else if (tabId === 'cloud-sync') {
        renderMasterCloudSync();
    } else if (tabId === 'ai-developer') {
        renderMasterAIDeveloper();
    } else if (tabId === 'reset-app') {
        // Static reset panel
    }
}

function renderMasterCloudSync() {
    const card = document.getElementById('cloud-status-card');
    const iconWrapper = document.getElementById('cloud-status-icon');
    const title = document.getElementById('cloud-status-title');
    const desc = document.getElementById('cloud-status-desc');
    const activeActions = document.getElementById('cloud-active-actions');
    const saveBtn = document.getElementById('btn-cloud-save');

    if (state.cloudSyncEnabled && state.firebaseConfig) {
        card.classList.add('active');
        iconWrapper.innerHTML = '<i data-lucide="cloud-lightning" style="color: #ffffff;"></i>';
        title.innerText = 'Cloud Sync: Active & Connected';
        desc.innerText = 'Your ledger data is successfully synchronizing to Firebase in real-time.';
        activeActions.style.display = 'flex';
        saveBtn.innerText = 'Update Cloud Config';
        
        // Populate inputs if they are empty
        document.getElementById('cloud-api-key').value = state.firebaseConfig.apiKey || '';
        document.getElementById('cloud-auth-domain').value = state.firebaseConfig.authDomain || '';
        document.getElementById('cloud-project-id').value = state.firebaseConfig.projectId || '';
        document.getElementById('cloud-storage-bucket').value = state.firebaseConfig.storageBucket || '';
        document.getElementById('cloud-messaging-sender-id').value = state.firebaseConfig.messagingSenderId || '';
        document.getElementById('cloud-app-id').value = state.firebaseConfig.appId || '';
    } else {
        card.classList.remove('active');
        iconWrapper.innerHTML = '<i data-lucide="cloud-off"></i>';
        title.innerText = 'Cloud Sync: Disabled';
        desc.innerText = 'Your ledger data is currently stored locally in this browser. Configure Firebase below to sync across devices.';
        activeActions.style.display = 'none';
        saveBtn.innerText = 'Enable & Sync Cloud';
    }
    

    
    lucide.createIcons();
}

function renderMasterAIDeveloper() {
    const tokenInput = document.getElementById('github-token');
    const repoInput = document.getElementById('github-repo');
    const branchInput = document.getElementById('github-branch');

    if (tokenInput) tokenInput.value = state.githubToken || '';
    if (repoInput) repoInput.value = state.githubRepo || '';
    if (branchInput) branchInput.value = state.githubBranch || 'main';

    lucide.createIcons();
}

function handleGithubConfigSubmit(e) {
    e.preventDefault();
    const token = document.getElementById('github-token').value.trim();
    const repo = document.getElementById('github-repo').value.trim();
    const branch = document.getElementById('github-branch').value.trim();

    state.githubToken = token || null;
    state.githubRepo = repo || null;
    state.githubBranch = branch || 'main';
    saveState();
    alert("GitHub configuration saved successfully!");
}

function logDeployProgress(message, isError = false) {
    const logDiv = document.getElementById('github-deploy-log');
    if (!logDiv) return;
    const time = new Date().toLocaleTimeString();
    const prefix = isError ? '[ERROR]' : '[INFO]';
    const color = isError ? 'var(--danger)' : 'var(--text-primary)';
    const line = `<span style="color: ${color};">[${time}] ${prefix} ${message}</span>\n`;
    logDiv.innerHTML += line;
    logDiv.scrollTop = logDiv.scrollHeight;
}

function utf8ToBase64(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (m, p1) => String.fromCharCode(parseInt(p1, 16))));
}

async function deployAppToGitHub() {
    const logBox = document.getElementById('github-deploy-log-box');
    const logDiv = document.getElementById('github-deploy-log');
    const deployBtn = document.getElementById('btn-github-deploy-now');
    
    if (location.protocol === 'file:') {
        alert("Cannot deploy when running via file:// protocol. Please start the local python server (python server.py) and open http://localhost:8000/ to deploy files.");
        return;
    }

    if (!state.githubToken || !state.githubRepo) {
        alert("Please save your GitHub Personal Access Token and Repository owner/name settings first.");
        return;
    }

    if (logBox) logBox.style.display = 'flex';
    if (logDiv) logDiv.innerHTML = '';
    
    if (deployBtn) {
        deployBtn.disabled = true;
        deployBtn.innerHTML = '<span class="spinner" style="margin-right:6px;"></span> Deploying...';
    }

    logDeployProgress("Starting deployment process...");

    const filesToDeploy = [
        { name: 'index.html', required: true },
        { name: 'app.js', required: true },
        { name: 'shree_v2.js', required: true },
        { name: 'style.css', required: true },
        { name: 'server.py', required: false },
        { name: 'README.md', required: false }
    ];

    const ownerRepo = state.githubRepo.replace(/^\/|\/$/g, '');
    const token = state.githubToken;
    const branch = state.githubBranch || 'main';
    const userCommitMsg = document.getElementById('github-commit-message').value.trim();
    const commitMessage = userCommitMsg || `Update via Wealth Plus AI Developer (${new Date().toLocaleString()})`;

    try {
        for (const file of filesToDeploy) {
            const filename = file.name;
            const isRequired = file.required;
            logDeployProgress(`Fetching local file: ${filename}...`);
            let fileContentText = '';
            try {
                const localFetch = await fetch(`${filename}?cb=${Date.now()}`);
                if (!localFetch.ok) {
                    throw new Error(`Failed to fetch ${filename} from local server (Status: ${localFetch.status})`);
                }
                fileContentText = await localFetch.text();
            } catch (err) {
                if (isRequired) {
                    logDeployProgress(`Local fetch error for ${filename}: ${err.message}`, true);
                    continue;
                } else {
                    logDeployProgress(`[WARNING] Optional file ${filename} skipped: ${err.message}`);
                    continue;
                }
            }

            logDeployProgress(`Checking file existence in GitHub repo: ${filename}...`);
            let currentSha = null;
            try {
                const checkUrl = `https://api.github.com/repos/${ownerRepo}/contents/${filename}?ref=${branch}`;
                const checkResponse = await fetch(checkUrl, {
                    method: 'GET',
                    headers: {
                        'Authorization': `token ${token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });

                if (checkResponse.ok) {
                    const checkData = await checkResponse.json();
                    currentSha = checkData.sha;
                    logDeployProgress(`Found existing file on GitHub (SHA: ${currentSha.substring(0, 7)})`);
                } else if (checkResponse.status === 404) {
                    logDeployProgress(`File ${filename} does not exist in GitHub yet. Creating new file.`);
                } else {
                    const checkErr = await checkResponse.json();
                    logDeployProgress(`GitHub check failed for ${filename}: ${checkErr.message || checkResponse.statusText}. Attempting creation anyway.`, true);
                }
            } catch (err) {
                logDeployProgress(`Error checking existence of ${filename}: ${err.message}. Attempting creation.`, true);
            }

            logDeployProgress(`Encoding ${filename} to Base64...`);
            let base64Content = '';
            try {
                base64Content = utf8ToBase64(fileContentText);
            } catch (err) {
                logDeployProgress(`Base64 encoding error for ${filename}: ${err.message}`, true);
                continue;
            }

            logDeployProgress(`Uploading/Committing ${filename} to GitHub...`);
            try {
                const putUrl = `https://api.github.com/repos/${ownerRepo}/contents/${filename}`;
                const bodyObj = {
                    message: commitMessage,
                    content: base64Content,
                    branch: branch
                };
                if (currentSha) {
                    bodyObj.sha = currentSha;
                }

                const putResponse = await fetch(putUrl, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `token ${token}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(bodyObj)
                });

                if (putResponse.ok) {
                    logDeployProgress(`Successfully deployed ${filename}!`, false);
                } else {
                    const putErr = await putResponse.json();
                    throw new Error(putErr.message || `Status: ${putResponse.status}`);
                }
            } catch (err) {
                logDeployProgress(`Upload failed for ${filename}: ${err.message}`, true);
            }
        }

        logDeployProgress("Deployment process completed!");
    } catch (globalErr) {
        logDeployProgress(`Critical Deployment Failure: ${globalErr.message}`, true);
    } finally {
        if (deployBtn) {
            deployBtn.disabled = false;
            deployBtn.innerHTML = '<i data-lucide="upload-cloud"></i> Deploy App Now';
            lucide.createIcons();
        }
    }
}

function renderMasterAccounts() {
    const tbody = document.getElementById('master-accounts-tbody');
    tbody.innerHTML = '';
    const fC = v => '₹' + Math.round(v).toLocaleString('en-IN');

    state.accounts.forEach(acc => {
        const ledger = getAccountLedger(acc.id);
        const closingBal = ledger.length > 0 ? ledger[ledger.length - 1].balance : 0;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight:600;">${acc.name}</td>
            <td><span class="badge-acctype">${acc.type} Book</span></td>
            <td style="font-weight:700; color: ${closingBal < 0 ? 'var(--danger)' : 'var(--text-primary)'};">${fC(closingBal)}</td>
            <td class="actions-col">
                <div class="actions-wrapper">
                    <button class="btn-icon-only edit-btn" onclick="openEditAccount('${acc.id}')"><i data-lucide="edit-3"></i></button>
                    <button class="btn-icon-only delete-btn" onclick="deleteAccount('${acc.id}')"><i data-lucide="trash-2"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    lucide.createIcons();
}

function renderMasterClients() {
    const tbody = document.getElementById('master-clients-tbody');
    tbody.innerHTML = '';
    const fC = v => '₹' + Math.round(v).toLocaleString('en-IN');

    state.clients.forEach(client => {
        const yearly = client.monthlyPay * 12;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight:600;">${client.name}</td>
            <td>${fC(client.monthlyPay)}</td>
            <td style="font-weight:500;">${fC(yearly)}</td>
            <td class="actions-col">
                <div class="actions-wrapper">
                    <button class="btn-icon-only edit-btn" onclick="openEditClient('${client.id}')"><i data-lucide="edit-3"></i></button>
                    <button class="btn-icon-only delete-btn" onclick="deleteClient('${client.id}')"><i data-lucide="trash-2"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    lucide.createIcons();
}

function renderMasterBudgetsEditor() {
    const container = document.getElementById('budget-inputs-container');
    if (!container) return;
    container.innerHTML = '';

    Object.keys(state.categoriesConfig).forEach(cat => {
        const val = state.budgets[cat] || 0;
        const color = state.categoriesConfig[cat].color || '#64748b';
        const isOthers = false;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div style="display:flex; align-items:center; gap:8px;">
                    <span class="cat-pill" style="background:${color}; padding: 4px 8px; border-radius: 4px; color: white; font-weight: 500; font-size: 12px;">${cat}</span>
                </div>
            </td>
            <td>
                <input type="color" class="color-picker-input" value="${color}" data-cat="${cat}" style="width:40px; height:28px; border:none; padding:0; background:transparent; cursor:pointer;">
            </td>
            <td>
                <div class="form-group" style="margin-bottom:0; display:flex; align-items:center; gap:8px;">
                    <input type="number" name="${cat}" min="0" value="${val}" required style="padding:6px 10px; font-size:13px; width:100%; max-width:120px;" placeholder="e.g. 5000">
                    <span class="field-helper-text" style="font-size:11px; color:var(--text-secondary); white-space:nowrap;">Yearly: ₹${(val * 12).toLocaleString('en-IN')}</span>
                </div>
            </td>
            <td style="text-align:right;">
                <div class="table-actions" style="display:flex; justify-content:flex-end; gap:8px;">
                    <button type="button" class="btn-icon-only edit-btn" onclick="renameCategoryPrompt('${cat}')" title="Rename Head" style="padding:6px; cursor:pointer;"><i data-lucide="edit-3"></i></button>
                    ${isOthers ? '' : `<button type="button" class="btn-icon-only delete-btn" onclick="deleteCategoryPrompt('${cat}')" title="Delete Head" style="padding:6px; cursor:pointer;"><i data-lucide="trash-2"></i></button>`}
                </div>
            </td>
        `;
        
        tr.querySelector('input[type="number"]').addEventListener('input', function() {
            const v = Number(this.value) || 0;
            tr.querySelector('.field-helper-text').innerText = `Yearly: ₹${(v * 12).toLocaleString('en-IN')}`;
        });
        
        container.appendChild(tr);
    });
    
    lucide.createIcons();
}

function populateCategoryDropdowns() {
    const dropdown = document.getElementById('expense-category');
    if (!dropdown) return;
    
    const currentVal = dropdown.value;
    dropdown.innerHTML = '';
    
    Object.keys(state.categoriesConfig).forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.innerText = cat;
        dropdown.appendChild(option);
    });
    
    if (currentVal && state.categoriesConfig[currentVal]) {
        dropdown.value = currentVal;
    }
}

function saveCurrentBudgetsFromUI() {
    const form = document.getElementById('form-category-budgets');
    if (!form) return;
    const colorPickers = form.querySelectorAll('.color-picker-input');
    colorPickers.forEach(picker => {
        const cat = picker.getAttribute('data-cat');
        const color = picker.value;
        if (state.categoriesConfig[cat]) {
            state.categoriesConfig[cat].color = color;
        }
    });

    Object.keys(state.categoriesConfig).forEach(cat => {
        const input = form.querySelector(`input[name="${cat}"]`);
        if (input) {
            state.budgets[cat] = Number(input.value) || 0;
        }
    });
}

function addCategoryPrompt() {
    const catName = prompt("Enter new category (head) name:");
    if (!catName) return;
    const cleanCatName = catName.trim();
    if (!cleanCatName) return;

    const exists = Object.keys(state.categoriesConfig).some(c => c.toLowerCase() === cleanCatName.toLowerCase());
    if (exists) {
        alert(`Category "${cleanCatName}" already exists.`);
        return;
    }

    saveCurrentBudgetsFromUI();

    const colors = ['#f59e0b', '#ec4899', '#3b82f6', '#06b6d4', '#8b5cf6', '#10b981', '#ef4444', '#6366f1'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    state.categoriesConfig[cleanCatName] = {
        color: randomColor,
        icon: 'tag'
    };
    state.budgets[cleanCatName] = 0;

    saveStateLocalOnly();
    if (state.cloudSyncEnabled) {
        firebaseWriteSettings();
    }

    renderPage('master');
}

function renameCategoryPrompt(oldCat) {
    const newCat = prompt(`Enter new name for category "${oldCat}":`, oldCat);
    if (!newCat) return;
    const cleanNewCat = newCat.trim();
    if (!cleanNewCat) return;

    if (cleanNewCat.toLowerCase() === oldCat.toLowerCase()) {
        return;
    }

    if (state.categoriesConfig[cleanNewCat]) {
        alert(`Category "${cleanNewCat}" already exists.`);
        return;
    }

    if (!confirm(`Are you sure you want to rename category "${oldCat}" to "${cleanNewCat}"? This will update all existing transactions in this category.`)) {
        return;
    }

    saveCurrentBudgetsFromUI();

    const catConfig = state.categoriesConfig[oldCat];
    state.categoriesConfig[cleanNewCat] = catConfig;
    delete state.categoriesConfig[oldCat];

    state.budgets[cleanNewCat] = state.budgets[oldCat] || 0;
    delete state.budgets[oldCat];

    let updatedTxCount = 0;
    state.transactions.forEach(tx => {
        if (tx.category === oldCat) {
            tx.category = cleanNewCat;
            updatedTxCount++;
            if (state.cloudSyncEnabled && firebaseDb) {
                firebaseWrite('transactions', tx.id, tx);
            }
        }
    });

    saveStateLocalOnly();
    if (state.cloudSyncEnabled) {
        firebaseWriteSettings();
    }

    alert(`Successfully renamed category and updated ${updatedTxCount} transactions.`);
    renderPage('master');
}

function deleteCategoryPrompt(cat) {
    const categoriesCount = Object.keys(state.categoriesConfig).length;
    if (categoriesCount <= 1) {
        alert("You must keep at least one category.");
        return;
    }

    const remainingCats = Object.keys(state.categoriesConfig).filter(c => c !== cat);
    const fallbackCat = remainingCats[0] || 'Others';

    if (!confirm(`Are you sure you want to delete category "${cat}"? All existing transactions in this category will be re-categorized as "${fallbackCat}".`)) {
        return;
    }

    saveCurrentBudgetsFromUI();

    delete state.categoriesConfig[cat];
    delete state.budgets[cat];

    let updatedTxCount = 0;
    state.transactions.forEach(tx => {
        if (tx.category === cat) {
            tx.category = fallbackCat;
            updatedTxCount++;
            if (state.cloudSyncEnabled && firebaseDb) {
                firebaseWrite('transactions', tx.id, tx);
            }
        }
    });

    saveStateLocalOnly();
    if (state.cloudSyncEnabled) {
        firebaseWriteSettings();
    }

    alert(`Successfully deleted category "${cat}" and moved ${updatedTxCount} transactions to "${fallbackCat}".`);
    renderPage('master');
}

function renderMasterCustomColumns() {
    const clientList = document.getElementById('client-custom-fields-list');
    clientList.innerHTML = '';
    if (state.customClientFields.length === 0) {
        clientList.innerHTML = '<div style="font-size:12px; color:var(--text-muted); padding:10px;">No custom client columns added.</div>';
    } else {
        state.customClientFields.forEach(f => {
            const badge = document.createElement('div');
            badge.className = 'custom-field-badge';
            badge.innerHTML = `
                <span>${f.name} (${f.type})</span>
                <button onclick="deleteCustomField('client', '${f.id}')" title="Delete Column"><i data-lucide="trash-2"></i></button>
            `;
            clientList.appendChild(badge);
        });
    }

    const txList = document.getElementById('tx-custom-fields-list');
    txList.innerHTML = '';
    if (state.customTxFields.length === 0) {
        txList.innerHTML = '<div style="font-size:12px; color:var(--text-muted); padding:10px;">No custom transaction columns added.</div>';
    } else {
        state.customTxFields.forEach(f => {
            const badge = document.createElement('div');
            badge.className = 'custom-field-badge';
            badge.innerHTML = `
                <span>${f.name} (${f.type})</span>
                <button onclick="deleteCustomField('transaction', '${f.id}')" title="Delete Column"><i data-lucide="trash-2"></i></button>
            `;
            txList.appendChild(badge);
        });
    }
    lucide.createIcons();
}

function renderMasterMembers() {
    const tbody = document.getElementById('master-members-tbody');
    tbody.innerHTML = '';

    state.members.forEach(member => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight:600;">${member.name}</td>
            <td>${member.mobile}</td>
            <td><code style="font-weight:600; background:var(--bg-tertiary); padding:2px 6px; border-radius:4px;">${member.pin}</code></td>
            <td><span class="badge" style="background: ${member.role === 'Admin' ? 'var(--primary-glow); color:var(--primary);' : 'var(--bg-tertiary); color:var(--text-secondary);'}; font-size:11px; padding:3px 8px; font-weight:600; border-radius:10px;">${member.role}</span></td>
            <td class="actions-col">
                <div class="actions-wrapper">
                    <button class="btn-icon-only edit-btn" onclick="openEditMember('${member.id}')" title="Edit Member"><i data-lucide="edit-3"></i></button>
                    <button class="btn-icon-only delete-btn" onclick="deleteMember('${member.id}')" title="Delete Member"><i data-lucide="trash-2"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    lucide.createIcons();
}

// --- 7. EVENT BINDINGS ---

function initEventHandlers() {
    // Navigation Page Link bindings
    document.querySelectorAll('.menu-item, .bottom-nav-item').forEach(el => {
        el.addEventListener('click', function(e) {
            e.preventDefault();
            navigateToPage(this.getAttribute('data-page'));
        });
    });

    // Top Bar Period selector
    document.getElementById('period-selector').addEventListener('change', function() {
        state.selectedPeriod = this.value;
        const customBox = document.getElementById('custom-date-inputs');
        if (this.value === 'custom') {
            customBox.style.display = 'flex';
            const today = new Date();
            const y = today.getFullYear();
            const m = String(today.getMonth() + 1).padStart(2, '0');
            const d = String(today.getDate()).padStart(2, '0');
            document.getElementById('custom-start-date').value = `${y}-${m}-01`;
            document.getElementById('custom-end-date').value = `${y}-${m}-${d}`;
            state.customStartDate = `${y}-${m}-01`;
            state.customEndDate = `${y}-${m}-${d}`;
        } else {
            customBox.style.display = 'none';
        }
        saveState();
        renderPage(state.activePage);
    });

    // Custom Dates
    document.getElementById('custom-start-date').addEventListener('change', function() {
        state.customStartDate = this.value;
        saveState();
        renderPage(state.activePage);
    });
    document.getElementById('custom-end-date').addEventListener('change', function() {
        state.customEndDate = this.value;
        saveState();
        renderPage(state.activePage);
    });

    // Dashboard Cards click mappings
    document.getElementById('card-cash-balance').addEventListener('click', () => {
        navigateToPage('reports');
        setReportType('ledger');
        const cashAcc = state.accounts.find(a => a.type === 'Cash');
        if (cashAcc) {
            state.selectedLedgerAccountId = cashAcc.id;
            document.getElementById('ledger-account-select').value = cashAcc.id;
            saveState();
            renderAccountLedgerDetails();
        }
    });

    document.getElementById('card-bank-balance').addEventListener('click', () => {
        navigateToPage('reports');
        setReportType('ledger');
        const bankAcc = state.accounts.find(a => a.type === 'Bank');
        if (bankAcc) {
            state.selectedLedgerAccountId = bankAcc.id;
            document.getElementById('ledger-account-select').value = bankAcc.id;
            saveState();
            renderAccountLedgerDetails();
        }
    });

    document.getElementById('card-period-expenses').addEventListener('click', () => {
        navigateToPage('expenses');
    });

    document.getElementById('dash-view-all-tx').addEventListener('click', () => {
        navigateToPage('expenses');
    });

    // Reports sub-screens tabs
    document.querySelectorAll('.report-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            setReportType(this.getAttribute('data-report-type'));
        });
    });

    // Client select report
    document.getElementById('report-client-select').addEventListener('change', function() {
        renderClientReportDetails(this.value);
    });

    // Ledger selector report
    document.getElementById('ledger-account-select').addEventListener('change', function() {
        state.selectedLedgerAccountId = this.value;
        saveState();
        renderAccountLedgerDetails();
    });

    // Master settings sub-tabs bindings
    document.querySelectorAll('.master-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            setMasterTab(this.getAttribute('data-master-sub'));
        });
    });

    // Modals triggers
    document.getElementById('btn-add-client').addEventListener('click', () => openClientModal());
    document.getElementById('btn-close-client-modal').addEventListener('click', () => closeClientModal());
    document.getElementById('btn-cancel-client').addEventListener('click', () => closeClientModal());

    document.getElementById('btn-log-income').addEventListener('click', () => openIncomeModal());
    document.getElementById('btn-close-income-modal').addEventListener('click', () => closeIncomeModal());
    document.getElementById('btn-cancel-income').addEventListener('click', () => closeIncomeModal());

    document.getElementById('btn-add-expense').addEventListener('click', () => openExpenseModal());
    document.getElementById('btn-close-expense-modal').addEventListener('click', () => closeExpenseModal());
    document.getElementById('btn-cancel-expense').addEventListener('click', () => closeExpenseModal());

    document.getElementById('btn-master-add-account').addEventListener('click', () => openAccountModal());
    document.getElementById('btn-close-account-modal').addEventListener('click', () => closeAccountModal());
    document.getElementById('btn-cancel-account').addEventListener('click', () => closeAccountModal());

    document.getElementById('btn-add-client-field').addEventListener('click', () => openFieldModal('client'));
    document.getElementById('btn-add-tx-field').addEventListener('click', () => openFieldModal('transaction'));
    document.getElementById('btn-close-field-modal').addEventListener('click', () => closeFieldModal());
    document.getElementById('btn-cancel-field').addEventListener('click', () => closeFieldModal());

    document.getElementById('btn-master-add-member').addEventListener('click', () => openMemberModal());
    document.getElementById('btn-close-member-modal').addEventListener('click', () => closeMemberModal());
    document.getElementById('btn-cancel-member').addEventListener('click', () => closeMemberModal());

    // Client retainer preview
    document.getElementById('client-monthly-pay').addEventListener('input', function() {
        const v = Number(this.value) || 0;
        document.getElementById('yearly-calculation-preview').innerText = `Yearly Total: ₹${(v * 12).toLocaleString('en-IN')}`;
    });

    // Form Submissions
    document.getElementById('form-client').addEventListener('submit', handleClientSubmit);
    document.getElementById('form-income').addEventListener('submit', handleIncomeSubmit);
    document.getElementById('form-expense').addEventListener('submit', handleExpenseSubmit);
    document.getElementById('form-account').addEventListener('submit', handleAccountSubmit);
    document.getElementById('form-field').addEventListener('submit', handleFieldSubmit);
    document.getElementById('form-member').addEventListener('submit', handleMemberSubmit);
    document.getElementById('form-category-budgets').addEventListener('submit', handleCategoryBudgetsSubmit);

    // Login Form Submit
    document.getElementById('form-login').addEventListener('submit', handleLoginSubmit);
    
    // Logout Button Trigger
    document.getElementById('btn-logout').addEventListener('click', handleLogoutUser);

    // Excel Export trigger
    document.getElementById('btn-export-excel').addEventListener('click', exportToExcel);

    // Add Category Button Trigger
    const btnAddCategory = document.getElementById('btn-add-category');
    if (btnAddCategory) {
        btnAddCategory.addEventListener('click', addCategoryPrompt);
    }
}

// --- 8. MODALS CRUD LOGIC (MEMBERS SETUP & DYNAMIC COLUMNS) ---

// Member CRUD Modals
function openMemberModal(editId = '') {
    const modal = document.getElementById('modal-member');
    const title = document.getElementById('modal-member-title');
    const form = document.getElementById('form-member');
    form.reset();

    if (editId) {
        const member = state.members.find(m => m.id === editId);
        if (member) {
            title.innerText = 'Edit Registered Member';
            document.getElementById('edit-member-id').value = member.id;
            document.getElementById('member-name').value = member.name;
            document.getElementById('member-mobile').value = member.mobile;
            document.getElementById('member-pin').value = member.pin;
            document.getElementById('member-role').value = member.role;
        }
    } else {
        title.innerText = 'Add Registered Member';
        document.getElementById('edit-member-id').value = '';
    }
    modal.classList.add('active');
}

function closeMemberModal() {
    document.getElementById('modal-member').classList.remove('active');
}

function handleMemberSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('edit-member-id').value;
    const name = document.getElementById('member-name').value.trim();
    const mobile = document.getElementById('member-mobile').value.trim();
    const pin = document.getElementById('member-pin').value.trim();
    const role = document.getElementById('member-role').value;

    // Prevent duplicate mobile number
    if (state.members.some(m => m.mobile === mobile && m.id !== id)) {
        alert("A member with this mobile number is already registered.");
        return;
    }

    let memberObj = { name, mobile, pin, role };
    if (id) {
        memberObj.id = id;
    } else {
        memberObj.id = 'm_' + Date.now();
    }

    addMemberDirect(memberObj);
    closeMemberModal();
    renderPage('master');
}

window.openEditMember = function(id) {
    openMemberModal(id);
};

window.deleteMember = function(id) {
    if (state.members.filter(m => m.role === 'Admin').length <= 1 && state.members.find(m => m.id === id).role === 'Admin') {
        alert("You must keep at least one Admin profile in the system.");
        return;
    }
    if (confirm("Are you sure you want to delete this member? They will lose access to log in to the application.")) {
        // If deleting current logged-in user, force logout
        if (state.currentUser && state.currentUser.id === id) {
            state.currentUser = null;
            saveStateLocalOnly();
        }
        deleteMemberDirect(id);
        initLoginSession();
        renderPage(state.activePage);
    }
};

// Client CRUD
function openClientModal(editId = '') {
    const modal = document.getElementById('modal-client');
    const title = document.getElementById('modal-client-title');
    const form = document.getElementById('form-client');
    form.reset();

    const customContainer = document.getElementById('client-modal-custom-fields-container');
    customContainer.innerHTML = '';

    if (editId) {
        const client = state.clients.find(c => c.id === editId);
        if (client) {
            title.innerText = 'Edit Client Details';
            document.getElementById('edit-client-id').value = client.id;
            document.getElementById('client-name').value = client.name;
            document.getElementById('client-monthly-pay').value = client.monthlyPay;
            document.getElementById('yearly-calculation-preview').innerText = `Yearly Total: ₹${(Number(client.monthlyPay) * 12).toLocaleString('en-IN')}`;
            
            state.customClientFields.forEach(f => {
                const val = client[f.name] || '';
                customContainer.innerHTML += `
                    <div class="form-group">
                        <label for="custom-field-${f.name}">${f.name}</label>
                        <input type="${f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}" id="custom-field-${f.name}" name="${f.name}" value="${val}" placeholder="Enter ${f.name}...">
                    </div>
                `;
            });
        }
    } else {
        title.innerText = 'Add New Client';
        document.getElementById('edit-client-id').value = '';
        document.getElementById('yearly-calculation-preview').innerText = `Yearly Total: ₹0.00`;
        
        state.customClientFields.forEach(f => {
            customContainer.innerHTML += `
                <div class="form-group">
                    <label for="custom-field-${f.name}">${f.name}</label>
                    <input type="${f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}" id="custom-field-${f.name}" name="${f.name}" placeholder="Enter ${f.name}...">
                </div>
            `;
        });
    }
    modal.classList.add('active');
}

function closeClientModal() {
    document.getElementById('modal-client').classList.remove('active');
}

function handleClientSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('edit-client-id').value;
    const name = document.getElementById('client-name').value.trim();
    const monthlyPay = Number(document.getElementById('client-monthly-pay').value);

    let clientObj = { name, monthlyPay };

    state.customClientFields.forEach(f => {
        const val = document.getElementById(`custom-field-${f.name}`).value;
        clientObj[f.name] = f.type === 'number' ? Number(val) : val;
    });

    if (id) {
        clientObj.id = id;
    } else {
        clientObj.id = 'c_' + Date.now();
    }

    addClientDirect(clientObj);
    closeClientModal();
    renderPage(state.activePage);
}

window.openEditClient = function(id) {
    openClientModal(id);
};

window.deleteClient = function(id) {
    if (confirm("Are you sure you want to delete this client? Linked records will not be deleted, but client name references will display as general/unknown.")) {
        deleteClientDirect(id);
        renderPage(state.activePage);
    }
};

// Income logs
function openIncomeModal(editId = '') {
    const modal = document.getElementById('modal-income');
    const title = document.getElementById('modal-income-title');
    const form = document.getElementById('form-income');
    const clientSelect = document.getElementById('income-client-select');
    const accSelect = document.getElementById('income-account-select');
    form.reset();

    clientSelect.innerHTML = '<option value="" disabled selected>Choose Client...</option>';
    state.clients.forEach(c => {
        clientSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
    });

    accSelect.innerHTML = '';
    state.accounts.forEach(a => {
        accSelect.innerHTML += `<option value="${a.name}">${a.name} (${a.type})</option>`;
    });

    document.getElementById('income-date').value = new Date().toISOString().split('T')[0];

    const customContainer = document.getElementById('income-modal-custom-fields-container');
    customContainer.innerHTML = '';

    if (editId) {
        const log = state.incomeLogs.find(l => l.id === editId);
        if (log) {
            title.innerText = 'Edit Income Record';
            document.getElementById('edit-income-id').value = log.id;
            clientSelect.value = log.clientId;
            document.getElementById('income-amount').value = log.amount;
            document.getElementById('income-date').value = log.date;
            accSelect.value = log.mode;

            state.customClientFields.forEach(f => {
                const val = log[f.name] || '';
                customContainer.innerHTML += `
                    <div class="form-group">
                        <label for="custom-income-${f.name}">${f.name}</label>
                        <input type="${f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}" id="custom-income-${f.name}" name="${f.name}" value="${val}" placeholder="Enter ${f.name}...">
                    </div>
                `;
            });
        }
    } else {
        title.innerText = 'Log Received Amount';
        document.getElementById('edit-income-id').value = '';

        state.customClientFields.forEach(f => {
            customContainer.innerHTML += `
                <div class="form-group">
                    <label for="custom-income-${f.name}">${f.name}</label>
                    <input type="${f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}" id="custom-income-${f.name}" name="${f.name}" placeholder="Enter ${f.name}...">
                </div>
            `;
        });
    }
    modal.classList.add('active');
}

function closeIncomeModal() {
    document.getElementById('modal-income').classList.remove('active');
}

function handleIncomeSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('edit-income-id').value;
    const clientId = document.getElementById('income-client-select').value;
    const amount = Number(document.getElementById('income-amount').value);
    const date = document.getElementById('income-date').value;
    const mode = document.getElementById('income-account-select').value;

    let logObj = { clientId, amount, date, mode };

    state.customClientFields.forEach(f => {
        const val = document.getElementById(`custom-income-${f.name}`).value;
        logObj[f.name] = f.type === 'number' ? Number(val) : val;
    });

    if (id) {
        logObj.id = id;
    } else {
        logObj.id = 'i_' + Date.now();
    }

    addIncomeDirect(logObj);
    closeIncomeModal();
    renderPage(state.activePage);
}

window.openEditIncome = function(id) {
    openIncomeModal(id);
};

window.deleteIncome = function(id) {
    if (confirm("Are you sure you want to delete this received amount log?")) {
        deleteIncomeDirect(id);
        renderPage(state.activePage);
    }
};

// Expense
function openExpenseModal(editId = '') {
    const modal = document.getElementById('modal-expense');
    const title = document.getElementById('modal-expense-title');
    const form = document.getElementById('form-expense');
    const clientSelect = document.getElementById('expense-client-source');
    const accSelect = document.getElementById('expense-account-select');
    form.reset();

    clientSelect.innerHTML = '<option value="">None / General Expense</option>';
    state.clients.forEach(c => {
        clientSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
    });

    accSelect.innerHTML = '';
    state.accounts.forEach(a => {
        accSelect.innerHTML += `<option value="${a.name}">${a.name} (${a.type})</option>`;
    });

    document.getElementById('expense-date').value = new Date().toISOString().split('T')[0];

    const customContainer = document.getElementById('expense-modal-custom-fields-container');
    customContainer.innerHTML = '';

    if (editId) {
        const tx = state.transactions.find(t => t.id === editId);
        if (tx) {
            title.innerText = 'Edit Expense Entry';
            document.getElementById('edit-expense-id').value = tx.id;
            document.getElementById('expense-description').value = tx.description;
            document.getElementById('expense-category').value = tx.category;
            document.getElementById('expense-amount').value = tx.amount;
            document.getElementById('expense-date').value = tx.date;
            accSelect.value = tx.mode;
            clientSelect.value = tx.clientId;

            state.customTxFields.forEach(f => {
                const val = tx[f.name] || '';
                customContainer.innerHTML += `
                    <div class="form-group">
                        <label for="custom-expense-${f.name}">${f.name}</label>
                        <input type="${f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}" id="custom-expense-${f.name}" name="${f.name}" value="${val}" placeholder="Enter ${f.name}...">
                    </div>
                `;
            });
        }
    } else {
        title.innerText = 'Add Expense Entry';
        document.getElementById('edit-expense-id').value = '';

        state.customTxFields.forEach(f => {
            customContainer.innerHTML += `
                <div class="form-group">
                    <label for="custom-expense-${f.name}">${f.name}</label>
                    <input type="${f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}" id="custom-expense-${f.name}" name="${f.name}" placeholder="Enter ${f.name}...">
                </div>
            `;
        });
    }
    modal.classList.add('active');
}

function closeExpenseModal() {
    document.getElementById('modal-expense').classList.remove('active');
}

function handleExpenseSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('edit-expense-id').value;
    const description = document.getElementById('expense-description').value.trim();
    const category = document.getElementById('expense-category').value;
    const amount = Number(document.getElementById('expense-amount').value);
    const date = document.getElementById('expense-date').value;
    const mode = document.getElementById('expense-account-select').value;
    const clientId = document.getElementById('expense-client-source').value;

    let txObj = { description, category, amount, date, mode, clientId };

    state.customTxFields.forEach(f => {
        const val = document.getElementById(`custom-expense-${f.name}`).value;
        txObj[f.name] = f.type === 'number' ? Number(val) : val;
    });

    if (id) {
        txObj.id = id;
    } else {
        txObj.id = 't_' + Date.now();
    }

    addExpenseDirect(txObj);
    closeExpenseModal();
    renderPage(state.activePage);
}

window.openEditExpense = function(id) {
    openExpenseModal(id);
};

window.deleteExpense = function(id) {
    if (confirm("Are you sure you want to delete this expense entry?")) {
        deleteExpenseDirect(id);
        renderPage(state.activePage);
    }
};

// Accounts
function openAccountModal(editId = '') {
    const modal = document.getElementById('modal-account');
    const title = document.getElementById('modal-account-title');
    const form = document.getElementById('form-account');
    form.reset();

    if (editId) {
        const acc = state.accounts.find(a => a.id === editId);
        if (acc) {
            title.innerText = 'Edit Account Details';
            document.getElementById('edit-account-id').value = acc.id;
            document.getElementById('account-name').value = acc.name;
            document.getElementById('account-type').value = acc.type;
        }
    } else {
        title.innerText = 'Add New Account Book';
        document.getElementById('edit-account-id').value = '';
    }
    modal.classList.add('active');
}

function closeAccountModal() {
    document.getElementById('modal-account').classList.remove('active');
}

function handleAccountSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('edit-account-id').value;
    const name = document.getElementById('account-name').value.trim();
    const type = document.getElementById('account-type').value;

    let accountObj = { name, type };
    if (id) {
        accountObj.id = id;
        const oldAcc = state.accounts.find(a => a.id === id);
        if (oldAcc && oldAcc.name !== name) {
            state.incomeLogs.forEach(l => { if (l.mode === oldAcc.name) { l.mode = name; firebaseWrite('incomeLogs', l.id, l); } });
            state.transactions.forEach(t => { if (t.mode === oldAcc.name) { t.mode = name; firebaseWrite('transactions', t.id, t); } });
        }
    } else {
        if (state.accounts.some(a => a.name.toLowerCase() === name.toLowerCase())) {
            alert("An account with this name already exists.");
            return;
        }
        accountObj.id = 'acc_' + Date.now();
    }

    addAccountDirect(accountObj);
    closeAccountModal();
    renderPage('master');
}

window.openEditAccount = function(id) {
    openAccountModal(id);
};

window.deleteAccount = function(id) {
    if (state.accounts.length <= 1) {
        alert("You must keep at least one account book in the system.");
        return;
    }
    if (confirm("Are you sure you want to delete this account? Transactions mapped here will lose their book links.")) {
        deleteAccountDirect(id);
        renderPage('master');
    }
};

// Custom Fields
function openFieldModal(scope) {
    const modal = document.getElementById('modal-field');
    const title = document.getElementById('modal-field-title');
    const form = document.getElementById('form-field');
    form.reset();

    document.getElementById('field-scope').value = scope;
    title.innerText = scope === 'client' ? 'Add Client Custom Column' : 'Add Transaction Custom Column';
    modal.classList.add('active');
}

function closeFieldModal() {
    document.getElementById('modal-field').classList.remove('active');
}

function handleFieldSubmit(e) {
    e.preventDefault();
    const scope = document.getElementById('field-scope').value;
    const name = document.getElementById('field-name').value.trim();
    const type = document.getElementById('field-type').value;

    const list = scope === 'client' ? state.customClientFields : state.customTxFields;
    
    if (list.some(f => f.name.toLowerCase() === name.toLowerCase())) {
        alert("A column with this name already exists.");
        return;
    }

    const newField = { id: 'field_' + Date.now(), name, type };
    list.push(newField);
    
    saveCustomFieldsDirect(state.customClientFields, state.customTxFields);
    closeFieldModal();
    renderPage('master');
}

window.deleteCustomField = function(scope, fieldId) {
    if (confirm("Are you sure you want to delete this custom column? Stored values will be lost.")) {
        if (scope === 'client') {
            const field = state.customClientFields.find(f => f.id === fieldId);
            if (field) {
                state.customClientFields = state.customClientFields.filter(f => f.id !== fieldId);
                state.clients.forEach(c => { delete c[field.name]; firebaseWrite('clients', c.id, c); });
                state.incomeLogs.forEach(l => { delete l[field.name]; firebaseWrite('incomeLogs', l.id, l); });
            }
        } else {
            const field = state.customTxFields.find(f => f.id === fieldId);
            if (field) {
                state.customTxFields = state.customTxFields.filter(f => f.id !== fieldId);
                state.transactions.forEach(t => { delete t[field.name]; firebaseWrite('transactions', t.id, t); });
            }
        }
        saveCustomFieldsDirect(state.customClientFields, state.customTxFields);
        renderPage('master');
    }
};

// Category Budgets
function handleCategoryBudgetsSubmit(e) {
    e.preventDefault();
    const form = document.getElementById('form-category-budgets');
    
    // Save Budgets and Colors
    let budgetsObj = {};
    const colorPickers = form.querySelectorAll('.color-picker-input');
    colorPickers.forEach(picker => {
        const cat = picker.getAttribute('data-cat');
        const color = picker.value;
        if (state.categoriesConfig[cat]) {
            state.categoriesConfig[cat].color = color;
        }
    });

    Object.keys(state.categoriesConfig).forEach(cat => {
        const input = form.querySelector(`input[name="${cat}"]`);
        if (input) {
            budgetsObj[cat] = Number(input.value) || 0;
        } else {
            budgetsObj[cat] = state.budgets[cat] || 0;
        }
    });

    state.budgets = budgetsObj;
    saveStateLocalOnly();
    if (state.cloudSyncEnabled) {
        firebaseWriteSettings();
    }

    alert("Category configuration saved successfully!");
    renderPage('master');
}

// --- 9. MULTI-SHEET EXCEL EXPORT (SHEETJS) ---

function exportToExcel() {
    const clientsData = state.clients.map(client => {
        const stats = getClientReportStats(client.id);
        let rowObj = {
            "Client Name": client.name,
            "Monthly Retainer (INR)": client.monthlyPay,
            "Yearly Retainer (INR)": stats.yearlyContract,
            "Total Received (INR)": stats.totalReceived,
            "Balance Receivable (INR)": stats.balanceReceivable,
            "Spent Allocated (INR)": stats.totalSpent,
            "Available Balance (INR)": stats.balance
        };
        state.customClientFields.forEach(f => {
            rowObj[f.name] = client[f.name] || '';
        });
        return rowObj;
    });

    const incomeData = state.incomeLogs.map(log => {
        const client = state.clients.find(c => c.id === log.clientId);
        let rowObj = {
            "Client Name": client ? client.name : 'Unknown Client',
            "Received Date": formatDbDate(log.date),
            "Destination Account": log.mode,
            "Amount Received (INR)": log.amount
        };
        state.customClientFields.forEach(f => {
            rowObj[f.name] = log[f.name] || '';
        });
        return rowObj;
    });

    const expensesData = state.transactions.map(tx => {
        const client = state.clients.find(c => c.id === tx.clientId);
        let rowObj = {
            "Date": formatDbDate(tx.date),
            "Description": tx.description,
            "Category": tx.category,
            "Paid From Account": tx.mode,
            "Fund Source Client": client ? client.name : 'General',
            "Amount Spent (INR)": tx.amount
        };
        state.customTxFields.forEach(f => {
            rowObj[f.name] = tx[f.name] || '';
        });
        return rowObj;
    });

    const bounds = getPeriodFilterBounds();
    const periodTx = state.transactions.filter(tx => {
        const d = new Date(tx.date);
        return d >= bounds.start && d <= bounds.end;
    });

    const diffDays = Math.ceil(Math.abs(bounds.end - bounds.start) / (1000 * 60 * 60 * 24));
    let scaleMonths = 12;
    if (state.selectedPeriod === 'this-month') scaleMonths = 1;
    else if (state.selectedPeriod === 'this-quarter') scaleMonths = 3;
    else if (state.selectedPeriod === 'custom') scaleMonths = Math.max(1, Math.round(diffDays / 30));

    const budgetData = Object.keys(state.categoriesConfig).map(cat => {
        const monthlyB = Number(state.budgets[cat]) || 0;
        const targetBudget = monthlyB * scaleMonths;
        const actualSpent = periodTx.filter(t => t.category === cat).reduce((sum, t) => sum + Number(t.amount), 0);
        const variance = targetBudget - actualSpent;
        
        return {
            "Category Name": cat,
            "Monthly Budget (INR)": monthlyB,
            "Period Target Budget (INR)": targetBudget,
            "Actual Spent (INR)": actualSpent,
            "Savings Remaining (INR)": variance >= 0 ? variance : 0,
            "Overspent Variance (INR)": variance < 0 ? Math.abs(variance) : 0,
            "Status": variance >= 0 ? "Bacha Hai" : "Extra Kharch"
        };
    });

    const wb = XLSX.utils.book_new();

    const addSheet = (data, sheetName) => {
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
    };

    addSheet(clientsData, "Clients Overview");
    addSheet(incomeData, "Received Income Logs");
    addSheet(expensesData, "Expenses Ledger");
    addSheet(budgetData, "Budget Analysis");

    state.accounts.forEach(acc => {
        const ledger = getAccountLedger(acc.id);
        const ledgerRows = ledger.map(row => {
            return {
                "Date": formatDbDate(row.date),
                "Particulars Description": row.particulars,
                "Category / Type": row.category,
                "Debit Inflow (INR)": row.debit > 0 ? row.debit : null,
                "Credit Outflow (INR)": row.credit > 0 ? row.credit : null,
                "Running Balance (INR)": row.balance
            };
        });
        const sheetName = acc.name.replace(/[\\*\?:\/\[\]]/g, "").slice(0, 30);
        addSheet(ledgerRows, sheetName);
    });

    XLSX.writeFile(wb, `Wealth_Plus_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// --- 10. APP INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    loadState();
    initLoginSession();
    initFirebaseApp(); // Initialize Firebase Sync on load!

    document.getElementById('period-selector').value = state.selectedPeriod;
    if (state.selectedPeriod === 'custom') {
        document.getElementById('custom-date-inputs').style.display = 'flex';
        document.getElementById('custom-start-date').value = state.customStartDate;
        document.getElementById('custom-end-date').value = state.customEndDate;
    }

    initEventHandlers();
    
    // Cloud Sync Handlers
    document.getElementById('form-cloud-config').addEventListener('submit', handleCloudConfigSubmit);
    document.getElementById('btn-cloud-disable').addEventListener('click', handleCloudDisableClick);
    document.getElementById('btn-cloud-upload-data').addEventListener('click', handleCloudUploadClick);



    // GitHub Deploy Handlers
    const githubForm = document.getElementById('form-github-config');
    if (githubForm) {
        githubForm.addEventListener('submit', handleGithubConfigSubmit);
    }
    const githubDeployBtn = document.getElementById('btn-github-deploy-now');
    if (githubDeployBtn) {
        githubDeployBtn.addEventListener('click', deployAppToGitHub);
    }

    const resetAppBtn = document.getElementById('btn-reset-app-now');
    if (resetAppBtn) {
        resetAppBtn.addEventListener('click', handleResetAppClick);
    }

    if (state.currentUser) {
        renderPage(state.activePage);
    }
    
    lucide.createIcons();
});



// Cloud Sync Helpers
function handleCloudConfigSubmit(e) {
    e.preventDefault();
    const apiKey = document.getElementById('cloud-api-key').value.trim();
    const authDomain = document.getElementById('cloud-auth-domain').value.trim();
    const projectId = document.getElementById('cloud-project-id').value.trim();
    const storageBucket = document.getElementById('cloud-storage-bucket').value.trim();
    const messagingSenderId = document.getElementById('cloud-messaging-sender-id').value.trim();
    const appId = document.getElementById('cloud-app-id').value.trim();

    const config = { apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId };

    if (confirm("Are you sure you want to enable Cloud Sync with these credentials? This will connect to your Firebase Firestore database.")) {
        state.firebaseConfig = config;
        state.cloudSyncEnabled = true;
        saveStateLocalOnly();

        alert("Cloud Sync settings saved! Initializing connection...");
        
        // Re-initialize Firebase Sync
        initFirebaseApp();
        renderPage('master');
        
        // Ask if they want to push local data
        if (confirm("Would you like to upload your existing local ledger data (Clients, Transactions, Budgets, etc.) to the new Cloud database now?")) {
            uploadLocalDataToFirebase();
        }
    }
}

function handleCloudDisableClick() {
    if (confirm("Are you sure you want to disable Cloud Sync? Your data will remain stored in Firestore, but this browser will return to Local Offline Mode.")) {
        state.cloudSyncEnabled = false;
        saveStateLocalOnly();
        
        alert("Cloud Sync disabled. Returning to Local Mode.");
        window.location.reload();
    }
}

async function handleCloudUploadClick() {
    if (confirm("This will upload all current local records to the Firebase cloud database. Existing documents with the same IDs will be overwritten. Proceed?")) {
        const btn = document.getElementById('btn-cloud-upload-data');
        btn.disabled = true;
        btn.innerText = "Uploading data...";
        
        try {
            await uploadLocalDataToFirebase();
            alert("Local ledger data successfully uploaded to Firebase Cloud!");
        } catch (e) {
            console.error(e);
            alert("Error uploading data: " + e.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i data-lucide="upload-cloud"></i> Push Local Data to Cloud';
            lucide.createIcons();
        }
    }
}

async function uploadLocalDataToFirebase() {
    if (!state.cloudSyncEnabled || !firebaseDb) return;
    
    // Upload clients
    for (let c of state.clients) {
        await firebaseDb.collection('clients').doc(c.id).set(c);
    }
    // Upload incomeLogs
    for (let l of state.incomeLogs) {
        await firebaseDb.collection('incomeLogs').doc(l.id).set(l);
    }
    // Upload transactions
    for (let t of state.transactions) {
        await firebaseDb.collection('transactions').doc(t.id).set(t);
    }
    // Upload accounts
    for (let a of state.accounts) {
        await firebaseDb.collection('accounts').doc(a.id).set(a);
    }
    // Upload members
    for (let m of state.members) {
        await firebaseDb.collection('members').doc(m.id).set(m);
    }
    // Upload settings
    await firebaseDb.collection('settings').doc('config').set({
        budgets: state.budgets,
        customClientFields: state.customClientFields,
        customTxFields: state.customTxFields,
        categoriesConfig: state.categoriesConfig
    });
}

async function handleResetAppClick() {
    if (!confirm("⚠️ WARNING: Are you sure you want to perform a full reset of the ledger and transactions? This will permanently delete all local and cloud expense entries and income logs. Member Directory, Settings, and GitHub configuration will remain untouched. This cannot be undone!")) {
        return;
    }

    const resetBtn = document.getElementById('btn-reset-app-now');

    if (state.cloudSyncEnabled && firebaseDb) {
        try {
            resetBtn.disabled = true;
            resetBtn.innerText = "Clearing Cloud Ledger...";

            // Wipe transactions from Firestore
            const txSnapshot = await firebaseDb.collection('transactions').get();
            for (const doc of txSnapshot.docs) {
                await doc.ref.delete();
            }

            // Wipe income logs from Firestore
            const incomeSnapshot = await firebaseDb.collection('incomeLogs').get();
            for (const doc of incomeSnapshot.docs) {
                await doc.ref.delete();
            }

            alert("Cloud database transactions and income logs cleared successfully!");
        } catch (e) {
            console.error("Cloud reset error:", e);
            alert("Error clearing cloud database: " + e.message);
        } finally {
            resetBtn.disabled = false;
            resetBtn.innerText = "Reset Application Now";
        }
    }

    // Reset local data arrays for ledger
    state.transactions = [];
    state.incomeLogs = [];
    
    // Save state
    saveState();
    
    alert("Local ledger data reset successfully! Reloading page...");
    window.location.reload();
}
