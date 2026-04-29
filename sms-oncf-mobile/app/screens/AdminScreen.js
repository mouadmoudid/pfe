import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../services/authService';

const ADMIN_API = API_URL.replace('/auth', '/admin');

const ROLES = ['ADMIN', 'AGENT', 'CGPX', 'CSPR', 'CET'];

const isChef = (role) => role === 'CGPX' || role === 'CSPR' || role === 'CET';

const getRoleColor = (role) => {
  if (role === 'ADMIN') return '#E74C3C';
  if (isChef(role)) return '#8E44AD';
  return '#27AE60';
};

export default function AdminScreen({ navigation }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => { loadUsers(); }, []);

  const getToken = async () => await AsyncStorage.getItem('token');

  const loadUsers = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await axios.get(`${ADMIN_API}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger les utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const toggleUser = async (user) => {
    const action = user.enabled ? 'désactiver' : 'activer';
    Alert.alert(
      'Confirmer',
      `Voulez-vous ${action} le compte de ${user.fullName} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            try {
              const token = await getToken();
              await axios.patch(`${ADMIN_API}/users/${user.id}/toggle`, {}, {
                headers: { Authorization: `Bearer ${token}` }
              });
              loadUsers();
            } catch {
              Alert.alert('Erreur', 'Impossible de modifier le compte');
            }
          }
        }
      ]
    );
  };

  const changeRole = async (userId, newRole) => {
    try {
      const token = await getToken();
      await axios.patch(
        `${ADMIN_API}/users/${userId}/role?role=${newRole}`, {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setModalVisible(false);
      setSelectedUser(null);
      loadUsers();
      Alert.alert('Succès', `Rôle mis à jour : ${newRole}`);
    } catch {
      Alert.alert('Erreur', 'Impossible de changer le rôle');
    }
  };

  const deleteUser = async (user) => {
    Alert.alert(
      'Supprimer',
      `Supprimer définitivement le compte de ${user.fullName} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await getToken();
              await axios.delete(`${ADMIN_API}/users/${user.id}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              loadUsers();
            } catch {
              Alert.alert('Erreur', 'Impossible de supprimer');
            }
          }
        }
      ]
    );
  };

  const filteredUsers = users.filter(u => {
    if (filter === 'ALL') return true;
    return u.role === filter;
  });

  const counts = {
    ALL: users.length,
    ADMIN: users.filter(u => u.role === 'ADMIN').length,
    AGENT: users.filter(u => u.role === 'AGENT').length,
    CGPX: users.filter(u => u.role === 'CGPX').length,
    CSPR: users.filter(u => u.role === 'CSPR').length,
    CET: users.filter(u => u.role === 'CET').length,
  };

  return (
    <SafeAreaView style={styles.safe}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Utilisateurs</Text>
            <Text style={styles.headerSub}>Gestion des utilisateurs</Text>
          </View>
          <TouchableOpacity style={styles.refreshBtn} onPress={loadUsers}>
            <Text style={styles.refreshBtnText}>↻</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bouton Gérer les collaborateurs */}
      <TouchableOpacity
        style={styles.collabMgmtBtn}
        onPress={() => navigation.navigate('Collaborateurs')}
      >
        <Text style={styles.collabMgmtBtnText}>👷 Gérer les collaborateurs</Text>
      </TouchableOpacity>

      {/* Stats — ligne compacte */}
      <View style={styles.statsRow}>
        {[
          { key: 'ALL', label: 'Tous', color: '#C9A84C' },
          { key: 'ADMIN', label: 'Admins', color: '#E74C3C' },
          { key: 'AGENT', label: 'Agents', color: '#27AE60' },
          { key: 'CGPX', label: 'CGPX', color: '#8E44AD' },
          { key: 'CSPR', label: 'CSPR', color: '#8E44AD' },
          { key: 'CET', label: 'CET', color: '#8E44AD' },
        ].map(item => (
          <TouchableOpacity
            key={item.key}
            style={[styles.statChip, filter === item.key && {
              borderColor: item.color,
              backgroundColor: item.color + '20'
            }]}
            onPress={() => setFilter(item.key)}
          >
            <Text style={[styles.statChipNum, { color: item.color }]}>
              {counts[item.key]}
            </Text>
            <Text style={styles.statChipLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading
        ? <ActivityIndicator color="#C9A84C" style={{ marginTop: 40 }} />
        : (
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {filteredUsers.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyIcon}>👥</Text>
                <Text style={styles.emptyText}>Aucun utilisateur</Text>
              </View>
            ) : (
              filteredUsers.map(user => (
                <View key={user.id} style={[
                  styles.userCard,
                  !user.enabled && styles.userCardDisabled
                ]}>
                  {/* Avatar + infos */}
                  <View style={styles.userTop}>
                    <View style={[styles.avatar, { backgroundColor: getRoleColor(user.role) }]}>
                      <Text style={styles.avatarText}>
                        {user.fullName?.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.userInfo}>
                      <View style={styles.userNameRow}>
                        <Text style={styles.userName}>{user.fullName}</Text>
                        {!user.enabled && (
                          <View style={styles.disabledBadge}>
                            <Text style={styles.disabledText}>Désactivé</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.userEmail}>{user.email}</Text>
                    </View>
                    <View style={[styles.roleBadge, { backgroundColor: getRoleColor(user.role) + '30' }]}>
                      <Text style={[styles.roleText, { color: getRoleColor(user.role) }]}>
                        {user.role}
                      </Text>
                    </View>
                  </View>

                  {/* Actions */}
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => { setSelectedUser(user); setModalVisible(true); }}
                    >
                      <Text style={styles.actionBtnText}>Changer rôle</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtn,
                        user.enabled ? styles.actionBtnWarning : styles.actionBtnSuccess]}
                      onPress={() => toggleUser(user)}
                    >
                      <Text style={[styles.actionBtnText,
                        user.enabled ? { color: '#E67E22' } : { color: '#27AE60' }]}>
                        {user.enabled ? 'Désactiver' : 'Activer'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionBtnDanger]}
                      onPress={() => deleteUser(user)}
                    >
                      <Text style={[styles.actionBtnText, { color: '#E74C3C' }]}>
                        Supprimer
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        )
      }

      {/* Modal changement de rôle */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Changer le rôle de</Text>
            <Text style={styles.modalUser}>{selectedUser?.fullName}</Text>

            {ROLES.map(role => (
              <TouchableOpacity
                key={role}
                style={[
                  styles.roleOption,
                  selectedUser?.role === role && styles.roleOptionActive
                ]}
                onPress={() => changeRole(selectedUser.id, role)}
              >
                <View style={[styles.roleColorDot, { backgroundColor: getRoleColor(role) }]} />
                <Text style={[
                  styles.roleOptionText,
                  selectedUser?.role === role && { color: '#C9A84C', fontWeight: 'bold' }
                ]}>
                  {role}
                </Text>
                {selectedUser?.role === role && (
                  <Text style={styles.currentRoleTag}>actuel</Text>
                )}
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => { setModalVisible(false); setSelectedUser(null); }}
            >
              <Text style={styles.modalCancelText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A1628' },

  header: {
    backgroundColor: '#0F2137',
    padding: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 12,
  },
  backText: { color: '#C9A84C', fontSize: 14, marginBottom: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
  headerSub: { color: '#607D8B', fontSize: 12, marginTop: 2 },
  refreshBtn: {
    backgroundColor: '#1A2F4A', borderRadius: 8,
    width: 36, height: 36,
    alignItems: 'center', justifyContent: 'center',
  },
  refreshBtnText: { color: '#C9A84C', fontSize: 20 },

  collabMgmtBtn: {
    backgroundColor: '#1E3A5F',
    borderWidth: 1, borderColor: '#4A90D9',
    borderRadius: 10, padding: 14,
    marginHorizontal: 16, marginBottom: 12,
    alignItems: 'center',
  },
  collabMgmtBtnText: { color: '#4A90D9', fontWeight: 'bold', fontSize: 14 },

  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 6,
  },
  statChip: {
    flex: 1,
    backgroundColor: '#0F2137',
    borderWidth: 1,
    borderColor: '#2A4060',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statChipNum: { fontSize: 18, fontWeight: 'bold' },
  statChipLabel: { color: '#607D8B', fontSize: 9, marginTop: 2 },

  list: { paddingHorizontal: 16 },

  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#607D8B', fontSize: 14 },

  userCard: {
    backgroundColor: '#0F2137', borderRadius: 12,
    padding: 14, marginBottom: 10,
    borderLeftWidth: 3, borderLeftColor: '#C9A84C',
  },
  userCardDisabled: { opacity: 0.5, borderLeftColor: '#607D8B' },
  userTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  userInfo: { flex: 1 },
  userNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  userName: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  userEmail: { color: '#607D8B', fontSize: 12, marginTop: 2 },
  disabledBadge: {
    backgroundColor: '#607D8B30', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  disabledText: { color: '#607D8B', fontSize: 10 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  roleText: { fontSize: 11, fontWeight: 'bold' },

  actions: { flexDirection: 'row', gap: 6 },
  actionBtn: {
    flex: 1, backgroundColor: '#1A2F4A',
    borderWidth: 1, borderColor: '#2A4060',
    borderRadius: 8, padding: 8, alignItems: 'center',
  },
  actionBtnWarning: { borderColor: '#E67E22', backgroundColor: '#E67E2215' },
  actionBtnSuccess: { borderColor: '#27AE60', backgroundColor: '#27AE6015' },
  actionBtnDanger: { borderColor: '#E74C3C', backgroundColor: '#E74C3C15' },
  actionBtnText: { color: '#4A90D9', fontSize: 11, fontWeight: 'bold' },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#0F2137',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24,
  },
  modalTitle: { color: '#B0BEC5', fontSize: 14, textAlign: 'center' },
  modalUser: {
    color: '#FFFFFF', fontSize: 18, fontWeight: 'bold',
    textAlign: 'center', marginBottom: 20,
  },
  roleOption: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1A2F4A', borderRadius: 10,
    padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#2A4060',
  },
  roleOptionActive: { borderColor: '#C9A84C', backgroundColor: '#1E3A2F' },
  roleColorDot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  roleOptionText: { color: '#B0BEC5', fontSize: 14, flex: 1 },
  currentRoleTag: {
    color: '#C9A84C', fontSize: 11,
    backgroundColor: '#C9A84C20',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  modalCancelBtn: {
    backgroundColor: '#1A2F4A', borderRadius: 10,
    padding: 14, alignItems: 'center', marginTop: 8,
  },
  modalCancelText: { color: '#607D8B', fontSize: 14 },
});