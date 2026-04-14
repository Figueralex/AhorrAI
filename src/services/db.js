import { collection, setDoc, doc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { db, getAuthInstance } from './firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Local Storage Keys
const TX_KEY = '@ahorrai_transactions';
const ACC_KEY = '@ahorrai_accounts';

// Helper to get locally
const getLocal = async (key) => {
    try {
        const val = await AsyncStorage.getItem(key);
        return val ? JSON.parse(val) : [];
    } catch (e) {
        console.error('Error getLocal', e);
        return [];
    }
};

// Helper to save locally (Overwrite entire list)
const saveLocalList = async (key, list) => {
    try {
        await AsyncStorage.setItem(key, JSON.stringify(list));
    } catch (e) {
        console.error('Error saveLocalList', e);
    }
};

// --- SYNC ENGINE (Multi-purpose) ---
const syncToFirebase = async (type, data, method = 'add', id = null) => {
    try {
        const auth = getAuthInstance();
        if (!auth || !auth.currentUser) return;
        
        // El id es obligatorio para mantener la consistencia entre BD local y remota
        const docId = id || data.id;
        if (!docId) return;

        const docRef = doc(db, `users/${auth.currentUser.uid}/${type}`, docId);
        
        if (method === 'add' || method === 'update') {
            await setDoc(docRef, data, { merge: true });
        } else if (method === 'delete') {
             await deleteDoc(docRef);
        }
    } catch (e) {
        console.log(`[Sync] Error: ${e.message}`);
    }
};

export const downloadBackupFromFirebase = async () => {
    try {
        const auth = getAuthInstance();
        if (!auth || !auth.currentUser) return;
        
        const txSnap = await getDocs(collection(db, `users/${auth.currentUser.uid}/transactions`));
        const transactions = txSnap.docs.map(d => d.data());
        if (transactions.length > 0) {
            await saveLocalList(TX_KEY, transactions);
        }

        const accSnap = await getDocs(collection(db, `users/${auth.currentUser.uid}/accounts`));
        const accounts = accSnap.docs.map(d => d.data());
        if (accounts.length > 0) {
            await saveLocalList(ACC_KEY, accounts);
        }
        
    } catch (e) {
        console.log(`[Sync Backup] Error: ${e.message}`);
    }
};

// --- TRANSACTIONS ---

export const saveTransaction = async (transaction) => {
  const newTx = { 
    ...transaction, 
    id: Date.now().toString(), 
    date: new Date().getTime(),
    // Fallback for old data: assume original is Bs if not set
    originalCurrency: transaction.originalCurrency || (transaction.amount_bs > 0 ? 'Bs' : 'USD'),
    originalAmount: transaction.originalAmount || (transaction.amount_bs > 0 ? transaction.amount_bs : transaction.amount_usd)
  };
  const list = await getLocal(TX_KEY);
  await saveLocalList(TX_KEY, [newTx, ...list]);
  syncToFirebase('transactions', newTx, 'add', newTx.id);
  return newTx.id;
};

export const updateTransaction = async (id, updatedData) => {
    const list = await getLocal(TX_KEY);
    const index = list.findIndex(tx => tx.id === id);
    if (index !== -1) {
        list[index] = { ...list[index], ...updatedData };
        await saveLocalList(TX_KEY, list);
        syncToFirebase('transactions', list[index], 'update', id);
        return true;
    }
    return false;
};

export const deleteTransaction = async (id) => {
    const list = await getLocal(TX_KEY);
    const filtered = list.filter(tx => tx.id !== id);
    await saveLocalList(TX_KEY, filtered);
    syncToFirebase('transactions', null, 'delete', id);
    return true;
};

export const fetchAllTransactions = async () => {
    return await getLocal(TX_KEY);
};

// --- ACCOUNTS ---

export const saveAccount = async (account) => {
    const newAcc = { 
        ...account, 
        id: Date.now().toString(), 
        createdAt: new Date().getTime() 
    };
    const list = await getLocal(ACC_KEY);
    await saveLocalList(ACC_KEY, [newAcc, ...list]);
    syncToFirebase('accounts', newAcc, 'add', newAcc.id);
    return newAcc.id;
};

export const updateAccount = async (id, updatedData) => {
    const list = await getLocal(ACC_KEY);
    const index = list.findIndex(acc => acc.id === id);
    if (index !== -1) {
        list[index] = { ...list[index], ...updatedData };
        await saveLocalList(ACC_KEY, list);
        syncToFirebase('accounts', list[index], 'update', id);
        return true;
    }
    return false;
};

export const deleteAccount = async (id) => {
    const list = await getLocal(ACC_KEY);
    const filtered = list.filter(acc => acc.id !== id);
    await saveLocalList(ACC_KEY, filtered);
    syncToFirebase('accounts', null, 'delete', id);
    return true;
};

export const fetchAccounts = async () => {
    return await getLocal(ACC_KEY);
};

export const initializeDefaultAccounts = async () => {
    const accounts = await fetchAccounts();
    if (accounts.length === 0) {
        const defaults = [
            { 
                name: 'Efectivo Bs.', 
                currency: 'Bs', 
                type: 'cash', 
                preferredRate: 'BCV',
                initialBalance: 0 
            },
            { 
                name: 'Efectivo $', 
                currency: 'USD', 
                type: 'cash', 
                preferredRate: 'USDT',
                initialBalance: 0 
            }
        ];
        for (const acc of defaults) {
            await saveAccount(acc);
            console.log(`[DB] Cuenta creada: ${acc.name}`);
        }
        console.log('[DB] Cuentas por defecto inicializadas.');
    } else {
        console.log(`[DB] Ya existen ${accounts.length} cuentas, no se crean defaults.`);
    }
};

// --- AI LOGIC ---

export const processAndSaveTransactionFromAI = async (parsedData, currentExchangeRate) => {
    // Importamos la tasa de USDT al momento
    const { fetchUSDTExchangeRate } = require('./currency');
    const usdtRate = await fetchUSDTExchangeRate();

    // Buscar cuenta más cercana
    const accounts = await fetchAccounts();
    const aiAccountName = (parsedData.account || '').toLowerCase();
    
    let matchedAccount = accounts.find(a => a.name.toLowerCase() === aiAccountName);
    
    // Si no hay match exacto, buscar parcial
    if (!matchedAccount && aiAccountName) {
        matchedAccount = accounts.find(a => 
            a.name.toLowerCase().includes(aiAccountName) || 
            aiAccountName.includes(a.name.toLowerCase())
        );
    }

    const defaultCashAccount = parsedData.currency === 'Bs' ? 'Efectivo Bs.' : 'Efectivo $';
    const finalAccountName = matchedAccount ? matchedAccount.name : (parsedData.account || defaultCashAccount);

    // Si es una transferencia, buscar cuenta destino
    let finalToAccountName = null;
    if (parsedData.type === 'transfer' && parsedData.toAccount) {
        const toAccName = parsedData.toAccount.toLowerCase();
        let matchedToAccount = accounts.find(a => a.name.toLowerCase() === toAccName);
        if (!matchedToAccount) {
            matchedToAccount = accounts.find(a => 
                a.name.toLowerCase().includes(toAccName) || 
                toAccName.includes(a.name.toLowerCase())
            );
        }
        finalToAccountName = matchedToAccount ? matchedToAccount.name : parsedData.toAccount;
    }

    const cleanAmount = (val) => {
        if (!val && val !== 0) return 0;
        const str = val.toString().replace(/[^0-9.,]/g, '').replace(',', '.');
        return parseFloat(str) || 0;
    };

    let amount_usd = 0; 
    let amount_bs = 0;
    const amount = cleanAmount(parsedData.amount || parsedData.fromAmount);
    const currency = parsedData.currency || parsedData.fromCurrency;

    // Lógica de tasa basada en la cuenta
    let conversionRate = currentExchangeRate; // Default BCV
    if (matchedAccount && matchedAccount.preferredRate === 'USDT') {
        conversionRate = usdtRate || currentExchangeRate;
    } else if (currency === 'USDT') {
        conversionRate = usdtRate || currentExchangeRate;
    }

    if (currency === 'USD' || currency === 'USDT') {
        amount_usd = amount;
        amount_bs = amount * conversionRate;
    } else {
        amount_bs = amount;
        amount_usd = amount / conversionRate;
    }

    const mainTransaction = {
        type: parsedData.type,
        amount_bs, 
        amount_usd,
        originalCurrency: currency,
        originalAmount: amount,
        fromAmount: parsedData.fromAmount !== undefined ? cleanAmount(parsedData.fromAmount) : null,
        toAmount: parsedData.toAmount !== undefined ? cleanAmount(parsedData.toAmount) : null,
        fromCurrency: parsedData.fromCurrency,
        toCurrency: parsedData.toCurrency,
        category: parsedData.category || (parsedData.type === 'transfer' ? 'Transferencia' : 'General'),
        account: finalAccountName,
        toAccount: finalToAccountName,
        payment_method: parsedData.payment_method || 'normal'
    };

    await saveTransaction(mainTransaction);

    if (parsedData.payment_method && parsedData.payment_method.toLowerCase().includes('pago móvil')) {
        const commissionBs = amount_bs * 0.003; // Ajustado a 0.3% real
        const commissionUsd = amount_usd * 0.003;
        const commissionTx = {
            type: 'expense',
            amount_bs: commissionBs,
            amount_usd: commissionUsd,
            originalCurrency: 'Bs',
            originalAmount: commissionBs,
            category: 'Comisión bancaria',
            account: finalAccountName,
            payment_method: 'normal'
        };
        if (commissionBs > 0) await saveTransaction(commissionTx);
    }
};
