import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../theme/colors';
import { fetchAllTransactions, deleteTransaction, updateTransaction, fetchAccounts } from '../services/db';
import { fetchDailyExchangeRate } from '../services/currency';
import { formatCurrency } from '../utils/format';
import { Ionicons } from '@expo/vector-icons';

export default function TransactionsScreen() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Chart State
  const [categorySpending, setCategorySpending] = useState([]);
  const [showAllCategories, setShowAllCategories] = useState(false);

  // Edit State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editAccount, setEditAccount] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [txData, accData, rate] = await Promise.all([
        fetchAllTransactions(),
        fetchAccounts(),
        fetchDailyExchangeRate()
      ]);
      
      setTransactions(txData);
      setAccounts(accData);

      // --- Calcular Distribución de Gastos ---
      const expenseTxs = txData.filter(t => t.type === 'expense');
      const catMap = {};
      let totalExpUsd = 0;

      expenseTxs.forEach(t => {
        const cat = t.category || 'General';
        const amtUsd = t.amount_usd || (t.amount_bs / (rate || 36));
        catMap[cat] = (catMap[cat] || 0) + amtUsd;
        totalExpUsd += amtUsd;
      });

      const catArray = Object.keys(catMap).map(cat => ({
        name: cat,
        amount: catMap[cat],
        percentage: totalExpUsd > 0 ? (catMap[cat] / totalExpUsd) * 100 : 0
      })).sort((a, b) => b.amount - a.amount);

      setCategorySpending(catArray);
    } catch (e) {
      console.error("Error loading Transactions Data:", e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const handleLongPress = (tx) => {
    setEditingTx(tx);
    setEditAmount(tx.originalAmount?.toString() || '');
    setEditCategory(tx.category || '');
    setEditAccount(tx.account || '');
    setEditModalVisible(true);
  };

  const handleDelete = () => {
    Alert.alert(
      'Eliminar Movimiento',
      '¿Estás seguro de que quieres borrar este registro? Esto no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive', 
          onPress: async () => {
            await deleteTransaction(editingTx.id);
            setEditModalVisible(false);
            loadData();
          } 
        }
      ]
    );
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      const newAmount = parseFloat(editAmount);
      const isOriginalBs = editingTx.originalCurrency === 'Bs';
      
      // Calculate rate based on the existing transaction amounts to maintain historical rate
      let rate = 36;
      if (editingTx.amount_usd && editingTx.amount_usd > 0) {
         rate = editingTx.amount_bs / editingTx.amount_usd;
      }

      let newAmountUsd = 0;
      let newAmountBs = 0;
      
      if (isOriginalBs) {
         newAmountBs = newAmount;
         newAmountUsd = newAmount / rate;
      } else {
         newAmountUsd = newAmount;
         newAmountBs = newAmount * rate;
      }

      const updated = {
        originalAmount: newAmount,
        amount_bs: newAmountBs,
        amount_usd: newAmountUsd,
        category: editCategory,
        account: editAccount,
      };

      if (editingTx.type === 'transfer') {
        if (editingTx.fromCurrency === 'Bs') updated.fromAmount = newAmountBs;
        else if (editingTx.fromCurrency === 'USD' || editingTx.fromCurrency === 'USDT') updated.fromAmount = newAmountUsd;
        else updated.fromAmount = newAmount;

        if (editingTx.toCurrency === 'Bs') updated.toAmount = newAmountBs;
        else if (editingTx.toCurrency === 'USD' || editingTx.toCurrency === 'USDT') updated.toAmount = newAmountUsd;
        else updated.toAmount = newAmount;
      }
      
      await updateTransaction(editingTx.id, updated);
      setEditModalVisible(false);
      loadData();
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar el cambio.');
    } finally {
      setSaving(false);
    }
  };

  const renderHeader = () => {
    if (categorySpending.length === 0) return null;

    return (
      <View style={styles.chartContainer}>
        <View style={styles.headerWithAction}>
          <Text style={styles.sectionTitle}>Distribución de Gastos ($)</Text>
          {categorySpending.length > 5 && (
            <TouchableOpacity onPress={() => setShowAllCategories(!showAllCategories)}>
              <Ionicons 
                name={showAllCategories ? "chevron-up" : "chevron-down"} 
                size={20} 
                color={Colors.primary} 
              />
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.chartCard}>
          {(showAllCategories ? categorySpending : categorySpending.slice(0, 5)).map((item, i) => (
            <View key={item.name + i} style={styles.chartItem}>
              <View style={styles.chartLabels}>
                <Text style={styles.chartCatName}>{item.name}</Text>
                <Text style={styles.chartCatAmount}>$ {formatCurrency(item.amount)}</Text>
              </View>
              <View style={styles.barBackground}>
                <View style={[styles.barFill, { width: `${item.percentage}%` }]} />
              </View>
              <Text style={styles.chartPercent}>{item.percentage.toFixed(0)}%</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 32, marginBottom: 16 }]}>Historial</Text>
      </View>
    );
  };

  const renderItem = ({ item }) => {
    const isIncome = item.type === 'income';
    const isTransfer = item.type === 'transfer';
    const amountColor = isTransfer ? Colors.secondary : (isIncome ? Colors.income : Colors.expense);
    
    const isOriginalBs = item.originalCurrency === 'Bs';
    const mainAmount = item.originalAmount || (isOriginalBs ? item.amount_bs : item.amount_usd);
    const mainCurrency = item.originalCurrency || (isOriginalBs ? 'Bs' : '$');
    
    const subAmount = isOriginalBs ? item.amount_usd : item.amount_bs;
    const subCurrency = isOriginalBs ? '$' : 'Bs';

    return (
      <TouchableOpacity 
        style={styles.transactionCard}
        onLongPress={() => handleLongPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.categoryBadge, isTransfer && { backgroundColor: Colors.secondary + '20', color: Colors.secondary }]}>
            {isTransfer ? 'Transferencia' : (item.category || 'General')}
          </Text>
          <Text style={styles.dateLabel}>
             {new Date(item.date).toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.cardBody}>
           <View style={{ flex: 1 }}>
             <Text style={styles.accountLabel}>
                {isTransfer ? `${item.account} ➔ ${item.toAccount || '?'}` : item.account}
             </Text>
             {item.payment_method === 'pago móvil' && (
                <Text style={styles.methodLabel}>Pago Móvil</Text>
             )}
           </View>
           
           <View style={styles.amountContainer}>
             <Text style={[styles.amountMain, { color: amountColor }]}>
               {isTransfer ? '⇄' : (isIncome ? '+' : '-')} {isTransfer && (item.fromAmount !== null) ? `${item.fromCurrency === 'Bs' ? 'Bs' : '$'} ${formatCurrency(item.fromAmount)}` : `${mainCurrency === '$' ? '$ ' : mainCurrency + ' '} ${formatCurrency(mainAmount)}`}
             </Text>
             <Text style={styles.amountSub}>
                {isTransfer && (item.toAmount !== null) 
                  ? `+ ${item.toCurrency === 'Bs' ? 'Bs' : '$'} ${formatCurrency(item.toAmount)}` 
                  : `${subCurrency === '$' ? '$ ' : 'Bs '} ${formatCurrency(subAmount)}`}
             </Text>
           </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tus Movimientos</Text>
        <Text style={styles.subtitle}>Análisis y control de tus gastos</Text>
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadData} tintColor={Colors.primary} />
        }
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No hay transacciones por ahora.</Text>
            </View>
          )
        }
      />

      <Modal visible={editModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
             <Text style={styles.modalTitle}>Editar Movimiento</Text>
             
             <Text style={styles.label}>Monto ({editingTx?.originalCurrency})</Text>
             <TextInput 
               style={styles.input}
               keyboardType="numeric"
               value={editAmount}
               onChangeText={setEditAmount}
             />

             <Text style={styles.label}>Categoría</Text>
             <TextInput 
               style={styles.input}
               value={editCategory}
               onChangeText={setEditCategory}
             />

             <Text style={styles.label}>Cuenta</Text>
             <TextInput 
               style={styles.input}
               value={editAccount}
               onChangeText={setEditAccount}
             />

             <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditModalVisible(false)}>
                  <Text style={styles.cancelText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
                  <Ionicons name="trash-outline" size={24} color={Colors.error} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveEdit} disabled={saving}>
                  {saving ? <ActivityIndicator color="#000" /> : <Text style={styles.saveText}>Guardar</Text>}
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
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { color: Colors.text, fontSize: 28, fontWeight: 'bold' },
  subtitle: { color: Colors.textSecondary, fontSize: 13, marginTop: 4 },
  listContainer: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 100 },
  
  // Charts logic in header
  chartContainer: { marginBottom: 10 },
  headerWithAction: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { color: Colors.text, fontSize: 18, fontWeight: '600' },
  chartCard: { backgroundColor: Colors.surface, padding: 20, borderRadius: 20, borderWidth: 1, borderColor: Colors.border },
  chartItem: { marginBottom: 16 },
  chartLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  chartCatName: { color: Colors.text, fontSize: 14, fontWeight: '500' },
  chartCatAmount: { color: Colors.textSecondary, fontSize: 13 },
  barBackground: { height: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 4 },
  chartPercent: { color: Colors.textSecondary, fontSize: 11, marginTop: 4, textAlign: 'right' },

  transactionCard: { backgroundColor: Colors.surface, padding: 16, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  categoryBadge: { backgroundColor: Colors.background, color: Colors.primary, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, fontSize: 12, fontWeight: 'bold', overflow: 'hidden' },
  dateLabel: { color: Colors.textSecondary, fontSize: 12 },
  cardBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  accountLabel: { color: Colors.text, fontSize: 16, fontWeight: '600' },
  methodLabel: { color: Colors.secondary, fontSize: 12, marginTop: 4 },
  amountContainer: { alignItems: 'flex-end' },
  amountMain: { fontSize: 20, fontWeight: 'bold' },
  amountSub: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { color: Colors.textSecondary, fontSize: 16 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  modalContainer: { backgroundColor: Colors.surface, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: Colors.border },
  modalTitle: { color: Colors.text, fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  label: { color: Colors.textSecondary, fontSize: 14, marginBottom: 8, marginLeft: 4 },
  input: { backgroundColor: Colors.background, borderRadius: 12, padding: 16, color: Colors.text, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  cancelBtn: { padding: 12 },
  cancelText: { color: Colors.textSecondary, fontSize: 16, fontWeight: 'bold' },
  deleteBtn: { padding: 12, backgroundColor: 'rgba(255, 82, 82, 0.1)', borderRadius: 12 },
  saveBtn: { backgroundColor: Colors.primary, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, minWidth: 100, alignItems: 'center' },
  saveText: { color: '#000', fontSize: 16, fontWeight: 'bold' }
});
