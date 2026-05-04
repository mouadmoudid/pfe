import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert, Modal, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { API_URL } from '../services/authService';

const RISQUE_API = API_URL.replace('/auth', '/risques');

const canEdit = (role) => ['ADMIN', 'CGPX', 'CSPR', 'CET'].includes(role);

// ===== CRITICITÉ =====
const CRITICITE_CONFIG = {
  C: { label: 'Critique', color: '#E74C3C', bg: '#E74C3C20', border: '#E74C3C' },
  E: { label: 'Élevé',    color: '#E67E22', bg: '#E67E2220', border: '#E67E22' },
  M: { label: 'Modéré',   color: '#F1C40F', bg: '#F1C40F20', border: '#F1C40F' },
  F: { label: 'Faible',   color: '#27AE60', bg: '#27AE6020', border: '#27AE60' },
};

const FACTEURS = ['Facteur humain', 'Environnement', 'Procédure', 'Installation'];

const EMPTY_FORM = {
  facteur: 'Facteur humain',
  lieu: 'LGV',
  danger: '',
  risque: '',
  frequence: '1',
  gravite: '1',
  propositions: '',
};

// Calcul criticité côté front
const calcCriticite = (freq, grav) => {
  const score = parseInt(freq || 1) * parseInt(grav || 1);
  if (score >= 8) return 'C';
  if (score >= 4) return 'E';
  if (score >= 2) return 'M';
  return 'F';
};

export default function CartographieRisquesScreen({ navigation }) {
  const [risques, setRisques] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [search, setSearch] = useState('');
  const [filterCriticite, setFilterCriticite] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [editingRisque, setEditingRisque] = useState(null);
  const [form, setForm] = useState({...EMPTY_FORM});

  const getToken = async () => await AsyncStorage.getItem('token');

  useEffect(() => { loadInitial(); }, []);

  useEffect(() => { applyFilters(); }, [risques, search, filterCriticite]);

  const loadInitial = async () => {
    setLoading(true);
    try {
      const userData = await AsyncStorage.getItem('user');
      setUserRole(userData ? JSON.parse(userData).role : '');
      const token = await getToken();
      const res = await axios.get(RISQUE_API, { headers: { Authorization: `Bearer ${token}` } });
      setRisques(res.data);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger les risques');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let data = [...risques];
    if (filterCriticite !== 'ALL') data = data.filter(r => r.criticite === filterCriticite);
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(r =>
        r.danger?.toLowerCase().includes(q) ||
        r.risque?.toLowerCase().includes(q) ||
        r.facteur?.toLowerCase().includes(q)
      );
    }
    setFiltered(data);
  };

  const openAdd = () => {
    setEditingRisque(null);
    setForm({...EMPTY_FORM});
    setShowModal(true);
  };

  const openEdit = (r) => {
    setEditingRisque(r);
    setForm({
      facteur: r.facteur || 'Facteur humain',
      lieu: r.lieu || 'LGV',
      danger: r.danger || '',
      risque: r.risque || '',
      frequence: String(r.frequence || 1),
      gravite: String(r.gravite || 1),
      propositions: r.propositions || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.danger.trim() || !form.risque.trim()) {
      Alert.alert('Incomplet', 'Le danger et le risque sont obligatoires'); return;
    }
    setSaving(true);
    try {
      const token = await getToken();
      const payload = {
        ...form,
        frequence: parseInt(form.frequence) || 1,
        gravite: parseInt(form.gravite) || 1,
      };
      if (editingRisque) {
        await axios.put(`${RISQUE_API}/${editingRisque.id}`, payload,
          { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await axios.post(RISQUE_API, payload,
          { headers: { Authorization: `Bearer ${token}` } });
      }
      setShowModal(false);
      loadInitial();
    } catch {
      Alert.alert('Erreur', 'Impossible de sauvegarder');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (r) => {
    Alert.alert('Confirmation', `Supprimer ce risque ?\n"${r.danger}"`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive', onPress: async () => {
          try {
            const token = await getToken();
            await axios.delete(`${RISQUE_API}/${r.id}`, { headers: { Authorization: `Bearer ${token}` } });
            loadInitial();
          } catch { Alert.alert('Erreur', 'Impossible de supprimer'); }
        }
      }
    ]);
  };

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const critColor = { C: '#E74C3C', E: '#E67E22', M: '#F1C40F', F: '#27AE60' };
      const critLabel = { C: 'Critique', E: 'Élevé', M: 'Modéré', F: 'Faible' };

      const rows = filtered.map((r, i) => `
        <tr style="background:${i % 2 === 0 ? '#fff' : '#f8f9fa'}">
          <td style="font-size:9px;padding:5px 6px;border:1px solid #ddd;">${r.facteur || ''}</td>
          <td style="font-size:9px;padding:5px 6px;border:1px solid #ddd;">${r.lieu || ''}</td>
          <td style="font-size:9px;padding:5px 6px;border:1px solid #ddd;font-weight:bold;">${r.danger || ''}</td>
          <td style="font-size:9px;padding:5px 6px;border:1px solid #ddd;">${r.risque || ''}</td>
          <td style="font-size:9px;padding:5px 6px;border:1px solid #ddd;text-align:center;">${r.frequence ?? ''}</td>
          <td style="font-size:9px;padding:5px 6px;border:1px solid #ddd;text-align:center;">${r.gravite ?? ''}</td>
          <td style="font-size:9px;padding:5px 6px;border:1px solid #ddd;text-align:center;">
            <span style="background:${critColor[r.criticite] || '#999'};color:white;
              padding:2px 8px;border-radius:4px;font-weight:bold;font-size:9px;">
              ${critLabel[r.criticite] || r.criticite || ''}
            </span>
          </td>
          <td style="font-size:9px;padding:5px 6px;border:1px solid #ddd;">${r.propositions || ''}</td>
        </tr>`).join('');

      // Compteurs par criticité
      const counts = { C: 0, E: 0, M: 0, F: 0 };
      filtered.forEach(r => { if (counts[r.criticite] !== undefined) counts[r.criticite]++; });

      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
* { margin:0;padding:0;box-sizing:border-box; }
body { font-family:Arial,sans-serif;font-size:9px;padding:10px; }
@page { size:A4 landscape;margin:8mm; }
table { width:100%;border-collapse:collapse; }
th { background:#0A1628;color:white;padding:6px;font-size:9px;text-align:left;border:1px solid #ccc; }
</style>
</head><body>
<div style="background:#0A1628;color:white;padding:10px 14px;border-radius:6px;margin-bottom:8px;
  display:flex;justify-content:space-between;align-items:center;">
  <div>
    <div style="font-size:16px;font-weight:bold;color:#C9A84C;letter-spacing:2px;">ONCF</div>
    <div style="font-size:9px;">PIC/DRIC · Arrondissement MI LGV · DT 102V LGV</div>
  </div>
  <div style="text-align:right;">
    <div style="font-weight:bold;font-size:13px;">Cartographie des Risques</div>
    <div style="font-size:9px;color:#C9A84C;">
      ${filtered.length} risques · Généré le ${new Date().toLocaleDateString('fr-FR')}
    </div>
  </div>
</div>

<div style="display:flex;gap:8px;margin-bottom:8px;">
  <div style="background:#E74C3C;color:white;padding:4px 10px;border-radius:4px;font-size:9px;font-weight:bold;">
    Critique : ${counts.C}
  </div>
  <div style="background:#E67E22;color:white;padding:4px 10px;border-radius:4px;font-size:9px;font-weight:bold;">
    Élevé : ${counts.E}
  </div>
  <div style="background:#F1C40F;color:#333;padding:4px 10px;border-radius:4px;font-size:9px;font-weight:bold;">
    Modéré : ${counts.M}
  </div>
  <div style="background:#27AE60;color:white;padding:4px 10px;border-radius:4px;font-size:9px;font-weight:bold;">
    Faible : ${counts.F}
  </div>
</div>

<table>
  <thead>
    <tr>
      <th style="width:9%">Facteur</th>
      <th style="width:5%">Lieu</th>
      <th style="width:12%">Danger</th>
      <th style="width:18%">Risque</th>
      <th style="width:5%">Fréq.</th>
      <th style="width:5%">Grav.</th>
      <th style="width:7%">Criticité</th>
      <th>Propositions d'action</th>
    </tr>
  </thead>
  <tbody>
    ${rows || '<tr><td colspan="8" style="text-align:center;padding:20px;color:#999;">Aucun risque</td></tr>'}
  </tbody>
</table>

<div style="margin-top:10px;display:flex;gap:20px;font-size:8px;color:#607D8B;">
  <div><strong>Échelle Criticité :</strong></div>
  <div style="color:#E74C3C">■ Critique = Fréq × Grav ≥ 8</div>
  <div style="color:#E67E22">■ Élevé = ≥ 4</div>
  <div style="color:#F1C40F">■ Modéré = ≥ 2</div>
  <div style="color:#27AE60">■ Faible = 1</div>
  <div style="margin-left:auto">Établi par le Chef District 102V LGV</div>
</div>
</body></html>`;

      const { uri } = await Print.printToFileAsync({ html, base64: false, width: 842, height: 595 });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Cartographie des Risques',
        UTI: 'com.adobe.pdf',
      });
    } catch {
      Alert.alert('Erreur', 'Impossible de générer le PDF');
    } finally {
      setGenerating(false);
    }
  };

  // Compteurs
  const counts = { C: 0, E: 0, M: 0, F: 0 };
  filtered.forEach(r => { if (counts[r.criticite] !== undefined) counts[r.criticite]++; });

  const previewCriticite = calcCriticite(form.frequence, form.gravite);

  return (
    <SafeAreaView style={styles.safe}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>⚠️ Cartographie des Risques</Text>
            <Text style={styles.headerSub}>{filtered.length} risque(s) · LGV ONCF</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {canEdit(userRole) && (
              <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
                <Text style={styles.addBtnText}>+ Risque</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.pdfBtn, generating && { opacity: 0.6 }]}
              onPress={generatePDF} disabled={generating}>
              {generating
                ? <ActivityIndicator color="#0A1628" size="small" />
                : <Text style={styles.pdfBtnText}>📄 PDF</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* COMPTEURS CRITICITÉ */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.countersScroll}>
        {[
          { key: 'ALL', label: 'Tous', count: filtered.length, color: '#4A90D9', bg: '#4A90D920' },
          { key: 'C', label: 'Critique', count: counts.C, color: '#E74C3C', bg: '#E74C3C20' },
          { key: 'E', label: 'Élevé', count: counts.E, color: '#E67E22', bg: '#E67E2220' },
          { key: 'M', label: 'Modéré', count: counts.M, color: '#F1C40F', bg: '#F1C40F20' },
          { key: 'F', label: 'Faible', count: counts.F, color: '#27AE60', bg: '#27AE6020' },
        ].map(item => (
          <TouchableOpacity
            key={item.key}
            style={[styles.counterChip, {
              backgroundColor: filterCriticite === item.key ? item.color : item.bg,
              borderColor: item.color,
            }]}
            onPress={() => setFilterCriticite(item.key)}
          >
            <Text style={[styles.counterCount, {
              color: filterCriticite === item.key ? '#fff' : item.color
            }]}>{item.count}</Text>
            <Text style={[styles.counterLabel, {
              color: filterCriticite === item.key ? '#fff' : item.color
            }]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* RECHERCHE */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Rechercher danger, risque, facteur..."
          placeholderTextColor="#607D8B"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* LISTE RISQUES */}
      {loading
        ? <ActivityIndicator color="#E74C3C" style={{ marginTop: 40 }} />
        : (
          <ScrollView style={styles.list}>
            {filtered.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyIcon}>⚠️</Text>
                <Text style={styles.emptyText}>Aucun risque trouvé</Text>
                {canEdit(userRole) && (
                  <Text style={styles.emptySubText}>
                    Appuyez sur "+ Risque" pour ajouter une entrée
                  </Text>
                )}
              </View>
            ) : (
              filtered.map(r => {
                const crit = CRITICITE_CONFIG[r.criticite] || CRITICITE_CONFIG.F;
                return (
                  <View key={r.id} style={[styles.risqueCard, { borderLeftColor: crit.color }]}>
                    {/* En-tête carte */}
                    <View style={styles.cardHeader}>
                      <View style={styles.cardHeaderLeft}>
                        <View style={[styles.critBadge, { backgroundColor: crit.bg, borderColor: crit.border }]}>
                          <Text style={[styles.critBadgeText, { color: crit.color }]}>
                            {crit.label}
                          </Text>
                        </View>
                        <Text style={styles.facteurText}>{r.facteur}</Text>
                        <Text style={styles.lieuText}>· {r.lieu}</Text>
                      </View>
                      <View style={styles.scoreBox}>
                        <Text style={styles.scoreLabel}>F×G</Text>
                        <Text style={[styles.scoreValue, { color: crit.color }]}>
                          {r.frequence}×{r.gravite}={r.frequence * r.gravite}
                        </Text>
                      </View>
                    </View>

                    {/* Danger */}
                    <Text style={styles.dangerText}>{r.danger}</Text>

                    {/* Risque */}
                    <View style={styles.risqueRow}>
                      <Text style={styles.risqueLabel}>Risque :</Text>
                      <Text style={styles.risqueText}>{r.risque}</Text>
                    </View>

                    {/* Propositions */}
                    {r.propositions ? (
                      <View style={styles.propositionsBox}>
                        <Text style={styles.propositionsLabel}>💡 Actions</Text>
                        <Text style={styles.propositionsText}>{r.propositions}</Text>
                      </View>
                    ) : null}

                    {/* Actions */}
                    {canEdit(userRole) && (
                      <View style={styles.cardActions}>
                        <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(r)}>
                          <Text style={styles.editBtnText}>✏️ Modifier</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(r)}>
                          <Text style={styles.deleteBtnText}>🗑 Supprimer</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        )}

      {/* MODAL AJOUT / MODIFICATION */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Titre modal */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingRisque ? '✏️ Modifier le risque' : '➕ Nouveau risque'}
                </Text>
                <TouchableOpacity onPress={() => setShowModal(false)}>
                  <Text style={{ color: '#607D8B', fontSize: 20 }}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Preview criticité */}
              <View style={[styles.critPreview, {
                backgroundColor: CRITICITE_CONFIG[previewCriticite]?.bg,
                borderColor: CRITICITE_CONFIG[previewCriticite]?.border,
              }]}>
                <Text style={[styles.critPreviewText, { color: CRITICITE_CONFIG[previewCriticite]?.color }]}>
                  Criticité calculée : {CRITICITE_CONFIG[previewCriticite]?.label}
                  {' '}({form.frequence}×{form.gravite}={parseInt(form.frequence||1)*parseInt(form.gravite||1)})
                </Text>
              </View>

              {/* Facteur */}
              <Text style={styles.fieldLabel}>Facteur *</Text>
              <View style={styles.pickerRow}>
                {FACTEURS.map(f => (
                  <TouchableOpacity
                    key={f}
                    style={[styles.pickerBtn, form.facteur === f && styles.pickerBtnActive]}
                    onPress={() => setForm(p => ({ ...p, facteur: f }))}
                  >
                    <Text style={[styles.pickerBtnText, form.facteur === f && styles.pickerBtnTextActive]}>
                      {f}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Lieu */}
              <Text style={styles.fieldLabel}>Lieu *</Text>
              <TextInput style={styles.input} value={form.lieu}
                onChangeText={v => setForm(p => ({ ...p, lieu: v }))}
                placeholder="Ex: LGV" placeholderTextColor="#607D8B" />

              {/* Danger */}
              <Text style={styles.fieldLabel}>Danger *</Text>
              <TextInput style={styles.input} value={form.danger}
                onChangeText={v => setForm(p => ({ ...p, danger: v }))}
                placeholder="Ex: Accidents de circulation" placeholderTextColor="#607D8B" />

              {/* Risque */}
              <Text style={styles.fieldLabel}>Risque * (description détaillée)</Text>
              <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                value={form.risque} multiline
                onChangeText={v => setForm(p => ({ ...p, risque: v }))}
                placeholder="Ex: Collisions avec des trains..." placeholderTextColor="#607D8B" />

              {/* Fréquence et Gravité */}
              <View style={styles.row2}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Fréquence (1-5) *</Text>
                  <View style={styles.numberRow}>
                    {['1','2','3','4','5'].map(v => (
                      <TouchableOpacity
                        key={v}
                        style={[styles.numberBtn, form.frequence === v && styles.numberBtnActive]}
                        onPress={() => setForm(p => ({ ...p, frequence: v }))}
                      >
                        <Text style={[styles.numberBtnText, form.frequence === v && styles.numberBtnTextActive]}>
                          {v}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Gravité (1-6) *</Text>
                  <View style={styles.numberRow}>
                    {['1','2','3','4','5','6'].map(v => (
                      <TouchableOpacity
                        key={v}
                        style={[styles.numberBtn, form.gravite === v && styles.numberBtnActive]}
                        onPress={() => setForm(p => ({ ...p, gravite: v }))}
                      >
                        <Text style={[styles.numberBtnText, form.gravite === v && styles.numberBtnTextActive]}>
                          {v}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* Légende criticité */}
              <View style={styles.legendeRow}>
                {Object.entries(CRITICITE_CONFIG).map(([k, v]) => (
                  <View key={k} style={[styles.legendeItem, { backgroundColor: v.bg, borderColor: v.border }]}>
                    <Text style={[styles.legendeText, { color: v.color }]}>{v.label}</Text>
                  </View>
                ))}
              </View>

              {/* Propositions */}
              <Text style={styles.fieldLabel}>Propositions d'action</Text>
              <TextInput
                style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                value={form.propositions} multiline
                onChangeText={v => setForm(p => ({ ...p, propositions: v }))}
                placeholder="Actions pour maîtriser le risque..."
                placeholderTextColor="#607D8B"
              />

              {/* Boutons */}
              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                  <Text style={styles.cancelBtnText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                  onPress={handleSave} disabled={saving}
                >
                  {saving
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.saveBtnText}>
                        {editingRisque ? '✅ Mettre à jour' : '✅ Ajouter'}
                      </Text>
                  }
                </TouchableOpacity>
              </View>
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
    backgroundColor: '#0F2137', padding: 20,
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20, marginBottom: 8,
  },
  backText: { color: '#C9A84C', fontSize: 14, marginBottom: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  headerSub: { color: '#607D8B', fontSize: 11, marginTop: 2 },
  addBtn: { backgroundColor: '#E74C3C', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  pdfBtn: { backgroundColor: '#C9A84C', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  pdfBtnText: { color: '#0A1628', fontWeight: 'bold', fontSize: 12 },

  countersScroll: { paddingHorizontal: 12, marginBottom: 6, flexGrow: 0 },
  counterChip: {
    borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8,
    marginRight: 8, alignItems: 'center', minWidth: 70,
  },
  counterCount: { fontSize: 18, fontWeight: 'bold' },
  counterLabel: { fontSize: 10, marginTop: 2 },

  searchContainer: { paddingHorizontal: 12, marginBottom: 8 },
  searchInput: {
    backgroundColor: '#0F2137', borderWidth: 1, borderColor: '#2A4060',
    borderRadius: 10, padding: 10, color: '#FFFFFF', fontSize: 13,
  },

  list: { paddingHorizontal: 12 },
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  emptySubText: { color: '#607D8B', fontSize: 12, marginTop: 6, textAlign: 'center' },

  risqueCard: {
    backgroundColor: '#0F2137', borderRadius: 12, padding: 14,
    marginBottom: 10, borderLeftWidth: 5,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  critBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  critBadgeText: { fontSize: 11, fontWeight: 'bold' },
  facteurText: { color: '#607D8B', fontSize: 11 },
  lieuText: { color: '#607D8B', fontSize: 11 },
  scoreBox: { alignItems: 'center', backgroundColor: '#1A2F4A', borderRadius: 8, padding: 6 },
  scoreLabel: { color: '#607D8B', fontSize: 9 },
  scoreValue: { fontSize: 12, fontWeight: 'bold' },

  dangerText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold', marginBottom: 6 },
  risqueRow: { flexDirection: 'row', marginBottom: 8 },
  risqueLabel: { color: '#607D8B', fontSize: 12, marginRight: 6 },
  risqueText: { color: '#B0BEC5', fontSize: 12, flex: 1, lineHeight: 18 },

  propositionsBox: {
    backgroundColor: '#1A2F4A', borderRadius: 8, padding: 10,
    marginBottom: 8, borderLeftWidth: 3, borderLeftColor: '#27AE60',
  },
  propositionsLabel: { color: '#27AE60', fontSize: 11, fontWeight: 'bold', marginBottom: 4 },
  propositionsText: { color: '#B0BEC5', fontSize: 11, lineHeight: 16 },

  cardActions: { flexDirection: 'row', gap: 8 },
  editBtn: { backgroundColor: '#4A90D920', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#4A90D9' },
  editBtnText: { color: '#4A90D9', fontSize: 12, fontWeight: 'bold' },
  deleteBtn: { backgroundColor: '#E74C3C20', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#E74C3C' },
  deleteBtnText: { color: '#E74C3C', fontSize: 12, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: '#00000090', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: '#0F2137', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: '92%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },

  critPreview: {
    borderRadius: 8, borderWidth: 1, padding: 10, marginBottom: 14, alignItems: 'center',
  },
  critPreviewText: { fontSize: 13, fontWeight: 'bold' },

  fieldLabel: { color: '#B0BEC5', fontSize: 12, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#1A2F4A', borderWidth: 1, borderColor: '#2A4060',
    borderRadius: 8, padding: 10, color: '#FFFFFF', fontSize: 13,
  },

  pickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pickerBtn: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    backgroundColor: '#1A2F4A', borderWidth: 1, borderColor: '#2A4060',
  },
  pickerBtnActive: { backgroundColor: '#E74C3C', borderColor: '#E74C3C' },
  pickerBtnText: { color: '#607D8B', fontSize: 11 },
  pickerBtnTextActive: { color: '#FFFFFF', fontWeight: 'bold' },

  row2: { flexDirection: 'row', gap: 12 },
  numberRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  numberBtn: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: '#1A2F4A', borderWidth: 1, borderColor: '#2A4060',
    alignItems: 'center', justifyContent: 'center',
  },
  numberBtnActive: { backgroundColor: '#E74C3C', borderColor: '#E74C3C' },
  numberBtnText: { color: '#607D8B', fontSize: 14, fontWeight: 'bold' },
  numberBtnTextActive: { color: '#FFFFFF' },

  legendeRow: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  legendeItem: { borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
  legendeText: { fontSize: 10, fontWeight: 'bold' },

  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 16, marginBottom: 8 },
  cancelBtn: { flex: 1, backgroundColor: '#1A2F4A', borderRadius: 10, padding: 14, alignItems: 'center' },
  cancelBtnText: { color: '#607D8B', fontWeight: 'bold' },
  saveBtn: { flex: 2, backgroundColor: '#E74C3C', borderRadius: 10, padding: 14, alignItems: 'center' },
  saveBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
});