import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { Colors } from '../theme/colors';
import { loginWithGoogle, auth } from '../services/firebase';
import { useStore } from '../store/useStore';
import { Ionicons } from '@expo/vector-icons';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { setUser } = useStore();
  const [loading, setLoading] = useState(false);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: '999195085839-a92o1sq6372q8ov86b5hsh76v885g1i4.apps.googleusercontent.com',
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      handleGoogleLogin(id_token);
    }
  }, [response]);

  const handleGoogleLogin = async (idToken) => {
    setLoading(true);
    try {
      await loginWithGoogle(idToken);
      // El observador en AppNavigator se encargará de setUser
    } catch (error) {
      console.error('Login Error:', error);
      alert('Error al iniciar sesión con Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
            <Ionicons name="rocket" size={60} color={Colors.primary} />
        </View>
        <Text style={styles.appName}>AhorrAI</Text>
        <Text style={styles.tagline}>Tu asistente financiero inteligente</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Comencemos</Text>
        <Text style={styles.cardSub}>Registra tus gastos por voz y sincroniza tus cuentas en la nube.</Text>
        
        <TouchableOpacity 
          style={styles.googleBtn} 
          onPress={() => promptAsync()}
          disabled={!request || loading}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <>
              <Ionicons name="logo-google" size={24} color="#000" style={{ marginRight: 10 }} />
              <Text style={styles.googleBtnText}>Continuar con Google</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Hecho para Venezuela 🇻🇪 con ❤️</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 24, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 60 },
  logoContainer: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(0, 230, 118, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  appName: { color: Colors.text, fontSize: 36, fontWeight: 'bold' },
  tagline: { color: Colors.textSecondary, fontSize: 16, marginTop: 4 },
  card: { backgroundColor: Colors.surface, borderRadius: 24, padding: 32, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', width: '100%' },
  cardTitle: { color: Colors.text, fontSize: 22, fontWeight: 'bold', marginBottom: 12 },
  cardSub: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  googleBtn: { backgroundColor: Colors.primary, flexDirection: 'row', width: '100%', height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  googleBtnText: { color: '#000', fontSize: 16, fontWeight: 'bold' },
  footer: { position: 'absolute', bottom: 40, left: 0, right: 0, alignItems: 'center' },
  footerText: { color: Colors.textSecondary, fontSize: 12, opacity: 0.5 }
});
