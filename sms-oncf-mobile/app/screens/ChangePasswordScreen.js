import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../services/authService';

export default function ChangePasswordScreen({ navigation }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      await axios.post(
        `${API_URL}/change-password`,
        { newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');

      if (Platform.OS === 'web') {
        window.alert('Mot de passe changé avec succès ! Veuillez vous reconnecter.');
        navigation.replace('Login');
      } else {
        Alert.alert(
          'Succès',
          'Mot de passe changé avec succès ! Veuillez vous reconnecter.',
          [{ text: 'OK', onPress: () => navigation.replace('Login') }]
        );
      }
    } catch {
      Alert.alert('Erreur', 'Impossible de changer le mot de passe');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🔐</Text>
        </View>
        <Text style={styles.title}>Première connexion</Text>
        <Text style={styles.subtitle}>
          Pour votre sécurité, veuillez changer votre mot de passe
        </Text>

        {/* Formulaire */}
        <View style={styles.form}>
          <Text style={styles.label}>Nouveau mot de passe</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Min. 6 caractères"
              placeholderTextColor="#607D8B"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
            >
              <Text>{showPassword ? '🙈' : '👁'}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Confirmer le mot de passe</Text>
          <TextInput
            style={styles.input}
            placeholder="Répétez le mot de passe"
            placeholderTextColor="#607D8B"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showPassword}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleChangePassword}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#0A1628" />
              : <Text style={styles.buttonText}>Confirmer le nouveau mot de passe</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A1628' },
  container: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },

  iconContainer: {
    alignItems: 'center', marginBottom: 16,
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#1E3A5F',
    borderWidth: 2, borderColor: '#C9A84C',
    alignSelf: 'center', justifyContent: 'center',
  },
  icon: { fontSize: 36 },
  title: {
    color: '#FFFFFF', fontSize: 24,
    fontWeight: 'bold', textAlign: 'center', marginBottom: 8,
  },
  subtitle: {
    color: '#607D8B', fontSize: 14,
    textAlign: 'center', marginBottom: 32, lineHeight: 20,
  },

  form: {
    backgroundColor: '#0F2137',
    borderRadius: 16, padding: 24,
  },
  label: { color: '#B0BEC5', fontSize: 13, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#1A2F4A', borderWidth: 1,
    borderColor: '#2A4060', borderRadius: 10,
    padding: 14, color: '#FFFFFF', fontSize: 15,
  },
  passwordContainer: {
    flexDirection: 'row',
    backgroundColor: '#1A2F4A',
    borderWidth: 1, borderColor: '#2A4060',
    borderRadius: 10, alignItems: 'center',
  },
  passwordInput: {
    flex: 1, padding: 14,
    color: '#FFFFFF', fontSize: 15,
  },
  eyeButton: { padding: 14 },

  button: {
    backgroundColor: '#C9A84C',
    borderRadius: 10, padding: 16,
    alignItems: 'center', marginTop: 24,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    color: '#0A1628', fontSize: 15,
    fontWeight: 'bold',
  },
});