import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import HomeScreen from '../screens/HomeScreen';
import TransactionsScreen from '../screens/TransactionsScreen';
import ChallengesScreen from '../screens/ChallengesScreen';
import SettingsStack from './SettingsStack';
import { Colors } from '../theme/colors';
import InputModal from '../components/InputModal';
import { Ionicons } from '@expo/vector-icons';
import { parseTransactionText } from '../services/ai';
import { processAndSaveTransactionFromAI, fetchAccounts, initializeDefaultAccounts, downloadBackupFromFirebase } from '../services/db';
import { fetchDailyExchangeRate } from '../services/currency';
import { useStore } from '../store/useStore';

import LoginScreen from '../screens/LoginScreen';
import { auth } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const Tab = createBottomTabNavigator();

const CustomTabBarButton = ({ children, onPress }) => (
  <TouchableOpacity
    style={{
      top: -20,
      justifyContent: 'center',
      alignItems: 'center',
      ...styles.shadow
    }}
    onPress={onPress}
  >
    <View style={styles.fabBtn}>
      {children}
    </View>
  </TouchableOpacity>
);

export default function AppNavigator() {
  const { user, setUser } = useStore();
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser({ 
          uid: firebaseUser.uid, 
          displayName: firebaseUser.displayName, 
          email: firebaseUser.email, 
          photoURL: firebaseUser.photoURL 
        });
        // Al iniciar sesión, inicializar/sincronizar DB
        try {
          await downloadBackupFromFirebase(); // Trae datos existentes
          await initializeDefaultAccounts(); // Por si es cuenta nueva
        } catch (e) {
          console.error("Error inicializando DB:", e);
        }
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, [setUser]);

  const handleTransactionSubmit = async (text) => {
    try {
      const accounts = await fetchAccounts();
      const accountNames = accounts.map(a => a.name);
      const parsedData = await parseTransactionText(text, accountNames);
      if (!parsedData) throw new Error('No se pudo parsear la información.');
      const exchangeRate = await fetchDailyExchangeRate();
      await processAndSaveTransactionFromAI(parsedData, exchangeRate);
      alert('¡Transacción registrada y categorizada con éxito!');
    } catch (e) {
      console.error('Error en handleTransactionSubmit:', e);
      alert(`Error: ${e.message || 'No pudimos interpretar el mensaje.'}`);
    }
  };

  const MyTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: Colors.background,
      card: Colors.surface,
      border: Colors.border,
    },
  };

  return (
    <NavigationContainer theme={MyTheme}>
      {!user ? (
        <LoginScreen />
      ) : (
        <>
          <Tab.Navigator
            screenOptions={({ route }) => ({
              headerShown: false,
              tabBarShowLabel: false,
              tabBarIcon: ({ focused, color, size }) => {
                let iconName;
                if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
                else if (route.name === 'Transactions') iconName = focused ? 'bar-chart' : 'bar-chart-outline';
                else if (route.name === 'Challenges') iconName = focused ? 'medal' : 'medal-outline';
                else if (route.name === 'Settings') iconName = focused ? 'settings' : 'settings-outline';

                if (!iconName) return null;
                return <Ionicons name={iconName} size={28} color={focused ? Colors.primary : Colors.textSecondary} />;
              },
              tabBarStyle: {
                position: 'absolute',
                bottom: 25,
                left: 20,
                right: 20,
                elevation: 0,
                backgroundColor: Colors.surface,
                borderRadius: 15,
                height: 70,
                borderTopWidth: 0,
                ...styles.shadow
              }
            })}
          >
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="Transactions" component={TransactionsScreen} />

            <Tab.Screen
              name="VoiceInput"
              component={HomeScreen}
              options={{
                tabBarIcon: ({ focused }) => (
                  <Ionicons name="mic" size={32} color="#000" />
                ),
                tabBarButton: (props) => (
                  <CustomTabBarButton {...props} />
                )
              }}
              listeners={({ navigation }) => ({
                tabPress: e => {
                  e.preventDefault();
                  setModalVisible(true);
                }
              })}
            />

            <Tab.Screen name="Challenges" component={ChallengesScreen} />
            <Tab.Screen name="Settings" component={SettingsStack} />
          </Tab.Navigator>

          <InputModal
            visible={modalVisible}
            onClose={() => setModalVisible(false)}
            onSubmit={handleTransactionSubmit}
          />
        </>
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 3.5,
    elevation: 5
  },
  fabBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
