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

const API = API_URL.replace('/auth', '/pdvs/management');

// ================================================================
// CONSTANTES
// ================================================================
const SEMESTRES = ['S1', 'S2'];

const COTATIONS_SAMI = ['S', 'A', 'M', 'I'];

const COTATION_COLORS = {
  S: { bg: '#1A3A28', border: '#27AE60', text: '#82E0AA' },
  A: { bg: '#1A2F4A', border: '#3498DB', text: '#85C1E9' },
  M: { bg: '#3A2800', border: '#F39C12', text: '#FAD7A0' },
  I: { bg: '#3A0E0E', border: '#E74C3C', text: '#F1948A' },
};

// Colonnes CDT selon entité CSPR
const CSPR_COLONNES = {
  'CT Voie': [
    { key: 'cdt101v', label: 'CDT 101V' },
    { key: 'cdt102v', label: 'CDT 102V' },
    { key: 'cdtOa',   label: 'CDT OA OH OT' },
  ],
  'CT CSS': [
    { key: 'cdt101lc',  label: 'CDT 101LC' },
    { key: 'cdt101sst', label: 'CDT 101SST' },
  ],
};

// Pour CET/ADMIN on affiche toutes les colonnes
const TOUTES_COLONNES = [
  { key: 'cdt101v',   label: 'CDT 101V' },
  { key: 'cdt102v',   label: 'CDT 102V' },
  { key: 'cdtOa',     label: 'CDT OA OH OT' },
  { key: 'cdt101lc',  label: 'CDT 101LC' },
  { key: 'cdt101sst', label: 'CDT 101SST' },
];

const canEdit   = (role) => role === 'CSPR' || role === 'ADMIN';
const isCGPX    = (role) => role === 'CGPX';

const EMPTY_FORM = {
  theme: '', processusEvalue: '',
  cdt101vS1: '', cdt101vS2: '',
  cdt102vS1: '', cdt102vS2: '',
  cdtOaS1:   '', cdtOaS2:   '',
  cdt101lcS1:'', cdt101lcS2:'',
  cdt101sstS1:'',cdt101sstS2:'',
  observations: '', actionsN2: '',
};

// ================================================================
// COMPOSANTS
// ================================================================
function CotationMini({ value, onChange, disabled }) {
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {COTATIONS_SAMI.map(c => {
        const col = COTATION_COLORS[c];
        const active = value === c;
        return (
          <TouchableOpacity key={c}
            disabled={disabled}
            style={[ms.miniBtn, { borderColor: col.border },
              active && { backgroundColor: col.bg },
              disabled && { opacity: 0.5 }]}
            onPress={() => onChange && onChange(active ? '' : c)}>
            <Text style={[ms.miniBtnText,
              { color: active ? col.text : col.border }]}>{c}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function CotationBadge({ value }) {
  if (!value) return <Text style={ms.emptyBadge}>—</Text>;
  const col = COTATION_COLORS[value];
  return (
    <View style={[ms.badge, { backgroundColor: col.bg, borderColor: col.border }]}>
      <Text style={[ms.badgeText, { color: col.text }]}>{value}</Text>
    </View>
  );
}

// ================================================================
// ÉCRAN PRINCIPAL
// ================================================================
export default function PdvsManagementScreen({ navigation }) {
  const [step, setStep]                 = useState(0);
  const [selectedSemestre, setSelectedSemestre] = useState('S1');
  const [selectedAnnee, setSelectedAnnee]       = useState(new Date().getFullYear());
  const [annees, setAnnees]             = useState([new Date().getFullYear()]);
  const [data, setData]                 = useState([]);
  const [loading, setLoading]           = useState(false);
  const [saving, setSaving]             = useState(false);
  const [generating, setGenerating]     = useState(false);
  const [userRole, setUserRole]         = useState('');
  const [userEntite, setUserEntite]     = useState('');
  const [editing, setEditing]           = useState(null);
  const [form, setForm]                 = useState({ ...EMPTY_FORM });

  // null | 'form' | 'addTheme'
  const [modalView, setModalView] = useState(null);

  const getToken = async () => await AsyncStorage.getItem('token');
  const setF = (key, val) => setForm(p => ({ ...p, [key]: val }));

  useEffect(() => { loadInitial(); }, []);

  const loadInitial = async () => {
    setLoading(true);
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const u = JSON.parse(userData);
        setUserRole(u.role || '');
        setUserEntite(u.entite || '');
      }
      const token = await getToken();
      const res = await axios.get(`${API}/annees`,
        { headers: { Authorization: `Bearer ${token}` } });
      if (res.data?.length > 0) setAnnees(res.data);
    } catch { }
    finally { setLoading(false); }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await axios.get(
        `${API}?semestre=${selectedSemestre}&annee=${selectedAnnee}`,
        { headers: { Authorization: `Bearer ${token}` } });
      setData(res.data);
      setStep(1);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger les données');
    } finally { setLoading(false); }
  };

  // Colonnes à afficher selon le rôle/entité
  const colonnes = userRole === 'CSPR'
    ? (CSPR_COLONNES[userEntite] || TOUTES_COLONNES)
    : TOUTES_COLONNES;

  // Ouvrir formulaire d'édition d'une ligne
  const openEdit = (item) => {
    setEditing(item);
    setForm({
      theme:           item.theme || '',
      processusEvalue: item.processusEvalue || '',
      cdt101vS1:       item.cdt101vS1 || '',
      cdt101vS2:       item.cdt101vS2 || '',
      cdt102vS1:       item.cdt102vS1 || '',
      cdt102vS2:       item.cdt102vS2 || '',
      cdtOaS1:         item.cdtOaS1 || '',
      cdtOaS2:         item.cdtOaS2 || '',
      cdt101lcS1:      item.cdt101lcS1 || '',
      cdt101lcS2:      item.cdt101lcS2 || '',
      cdt101sstS1:     item.cdt101sstS1 || '',
      cdt101sstS2:     item.cdt101sstS2 || '',
      observations:    item.observations || '',
      actionsN2:       item.actionsN2 || '',
    });
    setModalView('form');
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setModalView('form');
  };

  const closeModal = () => setModalView(null);

  const handleSave = async () => {
    if (!form.theme.trim()) {
      Alert.alert('Incomplet', 'Le thème est obligatoire');
      return;
    }
    setSaving(true);
    try {
      const token = await getToken();
      const payload = {
        ...form,
        semestre: selectedSemestre,
        annee: selectedAnnee,
        entite: userEntite,
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
      const msg = e.response?.data || 'Impossible de sauvegarder.';
      Alert.alert('Erreur', typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally { setSaving(false); }
  };

  const handleDelete = (item) => {
    const doDelete = async () => {
      try {
        const token = await getToken();
        await axios.delete(`${API}/${item.id}`,
          { headers: { Authorization: `Bearer ${token}` } });
        loadData();
      } catch { Alert.alert('Erreur', 'Impossible de supprimer'); }
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`Supprimer le thème "${item.theme}" ?`)) doDelete();
    } else {
      Alert.alert('Supprimer', `Supprimer le thème "${item.theme}" ?`, [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  // Cotation globale d'une ligne (pire des valeurs)
  const cotationGlobale = (item) => {
    const vals = colonnes.flatMap(c =>
      [item[`${c.key}S1`], item[`${c.key}S2`]]).filter(Boolean);
    if (vals.includes('I')) return 'I';
    if (vals.includes('M')) return 'M';
    if (vals.includes('A')) return 'A';
    if (vals.includes('S')) return 'S';
    return '';
  };

  const printHTML = async (html, filename) => {
    if (Platform.OS === 'web') {
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (win) {
        win.addEventListener('load', () => {
          setTimeout(() => { win.print(); URL.revokeObjectURL(url); }, 300);
        });
      } else {
        URL.revokeObjectURL(url);
        Alert.alert('Info', 'Autorisez les popups pour exporter le PDF.');
      }
    } else {
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: filename,
        UTI: 'com.adobe.pdf',
      });
    }
  };

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const cotColor = (v) => {
        const map = { S: '#d5f5e3', A: '#d6eaf8', M: '#fef9e7', I: '#fadbd8' };
        return v ? map[v] : '#f8f9fa';
      };

      const colHeaders = colonnes.flatMap(c =>
        [`<th>${c.label}<br>S1</th>`, `<th>${c.label}<br>S2</th>`]).join('');

      const rows = data.map((d, i) => {
        const cells = colonnes.flatMap(c => {
          const v1 = d[`${c.key}S1`] || '';
          const v2 = d[`${c.key}S2`] || '';
          return [
            `<td style="text-align:center;background:${cotColor(v1)};font-weight:bold">${v1||'—'}</td>`,
            `<td style="text-align:center;background:${cotColor(v2)};font-weight:bold">${v2||'—'}</td>`,
          ];
        }).join('');
        return `<tr style="background:${i%2===0?'#fff':'#f8f9fa'}">
          <td>${i+1}</td>
          <td><b>${d.theme}</b></td>
          <td style="font-size:7px">${d.processusEvalue || ''}</td>
          ${cells}
          <td style="font-size:7px">${d.observations || ''}</td>
          <td style="font-size:7px">${d.actionsN2 || ''}</td>
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
<h2>PDVS N2 – Management – ${userEntite} – ${selectedSemestre} ${selectedAnnee}</h2>
<p>${data.length} thème(s) · Généré le ${new Date().toLocaleDateString('fr-FR')}</p>
<table><thead><tr>
  <th>N°</th><th>Thème</th><th>Processus évalué</th>
  ${colHeaders}
  <th>Obs.</th><th>Actions N2</th>
</tr></thead><tbody>${rows}</tbody></table>
</body></html>`;

      await printHTML(html, `PDVS N2 Management — ${selectedSemestre} ${selectedAnnee}`);
    } catch {
      Alert.alert('Erreur', 'Impossible de générer le PDF');
    } finally { setGenerating(false); }
  };

  const Wrapper = Platform.OS === 'web' ? View : SafeAreaView;
  const Scroller = Platform.OS === 'web' ? View : ScrollView;

  // ================================================================
  // ÉTAPE 0 — Sélection période
  // ================================================================
  if (step === 0) {
    return (
      <Wrapper style={Platform.OS === 'web' ? s.webSafe : s.safe}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={s.backText}>← Retour</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>🏛️ PDVS N2 — Management</Text>
          <Text style={s.headerSub}>10 thèmes · Processus RMS · Par CDT</Text>
        </View>

        {loading
          ? <ActivityIndicator color="#C9A84C" style={{ marginTop: 40 }} />
          : (
          <Scroller style={Platform.OS === 'web' ? s.webScroller : s.list} {...(Platform.OS !== 'web' && { showsVerticalScrollIndicator: false })}>
            <Text style={s.sectionLabel}>Semestre</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
              {SEMESTRES.map(sem => (
                <TouchableOpacity key={sem}
                  style={[s.bigChip, selectedSemestre === sem && s.bigChipActive]}
                  onPress={() => setSelectedSemestre(sem)}>
                  <Text style={[s.bigChipText,
                    selectedSemestre === sem && s.bigChipTextActive]}>{sem}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.sectionLabel}>Année</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              style={{ flexGrow: 0, marginBottom: 20 }}>
              {annees.map(a => (
                <TouchableOpacity key={a}
                  style={[s.chipBtn, selectedAnnee === a && s.chipBtnActive]}
                  onPress={() => setSelectedAnnee(a)}>
                  <Text style={[s.chipText,
                    selectedAnnee === a && s.chipTextActive]}>{a}</Text>
                </TouchableOpacity>
              ))}
              {canEdit(userRole) && (
                <TouchableOpacity
                  style={[s.chipBtn, { borderColor: '#C9A84C', borderStyle: 'dashed' }]}
                  onPress={() => {
                    const newY = Math.max(...annees) + 1;
                    setAnnees(p => [newY, ...p]);
                    setSelectedAnnee(newY);
                  }}>
                  <Text style={[s.chipText, { color: '#C9A84C' }]} numberOfLines={1}>
                    + {Math.max(...annees) + 1}
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            {userEntite ? (
              <View style={s.entiteBox}>
                <Text style={s.entiteLabel}>Votre périmètre</Text>
                <Text style={s.entiteValue}>{userEntite}</Text>
                {CSPR_COLONNES[userEntite] && (
                  <Text style={s.entiteSub}>
                    CDTs : {CSPR_COLONNES[userEntite].map(c => c.label).join(' · ')}
                  </Text>
                )}
              </View>
            ) : null}

            <TouchableOpacity style={s.confirmBtn} onPress={loadData}>
              <Text style={s.confirmBtnText}>
                Consulter {selectedSemestre} {selectedAnnee} →
              </Text>
            </TouchableOpacity>
          </Scroller>
        )}
      </Wrapper>
    );
  }

  // ================================================================
  // ÉTAPE 1 — Tableau des thèmes
  // ================================================================
  return (
    <Wrapper style={Platform.OS === 'web' ? s.webSafe : s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => { setStep(0); setData([]); }}>
          <Text style={s.backText}>← Retour</Text>
        </TouchableOpacity>
        <View style={s.headerRow}>
          <View>
            <Text style={s.headerTitle}>
              Management — {selectedSemestre} {selectedAnnee}
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
            <TouchableOpacity
              style={[s.pdfBtn, generating && { opacity: 0.5 }]}
              onPress={generatePDF} disabled={generating}>
              {generating
                ? <ActivityIndicator color="#C9A84C" size="small" />
                : <Text style={s.pdfBtnText}>PDF</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Bandeau lecture seule */}
      {isCGPX(userRole) && (
        <View style={s.readOnlyBanner}>
          <Text style={s.readOnlyText}>
            👁 Lecture seule — {userEntite}
          </Text>
        </View>
      )}

      {loading
        ? <ActivityIndicator color="#C9A84C" style={{ marginTop: 40 }} />
        : (
        <Scroller style={Platform.OS === 'web' ? s.webScroller : s.list} {...(Platform.OS !== 'web' && { showsVerticalScrollIndicator: false })}>
          {data.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={s.emptyIcon}>🏛️</Text>
              <Text style={s.emptyText}>Aucun thème pour cette période</Text>
              {canEdit(userRole) && (
                <Text style={s.emptySub}>
                  Les 10 thèmes seront initialisés automatiquement
                  au premier chargement
                </Text>
              )}
            </View>
          ) : (
            data.map((item, idx) => (
              <View key={item.id} style={s.card}>

                {/* En-tête thème */}
                <View style={s.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={s.numBadge}>
                        <Text style={s.numText}>{idx + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.cardName}>{item.theme}</Text>
                        {item.processusEvalue ? (
                          <Text style={s.cardSub}>{item.processusEvalue}</Text>
                        ) : null}
                      </View>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    {/* Cotation globale */}
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

                {/* Grille CDT × S1/S2 */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  style={{ marginTop: 10 }}>
                  <View>
                    {/* En-têtes colonnes */}
                    <View style={ms.gridRow}>
                      <View style={ms.gridLabelCell} />
                      {colonnes.map(c => (
                        <View key={c.key} style={ms.gridColHeader}>
                          <Text style={ms.gridColHeaderText}>{c.label}</Text>
                        </View>
                      ))}
                    </View>
                    {/* Ligne S1 */}
                    <View style={ms.gridRow}>
                      <View style={ms.gridLabelCell}>
                        <Text style={ms.gridSemLabel}>S1</Text>
                      </View>
                      {colonnes.map(c => (
                        <View key={c.key} style={ms.gridCell}>
                          <CotationBadge value={item[`${c.key}S1`]} />
                        </View>
                      ))}
                    </View>
                    {/* Ligne S2 */}
                    <View style={ms.gridRow}>
                      <View style={ms.gridLabelCell}>
                        <Text style={ms.gridSemLabel}>S2</Text>
                      </View>
                      {colonnes.map(c => (
                        <View key={c.key} style={ms.gridCell}>
                          <CotationBadge value={item[`${c.key}S2`]} />
                        </View>
                      ))}
                    </View>
                  </View>
                </ScrollView>

                {/* Obs & Actions */}
                {item.observations ? (
                  <Text style={s.detailText}>📝 {item.observations}</Text>
                ) : null}
                {item.actionsN2 ? (
                  <Text style={s.detailText}>📌 {item.actionsN2}</Text>
                ) : null}
              </View>
            ))
          )}
          <View style={{ height: 40 }} />
        </Scroller>
      )}

      {/* ================================================================
          UN SEUL MODAL — null | 'form'
      ================================================================ */}
      <Modal
        visible={modalView !== null}
        transparent
        animationType="slide"
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

                  {/* ── Thème ── */}
                  <Text style={s.sectionTitle}>Thème</Text>

                  <Text style={s.fieldLabel}>Thème *</Text>
                  <TextInput style={s.input}
                    value={form.theme}
                    onChangeText={v => setF('theme', v)}
                    placeholder="Ex: Pilotage sécurité"
                    placeholderTextColor="#607D8B" />

                  <Text style={s.fieldLabel}>Processus évalué</Text>
                  <TextInput
                    style={[s.input, { height: 60, textAlignVertical: 'top' }]}
                    value={form.processusEvalue}
                    onChangeText={v => setF('processusEvalue', v)}
                    multiline
                    placeholder="Ex: Planification, Réalisation, Évaluation…"
                    placeholderTextColor="#607D8B" />

                  {/* ── Cotations par CDT ── */}
                  <Text style={s.sectionTitle}>Cotations S/A/M/I par CDT</Text>

                  {colonnes.map(c => (
                    <View key={c.key} style={ms.colBlock}>
                      <Text style={ms.colTitle}>{c.label}</Text>
                      <View style={{ flexDirection: 'row', gap: 16 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={s.fieldLabel}>S1</Text>
                          <CotationMini
                            value={form[`${c.key}S1`]}
                            onChange={v => setF(`${c.key}S1`, v)}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.fieldLabel}>S2</Text>
                          <CotationMini
                            value={form[`${c.key}S2`]}
                            onChange={v => setF(`${c.key}S2`, v)}
                          />
                        </View>
                      </View>
                    </View>
                  ))}

                  {/* ── Suivi ── */}
                  <Text style={s.sectionTitle}>Suivi</Text>

                  <Text style={s.fieldLabel}>Observations</Text>
                  <TextInput
                    style={[s.input, { height: 60, textAlignVertical: 'top' }]}
                    value={form.observations}
                    onChangeText={v => setF('observations', v)}
                    multiline
                    placeholder="Observations…"
                    placeholderTextColor="#607D8B" />

                  <Text style={s.fieldLabel}>Actions N2</Text>
                  <TextInput
                    style={[s.input, { height: 60, textAlignVertical: 'top' }]}
                    value={form.actionsN2}
                    onChangeText={v => setF('actionsN2', v)}
                    multiline
                    placeholder="Actions à réaliser…"
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
    </Wrapper>
  );
}

// ================================================================
// STYLES
// ================================================================
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A1628' },
  webSafe: { height: '100vh', backgroundColor: '#0A1628' },
  webScroller: { flex: 1, overflow: 'scroll', paddingBottom: 40 },
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
  bigChip: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    backgroundColor: '#0F2137', borderWidth: 1.5, borderColor: '#2A4060',
    alignItems: 'center',
  },
  bigChipActive: { backgroundColor: '#1E3A5F', borderColor: '#C9A84C' },
  bigChipText: { color: '#607D8B', fontWeight: 'bold', fontSize: 16 },
  bigChipTextActive: { color: '#C9A84C', fontSize: 18 },
  chipBtn: {
    minWidth: 64, height: 40, paddingHorizontal: 14, borderRadius: 20,
    backgroundColor: '#0F2137', borderWidth: 1, borderColor: '#2A4060', marginRight: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  chipBtnActive: { backgroundColor: '#C9A84C', borderColor: '#C9A84C' },
  chipText: { color: '#607D8B', fontWeight: 'bold', fontSize: 13 },
  chipTextActive: { color: '#0A1628' },
  entiteBox: {
    backgroundColor: '#0F2137', borderRadius: 10, padding: 14,
    marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#C9A84C',
  },
  entiteLabel: { color: '#607D8B', fontSize: 11 },
  entiteValue: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold', marginTop: 2 },
  entiteSub: { color: '#C9A84C', fontSize: 11, marginTop: 4 },
  confirmBtn: {
    backgroundColor: '#C9A84C', borderRadius: 12, padding: 16,
    alignItems: 'center', marginBottom: 20,
  },
  confirmBtnText: { color: '#0A1628', fontWeight: 'bold', fontSize: 15 },
  addBtn: {
    backgroundColor: '#C9A84C', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8,
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
  emptySub: { color: '#607D8B', fontSize: 12, marginTop: 6, textAlign: 'center', paddingHorizontal: 20 },
  card: { backgroundColor: '#0F2137', borderRadius: 12, padding: 14, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  numBadge: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#1E3A5F', borderWidth: 1, borderColor: '#9B59B6',
    alignItems: 'center', justifyContent: 'center', marginRight: 8,
  },
  numText: { color: '#9B59B6', fontSize: 11, fontWeight: 'bold' },
  cardName: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold' },
  cardSub: { color: '#607D8B', fontSize: 10, marginTop: 2 },
  detailText: { color: '#B0BEC5', fontSize: 11, marginTop: 6 },
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

const ms = StyleSheet.create({
  // Grille CDT
  gridRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  gridLabelCell: { width: 28, alignItems: 'center' },
  gridSemLabel: { color: '#607D8B', fontSize: 10, fontWeight: 'bold' },
  gridColHeader: {
    width: 90, alignItems: 'center',
    backgroundColor: '#1A2F4A', borderRadius: 6,
    padding: 4, marginHorizontal: 2,
  },
  gridColHeaderText: { color: '#C9A84C', fontSize: 9, fontWeight: 'bold', textAlign: 'center' },
  gridCell: { width: 90, alignItems: 'center', marginHorizontal: 2 },
  // Bloc CDT dans le formulaire
  colBlock: {
    backgroundColor: '#1A2F4A', borderRadius: 10, padding: 12,
    marginBottom: 10, borderLeftWidth: 3, borderLeftColor: '#9B59B6',
  },
  colTitle: { color: '#C9A84C', fontSize: 12, fontWeight: 'bold', marginBottom: 10 },
  // Mini cotation
  miniBtn: {
    width: 34, height: 28, borderRadius: 6,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, backgroundColor: 'transparent',
  },
  miniBtnText: { fontWeight: 'bold', fontSize: 13 },
  // Badge
  badge: {
    width: 30, height: 30, borderRadius: 6,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  badgeText: { fontWeight: 'bold', fontSize: 13 },
  emptyBadge: { color: '#2A4060', fontSize: 14, width: 30, textAlign: 'center' },
});
