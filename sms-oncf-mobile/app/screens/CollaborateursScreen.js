import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../services/authService';

const ADMIN_API = API_URL.replace('/auth', '/admin');

export default function CollaborateursScreen({ navigation }) {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => { loadAgents(); }, []);

  const getToken = async () => await AsyncStorage.getItem('token');

  const loadAgents = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await axios.get(`${ADMIN_API}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Filtrer uniquement les agents
      const agentsOnly = res.data.filter(u => u.role === 'AGENT');
      setAgents(agentsOnly);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger les agents');
    } finally {
      setLoading(false);
    }
  };

  const toggleCollaborateur = async (user) => {
    const action = user.collaborateur ? 'retirer de' : 'ajouter à';
    Alert.alert(
      'Confirmer',
      `Voulez-vous ${action} la liste des collaborateurs ${user.fullName} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            try {
              const token = await getToken();
              await axios.patch(
                `${ADMIN_API}/users/${user.id}/collaborateur`, {},
                { headers: { Authorization: `Bearer ${token}` } }
              );
              loadAgents();
            } catch {
              Alert.alert('Erreur', 'Impossible de modifier le statut');
            }
          }
        }
      ]
    );
  };

  const collaborateurs = agents.filter(a => a.collaborateur);
  const nonCollaborateurs = agents.filter(a => !a.collaborateur);

  const filtered = agents.filter(a =>
    `${a.fullName} ${a.matricule || ''}`.toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safe}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Collaborateurs</Text>
            <Text style={styles.headerSub}>
              {collaborateurs.length} collaborateurs actifs sur {agents.length} agents
            </Text>
          </View>
          <TouchableOpacity style={styles.refreshBtn} onPress={loadAgents}>
            <Text style={styles.refreshBtnText}>↻</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: '#C9A84C' }]}>{agents.length}</Text>
          <Text style={styles.statLabel}>Total agents</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: '#27AE60' }]}>{collaborateurs.length}</Text>
          <Text style={styles.statLabel}>Collaborateurs</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: '#607D8B' }]}>{nonCollaborateurs.length}</Text>
          <Text style={styles.statLabel}>Non assignés</Text>
        </View>
      </View>

      {/* Recherche */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher par nom ou matricule..."
          placeholderTextColor="#607D8B"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Info */}
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          Appuyez sur un agent pour l'ajouter ou retirer des collaborateurs terrain
        </Text>
      </View>

      {loading
        ? <ActivityIndicator color="#C9A84C" style={{ marginTop: 40 }} />
        : (
          <ScrollView style={styles.list}>
            {filtered.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyIcon}>👷</Text>
                <Text style={styles.emptyText}>Aucun agent trouvé</Text>
                <Text style={styles.emptySubText}>
                  Créez des agents depuis l'écran d'inscription
                </Text>
              </View>
            ) : (
              filtered.map(agent => (
                <TouchableOpacity
                  key={agent.id}
                  style={[
                    styles.agentCard,
                    agent.collaborateur && styles.agentCardActive
                  ]}
                  onPress={() => toggleCollaborateur(agent)}
                  activeOpacity={0.8}
                >
                  <View style={styles.agentLeft}>
                    <View style={[
                      styles.avatar,
                      { backgroundColor: agent.collaborateur ? '#27AE60' : '#1E3A5F' }
                    ]}>
                      <Text style={styles.avatarText}>
                        {agent.fullName?.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.agentInfo}>
                      <Text style={styles.agentName}>{agent.fullName}</Text>
                      <Text style={styles.agentEmail}>{agent.email}</Text>
                      {agent.matricule && (
                        <Text style={styles.agentMatricule}>
                          Matricule : {agent.matricule}
                        </Text>
                      )}
                      {agent.poste && (
                        <Text style={styles.agentPoste}>{agent.poste}</Text>
                      )}
                      {agent.siteUp && (
                        <Text style={styles.agentSite}>📍 {agent.siteUp}</Text>
                      )}
                    </View>
                  </View>

                  {/* Badge statut */}
                  <View style={[
                    styles.statusBadge,
                    agent.collaborateur
                      ? styles.statusBadgeActive
                      : styles.statusBadgeInactive
                  ]}>
                    <Text style={[
                      styles.statusText,
                      agent.collaborateur
                        ? styles.statusTextActive
                        : styles.statusTextInactive
                    ]}>
                      {agent.collaborateur ? '✓ Collaborateur' : '+ Ajouter'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        )
      }
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A1628' },

  header: {
    backgroundColor: '#0F2137', padding: 20,
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20, marginBottom: 12,
  },
  backText: { color: '#C9A84C', fontSize: 14, marginBottom: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  headerSub: { color: '#607D8B', fontSize: 11, marginTop: 2 },
  refreshBtn: {
    backgroundColor: '#1A2F4A', borderRadius: 8,
    width: 36, height: 36,
    alignItems: 'center', justifyContent: 'center',
  },
  refreshBtnText: { color: '#C9A84C', fontSize: 20 },

  statsRow: {
    flexDirection: 'row', paddingHorizontal: 16,
    marginBottom: 10, gap: 8,
  },
  statBox: {
    flex: 1, backgroundColor: '#0F2137',
    borderRadius: 10, padding: 12, alignItems: 'center',
  },
  statNum: { fontSize: 22, fontWeight: 'bold' },
  statLabel: { color: '#607D8B', fontSize: 10, marginTop: 2 },

  searchContainer: { paddingHorizontal: 16, marginBottom: 8 },
  searchInput: {
    backgroundColor: '#0F2137', borderWidth: 1, borderColor: '#2A4060',
    borderRadius: 10, padding: 12, color: '#FFFFFF', fontSize: 14,
  },

  infoBox: {
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: '#1E3A5F', borderRadius: 8, padding: 10,
    borderLeftWidth: 3, borderLeftColor: '#4A90D9',
  },
  infoText: { color: '#B0BEC5', fontSize: 12 },

  list: { paddingHorizontal: 16 },

  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  emptySubText: { color: '#607D8B', fontSize: 13, marginTop: 4, textAlign: 'center' },

  agentCard: {
    backgroundColor: '#0F2137', borderRadius: 12,
    padding: 14, marginBottom: 10,
    borderLeftWidth: 4, borderLeftColor: '#2A4060',
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
  },
  agentCardActive: {
    borderLeftColor: '#27AE60',
    backgroundColor: '#0F2137',
  },
  agentLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  agentInfo: { flex: 1 },
  agentName: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold', marginBottom: 2 },
  agentEmail: { color: '#607D8B', fontSize: 11, marginBottom: 2 },
  agentMatricule: { color: '#C9A84C', fontSize: 11, marginBottom: 2 },
  agentPoste: { color: '#B0BEC5', fontSize: 11, marginBottom: 2 },
  agentSite: { color: '#607D8B', fontSize: 10 },

  statusBadge: {
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1, marginLeft: 8,
  },
  statusBadgeActive: {
    backgroundColor: '#27AE6020', borderColor: '#27AE60',
  },
  statusBadgeInactive: {
    backgroundColor: '#1A2F4A', borderColor: '#2A4060',
  },
  statusText: { fontSize: 11, fontWeight: 'bold' },
  statusTextActive: { color: '#27AE60' },
  statusTextInactive: { color: '#607D8B' },
});