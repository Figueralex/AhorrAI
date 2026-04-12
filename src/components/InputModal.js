import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, ActivityIndicator, Animated, Easing, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useAudioRecorder, AudioModule, RecordingPresets, setAudioModeAsync } from 'expo-audio';
import { transcribeAudio } from '../services/ai';

export default function InputModal({ visible, onClose, onSubmit }) {
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const pulseAnim = useRef(new Animated.Value(0)).current;

  const startPulse = () => {
    pulseAnim.setValue(0);
    Animated.loop(
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 1500,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      })
    ).start();
  };

  const stopPulse = () => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(0);
  };

  const startRecording = async () => {
    try {
      const { granted } = await AudioModule.requestRecordingPermissionsAsync();
      if (!granted) {
        return Alert.alert('Permiso Denegado', 'AhorrAI necesita acceso al micrófono para el dictado.');
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      // IMPORTANT: prepareToRecordAsync must be called before record()
      await audioRecorder.prepareToRecordAsync(RecordingPresets.HIGH_QUALITY);
      await audioRecorder.record();

      setIsRecording(true);
      startPulse();
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'No se pudo iniciar la grabación.');
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);
    stopPulse();
    try {
      setIsProcessing(true);
      await audioRecorder.stop();
      const uri = audioRecorder.uri;

      if (!uri) throw new Error('No se obtuvo la URI del audio.');

      const transcription = await transcribeAudio(uri);
      
      if (transcription && transcription.startsWith('ERROR:')) {
        Alert.alert('Error de Transcripción', transcription);
      } else if (transcription) {
        setInputText(prev => prev ? `${prev} ${transcription}` : transcription);
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
      Alert.alert('Error', 'Falló al procesar el audio. Intenta de nuevo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProcess = async () => {
    if (!inputText.trim()) return;
    setIsProcessing(true);
    try {
      await onSubmit(inputText);
      setInputText('');
      onClose();
    } catch (err) {
      console.log('Error processing input', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView 
        style={styles.overlay} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
      >
        <View style={styles.modalContainer}>
          
          <View style={styles.dragHandle} />
          
          <Text style={styles.title}>Registrar Movimiento</Text>
          <Text style={styles.subtitle}>Escribe o deja presionado el micrófono para dictar tu gasto.</Text>

          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              placeholder="Ej: Gasté 35 dólares en comida..."
              placeholderTextColor={Colors.textSecondary}
              multiline
              autoFocus
              value={inputText}
              onChangeText={setInputText}
              editable={!isProcessing}
            />
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={isProcessing}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>

            <View style={styles.micContainer}>
              {isRecording && (
                <>
                  <Animated.View style={[styles.pulseWave, { 
                    transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.5] }) }],
                    opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }) 
                  }]} />
                  <Animated.View style={[styles.pulseWave, { 
                    transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.8, 2.5] }) }],
                    opacity: pulseAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.4, 0] }) 
                  }]} />
                </>
              )}
              
              <TouchableOpacity 
                style={[styles.micBtn, isRecording && styles.micBtnActive]} 
                onPress={isRecording ? stopRecording : startRecording}
                activeOpacity={0.8}
                disabled={isProcessing}
              >
                <Ionicons name={isRecording ? "stop" : "mic"} size={28} color={isRecording ? "#FFF" : Colors.primary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={[styles.submitBtn, (!inputText.trim() || isProcessing) && styles.submitBtnDisabled]} 
              onPress={handleProcess}
              disabled={!inputText.trim() || isProcessing}
            >
              {isProcessing ? <ActivityIndicator color="#000" /> : <Text style={styles.submitText}>Ingresar</Text>}
            </TouchableOpacity>
          </View>
          
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: Colors.surface, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40, minHeight: 400 },
  dragHandle: { width: 40, height: 5, borderRadius: 3, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 20 },
  title: { color: Colors.text, fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { color: Colors.textSecondary, fontSize: 14, marginBottom: 24 },
  inputWrapper: { backgroundColor: Colors.background, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, minHeight: 120, padding: 16, marginBottom: 24 },
  textInput: { color: Colors.text, fontSize: 18, flex: 1, textAlignVertical: 'top' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 16 },
  cancelText: { color: Colors.textSecondary, fontSize: 16, fontWeight: '600' },
  micContainer: { width: 60, height: 60, justifyContent: 'center', alignItems: 'center' },
  micBtn: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(0, 230, 118, 0.1)', justifyContent: 'center', alignItems: 'center', zIndex: 2 },
  micBtnActive: { backgroundColor: Colors.primary },
  pulseWave: { position: 'absolute', width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.primary, zIndex: 1 },
  submitBtn: { backgroundColor: Colors.primary, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 20, alignItems: 'center', justifyContent: 'center', minWidth: 100 },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { color: '#000', fontSize: 16, fontWeight: 'bold' }
});
