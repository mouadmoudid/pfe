import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';

const DOSSIERS = [
  { id: 'CONTROLE_INSPECTION', title: '1 - Contrôle et Inspection', icon: '🔍', color: '#4A90D9' },
  { id: 'VEILLE', title: '2 - Veille', icon: '👁', color: '#8E44AD' },
  { id: 'GESTION_RISQUES', title: '3 - Gestion des Risques', icon: '⚠️', color: '#E74C3C' },
  { id: 'REX', title: '4 - REX', icon: '🔄', color: '#E67E22' },
  { id: 'CULTURE_POSITIF', title: '5 - Culture Positif', icon: '🌟', color: '#27AE60' },
  { id: 'REFERENCIELS', title: '6 - Référenciels', icon: '📚', color: '#C9A84C' },
  { id: 'CAPITAL_HUMAIN', title: '7 - C.H - Capital Humain', icon: '👨‍👩‍👧‍👦', color: '#16A085' },
];

const isChef = (role) => role === 'CPGX' || role === 'CSPR' || role === 'CET';

const getRoleColor = (role) => {
  if (role === 'ADMIN') return '#E74C3C';
  if (isChef(role)) return '#8E44AD';
  return '#27AE60';
};

export default function DashboardScreen({ navigation }) {
  const { user, logout } = useAuth();

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0A1628" />
      <ScrollView
        style={styles.container}
         
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.oncfLabel}>ONCF · DRIC</Text>
              <Text style={styles.smsLabel}>Système de Management de la Sécurité</Text>
            </View>
            <TouchableOpacity 
              style={styles.logoutBtn} 
              onPress={() => logout(navigation)}
            >
              <Text style={styles.logoutText}>Quitter</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.userCard}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {user?.fullName?.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user?.fullName}</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
            </View>
            <View style={[styles.roleBadge, { backgroundColor: getRoleColor(user?.role) }]}>
              <Text style={styles.roleText}>{user?.role}</Text>
            </View>
          </View>
        </View>

        {(user?.role === 'ADMIN' || isChef(user?.role)) && (
          <TouchableOpacity
            style={styles.adminBtn}
            onPress={() => navigation.navigate('Admin')}
          >
            <Text style={styles.adminBtnText}>👥 Gérer les utilisateurs</Text>
          </TouchableOpacity>
        )}

        {(user?.role === 'ADMIN' || isChef(user?.role)) && (
          <TouchableOpacity
            style={styles.planningBtn}
            onPress={() => navigation.navigate('Planning')}
          >
            <Text style={styles.planningBtnText}>📅 Planning Annuel — Gantt S01-S53</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.sectionTitle}>Dossiers SMS</Text>
          <View style={styles.grid}>
            {DOSSIERS.map((d) => (
              <TouchableOpacity
                key={d.id}
                style={[styles.card, { borderLeftColor: d.color }]}
                onPress={() => navigation.navigate('Folder', { folderId: d.id })}
                activeOpacity={0.8}
              >
                <Text style={styles.cardIcon}>{d.icon}</Text>
                <Text style={styles.cardTitle}>{d.title}</Text>
                <Text style={[styles.arrow, { color: d.color }]}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A1628' },
  container: { flex: 1, backgroundColor: '#0A1628' },

  header: {
    backgroundColor: '#0F2137',
    padding: 20,
    paddingTop: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  oncfLabel: { color: '#C9A84C', fontSize: 16, fontWeight: 'bold', letterSpacing: 2 },
  smsLabel: { color: '#607D8B', fontSize: 11, marginTop: 2 },
  logoutBtn: {
  backgroundColor: '#E74C3C',
  borderRadius: 8,
  paddingHorizontal: 12,
  paddingVertical: 6,
  alignItems: 'center',
  justifyContent: 'center',
  },
  logoutText: { 
    color: '#fff', 
    fontSize: 12, 
    fontWeight: 'bold' 
  },

  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A2F4A',
    borderRadius: 12,
    padding: 12,
  },
  avatarCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#C9A84C',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { color: '#0A1628', fontSize: 18, fontWeight: 'bold' },
  userInfo: { flex: 1 },
  userName: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold' },
  userEmail: { color: '#607D8B', fontSize: 12, marginTop: 2 },
  roleBadge: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },

  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#0F2137',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statNumber: { color: '#C9A84C', fontSize: 20, fontWeight: 'bold' },
  statLabel: { color: '#607D8B', fontSize: 10, marginTop: 2 },

  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    marginBottom: 12,
  },

  grid: { paddingHorizontal: 16, gap: 12 },

  card: {
    backgroundColor: '#0F2137',
    borderRadius: 12, padding: 16,
    marginBottom: 10, borderLeftWidth: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardAccent: { width: 4 },
  cardContent: { flex: 1, padding: 14 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardIcon: { fontSize: 22 },
  idBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  idText: { fontSize: 12, fontWeight: 'bold' },
  cardTitle:  { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold', flex: 1 },
  cardDesc: { color: '#607D8B', fontSize: 12, lineHeight: 18 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  docsCount: { color: '#4A90D9', fontSize: 12 },
  arrow: { color: '#C9A84C', fontSize: 20, fontWeight: 'bold' },

  bottomPadding: { height: 30 },

  managerBtn: {
  backgroundColor: '#1E3A5F',
  borderWidth: 1, borderColor: '#C9A84C',
  borderRadius: 10, padding: 14,
  marginHorizontal: 16, marginBottom: 16,
  alignItems: 'center',
  },
  managerBtnText: { color: '#C9A84C', fontWeight: 'bold', fontSize: 14 },
  agentBtn: {
  backgroundColor: '#1E3A2F',
  borderWidth: 1, borderColor: '#27AE60',
  borderRadius: 10, padding: 14,
  marginHorizontal: 16, marginBottom: 16,
  alignItems: 'center',
  },
  agentBtnText: { color: '#27AE60', fontWeight: 'bold', fontSize: 14 },

  reportsBtn: {
    backgroundColor: '#1A2F4A',
    borderWidth: 1, borderColor: '#4A90D9',
    borderRadius: 10, padding: 14,
    marginHorizontal: 16, marginBottom: 16,
    alignItems: 'center',
  },
  reportsBtnText: { color: '#4A90D9', fontWeight: 'bold', fontSize: 14 },

  adminBtn: {
  backgroundColor: '#2D1515',
  borderWidth: 1, borderColor: '#E74C3C',
  borderRadius: 10, padding: 14,
  marginHorizontal: 16, marginBottom: 16,
  alignItems: 'center',
  },
  adminBtnText: { color: '#E74C3C', fontWeight: 'bold', fontSize: 14 },

  planningBtn: {
  backgroundColor: '#1A3A2F',
  borderWidth: 1, borderColor: '#27AE60',
  borderRadius: 10, padding: 14,
  marginHorizontal: 16, marginBottom: 16,
  alignItems: 'center',
  },
  planningBtnText: { color: '#27AE60', fontWeight: 'bold', fontSize: 14 },
});