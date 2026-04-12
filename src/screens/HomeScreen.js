import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { fetchAllTransactions, fetchAccounts, saveAccount, updateAccount, deleteAccount } from '../services/db';
import { generateInsights } from '../services/insights';
import { fetchDailyExchangeRate, fetchUSDTExchangeRate } from '../services/currency';
import { useStore } from '../store/useStore';
import { formatCurrency } from '../utils/format';

export default function HomeScreen() {
  const { user } = useStore();
  const [balanceBs, setBalanceBs] = useState(0);
  const [balanceUsd, setBalanceUsd] = useState(0);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Accounts System State
  const [accountsList, setAccountsList] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newAccName, setNewAccName] = useState('');
  const [newAccBalance, setNewAccBalance] = useState('');
  const [newAccCurrency, setNewAccCurrency] = useState('USD');
  const [savingAccount, setSavingAccount] = useState(false);
  const [exchangeRateDisplay, setExchangeRateDisplay] = useState('...');
  const [usdtRateDisplay, setUsdtRateDisplay] = useState('...');
  
  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [showAllCategories, setShowAllCategories] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = async () => {
    try {
      if (!refreshing) setLoading(true);
      const txs = await fetchAllTransactions();
      const accs = await fetchAccounts();
      const [rate, usdtRate] = await Promise.all([
        fetchDailyExchangeRate(),
        fetchUSDTExchangeRate()
      ]);
      
      if (rate) setExchangeRateDisplay(formatCurrency(rate));
      if (usdtRate) setUsdtRateDisplay(formatCurrency(usdtRate));

      let finalTotalUsd = 0;
      let finalTotalBs = 0;

      const processedAccounts = accs.map(acc => {
        let currentBalance = parseFloat(acc.initialBalance || 0);
        
        txs.forEach(t => {
          // Si es un gasto o ingreso regular para esta cuenta
          if (t.account && t.account.toLowerCase() === acc.name.toLowerCase()) {
            // Usar el monto manual si existe, sino el normalizado
            const amt = t.type === 'transfer' && t.fromAmount ? t.fromAmount : (acc.currency === 'Bs' ? t.amount_bs : t.amount_usd);
            if (t.type === 'income') currentBalance += amt;
            else if (t.type === 'expense') currentBalance -= amt;
            else if (t.type === 'transfer') currentBalance -= amt; // Sale de la cuenta origen
          }
          // Si esta cuenta es la RECEPTORA de una transferencia
          if (t.type === 'transfer' && t.toAccount && t.toAccount.toLowerCase() === acc.name.toLowerCase()) {
            // Usar el monto manual de destino si existe
            const amt = t.toAmount ? t.toAmount : (acc.currency === 'Bs' ? t.amount_bs : t.amount_usd);
            currentBalance += amt; // Entra en la cuenta destino
          }
        });

        // LÓGICA ESPECIAL: Si la cuenta es "Efectivo $", usamos usdtRate para la equivalencia
        const isCashUsd = acc.name.toLowerCase() === 'efectivo $';
        const activeRate = isCashUsd ? (usdtRate || rate || 36) : (rate || 36);

        let equivalent = 0;
        if (acc.currency === 'USD') {
          equivalent = currentBalance * activeRate;
          finalTotalUsd += currentBalance;
          finalTotalBs += equivalent;
        } else if (acc.currency === 'USDT') {
          equivalent = currentBalance * (usdtRate || rate || 36);
          finalTotalUsd += currentBalance;
          finalTotalBs += equivalent;
        } else {
          equivalent = currentBalance / activeRate;
          finalTotalBs += currentBalance;
          finalTotalUsd += equivalent;
        }

        return { ...acc, currentBalance, equivalent };
      });

      setBalanceBs(finalTotalBs);
      setBalanceUsd(finalTotalUsd);
      setInsights(generateInsights(txs));
      setAccountsList(processedAccounts);
    } catch (error) {
      console.error('loadDashboard Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadDashboard();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadDashboard();
    }, [user])
  );

  const handleAddAccount = async () => {
    if (!newAccName || !newAccBalance) {
        return Alert.alert('Error', 'Debes colocarle un nombre y monto inicial.');
    }
    setSavingAccount(true);
    try {
        const payload = {
            name: newAccName,
            initialBalance: parseFloat(newAccBalance) || 0,
            currency: newAccCurrency
        };

        if (isEditing) {
            await updateAccount(editingId, payload);
        } else {
            await saveAccount(payload);
        }
        
        closeModal();
        loadDashboard(); 
    } catch (error) {
        console.error('handleAddAccount Error:', error);
        Alert.alert('Error', 'Falló la operación. Por favor intenta de nuevo.');
    } finally {
        setSavingAccount(false);
    }
  };

  const openEditModal = (acc) => {
    setNewAccName(acc.name);
    setNewAccBalance(acc.initialBalance.toString());
    setNewAccCurrency(acc.currency);
    setEditingId(acc.id);
    setIsEditing(true);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setIsEditing(false);
    setEditingId(null);
    setNewAccName('');
    setNewAccBalance('');
    setNewAccCurrency('USD');
  };

  const handleDeleteAccount = () => {
    Alert.alert(
        'Eliminar Cuenta',
        '¿Estás seguro de que deseas eliminar esta cuenta? Los movimientos previos no se verán afectados.',
        [
            { text: 'Cancelar', style: 'cancel' },
            { 
                text: 'Eliminar', 
                style: 'destructive',
                onPress: async () => {
                    setSavingAccount(true);
                    await deleteAccount(editingId);
                    closeModal();
                    loadDashboard();
                    setSavingAccount(false);
                }
            }
        ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>AhorrAI</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.rateBadge, styles.bcvBadge]}>
            <Text style={styles.rateLabel}>BCV</Text>
            <Text style={styles.rateValue}>{exchangeRateDisplay}</Text>
          </View>
          <View style={[styles.rateBadge, styles.usdtBadge]}>
            <Text style={styles.rateLabel}>USDT</Text>
            <Text style={styles.rateValue}>{usdtRateDisplay}</Text>
          </View>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={Colors.primary} 
            colors={[Colors.primary]}
          />
        }
      >
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Balance Total</Text>
          <Text style={styles.balanceMain}>$ {formatCurrency(balanceUsd)}</Text>
          <Text style={styles.balanceSub}>Bs {formatCurrency(balanceBs)}</Text>
        </View>

        {/* AI Behavioral Insights */}
        {insights.length > 0 && (
          <View style={styles.insightsContainer}>
            <Text style={styles.sectionTitle}>Recomendaciones AhorrAI</Text>
            {insights.map((insight) => (
              <View key={insight.id} style={[styles.insightCard, insight.type === 'danger' && styles.insightDanger]}>
                <Text style={styles.insightText}>💡 {insight.text}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Cuentas System */}
        <View style={styles.headerWithAction}>
          <Text style={styles.sectionTitle}>Cuentas</Text>
          <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addBtn}>
            <Ionicons name="add" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {accountsList.length === 0 ? (
           <View style={styles.emptyAccounts}>
             <Text style={styles.emptyAccountsText}>No tienes cuentas configuradas. Presiona el (+) para añadir una.</Text>
           </View>
        ) : (
           accountsList.map((acc, index) => (
             <TouchableOpacity 
                key={acc.id || index} 
                style={styles.accountCard}
                onLongPress={() => openEditModal(acc)}
             >
               <View>
                 <Text style={styles.accountName}>{acc.name}</Text>
                 <Text style={styles.accountEquivalent}>
                   {acc.currency === 'Bs' ? '$' : 'Bs.'} {formatCurrency(acc.equivalent || 0)}
                 </Text>
               </View>
               <Text style={styles.accountBalance}>
                  {acc.currency === 'USD' ? '$' : acc.currency === 'USDT' ? 'USDT' : 'Bs.'} {formatCurrency(acc.currentBalance || 0)}
               </Text>
             </TouchableOpacity>
           ))
        )}

      </ScrollView>

      {/* Modal Cuenta (Añadir/Editar) */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
                <Text style={styles.modalTitle}>{isEditing ? 'Editar Cuenta' : 'Nueva Cuenta'}</Text>
                
                <TextInput 
                    style={styles.input}
                    placeholder="Nombre (ej. Banesco, Zelle...)"
                    placeholderTextColor={Colors.textSecondary}
                    value={newAccName}
                    onChangeText={setNewAccName}
                />

                <TextInput 
                    style={styles.input}
                    placeholder="Saldo Inicial"
                    placeholderTextColor={Colors.textSecondary}
                    keyboardType="numeric"
                    value={newAccBalance}
                    onChangeText={setNewAccBalance}
                />

                <View style={styles.currencyToggle}>
                    <TouchableOpacity 
                        style={[styles.currencyBtn, newAccCurrency === 'USD' && styles.currencyBtnActive]}
                        onPress={() => setNewAccCurrency('USD')}
                    >
                        <Text style={[styles.currencyText, newAccCurrency === 'USD' && styles.currencyTextActive]}>$</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.currencyBtn, newAccCurrency === 'USDT' && styles.currencyBtnActive]}
                        onPress={() => setNewAccCurrency('USDT')}
                    >
                        <Text style={[styles.currencyText, newAccCurrency === 'USDT' && styles.currencyTextActive]}>USDT</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.currencyBtn, newAccCurrency === 'Bs' && styles.currencyBtnActive]}
                        onPress={() => setNewAccCurrency('Bs')}
                    >
                        <Text style={[styles.currencyText, newAccCurrency === 'Bs' && styles.currencyTextActive]}>Bs</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.modalActions}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={closeModal} disabled={savingAccount}>
                        <Text style={styles.cancelText}>Cancelar</Text>
                    </TouchableOpacity>
                    
                    {isEditing && (
                        <TouchableOpacity 
                            style={styles.deleteModalBtn} 
                            onPress={handleDeleteAccount} 
                            disabled={savingAccount}
                        >
                            <Ionicons name="trash-outline" size={24} color={Colors.error} />
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity style={styles.saveBtn} onPress={handleAddAccount} disabled={savingAccount}>
                        {savingAccount ? <ActivityIndicator color="#000" /> : <Text style={styles.saveText}>{isEditing ? 'Guardar' : 'Añadir'}</Text>}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { color: Colors.textSecondary, fontSize: 16 },
  title: { color: Colors.text, fontSize: 32, fontWeight: 'bold' },
  profileBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  profileInitial: { color: Colors.primary, fontSize: 18, fontWeight: 'bold' },
  rateBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    marginLeft: 8,
  },
  bcvBadge: { backgroundColor: 'rgba(0, 230, 118, 0.1)' },
  usdtBadge: { backgroundColor: 'rgba(41, 121, 255, 0.1)' },
  headerRight: { flexDirection: 'row' },
  rateLabel: {
    color: Colors.textSecondary,
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase'
  },
  rateValue: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: 'bold'
  },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 100 },
  balanceCard: { backgroundColor: Colors.primary, borderRadius: 24, padding: 24, marginTop: 10, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  balanceLabel: { color: '#004D27', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  balanceMain: { color: '#000000', fontSize: 36, fontWeight: 'bold' },
  balanceSub: { color: '#00331A', fontSize: 18, fontWeight: '500', marginTop: 4 },
  sectionHeader: { marginTop: 32, marginBottom: 16 },
  headerWithAction: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 32, marginBottom: 16 },
  sectionTitle: { color: Colors.text, fontSize: 18, fontWeight: '600' },
  addBtn: { padding: 4, backgroundColor: 'rgba(0, 230, 118, 0.1)', borderRadius: 8 },
  insightsContainer: { marginTop: 20 },
  insightCard: { backgroundColor: Colors.surface, padding: 16, borderRadius: 12, marginTop: 8, borderLeftWidth: 4, borderLeftColor: Colors.primary },
  insightDanger: { borderLeftColor: Colors.error },
  insightText: { color: Colors.text, fontSize: 14, lineHeight: 20 },
  
  // Charts elements
  chartContainer: { marginTop: 24 },
  chartCard: { backgroundColor: Colors.surface, padding: 20, borderRadius: 20, borderWidth: 1, borderColor: Colors.border },
  chartItem: { marginBottom: 16 },
  chartLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  chartCatName: { color: Colors.text, fontSize: 14, fontWeight: '500' },
  chartCatAmount: { color: Colors.textSecondary, fontSize: 13 },
  barBackground: { height: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 4 },
  chartPercent: { color: Colors.textSecondary, fontSize: 11, marginTop: 4, textAlign: 'right' },

  // Accounts elements
  emptyAccounts: { padding: 20, alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 1, borderColor: Colors.border },
  emptyAccountsText: { color: Colors.textSecondary, textAlign: 'center' },
  accountCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.surface, padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  accountName: { color: Colors.text, fontSize: 16, fontWeight: 'bold' },
  accountEquivalent: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  accountBalance: { color: Colors.primary, fontSize: 18, fontWeight: 'bold' },

  // Modal elements
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContainer: { backgroundColor: Colors.surface, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: Colors.border },
  modalTitle: { color: Colors.text, fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  input: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 16, color: Colors.text, fontSize: 16, marginBottom: 16 },
  currencyToggle: { flexDirection: 'row', marginBottom: 24 },
  currencyBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background },
  currencyBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  currencyText: { color: Colors.textSecondary, fontWeight: 'bold' },
  currencyTextActive: { color: '#000' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
  cancelBtn: { padding: 16, marginRight: 10 },
  cancelText: { color: Colors.textSecondary, fontSize: 16, fontWeight: 'bold' },
  saveBtn: { backgroundColor: Colors.primary, paddingVertical: 16, paddingHorizontal: 24, borderRadius: 12, flex: 1, alignItems: 'center' },
  deleteModalBtn: { padding: 12, marginRight: 8, backgroundColor: 'rgba(255, 82, 82, 0.1)', borderRadius: 12 },
  saveText: { color: '#000', fontSize: 16, fontWeight: 'bold' }
});
