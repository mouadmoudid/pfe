import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Modal,
  TextInput, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../services/authService';

const PLANNING_API = API_URL.replace('/auth', '/planning');
const TASK_API = API_URL.replace('/auth', '/tasks');

const isChef = (role) => role === 'CPGX' || role === 'CSPR' || role === 'CET';
const screenWidth = Dimensions.get('window').width;

const CATEGORIES = [
  { key: 'ALL', label: 'Toutes' },
  { key: 'CONTROLE_COLLABORATEURS', label: 'Contrôle Collab.' },
  { key: 'CHANTIER_TRAVAUX_VOIE', label: 'Chantier Voie' },
  { key: 'EXAMENS', label: 'Examens' },
  { key: 'FORMATION_SENSIBILISATION', label: 'Formation' },
];

const CATEGORY_COLORS = {
  CONTROLE_COLLABORATEURS: '#4A90D9',
  CHANTIER_TRAVAUX_VOIE: '#27AE60',
  EXAMENS: '#E67E22',
  FORMATION_SENSIBILISATION: '#8E44AD',
};

const STATUS_COLORS = {
  PLANIFIE: '#607D8B',
  EN_COURS: '#E67E22',
  REALISE: '#27AE60',
  REPORTE: '#E74C3C',
  ANNULE: '#424242',
};

const SOUS_TACHES = {
  CONTROLE_COLLABORATEURS: [
    'Contrôle Collaborateurs/Procédures/Instl/Docs/Agrés/Envt',
  ],
  CHANTIER_TRAVAUX_VOIE: [
    'Chantier BDML',
    'Chantier C Ballast',
    'Chantier Meulage par Train Meuleur',
    'Chantier de Redressage Rails',
  ],
  EXAMENS: [
    'Examen Annuel professionnel (technique et sécurité)',
    'Examen Médicale',
    'Examen Psychologique',
  ],
  FORMATION_SENSIBILISATION: [
    'Sensibilisation aux morsures de reptiles',
    'Système de Management Anti-Corruption (SMAC)',
    'Maintenance Voie LGV (recyclage et REX)',
    'Organisation et application Contrôle Manuel LGV',
  ],
};

const SEMAINES_MOIS = [
  { mois: 'Jan', semaines: [1, 2, 3, 4] },
  { mois: 'Fév', semaines: [5, 6, 7, 8] },
  { mois: 'Mar', semaines: [9, 10, 11, 12] },
  { mois: 'Avr', semaines: [13, 14, 15, 16] },
  { mois: 'Mai', semaines: [17, 18, 19, 20] },
  { mois: 'Juin', semaines: [21, 22, 23, 24] },
  { mois: 'Juil', semaines: [25, 26, 27, 28] },
  { mois: 'Août', semaines: [29, 30, 31, 32] },
  { mois: 'Sep', semaines: [33, 34, 35, 36] },
  { mois: 'Oct', semaines: [37, 38, 39, 40] },
  { mois: 'Nov', semaines: [41, 42, 43, 44] },
  { mois: 'Déc', semaines: [45, 46, 47, 48, 49] },
];

const CELL_WIDTH = 28;
const ROW_HEIGHT = 36;
const LABEL_WIDTH = 180;

export default function PlanningScreen({ navigation }) {
  const [tasks, setTasks] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState('ALL');
  const [annee] = useState(new Date().getFullYear());
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [activeTab, setActiveTab] = useState('gantt');
  const [user, setUser] = useState(null);

  const [form, setForm] = useState({
    title: '',
    parentTitle: '',
    category: 'CONTROLE_COLLABORATEURS',
    matricule: '',
    duree: '',
    datePrevue: '',
    semaine: '',
    details: '',
    assignedToId: '',
    cotation: '',
  });

  useEffect(() => {
    const initialize = async () => {
      await loadUser();
    };
    initialize();
  }, []);

  useEffect(() => {
    if (user) loadData();
  }, [user, annee]);

  const getToken = async () => await AsyncStorage.getItem('token');

  const loadUser = async () => {
    const userData = await AsyncStorage.getItem('user');
    if (userData) setUser(JSON.parse(userData));
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };

      const storageUser = await AsyncStorage.getItem('user');
      const currentUser = user || (storageUser ? JSON.parse(storageUser) : null);

      let planRes;
      if (currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER' || isChef(currentUser.role))) {
        planRes = await axios.get(`${PLANNING_API}?annee=${annee}`, { headers });
        const agentRes = await axios.get(`${API_URL.replace('/auth', '/admin/collaborateurs')}`, { headers });
        setAgents(agentRes.data);
      } else {
        planRes = await axios.get(`${PLANNING_API}/my`, { headers });
        setAgents([]); // non autorisé / pas nécessaire pour agent
      }

      setTasks(planRes.data);
    } catch (e) {
      console.error('loadData planning error', e);
      Alert.alert('Erreur', 'Impossible de charger le planning');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.title || !form.semaine) {
      Alert.alert('Erreur', 'Titre et semaine sont obligatoires');
      return;
    }
    try {
      const token = await getToken();
      await axios.post(PLANNING_API, {
        ...form,
        duree: form.duree ? parseInt(form.duree) : null,
        semaine: parseInt(form.semaine),
        annee,
        assignedToId: form.assignedToId ? parseInt(form.assignedToId) : null,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setModalVisible(false);
      setForm({
        title: '', parentTitle: '', category: 'CONTROLE_COLLABORATEURS',
        matricule: '', duree: '', datePrevue: '', semaine: '',
        details: '', assignedToId: '', cotation: '',
      });
      loadData();
      Alert.alert('Succès', 'Tâche planning créée !');
    } catch {
      Alert.alert('Erreur', 'Impossible de créer la tâche');
    }
  };

  const updateStatus = async (taskId, status) => {
    try {
      const token = await getToken();
      await axios.patch(`${PLANNING_API}/${taskId}`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      loadData();
      setDetailModal(false);
    } catch {
      Alert.alert('Erreur', 'Impossible de mettre à jour');
    }
  };

  const filteredTasks = tasks.filter(t =>
    category === 'ALL' || t.category === category
  );

  // Calcul barre Gantt
  const getGanttBar = (task) => {
    if (!task.semaine) return null;
    const start = task.semaine;
    const duration = task.duree || 1;
    return { start, duration };
  };

  const isCanCreate = user?.role === 'ADMIN' || user?.role === 'MANAGER' || isChef(user?.role);

  return (
    <SafeAreaView style={styles.safe}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Planning Annuel {annee}</Text>
            <Text style={styles.headerSub}>Contrôle & Inspection — DRIC</Text>
          </View>
          {isCanCreate && (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.addBtnText}>+ Ajouter</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'gantt' && styles.tabActive]}
          onPress={() => setActiveTab('gantt')}
        >
          <Text style={[styles.tabText, activeTab === 'gantt' && styles.tabTextActive]}>
            Gantt
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'list' && styles.tabActive]}
          onPress={() => setActiveTab('list')}
        >
          <Text style={[styles.tabText, activeTab === 'list' && styles.tabTextActive]}>
            Liste ({filteredTasks.length})
          </Text>
        </TouchableOpacity>
      </View>

             {/* Filtres catégories — ligne compacte */}
        <View style={styles.catRow}>
        {CATEGORIES.map(cat => (
            <TouchableOpacity
            key={cat.key}
            style={[styles.catChip, category === cat.key && styles.catChipActive]}
            onPress={() => setCategory(cat.key)}
            >
            <Text style={[styles.catText, category === cat.key && styles.catTextActive]}
                numberOfLines={1}>
                {cat.label}
            </Text>
            </TouchableOpacity>
        ))}
        </View>

      {loading
        ? <ActivityIndicator color="#C9A84C" style={{ marginTop: 40 }} />
        : activeTab === 'gantt'
          ? (
            /* ===== VUE GANTT ===== */
            <ScrollView style={styles.ganttContainer}>
              {/* En-tête mois */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View>
                  {/* Header mois */}
                  <View style={styles.ganttHeader}>
                    <View style={{ width: LABEL_WIDTH }} />
                    {SEMAINES_MOIS.map(m => (
                      <View key={m.mois} style={[styles.moisCell, { width: m.semaines.length * CELL_WIDTH }]}>
                        <Text style={styles.moisText}>{m.mois}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Header semaines */}
                  <View style={styles.ganttSubHeader}>
                    <View style={{ width: LABEL_WIDTH }} />
                    {SEMAINES_MOIS.flatMap(m => m.semaines).map(s => (
                      <View key={s} style={styles.semaineCell}>
                        <Text style={styles.semaineText}>S{s}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Lignes tâches */}
                  {filteredTasks.length === 0 ? (
                    <View style={styles.emptyGantt}>
                      <Text style={styles.emptyText}>Aucune tâche — appuyez sur "+ Ajouter"</Text>
                    </View>
                  ) : (
                    filteredTasks.map(task => {
                      const bar = getGanttBar(task);
                      const color = CATEGORY_COLORS[task.category] || '#C9A84C';
                      return (
                        <TouchableOpacity
                          key={task.id}
                          style={styles.ganttRow}
                          onPress={() => { setSelectedTask(task); setDetailModal(true); }}
                        >
                          {/* Label */}
                          <View style={[styles.ganttLabel, { width: LABEL_WIDTH }]}>
                            <Text style={styles.ganttLabelText} numberOfLines={1}>
                              {task.title}
                            </Text>
                            {task.assignedToName && (
                              <Text style={styles.ganttAssignee} numberOfLines={1}>
                                👤 {task.assignedToName}
                              </Text>
                            )}
                          </View>

                          {/* Cellules semaines */}
                          {SEMAINES_MOIS.flatMap(m => m.semaines).map(s => {
                            const inBar = bar && s >= bar.start && s < bar.start + bar.duration;
                            const isStart = bar && s === bar.start;
                            const isEnd = bar && s === bar.start + bar.duration - 1;
                            return (
                              <View key={s} style={[
                                styles.ganttCell,
                                inBar && {
                                  backgroundColor: color,
                                  borderTopLeftRadius: isStart ? 4 : 0,
                                  borderBottomLeftRadius: isStart ? 4 : 0,
                                  borderTopRightRadius: isEnd ? 4 : 0,
                                  borderBottomRightRadius: isEnd ? 4 : 0,
                                }
                              ]}>
                                {isStart && task.pourcentageAcheve > 0 && (
                                  <Text style={styles.ganttPct}>{task.pourcentageAcheve}%</Text>
                                )}
                              </View>
                            );
                          })}
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>
              </ScrollView>

              {/* Légende */}
              <View style={styles.legend}>
                {Object.entries(CATEGORY_COLORS).map(([key, color]) => (
                  <View key={key} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: color }]} />
                    <Text style={styles.legendText}>
                      {CATEGORIES.find(c => c.key === key)?.label}
                    </Text>
                  </View>
                ))}
              </View>
              <View style={{ height: 40 }} />
            </ScrollView>
          )
          : (
            /* ===== VUE LISTE ===== */
            <ScrollView style={styles.listContainer}>
              {filteredTasks.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyIcon}>📅</Text>
                  <Text style={styles.emptyText}>Aucune tâche dans ce planning</Text>
                </View>
              ) : (
                filteredTasks.map(task => (
                  <TouchableOpacity
                    key={task.id}
                    style={[styles.taskCard, { borderLeftColor: CATEGORY_COLORS[task.category] || '#C9A84C' }]}
                    onPress={() => { setSelectedTask(task); setDetailModal(true); }}
                  >
                    <View style={styles.taskTop}>
                      <Text style={[styles.taskCategory, { color: CATEGORY_COLORS[task.category] }]}>
                        {CATEGORIES.find(c => c.key === task.category)?.label}
                      </Text>
                      <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[task.status] + '30' }]}>
                        <Text style={[styles.statusText, { color: STATUS_COLORS[task.status] }]}>
                          {task.status}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.taskTitle}>{task.title}</Text>
                    <View style={styles.taskMeta}>
                      <Text style={styles.taskMetaText}>S{task.semaine} · {task.duree || '?'} jr</Text>
                      {task.assignedToName && (
                        <Text style={styles.taskMetaText}>👤 {task.assignedToName}</Text>
                      )}
                      <Text style={styles.taskMetaText}>{task.pourcentageAcheve}% achevé</Text>
                    </View>
                    {/* Barre progression */}
                    <View style={styles.progressBg}>
                      <View style={[styles.progressFill, {
                        width: `${task.pourcentageAcheve}%`,
                        backgroundColor: CATEGORY_COLORS[task.category] || '#C9A84C'
                      }]} />
                    </View>
                  </TouchableOpacity>
                ))
              )}
              <View style={{ height: 40 }} />
            </ScrollView>
          )
      }

      {/* Modal Détail tâche */}
      <Modal
        visible={detailModal}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <ScrollView>
              {selectedTask && (
                <>
                  <Text style={styles.modalTitle}>{selectedTask.title}</Text>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Catégorie</Text>
                    <Text style={styles.detailValue}>
                      {CATEGORIES.find(c => c.key === selectedTask.category)?.label}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Semaine</Text>
                    <Text style={styles.detailValue}>S{selectedTask.semaine}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Durée</Text>
                    <Text style={styles.detailValue}>{selectedTask.duree || '?'} jour(s)</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>% Achevé</Text>
                    <Text style={styles.detailValue}>{selectedTask.pourcentageAcheve}%</Text>
                  </View>
                  {selectedTask.matricule && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Matricule</Text>
                      <Text style={styles.detailValue}>{selectedTask.matricule}</Text>
                    </View>
                  )}
                  {selectedTask.assignedToName && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Assigné à</Text>
                      <Text style={styles.detailValue}>{selectedTask.assignedToName}</Text>
                    </View>
                  )}
                  {selectedTask.cotation && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Cotation</Text>
                      <Text style={styles.detailValue}>{selectedTask.cotation}</Text>
                    </View>
                  )}
                  {selectedTask.details && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Détails</Text>
                      <Text style={styles.detailValue}>{selectedTask.details}</Text>
                    </View>
                  )}

                  {/* Actions statut */}
                  {isCanCreate && (
                    <>
                      <Text style={styles.detailLabel}>Changer statut :</Text>
                      <View style={styles.statusActions}>
                        {['PLANIFIE', 'EN_COURS', 'REALISE', 'REPORTE'].map(s => (
                          <TouchableOpacity
                            key={s}
                            style={[styles.statusBtn, {
                              backgroundColor: STATUS_COLORS[s] + '20',
                              borderColor: STATUS_COLORS[s],
                              borderWidth: selectedTask.status === s ? 2 : 1,
                            }]}
                            onPress={() => updateStatus(selectedTask.id, s)}
                          >
                            <Text style={[styles.statusBtnText, { color: STATUS_COLORS[s] }]}>
                              {s}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  )}
                </>
              )}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setDetailModal(false)}
            >
              <Text style={styles.modalCancelText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Créer tâche */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Nouvelle tâche planning</Text>
            <ScrollView>

              <Text style={styles.inputLabel}>Titre *</Text>
              <TextInput
                style={styles.input}
                placeholder="Nom de la tâche"
                placeholderTextColor="#607D8B"
                value={form.title}
                onChangeText={v => setForm({ ...form, title: v })}
              />

              <Text style={styles.inputLabel}>Catégorie *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                {Object.keys(CATEGORY_COLORS).map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.catChip, form.category === cat && styles.catChipActive, { marginBottom: 0 }]}
                    onPress={() => setForm({ ...form, category: cat })}
                  >
                    <Text style={[styles.catText, form.category === cat && styles.catTextActive]}>
                      {CATEGORIES.find(c => c.key === cat)?.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Sous-tâche</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                {(SOUS_TACHES[form.category] || []).map(st => (
                  <TouchableOpacity
                    key={st}
                    style={[styles.catChip, form.parentTitle === st && styles.catChipActive, { marginBottom: 0 }]}
                    onPress={() => setForm({ ...form, parentTitle: st, title: st })}
                  >
                    <Text style={[styles.catText, form.parentTitle === st && styles.catTextActive]} numberOfLines={1}>
                      {st.substring(0, 25)}...
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.rowInputs}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>Semaine * (1-53)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: 22"
                    placeholderTextColor="#607D8B"
                    keyboardType="numeric"
                    value={form.semaine}
                    onChangeText={v => setForm({ ...form, semaine: v })}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Durée (semaines)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: 4"
                    placeholderTextColor="#607D8B"
                    keyboardType="numeric"
                    value={form.duree}
                    onChangeText={v => setForm({ ...form, duree: v })}
                  />
                </View>
              </View>

              <View style={styles.rowInputs}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>Matricule</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: 12345"
                    placeholderTextColor="#607D8B"
                    value={form.matricule}
                    onChangeText={v => setForm({ ...form, matricule: v })}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Cotation</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: A"
                    placeholderTextColor="#607D8B"
                    value={form.cotation}
                    onChangeText={v => setForm({ ...form, cotation: v })}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Assigner à un agent</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                {agents.map(agent => (
                  <TouchableOpacity
                    key={agent.id}
                    style={[styles.catChip,
                      form.assignedToId === String(agent.id) && styles.catChipActive,
                      { marginBottom: 0 }
                    ]}
                    onPress={() => setForm({ ...form, assignedToId: String(agent.id) })}
                  >
                    <Text style={[styles.catText,
                      form.assignedToId === String(agent.id) && styles.catTextActive
                    ]}>
                      {agent.fullName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Détails</Text>
              <TextInput
                style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
                placeholder="Observations..."
                placeholderTextColor="#607D8B"
                multiline
                value={form.details}
                onChangeText={v => setForm({ ...form, details: v })}
              />

              <TouchableOpacity style={styles.submitBtn} onPress={handleCreate}>
                <Text style={styles.submitBtnText}>Créer la tâche</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
            </ScrollView>
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
    marginBottom: 10,
  },
  backText: { color: '#C9A84C', fontSize: 14, marginBottom: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  headerSub: { color: '#607D8B', fontSize: 11, marginTop: 2 },
  addBtn: {
    backgroundColor: '#C9A84C', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  addBtnText: { color: '#0A1628', fontWeight: 'bold', fontSize: 13 },

  tabs: {
    flexDirection: 'row', marginHorizontal: 16,
    marginBottom: 8, backgroundColor: '#0F2137',
    borderRadius: 10, padding: 4,
  },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#C9A84C' },
  tabText: { color: '#607D8B', fontSize: 13 },
  tabTextActive: { color: '#0A1628', fontWeight: 'bold' },

    catRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 6,
    },
    catChip: {
    flex: 1,
    backgroundColor: '#0F2137',
    borderWidth: 1,
    borderColor: '#2A4060',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    },
    catChipActive: {
    backgroundColor: '#C9A84C',
    borderColor: '#C9A84C',
    },
    catText: {
    color: '#607D8B',
    fontSize: 9,
    },
    catTextActive: {
    color: '#0A1628',
    fontWeight: 'bold',
    fontSize: 9,
    },
  // Gantt
  ganttContainer: { flex: 1 },
  ganttHeader: { flexDirection: 'row', backgroundColor: '#0F2137' },
  moisCell: {
    borderRightWidth: 1, borderColor: '#1A2F4A',
    padding: 4, alignItems: 'center',
  },
  moisText: { color: '#C9A84C', fontSize: 10, fontWeight: 'bold' },
  ganttSubHeader: { flexDirection: 'row', backgroundColor: '#0A1628', borderBottomWidth: 1, borderColor: '#1A2F4A' },
  semaineCell: {
    width: CELL_WIDTH, alignItems: 'center',
    paddingVertical: 3, borderRightWidth: 1, borderColor: '#1A2F4A',
  },
  semaineText: { color: '#607D8B', fontSize: 8 },
  ganttRow: {
    flexDirection: 'row', height: ROW_HEIGHT,
    borderBottomWidth: 1, borderColor: '#1A2F4A',
  },
  ganttLabel: {
    justifyContent: 'center', paddingHorizontal: 8,
    borderRightWidth: 1, borderColor: '#1A2F4A',
    backgroundColor: '#0A1628',
  },
  ganttLabelText: { color: '#FFFFFF', fontSize: 11 },
  ganttAssignee: { color: '#607D8B', fontSize: 9 },
  ganttCell: { width: CELL_WIDTH, height: ROW_HEIGHT, justifyContent: 'center', alignItems: 'center' },
  ganttPct: { color: '#fff', fontSize: 8, fontWeight: 'bold' },
  emptyGantt: { padding: 40, alignItems: 'center' },

  legend: {
    flexDirection: 'row', flexWrap: 'wrap',
    padding: 16, gap: 12,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 12, height: 12, borderRadius: 3, marginRight: 6 },
  legendText: { color: '#B0BEC5', fontSize: 11 },

  // Liste
  listContainer: { paddingHorizontal: 16 },
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#607D8B', fontSize: 14, textAlign: 'center' },
  taskCard: {
    backgroundColor: '#0F2137', borderRadius: 12,
    padding: 14, marginBottom: 10, borderLeftWidth: 4,
  },
  taskTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  taskCategory: { fontSize: 11, fontWeight: 'bold' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  taskTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold', marginBottom: 6 },
  taskMeta: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  taskMetaText: { color: '#607D8B', fontSize: 11 },
  progressBg: { backgroundColor: '#1A2F4A', borderRadius: 4, height: 6 },
  progressFill: { height: '100%', borderRadius: 4 },

  // Modals
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#0F2137',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: '90%',
  },
  modalTitle: {
    color: '#FFFFFF', fontSize: 18, fontWeight: 'bold',
    marginBottom: 16, textAlign: 'center',
  },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1, borderColor: '#1A2F4A',
  },
  detailLabel: { color: '#607D8B', fontSize: 13, marginBottom: 8, marginTop: 12 },
  detailValue: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold' },
  statusActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  statusBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  statusBtnText: { fontSize: 11, fontWeight: 'bold' },

  inputLabel: { color: '#B0BEC5', fontSize: 12, marginBottom: 4, marginTop: 10 },
  input: {
    backgroundColor: '#1A2F4A', borderWidth: 1,
    borderColor: '#2A4060', borderRadius: 8,
    padding: 10, color: '#FFFFFF', fontSize: 13,
  },
  rowInputs: { flexDirection: 'row' },
  submitBtn: {
    backgroundColor: '#C9A84C', borderRadius: 10,
    padding: 14, alignItems: 'center', marginTop: 16,
  },
  submitBtnText: { color: '#0A1628', fontWeight: 'bold', fontSize: 15 },
  modalCancelBtn: {
    backgroundColor: '#1A2F4A', borderRadius: 10,
    padding: 12, alignItems: 'center', marginTop: 8,
  },
  modalCancelText: { color: '#607D8B', fontSize: 14 },
});