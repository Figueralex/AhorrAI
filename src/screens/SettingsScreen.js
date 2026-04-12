import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView } from 'react-native';
import { Colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';

const SettingOption = ({ icon, title, onPress }) => (
  <TouchableOpacity style={styles.optionContainer} onPress={onPress}>
    <View style={styles.optionLeft}>
      <View style={styles.iconWrapper}>
        <Ionicons name={icon} size={22} color={Colors.primary} />
      </View>
      <Text style={styles.optionText}>{title}</Text>
    </View>
    <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
  </TouchableOpacity>
);

export default function SettingsScreen({ navigation }) {
  const { user } = useStore();

  const renderProfileHeader = () => {
    if (!user) {
      return (
        <View style={styles.profileSection}>
          <Image 
            source={{ uri: 'https://api.dicebear.com/9.x/bottts/png?seed=AnonUser&backgroundColor=1E1E1E' }} 
            style={styles.profilePicture} 
          />
          <Text style={styles.userName}>Invitado</Text>
          <Text style={styles.userEmail}>Inicia sesión para sincronizar datos</Text>
        </View>
      );
    }

    return (
      <View style={styles.profileSection}>
        <Image 
          source={{ uri: user.photoURL || `https://api.dicebear.com/9.x/bottts/png?seed=${user.uid}&backgroundColor=1E1E1E` }} 
          style={styles.profilePicture} 
        />
        <Text style={styles.userName}>{user.displayName}</Text>
        <Text style={styles.userEmail}>{user.email}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Configuración</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {renderProfileHeader()}

        <View style={styles.settingsGroup}>
          <SettingOption 
            icon="person-outline" 
            title="Perfil" 
            onPress={() => navigation.navigate('Profile')}
          />
          <SettingOption icon="star-outline" title="Planes" />
          <SettingOption icon="language-outline" title="Idioma" />
          <SettingOption icon="shield-checkmark-outline" title="Seguridad" />
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  title: {
    color: Colors.text,
    fontSize: 28,
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingBottom: 120, // space for tab bar
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 20,
  },
  profilePicture: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: Colors.primary,
    marginBottom: 16,
  },
  userName: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: 'bold',
  },
  userEmail: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },
  settingsGroup: {
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    borderRadius: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  optionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 230, 118, 0.1)', // Light primary color background
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  optionText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '500',
  }
});
