import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator,
  Alert, SafeAreaView, Platform
} from 'react-native';
import { SafeAreaView as SafeAreaViewContext } from 'react-native-safe-area-context';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../services/authService';

const TASK_API = API_URL.replace('/auth', '/tasks');

const PROCESSUS_LIST = [
  { id: 'P01', label: 'P01 — Organisation & Management' },
  { id: 'P02', label: 'P02 — Contrôle & Inspection' },
  { id: 'P03', label: 'P03 — Veille Sécurité' },
  { id: 'P04', label: 'P04 — Pilotage Sécurité' },
  { id: 'P05', label: 'P05 — PASF' },
  { id: 'P06', label: 'P06 — Formation Sécurité' },
  { id: 'P07', label: 'P07 — Habilitation Personnel' },
  { id: 'P08', label: 'P08 — Cartographie Risques' },
  { id: 'P09', label: 'P09 — Gestion Incidents' },
  { id: 'P10', label: 'P10 — Essais Installations' },
];

export default function ManagerScreen({ navigation }) {
  const Wrapper = Platform.OS === 'web' ? View : SafeAreaViewContext;
  const Scroller = Platform.OS === 'web' ? View : ScrollView;

  const [agents, setAgents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('assign');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [documentRef, setDocumentRef] = useState('');
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [selectedProcessus, setSelectedProcessus] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const getToken = async () => {
    return await AsyncStorage.getItem('token');
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };

      const [agentsRes, tasksRes] = await Promise.all([
        axios.get(`${TASK_API}/agents`, { headers }),
        axios.get(`${TASK_API}/assigned`, { headers }),
      ]);

      setAgents(agentsRes.data);
      setTasks(tasksRes.data);
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de charger les données');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTask = async () => {
    if (!title || !selectedAgent || !selectedProcessus) {
      Alert.alert('Erreur', 'Veuillez remplir le titre, choisir un agent et un processus');
      return;
    }

    setLoading(true);
    try {
      const token = await getToken();
      await axios.post(TASK_API, {
        title,
        description,
        documentRef,
        processus: selectedProcessus,
        assignedToId: selectedAgent.id,
      }, { headers: { Authorization: `Bearer ${token}` } });

      Alert.alert('Succès', `Tâche assignée à ${selectedAgent.fullName} !`);
      setTitle('');
      setDescription('');
      setDocumentRef('');
      setSelectedAgent(null);
      setSelectedProcessus(null);
      setActiveTab('tasks');
      loadData();
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de créer la tâche');
    } finally {
      setLoading(false);
    }
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
      case 'DONE': return 'Terminé';
      case 'IN_PROGRESS': return 'En cours';
      default: return 'À faire';
    }
  };

  return (
    <Wrapper style={Platform.OS === 'web' ? styles.webSafe : styles.safe}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Espace Manager</Text>
        <Text style={styles.headerSub}>Gestion des tâches</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'assign' && styles.tabActive]}
          onPress={() => setActiveTab('assign')}
        >
          <Text style={[styles.tabText, activeTab === 'assign' && styles.tabTextActive]}>
            Assigner une tâche
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'tasks' && styles.tabActive]}
          onPress={() => setActiveTab('tasks')}
        >
          <Text style={[styles.tabText, activeTab === 'tasks' && styles.tabTextActive]}>
            Tâches assignées ({tasks.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading && <ActivityIndicator color="#C9A84C" style={{ marginTop: 20 }} />}

      <Scroller style={Platform.OS === 'web' ? styles.webScroller : styles.content} {...(Platform.OS !== 'web' && { showsVerticalScrollIndicator: false })}>

        {/* Tab 1 : Assigner */}
        {activeTab === 'assign' && (
          <View>
            <Text style={styles.sectionTitle}>Nouvelle tâche</Text>

            <Text style={styles.label}>Titre de la tâche *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Vérifier les habilitations"
              placeholderTextColor="#8896A5"
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Détails de la tâche..."
              placeholderTextColor="#8896A5"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.label}>Référence document</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Doc 34 - Liste collaborateurs"
              placeholderTextColor="#8896A5"
              value={documentRef}
              onChangeText={setDocumentRef}
            />

            {/* Sélection processus */}
            <Text style={styles.label}>Processus SMS *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalList}>
              {PROCESSUS_LIST.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.processusChip,
                    selectedProcessus === p.id && styles.processusChipSelected
                  ]}
                  onPress={() => setSelectedProcessus(p.id)}
                >
                  <Text style={[
                    styles.processusChipText,
                    selectedProcessus === p.id && styles.processusChipTextSelected
                  ]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Sélection agent */}
            <Text style={styles.label}>Assigner à *</Text>
            {agents.length === 0 ? (
              <Text style={styles.emptyText}>Aucun agent disponible</Text>
            ) : (
              agents.map((agent) => (
                <TouchableOpacity
                  key={agent.id}
                  style={[
                    styles.agentCard,
                    selectedAgent?.id === agent.id && styles.agentCardSelected
                  ]}
                  onPress={() => setSelectedAgent(agent)}
                >
                  <View style={styles.agentAvatar}>
                    <Text style={styles.agentAvatarText}>
                      {agent.fullName.charAt(0)}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.agentName}>{agent.fullName}</Text>
                    <Text style={styles.agentEmail}>{agent.email}</Text>
                  </View>
                  {selectedAgent?.id === agent.id && (
                    <Text style={styles.checkMark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))
            )}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleAssignTask}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#0A1628" />
                : <Text style={styles.buttonText}>Assigner la tâche</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {/* Tab 2 : Tâches assignées */}
        {activeTab === 'tasks' && (
          <View>
            <Text style={styles.sectionTitle}>Tâches assignées</Text>
            {tasks.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={styles.emptyText}>Aucune tâche assignée pour l'instant</Text>
              </View>
            ) : (
              tasks.map((task) => (
                <View key={task.id} style={styles.taskCard}>
                  <View style={styles.taskHeader}>
                    <Text style={styles.taskProcessus}>{task.processus}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(task.status) + '30' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(task.status) }]}>
                        {getStatusLabel(task.status)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.taskTitle}>{task.title}</Text>
                  {task.description ? (
                    <Text style={styles.taskDesc}>{task.description}</Text>
                  ) : null}
                  <View style={styles.taskFooter}>
                    <Text style={styles.taskAssignee}>👤 {task.assignedToName}</Text>
                    <Text style={styles.taskDate}>
                      {new Date(task.createdAt).toLocaleDateString('fr-FR')}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
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

  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#0F2137',
    borderRadius: 10,
    padding: 4,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#C9A84C' },
  tabText: { color: '#607D8B', fontSize: 13 },
  tabTextActive: { color: '#0A1628', fontWeight: 'bold' },

  content: { paddingHorizontal: 16 },
  sectionTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginBottom: 16 },

  label: { color: '#B0BEC5', fontSize: 13, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#1A2F4A', borderWidth: 1,
    borderColor: '#2A4060', borderRadius: 10,
    padding: 12, color: '#FFFFFF', fontSize: 14,
  },
  textArea: { height: 80, textAlignVertical: 'top' },

  horizontalList: { marginBottom: 8 },
  processusChip: {
    backgroundColor: '#1A2F4A', borderWidth: 1,
    borderColor: '#2A4060', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
    marginRight: 8,
  },
  processusChipSelected: { borderColor: '#C9A84C', backgroundColor: '#2A3F20' },
  processusChipText: { color: '#B0BEC5', fontSize: 12 },
  processusChipTextSelected: { color: '#C9A84C', fontWeight: 'bold' },

  agentCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1A2F4A', borderWidth: 1,
    borderColor: '#2A4060', borderRadius: 10,
    padding: 12, marginBottom: 8,
  },
  agentCardSelected: { borderColor: '#C9A84C', backgroundColor: '#1E3A2F' },
  agentAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#C9A84C',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  agentAvatarText: { color: '#0A1628', fontWeight: 'bold', fontSize: 16 },
  agentName: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  agentEmail: { color: '#607D8B', fontSize: 12 },
  checkMark: { marginLeft: 'auto', color: '#C9A84C', fontSize: 20, fontWeight: 'bold' },

  button: {
    backgroundColor: '#C9A84C', borderRadius: 10,
    padding: 16, alignItems: 'center', marginTop: 24,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#0A1628', fontSize: 16, fontWeight: 'bold' },

  taskCard: {
    backgroundColor: '#0F2137', borderRadius: 12,
    padding: 14, marginBottom: 10,
    borderLeftWidth: 3, borderLeftColor: '#C9A84C',
  },
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  taskProcessus: { color: '#C9A84C', fontSize: 12, fontWeight: 'bold' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: 'bold' },
  taskTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  taskDesc: { color: '#607D8B', fontSize: 12, marginBottom: 8 },
  taskFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  taskAssignee: { color: '#4A90D9', fontSize: 12 },
  taskDate: { color: '#607D8B', fontSize: 12 },

  emptyBox: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { color: '#607D8B', fontSize: 14, textAlign: 'center' },
  webSafe: { height: '100vh', backgroundColor: '#0A1628' },
  webScroller: { flex: 1, overflow: 'scroll', paddingBottom: 40 },
});