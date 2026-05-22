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

const API = API_URL.replace('/auth', '/pdvs/controle-mgmt');

// ================================================================
// CONSTANTES
// ================================================================
const COTATIONS_SAMI = ['S', 'A', 'M', 'I'];

const COTATION_COLORS = {
  S: { bg: '#1A3A28', border: '#27AE60', text: '#82E0AA' },
  A: { bg: '#1A2F4A', border: '#3498DB', text: '#85C1E9' },
  M: { bg: '#3A2800', border: '#F39C12', text: '#FAD7A0' },
  I: { bg: '#3A0E0E', border: '#E74C3C', text: '#F1948A' },
};

// Colonnes par entité CSPR — chaque CDT a C1 et C2
const CSPR_COLONNES = {
  'CT Voie': [
    { key: 'cdt101v', label: 'CDT 101V'     },
    { key: 'cdt102v', label: 'CDT 102V'     },
    { key: 'cdtOa',   label: 'CDT OA OH OT' },
  ],
  'CT CSS': [
    { key: 'cdt101lc',  label: 'CDT 101LC'  },
    { key: 'cdt101sst', label: 'CDT 101SST' },
  ],
};

const TOUTES_COLONNES = [
  { key: 'cdt101v',   label: 'CDT 101V'     },
  { key: 'cdt102v',   label: 'CDT 102V'     },
  { key: 'cdtOa',     label: 'CDT OA OH OT' },
  { key: 'cdt101lc',  label: 'CDT 101LC'    },
  { key: 'cdt101sst', label: 'CDT 101SST'   },
];

const canEdit = (role) => role === 'CSPR' || role === 'ADMIN';
const isCGPX  = (role) => role === 'CGPX';

const EMPTY_FORM = {
  theme: '', processus: '',
  cdt101vC1:'', cdt101vC2:'',
  cdt102vC1:'', cdt102vC2:'',
  cdtOaC1:'',   cdtOaC2:'',
  cdt101lcC1:'',cdt101lcC2:'',
  cdt101sstC1:'',cdt101sstC2:'',
  actions: '',
};

// ================================================================
// COMPOSANTS
// ================================================================
function CotationSelector({ value, onChange, disabled }) {
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {COTATIONS_SAMI.map(c => {
        const col = COTATION_COLORS[c];
        const active = value === c;
        return (
          <TouchableOpacity key={c}
            disabled={disabled}
            style={[cm.cotBtn, { borderColor: col.border },
              active && { backgroundColor: col.bg },
              disabled && { opacity: 0.5 }]}
            onPress={() => onChange && onChange(active ? '' : c)}>
            <Text style={[cm.cotBtnText,
              { color: active ? col.text : col.border }]}>{c}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function CotationBadge({ value }) {
  if (!value) return <Text style={cm.emptyBadge}>—</Text>;
  const col = COTATION_COLORS[value];
  return (
    <View style={[cm.badge,
      { backgroundColor: col.bg, borderColor: col.border }]}>
      <Text style={[cm.badgeText, { color: col.text }]}>{value}</Text>
    </View>
  );
}

// ================================================================
// ÉCRAN PRINCIPAL
// ================================================================
export default function ControleMgmtScreen({ navigation }) {
  const [selectedAnnee, setSelectedAnnee] = useState(new Date().getFullYear());
  const [annees, setAnnees]   = useState([new Date().getFullYear()]);
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [generating, setGenerating] = useState(false);
  const [userRole, setUserRole]   = useState('');
  const [userEntite, setUserEntite] = useState('');
  const [step, setStep]       = useState(0);
  const [editing, setEditing] = useState(null);
  const [form, setForm]       = useState({ ...EMPTY_FORM });
  // null | 'form'
  const [modalView, setModalView] = useState(null);

  const getToken = async () => await AsyncStorage.getItem('token');
  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => { loadInitial(); }, []);

  const loadInitial = async () => {
    setLoading(true);
    try {
      const ud = await AsyncStorage.getItem('user');
      if (ud) {
        const u = JSON.parse(ud);
        setUserRole(u.role || '');
        setUserEntite(u.entite || '');
      }
      const token = await getToken();
      const res = await axios.get(`${API}/annees`,
        { headers: { Authorization: `Bearer ${token}` } });
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

  const colonnes = userRole === 'CSPR'
    ? (CSPR_COLONNES[userEntite] || TOUTES_COLONNES)
    : TOUTES_COLONNES;

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      theme:       item.theme || '',
      processus:   item.processus || '',
      cdt101vC1:   item.cdt101vC1 || '',
      cdt101vC2:   item.cdt101vC2 || '',
      cdt102vC1:   item.cdt102vC1 || '',
      cdt102vC2:   item.cdt102vC2 || '',
      cdtOaC1:     item.cdtOaC1 || '',
      cdtOaC2:     item.cdtOaC2 || '',
      cdt101lcC1:  item.cdt101lcC1 || '',
      cdt101lcC2:  item.cdt101lcC2 || '',
      cdt101sstC1: item.cdt101sstC1 || '',
      cdt101sstC2: item.cdt101sstC2 || '',
      actions:     item.actions || '',
    });
    setModalView('form');
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setModalView('form');
  };

  const closeModal = () => { setModalView(null); setEditing(null); };

  // Cotation globale — pire valeur de tous les C1+C2
  const cotationGlobale = (item) => {
    const vals = colonnes.flatMap(c =>
      [item[`${c.key}C1`], item[`${c.key}C2`]]).filter(Boolean);
    if (vals.includes('I')) return 'I';
    if (vals.includes('M')) return 'M';
    if (vals.includes('A')) return 'A';
    if (vals.includes('S')) return 'S';
    return '';
  };

  const handleSave = async () => {
    if (!form.theme.trim()) {
      Alert.alert('Incomplet', 'Le thème est obligatoire'); return;
    }
    setSaving(true);
    try {
      const token = await getToken();
      const payload = {
        ...form, annee: selectedAnnee, entiteCSPR: userEntite,
      };
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
    Alert.alert('Supprimer', `Supprimer "${item.theme}" ?`, [
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

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const cotBg = (v) => {
        const m = { S:'#d5f5e3',A:'#d6eaf8',M:'#fef9e7',I:'#fadbd8' };
        return v ? m[v] : '#f8f9fa';
      };

      const colHeaders = colonnes.flatMap(c => [
        `<th style="text-align:center">${c.label}<br>C1</th>`,
        `<th style="text-align:center">${c.label}<br>C2</th>`,
      ]).join('');

      const rows = data.map((d, i) => {
        const cells = colonnes.flatMap(c => {
          const v1 = d[`${c.key}C1`]||'';
          const v2 = d[`${c.key}C2`]||'';
          return [
            `<td style="text-align:center;background:${cotBg(v1)};font-weight:bold">${v1||'—'}</td>`,
            `<td style="text-align:center;background:${cotBg(v2)};font-weight:bold">${v2||'—'}</td>`,
          ];
        }).join('');
        return `<tr style="background:${i%2===0?'#fff':'#f8f9fa'}">
          <td>${i+1}</td>
          <td><b>${d.theme}</b></td>
          <td style="font-size:7px">${d.processus||''}</td>
          ${cells}
          <td style="font-size:7px">${d.actions||''}</td>
        </tr>`;
      }).join('');

      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
* { margin:0;padding:0;box-sizing:border-box; }
body { font-family:Arial,sans-serif;font-size:8px;padding:8px; }
@page { size:A4 landscape;margin:5mm; }
h2 { font-size:11px;color:#0A1628;margin-bottom:2px; }
p { font-size:8px;color:#607D8B;margin-bottom:5px; }
table { width:100%;border-collapse:collapse; }
th { background:#0A1628;color:#fff;padding:3px 2px;font-size:7px;
     border:1px solid #ccc;text-align:left; }
td { font-size:7px;padding:2px;border:1px solid #ddd;vertical-align:top; }
</style></head><body>
<h2>Contrôle Management N2 – ${userEntite} – ${selectedAnnee}</h2>
<p>${data.length} thème(s) · Généré le ${new Date().toLocaleDateString('fr-FR')}</p>
<table><thead><tr>
  <th>N°</th><th>Thème</th><th>Processus</th>
  ${colHeaders}
  <th>Actions</th>
</tr></thead><tbody>${rows}</tbody></table>
</body></html>`;

      const { uri } = await Print.printToFileAsync({
        html, base64: false, width: 842, height: 595
      });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Contrôle Mgmt — ${selectedAnnee}`,
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
          <Text style={s.headerTitle}>📋 Contrôle Management N2</Text>
          <Text style={s.headerSub}>Annexe 2 IMS · 10 thèmes · C1 et C2 par CDT</Text>
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
                  <Text style={[s.chipText,
                    selectedAnnee === a && s.chipTextActive]}>{a}</Text>
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

            {/* Info colonnes */}
            <View style={s.entiteBox}>
              <Text style={s.entiteLabel}>Périmètre · {userEntite}</Text>
              <Text style={s.entiteValue}>
                {(CSPR_COLONNES[userEntite] || TOUTES_COLONNES)
                  .map(c => c.label).join(' · ')}
              </Text>
              <Text style={[s.entiteLabel, { marginTop: 6 }]}>
                C1 = 1er contrôle · C2 = 2ème contrôle
              </Text>
            </View>

            <TouchableOpacity style={s.confirmBtn} onPress={loadData}>
              <Text style={s.confirmBtnText}>Consulter {selectedAnnee} →</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </SafeAreaView>
    );
  }

  // ================================================================
  // ÉTAPE 1 — Tableau
  // ================================================================
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => { setStep(0); setData([]); }}>
          <Text style={s.backText}>← Retour</Text>
        </TouchableOpacity>
        <View style={s.headerRow}>
          <View>
            <Text style={s.headerTitle}>
              Contrôle Mgmt — {selectedAnnee}
            </Text>
            <Text style={s.headerSub}>
              {data.length} thème(s) · {userEntite}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {canEdit(userRole) && (
              <TouchableOpacity style={s.addBtn} onPress={openAdd}>
                <Text style={s.addBtnText}>+ Thème</Text>
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
              <Text style={s.emptyIcon}>📋</Text>
              <Text style={s.emptyText}>Aucun thème pour {selectedAnnee}</Text>
              {canEdit(userRole) && (
                <Text style={s.emptySub}>
                  Les 10 thèmes seront initialisés automatiquement
                </Text>
              )}
            </View>
          ) : (
            data.map((item, idx) => (
              <View key={item.id} style={s.card}>

                {/* En-tête */}
                <View style={s.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={s.numBadge}>
                        <Text style={s.numText}>{idx + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.cardName}>{item.theme}</Text>
                        {item.processus ? (
                          <Text style={s.cardSub}>{item.processus}</Text>
                        ) : null}
                      </View>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <CotationBadge value={cotationGlobale(item)} />
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
                </View>

                {/* Grille C1 / C2 par CDT */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  style={{ marginTop: 10 }}>
                  <View>
                    {/* En-têtes colonnes */}
                    <View style={cm.gridRow}>
                      <View style={cm.gridLabelCell} />
                      {colonnes.map(c => (
                        <View key={c.key} style={cm.gridColHeader}>
                          <Text style={cm.gridColHeaderText}>{c.label}</Text>
                        </View>
                      ))}
                    </View>

                    {/* Ligne C1 */}
                    <View style={cm.gridRow}>
                      <View style={cm.gridLabelCell}>
                        <Text style={cm.gridCtrlLabel}>C1</Text>
                      </View>
                      {colonnes.map(c => (
                        <View key={c.key} style={cm.gridCell}>
                          <CotationBadge value={item[`${c.key}C1`]} />
                        </View>
                      ))}
                    </View>

                    {/* Ligne C2 */}
                    <View style={cm.gridRow}>
                      <View style={cm.gridLabelCell}>
                        <Text style={cm.gridCtrlLabel}>C2</Text>
                      </View>
                      {colonnes.map(c => (
                        <View key={c.key} style={cm.gridCell}>
                          <CotationBadge value={item[`${c.key}C2`]} />
                        </View>
                      ))}
                    </View>
                  </View>
                </ScrollView>

                {item.actions ? (
                  <Text style={s.detailText}>📌 {item.actions}</Text>
                ) : null}
              </View>
            ))
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ================================================================
          MODAL FORMULAIRE
      ================================================================ */}
      <Modal
        visible={modalView !== null}
        transparent animationType="slide"
        statusBarTranslucent
        onRequestClose={closeModal}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}>
          <View style={s.modalOverlay}>
            {modalView === 'form' && (
              <View style={s.modalBox}>
                <ScrollView showsVerticalScrollIndicator={false}>

                  <View style={s.modalHeader}>
                    <Text style={s.modalTitle}>
                      {editing ? '✏️ Modifier le thème' : '➕ Nouveau thème'}
                    </Text>
                    <TouchableOpacity onPress={closeModal}>
                      <Text style={s.closeBtn}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Thème */}
                  <Text style={s.sectionTitle}>Thème</Text>

                  <Text style={s.fieldLabel}>Thème (processus RMS) *</Text>
                  <TextInput style={s.input}
                    value={form.theme}
                    onChangeText={v => setF('theme', v)}
                    placeholder="Ex: Pilotage sécurité"
                    placeholderTextColor="#607D8B" />

                  <Text style={s.fieldLabel}>Processus évalué</Text>
                  <TextInput
                    style={[s.input, { height: 56, textAlignVertical: 'top' }]}
                    value={form.processus}
                    onChangeText={v => setF('processus', v)}
                    multiline
                    placeholder="Ex: Planification, Réalisation…"
                    placeholderTextColor="#607D8B" />

                  {/* Cotations C1 et C2 par CDT */}
                  <Text style={s.sectionTitle}>
                    Cotations S/A/M/I — C1 et C2 par CDT
                  </Text>

                  {colonnes.map(c => (
                    <View key={c.key} style={cm.colBlock}>
                      <Text style={cm.colTitle}>{c.label}</Text>
                      <View style={{ flexDirection: 'row', gap: 16 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={s.fieldLabel}>C1 — 1er contrôle</Text>
                          <CotationSelector
                            value={form[`${c.key}C1`]}
                            onChange={v => setF(`${c.key}C1`, v)}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.fieldLabel}>C2 — 2ème contrôle</Text>
                          <CotationSelector
                            value={form[`${c.key}C2`]}
                            onChange={v => setF(`${c.key}C2`, v)}
                          />
                        </View>
                      </View>
                    </View>
                  ))}

                  {/* Actions */}
                  <Text style={s.sectionTitle}>Actions</Text>
                  <TextInput
                    style={[s.input, { height: 70, textAlignVertical: 'top' }]}
                    value={form.actions}
                    onChangeText={v => setF('actions', v)}
                    multiline
                    placeholder="Actions correctives…"
                    placeholderTextColor="#607D8B" />

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
  entiteValue: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold', marginTop: 4 },
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
  card: { backgroundColor: '#0F2137', borderRadius: 12, padding: 14, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  numBadge: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: '#1E3A5F',
    borderWidth: 1, borderColor: '#9B59B6',
    alignItems: 'center', justifyContent: 'center', marginRight: 8,
  },
  numText: { color: '#9B59B6', fontSize: 11, fontWeight: 'bold' },
  cardName: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold' },
  cardSub: { color: '#607D8B', fontSize: 10, marginTop: 2 },
  detailText: { color: '#B0BEC5', fontSize: 11, marginTop: 8 },
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
    flex: 1, backgroundColor: '#1A2F4A', borderRadius: 10,
    padding: 14, alignItems: 'center',
  },
  cancelBtnText: { color: '#607D8B', fontWeight: 'bold' },
  saveBtn: {
    flex: 2, backgroundColor: '#C9A84C', borderRadius: 10,
    padding: 14, alignItems: 'center',
  },
  saveBtnText: { color: '#0A1628', fontWeight: 'bold', fontSize: 14 },
});

const cm = StyleSheet.create({
  gridRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  gridLabelCell: { width: 28, alignItems: 'center' },
  gridCtrlLabel: {
    color: '#C9A84C', fontSize: 11, fontWeight: 'bold',
  },
  gridColHeader: {
    width: 100, alignItems: 'center',
    backgroundColor: '#1A2F4A', borderRadius: 6,
    padding: 4, marginHorizontal: 2,
  },
  gridColHeaderText: {
    color: '#C9A84C', fontSize: 9, fontWeight: 'bold', textAlign: 'center',
  },
  gridCell: { width: 100, alignItems: 'center', marginHorizontal: 2 },
  colBlock: {
    backgroundColor: '#1A2F4A', borderRadius: 10, padding: 12,
    marginBottom: 10, borderLeftWidth: 3, borderLeftColor: '#F39C12',
  },
  colTitle: { color: '#FAD7A0', fontSize: 12, fontWeight: 'bold', marginBottom: 10 },
  cotBtn: {
    width: 34, height: 28, borderRadius: 6,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, backgroundColor: 'transparent',
  },
  cotBtnText: { fontWeight: 'bold', fontSize: 13 },
  badge: {
    width: 30, height: 30, borderRadius: 6,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  badgeText: { fontWeight: 'bold', fontSize: 13 },
  emptyBadge: { color: '#2A4060', fontSize: 14, width: 30, textAlign: 'center' },
});
