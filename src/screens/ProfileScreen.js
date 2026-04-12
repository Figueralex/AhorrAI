import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import { Colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { auth } from '../services/firebase';
import { signOut } from 'firebase/auth';

export default function ProfileScreen({ navigation }) {
  const { user, clearStore } = useStore();

  const handleLogout = async () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que quieres salir?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Sí, Salir', 
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
              clearStore();
              navigation.navigate('Home'); // AppNavigator se encargará de mostrar Login
            } catch (error) {
              Alert.alert('Error', 'No pudimos cerrar sesión.');
            }
          } 
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Mi Cuenta</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.profileCard}>
          <Image 
            source={{ uri: user?.photoURL || 'https://api.dicebear.com/9.x/avataaars/png?seed=AhorrAI' }} 
            style={styles.avatar} 
          />
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.displayName || 'Usuario AhorrAI'}</Text>
            <Text style={styles.userEmail}>{user?.email || 'Sin correo'}</Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
            <View style={styles.statBox}>
                <Ionicons name="cloud-done-outline" size={32} color={Colors.primary} />
                <Text style={styles.statLabel}>Sincronizado</Text>
            </View>
            <View style={styles.statBox}>
                <Ionicons name="shield-checkmark-outline" size={32} color={Colors.secondary} />
                <Text style={styles.statLabel}>Seguro</Text>
            </View>
        </View>

        <View style={styles.menuContainer}>
            <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('AhorrAI v1.0', 'Todo tu poder financiero en una app.')}>
                <Ionicons name="information-circle-outline" size={24} color={Colors.textSecondary} />
                <Text style={styles.menuText}>Acerca de AhorrAI</Text>
                <Ionicons name="chevron-forward" size={20} color={Colors.border} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={24} color={Colors.error} />
              <Text style={styles.logoutText}>Cerrar Sesión</Text>
            </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.footerText}>ID: {user?.uid?.substring(0, 8)}...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20 },
  backButton: { marginRight: 16, padding: 8, marginLeft: -8 },
  title: { color: Colors.text, fontSize: 24, fontWeight: 'bold' },
  body: { flex: 1, paddingHorizontal: 24, paddingTop: 10 },
  profileCard: { backgroundColor: Colors.surface, borderRadius: 24, padding: 24, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.border, marginBottom: 24 },
  avatar: { width: 70, height: 70, borderRadius: 35, backgroundColor: Colors.background },
  userInfo: { marginLeft: 16 },
  userName: { color: Colors.text, fontSize: 20, fontWeight: 'bold' },
  userEmail: { color: Colors.textSecondary, fontSize: 14, marginTop: 4 },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
  statBox: { backgroundColor: Colors.surface, flex: 0.48, borderRadius: 20, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  statLabel: { color: Colors.textSecondary, fontSize: 13, marginTop: 8, fontWeight: '600' },
  menuContainer: { marginTop: 10 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  menuText: { flex: 1, color: Colors.text, fontSize: 16, marginLeft: 12 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 20, marginTop: 20 },
  logoutText: { color: Colors.error, fontSize: 16, fontWeight: 'bold', marginLeft: 12 },
  footerText: { textAlign: 'center', color: Colors.textSecondary, fontSize: 10, marginBottom: 40, opacity: 0.3 }
});
