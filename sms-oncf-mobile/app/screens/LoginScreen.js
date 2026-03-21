import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, Image, StatusBar
} from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, loading, error } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) return;
    const result = await login(email, password);
    if (result.success) {
      if (result.firstLogin) {
        navigation.replace('ChangePassword');
      } else {
        navigation.replace('Dashboard');
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0A1628" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>🚂</Text>
        </View>
        <Text style={styles.title}>ONCF</Text>
        <Text style={styles.subtitle}>Système de Management de la Sécurité</Text>
        <Text style={styles.dric}>DRIC — Direction Régionale Infrastructure Centre</Text>
      </View>

      {/* Formulaire */}
      <View style={styles.form}>
        <Text style={styles.formTitle}>Connexion</Text>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠ {error}</Text>
          </View>
        )}

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="votre@email.ma"
          placeholderTextColor="#8896A5"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Mot de passe</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="••••••••"
            placeholderTextColor="#8896A5"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeButton}
          >
            <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Se connecter</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.registerLink}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={styles.registerLinkText}>
            Pas de compte ? <Text style={styles.registerLinkBold}>Créer un compte</Text>
          </Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>SMS ONCF · Confidentiel · Usage interne</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1628',
  },
  header: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1E3A5F',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#C9A84C',
  },
  logoText: {
    fontSize: 36,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#C9A84C',
    letterSpacing: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#B0BEC5',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  dric: {
    fontSize: 11,
    color: '#607D8B',
    marginTop: 4,
    textAlign: 'center',
  },
  form: {
    backgroundColor: '#0F2137',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 40,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 24,
  },
  errorBox: {
    backgroundColor: '#2D1515',
    borderLeftWidth: 3,
    borderLeftColor: '#E53935',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#EF9A9A',
    fontSize: 13,
  },
  label: {
    color: '#B0BEC5',
    fontSize: 13,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#1A2F4A',
    borderWidth: 1,
    borderColor: '#2A4060',
    borderRadius: 10,
    padding: 14,
    color: '#FFFFFF',
    fontSize: 15,
  },
  passwordContainer: {
    flexDirection: 'row',
    backgroundColor: '#1A2F4A',
    borderWidth: 1,
    borderColor: '#2A4060',
    borderRadius: 10,
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    padding: 14,
    color: '#FFFFFF',
    fontSize: 15,
  },
  eyeButton: {
    padding: 14,
  },
  eyeText: {
    fontSize: 18,
  },
  button: {
    backgroundColor: '#C9A84C',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 28,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#0A1628',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
  footerText: {
    color: '#37474F',
    fontSize: 11,
  },
  registerLink: { alignItems: 'center', marginTop: 16 },
  registerLinkText: { color: '#607D8B', fontSize: 14 },
  registerLinkBold: { color: '#C9A84C', fontWeight: 'bold' },
});