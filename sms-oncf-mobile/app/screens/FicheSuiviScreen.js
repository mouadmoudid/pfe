import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, TextInput, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateAndSharePDF } from '../utils/pdfUtils';
import { API_URL } from '../services/authService';

const COLLAB_API = API_URL.replace('/auth', '/admin/collaborateurs');
const PLANNING_API = API_URL.replace('/auth', '/planning');
const FICHE_API = API_URL.replace('/auth', '/fiche-suivi');

const EXAMENS_TYPES = ['PSYCHOLOGIQUE', 'MEDICAL', 'PROFESSIONNEL'];

const RESULTATS = {
  PSYCHOLOGIQUE: ['FAVORABLE', 'DEFAVORABLE'],
  MEDICAL: ['APTE', 'INAPTE'],
  PROFESSIONNEL: ['BON', 'MAUVAIS'],
};

const RESULTAT_COLORS = {
  FAVORABLE: '#27AE60', DEFAVORABLE: '#E74C3C',
  APTE: '#27AE60', INAPTE: '#E74C3C',
  BON: '#27AE60', MAUVAIS: '#E74C3C',
};

export default function FicheSuiviScreen({ navigation }) {
  const [step, setStep] = useState(0); // 0=liste collabs, 1=fiche
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const [collaborateurs, setCollaborateurs] = useState([]);
  const [selectedCollab, setSelectedCollab] = useState(null);
  const [search, setSearch] = useState('');

  const [planningTasks, setPlanningTasks] = useState([]);
  const [ficheSuivis, setFicheSuivis] = useState([]);

  // État local des saisies : { [planningTaskId]: { resultat, observation, origineConstatation, actionsRealisees } }
  const [saisies, setSaisies] = useState({});

  const currentYear = new Date().getFullYear();

  const getToken = async () => await AsyncStorage.getItem('token');

  useEffect(() => {
    loadCollaborateurs();
  }, []);

  const loadCollaborateurs = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await axios.get(COLLAB_API, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCollaborateurs(res.data);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger les collaborateurs');
    } finally {
      setLoading(false);
    }
  };

  const selectCollaborateur = async (collab) => {
    setLoading(true);
    setSelectedCollab(collab);
    try {
      const token = await getToken();

      // Charger planning de l'année (examens + formations)
      const planningRes = await axios.get(
        `${PLANNING_API}?annee=${currentYear}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Filtrer les tâches EXAMENS et FORMATION_SENSIBILISATION assignées à ce collaborateur
        const tasks = planningRes.data.filter(t =>
        (t.category === 'EXAMENS' || t.category === 'FORMATION_SENSIBILISATION') &&
        (t.assignedToName === collab.fullName || t.assignedToEmail === collab.email)
        );
        setPlanningTasks(tasks);


      // Charger les fiches existantes pour ce collaborateur
      const ficheRes = await axios.get(
        `${FICHE_API}/collaborateur/${collab.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFicheSuivis(ficheRes.data);

      // Initialiser les saisies depuis les fiches existantes
      const initSaisies = {};
      ficheRes.data.forEach(f => {
        initSaisies[f.planningTaskId] = {
          resultat: f.resultat || '',
          observation: f.observation || '',
          origineConstatation: f.origineConstatation || '',
          actionsRealisees: f.actionsRealisees || '',
        };
      });
      setSaisies(initSaisies);
      setStep(1);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger la fiche');
    } finally {
      setLoading(false);
    }
  };

  const updateSaisie = (taskId, field, value) => {
    setSaisies(prev => ({
      ...prev,
      [taskId]: { ...prev[taskId], [field]: value }
    }));
  };

  const saveFiche = async (task) => {
    setSaving(true);
    try {
      const token = await getToken();
      const saisie = saisies[task.id] || {};
      const type = task.category === 'EXAMENS' ? 'EXAMEN' : 'FORMATION';

      await axios.post(FICHE_API, {
        collaborateurId: selectedCollab.id,
        planningTaskId: task.id,
        type,
        resultat: saisie.resultat || '',
        observation: saisie.observation || '',
        origineConstatation: saisie.origineConstatation || '',
        actionsRealisees: saisie.actionsRealisees || '',
      }, { headers: { Authorization: `Bearer ${token}` } });

      Alert.alert('Succès', 'Fiche sauvegardée !');
    } catch {
      Alert.alert('Erreur', 'Impossible de sauvegarder');
    } finally {
      setSaving(false);
    }
  };

  // Déterminer le type d'examen depuis le titre de la tâche
  const getExamenType = (title) => {
    const t = title?.toUpperCase() || '';
    if (t.includes('PSYCHO')) return 'PSYCHOLOGIQUE';
    if (t.includes('MEDIC') || t.includes('MÉDIC')) return 'MEDICAL';
    if (t.includes('PROFES')) return 'PROFESSIONNEL';
    return null;
  };

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const collab = selectedCollab;
      const examens = planningTasks.filter(t => t.category === 'EXAMENS' && t.status === 'REALISE');
      const formations = planningTasks.filter(t => t.category === 'FORMATION_SENSIBILISATION' && t.status === 'REALISE');

      const examensHtml = examens.length > 0 ? examens.map(t => {
        const s = saisies[t.id] || {};
        const exType = getExamenType(t.title) || t.title;
        const resultatColor = s.resultat ? (RESULTAT_COLORS[s.resultat] || '#607D8B') : '#607D8B';
        return `
          <tr>
            <td style="font-weight:bold;font-size:11px;">${exType}</td>
            <td style="font-size:11px;">EXAMEN ANNUEL</td>
            <td style="font-size:11px;">${t.semaine ? 'S' + t.semaine + ' — ' + (() => {
                const d = new Date(t.annee, 0, 1 + (t.semaine - 1) * 7);
                return d.toLocaleDateString('fr-FR');
                })() : ''}</td>
            <td style="font-size:11px;font-weight:bold;color:${resultatColor};">${s.resultat || ''}</td>
            <td style="font-size:11px;">${s.observation || 'RAS'}</td>
          </tr>
        `;
      }).join('') : `<tr><td colspan="5" style="text-align:center;color:#607D8B;font-size:11px;">Aucun examen réalisé</td></tr>`;

      const formationsHtml = formations.length > 0 ? formations.map(t => {
        const s = saisies[t.id] || {};
        return `
          <tr>
            <td style="font-size:11px;">${t.semaine ? 'S' + t.semaine + ' — ' + (() => {
                const d = new Date(t.annee, 0, 1 + (t.semaine - 1) * 7);
                return d.toLocaleDateString('fr-FR');
                })() : ''}</td>
            <td style="font-size:11px;font-weight:bold;">${t.title || ''}</td>
            <td style="font-size:11px;">${s.origineConstatation || ''}</td>
            <td style="font-size:11px;">${s.actionsRealisees || ''}</td>
            <td style="font-size:11px;color:#27AE60;">${s.observation || 'Effectué avec succès'}</td>
          </tr>
        `;
      }).join('') : `<tr><td colspan="5" style="text-align:center;color:#607D8B;font-size:11px;">Aucune formation réalisée</td></tr>`;

      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: Arial, sans-serif; font-size: 11px; color: #1a1a2e; padding: 16px; }
.header-top { display: grid; grid-template-columns: 1fr 2fr 1fr; border: 1px solid #ccc; margin-bottom: 12px; }
.header-cell { padding: 8px 10px; border-right: 1px solid #ccc; font-size: 10px; }
.oncf-logo { color: #C9A84C; font-size: 16px; font-weight: bold; letter-spacing: 2px; }
.title-box { background: #f0f0f0; text-align: center; padding: 8px; font-weight: bold; font-size: 13px; margin-bottom: 10px; }
.id-section { font-weight: bold; text-decoration: underline; font-size: 11px; margin-bottom: 6px; }
table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
th { background: #1E3A5F; color: white; padding: 6px 8px; font-size: 10px; text-align: left; }
td { padding: 5px 8px; border: 1px solid #ddd; vertical-align: middle; }
tr:nth-child(even) td { background: #f9f9f9; }
.info-table td { padding: 5px 8px; border: 1px solid #ccc; }
.info-label { background: #f0f0f0; font-weight: bold; width: 180px; }
.section-title { font-weight: bold; text-decoration: underline; font-size: 11px; margin: 10px 0 6px; }
</style>
</head><body>

<div class="header-top">
  <div class="header-cell">
    <div>Référence : DR.PSC.M1C.VSF.019</div>
    <div style="margin-top:4px;font-weight:bold;">Veille Sécurité Ferroviaire</div>
  </div>
  <div class="header-cell" style="text-align:center;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:4px;">
    <div class="oncf-logo">ONCF</div>
    <div style="font-weight:bold;font-size:12px;">Fiche de Suivi Individuel</div>
  </div>
  <div class="header-cell" style="text-align:right;">
    <div>Pôle Infrastructure &amp; Circulation</div>
    <div style="font-weight:bold;">DRI Centre</div>
  </div>
</div>

<div class="title-box">Fiche de Suivi Individuel</div>

<div class="id-section">Identification du Collaborateur :</div>
<table class="info-table" style="margin-bottom:10px;">
  <tr>
    <td class="info-label">Nom &amp; Prénom :</td>
    <td style="font-weight:bold;">${collab.fullName || ''}</td>
    <td class="info-label">Matricule :</td>
    <td style="font-weight:bold;">${collab.matricule || ''}</td>
  </tr>
  <tr>
    <td class="info-label">Poste :</td>
    <td>${collab.poste || ''}</td>
    <td class="info-label">Site / UP :</td>
    <td>${collab.siteUp || ''}</td>
  </tr>
</table>

<div class="section-title">Examens d'aptitude :</div>
<table>
  <thead>
    <tr>
      <th>Type</th>
      <th>Objet</th>
      <th style="width:90px;">Date</th>
      <th style="width:100px;">Résultat</th>
      <th>Observation</th>
    </tr>
  </thead>
  <tbody>${examensHtml}</tbody>
</table>

<div class="section-title">Autres faits et événements liés à la sécurité : (Contrôle, formation …)</div>
<table>
  <thead>
    <tr>
      <th style="width:90px;">Date</th>
      <th>Faits relevés : écarts et faits positifs</th>
      <th>Origine de constatation</th>
      <th>Actions réalisées / proposées</th>
      <th style="width:100px;">Observation</th>
    </tr>
  </thead>
  <tbody>${formationsHtml}</tbody>
</table>

</body></html>`;

      await generateAndSharePDF(html, { dialogTitle: `Fiche Suivi — ${collab.fullName}` });
    } catch {
      Alert.alert('Erreur', 'Impossible de générer le PDF');
    } finally {
      setGenerating(false);
    }
  };

  // ===== ÉTAPE 0 — Liste des collaborateurs =====
  if (step === 0) {
    const filtered = collaborateurs.filter(c =>
      `${c.fullName} ${c.matricule}`.toLowerCase().includes(search.toLowerCase())
    );
    const getDateFromSemaine = (semaine, annee) => {
    if (!semaine || !annee) return '';
    const date = new Date(annee, 0, 1 + (semaine - 1) * 7);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Fiche de Suivi Individuel</Text>
          <Text style={styles.headerSub}>Sélectionnez un collaborateur</Text>
        </View>

        <View style={styles.searchBox}>
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher par nom ou matricule..."
            placeholderTextColor="#607D8B"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {loading
          ? <ActivityIndicator color="#8E44AD" style={{ marginTop: 40 }} />
          : (
            <ScrollView style={styles.list}>
              {filtered.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyIcon}>👤</Text>
                  <Text style={styles.emptyText}>Aucun collaborateur trouvé</Text>
                </View>
              ) : (
                filtered.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={styles.collabCard}
                    onPress={() => selectCollaborateur(c)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.collabAvatar}>
                      <Text style={styles.collabAvatarText}>{c.fullName?.charAt(0)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.collabName}>{c.fullName}</Text>
                      <Text style={styles.collabMatricule}>{c.matricule}</Text>
                      {c.poste && <Text style={styles.collabPoste}>{c.poste}</Text>}
                    </View>
                    <Text style={styles.arrow}>›</Text>
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

  // ===== ÉTAPE 1 — Fiche du collaborateur =====
  if (step === 1) {
    const examens = planningTasks.filter(t => t.category === 'EXAMENS');
    const formations = planningTasks.filter(t => t.category === 'FORMATION_SENSIBILISATION');
    const getDateFromSemaine = (semaine, annee) => {
    if (!semaine || !annee) return '';
    const date = new Date(annee, 0, 1 + (semaine - 1) * 7);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { setStep(0); setSelectedCollab(null); setSaisies({}); }}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>{selectedCollab?.fullName}</Text>
              <Text style={styles.headerSub}>{selectedCollab?.matricule} · {selectedCollab?.poste}</Text>
            </View>
            <TouchableOpacity
              style={[styles.pdfBtn, generating && { opacity: 0.6 }]}
              onPress={generatePDF}
              disabled={generating}
            >
              {generating
                ? <ActivityIndicator color="#0A1628" size="small" />
                : <Text style={styles.pdfBtnText}>📄 PDF</Text>
              }
            </TouchableOpacity>
          </View>
        </View>

        {loading
          ? <ActivityIndicator color="#8E44AD" style={{ marginTop: 40 }} />
          : (
            <ScrollView style={styles.formContainer}>

              {/* ===== EXAMENS ===== */}
              <View style={styles.sectionBox}>
                <Text style={styles.sectionBoxTitle}>📋 Examens d'aptitude</Text>
                <Text style={styles.sectionBoxSub}>Depuis le planning annuel — saisie disponible si REALISE</Text>

                {examens.length === 0 ? (
                  <View style={styles.rasBox}>
                    <Text style={styles.rasText}>Aucun examen planifié pour {currentYear}</Text>
                  </View>
                ) : (
                  examens.map(task => {
                    const isRealise = task.status === 'REALISE';
                    const exType = getExamenType(task.title) || 'EXAMEN';
                    const resultats = RESULTATS[exType] || ['BON', 'MAUVAIS'];
                    const saisie = saisies[task.id] || {};

                    return (
                      <View key={task.id} style={[styles.taskCard, !isRealise && styles.taskCardDisabled]}>
                        <View style={styles.taskHeader}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.taskTitle}>{task.title}</Text>
                            <Text style={styles.taskDate}>
                            📅 {task.semaine ? `S${task.semaine}` : ''}{task.semaine ? ` — ${getDateFromSemaine(task.semaine, task.annee)}` : ''}
                            {task.dateRealisation ? ` — Réalisé: ${task.dateRealisation}` : ''}
                            </Text>
                          </View>
                          <View style={[styles.statusBadge, {
                            backgroundColor: task.status === 'REALISE' ? '#27AE6020' :
                              task.status === 'PLANIFIE' ? '#4A90D920' : '#E67E2220'
                          }]}>
                            <Text style={[styles.statusText, {
                              color: task.status === 'REALISE' ? '#27AE60' :
                                task.status === 'PLANIFIE' ? '#4A90D9' : '#E67E22'
                            }]}>{task.status}</Text>
                          </View>
                        </View>

                        {!isRealise ? (
                          <View style={styles.lockedBox}>
                            <Text style={styles.lockedText}>🔒 Saisie disponible après réalisation</Text>
                          </View>
                        ) : (
                          <>
                            <Text style={styles.fieldLabel}>Résultat *</Text>
                            <View style={styles.resultatRow}>
                              {resultats.map(r => (
                                <TouchableOpacity
                                  key={r}
                                  style={[styles.resultatBtn, {
                                    backgroundColor: saisie.resultat === r
                                      ? RESULTAT_COLORS[r]
                                      : '#1A2F4A',
                                    borderColor: RESULTAT_COLORS[r],
                                  }]}
                                  onPress={() => updateSaisie(task.id, 'resultat', r)}
                                >
                                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>{r}</Text>
                                </TouchableOpacity>
                              ))}
                            </View>

                            <Text style={styles.fieldLabel}>Observation</Text>
                            <TextInput
                              style={styles.input}
                              placeholder="RAS..."
                              placeholderTextColor="#607D8B"
                              value={saisie.observation || ''}
                              onChangeText={v => updateSaisie(task.id, 'observation', v)}
                            />

                            <TouchableOpacity
                              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                              onPress={() => saveFiche(task)}
                              disabled={saving}
                            >
                              {saving
                                ? <ActivityIndicator color="#0A1628" size="small" />
                                : <Text style={styles.saveBtnText}>💾 Sauvegarder</Text>
                              }
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    );
                  })
                )}
              </View>

              {/* ===== FORMATIONS ===== */}
              <View style={styles.sectionBox}>
                <Text style={styles.sectionBoxTitle}>🎓 Formations et événements</Text>
                <Text style={styles.sectionBoxSub}>Depuis le planning annuel — saisie disponible si REALISE</Text>

                {formations.length === 0 ? (
                  <View style={styles.rasBox}>
                    <Text style={styles.rasText}>Aucune formation planifiée pour {currentYear}</Text>
                  </View>
                ) : (
                  formations.map(task => {
                    const isRealise = task.status === 'REALISE';
                    const saisie = saisies[task.id] || {};

                    return (
                      <View key={task.id} style={[styles.taskCard, !isRealise && styles.taskCardDisabled]}>
                        <View style={styles.taskHeader}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.taskTitle}>{task.title}</Text>
                            <Text style={styles.taskDate}>
                            📅 {task.semaine ? `S${task.semaine}` : ''}{task.semaine ? ` — ${getDateFromSemaine(task.semaine, task.annee)}` : ''}
                            {task.dateRealisation ? ` — Réalisé: ${task.dateRealisation}` : ''}
                            </Text>
                          </View>
                          <View style={[styles.statusBadge, {
                            backgroundColor: task.status === 'REALISE' ? '#27AE6020' :
                              task.status === 'PLANIFIE' ? '#4A90D920' : '#E67E2220'
                          }]}>
                            <Text style={[styles.statusText, {
                              color: task.status === 'REALISE' ? '#27AE60' :
                                task.status === 'PLANIFIE' ? '#4A90D9' : '#E67E22'
                            }]}>{task.status}</Text>
                          </View>
                        </View>

                        {!isRealise ? (
                          <View style={styles.lockedBox}>
                            <Text style={styles.lockedText}>🔒 Saisie disponible après réalisation</Text>
                          </View>
                        ) : (
                          <>
                            <Text style={styles.fieldLabel}>Origine de constatation</Text>
                            <TextInput
                              style={styles.input}
                              placeholder="Ex: Contrôle KN1, Formation IFF..."
                              placeholderTextColor="#607D8B"
                              value={saisie.origineConstatation || ''}
                              onChangeText={v => updateSaisie(task.id, 'origineConstatation', v)}
                            />

                            <Text style={styles.fieldLabel}>Actions réalisées / proposées</Text>
                            <TextInput
                              style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
                              placeholder="Décrivez les actions..."
                              placeholderTextColor="#607D8B"
                              multiline
                              value={saisie.actionsRealisees || ''}
                              onChangeText={v => updateSaisie(task.id, 'actionsRealisees', v)}
                            />

                            <Text style={styles.fieldLabel}>Observation</Text>
                            <TextInput
                              style={styles.input}
                              placeholder="Ex: Effectué avec succès"
                              placeholderTextColor="#607D8B"
                              value={saisie.observation || ''}
                              onChangeText={v => updateSaisie(task.id, 'observation', v)}
                            />

                            <TouchableOpacity
                              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                              onPress={() => saveFiche(task)}
                              disabled={saving}
                            >
                              {saving
                                ? <ActivityIndicator color="#0A1628" size="small" />
                                : <Text style={styles.saveBtnText}>💾 Sauvegarder</Text>
                              }
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    );
                  })
                )}
              </View>

              <View style={{ height: 40 }} />
            </ScrollView>
          )
        }
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A1628' },
  header: {
    backgroundColor: '#0F2137', padding: 20,
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20, marginBottom: 12,
  },
  backText: { color: '#C9A84C', fontSize: 14, marginBottom: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  headerSub: { color: '#607D8B', fontSize: 11, marginTop: 2 },

  searchBox: { paddingHorizontal: 16, marginBottom: 8 },
  searchInput: {
    backgroundColor: '#0F2137', borderWidth: 1, borderColor: '#2A4060',
    borderRadius: 10, padding: 12, color: '#FFFFFF', fontSize: 13,
  },

  list: { paddingHorizontal: 16 },
  formContainer: { paddingHorizontal: 16 },

  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#607D8B', fontSize: 14 },

  collabCard: {
    backgroundColor: '#0F2137', borderRadius: 12,
    padding: 14, marginBottom: 8,
    borderLeftWidth: 4, borderLeftColor: '#8E44AD',
    flexDirection: 'row', alignItems: 'center',
  },
  collabAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#1E3A5F', borderWidth: 1, borderColor: '#8E44AD',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  collabAvatarText: { color: '#8E44AD', fontSize: 18, fontWeight: 'bold' },
  collabName: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold', marginBottom: 2 },
  collabMatricule: { color: '#C9A84C', fontSize: 12, marginBottom: 2 },
  collabPoste: { color: '#607D8B', fontSize: 11 },
  arrow: { color: '#8E44AD', fontSize: 22, fontWeight: 'bold', marginLeft: 8 },

  pdfBtn: {
    backgroundColor: '#C9A84C', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  pdfBtnText: { color: '#0A1628', fontWeight: 'bold', fontSize: 13 },

  sectionBox: {
    backgroundColor: '#0F2137', borderRadius: 12,
    padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#2A4060',
  },
  sectionBoxTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  sectionBoxSub: { color: '#607D8B', fontSize: 11, marginBottom: 12 },

  taskCard: {
    backgroundColor: '#1A2F4A', borderRadius: 10,
    padding: 12, marginBottom: 10,
    borderLeftWidth: 3, borderLeftColor: '#8E44AD',
  },
  taskCardDisabled: {
    opacity: 0.6,
    borderLeftColor: '#607D8B',
  },
  taskHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  taskTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold', marginBottom: 4 },
  taskDate: { color: '#607D8B', fontSize: 11 },

  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginLeft: 8 },
  statusText: { fontSize: 10, fontWeight: 'bold' },

  lockedBox: {
    backgroundColor: '#0A1628', borderRadius: 6,
    padding: 10, alignItems: 'center',
  },
  lockedText: { color: '#607D8B', fontSize: 12 },

  rasBox: {
    backgroundColor: '#1A2F4A', borderRadius: 8,
    padding: 14, alignItems: 'center',
  },
  rasText: { color: '#607D8B', fontSize: 13 },

  fieldLabel: { color: '#B0BEC5', fontSize: 11, marginBottom: 4, marginTop: 10 },
  input: {
    backgroundColor: '#0F2137', borderWidth: 1, borderColor: '#2A4060',
    borderRadius: 8, padding: 10, color: '#FFFFFF', fontSize: 12,
  },

  resultatRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  resultatBtn: {
    flex: 1, paddingVertical: 10,
    borderRadius: 8, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },

  saveBtn: {
    backgroundColor: '#8E44AD', borderRadius: 8,
    padding: 10, alignItems: 'center', marginTop: 10,
  },
  saveBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
});