/* ==========================================================================
   WEALTH PLUS - APPLICATION ENGINE (v3.5)
   ========================================================================== */

// --- 1. GLOBAL STATE & LOCAL STORAGE ---
let state = {
    clients: [],
    incomeLogs: [],
    transactions: [],
    transfers: [], // Contra internal fund transfers: { id, fromAccount, toAccount, amount, date, type, remark }
    loans: [],     // Multi-entry loans & udhaar: { id, clientId, type: 'given'|'taken', amount, date, account, remark, timestamp }
    investments: [], // Investment Portfolio: { id, name, category, amount, date, account, remark, withdrawals: [ { id, date, amount, account, remark, timestamp } ], timestamp }
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
    activeLoansTab: 'given',
    activeInvestmentStatus: 'all',
    investmentKpiView: 'all', // 'all' | 'invested' | 'withdrawn' | 'active' | 'holdings'
    partyFilter: 'all',
    partyFyFilter: 'all',
    selectedPeriod: 'financial-year',
    customStartDate: '',
    customEndDate: '',
    selectedLedgerAccountId: ''
};

// Seed Data
const defaultClients = [
    { id: "c1", name: "Acme Corporation", group: "Debtor", monthlyPay: 35000, yearlyPay: 420000, openingBalance: 0 },
    { id: "c2", name: "StarLabs Ltd", group: "Debtor", monthlyPay: 20000, yearlyPay: 240000, openingBalance: 0 }
];

const defaultAccounts = [
    { id: "acc_1", name: "Main Cash", type: "Cash", openingBalance: 0 },
    { id: "acc_2", name: "HDFC Bank", type: "Bank", openingBalance: 0 }
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
    if (window.firebaseConfig && window.firebaseConfig.projectId) {
        state.firebaseConfig = window.firebaseConfig;
        state.cloudSyncEnabled = true;
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
    state.transfers = [];
    state.loans = [];
    state.customClientFields = [];
    state.customTxFields = [];
    state.categoriesConfig = { ...defaultCategoriesConfig };
    state.activePage = 'dashboard';
    state.activeReportTab = 'client';
    state.activeMasterTab = 'accounts';
    state.activeLoansTab = 'given';
    state.selectedPeriod = 'financial-year';
    state.selectedLedgerAccountId = state.accounts[0]?.id || '';
    saveState();
}

// Migrate old formats
function runStateMigrations() {
    let updated = false;

    if (!state.transfers) { state.transfers = []; updated = true; }
    if (!state.loans) { state.loans = []; updated = true; }
    if (!state.activeLoansTab) { state.activeLoansTab = 'given'; updated = true; }
    if (!state.accounts || state.accounts.length === 0) { state.accounts = [...defaultAccounts]; updated = true; }

    // Auto-migrate legacy client creditAmount into state.loans records
    (state.clients || []).forEach(c => {
        const credit = Number(c.creditAmount) || 0;
        if (credit > 0) {
            const hasLoan = state.loans.some(l => l.clientId === c.id);
            if (!hasLoan) {
                state.loans.push({
                    id: 'loan_' + c.id + '_initial',
                    clientId: c.id,
                    type: 'given',
                    amount: credit,
                    date: c.loanDate || new Date().toISOString().split('T')[0],
                    account: c.loanSourceAccount || (state.accounts[0]?.name || 'Main Cash'),
                    remark: 'Initial loan / credit entry',
                    timestamp: Date.now()
                });
                updated = true;
            }
        }
    });
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
        let items = [];
        if (!snapshot.empty) {
            snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
        }
        if (!isSame(state.clients, items)) {
            state.clients = items;
            saveStateLocalOnly();
            renderPage(state.activePage);
        }
    }, err => console.error("Clients sync error:", err));

    // 2. Income Logs
    firebaseDb.collection('incomeLogs').onSnapshot(snapshot => {
        let items = [];
        if (!snapshot.empty) {
            snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
        }
        if (!isSame(state.incomeLogs, items)) {
            state.incomeLogs = items;
            saveStateLocalOnly();
            renderPage(state.activePage);
        }
    }, err => console.error("Income logs sync error:", err));

    // 3. Transactions
    firebaseDb.collection('transactions').onSnapshot(snapshot => {
        let items = [];
        if (!snapshot.empty) {
            snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
        }
        if (!isSame(state.transactions, items)) {
            state.transactions = items;
            saveStateLocalOnly();
            renderPage(state.activePage);
        }
    }, err => console.error("Transactions sync error:", err));

    // 4. Accounts
    firebaseDb.collection('accounts').onSnapshot(snapshot => {
        let items = [];
        if (!snapshot.empty) {
            snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
        }
        if (!isSame(state.accounts, items)) {
            state.accounts = items;
            saveStateLocalOnly();
            renderPage(state.activePage);
        }
    }, err => console.error("Accounts sync error:", err));

    // 5. Members
    firebaseDb.collection('members').onSnapshot(snapshot => {
        let items = [];
        if (!snapshot.empty) {
            snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
        }
        if (!isSame(state.members, items)) {
            state.members = items;
            saveStateLocalOnly();
            if (state.currentUser && !state.members.some(m => m.id === state.currentUser.id)) {
                state.currentUser = null;
                saveStateLocalOnly();
                initLoginSession();
            } else {
                renderPage(state.activePage);
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

    // 7. Internal Transfers (Contra)
    firebaseDb.collection('transfers').onSnapshot(snapshot => {
        let items = [];
        if (!snapshot.empty) {
            snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
        }
        if (!isSame(state.transfers, items)) {
            state.transfers = items;
            saveStateLocalOnly();
            renderPage(state.activePage);
        }
    }, err => console.error("Transfers sync error:", err));

    // 8. Multi-Entry Loans & Udhaar
    firebaseDb.collection('loans').onSnapshot(snapshot => {
        let items = [];
        if (!snapshot.empty) {
            snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
        }
        if (!isSame(state.loans, items)) {
            state.loans = items;
            saveStateLocalOnly();
            renderPage(state.activePage);
        }
    }, err => console.error("Loans sync error:", err));

    // 9. Investment Portfolio
    firebaseDb.collection('investments').doc('all').onSnapshot(doc => {
        if (!doc.exists) return;
        const data = doc.data();
        if (data.list && !isSame(state.investments, data.list)) {
            state.investments = data.list;
            saveStateLocalOnly();
            renderPage(state.activePage);
        }
    }, err => console.error("Investments sync error:", err));
}

// --- CENTRAL DATA MUTATION FUNCTIONS ---
function addLoanDirect(loanObj, syncToCloud = true) {
    const idx = state.loans.findIndex(l => l.id === loanObj.id);
    if (idx !== -1) {
        state.loans[idx] = { ...state.loans[idx], ...loanObj };
    } else {
        state.loans.push(loanObj);
    }
    saveStateLocalOnly();
    if (syncToCloud) firebaseWrite('loans', loanObj.id, loanObj);
}

function deleteLoanDirect(id, syncToCloud = true) {
    state.loans = state.loans.filter(l => l.id !== id);
    saveStateLocalOnly();
    if (syncToCloud) firebaseDelete('loans', id);
}

function addTransferDirect(transferObj, syncToCloud = true) {
    const idx = state.transfers.findIndex(t => t.id === transferObj.id);
    if (idx !== -1) {
        state.transfers[idx] = { ...state.transfers[idx], ...transferObj };
    } else {
        state.transfers.push(transferObj);
    }
    saveStateLocalOnly();
    if (syncToCloud) firebaseWrite('transfers', transferObj.id, transferObj);
}

function deleteTransferDirect(id, syncToCloud = true) {
    state.transfers = state.transfers.filter(t => t.id !== id);
    saveStateLocalOnly();
    if (syncToCloud) firebaseDelete('transfers', id);
}

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
    const loanTx = state.transactions.find(t => t.id === 't_loan_' + id || (t.clientId === id && t.isLoanDisbursement));
    if (loanTx) {
        deleteExpenseDirect(loanTx.id, syncToCloud);
    }
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

// --- 2. AUTHENTICATION & AUTO-LOGOUT CONTROLLER ---

// 5-Minute Inactivity Auto-Logout System
const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
let lastUserActivityTime = Date.now();
let inactivityTimer = null;
let backgroundInactivityInterval = null;

function recordUserActivity() {
    lastUserActivityTime = Date.now();
    try {
        localStorage.setItem('wealth_plus_last_activity', String(lastUserActivityTime));
    } catch (e) {}

    resetInactivityTimer();
}

function resetInactivityTimer() {
    if (inactivityTimer) {
        clearTimeout(inactivityTimer);
        inactivityTimer = null;
    }

    if (state.currentUser) {
        inactivityTimer = setTimeout(checkAndExecuteAutoLogout, INACTIVITY_TIMEOUT_MS);
    }
}

function checkAndExecuteAutoLogout() {
    if (!state.currentUser) return;

    let storedLast = 0;
    try {
        storedLast = Number(localStorage.getItem('wealth_plus_last_activity')) || 0;
    } catch (e) {}

    const effectiveLast = Math.max(lastUserActivityTime, storedLast);
    const elapsed = Date.now() - effectiveLast;

    if (elapsed >= INACTIVITY_TIMEOUT_MS) {
        performAutoLogout();
    } else {
        const remaining = INACTIVITY_TIMEOUT_MS - elapsed;
        inactivityTimer = setTimeout(checkAndExecuteAutoLogout, Math.max(remaining, 1000));
    }
}

function performAutoLogout() {
    if (!state.currentUser) return;
    console.log('User automatically logged out due to 5 minutes of inactivity.');

    state.currentUser = null;
    saveState();
    state.activePage = 'dashboard';
    saveState();

    initLoginSession();
    if (window.speechSynthesis) window.speechSynthesis.cancel();

    const errorMsg = document.getElementById('login-error-msg');
    if (errorMsg) {
        errorMsg.style.display = 'block';
        errorMsg.style.color = '#f59e0b';
        errorMsg.style.background = 'rgba(245, 158, 11, 0.12)';
        errorMsg.style.borderColor = 'rgba(245, 158, 11, 0.35)';
        errorMsg.innerHTML = '<i data-lucide="shield-alert" style="width:14px; height:14px; vertical-align:middle; margin-right:4px;"></i> Logged out automatically after 5 minutes of inactivity for security.';
        if (window.lucide) lucide.createIcons();
    }
}

function initInactivityTracker() {
    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click', 'wheel'];
    let throttleTimer = null;

    const handleActivity = () => {
        if (throttleTimer) return;
        throttleTimer = setTimeout(() => {
            throttleTimer = null;
        }, 1000);
        recordUserActivity();
    };

    events.forEach(evt => {
        window.addEventListener(evt, handleActivity, { passive: true });
    });

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            checkAndExecuteAutoLogout();
        }
    });

    window.addEventListener('focus', () => {
        checkAndExecuteAutoLogout();
    });

    if (backgroundInactivityInterval) clearInterval(backgroundInactivityInterval);
    backgroundInactivityInterval = setInterval(() => {
        if (state.currentUser) {
            checkAndExecuteAutoLogout();
        }
    }, 20000); // Check every 20 seconds

    recordUserActivity();
}

function initLoginSession() {
    const loginOverlay = document.getElementById('login-screen');
    const userBadge = document.getElementById('current-user-badge');

    if (state.currentUser) {
        // Logged in
        loginOverlay.classList.add('hidden');
        userBadge.innerText = `${state.currentUser.name} (${state.currentUser.role})`;
        
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

        resetInactivityTimer();
    } else {
        // Not logged in
        loginOverlay.classList.remove('hidden');
        if (inactivityTimer) {
            clearTimeout(inactivityTimer);
            inactivityTimer = null;
        }
    }

    if (typeof updateSindhuVisibility === 'function') updateSindhuVisibility();
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
        recordUserActivity();
        initLoginSession();
        
        // Reset forms inputs
        document.getElementById('form-login').reset();
        
        // Refresh page view
        renderPage(state.activePage);

    } else {
        errorMsg.style.display = 'block';
        errorMsg.style.color = '#ef4444';
        errorMsg.style.background = 'rgba(239, 68, 68, 0.1)';
        errorMsg.style.borderColor = 'rgba(239, 68, 68, 0.25)';
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
    if (dateStr === 'Opening Balance' || (typeof dateStr === 'string' && dateStr.toLowerCase().includes('opening'))) {
        return 'Opening';
    }
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : formatDateString(d);
}

// --- 4. CORE LEDGER ENGINE CALCULATIONS ---

function resolveFundSourceText(clientId) {
    if (!clientId) return 'General';
    if (clientId === 'opening_cash') return 'Cash Opening Balance';
    if (clientId === 'opening_bank' || clientId === 'opening_balance') return 'Bank Opening Balance';
    if (typeof clientId === 'string' && clientId.startsWith('opening_acc_')) {
        const accId = clientId.replace('opening_acc_', '');
        const acc = state.accounts.find(a => a.id === accId);
        return acc ? `${acc.name} Opening Balance` : 'Opening Balance';
    }
    const client = state.clients.find(c => c.id === clientId);
    return client ? client.name : 'General';
}

function resolveFundSourceLabel(clientId) {
    if (!clientId) return '<span style="color:var(--text-muted); font-style:italic;">General</span>';
    if (clientId === 'opening_cash') {
        return '<span style="color:var(--success); font-weight:600;"><i data-lucide="coins" style="width:12px; height:12px; display:inline-block; vertical-align:middle; margin-right:2px;"></i> Cash Opening Balance</span>';
    }
    if (clientId === 'opening_bank' || clientId === 'opening_balance') {
        return '<span style="color:var(--primary); font-weight:600;"><i data-lucide="landmark" style="width:12px; height:12px; display:inline-block; vertical-align:middle; margin-right:2px;"></i> Bank Opening Balance</span>';
    }
    if (typeof clientId === 'string' && clientId.startsWith('opening_acc_')) {
        const accId = clientId.replace('opening_acc_', '');
        const acc = state.accounts.find(a => a.id === accId);
        if (acc) {
            const icon = acc.type === 'Cash' ? 'coins' : 'landmark';
            const color = acc.type === 'Cash' ? 'var(--success)' : 'var(--primary)';
            return `<span style="color:${color}; font-weight:600;"><i data-lucide="${icon}" style="width:12px; height:12px; display:inline-block; vertical-align:middle; margin-right:2px;"></i> ${acc.name} Opening</span>`;
        }
        return '<span style="color:var(--primary); font-weight:600;"><i data-lucide="landmark" style="width:12px; height:12px; display:inline-block; vertical-align:middle; margin-right:2px;"></i> Opening Balance</span>';
    }
    const client = state.clients.find(c => c.id === clientId);
    if (client) return client.name;
    return '<span style="color:var(--text-muted); font-style:italic;">General</span>';
}

function getAccountLedger(accountId) {
    const account = state.accounts.find(a => a.id === accountId);
    if (!account) return [];

    let ledger = [];
    const openingBal = Number(account.openingBalance) || 0;

    // Prepend Opening Balance if non-zero (Positive is Credit deposit, Negative is Debit overdraft)
    if (openingBal !== 0) {
        ledger.push({
            date: 'Opening Balance',
            particulars: 'Opening Balance',
            category: 'Opening Balance',
            credit: openingBal > 0 ? openingBal : 0,
            debit: openingBal < 0 ? Math.abs(openingBal) : 0,
            timestamp: 0
        });
    }

    // Filter inflows (Income/Received - CREDIT in Bank Account)
    state.incomeLogs.forEach(log => {
        if (log.mode === account.name) {
            const client = state.clients.find(c => c.id === log.clientId);
            ledger.push({
                date: log.date,
                particulars: `Received from ${client ? client.name : 'Unknown Party'}`,
                category: 'Inflow (Credit)',
                credit: Number(log.amount),
                debit: 0,
                timestamp: new Date(log.date).getTime()
            });
        }
    });

    // Filter outflows (Expenses - DEBIT in Bank Account)
    state.transactions.forEach(tx => {
        if (tx.isLoanDisbursement || tx.id.startsWith('t_loan_') || tx.category === 'Loan Given') {
            return; // Managed strictly through loans system
        }
        if (tx.mode === account.name) {
            const client = state.clients.find(c => c.id === tx.clientId);
            let fundSuffix = '';
            if (client) {
                fundSuffix = ` [Party: ${client.name}]`;
            } else if (tx.clientId) {
                fundSuffix = ` [Fund: ${resolveFundSourceText(tx.clientId)}]`;
            }
            ledger.push({
                date: tx.date,
                particulars: `${tx.description}${fundSuffix}`,
                category: tx.category,
                credit: 0,
                debit: Number(tx.amount),
                timestamp: new Date(tx.date).getTime()
            });
        }
    });

    // Filter Multi-Entry Loans (Given / Taken)
    (state.loans || []).forEach(loan => {
        if (loan.account === account.name) {
            const client = state.clients.find(c => c.id === loan.clientId);
            const partyName = client ? client.name : 'Party';
            const remarkSuffix = loan.remark ? ` (${loan.remark})` : '';

            if (loan.type === 'given') {
                // Outflow / Withdrawn to give loan -> DEBIT
                ledger.push({
                    id: loan.id,
                    loanId: loan.id,
                    date: loan.date,
                    particulars: `Loan given to ${partyName}${remarkSuffix}`,
                    category: 'Loan Disbursement (Debit)',
                    credit: 0,
                    debit: Number(loan.amount),
                    timestamp: new Date(loan.date).getTime(),
                    isLoan: true
                });
            } else if (loan.type === 'taken') {
                // Inflow / Deposited from borrowed loan -> CREDIT
                ledger.push({
                    id: loan.id,
                    loanId: loan.id,
                    date: loan.date,
                    particulars: `Loan taken from ${partyName}${remarkSuffix}`,
                    category: 'Loan Borrowed (Credit)',
                    credit: Number(loan.amount),
                    debit: 0,
                    timestamp: new Date(loan.date).getTime(),
                    isLoan: true
                });
            }
        }
    });

    // Filter Contra / Internal Fund Transfers
    (state.transfers || []).forEach(tr => {
        const isOutflow = tr.fromAccount === account.name;
        const isInflow = tr.toAccount === account.name;
        const remarkSuffix = tr.remark ? ` (${tr.remark})` : '';

        if (isOutflow) {
            // Money transferred OUT (Withdrawn) -> DEBIT
            ledger.push({
                id: tr.id,
                transferId: tr.id,
                date: tr.date,
                particulars: `Contra Transfer ➔ ${tr.toAccount}${remarkSuffix}`,
                category: 'Contra / Transfer (Debit)',
                credit: 0,
                debit: Number(tr.amount),
                timestamp: new Date(tr.date).getTime(),
                isTransfer: true
            });
        } else if (isInflow) {
            // Money transferred IN (Deposited) -> CREDIT
            ledger.push({
                id: tr.id,
                transferId: tr.id,
                date: tr.date,
                particulars: `Contra Transfer 🡸 ${tr.fromAccount}${remarkSuffix}`,
                category: 'Contra / Transfer (Credit)',
                credit: Number(tr.amount),
                debit: 0,
                timestamp: new Date(tr.date).getTime(),
                isTransfer: true
            });
        }
    });

    // Filter Investments (Outflow) & Withdrawals (Inflow)
    (state.investments || []).forEach(inv => {
        // Outflow when making an investment (DEBIT in Account)
        if (inv.account === account.name) {
            const remarkSuffix = inv.remark ? ` (${inv.remark})` : '';
            let fundSuffix = '';
            if (inv.fundSource) {
                fundSuffix = ` [Fund: ${resolveFundSourceText(inv.fundSource)}]`;
            }
            ledger.push({
                id: inv.id,
                investmentId: inv.id,
                date: inv.date,
                particulars: `Investment in ${inv.name} [${inv.category}]${fundSuffix}${remarkSuffix}`,
                category: 'Investment (Debit)',
                credit: 0,
                debit: Number(inv.amount),
                timestamp: new Date(inv.date).getTime(),
                isInvestment: true
            });
        }

        // Inflow when redeeming/withdrawing an investment (CREDIT in Account)
        (inv.withdrawals || []).forEach(w => {
            if (w.account === account.name) {
                const remarkSuffix = w.remark ? ` (${w.remark})` : '';
                ledger.push({
                    id: w.id,
                    investmentId: inv.id,
                    withdrawalId: w.id,
                    date: w.date,
                    particulars: `Withdrawal from ${inv.name} [${inv.category}]${remarkSuffix}`,
                    category: 'Investment Return / Withdrawal (Credit)',
                    credit: Number(w.amount),
                    debit: 0,
                    timestamp: new Date(w.date).getTime(),
                    isInvestmentWithdrawal: true
                });
            }
        });
    });

    // Sort chronologically (Opening balance timestamp 0 stays at the top)
    ledger.sort((a, b) => {
        if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
        return a.particulars.localeCompare(b.particulars);
    });

    // Calculate running balance (Balance = Credit Deposits - Debit Withdrawals)
    let runningBalance = 0;
    ledger.forEach(row => {
        runningBalance += (row.credit - row.debit);
        row.balance = runningBalance;
    });

    return ledger;
}

function getGlobalStats() {
    let totalCashBalance = 0;
    let totalBankBalance = 0;

    state.accounts.forEach(acc => {
        const ledger = getAccountLedger(acc.id);
        const closingBal = ledger.length > 0 ? ledger[ledger.length - 1].balance : (Number(acc.openingBalance) || 0);
        
        if (acc.type === 'Cash') {
            totalCashBalance += closingBal;
        } else if (acc.type === 'Bank') {
            totalBankBalance += closingBal;
        }
    });

    // Period Filtered Expenses: STRICTLY OPERATING EXPENSES (EXCLUDES LOANS GIVEN/TAKEN)
    const bounds = getPeriodFilterBounds();
    const periodExpenses = state.transactions
        .filter(tx => {
            const isLoan = tx.isLoanDisbursement || tx.id.startsWith('t_loan_') || tx.category === 'Loan Given' || tx.category === 'Loan';
            if (isLoan) return false;
            const txDate = new Date(tx.date);
            return txDate >= bounds.start && txDate <= bounds.end;
        })
        .reduce((sum, tx) => sum + Number(tx.amount), 0);

    // Loans Overview Statistics
    let totalLoansGiven = 0;
    let totalLoansTaken = 0;
    (state.loans || []).forEach(l => {
        if (l.type === 'given') totalLoansGiven += Number(l.amount) || 0;
        else if (l.type === 'taken') totalLoansTaken += Number(l.amount) || 0;
    });

    // Also account for any legacy creditAmount not yet migrated
    state.clients.forEach(c => {
        const credit = Number(c.creditAmount) || 0;
        if (credit > 0 && !(state.loans || []).some(l => l.clientId === c.id)) {
            totalLoansGiven += credit;
        }
    });

    return { cashBalance: totalCashBalance, bankBalance: totalBankBalance, periodExpenses, totalLoansGiven, totalLoansTaken };
}

function getClientReportStats(clientId) {
    const client = state.clients.find(c => c.id === clientId);
    if (!client) return { totalReceived: 0, totalDiscount: 0, totalSpent: 0, balance: 0, yearlyContract: 0, balanceReceivable: 0, openingBalance: 0, totalReceivable: 0, creditAmount: 0, loansGiven: 0, loansTaken: 0, loansList: [] };

    const clientLoans = (state.loans || []).filter(l => l.clientId === clientId);
    let loansGiven = clientLoans.filter(l => l.type === 'given').reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
    let loansTaken = clientLoans.filter(l => l.type === 'taken').reduce((sum, l) => sum + (Number(l.amount) || 0), 0);

    // Fallback for legacy static creditAmount if no loans in state.loans yet
    if (loansGiven === 0 && Number(client.creditAmount) > 0) {
        loansGiven = Number(client.creditAmount);
    }

    const monthlyPay = Number(client.monthlyPay) || 0;
    const yearlyContract = Number(client.yearlyPay) || (monthlyPay * 12);
    const openingBalance = Number(client.openingBalance) || 0;
    const totalReceivable = loansGiven + yearlyContract + openingBalance;

    const totalReceived = state.incomeLogs
        .filter(log => log.clientId === clientId)
        .reduce((sum, log) => sum + Number(log.amount), 0);

    const totalDiscount = state.incomeLogs
        .filter(log => log.clientId === clientId)
        .reduce((sum, log) => sum + (Number(log.discount) || 0), 0);

    const totalSpent = state.transactions
        .filter(tx => tx.clientId === clientId && !tx.isLoanDisbursement && !tx.id.startsWith('t_loan_') && tx.category !== 'Loan Given')
        .reduce((sum, tx) => sum + Number(tx.amount), 0);

    const balance = (openingBalance + totalReceived) - totalSpent;
    const balanceReceivable = totalReceivable - (totalReceived + totalDiscount);

    return { 
        creditAmount: loansGiven, 
        loansGiven, 
        loansTaken, 
        yearlyContract, 
        openingBalance, 
        totalReceivable, 
        totalReceived, 
        totalDiscount, 
        totalSpent, 
        balance, 
        balanceReceivable,
        loansList: clientLoans 
    };
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
        'loans': 'Loans & Credit Manager',
        'investments': 'Investment Portfolio',
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

    const tabMeta = {
        'accounts': { title: 'Accounts Master', icon: 'landmark' },
        'clients-config': { title: 'Parties Configuration', icon: 'users' },
        'budgets': { title: 'Category Budgets', icon: 'pie-chart' },
        'columns': { title: 'Custom Columns', icon: 'table' },
        'members': { title: 'Member Directory', icon: 'shield-check' },
        'cloud-sync': { title: 'Cloud Sync (Firebase)', icon: 'cloud' },
        'ai-developer': { title: 'AI & GitHub Deploy', icon: 'github' },
        'install-app': { title: 'Install Mobile App', icon: 'download' },
        'reset-app': { title: 'Reset App', icon: 'trash-2' }
    };

    const currentMeta = tabMeta[tabId] || { title: 'Accounts Master', icon: 'landmark' };

    const titleEl = document.getElementById('master-selected-title');
    if (titleEl) titleEl.innerText = currentMeta.title;

    const iconBadge = document.getElementById('master-cat-icon-badge');
    if (iconBadge) {
        iconBadge.innerHTML = `<i data-lucide="${currentMeta.icon}"></i>`;
    }

    document.querySelectorAll('.master-dropdown-item, .master-tab').forEach(el => {
        el.classList.toggle('active', el.getAttribute('data-master-sub') === tabId);
    });

    document.querySelectorAll('.master-sub-panel').forEach(el => {
        el.classList.toggle('active', el.id === `master-panel-${tabId}`);
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();

    renderMasterSubPanel(tabId);
}

// --- 6. RENDER LOGIC ---

function renderPage(pageId) {
    if (!state.currentUser) {
        if (typeof updateSindhuVisibility === 'function') updateSindhuVisibility();
        return; // Wait for login
    }

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
        case 'loans':
            renderLoansPage();
            break;
        case 'investments':
            renderInvestmentsPage();
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

    if (typeof updateSindhuVisibility === 'function') updateSindhuVisibility();
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

    const elLoanDash = document.getElementById('stat-loans-overview-balance');
    if (elLoanDash) {
        let pendingLoanReceivable = 0;
        state.clients.forEach(c => {
            const cs = getClientReportStats(c.id);
            if (cs.loansGiven > 0) pendingLoanReceivable += Math.max(0, cs.balanceReceivable);
        });
        elLoanDash.innerText = fC(pendingLoanReceivable);
    }
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
        const closingBal = ledger.length > 0 ? ledger[ledger.length - 1].balance : (Number(acc.openingBalance) || 0);
        const openingBal = Number(acc.openingBalance) || 0;
        
        const card = document.createElement('div');
        card.className = 'dash-acc-bal-card';
        card.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 2px;">
                <span class="acc-name">${acc.name} (${acc.type})</span>
                <span style="font-size: 11px; color: var(--text-muted);">Opening: ${fC(openingBal)}</span>
            </div>
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
        const isLoan = tx.isLoanDisbursement || tx.id.startsWith('t_loan_') || tx.category === 'Loan Given' || tx.category === 'Loan';
        if (isLoan) return false;
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
    
    const sortedAll = [...state.transactions].filter(tx => !tx.isLoanDisbursement && !tx.id.startsWith('t_loan_') && tx.category !== 'Loan Given').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const latestTx = sortedAll.slice(0, 5);

    if (latestTx.length === 0) {
        recentContainer.innerHTML = `<div class="empty-state" style="padding: 24px; text-align: center; color: var(--text-muted);">No expenses logged in this period.</div>`;
    } else {
        latestTx.forEach(tx => {
            const clientLabel = resolveFundSourceText(tx.clientId);
            const firstCat = Object.keys(state.categoriesConfig)[0] || 'Others';
            const catMeta = state.categoriesConfig[tx.category] || state.categoriesConfig[firstCat] || { color: '#64748b', icon: 'tag' };
            
            const item = document.createElement('div');
            item.className = 'recent-item';
            item.style.cursor = 'pointer';
            item.title = 'Click to edit this expense';
            item.onclick = () => openEditExpense(tx.id);
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
        const isLoan = tx.isLoanDisbursement || tx.id.startsWith('t_loan_') || tx.category === 'Loan Given' || tx.category === 'Loan';
        if (isLoan) return false;
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
                <span class="variance-lbl">${isOverspent ? 'Overspent:' : 'Remaining:'}</span>
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

function isClientParty(c) {
    const g = (c.group || 'Client').toLowerCase();
    return g === 'client' || g === 'debtor';
}

function isVendorParty(c) {
    const g = (c.group || 'Client').toLowerCase();
    return g === 'vendor' || g === 'creditor';
}

// PARTIES PAGE HELPERS & ACCORDION
window.togglePartyCard = function(id) {
    const card = document.getElementById(`party-card-${id}`);
    if (!card) return;
    const body = card.querySelector('.client-card-body');
    if (!body) return;
    
    const isExpanded = card.classList.contains('expanded');
    if (isExpanded) {
        card.classList.remove('expanded');
        body.style.display = 'none';
    } else {
        card.classList.add('expanded');
        body.style.display = 'block';
        if (window.lucide) lucide.createIcons();
    }
};

window.quickReceiveForParty = function(clientId) {
    openIncomeModal();
    const select = document.getElementById('income-client-select');
    const searchInput = document.getElementById('income-client-search-input');
    const matched = state.clients.find(c => c.id === clientId);
    if (select) select.value = clientId;
    if (searchInput && matched) {
        searchInput.value = matched.name;
        const clearBtn = document.getElementById('btn-clear-income-client-search');
        if (clearBtn) clearBtn.style.display = 'block';
    }
};

// PARTIES PAGE RENDERER
function renderClientsPage() {
    const container = document.getElementById('clients-list-container');
    container.innerHTML = '';
    const fC = v => '₹' + Math.round(v).toLocaleString('en-IN');

    const filter = (state.partyFilter || 'all').toLowerCase();
    const searchInput = document.getElementById('party-search-input');
    const searchQuery = (searchInput ? searchInput.value : '').trim().toLowerCase();

    // Update Filter Counts
    const countAll = state.clients.length;
    const countClients = state.clients.filter(isClientParty).length;
    const countVendors = state.clients.filter(isVendorParty).length;

    const dropdown = document.getElementById('party-category-dropdown');
    if (dropdown) {
        dropdown.value = (filter === 'debtor') ? 'client' : (filter === 'creditor') ? 'vendor' : filter;
    }

    const fyDropdown = document.getElementById('party-fy-dropdown');
    const fyFilter = fyDropdown ? fyDropdown.value : (state.partyFyFilter || 'all');
    if (fyDropdown) {
        fyDropdown.value = fyFilter;
    }

    const countBadge = document.getElementById('party-category-count-badge');
    if (countBadge) {
        if (filter === 'client' || filter === 'debtor') {
            countBadge.innerText = `Clients (${countClients})`;
        } else if (filter === 'vendor' || filter === 'creditor') {
            countBadge.innerText = `Vendors (${countVendors})`;
        } else {
            countBadge.innerText = `All Parties (${countAll})`;
        }
    }

    let filteredClients = [...state.clients];
    if (filter === 'client' || filter === 'debtor') {
        filteredClients = filteredClients.filter(isClientParty);
    } else if (filter === 'vendor' || filter === 'creditor') {
        filteredClients = filteredClients.filter(isVendorParty);
    }

    // Filter by Financial Year (if not 'all')
    if (fyFilter && fyFilter !== 'all') {
        filteredClients = filteredClients.filter(c => (c.pendingYear || '2026-2027') === fyFilter);
    }

    // Apply Live Search Filter
    if (searchQuery) {
        filteredClients = filteredClients.filter(c => {
            const nameMatch = c.name && c.name.toLowerCase().includes(searchQuery);
            const groupMatch = c.group && c.group.toLowerCase().includes(searchQuery);
            return nameMatch || groupMatch;
        });
    }

    // Sort: Pending/Active clients (due balance > 0) come FIRST;
    // Fully settled/paid clients (green cards / balance <= 0) move to the very LAST.
    filteredClients.sort((a, b) => {
        const statsA = getClientReportStats(a.id);
        const statsB = getClientReportStats(b.id);
        const settledA = statsA.balanceReceivable <= 0 ? 1 : 0;
        const settledB = statsB.balanceReceivable <= 0 ? 1 : 0;
        if (settledA !== settledB) {
            return settledA - settledB; // 0 (pending) before 1 (fully settled)
        }
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });

    if (filteredClients.length === 0) {
        const msg = searchQuery 
            ? `No parties found matching "${searchQuery}".` 
            : (filter === 'client' || filter === 'debtor') ? 'No clients added yet for this filter.' : (filter === 'vendor' || filter === 'creditor') ? 'No vendors added yet for this filter.' : 'No parties found for this filter.';
        container.innerHTML = `<div class="empty-state" style="grid-column:1/-1; padding:32px 16px; text-align:center;">${msg}</div>`;
    } else {
        filteredClients.forEach(client => {
            const stats = getClientReportStats(client.id);
            const isCompleted = stats.balanceReceivable <= 0;
            const receivableClass = isCompleted ? 'receivable-complete' : 'receivable-active';
            const receivableText = isCompleted ? 'Fully Received' : fC(stats.balanceReceivable);
            const isVendor = isVendorParty(client);

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

            let contractInfoHTML = '';
            let loanItemizedHTML = '';
            if (stats.loansList && stats.loansList.length > 0) {
                loanItemizedHTML = stats.loansList.map(l => {
                    const isGiven = l.type === 'given';
                    const rem = l.remark ? ` — <em style="color:var(--text-secondary);">${l.remark}</em>` : '';
                    return `
                        <div class="c-stat-row" style="font-size:11px; padding:3px 6px; background:rgba(13, 148, 136, 0.05); border-radius:3px; margin:2px 0;">
                            <span>${isGiven ? '💵 Given' : '🏦 Taken'} ${formatDbDate(l.date)} (${l.account || 'Direct'})${rem}:</span>
                            <span style="font-weight:700; color:${isGiven ? 'var(--primary)' : '#d97706'};">${fC(l.amount)}</span>
                        </div>
                    `;
                }).join('');
            }

            if (stats.loansGiven > 0) {
                contractInfoHTML += `
                    <div class="c-stat-row" style="background: rgba(13, 148, 136, 0.08); padding: 5px 8px; border-radius: 4px; margin: 3px 0; border: 1px solid rgba(13, 148, 136, 0.2); align-items: center;">
                        <span class="c-stat-label" style="font-weight: 700; color: var(--primary);">Total Loans Given:</span>
                        <span class="c-stat-val" style="font-weight: 700; color: var(--primary);">${fC(stats.loansGiven)}</span>
                    </div>
                    ${loanItemizedHTML}
                `;
            }
            let contractItemsBreakdownHTML = '';
            if (client.contractItems && client.contractItems.length > 0) {
                contractItemsBreakdownHTML = `
                    <div style="background:var(--bg-primary); border:1px solid var(--border-color); border-radius:4px; padding:6px 8px; margin:4px 0;">
                        <div style="font-size:11px; font-weight:700; color:var(--text-secondary); margin-bottom:4px; display:flex; align-items:center; gap:4px;">
                            <i data-lucide="layers" style="width:12px; height:12px; color:var(--primary);"></i>
                            Services & Retainer Breakdown:
                        </div>
                        ${client.contractItems.map(ci => `
                            <div class="c-stat-row" style="font-size:11px; padding:2px 0;">
                                <span>• ${ci.particulars || 'Service'} (${ci.months} mo @ ₹${Number(ci.rate || 0).toLocaleString('en-IN')}):</span>
                                <span style="font-weight:600;">₹${Number(ci.amount || 0).toLocaleString('en-IN')}</span>
                            </div>
                        `).join('')}
                    </div>
                `;
            }

            if (Number(client.monthlyPay) > 0 || stats.yearlyContract > 0) {
                contractInfoHTML += `
                    <div class="c-stat-row">
                        <span class="c-stat-label">Monthly Retainer:</span>
                        <span class="c-stat-val">${fC(client.monthlyPay || 0)}</span>
                    </div>
                    <div class="c-stat-row">
                        <span class="c-stat-label">Yearly Retainer:</span>
                        <span class="c-stat-val">${fC(stats.yearlyContract)}</span>
                    </div>
                    ${contractItemsBreakdownHTML}
                `;
            }

            let discountRowHTML = '';
            if (stats.totalDiscount > 0) {
                discountRowHTML = `
                    <div class="c-stat-row" style="background: rgba(245, 158, 11, 0.08); padding: 4px 8px; border-radius: 4px; margin: 3px 0; border: 1px solid rgba(245, 158, 11, 0.25); align-items: center;">
                        <span class="c-stat-label" style="font-weight: 700; color: #d97706;">Discount Given:</span>
                        <span class="c-stat-val" style="font-weight: 700; color: #d97706;">${fC(stats.totalDiscount)}</span>
                    </div>
                `;
            }

            const card = document.createElement('div');
            card.className = `client-card ${isCompleted ? 'fully-paid-card' : ''}`;
            card.id = `party-card-${client.id}`;
            card.onclick = () => togglePartyCard(client.id);

            card.innerHTML = `
                <div class="client-card-header">
                    <div class="party-card-title-col">
                        <div class="party-card-name-row">
                            <h4 class="party-card-name">${client.name}</h4>
                            <span class="party-group-badge ${isVendor ? 'vendor' : 'client'}">
                                <i data-lucide="${isVendor ? 'truck' : 'user-check'}" style="width:12px; height:12px;"></i>
                                ${isVendor ? 'Vendor' : 'Client'}
                            </span>
                            ${isCompleted ? `
                                <span class="settled-badge" title="Full payment received">
                                    <i data-lucide="check-circle" style="width:11px; height:11px;"></i> Fully Settled
                                </span>
                            ` : ''}
                            <span class="preview-loan-tag" style="background: rgba(99, 102, 241, 0.12); color: #4f46e5; border: 1px solid rgba(99, 102, 241, 0.25); font-weight: 600;">
                                📅 FY: ${client.pendingYear || '2026-2027'}
                            </span>
                        </div>
                        <div class="party-card-summary-preview">
                            <span class="preview-receivable">
                                ${isVendor ? 'Payable: ' : 'Balance: '}<strong class="${receivableClass}">${receivableText}</strong>
                            </span>
                            ${stats.creditAmount > 0 ? `<span class="preview-loan-tag">Loan: ${fC(stats.creditAmount)}</span>` : ''}
                            ${stats.totalDiscount > 0 ? `<span class="preview-loan-tag" style="background: rgba(245, 158, 11, 0.15); color: #d97706; border: 1px solid rgba(245, 158, 11, 0.3);">Disc: ${fC(stats.totalDiscount)}</span>` : ''}
                        </div>
                    </div>
                    <div class="party-card-toggle-btn" title="Click to open/close details">
                        <i data-lucide="chevron-down" class="party-chevron-icon"></i>
                    </div>
                </div>
                <div class="client-card-body" style="display: none;">
                    <div class="client-stats">
                        <div class="c-stat-row" style="background: rgba(99, 102, 241, 0.06); padding: 4px 8px; border-radius: 4px; margin: 3px 0; border: 1px solid rgba(99, 102, 241, 0.2); align-items: center;">
                            <span class="c-stat-label" style="font-weight: 600; color: #4f46e5;">Pending Payment Year:</span>
                            <span class="c-stat-val" style="font-weight: 700; color: #4f46e5;">📅 ${client.pendingYear || '2026-2027'}</span>
                        </div>
                        ${contractInfoHTML}
                        <div class="c-stat-row">
                            <span class="c-stat-label">Opening Balance:</span>
                            <span class="c-stat-val" style="color:var(--text-secondary); font-weight:600;">${fC(stats.openingBalance)}</span>
                        </div>
                        <div class="c-stat-row" style="background: var(--bg-primary); padding: 5px 8px; border-radius: 4px; margin: 3px 0; border: 1px solid var(--border-color);">
                            <span class="c-stat-label" style="font-weight: 700; color: var(--text-primary);">Total Receivable:</span>
                            <span class="c-stat-val" style="font-weight: 700; color: var(--primary);">${fC(stats.totalReceivable)}</span>
                        </div>
                        <div class="c-stat-row">
                            <span class="c-stat-label">Received Amount:</span>
                            <span class="c-stat-val" style="color:var(--success); font-weight:600;">${fC(stats.totalReceived)}</span>
                        </div>
                        ${discountRowHTML}
                        <div class="c-stat-row" style="border-top:1px dashed var(--border-color); padding-top:6px; margin-top:2px;">
                            <span class="c-stat-label" style="font-weight:700;">Balance Receivable:</span>
                            <span class="c-stat-val ${receivableClass}">${receivableText}</span>
                        </div>
                        ${customFieldsHTML}
                    </div>
                    <div class="client-card-footer" onclick="event.stopPropagation()">
                        <button class="btn btn-outline btn-sm" onclick="openLoanModal('given', '${client.id}')" title="Give Loan / Add Debit" style="font-size:11px; padding:4px 9px; display:inline-flex; align-items:center; gap:4px; color:var(--primary); border-color:rgba(13, 148, 136, 0.4); background:rgba(13, 148, 136, 0.06); font-weight:600;">
                            <i data-lucide="hand-coins" style="width:12px; height:12px;"></i> Give Loan
                        </button>
                        <button class="btn btn-outline btn-sm" onclick="quickReceiveForParty('${client.id}')" title="Log Received Amount" style="font-size:11px; padding:4px 9px; display:inline-flex; align-items:center; gap:4px; color:var(--success); border-color:rgba(16, 185, 129, 0.4); background:rgba(16, 185, 129, 0.06); font-weight:600;">
                            <i data-lucide="plus-circle" style="width:12px; height:12px;"></i> Receive
                        </button>
                        <button class="btn btn-outline btn-sm" onclick="generateClientStatementPDF('${client.id}')" title="Download PDF Ledger" style="font-size:11px; padding:4px 8px; display:inline-flex; align-items:center; gap:3px; color:#4f46e5; border-color:rgba(99, 102, 241, 0.4); background:rgba(99, 102, 241, 0.06); font-weight:600;">
                            <i data-lucide="file-text" style="width:12px; height:12px;"></i> PDF
                        </button>
                        <button class="btn btn-outline btn-sm btn-excel" onclick="exportClientStatementExcel('${client.id}')" title="Export Client Excel Statement" style="font-size:11px; padding:4px 8px; display:inline-flex; align-items:center; gap:3px;">
                            <i data-lucide="file-spreadsheet" style="width:12px; height:12px;"></i> Excel
                        </button>
                        <button class="btn btn-sm btn-whatsapp" onclick="shareClientLedgerWhatsApp('${client.id}')" title="Share Ledger Statement on WhatsApp" style="font-size:11px; padding:4px 8px; display:inline-flex; align-items:center; gap:3px;">
                            <i data-lucide="send" style="width:12px; height:12px;"></i> WhatsApp
                        </button>
                        <button class="btn-icon-only edit-btn" onclick="openEditClient('${client.id}')" title="Edit Party"><i data-lucide="edit-3"></i></button>
                        <button class="btn-icon-only delete-btn" onclick="deleteClient('${client.id}')" title="Delete Party"><i data-lucide="trash-2"></i></button>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    }

    lucide.createIcons();
    renderIncomeLogsTable();
}

function renderIncomeLogsTable() {
    const trHeaders = document.getElementById('income-table-headers');
    trHeaders.innerHTML = `
        <th>Client Name</th>
        <th>Received Date</th>
        <th>Destination Account</th>
        <th>Amount</th>
        <th>Discount (₹)</th>
        <th>Remark</th>
    `;
    state.customClientFields.forEach(f => {
        trHeaders.innerHTML += `<th>${f.name}</th>`;
    });
    trHeaders.innerHTML += `<th class="actions-col" style="display: var(--staff-access-display, table-cell);">Actions</th>`;

    const tbody = document.getElementById('income-logs-tbody');
    tbody.innerHTML = '';
    const sorted = [...state.incomeLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (sorted.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${7 + state.customClientFields.length}" style="text-align:center; color:var(--text-muted); padding:24px;">No income logged.</td></tr>`;
        lucide.createIcons();
        return;
    }

    sorted.forEach(log => {
        const client = state.clients.find(c => c.id === log.clientId);
        const clientName = client ? client.name : 'Unknown Client';
        const discountVal = Number(log.discount) > 0 
            ? `<span style="color:#d97706; font-weight:700; background:rgba(245, 158, 11, 0.12); padding:2px 8px; border-radius:4px; border:1px solid rgba(245, 158, 11, 0.25);">₹${Number(log.discount).toLocaleString('en-IN')}</span>` 
            : '<span style="color:var(--text-muted);">-</span>';
        const remarkVal = log.remark 
            ? `<span style="font-size:12px; color:var(--text-secondary); max-width:200px; display:inline-block; word-break:break-word;">${log.remark}</span>` 
            : '<span style="color:var(--text-muted);">-</span>';
        
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
            <td>${discountVal}</td>
            <td>${remarkVal}</td>
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

// ==========================================================================
// INVESTMENT PORTFOLIO MANAGER
// ==========================================================================

function setInvestmentKpiView(view) {
    if (state.investmentKpiView === view && view !== 'all') {
        state.investmentKpiView = 'all'; // Toggle back to all
    } else {
        state.investmentKpiView = view;
    }
    saveState();
    renderInvestmentsPage();
}

function setInvestmentStatusFilter(status) {
    state.activeInvestmentStatus = status;
    saveState();

    document.querySelectorAll('.inv-status-pill').forEach(el => {
        el.classList.toggle('active', el.id === `pill-inv-status-${status}`);
    });

    renderInvestmentsPage();
}

function getInvestmentStats(investment) {
    const invested = Number(investment.amount) || 0;
    const withdrawals = investment.withdrawals || [];
    const totalWithdrawn = withdrawals.reduce((sum, w) => sum + (Number(w.amount) || 0), 0);
    const activeBalance = Math.max(0, invested - totalWithdrawn);
    const isClosed = activeBalance <= 0;
    return {
        invested,
        totalWithdrawn,
        activeBalance,
        isClosed,
        withdrawalsCount: withdrawals.length
    };
}

function renderInvestmentsPage() {
    const fC = v => '₹' + Math.round(v).toLocaleString('en-IN');
    const container = document.getElementById('investments-list-container');
    if (!container) return;

    const investments = state.investments || [];
    const searchInput = document.getElementById('investment-search-input');
    const btnClear = document.getElementById('btn-clear-investment-search');
    const searchQuery = (searchInput ? searchInput.value : '').trim().toLowerCase();
    const catSelect = document.getElementById('investment-category-filter-select');
    const selectedCategory = catSelect ? catSelect.value : 'all';
    const statusFilter = state.activeInvestmentStatus || 'all';
    const kpiView = state.investmentKpiView || 'all';

    // 1. Calculate Portfolio KPIs
    let grossInvested = 0;
    let grossWithdrawn = 0;
    let activeHoldingsCount = 0;

    investments.forEach(inv => {
        const stats = getInvestmentStats(inv);
        grossInvested += stats.invested;
        grossWithdrawn += stats.totalWithdrawn;
        if (!stats.isClosed) {
            activeHoldingsCount++;
        }
    });

    const netActive = Math.max(0, grossInvested - grossWithdrawn);

    const elTotalInvested = document.getElementById('stat-inv-total-invested');
    const elTotalWithdrawn = document.getElementById('stat-inv-total-withdrawn');
    const elNetActive = document.getElementById('stat-inv-net-active');
    const elCount = document.getElementById('stat-inv-count');

    if (elTotalInvested) elTotalInvested.innerText = fC(grossInvested);
    if (elTotalWithdrawn) elTotalWithdrawn.innerText = fC(grossWithdrawn);
    if (elNetActive) elNetActive.innerText = fC(netActive);
    if (elCount) elCount.innerText = activeHoldingsCount;

    // Highlight Active KPI Card
    const cardInvested = document.getElementById('card-inv-stat-invested');
    const cardWithdrawn = document.getElementById('card-inv-stat-withdrawn');
    const cardActive = document.getElementById('card-inv-stat-active');
    const cardHoldings = document.getElementById('card-inv-stat-holdings');

    if (cardInvested) cardInvested.classList.toggle('active-kpi-filter', kpiView === 'invested');
    if (cardWithdrawn) cardWithdrawn.classList.toggle('active-kpi-filter', kpiView === 'withdrawn');
    if (cardActive) cardActive.classList.toggle('active-kpi-filter', kpiView === 'active');
    if (cardHoldings) cardHoldings.classList.toggle('active-kpi-filter', kpiView === 'holdings');

    // 2. Render Active View Notification Banner
    const bannerEl = document.getElementById('inv-kpi-view-banner');
    if (bannerEl) {
        if (kpiView === 'invested') {
            bannerEl.style.display = 'flex';
            bannerEl.innerHTML = `
                <div style="display:flex; align-items:center; gap:8px;">
                    <i data-lucide="wallet" style="width:16px; height:16px; color:var(--primary);"></i>
                    <span><strong>Total Invested Details:</strong> All ${investments.length} investment plans (Gross Principal: ${fC(grossInvested)})</span>
                </div>
                <button type="button" class="btn btn-outline btn-sm" onclick="setInvestmentKpiView('all')" style="padding:2px 8px; font-size:11px;">Reset View</button>
            `;
        } else if (kpiView === 'withdrawn') {
            let totalWCount = 0;
            investments.forEach(i => totalWCount += (i.withdrawals || []).length);
            bannerEl.style.display = 'flex';
            bannerEl.innerHTML = `
                <div style="display:flex; align-items:center; gap:8px;">
                    <i data-lucide="arrow-down-left" style="width:16px; height:16px; color:#10b981;"></i>
                    <span><strong>All Withdrawals & Returns List:</strong> ${totalWCount} withdrawals recorded (Total Pulled: ${fC(grossWithdrawn)})</span>
                </div>
                <button type="button" class="btn btn-outline btn-sm" onclick="setInvestmentKpiView('all')" style="padding:2px 8px; font-size:11px;">Show All Investments</button>
            `;
        } else if (kpiView === 'active') {
            bannerEl.style.display = 'flex';
            bannerEl.innerHTML = `
                <div style="display:flex; align-items:center; gap:8px;">
                    <i data-lucide="trending-up" style="width:16px; height:16px; color:#3b82f6;"></i>
                    <span><strong>Active Portfolio:</strong> ${activeHoldingsCount} running plans (Net Active Balance: ${fC(netActive)})</span>
                </div>
                <button type="button" class="btn btn-outline btn-sm" onclick="setInvestmentKpiView('all')" style="padding:2px 8px; font-size:11px;">Show All</button>
            `;
        } else if (kpiView === 'holdings') {
            bannerEl.style.display = 'flex';
            bannerEl.innerHTML = `
                <div style="display:flex; align-items:center; gap:8px;">
                    <i data-lucide="pie-chart" style="width:16px; height:16px; color:#8b5cf6;"></i>
                    <span><strong>Category Holdings Breakdown:</strong> ${activeHoldingsCount} active asset holdings</span>
                </div>
                <button type="button" class="btn btn-outline btn-sm" onclick="setInvestmentKpiView('all')" style="padding:2px 8px; font-size:11px;">Show All</button>
            `;
        } else {
            bannerEl.style.display = 'none';
        }
    }

    // 3. SPECIAL VIEW: All Withdrawals / Returns Log Drilldown
    if (kpiView === 'withdrawn') {
        let allWithdrawals = [];
        investments.forEach(inv => {
            (inv.withdrawals || []).forEach(w => {
                allWithdrawals.push({
                    ...w,
                    investmentId: inv.id,
                    investmentName: inv.name,
                    category: inv.category
                });
            });
        });

        if (searchQuery) {
            allWithdrawals = allWithdrawals.filter(w => {
                const nameMatch = w.investmentName && w.investmentName.toLowerCase().includes(searchQuery);
                const accMatch = w.account && w.account.toLowerCase().includes(searchQuery);
                const remMatch = w.remark && w.remark.toLowerCase().includes(searchQuery);
                const amtMatch = w.amount && String(w.amount).includes(searchQuery);
                return nameMatch || accMatch || remMatch || amtMatch;
            });
        }

        allWithdrawals.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        container.innerHTML = '';
        if (allWithdrawals.length === 0) {
            container.innerHTML = `<div class="empty-state" style="grid-column:1/-1; padding:36px 16px; text-align:center;">No withdrawal or return records found.</div>`;
            if (window.lucide) lucide.createIcons();
            return;
        }

        allWithdrawals.forEach(w => {
            const card = document.createElement('div');
            card.className = 'client-card';
            card.style.borderLeft = '4px solid #10b981';
            card.innerHTML = `
                <div class="client-card-header" style="border-bottom:1px solid var(--border-color); padding-bottom:8px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:flex-start;">
                    <div>
                        <span class="badge" style="background:rgba(16, 185, 129, 0.12); color:#10b981; font-size:10px; font-weight:700; border:1px solid rgba(16, 185, 129, 0.25);">
                            <i data-lucide="arrow-down-left" style="width:10px; height:10px; vertical-align:middle;"></i> Withdrawal / Return
                        </span>
                        <h4 style="margin:4px 0 0 0; font-size:15px; font-weight:700; color:var(--text-primary);">${w.investmentName}</h4>
                        <span style="font-size:11px; color:var(--text-muted);">${w.category}</span>
                    </div>
                    <div style="text-align:right;">
                        <span style="font-size:10px; color:var(--text-muted); text-transform:uppercase; font-weight:600; display:block;">Amount Received</span>
                        <h3 style="margin:0; font-size:16px; font-weight:800; color:#10b981;">+${fC(Number(w.amount))}</h3>
                    </div>
                </div>
                <div class="client-card-body" style="display:flex; flex-direction:column; gap:4px; font-size:12px;">
                    <div class="c-stat-row" style="display:flex; justify-content:space-between;">
                        <span class="c-stat-label" style="color:var(--text-secondary);">Withdrawal Date:</span>
                        <strong class="c-stat-val" style="color:var(--text-primary);">${formatDbDate(w.date)}</strong>
                    </div>
                    <div class="c-stat-row" style="display:flex; justify-content:space-between;">
                        <span class="c-stat-label" style="color:var(--text-secondary);">Credited Into Account:</span>
                        <span class="badge-acctype" style="font-size:10px;">${w.account || 'Account'}</span>
                    </div>
                    ${w.remark ? `
                    <div class="c-stat-row" style="display:flex; justify-content:space-between; margin-top:2px;">
                        <span class="c-stat-label" style="color:var(--text-secondary);">Remark / Notes:</span>
                        <span class="c-stat-val" style="color:var(--text-secondary); max-width:65%; text-align:right; font-style:italic;">${w.remark}</span>
                    </div>
                    ` : ''}
                </div>
                <div class="client-card-footer" style="display:flex; justify-content:flex-end; align-items:center; gap:6px; margin-top:10px; padding-top:8px; border-top:1px solid var(--border-color);">
                    <button type="button" class="btn btn-outline btn-sm" onclick="deleteWithdrawal('${w.investmentId}', '${w.id}')" style="padding:4px 8px; font-size:11px; color:var(--danger); border-color:rgba(225,29,72,0.3); display:var(--staff-access-display, inline-flex); align-items:center; gap:4px;">
                        <i data-lucide="trash-2" style="width:12px; height:12px;"></i> Delete Record
                    </button>
                </div>
            `;
            container.appendChild(card);
        });
        if (window.lucide) lucide.createIcons();
        return;
    }

    // 4. SPECIAL VIEW: Category Holdings Distribution Matrix
    let categoryHeaderHTML = '';
    if (kpiView === 'holdings') {
        const catMap = {};
        investments.forEach(inv => {
            const stats = getInvestmentStats(inv);
            if (!catMap[inv.category]) {
                catMap[inv.category] = { count: 0, activeCount: 0, invested: 0, activeBalance: 0 };
            }
            catMap[inv.category].count++;
            if (!stats.isClosed) catMap[inv.category].activeCount++;
            catMap[inv.category].invested += stats.invested;
            catMap[inv.category].activeBalance += stats.activeBalance;
        });

        const catIcons = {
            'Mutual Funds / SIP': { icon: 'trending-up', color: '#0d9488' },
            'Fixed Deposit (FD)': { icon: 'landmark', color: '#3b82f6' },
            'Shares / Stocks': { icon: 'bar-chart-2', color: '#8b5cf6' },
            'Gold / Silver': { icon: 'award', color: '#f59e0b' },
            'Real Estate': { icon: 'home', color: '#ec4899' },
            'PPF / EPF / Bonds': { icon: 'file-text', color: '#06b6d4' },
            'Other Investments': { icon: 'briefcase', color: '#64748b' }
        };

        const catKeys = Object.keys(catMap);
        if (catKeys.length > 0) {
            categoryHeaderHTML = `
                <div style="grid-column: 1 / -1; display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin-bottom: 14px;">
                    ${catKeys.map(cat => {
                        const data = catMap[cat];
                        const meta = catIcons[cat] || { icon: 'pie-chart', color: '#0d9488' };
                        const share = netActive > 0 ? Math.round((data.activeBalance / netActive) * 100) : 0;
                        return `
                            <div class="dash-acc-bal-card" style="cursor:pointer; border-left:3px solid ${meta.color};" onclick="document.getElementById('investment-category-filter-select').value='${cat}'; renderInvestmentsPage();" title="Click to filter ${cat}">
                                <div style="display:flex; flex-direction:column; gap:2px;">
                                    <div style="display:flex; justify-content:space-between; align-items:center;">
                                        <span class="acc-name" style="font-size:12px; font-weight:700; color:var(--text-primary);">
                                            <i data-lucide="${meta.icon}" style="width:12px; height:12px; vertical-align:middle; color:${meta.color};"></i> ${cat}
                                        </span>
                                        <span class="badge" style="font-size:9px; font-weight:700; background:rgba(13,148,136,0.1); color:var(--primary);">${share}%</span>
                                    </div>
                                    <span style="font-size:11px; color:var(--text-secondary);">${data.activeCount} Active Plans (${data.count} Total)</span>
                                </div>
                                <div style="text-align:right;">
                                    <span style="font-size:10px; color:var(--text-muted); text-transform:uppercase; font-weight:600; display:block;">Active Value</span>
                                    <strong style="font-size:13px; color:var(--primary);">${fC(data.activeBalance)}</strong>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }
    }

    // 5. Filter Standard Investments List
    let filtered = [...investments];

    if (selectedCategory && selectedCategory !== 'all') {
        filtered = filtered.filter(inv => inv.category === selectedCategory);
    }

    if (kpiView === 'active' || statusFilter === 'active') {
        filtered = filtered.filter(inv => {
            const s = getInvestmentStats(inv);
            return !s.isClosed;
        });
    } else if (statusFilter === 'closed') {
        filtered = filtered.filter(inv => {
            const s = getInvestmentStats(inv);
            return s.isClosed;
        });
    }

    if (searchQuery) {
        filtered = filtered.filter(inv => {
            const nameMatch = inv.name && inv.name.toLowerCase().includes(searchQuery);
            const catMatch = inv.category && inv.category.toLowerCase().includes(searchQuery);
            const accMatch = inv.account && inv.account.toLowerCase().includes(searchQuery);
            const remMatch = inv.remark && inv.remark.toLowerCase().includes(searchQuery);
            const amtMatch = inv.amount && String(inv.amount).includes(searchQuery);
            return nameMatch || catMatch || accMatch || remMatch || amtMatch;
        });
    }

    // Sort: Active investments first, then by date descending
    filtered.sort((a, b) => {
        const statsA = getInvestmentStats(a);
        const statsB = getInvestmentStats(b);
        if (statsA.isClosed !== statsB.isClosed) {
            return statsA.isClosed ? 1 : -1; // Active first
        }
        return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    // 6. Render Cards
    container.innerHTML = categoryHeaderHTML;

    if (filtered.length === 0) {
        const msg = searchQuery 
            ? `No investments found matching "${searchQuery}".` 
            : (selectedCategory !== 'all') 
                ? `No investments found under "${selectedCategory}".` 
                : (kpiView === 'active' || statusFilter === 'active')
                    ? 'No active investments currently running.'
                    : (statusFilter === 'closed')
                        ? 'No closed / redeemed investments.'
                        : 'No investments added yet. Click "+ Add Investment" to create your first portfolio entry!';
        container.innerHTML += `<div class="empty-state" style="grid-column:1/-1; padding:36px 16px; text-align:center;">${msg}</div>`;
        if (window.lucide) lucide.createIcons();
        return;
    }

    filtered.forEach(inv => {
        const stats = getInvestmentStats(inv);
        const isClosed = stats.isClosed;
        const statusBadge = isClosed 
            ? `<span class="badge" style="background:rgba(100, 116, 139, 0.15); color:#64748b; font-size:10px; font-weight:700; border:1px solid rgba(100, 116, 139, 0.3);">Closed / Redeemed</span>`
            : `<span class="badge" style="background:rgba(16, 185, 129, 0.15); color:#10b981; font-size:10px; font-weight:700; border:1px solid rgba(16, 185, 129, 0.3);">Active Portfolio</span>`;

        // Category icon & color mapping
        const catIcons = {
            'Mutual Funds / SIP': { icon: 'trending-up', color: '#0d9488' },
            'Fixed Deposit (FD)': { icon: 'landmark', color: '#3b82f6' },
            'Shares / Stocks': { icon: 'bar-chart-2', color: '#8b5cf6' },
            'Gold / Silver': { icon: 'award', color: '#f59e0b' },
            'Real Estate': { icon: 'home', color: '#ec4899' },
            'PPF / EPF / Bonds': { icon: 'file-text', color: '#06b6d4' },
            'Other Investments': { icon: 'briefcase', color: '#64748b' }
        };
        const catMeta = catIcons[inv.category] || { icon: 'pie-chart', color: '#0d9488' };

        // Withdrawals history rows
        let withdrawalsHTML = '';
        if (inv.withdrawals && inv.withdrawals.length > 0) {
            withdrawalsHTML = `
                <div class="inv-withdrawals-section" style="margin-top:10px; padding-top:10px; border-top:1px dashed var(--border-color);">
                    <div style="font-size:11px; font-weight:700; color:var(--text-secondary); margin-bottom:6px; display:flex; justify-content:space-between; align-items:center;">
                        <span>Withdrawal / Return History (${inv.withdrawals.length}):</span>
                        <span style="color:#10b981; font-weight:700;">Total: +${fC(stats.totalWithdrawn)}</span>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:4px;">
                        ${inv.withdrawals.map((w) => `
                            <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-primary); border:1px solid var(--border-color); border-radius:4px; padding:5px 8px; font-size:11px;">
                                <div>
                                    <span style="font-weight:600; color:var(--text-primary);">${formatDbDate(w.date)}</span>
                                    <span style="color:var(--text-muted); font-size:10px; margin-left:4px;">➔ ${w.account || 'Account'}</span>
                                    ${w.remark ? `<div style="color:var(--text-secondary); font-size:10px;">${w.remark}</div>` : ''}
                                </div>
                                <div style="display:flex; align-items:center; gap:6px;">
                                    <strong style="color:#10b981;">+${fC(Number(w.amount))}</strong>
                                    <button type="button" class="btn-icon-only" onclick="deleteWithdrawal('${inv.id}', '${w.id}')" title="Delete Withdrawal" style="width:20px; height:20px; color:var(--danger); display:var(--staff-access-display, inline-flex);">
                                        <i data-lucide="x" style="width:12px; height:12px;"></i>
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        const fundSourceLabel = inv.fundSource ? resolveFundSourceLabel(inv.fundSource) : '<span style="color:var(--text-muted); font-style:italic;">General Account Surplus</span>';

        const card = document.createElement('div');
        card.className = `client-card ${isClosed ? 'settled-card' : ''}`;
        card.style.background = isClosed ? 'var(--bg-secondary)' : 'var(--bg-secondary)';
        card.style.border = isClosed ? '1.5px solid var(--border-color)' : '1.5px solid var(--border-color)';
        
        card.innerHTML = `
            <div class="client-card-header" style="border-bottom:1px solid var(--border-color); padding-bottom:8px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                    <div style="display:flex; align-items:center; gap:6px; margin-bottom:3px;">
                        <span class="badge" style="background:rgba(13, 148, 136, 0.12); color:${catMeta.color}; font-size:10px; font-weight:700; border:1px solid rgba(13, 148, 136, 0.25);">
                            <i data-lucide="${catMeta.icon}" style="width:10px; height:10px; vertical-align:middle;"></i> ${inv.category}
                        </span>
                        ${statusBadge}
                    </div>
                    <h4 style="margin:0; font-size:15px; font-weight:700; color:var(--text-primary);">${inv.name}</h4>
                </div>
                <div style="text-align:right;">
                    <span style="font-size:10px; color:var(--text-muted); text-transform:uppercase; font-weight:600; display:block;">Active Balance</span>
                    <h3 style="margin:0; font-size:16px; font-weight:800; color:${isClosed ? '#64748b' : '#0d9488'};">${fC(stats.activeBalance)}</h3>
                </div>
            </div>

            <div class="client-card-body" style="display:flex; flex-direction:column; gap:4px; font-size:12px;">
                <div class="c-stat-row" style="display:flex; justify-content:space-between;">
                    <span class="c-stat-label" style="color:var(--text-secondary);">Invested Principal:</span>
                    <strong class="c-stat-val" style="color:var(--text-primary);">${fC(stats.invested)}</strong>
                </div>
                <div class="c-stat-row" style="display:flex; justify-content:space-between;">
                    <span class="c-stat-label" style="color:var(--text-secondary);">Disbursed From / Mode:</span>
                    <span class="c-stat-val" style="color:var(--text-primary);">${formatDbDate(inv.date)} • <span class="badge-acctype" style="font-size:10px;">${inv.account}</span></span>
                </div>
                <div class="c-stat-row" style="display:flex; justify-content:space-between;">
                    <span class="c-stat-label" style="color:var(--text-secondary);">Fund Allocated From:</span>
                    <span class="c-stat-val" style="color:var(--text-primary); font-size:11px; text-align:right;">${fundSourceLabel}</span>
                </div>
                <div class="c-stat-row" style="display:flex; justify-content:space-between;">
                    <span class="c-stat-label" style="color:var(--text-secondary);">Total Withdrawn:</span>
                    <strong class="c-stat-val" style="color:#10b981;">${stats.totalWithdrawn > 0 ? '+' + fC(stats.totalWithdrawn) : '₹0'}</strong>
                </div>
                ${inv.remark ? `
                <div class="c-stat-row" style="display:flex; justify-content:space-between; margin-top:2px;">
                    <span class="c-stat-label" style="color:var(--text-secondary);">Remark / Notes:</span>
                    <span class="c-stat-val" style="color:var(--text-secondary); max-width:65%; text-align:right; font-style:italic;">${inv.remark}</span>
                </div>
                ` : ''}

                ${withdrawalsHTML}
            </div>

            <div class="client-card-footer" style="display:flex; justify-content:flex-end; align-items:center; gap:6px; margin-top:10px; padding-top:8px; border-top:1px solid var(--border-color); flex-wrap:wrap;">
                ${!isClosed ? `
                <button type="button" class="btn btn-success btn-sm" onclick="openWithdrawModal('${inv.id}')" style="padding:4px 10px; font-size:11px; display:inline-flex; align-items:center; gap:4px; font-weight:700;">
                    <i data-lucide="arrow-down-left" style="width:12px; height:12px;"></i> Withdraw
                </button>
                ` : ''}
                <button type="button" class="btn btn-outline btn-sm" onclick="openInvestmentModal('${inv.id}')" style="padding:4px 8px; font-size:11px; display:inline-flex; align-items:center; gap:4px;">
                    <i data-lucide="edit-3" style="width:12px; height:12px;"></i> Edit
                </button>
                <button type="button" class="btn btn-outline btn-sm" onclick="deleteInvestment('${inv.id}')" style="padding:4px 8px; font-size:11px; color:var(--danger); border-color:rgba(225,29,72,0.3); display:var(--staff-access-display, inline-flex); align-items:center; gap:4px;">
                    <i data-lucide="trash-2" style="width:12px; height:12px;"></i> Delete
                </button>
            </div>
        `;
        container.appendChild(card);
    });

    if (window.lucide) lucide.createIcons();
}

function openInvestmentModal(id = null) {
    const modal = document.getElementById('modal-investment');
    const form = document.getElementById('form-investment');
    const title = document.getElementById('modal-investment-title');
    const accSelect = document.getElementById('investment-account-select');
    const fundSelect = document.getElementById('investment-fund-source');

    if (!modal || !form) return;
    form.reset();

    const fC = v => '₹' + Math.round(v).toLocaleString('en-IN');

    // Populate Account select with Cash and Bank accounts
    if (accSelect) {
        accSelect.innerHTML = '';
        (state.accounts || []).forEach(acc => {
            accSelect.innerHTML += `<option value="${acc.name}">${acc.name} (${acc.type})</option>`;
        });
    }

    // Populate Fund Origin / Inflow Source Select
    if (fundSelect) {
        let capitalOptions = `
            <option value="opening_bank">🏦 Bank Opening Balance</option>
            <option value="opening_cash">💵 Cash Opening Balance</option>
        `;
        if (state.accounts && state.accounts.length > 0) {
            state.accounts.forEach(a => {
                const icon = a.type === 'Cash' ? '💵' : '🏦';
                const balStr = a.openingBalance ? ` (${fC(a.openingBalance)})` : '';
                capitalOptions += `<option value="opening_acc_${a.id}">${icon} ${a.name} Opening${balStr}</option>`;
            });
        }
        fundSelect.innerHTML = `
            <option value="">General Surplus / Direct Account Book</option>
            <optgroup label="Capital / Opening Funds">
                ${capitalOptions}
            </optgroup>
            <optgroup label="Party / Client Inflow">
                ${(state.clients || []).map(c => `<option value="${c.id}">👤 ${c.name} (${c.group || 'Client'})</option>`).join('')}
            </optgroup>
        `;
    }

    const editIdInput = document.getElementById('edit-investment-id');
    const dateInput = document.getElementById('investment-date');
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

    if (id) {
        const inv = (state.investments || []).find(i => i.id === id);
        if (inv) {
            title.innerText = 'Edit Investment Details';
            editIdInput.value = inv.id;
            document.getElementById('investment-name').value = inv.name || '';
            document.getElementById('investment-category').value = inv.category || 'Mutual Funds / SIP';
            document.getElementById('investment-amount').value = inv.amount || '';
            if (dateInput) dateInput.value = inv.date || '';
            if (accSelect) accSelect.value = inv.account || '';
            if (fundSelect) fundSelect.value = inv.fundSource || '';
            document.getElementById('investment-remark').value = inv.remark || '';
        }
    } else {
        title.innerText = 'Add New Investment';
        editIdInput.value = '';
    }

    modal.classList.add('active');
}

function closeInvestmentModal() {
    const modal = document.getElementById('modal-investment');
    if (modal) modal.classList.remove('active');
}

async function handleInvestmentSubmit(e) {
    e.preventDefault();
    const editId = document.getElementById('edit-investment-id').value;
    const name = document.getElementById('investment-name').value.trim();
    const category = document.getElementById('investment-category').value;
    const amount = Number(document.getElementById('investment-amount').value) || 0;
    const date = document.getElementById('investment-date').value;
    const account = document.getElementById('investment-account-select').value;
    const fundSource = document.getElementById('investment-fund-source') ? document.getElementById('investment-fund-source').value : '';
    const remark = document.getElementById('investment-remark').value.trim();

    if (!name || amount <= 0 || !date || !account) {
        alert("Please enter a valid investment name, amount, date, and payment account.");
        return;
    }

    if (!state.investments) state.investments = [];

    if (editId) {
        const inv = state.investments.find(i => i.id === editId);
        if (inv) {
            inv.name = name;
            inv.category = category;
            inv.amount = amount;
            inv.date = date;
            inv.account = account;
            inv.fundSource = fundSource;
            inv.remark = remark;
        }
    } else {
        const newInv = {
            id: 'inv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            name,
            category,
            amount,
            date,
            account,
            fundSource,
            remark,
            withdrawals: [],
            timestamp: Date.now()
        };
        state.investments.unshift(newInv);
    }

    saveState();
    closeInvestmentModal();
    renderPage(state.activePage);

    if (state.cloudSyncEnabled && firebaseDb) {
        try {
            await firebaseDb.collection('investments').doc('all').set({ list: state.investments });
        } catch (err) {
            console.error("Firebase investments sync error:", err);
        }
    }
}

function openWithdrawModal(investmentId) {
    const modal = document.getElementById('modal-investment-withdraw');
    const form = document.getElementById('form-investment-withdraw');
    if (!modal || !form) return;

    form.reset();

    const inv = (state.investments || []).find(i => i.id === investmentId);
    if (!inv) {
        alert("Investment not found.");
        return;
    }

    const stats = getInvestmentStats(inv);
    if (stats.activeBalance <= 0) {
        alert("This investment is already fully withdrawn/closed.");
        return;
    }

    document.getElementById('withdraw-investment-id').value = inv.id;
    document.getElementById('withdraw-investment-name').value = `${inv.name} (${inv.category})`;
    document.getElementById('withdraw-available-balance-display').innerText = '₹' + Math.round(stats.activeBalance).toLocaleString('en-IN');
    
    const amountInput = document.getElementById('withdraw-amount');
    if (amountInput) {
        amountInput.max = stats.activeBalance;
        amountInput.placeholder = `Max: ${stats.activeBalance}`;
    }

    const dateInput = document.getElementById('withdraw-date');
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

    const accSelect = document.getElementById('withdraw-account-select');
    if (accSelect) {
        accSelect.innerHTML = '';
        (state.accounts || []).forEach(acc => {
            accSelect.innerHTML += `<option value="${acc.name}">${acc.name} (${acc.type})</option>`;
        });
        if (inv.account && Array.from(accSelect.options).some(o => o.value === inv.account)) {
            accSelect.value = inv.account;
        }
    }

    modal.classList.add('active');
}

function closeWithdrawModal() {
    const modal = document.getElementById('modal-investment-withdraw');
    if (modal) modal.classList.remove('active');
}

async function handleWithdrawSubmit(e) {
    e.preventDefault();
    const investmentId = document.getElementById('withdraw-investment-id').value;
    const amount = Number(document.getElementById('withdraw-amount').value) || 0;
    const date = document.getElementById('withdraw-date').value;
    const account = document.getElementById('withdraw-account-select').value;
    const remark = document.getElementById('withdraw-remark').value.trim();

    const inv = (state.investments || []).find(i => i.id === investmentId);
    if (!inv) {
        alert("Investment not found.");
        return;
    }

    const stats = getInvestmentStats(inv);
    if (amount <= 0) {
        alert("Please enter a valid withdrawal amount.");
        return;
    }

    if (amount > stats.activeBalance) {
        alert(`Withdrawal amount (₹${amount}) cannot exceed the available active balance (₹${stats.activeBalance}).`);
        return;
    }

    if (!inv.withdrawals) inv.withdrawals = [];

    const newWithdrawal = {
        id: 'w_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        amount,
        date,
        account,
        remark,
        timestamp: Date.now()
    };

    inv.withdrawals.push(newWithdrawal);
    saveState();
    closeWithdrawModal();
    renderPage(state.activePage);

    if (state.cloudSyncEnabled && firebaseDb) {
        try {
            await firebaseDb.collection('investments').doc('all').set({ list: state.investments });
        } catch (err) {
            console.error("Firebase investments sync error:", err);
        }
    }
}

async function deleteInvestment(id) {
    const currentUser = state.currentUser;
    if (currentUser && currentUser.role === 'Staff') {
        alert("🔒 Access Denied: Only Admin can delete investments.");
        return;
    }

    const inv = (state.investments || []).find(i => i.id === id);
    if (!inv) return;

    if (!confirm(`Are you sure you want to delete the investment "${inv.name}"?\n\nThis will also remove its corresponding ledger entries.`)) {
        return;
    }

    state.investments = (state.investments || []).filter(i => i.id !== id);
    saveState();
    renderPage(state.activePage);

    if (state.cloudSyncEnabled && firebaseDb) {
        try {
            await firebaseDb.collection('investments').doc('all').set({ list: state.investments });
        } catch (err) {
            console.error("Firebase investments sync error:", err);
        }
    }
}

async function deleteWithdrawal(investmentId, withdrawalId) {
    const currentUser = state.currentUser;
    if (currentUser && currentUser.role === 'Staff') {
        alert("🔒 Access Denied: Only Admin can delete withdrawal entries.");
        return;
    }

    const inv = (state.investments || []).find(i => i.id === investmentId);
    if (!inv || !inv.withdrawals) return;

    if (!confirm("Are you sure you want to delete this withdrawal entry?")) {
        return;
    }

    inv.withdrawals = inv.withdrawals.filter(w => w.id !== withdrawalId);
    saveState();
    renderPage(state.activePage);

    if (state.cloudSyncEnabled && firebaseDb) {
        try {
            await firebaseDb.collection('investments').doc('all').set({ list: state.investments });
        } catch (err) {
            console.error("Firebase investments sync error:", err);
        }
    }
}

// EXPENSES ACCORDION & HELPERS
window.toggleExpenseCategoryCard = function(catKey) {
    const card = document.getElementById(`exp-cat-card-${catKey}`);
    if (!card) return;
    const body = card.querySelector('.exp-cat-body');
    if (!body) return;
    
    const isExpanded = card.classList.contains('expanded');
    if (isExpanded) {
        card.classList.remove('expanded');
        body.style.display = 'none';
    } else {
        card.classList.add('expanded');
        body.style.display = 'block';
        if (window.lucide) lucide.createIcons();
    }
};

window.openAddExpenseForCategory = function(catName) {
    openExpenseModal('', catName);
};

window.toggleExpenseFlatTable = function() {
    const container = document.getElementById('expense-flat-table-container');
    const textSpan = document.getElementById('toggle-flat-table-text');
    if (!container) return;
    if (container.style.display === 'none') {
        container.style.display = 'block';
        if (textSpan) textSpan.innerText = 'Hide Table View';
    } else {
        container.style.display = 'none';
        if (textSpan) textSpan.innerText = 'Show Table View';
    }
};

// EXPENSES PAGE RENDERER
function renderExpensesPage() {
    const fC = v => '₹' + Math.round(v).toLocaleString('en-IN');
    const totalBadge = document.getElementById('expense-total-badge');
    const catSelect = document.getElementById('expense-category-filter-select');
    const searchInput = document.getElementById('expense-search-input');
    const searchQuery = (searchInput ? searchInput.value : '').trim().toLowerCase();
    const selectedCat = (catSelect ? catSelect.value : 'all') || 'all';

    // Compute Overall Statistics
    const allExpenses = state.transactions;
    const totalAllAmount = allExpenses.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
    const totalAllCount = allExpenses.length;

    if (totalBadge) {
        totalBadge.innerText = `Total: ${fC(totalAllAmount)} (${totalAllCount} Entries)`;
    }

    // Populate Category Filter Dropdown if options not yet matching or updated
    if (catSelect) {
        const currentVal = catSelect.value || 'all';
        let catOptions = `<option value="all">📁 All Categories (${totalAllCount})</option>`;
        
        const allCatNames = Array.from(new Set([
            ...Object.keys(state.categoriesConfig),
            ...state.transactions.map(t => t.category).filter(Boolean)
        ]));

        allCatNames.forEach(cat => {
            const catTxs = state.transactions.filter(t => t.category === cat);
            const catSum = catTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
            catOptions += `<option value="${cat}">${cat} (${catTxs.length} • ${fC(catSum)})</option>`;
        });

        catSelect.innerHTML = catOptions;
        if (currentVal && Array.from(catSelect.options).some(o => o.value === currentVal)) {
            catSelect.value = currentVal;
        }
    }

    // Filter transactions by Category and Search Query
    let filteredTxs = allExpenses;
    if (selectedCat !== 'all') {
        filteredTxs = filteredTxs.filter(t => t.category === selectedCat);
    }

    if (searchQuery) {
        filteredTxs = filteredTxs.filter(tx => {
            const descMatch = tx.description && tx.description.toLowerCase().includes(searchQuery);
            const catMatch = tx.category && tx.category.toLowerCase().includes(searchQuery);
            const modeMatch = tx.mode && tx.mode.toLowerCase().includes(searchQuery);
            const amountMatch = tx.amount && String(tx.amount).includes(searchQuery);
            const fundText = resolveFundSourceText(tx.clientId).toLowerCase();
            const fundMatch = fundText.includes(searchQuery);
            return descMatch || catMatch || modeMatch || amountMatch || fundMatch;
        });
    }

    // Sort transactions by date descending
    const sorted = [...filteredTxs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // 1. RENDER CATEGORY ACCORDION CARDS
    const accordionContainer = document.getElementById('expense-categories-accordion-container');
    if (accordionContainer) {
        accordionContainer.innerHTML = '';

        if (sorted.length === 0) {
            const msg = searchQuery 
                ? `No expense entries found matching "${searchQuery}".` 
                : (selectedCat !== 'all') ? `No expenses logged in category "${selectedCat}".` : 'No expense entries logged yet.';
            accordionContainer.innerHTML = `<div class="empty-state" style="grid-column: 1/-1; padding: 32px 16px; text-align: center;">${msg}</div>`;
        } else {
            // Group filtered transactions by Category
            const groups = {};
            sorted.forEach(tx => {
                const cat = tx.category || 'Others';
                if (!groups[cat]) groups[cat] = [];
                groups[cat].push(tx);
            });

            const catKeys = Object.keys(groups);

            catKeys.forEach(cat => {
                const txList = groups[cat];
                const catTotal = txList.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
                const catMeta = state.categoriesConfig[cat] || { color: '#64748b', icon: 'tag' };
                const pct = totalAllAmount > 0 ? Math.round((catTotal / totalAllAmount) * 100) : 0;
                const safeKey = cat.replace(/[^a-zA-Z0-9]/g, '_');
                const autoExpand = Boolean(searchQuery);

                let rowsHTML = '';
                txList.forEach(tx => {
                    const clientLabel = resolveFundSourceLabel(tx.clientId);
                    let customCells = '';
                    state.customTxFields.forEach(f => {
                        const val = tx[f.name] || '-';
                        customCells += `<span class="exp-tx-custom-tag" style="background:rgba(15, 23, 42, 0.05); padding:1px 6px; border-radius:3px;">${f.name}: <strong>${val}</strong></span>`;
                    });

                    rowsHTML += `
                        <div class="exp-entry-row" onclick="openEditExpense('${tx.id}')" title="Click to edit this expense entry">
                            <div class="exp-entry-main">
                                <div class="exp-entry-title">${tx.description}</div>
                                <div class="exp-entry-meta">
                                    <span style="font-weight:600; color:var(--text-secondary);"><i data-lucide="calendar" style="width:11px; height:11px; display:inline-block; vertical-align:middle; margin-right:2px;"></i> ${formatDbDate(tx.date)}</span>
                                    <span class="badge-acctype">${tx.mode}</span>
                                    ${tx.clientId ? `<span style="color:var(--primary); font-weight:600; font-size:11px;">${clientLabel}</span>` : ''}
                                    ${customCells}
                                </div>
                            </div>
                            <div class="exp-entry-right" onclick="event.stopPropagation()">
                                <div class="exp-entry-amount">-₹${Number(tx.amount).toLocaleString('en-IN')}</div>
                                <div class="exp-entry-actions">
                                    <button type="button" class="btn-exp-row-edit" onclick="openEditExpense('${tx.id}')" title="Edit Expense">
                                        <i data-lucide="edit-3" style="width:12px; height:12px;"></i> Edit
                                    </button>
                                    <button type="button" class="btn-exp-row-delete" style="display: var(--staff-access-display, inline-flex);" onclick="deleteExpense('${tx.id}')" title="Delete Expense">
                                        <i data-lucide="trash-2" style="width:12px; height:12px;"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                });

                const card = document.createElement('div');
                card.className = `expense-category-card ${autoExpand ? 'expanded' : ''}`;
                card.id = `exp-cat-card-${safeKey}`;
                card.onclick = () => toggleExpenseCategoryCard(safeKey);

                card.innerHTML = `
                    <div class="exp-cat-header">
                        <div class="exp-cat-title-col">
                            <span class="exp-cat-color-pill" style="background: ${catMeta.color};"></span>
                            <div class="exp-cat-info">
                                <div class="exp-cat-name-row">
                                    <h4 class="exp-cat-name">${cat}</h4>
                                    <span class="exp-cat-count-badge">${txList.length} ${txList.length === 1 ? 'entry' : 'entries'}</span>
                                </div>
                                <span class="exp-cat-pct">${pct}% of total expenses</span>
                            </div>
                        </div>
                        <div class="exp-cat-total-col">
                            <div class="exp-cat-amount">-₹${Math.round(catTotal).toLocaleString('en-IN')}</div>
                            <div class="party-card-toggle-btn" title="Click to view/hide transactions">
                                <i data-lucide="chevron-down" class="exp-chevron-icon"></i>
                            </div>
                        </div>
                    </div>
                    <div class="exp-cat-body" style="display: ${autoExpand ? 'block' : 'none'};">
                        <div class="exp-entries-list">
                            ${rowsHTML}
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:12px; padding-top:10px; border-top:1px dashed var(--border-color); flex-wrap:wrap; gap:8px;" onclick="event.stopPropagation()">
                            <span style="font-size:12px; color:var(--text-secondary); font-weight:600;">
                                Category Total: <strong style="color:var(--danger);">-₹${Math.round(catTotal).toLocaleString('en-IN')}</strong> (${txList.length} entries)
                            </span>
                            <button class="btn btn-outline btn-sm" onclick="openAddExpenseForCategory('${cat}')" style="font-size:11px; padding:5px 12px; display:inline-flex; align-items:center; gap:4px; color:var(--primary); border-color:var(--primary); font-weight:600;">
                                <i data-lucide="plus" style="width:12px; height:12px;"></i> Add to ${cat}
                            </button>
                        </div>
                    </div>
                `;
                accordionContainer.appendChild(card);
            });
        }
    }

    // 2. RENDER DETAILED FLAT TABLE
    const trHeaders = document.getElementById('expense-table-headers');
    if (trHeaders) {
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
    }

    const tbody = document.getElementById('expenses-tbody');
    if (tbody) {
        tbody.innerHTML = '';

        if (sorted.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${7 + state.customTxFields.length}" style="text-align:center; color:var(--text-muted); padding:32px;">No expense entries logged.</td></tr>`;
        } else {
            sorted.forEach(tx => {
                const clientLabel = resolveFundSourceLabel(tx.clientId);
                
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
                    <td style="font-weight:700; color:var(--danger);">-₹${Number(tx.amount).toLocaleString('en-IN')}</td>
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
        }
    }

    if (window.lucide) lucide.createIcons();
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

    let creditCardHTML = '';
    if (stats.creditAmount > 0) {
        creditCardHTML = `
            <div class="report-stat-card val-primary" style="border-left: 4px solid var(--primary);">
                <h5>Credit / Loan Given</h5>
                <span class="val" style="color:var(--primary); font-weight:700;">${fC(stats.creditAmount)}</span>
            </div>
        `;
    }

    let discountCardHTML = '';
    if (stats.totalDiscount > 0) {
        discountCardHTML = `
            <div class="report-stat-card val-primary" style="border-left: 4px solid #f59e0b;">
                <h5>Total Discount</h5>
                <span class="val" style="color:#d97706; font-weight:700;">${fC(stats.totalDiscount)}</span>
            </div>
        `;
    }

    const client = state.clients.find(c => c.id === clientId);
    const pendingYear = client ? (client.pendingYear || '2026-2027') : '2026-2027';

    statsContainer.innerHTML = `
        <div class="report-stat-card val-primary" style="border-left: 4px solid #6366f1;">
            <h5>Financial Year</h5>
            <span class="val" style="color: #4f46e5; font-size: 15px;">📅 ${pendingYear}</span>
        </div>
        ${creditCardHTML}
        <div class="report-stat-card val-primary">
            <h5>Yearly Retainer</h5>
            <span class="val">${fC(stats.yearlyContract)}</span>
        </div>
        <div class="report-stat-card val-primary">
            <h5>Opening Balance</h5>
            <span class="val" style="color:var(--text-secondary);">${fC(stats.openingBalance)}</span>
        </div>
        <div class="report-stat-card val-primary">
            <h5>Total Receivable</h5>
            <span class="val" style="color:var(--primary); font-weight:700;">${fC(stats.totalReceivable)}</span>
        </div>
        <div class="report-stat-card val-success">
            <h5>Total Received</h5>
            <span class="val">${fC(stats.totalReceived)}</span>
        </div>
        ${discountCardHTML}
        <div class="report-stat-card ${stats.balanceReceivable > 0 ? 'val-primary' : 'val-success'}">
            <h5>Balance Receivable</h5>
            <span class="val" style="color: ${stats.balanceReceivable > 0 ? 'var(--primary)' : 'var(--success)'}; font-weight:700;">${stats.balanceReceivable <= 0 ? 'Settled (₹0)' : fC(stats.balanceReceivable)}</span>
        </div>
        <div class="report-stat-card val-danger">
            <h5>Spent (Allocated)</h5>
            <span class="val">${fC(stats.totalSpent)}</span>
        </div>
        <div class="report-stat-card val-primary">
            <h5>Net Fund Balance</h5>
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

    // Render Contract Items Breakdown in Client Report
    const contractBox = document.getElementById('client-contract-breakdown-report-box');
    const contractTbody = document.getElementById('client-report-contracts-tbody');
    const contractTotalDisplay = document.getElementById('client-report-contracts-total');

    if (contractBox && contractTbody) {
        if (client && client.contractItems && client.contractItems.length > 0) {
            contractBox.style.display = 'block';
            contractTbody.innerHTML = '';
            client.contractItems.forEach(ci => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="font-weight:600;">${ci.particulars || 'Service'}</td>
                    <td>${ci.period || ('FY ' + (client.pendingYear || '2026-2027'))}</td>
                    <td class="text-right">${ci.months || 12}</td>
                    <td class="text-right">${ci.rate ? fC(ci.rate) : '-'}</td>
                    <td class="text-right" style="font-weight:700; color:var(--primary);">${fC(ci.amount || 0)}</td>
                `;
                contractTbody.appendChild(tr);
            });
            if (contractTotalDisplay) contractTotalDisplay.innerText = fC(stats.yearlyContract);
        } else {
            contractBox.style.display = 'none';
        }
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

    const acc = state.accounts.find(a => a.id === accId);
    const ledger = getAccountLedger(accId);
    const fC = v => '₹' + Math.round(v).toLocaleString('en-IN');
    const closingBal = ledger.length > 0 ? ledger[ledger.length - 1].balance : (acc ? Number(acc.openingBalance) || 0 : 0);
    const openingBal = acc ? (Number(acc.openingBalance) || 0) : 0;
    
    const elOpening = document.getElementById('selected-ledger-opening-balance');
    const elClosing = document.getElementById('selected-ledger-closing-balance');
    if (elOpening) elOpening.innerText = fC(openingBal);
    if (elClosing) elClosing.innerText = fC(closingBal);

    if (ledger.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:32px;">No transactions logged in this account book. Initial Opening Balance: ${fC(openingBal)}</td></tr>`;
        return;
    }

    ledger.forEach(row => {
        const cre = row.credit > 0 ? `+${fC(row.credit)}` : '-';
        const deb = row.debit > 0 ? `-${fC(row.debit)}` : '-';
        const balanceColor = row.balance < 0 ? 'color: var(--danger);' : '';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${formatDbDate(row.date)}</td>
            <td style="font-weight:600;">${row.particulars}</td>
            <td><span style="font-size:11px; color:var(--text-secondary);">${row.category}</span></td>
            <td class="text-right credit-amt">${cre}</td>
            <td class="text-right debit-amt">${deb}</td>
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
                    ${isOverspent ? 'Overspent' : 'Remaining'}
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
        if (membersTabHeader) membersTabHeader.style.display = 'none';
        if (state.activeMasterTab === 'members') {
            state.activeMasterTab = 'accounts';
            saveState();
        }
    } else {
        if (membersTabHeader) membersTabHeader.style.display = 'flex';
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
        { name: 'style.css', required: true },
        { name: 'sindhu_v1.js', required: true },
        { name: 'firebase-config.js', required: false },
        { name: 'manifest.json', required: false },
        { name: 'sw.js', required: false },
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

window.saveInlineAccountOpening = function(accId, val) {
    const acc = state.accounts.find(a => a.id === accId);
    if (!acc) return;
    acc.openingBalance = Number(val) || 0;
    addAccountDirect(acc);
    renderMasterAccounts();
    renderGlobalStats();
    if (state.activePage === 'dashboard') renderDashboardPage();
    if (state.activePage === 'reports') renderAccountLedgerDetails();
};

window.quickEditCurrentLedgerOpening = function() {
    const accId = state.selectedLedgerAccountId;
    if (!accId) return;
    openAccountModal(accId);
};

function renderMasterAccounts() {
    const tbody = document.getElementById('master-accounts-tbody');
    tbody.innerHTML = '';
    const fC = v => '₹' + Math.round(v).toLocaleString('en-IN');

    state.accounts.forEach(acc => {
        const ledger = getAccountLedger(acc.id);
        const closingBal = ledger.length > 0 ? ledger[ledger.length - 1].balance : (Number(acc.openingBalance) || 0);
        const openingBal = Number(acc.openingBalance) || 0;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight:600;">${acc.name}</td>
            <td><span class="badge-acctype">${acc.type} Book</span></td>
            <td style="min-width: 170px;">
                <div style="display: inline-flex; align-items: center; gap: 6px;">
                    <span style="font-weight: 600; color: var(--text-muted); font-size: 13px;">₹</span>
                    <input type="number" 
                           id="acc-inline-opening-${acc.id}" 
                           value="${openingBal}" 
                           step="any"
                           placeholder="0"
                           style="width: 95px; padding: 6px 8px; font-size: 13px; font-weight: 700; border-radius: var(--radius-sm); border: 1.5px solid var(--border-color); background: var(--bg-primary); color: var(--text-primary);"
                           onchange="saveInlineAccountOpening('${acc.id}', this.value)"
                    >
                    <button type="button" 
                            class="btn btn-primary btn-sm" 
                            onclick="saveInlineAccountOpening('${acc.id}', document.getElementById('acc-inline-opening-${acc.id}').value)"
                            title="Save Opening Balance"
                            style="padding: 5px 8px; font-size: 11px; height: auto;">
                        Save
                    </button>
                </div>
            </td>
            <td style="font-weight:700; color: ${closingBal < 0 ? 'var(--danger)' : 'var(--text-primary)'};">${fC(closingBal)}</td>
            <td class="actions-col">
                <div class="actions-wrapper">
                    <button class="btn-icon-only edit-btn" onclick="openEditAccount('${acc.id}')" title="Edit Account Details"><i data-lucide="edit-3"></i></button>
                    <button class="btn-icon-only delete-btn" onclick="deleteAccount('${acc.id}')" title="Delete Account"><i data-lucide="trash-2"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    renderMasterTransfers();
    lucide.createIcons();
}

function renderMasterClients() {
    const tbody = document.getElementById('master-clients-tbody');
    tbody.innerHTML = '';
    const fC = v => '₹' + Math.round(v).toLocaleString('en-IN');

    state.clients.forEach(client => {
        const stats = getClientReportStats(client.id);
        const isCompleted = stats.balanceReceivable <= 0;
        const isVendor = isVendorParty(client);
        const creditAmt = Number(client.creditAmount) || 0;
        const tr = document.createElement('tr');
        if (isCompleted) {
            tr.style.backgroundColor = 'rgba(16, 185, 129, 0.06)';
        }
        tr.innerHTML = `
            <td style="font-weight:600;">
                ${client.name}
                ${isCompleted ? `<span class="settled-badge" style="font-size:9px; padding:1px 6px; margin-left:4px;">Full Paid</span>` : ''}
            </td>
            <td>
                <span class="party-group-badge ${isVendor ? 'vendor' : 'client'}">
                    ${isVendor ? 'Vendor' : 'Client'}
                </span>
            </td>
            <td>
                <span class="badge" style="background: rgba(99, 102, 241, 0.12); color: #4f46e5; font-weight: 600; font-size: 11px; padding: 3px 7px; border-radius: 4px;">
                    📅 ${client.pendingYear || '2026-2027'}
                </span>
            </td>
            <td style="font-weight:600; color: ${creditAmt > 0 ? 'var(--primary)' : 'var(--text-muted)'};">${fC(creditAmt)}</td>
            <td>${fC(client.monthlyPay || 0)}</td>
            <td style="font-weight:500;">${fC(stats.yearlyContract)}</td>
            <td style="color:var(--text-secondary); font-weight:500;">${fC(stats.openingBalance)}</td>
            <td style="font-weight:700; color:var(--primary);">${fC(stats.totalReceivable)}</td>
            <td class="actions-col">
                <div class="actions-wrapper">
                    <button class="btn-icon-only edit-btn" onclick="openEditClient('${client.id}')" title="Edit Party"><i data-lucide="edit-3"></i></button>
                    <button class="btn-icon-only delete-btn" onclick="deleteClient('${client.id}')" title="Delete Party"><i data-lucide="trash-2"></i></button>
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
            e.stopPropagation();
            const page = this.getAttribute('data-page');
            if (page) navigateToPage(page);
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

    const cardLoansDash = document.getElementById('card-loans-overview');
    if (cardLoansDash) {
        cardLoansDash.addEventListener('click', () => {
            navigateToPage('loans');
        });
    }

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

    // Master settings dropdown accordion trigger & items
    const masterTrigger = document.getElementById('master-category-trigger');
    const masterContainer = document.getElementById('master-selector-container');
    if (masterTrigger && masterContainer) {
        masterTrigger.addEventListener('click', function(e) {
            e.stopPropagation();
            masterContainer.classList.toggle('open');
        });

        // Close when clicking outside
        document.addEventListener('click', function(e) {
            if (!masterContainer.contains(e.target)) {
                masterContainer.classList.remove('open');
            }
        });
    }

    document.querySelectorAll('.master-dropdown-item, .master-tab').forEach(item => {
        item.addEventListener('click', function(e) {
            e.stopPropagation();
            const sub = this.getAttribute('data-master-sub');
            if (sub) {
                setMasterTab(sub);
                if (masterContainer) masterContainer.classList.remove('open');
            }
        });
    });

    // Party Category Dropdown Selector (All / Clients / Vendors)
    const partyCatDropdown = document.getElementById('party-category-dropdown');
    if (partyCatDropdown) {
        partyCatDropdown.addEventListener('change', function() {
            state.partyFilter = this.value;
            saveState();
            renderClientsPage();
        });
    }

    // Party Financial Year Filter Dropdown
    const partyFyDropdown = document.getElementById('party-fy-dropdown');
    if (partyFyDropdown) {
        partyFyDropdown.addEventListener('change', function() {
            state.partyFyFilter = this.value;
            saveState();
            renderClientsPage();
        });
    }

    // Party Live Search Input
    const partySearchInput = document.getElementById('party-search-input');
    const btnClearPartySearch = document.getElementById('btn-clear-party-search');
    if (partySearchInput) {
        partySearchInput.addEventListener('input', function() {
            if (btnClearPartySearch) {
                btnClearPartySearch.style.display = this.value ? 'block' : 'none';
            }
            renderClientsPage();
        });
    }
    if (btnClearPartySearch && partySearchInput) {
        btnClearPartySearch.addEventListener('click', function() {
            partySearchInput.value = '';
            btnClearPartySearch.style.display = 'none';
            partySearchInput.focus();
            renderClientsPage();
        });
    }

    // Expense Category Filter Dropdown
    const expenseCatSelect = document.getElementById('expense-category-filter-select');
    if (expenseCatSelect) {
        expenseCatSelect.addEventListener('change', function() {
            renderExpensesPage();
        });
    }

    // Expense Live Search Input
    const expenseSearchInput = document.getElementById('expense-search-input');
    const btnClearExpenseSearch = document.getElementById('btn-clear-expense-search');
    if (expenseSearchInput) {
        expenseSearchInput.addEventListener('input', function() {
            if (btnClearExpenseSearch) {
                btnClearExpenseSearch.style.display = this.value ? 'block' : 'none';
            }
            renderExpensesPage();
        });
    }
    if (btnClearExpenseSearch && expenseSearchInput) {
        btnClearExpenseSearch.addEventListener('click', function() {
            expenseSearchInput.value = '';
            btnClearExpenseSearch.style.display = 'none';
            expenseSearchInput.focus();
            renderExpensesPage();
        });
    }

    // Loans Live Search Input
    const loanSearchInput = document.getElementById('loan-search-input');
    const btnClearLoanSearch = document.getElementById('btn-clear-loan-search');
    if (loanSearchInput) {
        loanSearchInput.addEventListener('input', function() {
            if (btnClearLoanSearch) {
                btnClearLoanSearch.style.display = this.value ? 'block' : 'none';
            }
            renderLoansPage();
        });
    }
    if (btnClearLoanSearch && loanSearchInput) {
        btnClearLoanSearch.addEventListener('click', function() {
            loanSearchInput.value = '';
            btnClearLoanSearch.style.display = 'none';
            loanSearchInput.focus();
            renderLoansPage();
        });
    }

    // Investments Search Input & Category Filter
    const invSearchInput = document.getElementById('investment-search-input');
    const btnClearInvSearch = document.getElementById('btn-clear-investment-search');
    if (invSearchInput) {
        invSearchInput.addEventListener('input', function() {
            if (btnClearInvSearch) {
                btnClearInvSearch.style.display = this.value ? 'block' : 'none';
            }
            renderInvestmentsPage();
        });
    }
    if (btnClearInvSearch && invSearchInput) {
        btnClearInvSearch.addEventListener('click', function() {
            invSearchInput.value = '';
            btnClearInvSearch.style.display = 'none';
            invSearchInput.focus();
            renderInvestmentsPage();
        });
    }
    const invCatSelect = document.getElementById('investment-category-filter-select');
    if (invCatSelect) {
        invCatSelect.addEventListener('change', function() {
            renderInvestmentsPage();
        });
    }

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

    // Investments Modal Triggers
    const btnAddInv = document.getElementById('btn-add-investment');
    if (btnAddInv) btnAddInv.addEventListener('click', () => openInvestmentModal());
    const btnCloseInv = document.getElementById('btn-close-investment-modal');
    if (btnCloseInv) btnCloseInv.addEventListener('click', () => closeInvestmentModal());
    const btnCancelInv = document.getElementById('btn-cancel-investment');
    if (btnCancelInv) btnCancelInv.addEventListener('click', () => closeInvestmentModal());

    const btnCloseWithdraw = document.getElementById('btn-close-withdraw-modal');
    if (btnCloseWithdraw) btnCloseWithdraw.addEventListener('click', () => closeWithdrawModal());
    const btnCancelWithdraw = document.getElementById('btn-cancel-withdraw');
    if (btnCancelWithdraw) btnCancelWithdraw.addEventListener('click', () => closeWithdrawModal());

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

    // Client retainer two-way live calculation
    const clientMonthly = document.getElementById('client-monthly-pay');
    const clientYearly = document.getElementById('client-yearly-pay');
    if (clientMonthly && clientYearly) {
        clientMonthly.addEventListener('input', function() {
            const m = Number(this.value) || 0;
            clientYearly.value = m > 0 ? (m * 12) : '';
        });
        clientYearly.addEventListener('input', function() {
            const y = Number(this.value) || 0;
            clientMonthly.value = y > 0 ? Math.round(y / 12) : '';
        });
    }

    // Form Submissions
    document.getElementById('form-client').addEventListener('submit', handleClientSubmit);
    document.getElementById('form-income').addEventListener('submit', handleIncomeSubmit);
    document.getElementById('form-expense').addEventListener('submit', handleExpenseSubmit);
    const formInvestment = document.getElementById('form-investment');
    if (formInvestment) formInvestment.addEventListener('submit', handleInvestmentSubmit);
    const formWithdraw = document.getElementById('form-investment-withdraw');
    if (formWithdraw) formWithdraw.addEventListener('submit', handleWithdrawSubmit);
    document.getElementById('form-account').addEventListener('submit', handleAccountSubmit);
    document.getElementById('form-account').addEventListener('submit', handleAccountSubmit);
    const formTransfer = document.getElementById('form-transfer');
    if (formTransfer) formTransfer.addEventListener('submit', handleTransferSubmit);
    const formLoan = document.getElementById('form-loan');
    if (formLoan) formLoan.addEventListener('submit', handleLoanSubmit);
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

    // Initialize Searchable Client Selectors
    setupSearchableClientDropdown({
        inputId: 'income-client-search-input',
        selectId: 'income-client-select',
        menuId: 'income-client-dropdown-menu',
        clearBtnId: 'btn-clear-income-client-search'
    });

    setupSearchableClientDropdown({
        inputId: 'loan-client-search-input',
        selectId: 'loan-client-select',
        menuId: 'loan-client-dropdown-menu',
        clearBtnId: 'btn-clear-loan-client-search'
    });
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

// --- CONTRACT & SERVICES BREAKDOWN ROW MANAGER ---
let activeContractItems = [];

window.renderContractItemsTable = function() {
    const tbody = document.getElementById('contract-items-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!activeContractItems || activeContractItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:10px;">No service breakdown added. Click "+ Add Row" or enter retainer below.</td></tr>`;
        recalculateContractTotals();
        return;
    }

    activeContractItems.forEach((item, idx) => {
        const tr = document.createElement('tr');
        tr.dataset.index = idx;
        tr.innerHTML = `
            <td>
                <input type="text" class="contract-item-input ci-particulars" placeholder="e.g. Monthly Retainer, GST" value="${item.particulars || ''}">
            </td>
            <td>
                <input type="text" class="contract-item-input ci-period" placeholder="e.g. Apr 26 - Mar 27" value="${item.period || ''}">
            </td>
            <td>
                <input type="number" min="1" step="1" class="contract-item-input ci-months" placeholder="12" value="${item.months !== undefined ? item.months : 12}" style="text-align:center;">
            </td>
            <td>
                <input type="number" min="0" step="any" class="contract-item-input ci-rate" placeholder="2500" value="${item.rate !== undefined ? item.rate : ''}" style="text-align:right;">
            </td>
            <td>
                <input type="number" min="0" step="any" class="contract-item-input ci-amount" placeholder="30000" value="${item.amount !== undefined ? item.amount : ''}" style="text-align:right; font-weight:700;">
            </td>
            <td style="text-align:center;">
                <button type="button" class="btn-del-contract-row" onclick="removeContractItemRow(${idx})" title="Delete Row">
                    <i data-lucide="trash-2" style="width:13px; height:13px;"></i>
                </button>
            </td>
        `;

        // Live calculation on input
        const inpPart = tr.querySelector('.ci-particulars');
        const inpPeriod = tr.querySelector('.ci-period');
        const inpMonths = tr.querySelector('.ci-months');
        const inpRate = tr.querySelector('.ci-rate');
        const inpAmount = tr.querySelector('.ci-amount');

        const updateRowMath = (isManualAmount = false) => {
            const months = Number(inpMonths.value) || 0;
            const rate = Number(inpRate.value) || 0;
            let amount = Number(inpAmount.value) || 0;

            if (!isManualAmount && months > 0 && rate > 0) {
                amount = months * rate;
                inpAmount.value = amount;
            } else if (isManualAmount && months > 0 && amount > 0 && rate === 0) {
                inpRate.value = Math.round(amount / months);
            }

            activeContractItems[idx] = {
                id: item.id || ('ci_' + Date.now() + '_' + idx),
                particulars: inpPart.value.trim(),
                period: inpPeriod.value.trim(),
                months: months,
                rate: rate,
                amount: amount
            };
            recalculateContractTotals();
        };

        inpPart.addEventListener('input', () => updateRowMath(false));
        inpPeriod.addEventListener('input', () => updateRowMath(false));
        inpMonths.addEventListener('input', () => updateRowMath(false));
        inpRate.addEventListener('input', () => updateRowMath(false));
        inpAmount.addEventListener('input', () => updateRowMath(true));

        tbody.appendChild(tr);
    });

    if (window.lucide) lucide.createIcons();
    recalculateContractTotals();
};

window.addContractItemRow = function(item = null) {
    const currentFY = document.getElementById('client-pending-year')?.value || '2026-2027';
    const newItem = item || {
        id: 'ci_' + Date.now(),
        particulars: '',
        period: 'FY ' + currentFY,
        months: 12,
        rate: '',
        amount: ''
    };
    activeContractItems.push(newItem);
    renderContractItemsTable();
};

window.removeContractItemRow = function(index) {
    activeContractItems.splice(index, 1);
    renderContractItemsTable();
};

window.recalculateContractTotals = function() {
    let totalYearly = 0;
    activeContractItems.forEach(item => {
        totalYearly += Number(item.amount) || 0;
    });

    const elTotalDisplay = document.getElementById('contract-items-total-display');
    if (elTotalDisplay) {
        elTotalDisplay.innerText = '₹' + Math.round(totalYearly).toLocaleString('en-IN');
    }

    const yearlyInp = document.getElementById('client-yearly-pay');
    const monthlyInp = document.getElementById('client-monthly-pay');

    if (activeContractItems.length > 0 && totalYearly > 0) {
        if (yearlyInp) yearlyInp.value = totalYearly || '';
        if (monthlyInp) monthlyInp.value = Math.round(totalYearly / 12) || '';
    }
};



window.closeClientModal = function() {
    const modal = document.getElementById('modal-client');
    if (modal) modal.classList.remove('active');
};

window.openClientModal = function(editId = '') {
    const modal = document.getElementById('modal-client');
    if (!modal) return;

    const form = document.getElementById('form-client');
    if (form) form.reset();

    const title = document.getElementById('modal-client-title');
    const editIdInput = document.getElementById('edit-client-id');
    const nameInput = document.getElementById('client-name');
    const groupInput = document.getElementById('client-group');
    const creditInput = document.getElementById('client-credit-amount');
    const loanSourceSelect = document.getElementById('client-loan-source-account');
    const loanDateInput = document.getElementById('client-loan-date');
    const loanDateGroup = document.getElementById('client-loan-date-group');
    const monthlyInput = document.getElementById('client-monthly-pay');
    const yearlyInput = document.getElementById('client-yearly-pay');
    const pendingYearSelect = document.getElementById('client-pending-year');
    const openingBalanceInput = document.getElementById('client-opening-balance');
    const customFieldsContainer = document.getElementById('client-modal-custom-fields-container');

    // Populate loan source accounts dropdown
    if (loanSourceSelect) {
        loanSourceSelect.innerHTML = `<option value="">None / Past Old Due (No Cash/Bank deduction)</option>`;
        (state.accounts || []).forEach(acc => {
            loanSourceSelect.innerHTML += `<option value="${acc.name}">${acc.name} (${acc.type})</option>`;
        });
    }

    // Render custom client fields
    if (customFieldsContainer) {
        customFieldsContainer.innerHTML = '';
        (state.customClientFields || []).forEach(f => {
            const div = document.createElement('div');
            div.className = 'form-group';
            div.innerHTML = `
                <label for="custom-field-${f.name}">${f.name}</label>
                <input type="${f.type === 'number' ? 'number' : 'text'}" id="custom-field-${f.name}" placeholder="Enter ${f.name}">
            `;
            customFieldsContainer.appendChild(div);
        });
    }

    if (editId) {
        const client = state.clients.find(c => c.id === editId);
        if (client) {
            if (title) title.innerText = 'Edit Party';
            if (editIdInput) editIdInput.value = client.id;
            if (nameInput) nameInput.value = client.name || '';
            if (groupInput) groupInput.value = client.group || (isVendorParty(client) ? 'Vendor' : 'Client');
            if (creditInput) creditInput.value = client.creditAmount || 0;
            if (loanSourceSelect) loanSourceSelect.value = client.loanSourceAccount || '';
            if (loanDateInput) loanDateInput.value = client.loanDate || '';
            if (monthlyInput) monthlyInput.value = client.monthlyPay || '';
            if (yearlyInput) yearlyInput.value = client.yearlyPay || (client.monthlyPay ? client.monthlyPay * 12 : '') || '';
            if (pendingYearSelect) pendingYearSelect.value = client.pendingYear || '2026-2027';
            if (openingBalanceInput) openingBalanceInput.value = client.openingBalance || 0;

            // Custom fields
            (state.customClientFields || []).forEach(f => {
                const el = document.getElementById(`custom-field-${f.name}`);
                if (el && client[f.name] !== undefined) {
                    el.value = client[f.name];
                }
            });

            // Contract breakdown items
            if (client.contractItems && client.contractItems.length > 0) {
                activeContractItems = JSON.parse(JSON.stringify(client.contractItems));
            } else {
                activeContractItems = [];
                // If yearly/monthly exists without contract items, add default single row
                if (client.yearlyPay > 0 || client.monthlyPay > 0) {
                    activeContractItems.push({
                        id: 'ci_' + Date.now(),
                        particulars: 'Professional Services Retainer',
                        period: 'FY ' + (client.pendingYear || '2026-2027'),
                        months: 12,
                        rate: client.monthlyPay || Math.round((client.yearlyPay || 0) / 12),
                        amount: client.yearlyPay || (client.monthlyPay * 12)
                    });
                }
            }
        }
    } else {
        if (title) title.innerText = 'Add New Party';
        if (editIdInput) editIdInput.value = '';
        if (pendingYearSelect) pendingYearSelect.value = '2026-2027';
        activeContractItems = [];
    }

    // Toggle loan date group visibility
    const toggleLoanDate = () => {
        if (loanDateGroup) {
            const hasLoan = Number(creditInput?.value) > 0 && loanSourceSelect?.value !== '';
            loanDateGroup.style.display = hasLoan ? 'block' : 'none';
        }
    };
    if (creditInput) creditInput.oninput = toggleLoanDate;
    if (loanSourceSelect) loanSourceSelect.onchange = toggleLoanDate;
    toggleLoanDate();

    renderContractItemsTable();
    modal.classList.add('active');
    if (window.lucide) lucide.createIcons();
};

function openClientModal(editId = '') {
    window.openClientModal(editId);
}

function closeClientModal() {
    window.closeClientModal();
}

function handleClientSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('edit-client-id').value;
    const name = document.getElementById('client-name').value.trim();
    const group = document.getElementById('client-group').value || 'Client';
    const creditAmount = Number(document.getElementById('client-credit-amount').value) || 0;
    const loanSourceAccount = document.getElementById('client-loan-source-account')?.value || '';
    const loanDate = document.getElementById('client-loan-date')?.value || new Date().toISOString().split('T')[0];
    const monthlyPay = Number(document.getElementById('client-monthly-pay').value) || 0;
    const yearlyPay = Number(document.getElementById('client-yearly-pay').value) || (monthlyPay * 12);
    const pendingYear = document.getElementById('client-pending-year')?.value || '2026-2027';
    const openingBalance = Number(document.getElementById('client-opening-balance').value) || 0;

    // Filter valid contract items
    const validContractItems = (activeContractItems || []).filter(ci => ci.particulars || ci.amount > 0 || ci.rate > 0);

    let clientObj = { name, group, creditAmount, loanSourceAccount, loanDate, monthlyPay, yearlyPay, pendingYear, openingBalance, contractItems: validContractItems };

    state.customClientFields.forEach(f => {
        const val = document.getElementById(`custom-field-${f.name}`).value;
        clientObj[f.name] = f.type === 'number' ? Number(val) : val;
    });

    if (id) {
        clientObj.id = id;
    } else {
        clientObj.id = 'c_' + Date.now();
    }

    // Automatically manage linked loan disbursement outflow transaction in Cash/Bank
    const loanTxId = 't_loan_' + clientObj.id;
    if (creditAmount > 0 && loanSourceAccount) {
        const loanTx = {
            id: loanTxId,
            description: `Loan given to ${clientObj.name}`,
            category: 'Others',
            amount: creditAmount,
            date: loanDate,
            mode: loanSourceAccount,
            clientId: clientObj.id,
            isLoanDisbursement: true
        };
        addExpenseDirect(loanTx);
    } else {
        const existing = state.transactions.find(t => t.id === loanTxId || (t.clientId === clientObj.id && t.isLoanDisbursement));
        if (existing) {
            deleteExpenseDirect(existing.id);
        }
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

// --- CLIENT DETAILED LEDGER PDF & WHATSAPP GENERATION ---

function buildClientStatementElement(client, stats, fy) {
    const fC = v => '₹' + Math.round(v).toLocaleString('en-IN');
    const isVendor = isVendorParty(client);
    const dateStr = formatDateString(new Date());

    // 1. Contract items rows
    let contractRowsHTML = '';
    const contractList = client.contractItems && client.contractItems.length > 0 ? client.contractItems : [
        { particulars: 'Annual Retainer Contract', period: 'FY ' + fy, months: 12, rate: client.monthlyPay || 0, amount: stats.yearlyContract }
    ];

    contractList.forEach((ci, idx) => {
        contractRowsHTML += `
            <tr>
                <td style="text-align:center;">${idx + 1}</td>
                <td><strong>${ci.particulars || 'Service / Retainer'}</strong></td>
                <td>${ci.period || ('FY ' + fy)}</td>
                <td style="text-align:center;">${ci.months || 12}</td>
                <td style="text-align:right;">${ci.rate ? fC(ci.rate) : '-'}</td>
                <td style="text-align:right; font-weight:700;">${fC(ci.amount || 0)}</td>
            </tr>
        `;
    });

    // 2. Loans / Credit rows (if any)
    let loansRowsHTML = '';
    if (stats.loansList && stats.loansList.length > 0) {
        loansRowsHTML = `
            <h4 style="margin: 18px 0 8px 0; color:#0f766e; border-bottom: 2px solid #0f766e; padding-bottom: 4px; font-size:14px;">Loans & Credit Record</h4>
            <table style="width:100%; border-collapse:collapse; margin-bottom:15px;">
                <thead>
                    <tr style="background:#f0fdfa; color:#0f766e;">
                        <th style="border:1px solid #cbd5e1; padding:6px 8px; text-align:left;">Date</th>
                        <th style="border:1px solid #cbd5e1; padding:6px 8px; text-align:left;">Transaction / Particulars</th>
                        <th style="border:1px solid #cbd5e1; padding:6px 8px; text-align:left;">Payment Account</th>
                        <th style="border:1px solid #cbd5e1; padding:6px 8px; text-align:right;">Disbursed Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${stats.loansList.map(l => `
                        <tr>
                            <td style="border:1px solid #cbd5e1; padding:6px 8px;">${formatDbDate(l.date)}</td>
                            <td style="border:1px solid #cbd5e1; padding:6px 8px;"><strong>${l.type === 'given' ? 'Loan Given' : 'Loan Taken'}</strong>${l.remark ? ' — ' + l.remark : ''}</td>
                            <td style="border:1px solid #cbd5e1; padding:6px 8px;">${l.account || 'Direct'}</td>
                            <td style="border:1px solid #cbd5e1; padding:6px 8px; text-align:right; font-weight:700; color:#0f766e;">${fC(l.amount)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    // 3. Payments Received & Discount Logs
    const incomeList = state.incomeLogs.filter(l => l.clientId === client.id).sort((a, b) => new Date(a.date) - new Date(b.date));
    let incomeRowsHTML = '';
    if (incomeList.length > 0) {
        incomeRowsHTML = incomeList.map((log, idx) => `
            <tr>
                <td style="text-align:center;">${idx + 1}</td>
                <td>${formatDbDate(log.date)}</td>
                <td><strong>Payment Received</strong>${log.remark ? ' — ' + log.remark : ''}</td>
                <td>${log.mode}</td>
                <td style="text-align:right; font-weight:700; color:#16a34a;">${fC(log.amount)}</td>
                <td style="text-align:right; color:#d97706;">${log.discount ? fC(log.discount) : '-'}</td>
            </tr>
        `).join('');
    } else {
        incomeRowsHTML = `<tr><td colspan="6" style="text-align:center; color:#64748b; padding:10px;">No payments received yet for this client.</td></tr>`;
    }

    // Build printable HTML box
    const printContainer = document.createElement('div');
    printContainer.id = 'pdf-render-temp';
    printContainer.style.position = 'fixed';
    printContainer.style.left = '-9999px';
    printContainer.style.top = '0';
    printContainer.style.width = '800px';
    printContainer.style.background = '#ffffff';

    printContainer.innerHTML = `
        <div class="pdf-statement-container" style="padding: 30px 35px; color:#1e293b; font-family:'Plus Jakarta Sans', Arial, sans-serif;">
            <!-- Header -->
            <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #0d9488; padding-bottom:15px; margin-bottom:20px;">
                <div>
                    <h2 style="margin:0; font-size:24px; color:#0f766e; font-weight:800; letter-spacing:-0.5px;">ARYA ASSOCIATES</h2>
                    <p style="margin:3px 0 0 0; font-size:12px; color:#475569; font-weight:600;">RAVI KATARA &nbsp;|&nbsp; Mobile: 8815052555, 8982147763</p>
                    <p style="margin:2px 0 0 0; font-size:11px; color:#64748b;">Financial Accounting & Client Ledger Statement</p>
                </div>
                <div style="text-align:right;">
                    <span style="display:inline-block; background:#f0fdfa; color:#0f766e; border:1px solid #99f6e4; font-weight:700; font-size:12px; padding:4px 10px; border-radius:4px;">
                        FY: ${fy}
                    </span>
                    <p style="margin:4px 0 0 0; font-size:11px; color:#64748b;">Date: ${dateStr}</p>
                </div>
            </div>

            <!-- Party Details Box -->
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:12px 16px; margin-bottom:20px; display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                <div>
                    <span style="font-size:11px; color:#64748b; text-transform:uppercase; font-weight:600;">Party / Client Name:</span>
                    <h3 style="margin:2px 0; font-size:17px; color:#0f172a; font-weight:700;">${client.name}</h3>
                    <span style="font-size:11px; color:#475569;">Category: <strong>${isVendor ? 'Vendor (Creditor)' : 'Client (Debtor)'}</strong></span>
                </div>
                <div style="text-align:right;">
                    <span style="font-size:11px; color:#64748b; text-transform:uppercase; font-weight:600;">Financial Year / Period:</span>
                    <p style="margin:2px 0; font-size:14px; font-weight:700; color:#0f766e;">FY ${fy}</p>
                    <div style="font-size:11px; color:#475569; display:flex; flex-direction:column; gap:2px; align-items:flex-end; margin-top:2px;">
                        <span>Opening Balance: <strong>${fC(stats.openingBalance)}</strong></span>
                        <span style="font-weight:700; color:#0f766e;">Total Dues: <strong>${fC(stats.totalReceivable)}</strong></span>
                    </div>
                </div>
            </div>

            <!-- Section 1: Services / Contract Retainer Breakdown Table -->
            <h4 style="margin:15px 0 8px 0; color:#0f766e; border-bottom:2px solid #0f766e; padding-bottom:4px; font-size:14px;">
                1. Services & Contract Retainer Breakdown
            </h4>
            <table style="width:100%; border-collapse:collapse; margin-bottom:15px;">
                <thead>
                    <tr style="background:#f1f5f9; color:#0f172a; font-size:11px;">
                        <th style="border:1px solid #cbd5e1; padding:7px 8px; width:35px; text-align:center;">#</th>
                        <th style="border:1px solid #cbd5e1; padding:7px 8px; text-align:left;">Particulars</th>
                        <th style="border:1px solid #cbd5e1; padding:7px 8px; text-align:left; width:120px;">Period</th>
                        <th style="border:1px solid #cbd5e1; padding:7px 8px; width:60px; text-align:center;">Months</th>
                        <th style="border:1px solid #cbd5e1; padding:7px 8px; width:90px; text-align:right;">Rate (₹)</th>
                        <th style="border:1px solid #cbd5e1; padding:7px 8px; width:100px; text-align:right;">Amount (₹)</th>
                    </tr>
                </thead>
                <tbody style="font-size:11px;">
                    ${contractRowsHTML}
                </tbody>
                <tfoot>
                    <tr style="font-weight:600; background:#f8fafc; font-size:11px;">
                        <td colspan="5" style="border:1px solid #cbd5e1; text-align:right; padding:5px 8px;">Subtotal (Services & Retainer):</td>
                        <td style="border:1px solid #cbd5e1; text-align:right; color:#0f766e; padding:5px 8px; font-weight:700;">${fC(stats.yearlyContract)}</td>
                    </tr>
                    ${stats.openingBalance !== 0 ? `
                    <tr style="font-weight:600; background:#f8fafc; font-size:11px;">
                        <td colspan="5" style="border:1px solid #cbd5e1; text-align:right; padding:5px 8px;">Add: Opening Balance / Past Due:</td>
                        <td style="border:1px solid #cbd5e1; text-align:right; color:#0f766e; padding:5px 8px; font-weight:700;">${fC(stats.openingBalance)}</td>
                    </tr>
                    ` : ''}
                    ${stats.loansGiven > 0 ? `
                    <tr style="font-weight:600; background:#f8fafc; font-size:11px;">
                        <td colspan="5" style="border:1px solid #cbd5e1; text-align:right; padding:5px 8px;">Add: Loans / Credit Given:</td>
                        <td style="border:1px solid #cbd5e1; text-align:right; color:#0f766e; padding:5px 8px; font-weight:700;">${fC(stats.loansGiven)}</td>
                    </tr>
                    ` : ''}
                    <tr style="font-weight:800; background:#f0fdfa; font-size:12px;">
                        <td colspan="5" style="border:1px solid #cbd5e1; text-align:right; padding:8px; color:#0f766e; font-weight:800;">TOTAL DUES (Opening Balance + Services):</td>
                        <td style="border:1px solid #cbd5e1; text-align:right; color:#0f766e; padding:8px; font-weight:800; font-size:13px;">${fC(stats.totalReceivable)}</td>
                    </tr>
                </tfoot>
            </table>

            ${loansRowsHTML}

            <!-- Section 2: Payments Received & Discount Logs Table -->
            <h4 style="margin:18px 0 8px 0; color:#0f766e; border-bottom:2px solid #0f766e; padding-bottom:4px; font-size:14px;">
                2. Payments Received & Settlement Log
            </h4>
            <table style="width:100%; border-collapse:collapse; margin-bottom:20px;">
                <thead>
                    <tr style="background:#f1f5f9; color:#0f172a; font-size:11px;">
                        <th style="border:1px solid #cbd5e1; padding:7px 8px; width:35px; text-align:center;">#</th>
                        <th style="border:1px solid #cbd5e1; padding:7px 8px; width:85px; text-align:left;">Date</th>
                        <th style="border:1px solid #cbd5e1; padding:7px 8px; text-align:left;">Particulars / Remarks</th>
                        <th style="border:1px solid #cbd5e1; padding:7px 8px; width:110px; text-align:left;">Mode / Account</th>
                        <th style="border:1px solid #cbd5e1; padding:7px 8px; width:100px; text-align:right;">Received (₹)</th>
                        <th style="border:1px solid #cbd5e1; padding:7px 8px; width:80px; text-align:right;">Discount (₹)</th>
                    </tr>
                </thead>
                <tbody style="font-size:11px;">
                    ${incomeRowsHTML}
                </tbody>
                <tfoot>
                    <tr style="font-weight:700; background:#f8fafc; font-size:11px;">
                        <td colspan="4" style="border:1px solid #cbd5e1; text-align:right; padding:6px 8px;">Total Received & Discount:</td>
                        <td style="border:1px solid #cbd5e1; text-align:right; color:#16a34a; padding:6px 8px;">${fC(stats.totalReceived)}</td>
                        <td style="border:1px solid #cbd5e1; text-align:right; color:#d97706; padding:6px 8px;">${fC(stats.totalDiscount)}</td>
                    </tr>
                </tfoot>
            </table>

            <!-- Section 3: Final Account Settlement Summary Box -->
            <div style="background:#f0fdfa; border:2px solid #0d9488; border-radius:8px; padding:16px 20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
                <div style="display:flex; flex-direction:column; gap:4px; font-size:12px;">
                    <span>Opening Balance / Past Due: <strong>${fC(stats.openingBalance)}</strong></span>
                    <span>Total Services & Contracts: <strong>${fC(stats.yearlyContract)}</strong></span>
                    ${stats.loansGiven > 0 ? `<span>Total Loans Given: <strong>${fC(stats.loansGiven)}</strong></span>` : ''}
                    <span style="font-weight:800; color:#0f766e; font-size:13px; border-top:1px solid #99f6e4; padding-top:4px; margin-top:2px;">
                        TOTAL DUES (Total Receivable): <strong>${fC(stats.totalReceivable)}</strong>
                    </span>
                    <span style="color:#16a34a; font-weight:600;">Less: Total Payments Received: -${fC(stats.totalReceived)}</span>
                    ${stats.totalDiscount > 0 ? `<span style="color:#d97706; font-weight:600;">Less: Total Discount Allowed: -${fC(stats.totalDiscount)}</span>` : ''}
                </div>
                <div style="text-align:right; background:#ffffff; padding:12px 20px; border-radius:6px; border:1px solid #99f6e4;">
                    <div style="font-size:11px; color:#64748b; margin-bottom:2px;">
                        Total Dues: <strong style="color:#0f766e;">${fC(stats.totalReceivable)}</strong> | Received: <strong style="color:#16a34a;">${fC(stats.totalReceived)}</strong>
                    </div>
                    <span style="font-size:11px; text-transform:uppercase; font-weight:700; color:#64748b; letter-spacing:0.5px;">Net Outstanding Balance Due</span>
                    <h2 style="margin:4px 0 0 0; font-size:24px; font-weight:800; color:${stats.balanceReceivable > 0 ? '#0d9488' : '#16a34a'};">
                        ${stats.balanceReceivable <= 0 ? 'Fully Settled (₹0)' : fC(stats.balanceReceivable)}
                    </h2>
                </div>
            </div>

            <!-- Footer / Terms -->
            <div style="margin-top:25px; padding-top:10px; border-top:1px dashed #cbd5e1; display:flex; justify-content:space-between; font-size:10px; color:#64748b;">
                <span>ARYA ASSOCIATES — Financial Accounting (Mob: 8815052555, 8982147763)</span>
                <span style="font-weight:700; color:#0f766e;">RAVI KATARA (Authorized Signatory)</span>
            </div>
        </div>
    `;

    return printContainer;
}

window.generateClientStatementPDF = function(clientId) {
    const client = state.clients.find(c => c.id === clientId);
    if (!client) {
        alert("Client not found.");
        return;
    }

    const stats = getClientReportStats(clientId);
    const fy = client.pendingYear || '2026-2027';
    const printContainer = buildClientStatementElement(client, stats, fy);
    document.body.appendChild(printContainer);

    const safeClientName = client.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const opt = {
        margin: [10, 10, 10, 10],
        filename: `${safeClientName}_Ledger_Statement_FY_${fy}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    if (window.html2pdf) {
        html2pdf().set(opt).from(printContainer.querySelector('.pdf-statement-container')).save().then(() => {
            document.body.removeChild(printContainer);
        }).catch(err => {
            console.error("PDF generation error:", err);
            document.body.removeChild(printContainer);
        });
    } else {
        alert("PDF generator loading. Please try again in 2 seconds.");
        document.body.removeChild(printContainer);
    }
};

window.generateSelectedClientPDF = function() {
    const sel = document.getElementById('report-client-select');
    if (!sel || !sel.value) {
        alert("Please select a client first.");
        return;
    }
    generateClientStatementPDF(sel.value);
};

window.shareClientLedgerWhatsApp = async function(clientId) {
    const client = state.clients.find(c => c.id === clientId);
    if (!client) {
        alert("Client not found.");
        return;
    }

    const stats = getClientReportStats(clientId);
    const fAmt = v => 'Rs. ' + Math.round(v).toLocaleString('en-IN') + '/-';
    const fy = client.pendingYear || '2026-2027';
    const isSettled = stats.balanceReceivable <= 0;

    // Humble WhatsApp message (formatted without raw rupee symbols to prevent WhatsApp Pay auto-link)
    let msg = '';
    if (isSettled) {
        msg = 
`Dear *${client.name}*,

Greetings!

Please find attached your *Final Settled Statement of Account* for *FY ${fy}*.

✅ *Account Status: Fully Settled & Closed*
• Total Contract / Services: ${fAmt(stats.yearlyContract)}
${stats.openingBalance !== 0 ? `• Opening Balance / Past Due: ${fAmt(stats.openingBalance)}\n` : ''}• Total Dues Billed: ${fAmt(stats.totalReceivable)}
• Total Amount Received: ${fAmt(stats.totalReceived)}
${stats.totalDiscount > 0 ? `• Total Discount Allowed: ${fAmt(stats.totalDiscount)}\n` : ''}• *Balance Due: Nil (Rs. 0)*

We sincerely thank you for completing your account settlement and for your wonderful trust in our services. It is always a pleasure working with you, and we look forward to our continued partnership!

Warm regards and best wishes,
*ARYA ASSOCIATES*
RAVI KATARA
Mobile: 8815052555, 8982147763`;
    } else {
        msg = 
`Dear *${client.name}*,

Greetings!

Please find attached your detailed Statement of Account for *FY ${fy}*.

📋 *Account Summary:*
• Services / Contract Amount: ${fAmt(stats.yearlyContract)}
${stats.openingBalance !== 0 ? `• Opening Balance / Past Due: ${fAmt(stats.openingBalance)}\n` : ''}${stats.loansGiven > 0 ? `• Loans / Credit Given: ${fAmt(stats.loansGiven)}\n` : ''}• *TOTAL DUES BILLED: ${fAmt(stats.totalReceivable)}*
• Total Amount Received: ${fAmt(stats.totalReceived)}
${stats.totalDiscount > 0 ? `• Discount Given: ${fAmt(stats.totalDiscount)}\n` : ''}• *NET PENDING BALANCE DUE: ${fAmt(stats.balanceReceivable)}*

Kindly review the attached PDF statement and arrange the pending balance payment at your convenience.

Thank you for your valuable association and continued support.

Warm regards,
*ARYA ASSOCIATES*
RAVI KATARA
Mobile: 8815052555, 8982147763`;
    }

    const printContainer = buildClientStatementElement(client, stats, fy);
    document.body.appendChild(printContainer);

    const safeClientName = client.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${safeClientName}_Statement_FY_${fy}.pdf`;

    const opt = {
        margin: [10, 10, 10, 10],
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    if (!window.html2pdf) {
        alert("PDF generator is loading. Please try again in 2 seconds.");
        document.body.removeChild(printContainer);
        return;
    }

    try {
        const pdfWorker = html2pdf().set(opt).from(printContainer.querySelector('.pdf-statement-container'));
        const pdfBlob = await pdfWorker.output('blob');
        document.body.removeChild(printContainer);

        const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

        // If Web Share API supports file sharing (Mobile Chrome / Safari / PWA):
        if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
            try {
                await navigator.share({
                    files: [pdfFile],
                    title: `${client.name} - Statement of Account`,
                    text: msg
                });
                return;
            } catch (shareErr) {
                if (shareErr.name === 'AbortError') return; // User cancelled share modal
                console.warn("Native share error, falling back to direct launch:", shareErr);
            }
        }

        // Fallback for Desktop / non-file share: download PDF & open regular WhatsApp
        const fileUrl = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = fileUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            if (document.body.contains(a)) document.body.removeChild(a);
            URL.revokeObjectURL(fileUrl);
        }, 1000);

        openRegularWhatsApp(msg);

    } catch (err) {
        console.error("PDF generation or share error:", err);
        if (document.body.contains(printContainer)) document.body.removeChild(printContainer);
        openRegularWhatsApp(msg);
    }
};

window.openRegularWhatsApp = function(message) {
    const encoded = encodeURIComponent(message);
    const isAndroid = /android/i.test(navigator.userAgent || '');
    
    if (isAndroid) {
        // Explicitly targets Regular WhatsApp package (com.whatsapp) on Android
        // Bypasses WhatsApp Business (com.whatsapp.w4b)
        const intentUrl = `intent://send?text=${encoded}#Intent;scheme=whatsapp;package=com.whatsapp;end`;
        try {
            window.location.href = intentUrl;
        } catch (e) {
            window.location.href = `whatsapp://send?text=${encoded}`;
        }
    } else {
        // iOS or Desktop
        const waUrl = `whatsapp://send?text=${encoded}`;
        window.open(waUrl, '_blank');
    }
};

window.shareSelectedClientWhatsApp = function() {
    const sel = document.getElementById('report-client-select');
    if (!sel || !sel.value) {
        alert("Please select a client first.");
        return;
    }
    shareClientLedgerWhatsApp(sel.value);
};

// --- CLIENT DETAILED STATEMENT EXCEL EXPORT ---
window.exportClientStatementExcel = function(clientId) {
    const client = state.clients.find(c => c.id === clientId);
    if (!client) {
        alert("Client not found.");
        return;
    }

    const stats = getClientReportStats(clientId);
    const fy = client.pendingYear || '2026-2027';
    const isVendor = isVendorParty(client);
    const isSettled = stats.balanceReceivable <= 0;
    const safeClientName = client.name.replace(/[^a-zA-Z0-9_-]/g, '_');

    // 1. Account Summary Sheet
    const summaryData = [{
        "Party / Client Name": client.name,
        "Category": isVendor ? "Vendor (Creditor)" : "Client (Debtor)",
        "Financial Year": "FY " + fy,
        "Statement Date": formatDateString(new Date()),
        "Opening Balance (INR)": stats.openingBalance,
        "Total Services Retainer (INR)": stats.yearlyContract,
        "Total Loans Given (INR)": stats.loansGiven,
        "Total Billed / Receivable (INR)": stats.totalReceivable,
        "Total Received (INR)": stats.totalReceived,
        "Total Discount Given (INR)": stats.totalDiscount,
        "Net Outstanding Balance Due (INR)": Math.max(0, stats.balanceReceivable),
        "Account Status": isSettled ? "Fully Settled & Closed" : "Active / Outstanding Due"
    }];

    // 2. Services / Contract Breakdown Sheet
    const contractData = [];
    const contractList = (client.contractItems && client.contractItems.length > 0) ? client.contractItems : [
        { particulars: 'Annual Retainer Contract', period: 'FY ' + fy, months: 12, rate: client.monthlyPay || 0, amount: stats.yearlyContract }
    ];
    contractList.forEach((ci, idx) => {
        contractData.push({
            "S.No": idx + 1,
            "Service Particulars": ci.particulars || 'Service',
            "Period": ci.period || ('FY ' + fy),
            "Months": ci.months || 12,
            "Monthly Rate (INR)": ci.rate || 0,
            "Total Amount (INR)": ci.amount || 0
        });
    });

    // 3. Received Payments Log Sheet
    const incomeList = state.incomeLogs.filter(l => l.clientId === clientId).sort((a, b) => new Date(a.date) - new Date(b.date));
    const receiptsData = incomeList.map((log, idx) => ({
        "S.No": idx + 1,
        "Receipt Date": formatDbDate(log.date),
        "Received From Party": client.name,
        "Destination Account (Cash/Bank)": log.mode,
        "Amount Received (INR)": Number(log.amount) || 0,
        "Discount Allowed (INR)": Number(log.discount) || 0,
        "Remark / Description": log.remark || ''
    }));

    // 4. Loans & Credit Record Sheet (if any)
    const loansData = (stats.loansList || []).map((l, idx) => ({
        "S.No": idx + 1,
        "Date": formatDbDate(l.date),
        "Loan Direction": l.type === 'given' ? 'Loan Given' : 'Loan Taken',
        "Payment Account": l.account || 'Direct',
        "Amount (INR)": Number(l.amount) || 0,
        "Remark / Purpose": l.remark || ''
    }));

    const wb = XLSX.utils.book_new();
    const addSheet = (data, sheetName) => {
        const ws = XLSX.utils.json_to_sheet(data.length > 0 ? data : [{ "Status": "No records found" }]);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
    };

    addSheet(summaryData, "Account Summary");
    addSheet(contractData, "Services Breakdown");
    addSheet(receiptsData, "Payments Received");
    if (loansData.length > 0) addSheet(loansData, "Loans & Credit");

    XLSX.writeFile(wb, `${safeClientName}_Statement_FY_${fy}.xlsx`);
};

window.exportSelectedClientExcel = function() {
    const sel = document.getElementById('report-client-select');
    if (!sel || !sel.value) {
        alert("Please select a client first.");
        return;
    }
    exportClientStatementExcel(sel.value);
};

// Income logs
// Searchable Client Dropdown Component
function setupSearchableClientDropdown({ inputId, selectId, menuId, clearBtnId }) {
    const input = document.getElementById(inputId);
    const select = document.getElementById(selectId);
    const menu = document.getElementById(menuId);
    const clearBtn = document.getElementById(clearBtnId);

    if (!input || !select || !menu) return;

    function renderList(query = '') {
        const q = (query || '').toLowerCase().trim();
        const filtered = state.clients.filter(c => c.name.toLowerCase().includes(q));

        if (filtered.length === 0) {
            menu.innerHTML = `<div class="searchable-no-results">No clients found matching "${query}"</div>`;
        } else {
            menu.innerHTML = filtered.map(c => `
                <div class="searchable-dropdown-item ${select.value === c.id ? 'active' : ''}" data-id="${c.id}" data-name="${c.name}">
                    <span class="searchable-item-name">${c.name}</span>
                    <span class="searchable-item-meta">₹${(c.monthlyPay || 0).toLocaleString('en-IN')}/mo</span>
                </div>
            `).join('');

            menu.querySelectorAll('.searchable-dropdown-item').forEach(item => {
                item.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const id = this.getAttribute('data-id');
                    const name = this.getAttribute('data-name');
                    select.value = id;
                    input.value = name;
                    if (clearBtn) clearBtn.style.display = 'flex';
                    menu.style.display = 'none';
                });
            });
        }
        menu.style.display = 'block';
    }

    input.addEventListener('focus', function() {
        renderList(this.value);
    });

    input.addEventListener('input', function() {
        renderList(this.value);
        if (clearBtn) {
            clearBtn.style.display = this.value ? 'flex' : 'none';
        }
        const exactMatch = state.clients.find(c => c.name.toLowerCase() === this.value.toLowerCase().trim());
        if (exactMatch) {
            select.value = exactMatch.id;
        } else {
            select.value = '';
        }
    });

    if (clearBtn) {
        clearBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            input.value = '';
            select.value = '';
            clearBtn.style.display = 'none';
            renderList('');
            input.focus();
        });
    }

    document.addEventListener('click', function(e) {
        if (!input.contains(e.target) && !menu.contains(e.target) && (!clearBtn || !clearBtn.contains(e.target))) {
            menu.style.display = 'none';
        }
    });
}

function openIncomeModal(editId = '') {
    const modal = document.getElementById('modal-income');
    const title = document.getElementById('modal-income-title');
    const form = document.getElementById('form-income');
    const clientSelect = document.getElementById('income-client-select');
    const clientSearchInput = document.getElementById('income-client-search-input');
    const clientClearBtn = document.getElementById('btn-clear-income-client-search');
    const clientMenu = document.getElementById('income-client-dropdown-menu');
    const accSelect = document.getElementById('income-account-select');
    form.reset();

    if (clientMenu) clientMenu.style.display = 'none';

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
            const matchedClient = state.clients.find(c => c.id === log.clientId);
            if (clientSearchInput) {
                clientSearchInput.value = matchedClient ? matchedClient.name : '';
            }
            if (clientClearBtn) {
                clientClearBtn.style.display = matchedClient ? 'flex' : 'none';
            }
            document.getElementById('income-amount').value = log.amount;
            document.getElementById('income-discount').value = log.discount !== undefined ? log.discount : '';
            document.getElementById('income-date').value = log.date;
            document.getElementById('income-account-select').value = log.mode;
            document.getElementById('income-remark').value = log.remark || '';

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
        if (clientSearchInput) clientSearchInput.value = '';
        if (clientClearBtn) clientClearBtn.style.display = 'none';
        clientSelect.value = '';
        document.getElementById('income-amount').value = '';
        document.getElementById('income-discount').value = '';
        document.getElementById('income-remark').value = '';

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
    lucide.createIcons();
}

function closeIncomeModal() {
    document.getElementById('modal-income').classList.remove('active');
}

function handleIncomeSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('edit-income-id').value;
    const clientId = document.getElementById('income-client-select').value;
    if (!clientId) {
        alert("Please select a valid client from the search dropdown.");
        const searchInput = document.getElementById('income-client-search-input');
        if (searchInput) searchInput.focus();
        return;
    }
    const amount = Number(document.getElementById('income-amount').value);
    const discount = Number(document.getElementById('income-discount').value) || 0;
    const date = document.getElementById('income-date').value;
    const mode = document.getElementById('income-account-select').value;
    const remark = (document.getElementById('income-remark').value || '').trim();

    let logObj = { clientId, amount, discount, date, mode, remark };

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
function openExpenseModal(editId = '', presetCategory = '') {
    const modal = document.getElementById('modal-expense');
    const title = document.getElementById('modal-expense-title');
    const form = document.getElementById('form-expense');
    const clientSelect = document.getElementById('expense-client-source');
    const accSelect = document.getElementById('expense-account-select');
    const catDropdown = document.getElementById('expense-category');
    form.reset();

    // Populate category dropdown
    populateCategoryDropdowns();

    const fC = v => '₹' + Math.round(v).toLocaleString('en-IN');
    let capitalOptions = `
        <option value="opening_bank">🏦 Bank Opening Balance</option>
        <option value="opening_cash">💵 Cash Opening Balance</option>
    `;
    if (state.accounts && state.accounts.length > 0) {
        state.accounts.forEach(a => {
            const icon = a.type === 'Cash' ? '💵' : '🏦';
            const balStr = a.openingBalance ? ` (${fC(a.openingBalance)})` : '';
            capitalOptions += `<option value="opening_acc_${a.id}">${icon} ${a.name} Opening${balStr}</option>`;
        });
    }

    clientSelect.innerHTML = `
        <option value="">None / General Expense</option>
        <optgroup label="Capital / Opening Funds">
            ${capitalOptions}
        </optgroup>
        <optgroup label="Party / Client Funds">
            ${state.clients.map(c => `<option value="${c.id}">👤 ${c.name} (${c.group || 'Client'})</option>`).join('')}
        </optgroup>
    `;

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
            title.innerHTML = `<i data-lucide="edit-3" style="width:18px; height:18px; color:var(--primary); display:inline-block; vertical-align:middle; margin-right:4px;"></i> Edit Expense Entry`;
            document.getElementById('edit-expense-id').value = tx.id;
            document.getElementById('expense-description').value = tx.description;
            
            // Ensure category exists in dropdown
            if (catDropdown) {
                let catExists = Array.from(catDropdown.options).some(o => o.value === tx.category);
                if (!catExists && tx.category) {
                    const opt = document.createElement('option');
                    opt.value = tx.category;
                    opt.innerText = tx.category;
                    catDropdown.appendChild(opt);
                }
                catDropdown.value = tx.category;
            }

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
        title.innerHTML = `<i data-lucide="plus-circle" style="width:18px; height:18px; color:var(--primary); display:inline-block; vertical-align:middle; margin-right:4px;"></i> Add Expense Entry`;
        document.getElementById('edit-expense-id').value = '';

        if (presetCategory && catDropdown) {
            let catExists = Array.from(catDropdown.options).some(o => o.value === presetCategory);
            if (!catExists) {
                const opt = document.createElement('option');
                opt.value = presetCategory;
                opt.innerText = presetCategory;
                catDropdown.appendChild(opt);
            }
            catDropdown.value = presetCategory;
        }

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
    if (window.lucide) lucide.createIcons();
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
            document.getElementById('account-opening-balance').value = acc.openingBalance !== undefined ? acc.openingBalance : 0;
        }
    } else {
        title.innerText = 'Add New Account Book';
        document.getElementById('edit-account-id').value = '';
        document.getElementById('account-opening-balance').value = '0';
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
    const openingBalance = Number(document.getElementById('account-opening-balance').value) || 0;

    let accountObj = { name, type, openingBalance };
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

// --- CONTRA & FUND TRANSFERS CONTROLLER (Cash to Bank / Bank to Cash) ---
let currentTransferPreset = 'cash-to-bank';

window.setTransferPreset = function(preset) {
    currentTransferPreset = preset;
    document.querySelectorAll('.transfer-type-pill').forEach(btn => btn.classList.remove('active'));
    
    const fromSel = document.getElementById('transfer-from-account');
    const toSel = document.getElementById('transfer-to-account');
    const remarkInput = document.getElementById('transfer-remark');

    const cashAccounts = state.accounts.filter(a => a.type === 'Cash');
    const bankAccounts = state.accounts.filter(a => a.type === 'Bank');

    if (preset === 'cash-to-bank') {
        const pill = document.getElementById('pill-cash-to-bank');
        if (pill) pill.classList.add('active');
        if (cashAccounts.length > 0) fromSel.value = cashAccounts[0].name;
        if (bankAccounts.length > 0) toSel.value = bankAccounts[0].name;
        if (!remarkInput.value || remarkInput.value.includes('withdrawal') || remarkInput.value.includes('deposit')) {
            remarkInput.value = 'Cash deposit in Bank';
        }
    } else if (preset === 'bank-to-cash') {
        const pill = document.getElementById('pill-bank-to-cash');
        if (pill) pill.classList.add('active');
        if (bankAccounts.length > 0) fromSel.value = bankAccounts[0].name;
        if (cashAccounts.length > 0) toSel.value = cashAccounts[0].name;
        if (!remarkInput.value || remarkInput.value.includes('withdrawal') || remarkInput.value.includes('deposit')) {
            remarkInput.value = 'Cash withdrawal from Bank (ATM / Counter)';
        }
    } else {
        const pill = document.getElementById('pill-custom-transfer');
        if (pill) pill.classList.add('active');
        if (state.accounts.length > 1) {
            fromSel.value = state.accounts[0].name;
            toSel.value = state.accounts[1].name;
        }
    }
};

window.openTransferModal = function(preset = 'cash-to-bank', editId = '') {
    const modal = document.getElementById('modal-transfer');
    if (!modal) return;
    const form = document.getElementById('form-transfer');
    const fromSel = document.getElementById('transfer-from-account');
    const toSel = document.getElementById('transfer-to-account');
    const title = document.getElementById('modal-transfer-title');
    const feedback = document.getElementById('transfer-modal-feedback');
    
    form.reset();
    if (feedback) feedback.style.display = 'none';

    // Populate Accounts dropdowns
    fromSel.innerHTML = '';
    toSel.innerHTML = '';
    state.accounts.forEach(a => {
        fromSel.innerHTML += `<option value="${a.name}">${a.name} (${a.type})</option>`;
        toSel.innerHTML += `<option value="${a.name}">${a.name} (${a.type})</option>`;
    });

    document.getElementById('transfer-date').value = new Date().toISOString().split('T')[0];

    if (editId) {
        const tr = state.transfers.find(t => t.id === editId);
        if (tr) {
            title.innerHTML = `<i data-lucide="edit-3" style="width:20px; height:20px; color:var(--primary);"></i> Edit Fund Transfer`;
            document.getElementById('edit-transfer-id').value = tr.id;
            fromSel.value = tr.fromAccount;
            toSel.value = tr.toAccount;
            document.getElementById('transfer-amount').value = tr.amount;
            document.getElementById('transfer-date').value = tr.date;
            document.getElementById('transfer-remark').value = tr.remark || '';
            
            const fromAcc = state.accounts.find(a => a.name === tr.fromAccount);
            const toAcc = state.accounts.find(a => a.name === tr.toAccount);
            if (fromAcc && toAcc && fromAcc.type === 'Cash' && toAcc.type === 'Bank') {
                setTransferPreset('cash-to-bank');
            } else if (fromAcc && toAcc && fromAcc.type === 'Bank' && toAcc.type === 'Cash') {
                setTransferPreset('bank-to-cash');
            } else {
                setTransferPreset('custom');
            }
        }
    } else {
        title.innerHTML = `<i data-lucide="arrow-left-right" style="width:20px; height:20px; color:var(--primary);"></i> Cash ↔ Bank Fund Transfer`;
        document.getElementById('edit-transfer-id').value = '';
        setTransferPreset(preset);
    }

    modal.classList.add('active');
    if (window.lucide) lucide.createIcons();
};

window.closeTransferModal = function() {
    const modal = document.getElementById('modal-transfer');
    if (modal) modal.classList.remove('active');
};

function handleTransferSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('edit-transfer-id').value;
    const fromAccount = document.getElementById('transfer-from-account').value;
    const toAccount = document.getElementById('transfer-to-account').value;
    const amount = Number(document.getElementById('transfer-amount').value);
    const date = document.getElementById('transfer-date').value;
    const remark = (document.getElementById('transfer-remark').value || '').trim();

    if (fromAccount === toAccount) {
        alert("Source Account and Destination Account cannot be the same. Please choose different accounts for transfer.");
        return;
    }

    if (amount <= 0) {
        alert("Please enter a valid transfer amount greater than ₹0.");
        return;
    }

    const fromAcc = state.accounts.find(a => a.name === fromAccount);
    const toAcc = state.accounts.find(a => a.name === toAccount);
    let type = 'Transfer';
    if (fromAcc && toAcc) {
        if (fromAcc.type === 'Cash' && toAcc.type === 'Bank') type = 'Cash to Bank';
        else if (fromAcc.type === 'Bank' && toAcc.type === 'Cash') type = 'Bank to Cash';
    }

    const transferObj = {
        id: id || ('tr_' + Date.now()),
        fromAccount,
        toAccount,
        amount,
        date,
        type,
        remark
    };

    addTransferDirect(transferObj);
    closeTransferModal();
    renderPage(state.activePage);
}

window.deleteTransfer = function(id) {
    if (confirm("Are you sure you want to delete this internal transfer entry? Both account balances will be restored.")) {
        deleteTransferDirect(id);
        renderPage(state.activePage);
    }
};

window.openEditTransfer = function(id) {
    openTransferModal('custom', id);
};

function renderMasterTransfers() {
    const tbody = document.getElementById('master-transfers-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const fC = v => '₹' + Math.round(v).toLocaleString('en-IN');

    const sorted = [...(state.transfers || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (sorted.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:20px;">No internal transfers logged yet. Use "+ New Transfer" to transfer funds between Cash and Bank accounts.</td></tr>`;
        return;
    }

    sorted.forEach(tr => {
        let typeBadgeClass = 'custom';
        if (tr.type === 'Cash to Bank') typeBadgeClass = 'cash-to-bank';
        else if (tr.type === 'Bank to Cash') typeBadgeClass = 'bank-to-cash';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDbDate(tr.date)}</td>
            <td><span class="badge-transfer-type ${typeBadgeClass}">${tr.type || 'Transfer'}</span></td>
            <td style="font-weight:600; color:var(--danger);">${tr.fromAccount}</td>
            <td style="font-weight:600; color:var(--success);">${tr.toAccount}</td>
            <td style="font-weight:700; color:var(--text-primary);">${fC(tr.amount)}</td>
            <td style="font-size:12px; color:var(--text-secondary); max-width:200px; word-break:break-word;">${tr.remark || '-'}</td>
            <td class="actions-col">
                <div class="actions-wrapper">
                    <button class="btn-icon-only edit-btn" onclick="openEditTransfer('${tr.id}')" title="Edit Transfer"><i data-lucide="edit-3"></i></button>
                    <button class="btn-icon-only delete-btn" onclick="deleteTransfer('${tr.id}')" title="Delete Transfer"><i data-lucide="trash-2"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
    if (window.lucide) lucide.createIcons();
}

// --- LOANS & UDHAAR CONTROLLER (Loan Given & Loan Taken) ---
let currentLoanPresetType = 'given';

window.setLoanTypePreset = function(type) {
    currentLoanPresetType = type;
    document.querySelectorAll('#modal-loan .transfer-type-pill').forEach(btn => btn.classList.remove('active'));

    const input = document.getElementById('loan-type-input');
    const label = document.getElementById('loan-account-label');
    const helper = document.getElementById('loan-account-helper');

    if (input) input.value = type;

    if (type === 'given') {
        const pill = document.getElementById('pill-loan-given');
        if (pill) pill.classList.add('active');
        if (label) label.innerText = 'Paid / Disbursed From Account *';
        if (helper) helper.innerText = 'Amount will be deducted from this account book (Cash/Bank Outflow).';
    } else {
        const pill = document.getElementById('pill-loan-taken');
        if (pill) pill.classList.add('active');
        if (label) label.innerText = 'Deposited / Received Into Account *';
        if (helper) helper.innerText = 'Amount will be added into this account book (Cash/Bank Inflow).';
    }
};

window.openLoanModal = function(presetType = 'given', presetPartyId = '', editId = '') {
    const modal = document.getElementById('modal-loan');
    if (!modal) return;
    const form = document.getElementById('form-loan');
    const title = document.getElementById('modal-loan-title');
    const accountSelect = document.getElementById('loan-account-select');
    const clientSelect = document.getElementById('loan-client-select');
    const searchInput = document.getElementById('loan-client-search-input');
    const clearBtn = document.getElementById('btn-clear-loan-client-search');

    form.reset();
    document.getElementById('edit-loan-id').value = '';

    // Populate Account dropdown with Cash and Bank accounts
    if (accountSelect) {
        accountSelect.innerHTML = '';
        state.accounts.forEach(a => {
            accountSelect.innerHTML += `<option value="${a.name}">${a.name} (${a.type})</option>`;
        });
    }

    // Populate Client select
    if (clientSelect) {
        clientSelect.innerHTML = '<option value="">-- Select Party --</option>';
        state.clients.forEach(c => {
            clientSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
        });
    }

    document.getElementById('loan-date').value = new Date().toISOString().split('T')[0];

    if (editId) {
        const loan = (state.loans || []).find(l => l.id === editId);
        if (loan) {
            title.innerHTML = `<i data-lucide="edit-3" style="width:20px; height:20px; color:var(--primary);"></i> Edit Loan Entry`;
            document.getElementById('edit-loan-id').value = loan.id;
            setLoanTypePreset(loan.type || 'given');
            document.getElementById('loan-amount').value = loan.amount;
            document.getElementById('loan-date').value = loan.date;
            if (accountSelect) accountSelect.value = loan.account || '';
            document.getElementById('loan-remark').value = loan.remark || '';

            const matchedClient = state.clients.find(c => c.id === loan.clientId);
            if (matchedClient) {
                if (clientSelect) clientSelect.value = matchedClient.id;
                if (searchInput) searchInput.value = matchedClient.name;
                if (clearBtn) clearBtn.style.display = 'flex';
            }
        }
    } else {
        title.innerHTML = `<i data-lucide="hand-coins" style="width:20px; height:20px; color:var(--primary);"></i> Add Loan / Credit Entry`;
        setLoanTypePreset(presetType);
        if (presetPartyId) {
            const matchedClient = state.clients.find(c => c.id === presetPartyId);
            if (matchedClient) {
                if (clientSelect) clientSelect.value = matchedClient.id;
                if (searchInput) searchInput.value = matchedClient.name;
                if (clearBtn) clearBtn.style.display = 'flex';
            }
        } else {
            if (clearBtn) clearBtn.style.display = 'none';
        }
    }

    modal.classList.add('active');
    if (window.lucide) lucide.createIcons();
};

window.closeLoanModal = function() {
    const modal = document.getElementById('modal-loan');
    if (modal) modal.classList.remove('active');
};

function handleLoanSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('edit-loan-id').value;
    const type = document.getElementById('loan-type-input').value || 'given';
    let clientId = document.getElementById('loan-client-select').value;
    const searchInput = document.getElementById('loan-client-search-input');
    const typedPartyName = (searchInput ? searchInput.value : '').trim();
    const amount = Number(document.getElementById('loan-amount').value);
    const date = document.getElementById('loan-date').value;
    const account = document.getElementById('loan-account-select').value;
    const remark = (document.getElementById('loan-remark').value || '').trim();

    if (!clientId && typedPartyName) {
        // Find existing or auto-create party
        const existing = state.clients.find(c => c.name.toLowerCase() === typedPartyName.toLowerCase());
        if (existing) {
            clientId = existing.id;
        } else {
            // Auto create new party
            const newParty = {
                id: 'client_' + Date.now(),
                name: typedPartyName,
                group: type === 'given' ? 'Debtor' : 'Creditor',
                monthlyPay: 0,
                yearlyPay: 0,
                openingBalance: 0,
                creditAmount: 0
            };
            addClientDirect(newParty);
            clientId = newParty.id;
        }
    }

    if (!clientId) {
        alert("Please select or enter a valid Party Name for the loan.");
        if (searchInput) searchInput.focus();
        return;
    }

    if (amount <= 0) {
        alert("Please enter a valid loan amount greater than ₹0.");
        return;
    }

    const loanObj = {
        id: id || ('loan_' + Date.now()),
        clientId,
        type,
        amount,
        date,
        account,
        remark,
        timestamp: Date.now()
    };

    addLoanDirect(loanObj);
    closeLoanModal();
    renderPage(state.activePage);
}

window.deleteLoan = function(id) {
    if (confirm("Are you sure you want to delete this loan entry? Account balances and party ledger will be updated accordingly.")) {
        deleteLoanDirect(id);
        renderPage(state.activePage);
    }
};

window.openEditLoan = function(id) {
    const loan = (state.loans || []).find(l => l.id === id);
    if (loan) {
        openLoanModal(loan.type, loan.clientId, id);
    }
};

window.setLoansTab = function(tab) {
    state.activeLoansTab = tab;
    saveState();

    document.querySelectorAll('#page-loans .master-tab').forEach(el => {
        el.classList.toggle('active', el.id === `tab-loans-${tab}`);
    });

    const panelGiven = document.getElementById('loans-panel-given');
    const panelTaken = document.getElementById('loans-panel-taken');
    const panelHistory = document.getElementById('loans-panel-history');

    if (panelGiven) panelGiven.style.display = tab === 'given' ? 'block' : 'none';
    if (panelTaken) panelTaken.style.display = tab === 'taken' ? 'block' : 'none';
    if (panelHistory) panelHistory.style.display = tab === 'history' ? 'block' : 'none';

    renderLoansPage();
};

function renderLoansPage() {
    const fC = v => '₹' + Math.round(v).toLocaleString('en-IN');
    const searchInput = document.getElementById('loan-search-input');
    const searchQuery = (searchInput ? searchInput.value : '').trim().toLowerCase();

    // 1. Calculate KPI Statistics
    let totalGiven = 0;
    let totalTaken = 0;
    let totalReceived = 0;
    let totalDiscount = 0;
    let countGiven = 0;

    (state.loans || []).forEach(l => {
        const amt = Number(l.amount) || 0;
        if (l.type === 'given') {
            totalGiven += amt;
            countGiven++;
        } else if (l.type === 'taken') {
            totalTaken += amt;
        }
    });

    // Also account for legacy static creditAmount if any client has it without loan record
    state.clients.forEach(c => {
        const credit = Number(c.creditAmount) || 0;
        if (credit > 0 && !(state.loans || []).some(l => l.clientId === c.id)) {
            totalGiven += credit;
            countGiven++;
        }
    });

    // Compute received & discount across parties with loans
    state.clients.forEach(c => {
        const stats = getClientReportStats(c.id);
        if (stats.loansGiven > 0) {
            totalReceived += stats.totalReceived;
            totalDiscount += stats.totalDiscount;
        }
    });

    const pendingToRecover = Math.max(0, totalGiven - (totalReceived + totalDiscount));

    const elGivenTotal = document.getElementById('stat-loans-given-total');
    const elGivenCount = document.getElementById('stat-loans-given-count');
    const elRecTotal = document.getElementById('stat-loans-received-total');
    const elDiscText = document.getElementById('stat-loans-discount-text');
    const elPendingTotal = document.getElementById('stat-loans-pending-total');
    const elTakenTotal = document.getElementById('stat-loans-taken-total');

    if (elGivenTotal) elGivenTotal.innerText = fC(totalGiven);
    if (elGivenCount) elGivenCount.innerText = `${countGiven} Loans Disbursed`;
    if (elRecTotal) elRecTotal.innerText = fC(totalReceived);
    if (elDiscText) elDiscText.innerText = `${fC(totalDiscount)} Discount Allowed`;
    if (elPendingTotal) elPendingTotal.innerText = fC(pendingToRecover);
    if (elTakenTotal) elTakenTotal.innerText = fC(totalTaken);

    // Set Active Sub-tab Panel
    const activeTab = state.activeLoansTab || 'given';
    document.querySelectorAll('#page-loans .master-tab').forEach(el => {
        el.classList.toggle('active', el.id === `tab-loans-${activeTab}`);
    });
    const panelGiven = document.getElementById('loans-panel-given');
    const panelTaken = document.getElementById('loans-panel-taken');
    const panelHistory = document.getElementById('loans-panel-history');
    if (panelGiven) panelGiven.style.display = activeTab === 'given' ? 'block' : 'none';
    if (panelTaken) panelTaken.style.display = activeTab === 'taken' ? 'block' : 'none';
    if (panelHistory) panelHistory.style.display = activeTab === 'history' ? 'block' : 'none';

    // 2. Render Loans Given Panel
    const containerGiven = document.getElementById('loans-given-list-container');
    if (containerGiven) {
        containerGiven.innerHTML = '';
        let debtorsWithLoans = state.clients.filter(c => {
            const stats = getClientReportStats(c.id);
            return stats.loansGiven > 0 || isClientParty(c);
        });

        if (searchQuery) {
            debtorsWithLoans = debtorsWithLoans.filter(c => c.name && c.name.toLowerCase().includes(searchQuery));
        }

        if (debtorsWithLoans.length === 0) {
            containerGiven.innerHTML = `<div class="empty-state" style="grid-column:1/-1; padding:32px; text-align:center;">No loan given entries found. Click "+ Give Loan" to disburse loan to a party.</div>`;
        } else {
            debtorsWithLoans.forEach(client => {
                const stats = getClientReportStats(client.id);
                if (stats.loansGiven <= 0 && !searchQuery) return; // Only show relevant with loans

                const card = document.createElement('div');
                card.className = 'client-card';
                card.id = `loan-party-card-${client.id}`;
                card.onclick = () => togglePartyCard(client.id);

                let loanEntriesHTML = '';
                if (stats.loansList && stats.loansList.length > 0) {
                    stats.loansList.filter(l => l.type === 'given').forEach(l => {
                        const remText = l.remark ? ` — <em style="color:var(--text-secondary);">${l.remark}</em>` : '';
                        loanEntriesHTML += `
                            <div class="c-stat-row" style="font-size:11px; padding:3px 6px; background:rgba(13, 148, 136, 0.05); border-radius:3px; margin:2px 0;">
                                <span>📅 ${formatDbDate(l.date)} (${l.account || 'Direct'})${remText}:</span>
                                <span style="font-weight:700; color:var(--primary);">${fC(l.amount)}</span>
                            </div>
                        `;
                    });
                }

                card.innerHTML = `
                    <div class="client-card-header">
                        <div class="party-card-title-col">
                            <div class="party-card-name-row">
                                <h4 class="party-card-name">${client.name}</h4>
                                <span class="party-group-badge client"><i data-lucide="arrow-up-right" style="width:12px; height:12px;"></i> Debtor</span>
                            </div>
                            <div class="party-card-summary-preview">
                                <span class="preview-receivable">Balance: <strong>${fC(stats.balanceReceivable)}</strong></span>
                                <span class="preview-loan-tag">Loan: ${fC(stats.loansGiven)}</span>
                            </div>
                        </div>
                        <div class="party-card-toggle-btn">
                            <i data-lucide="chevron-down" class="party-chevron-icon"></i>
                        </div>
                    </div>
                    <div class="client-card-body" style="display:none;">
                        <div class="client-stats">
                            <div class="c-stat-row" style="font-weight:700; color:var(--primary); background:rgba(13, 148, 136, 0.08); padding:5px 8px; border-radius:4px;">
                                <span>Total Loan Principal:</span>
                                <span>${fC(stats.loansGiven)}</span>
                            </div>
                            ${loanEntriesHTML}
                            <div class="c-stat-row">
                                <span>Total Received Back:</span>
                                <span style="color:var(--success); font-weight:600;">${fC(stats.totalReceived)}</span>
                            </div>
                            ${stats.totalDiscount > 0 ? `<div class="c-stat-row"><span>Discount Given:</span><span style="color:#d97706; font-weight:600;">${fC(stats.totalDiscount)}</span></div>` : ''}
                            <div class="c-stat-row" style="border-top:1px dashed var(--border-color); padding-top:6px; margin-top:4px;">
                                <span style="font-weight:700;">Remaining Balance Due:</span>
                                <span style="font-weight:700; color:${stats.balanceReceivable > 0 ? 'var(--danger)' : 'var(--success)'};">${stats.balanceReceivable <= 0 ? 'Fully Recovered (₹0)' : fC(stats.balanceReceivable)}</span>
                            </div>
                        </div>
                        <div class="client-card-footer" onclick="event.stopPropagation()">
                            <button class="btn btn-outline btn-sm" onclick="openLoanModal('given', '${client.id}')" style="font-size:11px; padding:4px 9px; display:inline-flex; align-items:center; gap:4px; color:var(--primary); border-color:rgba(13, 148, 136, 0.4); background:rgba(13, 148, 136, 0.06); font-weight:600;">
                                <i data-lucide="plus" style="width:12px; height:12px;"></i> Give Loan
                            </button>
                            <button class="btn btn-outline btn-sm" onclick="quickReceiveForParty('${client.id}')" style="font-size:11px; padding:4px 9px; display:inline-flex; align-items:center; gap:4px; color:var(--success); border-color:rgba(16, 185, 129, 0.4); background:rgba(16, 185, 129, 0.06); font-weight:600;">
                                <i data-lucide="wallet" style="width:12px; height:12px;"></i> Receive
                            </button>
                        </div>
                    </div>
                `;
                containerGiven.appendChild(card);
            });
        }
    }

    // 3. Render Loans Taken Panel
    const containerTaken = document.getElementById('loans-taken-list-container');
    if (containerTaken) {
        containerTaken.innerHTML = '';
        let takenLoans = (state.loans || []).filter(l => l.type === 'taken');
        if (searchQuery) {
            takenLoans = takenLoans.filter(l => {
                const c = state.clients.find(cl => cl.id === l.clientId);
                return (c && c.name.toLowerCase().includes(searchQuery)) || (l.remark && l.remark.toLowerCase().includes(searchQuery));
            });
        }

        if (takenLoans.length === 0) {
            containerTaken.innerHTML = `<div class="empty-state" style="grid-column:1/-1; padding:32px; text-align:center;">No loans taken logged. Click "+ Take Loan" to log funds borrowed from a creditor or party.</div>`;
        } else {
            takenLoans.forEach(loan => {
                const client = state.clients.find(c => c.id === loan.clientId);
                const partyName = client ? client.name : 'Creditor / Lender';

                const card = document.createElement('div');
                card.className = 'client-card';
                card.innerHTML = `
                    <div class="client-card-header">
                        <div class="party-card-title-col">
                            <div class="party-card-name-row">
                                <h4 class="party-card-name">${partyName}</h4>
                                <span class="party-group-badge vendor"><i data-lucide="arrow-down-left" style="width:12px; height:12px;"></i> Loan Taken</span>
                            </div>
                            <div class="party-card-summary-preview">
                                <span class="preview-receivable" style="color:#d97706;">Borrowed: <strong>${fC(loan.amount)}</strong></span>
                                <span class="preview-loan-tag">Account: ${loan.account || 'Direct'}</span>
                            </div>
                        </div>
                    </div>
                    <div class="client-card-body" style="display:block; padding-top:6px;">
                        <div class="client-stats">
                            <div class="c-stat-row">
                                <span>Borrow Date:</span>
                                <span>${formatDbDate(loan.date)}</span>
                            </div>
                            <div class="c-stat-row">
                                <span>Deposited Into:</span>
                                <span class="badge-acctype">${loan.account || 'Direct Cash/Bank'}</span>
                            </div>
                            <div class="c-stat-row">
                                <span>Remark:</span>
                                <span>${loan.remark || '-'}</span>
                            </div>
                        </div>
                        <div class="client-card-footer" onclick="event.stopPropagation()">
                            <button class="btn-icon-only edit-btn" onclick="openEditLoan('${loan.id}')" title="Edit Loan"><i data-lucide="edit-3"></i></button>
                            <button class="btn-icon-only delete-btn" onclick="deleteLoan('${loan.id}')" title="Delete Loan"><i data-lucide="trash-2"></i></button>
                        </div>
                    </div>
                `;
                containerTaken.appendChild(card);
            });
        }
    }

    // 4. Render Loans History Log Table
    const tbodyHistory = document.getElementById('loans-history-tbody');
    if (tbodyHistory) {
        tbodyHistory.innerHTML = '';
        let sortedLoans = [...(state.loans || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        if (searchQuery) {
            sortedLoans = sortedLoans.filter(l => {
                const c = state.clients.find(cl => cl.id === l.clientId);
                return (c && c.name.toLowerCase().includes(searchQuery)) || (l.remark && l.remark.toLowerCase().includes(searchQuery));
            });
        }

        if (sortedLoans.length === 0) {
            tbodyHistory.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:24px;">No loan transactions recorded yet.</td></tr>`;
        } else {
            sortedLoans.forEach(loan => {
                const client = state.clients.find(c => c.id === loan.clientId);
                const partyName = client ? client.name : 'Unknown Party';
                const isGiven = loan.type === 'given';

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${formatDbDate(loan.date)}</td>
                    <td style="font-weight:600;">${partyName}</td>
                    <td>
                        <span class="badge-transfer-type ${isGiven ? 'cash-to-bank' : 'bank-to-cash'}" style="font-size:11px; padding:2px 8px;">
                            ${isGiven ? '💵 Loan Given' : '🏦 Loan Taken'}
                        </span>
                    </td>
                    <td><span class="badge-acctype">${loan.account || '-'}</span></td>
                    <td style="font-weight:700; color:${isGiven ? 'var(--primary)' : '#d97706'};">${fC(loan.amount)}</td>
                    <td style="font-size:12px; color:var(--text-secondary); max-width:200px; word-break:break-word;">${loan.remark || '-'}</td>
                    <td class="actions-col">
                        <div class="actions-wrapper">
                            <button class="btn-icon-only edit-btn" onclick="openEditLoan('${loan.id}')" title="Edit Loan"><i data-lucide="edit-3"></i></button>
                            <button class="btn-icon-only delete-btn" onclick="deleteLoan('${loan.id}')" title="Delete Loan"><i data-lucide="trash-2"></i></button>
                        </div>
                    </td>
                `;
                tbodyHistory.appendChild(tr);
            });
        }
    }

    if (window.lucide) lucide.createIcons();
}

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
            "Party Name": client.name,
            "Party Group": isVendorParty(client) ? 'Vendor' : 'Client',
            "Payment / Financial Year": client.pendingYear || '2026-2027',
            "Credit / Loan Amount (INR)": client.creditAmount || 0,
            "Monthly Retainer (INR)": client.monthlyPay || 0,
            "Yearly Retainer (INR)": stats.yearlyContract,
            "Opening Balance (INR)": stats.openingBalance,
            "Total Receivable (INR)": stats.totalReceivable,
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
            "Amount Received (INR)": log.amount,
            "Discount (INR)": log.discount || 0,
            "Remark / Notes": log.remark || ''
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
            "Fund Source Client": client ? client.name : (tx.clientId === 'opening_balance' || (typeof tx.clientId === 'string' && tx.clientId.startsWith('opening_')) ? 'Bank Opening Balance' : 'General'),
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
            "Status": variance >= 0 ? "Surplus / Saved" : "Overspent"
        };
    });

    const transfersData = (state.transfers || []).map(tr => ({
        "Date": formatDbDate(tr.date),
        "Transfer Type": tr.type || 'Transfer',
        "From Account (Outflow)": tr.fromAccount,
        "To Account (Inflow)": tr.toAccount,
        "Amount Transferred (INR)": tr.amount,
        "Remark / Notes": tr.remark || ''
    }));

    const loansData = (state.loans || []).map(loan => {
        const client = state.clients.find(c => c.id === loan.clientId);
        return {
            "Date": formatDbDate(loan.date),
            "Party Name": client ? client.name : 'Unknown Party',
            "Loan Direction": loan.type === 'given' ? 'Loan Given' : 'Loan Taken',
            "Account": loan.account || '',
            "Loan Amount (INR)": loan.amount,
            "Remark / Purpose": loan.remark || ''
        };
    });

    const contractsData = [];
    state.clients.forEach(client => {
        const fy = client.pendingYear || '2026-2027';
        if (client.contractItems && client.contractItems.length > 0) {
            client.contractItems.forEach(ci => {
                contractsData.push({
                    "Party Name": client.name,
                    "Financial Year": fy,
                    "Service Particulars": ci.particulars || 'Service',
                    "Period": ci.period || ('FY ' + fy),
                    "Months": ci.months || 12,
                    "Rate (INR)": ci.rate || 0,
                    "Amount (INR)": ci.amount || 0
                });
            });
        }
    });

    const wb = XLSX.utils.book_new();

    const addSheet = (data, sheetName) => {
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
    };

    addSheet(clientsData, "Clients Overview");
    if (contractsData.length > 0) addSheet(contractsData, "Contract Breakdown");
    addSheet(loansData, "Loans & Credit");
    addSheet(incomeData, "Received Income Logs");
    addSheet(expensesData, "Expenses Ledger");
    addSheet(transfersData, "Internal Transfers");
    addSheet(budgetData, "Budget Analysis");

    state.accounts.forEach(acc => {
        const ledger = getAccountLedger(acc.id);
        const ledgerRows = ledger.map(row => {
            return {
                "Date": formatDbDate(row.date),
                "Particulars Description": row.particulars,
                "Category / Type": row.category,
                "Credit Deposit / Inflow (INR)": row.credit > 0 ? row.credit : null,
                "Debit Withdrawal / Outflow (INR)": row.debit > 0 ? row.debit : null,
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
    initInactivityTracker();
    
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

    const resetTxBtn = document.getElementById('btn-reset-transactions-now');
    if (resetTxBtn) {
        resetTxBtn.addEventListener('click', handleResetTransactionsClick);
    }

    const resetAppBtn = document.getElementById('btn-reset-app-now');
    if (resetAppBtn) {
        resetAppBtn.addEventListener('click', handleResetAppClick);
    }

    if (state.currentUser) {
        renderPage(state.activePage);
    }
    
    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker active:', reg.scope))
            .catch(err => console.error('Service Worker registration failed:', err));
    }

    // PWA Install Button handlers
    document.querySelectorAll('.btn-pwa-install-trigger, #btn-pwa-install').forEach(btn => {
        btn.addEventListener('click', triggerPWAInstall);
    });

    lucide.createIcons();
});

// PWA beforeinstallprompt global handler
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log("beforeinstallprompt event captured.");
});

window.addEventListener('appinstalled', (evt) => {
    console.log('App installed successfully!');
    deferredPrompt = null;
});

async function triggerPWAInstall() {
    if (deferredPrompt) {
        try {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response to install: ${outcome}`);
            if (outcome === 'accepted') {
                alert("Thank you! Wealth Plus is being installed on your device.");
            }
            deferredPrompt = null;
        } catch (err) {
            console.error("Error triggering install prompt:", err);
        }
    } else {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
        if (isStandalone) {
            alert("Wealth Plus is already installed and running as a standalone app on your device!");
            return;
        }

        const isWebView = /(wv|WhatsApp|FB_IAB|FBAN|FBAV|Instagram)/i.test(navigator.userAgent);
        if (isWebView) {
            alert("⚠️ Note: This link is open inside an In-App browser (e.g. WhatsApp).\n\nTo install the app:\n1. Tap the 3 dots menu (⋮) at the top-right corner.\n2. Select 'Open in Chrome'.\n3. Return here and tap 'Install App Now'.");
            return;
        }

        const isIos = /iPhone|iPad|iPod/i.test(navigator.userAgent);
        if (isIos) {
            alert("📱 How to install on iPhone/iPad (Safari):\n\n1. Tap the Share icon at the bottom of Safari.\n2. Scroll down and tap 'Add to Home Screen'.\n3. Tap 'Add' in the top-right corner. Done!");
        } else {
            alert("📱 How to install on Android (Chrome):\n\n1. Tap the 3 dots menu (⋮) at the top-right corner of Chrome.\n2. Tap 'Install app' or 'Add to Home screen'.\n3. Tap 'Install' to confirm. Wealth Plus will appear on your phone!");
        }
    }
}



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

        // Save locally to firebase-config.js via local server API if running on localhost
        if (location.protocol !== 'file:') {
            const configJsContent = `window.firebaseConfig = ${JSON.stringify(config, null, 4)};`;
            fetch('/api/write-file', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename: 'firebase-config.js',
                    content: configJsContent
                })
            }).then(res => {
                if (res.ok) {
                    console.log("firebase-config.js saved locally successfully.");
                } else {
                    console.error("Failed to save firebase-config.js locally.");
                }
            }).catch(err => {
                console.error("Error writing firebase-config.js locally:", err);
            });
        }

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
        
        // Clear firebase-config.js locally
        if (location.protocol !== 'file:') {
            fetch('/api/write-file', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename: 'firebase-config.js',
                    content: 'window.firebaseConfig = {};'
                })
            }).catch(err => console.error("Error clearing firebase-config.js:", err));
        }

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
            if (e.message && e.message.toLowerCase().includes("permission")) {
                alert("Firebase Firestore Permission Error: Your Firebase Firestore database rules are currently blocking write access.\n\nPlease go to Firebase Console (console.firebase.google.com) > Firestore Database > Rules tab, set 'allow read, write: if true;' and click Publish.");
            } else {
                alert("Error uploading data: " + e.message);
            }
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
    // Upload investments
    if (state.investments) {
        await firebaseDb.collection('investments').doc('all').set({ list: state.investments });
    }
    // Upload settings
    await firebaseDb.collection('settings').doc('config').set({
        budgets: state.budgets,
        customClientFields: state.customClientFields,
        customTxFields: state.customTxFields,
        categoriesConfig: state.categoriesConfig
    });
}

async function handleResetTransactionsClick() {
    // Verify Admin rights
    const currentUser = state.currentUser;
    if (currentUser && currentUser.role === 'Staff') {
        alert("🔒 Access Denied: Only Admin can reset transactions.");
        return;
    }

    const adminMember = (state.members || []).find(m => m.role === 'Admin') || { pin: ADMIN_PIN };
    const enteredPin = prompt("⚠️ ADMIN CONFIRMATION REQUIRED\n\nEnter your Admin PIN to confirm deleting all amount transactions (Expenses, Client Payments & Loans):");
    
    if (enteredPin === null) return;
    if (enteredPin !== adminMember.pin && enteredPin !== ADMIN_PIN) {
        alert("❌ Incorrect Admin PIN! Transaction reset cancelled.");
        return;
    }

    if (!confirm("⚠️ FINAL WARNING:\n\nAre you sure you want to delete ALL amount transactions?\n\n• All Expenses, Client Payment Receipts, and Loans will be deleted.\n• All Client Profiles, Contracts, Expense Categories, Budgets, Bank Accounts, and Member Logins will stay 100% safe.\n\nProceed?")) {
        return;
    }

    const resetBtn = document.getElementById('btn-reset-transactions-now');
    if (resetBtn) {
        resetBtn.disabled = true;
        resetBtn.innerText = "Clearing Transactions...";
    }

    try {
        if (state.cloudSyncEnabled && firebaseDb) {
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

            // Wipe loans from Firestore
            const loansSnapshot = await firebaseDb.collection('loans').get();
            for (const doc of loansSnapshot.docs) {
                await doc.ref.delete();
            }
        }

        // Reset local amount-based records
        state.transactions = [];
        state.incomeLogs = [];
        state.loans = [];
        
        // Save state locally
        saveState();
        
        alert("✅ All amount transactions have been successfully reset!\n\nAll Client Profiles, Contracts, Categories, Budgets, and Settings remain safely preserved.");
        window.location.reload();
    } catch (e) {
        console.error("Transaction reset error:", e);
        alert("Error resetting transactions: " + e.message);
    } finally {
        if (resetBtn) {
            resetBtn.disabled = false;
            resetBtn.innerHTML = '<i data-lucide="refresh-cw"></i> Reset All Transactions (Admin Only)';
            if (window.lucide) lucide.createIcons();
        }
    }
}

async function handleResetAppClick() {
    // Verify Admin rights
    const currentUser = state.currentUser;
    if (currentUser && currentUser.role === 'Staff') {
        alert("🔒 Access Denied: Only Admin can perform a factory reset.");
        return;
    }

    const adminMember = (state.members || []).find(m => m.role === 'Admin') || { pin: ADMIN_PIN };
    const enteredPin = prompt("⚠️ FACTORY RESET - ADMIN CONFIRMATION REQUIRED\n\nEnter your Admin PIN to confirm complete application factory reset:");
    
    if (enteredPin === null) return;
    if (enteredPin !== adminMember.pin && enteredPin !== ADMIN_PIN) {
        alert("❌ Incorrect Admin PIN! Factory reset cancelled.");
        return;
    }

    if (!confirm("⚠️ FINAL WARNING: Are you sure you want to perform a complete factory reset? This will wipe EVERYTHING (all clients, accounts, transactions, and categories). This cannot be undone!")) {
        return;
    }

    const resetBtn = document.getElementById('btn-reset-app-now');
    if (resetBtn) {
        resetBtn.disabled = true;
        resetBtn.innerText = "Clearing All Data...";
    }

    if (state.cloudSyncEnabled && firebaseDb) {
        try {
            // Wipe transactions from Firestore
            const txSnapshot = await firebaseDb.collection('transactions').get();
            for (const doc of txSnapshot.docs) await doc.ref.delete();

            // Wipe income logs from Firestore
            const incomeSnapshot = await firebaseDb.collection('incomeLogs').get();
            for (const doc of incomeSnapshot.docs) await doc.ref.delete();

            // Wipe loans from Firestore
            const loansSnapshot = await firebaseDb.collection('loans').get();
            for (const doc of loansSnapshot.docs) await doc.ref.delete();

            // Wipe clients from Firestore
            const clientSnapshot = await firebaseDb.collection('clients').get();
            for (const doc of clientSnapshot.docs) await doc.ref.delete();

            // Wipe investments from Firestore
            await firebaseDb.collection('investments').doc('all').delete();

            alert("Cloud database records cleared successfully!");
        } catch (e) {
            console.error("Cloud reset error:", e);
            alert("Error clearing cloud database: " + e.message);
        }
    }

    // Reset local state
    state.transactions = [];
    state.incomeLogs = [];
    state.loans = [];
    state.investments = [];
    state.clients = defaultClients;
    state.accounts = defaultAccounts;
    
    saveState();
    alert("Application data reset successfully! Reloading page...");
    window.location.reload();
}
