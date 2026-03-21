import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, ScrollView,
  StatusBar, SafeAreaView
} from 'react-native';
import { SafeAreaView as SafeAreaViewContext } from 'react-native-safe-area-context';
import axios from 'axios';
import { API_URL } from '../services/authService';

const ROLES = [
  { value: 'AGENT', label: 'Agent', icon: '👷', desc: 'Saisie terrain' },
  { value: 'INSPECTEUR', label: 'Inspecteur', icon: '🔍', desc: 'Contrôle & audit' },
  { value: 'MANAGER', label: 'Manager', icon: '📊', desc: 'Pilotage & rapports' },
];

export default function RegisterScreen({ navigation }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('AGENT');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleRegister = async () => {
    setError(null);

    if (!fullName || !email || !password || !confirmPassword) {
      setError('Veuillez remplir tous les champs');
      return;
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/register`, {
        fullName, email, password, role: selectedRole
      });
      setSuccess(true);
      setTimeout(() => navigation.replace('Login'), 2000);
    } catch (err) {
      setError(err.response?.data || 'Email déjà utilisé ou erreur serveur');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successIcon}>✅</Text>
        <Text style={styles.successTitle}>Compte créé !</Text>
        <Text style={styles.successText}>Redirection vers la connexion...</Text>
      </View>
    );
  }

  return (
    <SafeAreaViewContext style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0A1628" />
      <ScrollView style={styles.container}   showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.logoText}>🚂</Text>
          <Text style={styles.title}>Créer un compte</Text>
          <Text style={styles.subtitle}>SMS ONCF · DRIC</Text>
        </View>

        {/* Formulaire */}
        <View style={styles.form}>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠ {error}</Text>
            </View>
          )}

          {/* Nom complet */}
          <Text style={styles.label}>Nom complet</Text>
          <TextInput
            style={styles.input}
            placeholder="Prénom NOM"
            placeholderTextColor="#8896A5"
            value={fullName}
            onChangeText={setFullName}
          />

          {/* Email */}
          <Text style={styles.label}>Email professionnel</Text>
          <TextInput
            style={styles.input}
            placeholder="prenom.nom@oncf.ma"
            placeholderTextColor="#8896A5"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          {/* Mot de passe */}
          <Text style={styles.label}>Mot de passe</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Min. 6 caractères"
              placeholderTextColor="#8896A5"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
            >
              <Text>{showPassword ? '🙈' : '👁'}</Text>
            </TouchableOpacity>
          </View>

          {/* Confirmer mot de passe */}
          <Text style={styles.label}>Confirmer le mot de passe</Text>
          <TextInput
            style={styles.input}
            placeholder="Répétez le mot de passe"
            placeholderTextColor="#8896A5"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showPassword}
          />

          {/* Rôle */}
          <Text style={styles.label}>Votre rôle</Text>
          <View style={styles.rolesContainer}>
            {ROLES.map((role) => (
              <TouchableOpacity
                key={role.value}
                style={[
                  styles.roleCard,
                  selectedRole === role.value && styles.roleCardSelected
                ]}
                onPress={() => setSelectedRole(role.value)}
              >
                <Text style={styles.roleIcon}>{role.icon}</Text>
                <Text style={[
                  styles.roleLabel,
                  selectedRole === role.value && styles.roleLabelSelected
                ]}>
                  {role.label}
                </Text>
                <Text style={styles.roleDesc}>{role.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Bouton */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#0A1628" />
            ) : (
              <Text style={styles.buttonText}>Créer mon compte</Text>
            )}
          </TouchableOpacity>

          {/* Lien login */}
          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => navigation.replace('Login')}
          >
            <Text style={styles.loginLinkText}>
              Déjà un compte ? <Text style={styles.loginLinkBold}>Se connecter</Text>
            </Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </SafeAreaViewContext>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A1628' },
  container: { flex: 1, backgroundColor: '#0A1628' },

  successContainer: {
    flex: 1, backgroundColor: '#0A1628',
    alignItems: 'center', justifyContent: 'center',
  },
  successIcon: { fontSize: 64, marginBottom: 16 },
  successTitle: { color: '#27AE60', fontSize: 24, fontWeight: 'bold' },
  successText: { color: '#607D8B', marginTop: 8 },

  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 24,
    backgroundColor: '#0F2137',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    marginBottom: 24,
  },
  backBtn: { alignSelf: 'flex-start', paddingLeft: 20, marginBottom: 16 },
  backText: { color: '#C9A84C', fontSize: 14 },
  logoText: { fontSize: 40, marginBottom: 8 },
  title: { color: '#FFFFFF', fontSize: 22, fontWeight: 'bold' },
  subtitle: { color: '#607D8B', fontSize: 12, marginTop: 4 },

  form: { paddingHorizontal: 24, paddingBottom: 40 },

  errorBox: {
    backgroundColor: '#2D1515',
    borderLeftWidth: 3,
    borderLeftColor: '#E53935',
    padding: 12, borderRadius: 8, marginBottom: 16,
  },
  errorText: { color: '#EF9A9A', fontSize: 13 },

  label: { color: '#B0BEC5', fontSize: 13, marginBottom: 6, marginTop: 14 },

  input: {
    backgroundColor: '#1A2F4A',
    borderWidth: 1, borderColor: '#2A4060',
    borderRadius: 10, padding: 14,
    color: '#FFFFFF', fontSize: 15,
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

  rolesContainer: {
    flexDirection: 'row', gap: 8, marginTop: 4,
  },
  roleCard: {
    flex: 1, backgroundColor: '#1A2F4A',
    borderWidth: 1, borderColor: '#2A4060',
    borderRadius: 10, padding: 12, alignItems: 'center',
  },
  roleCardSelected: {
    borderColor: '#C9A84C',
    backgroundColor: '#1E3A2F',
  },
  roleIcon: { fontSize: 22, marginBottom: 4 },
  roleLabel: { color: '#B0BEC5', fontSize: 12, fontWeight: 'bold' },
  roleLabelSelected: { color: '#C9A84C' },
  roleDesc: { color: '#607D8B', fontSize: 10, marginTop: 2, textAlign: 'center' },

  button: {
    backgroundColor: '#C9A84C',
    borderRadius: 10, padding: 16,
    alignItems: 'center', marginTop: 28,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    color: '#0A1628', fontSize: 16,
    fontWeight: 'bold', letterSpacing: 1,
  },

  loginLink: { alignItems: 'center', marginTop: 20 },
  loginLinkText: { color: '#607D8B', fontSize: 14 },
  loginLinkBold: { color: '#C9A84C', fontWeight: 'bold' },
});