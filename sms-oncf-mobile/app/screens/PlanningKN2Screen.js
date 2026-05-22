import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert, Modal, TextInput,
  KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { API_URL } from '../services/authService';

const API = API_URL.replace('/auth', '/pdvs/planning-kn2');

// ================================================================
// CONSTANTES
// ================================================================
const MOIS_LABELS = ['M1','M2','M3','M4','M5','M6','M7','M8','M9','M10','M11','M12'];
const MOIS_NOMS   = ['Jan','Fév','Mar','Avr','Mai','Jun',
                     'Jul','Aoû','Sep','Oct','Nov','Déc'];

const STATUTS = ['', 'P', 'R', 'PR'];

const STATUT_STYLE = {
  '':   { bg: '#1A2F4A', border: '#2A4060', text: '#607D8B', label: '—'  },
  'P':  { bg: '#1A2F4A', border: '#3498DB', text: '#85C1E9', label: 'P'  },
  'R':  { bg: '#1A3A28', border: '#27AE60', text: '#82E0AA', label: 'R'  },
  'PR': { bg: '#2D1B4A', border: '#9B59B6', text: '#D7BDE2', label: 'PR' },
};

const TYPE_COLORS = {
  CDT:  '#E74C3C',
  KN1:  '#3498DB',
  MGMT: '#F39C12',
  TECH: '#9B59B6',
};

const TYPES = ['CDT', 'KN1', 'MGMT', 'TECH'];

const canEdit = (role) => role === 'CSPR' || role === 'ADMIN';
const isCGPX  = (role) => role === 'CGPX';

const EMPTY_FORM = {
  objet: '', ctEntite: '', type: 'CDT',
  m1:'',m2:'',m3:'',m4:'',m5:'',m6:'',
  m7:'',m8:'',m9:'',m10:'',m11:'',m12:'',
};

// ================================================================
// COMPOSANT CELLULE MOIS
// ================================================================
function MoisCell({ value, onChange, disabled, moisLabel, moisNom }) {
  const st = STATUT_STYLE[value || ''];
  const nextStatut = () => {
    const idx = STATUTS.indexOf(value || '');
    return STATUTS[(idx + 1) % STATUTS.length];
  };

  return (
    <TouchableOpacity
      disabled={disabled}
      onPress={() => onChange && onChange(nextStatut())}
      style={[pk.moisCell,
        { backgroundColor: st.bg, borderColor: st.border },
        disabled && { opacity: 0.7 }]}>
      <Text style={[pk.moisCellLabel, { color: '#607D8B' }]}>{moisNom}</Text>
      <Text style={[pk.moisCellValue, { color: st.text }]}>{st.label}</Text>
    </TouchableOpacity>
  );
}

// ================================================================
// COMPOSANT BADGE TYPE
// ================================================================
function TypeBadge({ type }) {
  const color = TYPE_COLORS[type] || '#607D8B';
  return (
    <View style={[pk.typeBadge, { borderColor: color, backgroundColor: color + '20' }]}>
      <Text style={[pk.typeBadgeText, { color }]}>{type}</Text>
    </View>
  );
}

// ================================================================
// ÉCRAN PRINCIPAL
// ================================================================
export default function PlanningKN2Screen({ navigation }) {
  const [selectedAnnee, setSelectedAnnee]   = useState(new Date().getFullYear());
  const [annees, setAnnees]                 = useState([new Date().getFullYear()]);
  const [data, setData]                     = useState([]);
  const [loading, setLoading]               = useState(false);
  const [saving, setSaving]                 = useState(false);
  const [generating, setGenerating]         = useState(false);
  const [userRole, setUserRole]             = useState('');
  const [userEntite, setUserEntite]         = useState('');
  const [step, setStep]                     = useState(0); // 0=année, 1=planning
  const [editing, setEditing]               = useState(null);
  const [form, setForm]                     = useState({ ...EMPTY_FORM });
  // null | 'editRow' | 'addRow' | 'typeSelect'
  const [modalView, setModalView]           = useState(null);

  const getToken = async () => await AsyncStorage.getItem('token');
  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => { loadInitial(); }, []);

  const loadInitial = async () => {
    setLoading(true);
    try {
      const ud = await AsyncStorage.getItem('user');
      if (ud) { const u = JSON.parse(ud); setUserRole(u.role||''); setUserEntite(u.entite||''); }
      const token = await getToken();
      const res = await axios.get(`${API}/annees`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data?.length > 0) setAnnees(res.data);
    } catch {}
    finally { setLoading(false); }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await axios.get(`${API}?annee=${selectedAnnee}`,
        { headers: { Authorization: `Bearer ${token}` } });
      setData(res.data);
      setStep(1);
    } catch { Alert.alert('Erreur', 'Impossible de charger les données'); }
    finally { setLoading(false); }
  };

  // Toggle rapide d'une cellule mois directement dans le tableau
  const toggleMois = async (item, moisKey) => {
    if (!canEdit(userRole)) return;
    const current = item[moisKey] || '';
    const idx = STATUTS.indexOf(current);
    const next = STATUTS[(idx + 1) % STATUTS.length];
    try {
      const token = await getToken();
      const updated = { ...item, [moisKey]: next };
      await axios.put(`${API}/${item.id}`, updated,
        { headers: { Authorization: `Bearer ${token}` } });
      setData(prev => prev.map(d => d.id === item.id
        ? { ...d, [moisKey]: next } : d));
    } catch { Alert.alert('Erreur', 'Impossible de mettre à jour'); }
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      objet: item.objet || '', ctEntite: item.ctEntite || '', type: item.type || 'CDT',
      m1: item.m1||'', m2: item.m2||'', m3: item.m3||'', m4: item.m4||'',
      m5: item.m5||'', m6: item.m6||'', m7: item.m7||'', m8: item.m8||'',
      m9: item.m9||'', m10: item.m10||'', m11: item.m11||'', m12: item.m12||'',
    });
    setModalView('editRow');
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setModalView('addRow');
  };

  const closeModal = () => { setModalView(null); setEditing(null); };

  const handleSave = async () => {
    if (!form.objet.trim()) {
      Alert.alert('Incomplet', 'L\'objet est obligatoire'); return;
    }
    setSaving(true);
    try {
      const token = await getToken();
      const payload = { ...form, annee: selectedAnnee, entiteCSPR: userEntite };
      if (editing) {
        await axios.put(`${API}/${editing.id}`, payload,
          { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await axios.post(API, payload,
          { headers: { Authorization: `Bearer ${token}` } });
      }
      closeModal();
      loadData();
    } catch (e) {
      Alert.alert('Erreur', e.response?.data || 'Impossible de sauvegarder.');
    } finally { setSaving(false); }
  };

  const handleDelete = (item) => {
    Alert.alert('Supprimer', `Supprimer "${item.objet}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        try {
          const token = await getToken();
          await axios.delete(`${API}/${item.id}`,
            { headers: { Authorization: `Bearer ${token}` } });
          loadData();
        } catch { Alert.alert('Erreur', 'Impossible de supprimer'); }
      }},
    ]);
  };

  // Grouper les lignes par type pour l'affichage
  const grouped = TYPES.reduce((acc, t) => {
    acc[t] = data.filter(d => d.type === t);
    return acc;
  }, {});

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const statutBg = { P: '#d6eaf8', R: '#d5f5e3', PR: '#e8daef', '': '#f8f9fa' };

      const allRows = data.map((d, i) => {
        const moisCells = MOIS_LABELS.map(m => {
          const v = d[m.toLowerCase()] || '';
          return `<td style="text-align:center;background:${statutBg[v]||'#fff'};
            font-weight:bold;font-size:8px">${v||'—'}</td>`;
        }).join('');
        const tc = TYPE_COLORS[d.type] || '#607D8B';
        return `<tr style="background:${i%2===0?'#fff':'#f8f9fa'}">
          <td>${i+1}</td>
          <td><b>${d.objet}</b></td>
          <td>${d.ctEntite||''}</td>
          <td style="color:${tc};font-weight:bold;text-align:center">${d.type}</td>
          ${moisCells}
        </tr>`;
      }).join('');

      const moisHeaders = MOIS_LABELS.map((m, i) =>
        `<th style="min-width:28px">${MOIS_NOMS[i]}</th>`).join('');

      const legendeHTML = Object.entries(STATUT_STYLE).filter(([k]) => k).map(([k, v]) =>
        `<span style="background:${v.bg};color:${v.text};border:1px solid ${v.border};
          padding:2px 6px;border-radius:4px;margin-right:6px;font-size:8px">
          <b>${k}</b></span>`).join('');

      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
* { margin:0;padding:0;box-sizing:border-box; }
body { font-family:Arial,sans-serif;font-size:8px;padding:8px; }
@page { size:A4 landscape;margin:5mm; }
h2 { font-size:11px;color:#0A1628;margin-bottom:2px; }
p { font-size:8px;color:#607D8B;margin-bottom:4px; }
.legende { margin-bottom:6px; }
table { width:100%;border-collapse:collapse; }
th { background:#0A1628;color:#fff;padding:3px 2px;font-size:7px;
     border:1px solid #ccc;text-align:left; }
td { font-size:7px;padding:2px;border:1px solid #ddd;vertical-align:middle; }
</style></head><body>
<h2>Planning KN2 – ${userEntite} – ${selectedAnnee}</h2>
<p>${data.length} activité(s) · Généré le ${new Date().toLocaleDateString('fr-FR')}</p>
<div class="legende">${legendeHTML}</div>
<table><thead><tr>
  <th>N°</th><th>Objet</th><th>CT/Entité</th><th>Type</th>
  ${moisHeaders}
</tr></thead><tbody>${allRows}</tbody></table>
</body></html>`;

      const { uri } = await Print.printToFileAsync({ html, base64: false, width: 842, height: 595 });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Planning KN2 — ${selectedAnnee}`,
        UTI: 'com.adobe.pdf',
      });
    } catch { Alert.alert('Erreur', 'Impossible de générer le PDF'); }
    finally { setGenerating(false); }
  };

  // ================================================================
  // ÉTAPE 0 — Sélection année
  // ================================================================
  if (step === 0) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={s.backText}>← Retour</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>📅 Planning KN2</Text>
          <Text style={s.headerSub}>Planning annuel · M1 → M12</Text>
        </View>

        {loading ? <ActivityIndicator color="#C9A84C" style={{ marginTop: 40 }} /> : (
          <ScrollView style={s.list}>
            <Text style={s.sectionLabel}>Année</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 20 }}>
              {annees.map(a => (
                <TouchableOpacity key={a}
                  style={[s.chipBtn, selectedAnnee === a && s.chipBtnActive]}
                  onPress={() => setSelectedAnnee(a)}>
                  <Text style={[s.chipText, selectedAnnee === a && s.chipTextActive]}>{a}</Text>
                </TouchableOpacity>
              ))}
              {canEdit(userRole) && (
                <TouchableOpacity style={[s.chipBtn, { borderColor: '#C9A84C' }]}
                  onPress={() => {
                    const newY = Math.max(...annees) + 1;
                    setAnnees(p => [newY, ...p]); setSelectedAnnee(newY);
                  }}>
                  <Text style={[s.chipText, { color: '#C9A84C' }]}>
                    + {Math.max(...annees) + 1}
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            {/* Légende statuts */}
            <Text style={s.sectionLabel}>Légende</Text>
            <View style={pk.legendeRow}>
              {Object.entries(STATUT_STYLE).filter(([k]) => k).map(([k, v]) => (
                <View key={k} style={[pk.legendeItem,
                  { backgroundColor: v.bg, borderColor: v.border }]}>
                  <Text style={[pk.legendeText, { color: v.text }]}>
                    {k === 'P' ? 'P = Planifié' :
                     k === 'R' ? 'R = Réalisé' : 'PR = Planifié + Réalisé'}
                  </Text>
                </View>
              ))}
            </View>

            {userEntite ? (
              <View style={s.entiteBox}>
                <Text style={s.entiteLabel}>Votre périmètre</Text>
                <Text style={s.entiteValue}>{userEntite}</Text>
              </View>
            ) : null}

            <TouchableOpacity style={s.confirmBtn} onPress={loadData}>
              <Text style={s.confirmBtnText}>Consulter {selectedAnnee} →</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </SafeAreaView>
    );
  }

  // ================================================================
  // ÉTAPE 1 — Planning
  // ================================================================
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => { setStep(0); setData([]); }}>
          <Text style={s.backText}>← Retour</Text>
        </TouchableOpacity>
        <View style={s.headerRow}>
          <View>
            <Text style={s.headerTitle}>Planning KN2 — {selectedAnnee}</Text>
            <Text style={s.headerSub}>{data.length} activité(s) · {userEntite}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {canEdit(userRole) && (
              <TouchableOpacity style={s.addBtn} onPress={openAdd}>
                <Text style={s.addBtnText}>+ Ligne</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[s.pdfBtn, generating && { opacity: 0.5 }]}
              onPress={generatePDF} disabled={generating}>
              {generating
                ? <ActivityIndicator color="#C9A84C" size="small" />
                : <Text style={s.pdfBtnText}>PDF</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {isCGPX(userRole) && (
        <View style={s.readOnlyBanner}>
          <Text style={s.readOnlyText}>👁 Lecture seule — {userEntite}</Text>
        </View>
      )}

      {loading ? <ActivityIndicator color="#C9A84C" style={{ marginTop: 40 }} /> : (
        <ScrollView style={s.list}>
          {data.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={s.emptyIcon}>📅</Text>
              <Text style={s.emptyText}>Aucun planning pour {selectedAnnee}</Text>
              {canEdit(userRole) && (
                <Text style={s.emptySub}>
                  Les lignes seront initialisées automatiquement
                </Text>
              )}
            </View>
          ) : (
            TYPES.map(type => {
              const lignes = grouped[type];
              if (!lignes?.length) return null;
              const color = TYPE_COLORS[type];
              return (
                <View key={type} style={{ marginBottom: 16 }}>
                  {/* En-tête groupe */}
                  <View style={[pk.groupHeader, { borderLeftColor: color }]}>
                    <TypeBadge type={type} />
                    <Text style={pk.groupTitle}>
                      {type === 'CDT' ? 'KN2 Trimestriel CDT' :
                       type === 'KN1' ? 'KN2 Champ KN1' :
                       type === 'MGMT' ? 'Contrôle Management' :
                       'Veille Technique'}
                    </Text>
                    <Text style={pk.groupCount}>{lignes.length} ligne(s)</Text>
                  </View>

                  {/* Lignes du groupe */}
                  {lignes.map((item, idx) => (
                    <View key={item.id} style={s.card}>
                      {/* Info ligne */}
                      <View style={pk.rowInfo}>
                        <View style={s.numBadge}>
                          <Text style={[s.numText, { color }]}>{idx + 1}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.cardName}>{item.objet}</Text>
                          <Text style={s.cardSub}>{item.ctEntite}</Text>
                        </View>
                        {canEdit(userRole) && (
                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            <TouchableOpacity style={s.editBtn}
                              onPress={() => openEdit(item)}>
                              <Text style={s.editBtnText}>✏️</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={s.deleteBtn}
                              onPress={() => handleDelete(item)}>
                              <Text style={s.deleteBtnText}>🗑</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>

                      {/* Grille mois — scrollable horizontalement */}
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}
                        style={{ marginTop: 10 }}>
                        <View style={{ flexDirection: 'row', gap: 4 }}>
                          {MOIS_LABELS.map((m, mi) => (
                            <MoisCell
                              key={m}
                              value={item[m.toLowerCase()]}
                              moisLabel={m}
                              moisNom={MOIS_NOMS[mi]}
                              disabled={!canEdit(userRole)}
                              onChange={(val) => toggleMois(item, m.toLowerCase())}
                            />
                          ))}
                        </View>
                      </ScrollView>

                      {/* Compteur P / R */}
                      <View style={pk.compteurRow}>
                        {['P', 'R', 'PR'].map(st => {
                          const count = MOIS_LABELS.filter(m =>
                            item[m.toLowerCase()] === st).length;
                          if (!count) return null;
                          const stStyle = STATUT_STYLE[st];
                          return (
                            <View key={st} style={[pk.compteurBadge,
                              { backgroundColor: stStyle.bg, borderColor: stStyle.border }]}>
                              <Text style={[pk.compteurText, { color: stStyle.text }]}>
                                {st} : {count}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  ))}
                </View>
              );
            })
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ================================================================
          MODAL — null | 'editRow' | 'addRow' | 'typeSelect'
      ================================================================ */}
      <Modal
        visible={modalView !== null}
        transparent animationType="slide"
        statusBarTranslucent
        onRequestClose={() => {
          if (modalView === 'typeSelect') setModalView(editing ? 'editRow' : 'addRow');
          else closeModal();
        }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}>
          <View style={s.modalOverlay}>

            {/* ── Sélecteur type ── */}
            {modalView === 'typeSelect' && (
              <View style={[s.modalBox, { maxHeight: '50%' }]}>
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>🏷️ Type d'activité</Text>
                  <TouchableOpacity onPress={() =>
                    setModalView(editing ? 'editRow' : 'addRow')}>
                    <Text style={s.closeBtn}>✕</Text>
                  </TouchableOpacity>
                </View>
                {TYPES.map(t => {
                  const color = TYPE_COLORS[t];
                  return (
                    <TouchableOpacity key={t}
                      style={[pk.typeItem,
                        form.type === t && { borderColor: color, backgroundColor: color+'15' }]}
                      onPress={() => {
                        setF('type', t);
                        setModalView(editing ? 'editRow' : 'addRow');
                      }}>
                      <TypeBadge type={t} />
                      <Text style={[pk.typeItemText,
                        form.type === t && { color }]}>
                        {t === 'CDT' ? 'KN2 Trimestriel CDT' :
                         t === 'KN1' ? 'KN2 Champ KN1' :
                         t === 'MGMT' ? 'Contrôle Management' :
                         'Veille Technique'}
                      </Text>
                      {form.type === t && <Text style={{ color }}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* ── Formulaire édition / ajout ── */}
            {(modalView === 'editRow' || modalView === 'addRow') && (
              <View style={s.modalBox}>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={s.modalHeader}>
                    <Text style={s.modalTitle}>
                      {editing ? '✏️ Modifier la ligne' : '➕ Nouvelle ligne'}
                    </Text>
                    <TouchableOpacity onPress={closeModal}>
                      <Text style={s.closeBtn}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Identification */}
                  <Text style={s.sectionTitle}>Identification</Text>

                  <Text style={s.fieldLabel}>Objet *</Text>
                  <TextInput style={s.input}
                    value={form.objet}
                    onChangeText={v => setF('objet', v)}
                    placeholder="Ex: KN2 trimestriel CDT"
                    placeholderTextColor="#607D8B" />

                  <Text style={s.fieldLabel}>CT / Entité</Text>
                  <TextInput style={s.input}
                    value={form.ctEntite}
                    onChangeText={v => setF('ctEntite', v)}
                    placeholder="Ex: CDT 101V / Tous DT"
                    placeholderTextColor="#607D8B" />

                  <Text style={s.fieldLabel}>Type</Text>
                  <TouchableOpacity
                    style={[s.input, {
                      flexDirection: 'row', justifyContent: 'space-between',
                      alignItems: 'center',
                      borderColor: TYPE_COLORS[form.type] || '#2A4060',
                    }]}
                    onPress={() => setModalView('typeSelect')}>
                    <TypeBadge type={form.type} />
                    <Text style={{ color: '#C9A84C' }}>›</Text>
                  </TouchableOpacity>

                  {/* Mois */}
                  <Text style={s.sectionTitle}>Planification M1 → M12</Text>
                  <Text style={[s.fieldLabel, { marginBottom: 10 }]}>
                    Appuyer sur chaque mois pour changer le statut : — → P → R → PR
                  </Text>

                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {MOIS_LABELS.map((m, mi) => (
                      <MoisCell key={m}
                        value={form[m.toLowerCase()]}
                        moisLabel={m}
                        moisNom={MOIS_NOMS[mi]}
                        onChange={val => setF(m.toLowerCase(), val)}
                      />
                    ))}
                  </View>

                  {/* Boutons */}
                  <View style={s.modalBtns}>
                    <TouchableOpacity style={s.cancelBtn} onPress={closeModal}>
                      <Text style={s.cancelBtnText}>Annuler</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.saveBtn, saving && { opacity: 0.5 }]}
                      onPress={handleSave} disabled={saving}>
                      {saving
                        ? <ActivityIndicator color="#0A1628" size="small" />
                        : <Text style={s.saveBtnText}>
                            {editing ? '✅ Mettre à jour' : '✅ Enregistrer'}
                          </Text>}
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            )}

          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ================================================================
// STYLES
// ================================================================
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A1628' },
  header: {
    backgroundColor: '#0F2137', padding: 20,
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20, marginBottom: 12,
  },
  backText: { color: '#C9A84C', fontSize: 14, marginBottom: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  headerSub: { color: '#607D8B', fontSize: 11, marginTop: 2 },
  list: { paddingHorizontal: 14 },
  sectionLabel: { color: '#C9A84C', fontWeight: 'bold', fontSize: 13, marginBottom: 8 },
  chipBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#0F2137', borderWidth: 1, borderColor: '#2A4060', marginRight: 8,
  },
  chipBtnActive: { backgroundColor: '#C9A84C', borderColor: '#C9A84C' },
  chipText: { color: '#607D8B', fontWeight: 'bold' },
  chipTextActive: { color: '#0A1628' },
  entiteBox: {
    backgroundColor: '#0F2137', borderRadius: 10, padding: 14,
    marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#C9A84C',
  },
  entiteLabel: { color: '#607D8B', fontSize: 11 },
  entiteValue: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold', marginTop: 2 },
  confirmBtn: {
    backgroundColor: '#C9A84C', borderRadius: 12, padding: 16,
    alignItems: 'center', marginBottom: 20,
  },
  confirmBtnText: { color: '#0A1628', fontWeight: 'bold', fontSize: 15 },
  addBtn: {
    backgroundColor: '#C9A84C', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
  },
  addBtnText: { color: '#0A1628', fontWeight: 'bold', fontSize: 12 },
  pdfBtn: {
    backgroundColor: '#1E3A5F', borderRadius: 8, paddingHorizontal: 12,
    paddingVertical: 8, borderWidth: 1, borderColor: '#C9A84C',
  },
  pdfBtnText: { color: '#C9A84C', fontWeight: 'bold', fontSize: 12 },
  readOnlyBanner: {
    backgroundColor: '#1A2F4A', marginHorizontal: 14, marginBottom: 8,
    borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#4A90D9',
  },
  readOnlyText: { color: '#85C1E9', fontSize: 12, fontWeight: '600' },
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  emptySub: { color: '#607D8B', fontSize: 12, marginTop: 6, textAlign: 'center' },
  card: { backgroundColor: '#0F2137', borderRadius: 12, padding: 12, marginBottom: 8 },
  numBadge: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: '#1E3A5F',
    borderWidth: 1, borderColor: '#2A4060', alignItems: 'center',
    justifyContent: 'center', marginRight: 8,
  },
  numText: { fontSize: 11, fontWeight: 'bold' },
  cardName: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold' },
  cardSub: { color: '#607D8B', fontSize: 10, marginTop: 2 },
  editBtn: {
    backgroundColor: '#4A90D920', borderRadius: 8, padding: 8,
    borderWidth: 1, borderColor: '#4A90D9',
  },
  editBtnText: { fontSize: 14 },
  deleteBtn: {
    backgroundColor: '#E74C3C20', borderRadius: 8, padding: 8,
    borderWidth: 1, borderColor: '#E74C3C',
  },
  deleteBtnText: { fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: '#00000090', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: '#0F2137', borderTopLeftRadius: 24,
    borderTopRightRadius: 24, padding: 24, maxHeight: '93%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  },
  modalTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  closeBtn: { color: '#607D8B', fontSize: 20 },
  sectionTitle: {
    color: '#C9A84C', fontSize: 12, fontWeight: 'bold',
    marginTop: 16, marginBottom: 8,
    borderBottomWidth: 1, borderBottomColor: '#2A4060', paddingBottom: 4,
  },
  fieldLabel: { color: '#B0BEC5', fontSize: 12, marginBottom: 4, marginTop: 8 },
  input: {
    backgroundColor: '#1A2F4A', borderWidth: 1, borderColor: '#2A4060',
    borderRadius: 8, padding: 10, color: '#FFFFFF', fontSize: 13,
  },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 20, marginBottom: 8 },
  cancelBtn: {
    flex: 1, backgroundColor: '#1A2F4A', borderRadius: 10, padding: 14, alignItems: 'center',
  },
  cancelBtnText: { color: '#607D8B', fontWeight: 'bold' },
  saveBtn: {
    flex: 2, backgroundColor: '#C9A84C', borderRadius: 10, padding: 14, alignItems: 'center',
  },
  saveBtnText: { color: '#0A1628', fontWeight: 'bold', fontSize: 14 },
});

const pk = StyleSheet.create({
  legendeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  legendeItem: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1,
  },
  legendeText: { fontSize: 11, fontWeight: '600' },
  groupHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#0F2137', borderRadius: 10, padding: 10,
    marginBottom: 6, borderLeftWidth: 4,
  },
  groupTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold', flex: 1 },
  groupCount: { color: '#607D8B', fontSize: 11 },
  rowInfo: { flexDirection: 'row', alignItems: 'center' },
  moisCell: {
    width: 44, height: 52, borderRadius: 8, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center', gap: 2,
  },
  moisCellLabel: { fontSize: 9, fontWeight: '600' },
  moisCellValue: { fontSize: 13, fontWeight: 'bold' },
  compteurRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  compteurBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1,
  },
  compteurText: { fontSize: 10, fontWeight: 'bold' },
  typeBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1,
  },
  typeBadgeText: { fontSize: 11, fontWeight: 'bold' },
  typeItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#1A2F4A', borderRadius: 8, padding: 14,
    marginBottom: 6, borderWidth: 1, borderColor: '#2A4060',
  },
  typeItemText: { color: '#B0BEC5', fontSize: 13, flex: 1 },
});
