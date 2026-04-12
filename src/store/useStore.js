import { create } from 'zustand';

export const useStore = create((set) => ({
  user: null, // { uid, displayName, email, photoURL }
  accounts: [],
  transactions: [],
  goals: [],
  exchangeRate: null,

  setUser: (user) => set({ user }),
  setAccounts: (accounts) => set({ accounts }),
  setTransactions: (transactions) => set({ transactions }),
  setExchangeRate: (rateData) => set({ exchangeRate: rateData }),
  
  clearStore: () => set({
    user: null,
    accounts: [],
    transactions: [],
    goals: []
  }),

  getTotalBalanceBs: () => {
    return 0;
  }
}));
