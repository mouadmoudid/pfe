import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, ScrollView,
  StatusBar, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { API_URL } from '../services/authService';
import DatePickerInput from '../components/DatePickerInput';

const ENTITES_PAR_ROLE = {
  CET:   ['CAMI'],
  CSPR:  ['CT Voie', 'CT CSS'],
  CGPX:  ['CDT 101V', 'CDT 102V', 'CDT OA OH OT', 'CDT 101LC', 'CDT 101SST'],
  AGENT: ['CDT 101V', 'CDT 102V', 'CDT OA OH OT', 'CDT 101LC', 'CDT 101SST'],
};

const ROLES = [
  { value: 'AGENT', label: 'Agent', icon: '👷', desc: 'Saisie terrain' },
  { value: 'CGPX', label: 'CGPX', icon: '👨‍💼', desc: 'KN1' },
  { value: 'CSPR', label: 'CSPR', icon: '👨‍💼', desc: 'KN2' },
  { value: 'CET', label: 'CET', icon: '👨‍💼', desc: 'KN3' },
];

export default function RegisterScreen({ navigation }) {
  // Champs identité
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [dateNaissance, setDateNaissance] = useState('');
  const [email, setEmail] = useState('');
  const [matricule, setMatricule] = useState('');

  // Champs poste
  const [poste, setPoste] = useState('');
  const [fonctionAssuree, setFonctionAssuree] = useState('');
  const [dateFonction, setDateFonction] = useState('');
  const [entite, setEntite] = useState('');
  const [siteUp, setSiteUp] = useState('');
  const [residence, setResidence] = useState('');
  const [telephone, setTelephone] = useState('');

  // Sécurité
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('AGENT');
  const [showPassword, setShowPassword] = useState(false);

  const [showEntiteDropdown, setShowEntiteDropdown] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleRegister = async () => {
    setError(null);

    if (!nom || !prenom || !email || !password || !confirmPassword) {
      setError('Veuillez remplir tous les champs obligatoires (*)');
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
        fullName: `${nom} ${prenom}`,
        prenom,
        email,
        password,
        role: selectedRole,
        matricule,
        poste,
        fonctionAssuree,
        dateFonction,
        entite,
        siteUp,
        residence,
        telephone,
        dateNaissance,
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

  const Wrapper = Platform.OS === 'web' ? View : SafeAreaView;
  const Scroller = Platform.OS === 'web' ? View : ScrollView;

  return (
    <Wrapper style={Platform.OS === 'web' ? styles.webSafe : styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0A1628" />
      <Scroller style={Platform.OS === 'web' ? styles.webScroller : styles.container}
        {...(Platform.OS !== 'web' && { showsVerticalScrollIndicator: false })}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.logoText}>🚂</Text>
          <Text style={styles.title}>Créer un compte</Text>
          <Text style={styles.subtitle}>SMS ONCF · DRIC</Text>
        </View>

        <View style={styles.form}>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠ {error}</Text>
            </View>
          )}

          {/* ===== IDENTITÉ ===== */}
          <View style={styles.sectionBox}>
            <Text style={styles.sectionTitle}>👤 Identité</Text>

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.label}>Nom *</Text>
                <TextInput style={styles.input}
                  placeholder="NOM" placeholderTextColor="#607D8B"
                  value={nom} onChangeText={setNom}
                  autoCapitalize="characters"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Prénom *</Text>
                <TextInput style={styles.input}
                  placeholder="Prénom" placeholderTextColor="#607D8B"
                  value={prenom} onChangeText={setPrenom}
                />
              </View>
            </View>

            <Text style={styles.label}>Date de naissance</Text>
            <DatePickerInput
              value={dateNaissance}
              onChange={setDateNaissance}
              minDate={null}
              placeholder="Sélectionner une date"
              inputStyle={styles.input} />

            <Text style={styles.label}>Matricule</Text>
            <TextInput style={styles.input}
              placeholder="Ex: 43370N" placeholderTextColor="#607D8B"
              value={matricule} onChangeText={setMatricule}
              autoCapitalize="characters"
            />

            <Text style={styles.label}>Email professionnel *</Text>
            <TextInput style={styles.input}
              placeholder="prenom.nom@oncf.ma" placeholderTextColor="#607D8B"
              value={email} onChangeText={setEmail}
              keyboardType="email-address" autoCapitalize="none"
            />

            <Text style={styles.label}>Téléphone</Text>
            <TextInput style={styles.input}
              placeholder="Ex: 06XXXXXXXX" placeholderTextColor="#607D8B"
              value={telephone} onChangeText={setTelephone}
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>Résidence</Text>
            <TextInput style={styles.input}
              placeholder="Ex: KENITRA" placeholderTextColor="#607D8B"
              value={residence} onChangeText={setResidence}
            />
          </View>

          {/* ===== RÔLE ===== */}
          <View style={styles.sectionBox}>
            <Text style={styles.sectionTitle}>🔑 Rôle</Text>
            <View style={styles.rolesContainer}>
              {ROLES.map((role) => (
                <TouchableOpacity
                  key={role.value}
                  style={[styles.roleCard, selectedRole === role.value && styles.roleCardSelected]}
                  onPress={() => { setSelectedRole(role.value); setEntite(''); setShowEntiteDropdown(false); }}
                >
                  <Text style={styles.roleIcon}>{role.icon}</Text>
                  <Text style={[styles.roleLabel, selectedRole === role.value && styles.roleLabelSelected]}>
                    {role.label}
                  </Text>
                  <Text style={styles.roleDesc}>{role.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ===== POSTE ===== */}
          <View style={styles.sectionBox}>
            <Text style={styles.sectionTitle}>🏢 Poste & Fonction</Text>

            <Text style={styles.label}>Entité *</Text>
            <TouchableOpacity
              style={styles.dropdownTrigger}
              onPress={() => setShowEntiteDropdown(!showEntiteDropdown)}
            >
              <Text style={entite ? styles.dropdownValue : styles.dropdownPlaceholder}>
                {entite || 'Sélectionner une entité'}
              </Text>
              <Text style={styles.dropdownArrow}>{showEntiteDropdown ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showEntiteDropdown && (
              <View style={styles.dropdownList}>
                {(ENTITES_PAR_ROLE[selectedRole] || []).map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[styles.dropdownItem, entite === item && styles.dropdownItemSelected]}
                    onPress={() => { setEntite(item); setShowEntiteDropdown(false); }}
                  >
                    <Text style={[styles.dropdownItemText, entite === item && styles.dropdownItemTextSelected]}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.label}>Poste occupé</Text>
            <TextInput style={styles.input}
              placeholder="Ex: Technicien Voie LGV" placeholderTextColor="#607D8B"
              value={poste} onChangeText={setPoste}
            />

            <Text style={styles.label}>Fonction assurée</Text>
            <TextInput style={styles.input}
              placeholder="Ex: CDT Adjoint, Tech, STGM..." placeholderTextColor="#607D8B"
              value={fonctionAssuree} onChangeText={setFonctionAssuree}
            />

            <Text style={styles.label}>Date de prise de fonction</Text>
            <DatePickerInput
              value={dateFonction}
              onChange={setDateFonction}
              minDate={null}
              placeholder="Sélectionner une date"
              inputStyle={styles.input} />

            <Text style={styles.label}>Site / UP</Text>
            <TextInput style={styles.input}
              placeholder="Ex: UP 1021V LGV" placeholderTextColor="#607D8B"
              value={siteUp} onChangeText={setSiteUp}
            />
          </View>

          {/* ===== SÉCURITÉ ===== */}
          <View style={styles.sectionBox}>
            <Text style={styles.sectionTitle}>🔒 Sécurité</Text>

            <Text style={styles.label}>Mot de passe *</Text>
            <View style={styles.passwordContainer}>
              <TextInput style={styles.passwordInput}
                placeholder="Min. 6 caractères" placeholderTextColor="#607D8B"
                value={password} onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                <Text>{showPassword ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Confirmer le mot de passe *</Text>
            <TextInput style={styles.input}
              placeholder="Répétez le mot de passe" placeholderTextColor="#607D8B"
              value={confirmPassword} onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
            />
          </View>

          {/* Bouton */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#0A1628" />
              : <Text style={styles.buttonText}>Créer le compte</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity style={styles.loginLink} onPress={() => navigation.replace('Login')}>
            <Text style={styles.loginLinkText}>
              Déjà un compte ? <Text style={styles.loginLinkBold}>Se connecter</Text>
            </Text>
          </TouchableOpacity>

        </View>
      </Scroller>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A1628' },
  container: { flex: 1, backgroundColor: '#0A1628' },
  webSafe: { height: '100vh', backgroundColor: '#0A1628' },
  webScroller: { flex: 1, overflow: 'scroll', paddingBottom: 40 },

  successContainer: {
    flex: 1, backgroundColor: '#0A1628',
    alignItems: 'center', justifyContent: 'center',
  },
  successIcon: { fontSize: 64, marginBottom: 16 },
  successTitle: { color: '#27AE60', fontSize: 24, fontWeight: 'bold' },
  successText: { color: '#607D8B', marginTop: 8 },

  header: {
    alignItems: 'center', paddingTop: 20, paddingBottom: 24,
    backgroundColor: '#0F2137',
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
    marginBottom: 24,
  },
  backBtn: { alignSelf: 'flex-start', paddingLeft: 20, marginBottom: 16 },
  backText: { color: '#C9A84C', fontSize: 14 },
  logoText: { fontSize: 40, marginBottom: 8 },
  title: { color: '#FFFFFF', fontSize: 22, fontWeight: 'bold' },
  subtitle: { color: '#607D8B', fontSize: 12, marginTop: 4 },

  form: { paddingHorizontal: 16, paddingBottom: 40 },

  errorBox: {
    backgroundColor: '#2D1515', borderLeftWidth: 3,
    borderLeftColor: '#E53935', padding: 12,
    borderRadius: 8, marginBottom: 16,
  },
  errorText: { color: '#EF9A9A', fontSize: 13 },

  sectionBox: {
    backgroundColor: '#0F2137', borderRadius: 12,
    padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#2A4060',
  },
  sectionTitle: { color: '#C9A84C', fontSize: 14, fontWeight: 'bold', marginBottom: 8 },

  row: { flexDirection: 'row' },

  label: { color: '#B0BEC5', fontSize: 12, marginBottom: 4, marginTop: 10 },
  input: {
    backgroundColor: '#1A2F4A', borderWidth: 1, borderColor: '#2A4060',
    borderRadius: 8, padding: 12, color: '#FFFFFF', fontSize: 14,
  },

  dropdownTrigger: {
    backgroundColor: '#1A2F4A', borderWidth: 1, borderColor: '#2A4060',
    borderRadius: 8, padding: 12, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center',
  },
  dropdownPlaceholder: { color: '#607D8B', fontSize: 14 },
  dropdownValue: { color: '#FFFFFF', fontSize: 14 },
  dropdownArrow: { color: '#607D8B', fontSize: 12 },
  dropdownList: {
    backgroundColor: '#1A2F4A', borderWidth: 1, borderColor: '#2A4060',
    borderRadius: 8, marginTop: 4, overflow: 'hidden',
  },
  dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#2A4060' },
  dropdownItemSelected: { backgroundColor: '#1E3A2F' },
  dropdownItemText: { color: '#B0BEC5', fontSize: 14 },
  dropdownItemTextSelected: { color: '#C9A84C', fontWeight: 'bold' },

  passwordContainer: {
    flexDirection: 'row', backgroundColor: '#1A2F4A',
    borderWidth: 1, borderColor: '#2A4060',
    borderRadius: 8, alignItems: 'center',
  },
  passwordInput: { flex: 1, padding: 12, color: '#FFFFFF', fontSize: 14 },
  eyeButton: { padding: 12 },

  rolesContainer: { flexDirection: 'row', gap: 8, marginTop: 4 },
  roleCard: {
    flex: 1, backgroundColor: '#1A2F4A',
    borderWidth: 1, borderColor: '#2A4060',
    borderRadius: 10, padding: 12, alignItems: 'center',
  },
  roleCardSelected: { borderColor: '#C9A84C', backgroundColor: '#1E3A2F' },
  roleIcon: { fontSize: 22, marginBottom: 4 },
  roleLabel: { color: '#B0BEC5', fontSize: 12, fontWeight: 'bold' },
  roleLabelSelected: { color: '#C9A84C' },
  roleDesc: { color: '#607D8B', fontSize: 10, marginTop: 2, textAlign: 'center' },

  button: {
    backgroundColor: '#C9A84C', borderRadius: 10,
    padding: 16, alignItems: 'center', marginTop: 16,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#0A1628', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },

  loginLink: { alignItems: 'center', marginTop: 20 },
  loginLinkText: { color: '#607D8B', fontSize: 14 },
  loginLinkBold: { color: '#C9A84C', fontWeight: 'bold' },
});