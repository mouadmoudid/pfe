import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../services/authService';

const TASK_API = API_URL.replace('/auth', '/tasks');

export default function AgentScreen({ navigation }) {
  const Wrapper = Platform.OS === 'web' ? View : SafeAreaView;
  const Scroller = Platform.OS === 'web' ? View : ScrollView;

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    loadTasks();
  }, []);

  const getToken = async () => await AsyncStorage.getItem('token');

  const loadTasks = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await axios.get(`${TASK_API}/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTasks(res.data);
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de charger les tâches');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (taskId, newStatus) => {
    try {
      const token = await getToken();
      await axios.patch(
        `${TASK_API}/${taskId}/status?status=${newStatus}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      loadTasks();
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de mettre à jour le statut');
    }
  };

  const confirmUpdate = (taskId, newStatus) => {
    const label = newStatus === 'IN_PROGRESS' ? 'En cours' : 'Terminé';
    Alert.alert(
      'Confirmer',
      `Marquer cette tâche comme "${label}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Confirmer', onPress: () => updateStatus(taskId, newStatus) }
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'DONE': return '#27AE60';
      case 'IN_PROGRESS': return '#E67E22';
      default: return '#607D8B';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'DONE': return '✓ Terminé';
      case 'IN_PROGRESS': return '⟳ En cours';
      default: return '○ À faire';
    }
  };

  const filteredTasks = tasks.filter(t => {
    if (filter === 'ALL') return true;
    return t.status === filter;
  });

  const counts = {
    ALL: tasks.length,
    TODO: tasks.filter(t => t.status === 'TODO').length,
    IN_PROGRESS: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    DONE: tasks.filter(t => t.status === 'DONE').length,
  };

  const FILTERS = [
    { key: 'ALL', label: 'Toutes' },
    { key: 'TODO', label: 'À faire' },
    { key: 'IN_PROGRESS', label: 'En cours' },
    { key: 'DONE', label: 'Terminées' },
  ];

  return (
    <Wrapper style={Platform.OS === 'web' ? styles.webSafe : styles.safe}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mes Tâches</Text>
        <Text style={styles.headerSub}>Tâches assignées par le manager</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{counts.ALL}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: '#607D8B' }]}>{counts.TODO}</Text>
          <Text style={styles.statLabel}>À faire</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: '#E67E22' }]}>{counts.IN_PROGRESS}</Text>
          <Text style={styles.statLabel}>En cours</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: '#27AE60' }]}>{counts.DONE}</Text>
          <Text style={styles.statLabel}>Terminé</Text>
        </View>
      </View>

      {/* Filtres — ligne compacte */}
      <View style={styles.filtersRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && <ActivityIndicator color="#C9A84C" style={{ marginTop: 20 }} />}

      <Scroller style={Platform.OS === 'web' ? styles.webScroller : styles.list} {...(Platform.OS !== 'web' && { showsVerticalScrollIndicator: false })}>

        {filteredTasks.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>Aucune tâche dans cette catégorie</Text>
            <TouchableOpacity onPress={loadTasks}>
              <Text style={styles.refreshText}>Actualiser</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredTasks.map((task) => (
            <View key={task.id} style={[
              styles.taskCard,
              { borderLeftColor: getStatusColor(task.status) }
            ]}>

              {/* Top */}
              <View style={styles.taskTop}>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(task.status) + '25' }
                ]}>
                  <Text style={[
                    styles.statusText,
                    { color: getStatusColor(task.status) }
                  ]}>
                    {getStatusLabel(task.status)}
                  </Text>
                </View>
                <Text style={styles.processusTag}>{task.processus}</Text>
              </View>

              {/* Titre */}
              <Text style={styles.taskTitle}>{task.title}</Text>

              {/* Description */}
              {task.description ? (
                <Text style={styles.taskDesc}>{task.description}</Text>
              ) : null}

              {/* Document ref */}
              {task.documentRef ? (
                <View style={styles.docRef}>
                  <Text style={styles.docRefText}>📄 {task.documentRef}</Text>
                </View>
              ) : null}

              {/* Assigné par */}
              <Text style={styles.assignedBy}>
                Assigné par : {task.assignedByName}
              </Text>

              {/* Actions */}
              {task.status !== 'DONE' && (
                <View style={styles.actions}>
                  {task.status === 'TODO' && (
                    <TouchableOpacity
                      style={styles.btnInProgress}
                      onPress={() => confirmUpdate(task.id, 'IN_PROGRESS')}
                    >
                      <Text style={styles.btnInProgressText}>Démarrer</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.btnDone}
                    onPress={() => confirmUpdate(task.id, 'DONE')}
                  >
                    <Text style={styles.btnDoneText}>Marquer terminé</Text>
                  </TouchableOpacity>
                </View>
              )}

              {task.status === 'DONE' && (
                <View style={styles.doneBox}>
                  <Text style={styles.doneText}>Tâche accomplie</Text>
                </View>
              )}
            </View>
          ))
        )}

        <View style={{ height: 40 }} />
      </Scroller>
    </Wrapper>
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
  headerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
  headerSub: { color: '#607D8B', fontSize: 12, marginTop: 2 },

  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  statBox: {
    flex: 1, backgroundColor: '#0F2137',
    borderRadius: 10, padding: 10, alignItems: 'center',
  },
  statNum: { color: '#C9A84C', fontSize: 18, fontWeight: 'bold' },
  statLabel: { color: '#607D8B', fontSize: 10, marginTop: 2 },

  filtersRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 6,
  },
  filterChip: {
    flex: 1,
    backgroundColor: '#0F2137',
    borderWidth: 1,
    borderColor: '#2A4060',
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: '#C9A84C',
    borderColor: '#C9A84C',
  },
  filterText: {
    color: '#607D8B',
    fontSize: 11,
  },
  filterTextActive: {
    color: '#0A1628',
    fontWeight: 'bold',
    fontSize: 11,
  },

  list: { paddingHorizontal: 16 },

  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#607D8B', fontSize: 14, marginBottom: 12 },
  refreshText: { color: '#C9A84C', fontSize: 14, fontWeight: 'bold' },

  taskCard: {
    backgroundColor: '#0F2137', borderRadius: 12,
    padding: 16, marginBottom: 12,
    borderLeftWidth: 4,
  },
  taskTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  processusTag: { color: '#C9A84C', fontSize: 12, fontWeight: 'bold' },

  taskTitle: {
    color: '#FFFFFF', fontSize: 15,
    fontWeight: 'bold', marginBottom: 6,
  },
  taskDesc: { color: '#B0BEC5', fontSize: 13, marginBottom: 8, lineHeight: 18 },

  docRef: {
    backgroundColor: '#1A2F4A', borderRadius: 8,
    padding: 8, marginBottom: 8,
  },
  docRefText: { color: '#4A90D9', fontSize: 12 },

  assignedBy: { color: '#607D8B', fontSize: 12, marginBottom: 12 },

  actions: { flexDirection: 'row', gap: 8 },
  btnInProgress: {
    flex: 1, backgroundColor: '#E67E2220',
    borderWidth: 1, borderColor: '#E67E22',
    borderRadius: 8, padding: 10, alignItems: 'center',
  },
  btnInProgressText: { color: '#E67E22', fontWeight: 'bold', fontSize: 13 },
  btnDone: {
    flex: 1, backgroundColor: '#27AE6020',
    borderWidth: 1, borderColor: '#27AE60',
    borderRadius: 8, padding: 10, alignItems: 'center',
  },
  btnDoneText: { color: '#27AE60', fontWeight: 'bold', fontSize: 13 },

  doneBox: {
    backgroundColor: '#27AE6015', borderRadius: 8,
    padding: 10, alignItems: 'center',
  },
  doneText: { color: '#27AE60', fontWeight: 'bold' },
  webSafe: { height: '100vh', backgroundColor: '#0A1628' },
  webScroller: { flex: 1, overflow: 'scroll', paddingBottom: 40 },
});