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

const API = API_URL.replace('/auth', '/pdvs/site');

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

const TYPES_SITE = [
  'Voie', 'AdV', 'AD-OA', 'Composant',
  'Zone crit.', 'Envir.', 'OA', 'Autre'
];

const CSPR_SOUS_ENTITES = {
  'CT Voie': ['CDT 101V', 'CDT 102V', 'CDT OA OH OT'],
  'CT CSS':  ['CDT 101LC', 'CDT 101SST'],
};

const canEdit = (role) => role === 'CSPR' || role === 'ADMIN';
const isCGPX  = (role) => role === 'CGPX';

const EMPTY_FORM = {
  site: '', dt: '', type: '', lienRisqueMajeur: '',
  entite: '', semestre: 'S1', annee: new Date().getFullYear(),
  cotationS1: '', cotationS2: '', cotationAnnuelle: '',
  actionsN2: '', bouclage: '', responsable: '', observations: '',
};

// ================================================================
// COMPOSANTS UTILITAIRES
// ================================================================
function CotationSelector({ label, value, onChange }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <View style={s.cotRow}>
        {COTATIONS_SAMI.map(c => {
          const col = COTATION_COLORS[c];
          const active = value === c;
          return (
            <TouchableOpacity key={c}
              style={[s.cotBtn, { borderColor: col.border },
                active && { backgroundColor: col.bg }]}
              onPress={() => onChange(active ? '' : c)}>
              <Text style={[s.cotBtnText,
                { color: active ? col.text : col.border }]}>{c}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function CotationBadge({ value, size = 'normal' }) {
  if (!value) return (
    <View style={[s.badge, s.badgeEmpty,
      size === 'small' && { width: 24, height: 24 }]}>
      <Text style={s.badgeEmptyText}>—</Text>
    </View>
  );
  const col = COTATION_COLORS[value];
  return (
    <View style={[s.badge,
      { backgroundColor: col.bg, borderColor: col.border },
      size === 'small' && { width: 24, height: 24 }]}>
      <Text style={[s.badgeText, { color: col.text },
        size === 'small' && { fontSize: 11 }]}>{value}</Text>
    </View>
  );
}

// ================================================================
// ÉCRAN PRINCIPAL
// ================================================================
export default function PdvsSiteScreen({ navigation }) {
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

  // Un seul Modal — null | 'form' | 'type'
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
    } catch { /* silent */ }
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

  const openAdd = () => {
    setEditing(null);
    const defaultEntite = userRole === 'CSPR'
      ? (CSPR_SOUS_ENTITES[userEntite]?.[0] || '')
      : userEntite;
    setForm({
      ...EMPTY_FORM,
      semestre: selectedSemestre,
      annee: selectedAnnee,
      entite: defaultEntite,
    });
    setModalView('form');
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      site:             item.site || '',
      dt:               item.dt || '',
      type:             item.type || '',
      lienRisqueMajeur: item.lienRisqueMajeur || '',
      entite:           item.entite || '',
      semestre:         item.semestre,
      annee:            item.annee,
      cotationS1:       item.cotationS1 || '',
      cotationS2:       item.cotationS2 || '',
      cotationAnnuelle: item.cotationAnnuelle || '',
      actionsN2:        item.actionsN2 || '',
      bouclage:         item.bouclage || '',
      responsable:      item.responsable || '',
      observations:     item.observations || '',
    });
    setModalView('form');
  };

  const closeModal = () => setModalView(null);

  // Calcul automatique cotation annuelle
  const calculAnnuelle = () => {
    const vals = [form.cotationS1, form.cotationS2].filter(Boolean);
    if (vals.length === 0) return '';
    if (vals.includes('I')) return 'I';
    if (vals.includes('M')) return 'M';
    if (vals.includes('A')) return 'A';
    return 'S';
  };

  const handleSave = async () => {
    if (!form.site.trim()) {
      Alert.alert('Incomplet', 'Le nom du site est obligatoire');
      return;
    }
    setSaving(true);
    try {
      const token = await getToken();
      if (editing) {
        await axios.put(`${API}/${editing.id}`, form,
          { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await axios.post(API, form,
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
      if (window.confirm(`Supprimer le site "${item.site}" ?`)) doDelete();
    } else {
      Alert.alert('Supprimer', `Supprimer le site "${item.site}" ?`, [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: doDelete },
      ]);
    }
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
      const rows = data.map((d, i) => {
        const cotColor = (v) => {
          if (!v) return '#f8f9fa';
          const map = { S: '#d5f5e3', A: '#d6eaf8', M: '#fef9e7', I: '#fadbd8' };
          return map[v] || '#fff';
        };
        return `<tr style="background:${i%2===0?'#fff':'#f8f9fa'}">
          <td>${i+1}</td>
          <td><b>${d.site}</b></td>
          <td>${d.dt || ''}</td>
          <td>${d.type || ''}</td>
          <td style="font-size:7px">${d.lienRisqueMajeur || ''}</td>
          <td style="text-align:center;background:${cotColor(d.cotationS1)};font-weight:bold">${d.cotationS1 || '—'}</td>
          <td style="text-align:center;background:${cotColor(d.cotationS2)};font-weight:bold">${d.cotationS2 || '—'}</td>
          <td style="text-align:center;background:${cotColor(d.cotationAnnuelle)};font-weight:bold">${d.cotationAnnuelle || '—'}</td>
          <td style="font-size:7px">${d.actionsN2 || ''}</td>
          <td style="font-size:7px">${d.bouclage || ''}</td>
          <td>${d.responsable || ''}</td>
          <td style="font-size:7px">${d.observations || ''}</td>
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
     border:1px solid #ccc;white-space:nowrap;text-align:left; }
td { font-size:7px;padding:2px;border:1px solid #ddd;vertical-align:top; }
</style></head><body>
<h2>PDVS N2 – Site – ${userEntite} – ${selectedSemestre} ${selectedAnnee}</h2>
<p>${data.length} site(s) · Généré le ${new Date().toLocaleDateString('fr-FR')}</p>
<table><thead><tr>
  <th>N°</th><th>Site</th><th>DT</th><th>Type</th>
  <th>Lien risque majeur</th>
  <th>S1</th><th>S2</th><th>Cot. An.</th>
  <th>Actions N2</th><th>Bouclage</th>
  <th>Resp.</th><th>Obs.</th>
</tr></thead><tbody>${rows}</tbody></table>
</body></html>`;

      await printHTML(html, `PDVS N2 Site — ${selectedSemestre} ${selectedAnnee}`);
    } catch {
      Alert.alert('Erreur', 'Impossible de générer le PDF');
    } finally { setGenerating(false); }
  };

  // ================================================================
  // ÉTAPE 0 — Sélection période
  // ================================================================
  if (step === 0) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={s.backText}>← Retour</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>📍 PDVS N2 — Site</Text>
          <Text style={s.headerSub}>Plan de Veille Sécurité Niveau 2 · Sites</Text>
        </View>

        {loading
          ? <ActivityIndicator color="#C9A84C" style={{ marginTop: 40 }} />
          : (
          <ScrollView style={s.list}>

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
                <TouchableOpacity
                  style={[s.chipBtn, { borderColor: '#C9A84C' }]}
                  onPress={() => {
                    const newY = Math.max(...annees) + 1;
                    setAnnees(p => [newY, ...p]);
                    setSelectedAnnee(newY);
                  }}>
                  <Text style={[s.chipText, { color: '#C9A84C' }]}>
                    + {Math.max(...annees) + 1}
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            {userEntite ? (
              <View style={s.entiteBox}>
                <Text style={s.entiteLabel}>Votre périmètre</Text>
                <Text style={s.entiteValue}>{userEntite}</Text>
                {CSPR_SOUS_ENTITES[userEntite] && (
                  <Text style={s.entiteSub}>
                    → {CSPR_SOUS_ENTITES[userEntite].join(' · ')}
                  </Text>
                )}
              </View>
            ) : null}

            <TouchableOpacity style={s.confirmBtn} onPress={loadData}>
              <Text style={s.confirmBtnText}>
                Consulter {selectedSemestre} {selectedAnnee} →
              </Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </SafeAreaView>
    );
  }

  // ================================================================
  // ÉTAPE 1 — Tableau des sites
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
              PDVS N2 Site — {selectedSemestre} {selectedAnnee}
            </Text>
            <Text style={s.headerSub}>
              {data.length} site(s) · {userEntite}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {canEdit(userRole) && (
              <TouchableOpacity style={s.addBtn} onPress={openAdd}>
                <Text style={s.addBtnText}>+ Ajouter</Text>
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

      {/* Bandeau lecture seule CGPX */}
      {isCGPX(userRole) && (
        <View style={s.readOnlyBanner}>
          <Text style={s.readOnlyText}>
            👁 Lecture seule — Votre entité : {userEntite}
          </Text>
        </View>
      )}

      {loading
        ? <ActivityIndicator color="#C9A84C" style={{ marginTop: 40 }} />
        : (
        <ScrollView style={s.list}>
          {data.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={s.emptyIcon}>📍</Text>
              <Text style={s.emptyText}>Aucun site pour cette période</Text>
              {canEdit(userRole) && (
                <Text style={s.emptySub}>
                  Appuyez sur "+ Ajouter" pour saisir les sites
                </Text>
              )}
              {isCGPX(userRole) && (
                <Text style={s.emptySub}>
                  Le CSPR n'a pas encore saisi les sites
                </Text>
              )}
            </View>
          ) : (
            data.map((item, idx) => (
              <View key={item.id} style={s.card}>

                {/* En-tête carte */}
                <View style={s.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={s.numBadge}>
                        <Text style={s.numText}>{idx + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.cardName}>{item.site}</Text>
                        <Text style={s.cardSub}>
                          {item.dt}{item.type ? ` · ${item.type}` : ''}
                          {item.entite && userRole !== 'CGPX'
                            ? ` · ${item.entite}` : ''}
                        </Text>
                      </View>
                    </View>
                    {item.lienRisqueMajeur ? (
                      <Text style={s.lienRisque}>
                        🔗 {item.lienRisqueMajeur}
                      </Text>
                    ) : null}
                  </View>

                  {/* Actions édition */}
                  {canEdit(userRole) && (
                    <View style={{ gap: 6, alignItems: 'flex-end' }}>
                      <TouchableOpacity style={s.editBtn}
                        onPress={() => openEdit(item)}>
                        <Text style={s.editBtnText}>✏️</Text>
                      </TouchableOpacity>
                      {(userRole === 'ADMIN' || userRole === 'CSPR') && (
                        <TouchableOpacity style={s.deleteBtn}
                          onPress={() => handleDelete(item)}>
                          <Text style={s.deleteBtnText}>🗑</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>

                {/* Cotations S1 / S2 / Annuelle */}
                <View style={s.cotationsRow}>
                  <View style={s.cotBlock}>
                    <Text style={s.cotBlockLabel}>Semestre 1</Text>
                    <CotationBadge value={item.cotationS1} />
                  </View>
                  <View style={s.cotSeparator} />
                  <View style={s.cotBlock}>
                    <Text style={s.cotBlockLabel}>Semestre 2</Text>
                    <CotationBadge value={item.cotationS2} />
                  </View>
                  <View style={s.cotSeparator} />
                  <View style={s.cotBlock}>
                    <Text style={s.cotBlockLabel}>Annuelle</Text>
                    <CotationBadge value={item.cotationAnnuelle} />
                  </View>
                </View>

                {/* Détails suivi */}
                {item.actionsN2 ? (
                  <Text style={s.detailText}>📌 {item.actionsN2}</Text>
                ) : null}
                {item.bouclage ? (
                  <Text style={s.detailText}>✅ {item.bouclage}</Text>
                ) : null}
                {item.responsable ? (
                  <Text style={s.detailText}>👤 {item.responsable}</Text>
                ) : null}
                {item.observations ? (
                  <Text style={s.detailText}>📝 {item.observations}</Text>
                ) : null}

              </View>
            ))
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ================================================================
          UN SEUL MODAL — null | 'form' | 'type'
      ================================================================ */}
      <Modal
        visible={modalView !== null}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => {
          if (modalView === 'type') setModalView('form');
          else closeModal();
        }}>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}>
          <View style={s.modalOverlay}>

            {/* ══ PICKER TYPE DE SITE ══ */}
            {modalView === 'type' && (
              <View style={[s.modalBox, { maxHeight: '60%' }]}>
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>🏷️ Type de site</Text>
                  <TouchableOpacity onPress={() => setModalView('form')}>
                    <Text style={s.closeBtn}>✕</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView>
                  {TYPES_SITE.map(t => (
                    <TouchableOpacity key={t}
                      style={[s.typeItem,
                        form.type === t && s.typeItemActive]}
                      onPress={() => {
                        setF('type', t);
                        setModalView('form');
                      }}>
                      <Text style={[s.typeText,
                        form.type === t && s.typeTextActive]}>{t}</Text>
                      {form.type === t && (
                        <Text style={{ color: '#C9A84C' }}>✓</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* ══ FORMULAIRE PRINCIPAL ══ */}
            {modalView === 'form' && (
              <View style={s.modalBox}>
                <ScrollView showsVerticalScrollIndicator={false}>

                  <View style={s.modalHeader}>
                    <Text style={s.modalTitle}>
                      {editing ? '✏️ Modifier le site' : '➕ Nouveau site'}
                    </Text>
                    <TouchableOpacity onPress={closeModal}>
                      <Text style={s.closeBtn}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  {/* ── Identification ── */}
                  <Text style={s.sectionTitle}>Identification</Text>

                  <Text style={s.fieldLabel}>Nom du site *</Text>
                  <TextInput style={s.input}
                    value={form.site}
                    onChangeText={v => setF('site', v)}
                    placeholder="Ex: Voie V1+V2 DT 101V"
                    placeholderTextColor="#607D8B" />

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.fieldLabel}>DT</Text>
                      <TextInput style={s.input}
                        value={form.dt}
                        onChangeText={v => setF('dt', v)}
                        placeholder="Ex: DT 102V"
                        placeholderTextColor="#607D8B" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.fieldLabel}>Type</Text>
                      <TouchableOpacity
                        style={[s.input, {
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          borderColor: form.type ? '#C9A84C' : '#2A4060',
                        }]}
                        onPress={() => setModalView('type')}>
                        <Text style={{
                          color: form.type ? '#FFFFFF' : '#607D8B',
                          fontSize: 13,
                        }}>
                          {form.type || 'Choisir…'}
                        </Text>
                        <Text style={{ color: '#C9A84C' }}>›</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text style={s.fieldLabel}>Lien risque majeur</Text>
                  <TextInput style={s.input}
                    value={form.lienRisqueMajeur}
                    onChangeText={v => setF('lienRisqueMajeur', v)}
                    placeholder="Ex: RI-01 Géométrie + RI-02 AdV"
                    placeholderTextColor="#607D8B" />

                  {/* Entité — chips pour CSPR, texte libre pour ADMIN */}
                  {userRole === 'CSPR' && (CSPR_SOUS_ENTITES[userEntite] || []).length > 0 && (
                    <>
                      <Text style={s.fieldLabel}>Entité (sous-entité)</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
                        {(CSPR_SOUS_ENTITES[userEntite] || []).map(e => (
                          <TouchableOpacity key={e}
                            style={[s.chipBtn,
                              form.entite === e && s.chipBtnActive,
                              { marginRight: 0 }]}
                            onPress={() => setF('entite', e)}>
                            <Text style={[s.chipText,
                              form.entite === e && s.chipTextActive]}>{e}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  )}
                  {userRole === 'ADMIN' && (
                    <>
                      <Text style={s.fieldLabel}>Entité</Text>
                      <TextInput style={s.input}
                        value={form.entite}
                        onChangeText={v => setF('entite', v)}
                        placeholder="Ex: CDT 102V"
                        placeholderTextColor="#607D8B" />
                    </>
                  )}

                  {/* ── Cotations ── */}
                  <Text style={s.sectionTitle}>Cotations S/A/M/I</Text>

                  <CotationSelector
                    label="Semestre 1 (S1)"
                    value={form.cotationS1}
                    onChange={v => setF('cotationS1', v)}
                  />
                  <CotationSelector
                    label="Semestre 2 (S2)"
                    value={form.cotationS2}
                    onChange={v => setF('cotationS2', v)}
                  />

                  {/* Cotation annuelle avec bouton Auto */}
                  <View style={{ marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row',
                      alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={s.fieldLabel}>Cotation annuelle</Text>
                      <TouchableOpacity style={s.autoBtn}
                        onPress={() => setF('cotationAnnuelle', calculAnnuelle())}>
                        <Text style={s.autoBtnText}>⚡ Auto</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={s.cotRow}>
                      {COTATIONS_SAMI.map(c => {
                        const col = COTATION_COLORS[c];
                        const active = form.cotationAnnuelle === c;
                        return (
                          <TouchableOpacity key={c}
                            style={[s.cotBtn, { borderColor: col.border },
                              active && { backgroundColor: col.bg }]}
                            onPress={() => setF('cotationAnnuelle',
                              active ? '' : c)}>
                            <Text style={[s.cotBtnText,
                              { color: active ? col.text : col.border }]}>
                              {c}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* ── Suivi ── */}
                  <Text style={s.sectionTitle}>Suivi</Text>

                  <Text style={s.fieldLabel}>Actions N2</Text>
                  <TextInput
                    style={[s.input, { height: 70, textAlignVertical: 'top' }]}
                    value={form.actionsN2}
                    onChangeText={v => setF('actionsN2', v)}
                    multiline
                    placeholder="Actions à réaliser…"
                    placeholderTextColor="#607D8B" />

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.fieldLabel}>Bouclage</Text>
                      <TextInput style={s.input}
                        value={form.bouclage}
                        onChangeText={v => setF('bouclage', v)}
                        placeholder="Statut…"
                        placeholderTextColor="#607D8B" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.fieldLabel}>Responsable</Text>
                      <TextInput style={s.input}
                        value={form.responsable}
                        onChangeText={v => setF('responsable', v)}
                        placeholder="Ex: RAJI Y."
                        placeholderTextColor="#607D8B" />
                    </View>
                  </View>

                  <Text style={s.fieldLabel}>Observations</Text>
                  <TextInput
                    style={[s.input, { height: 60, textAlignVertical: 'top' }]}
                    value={form.observations}
                    onChangeText={v => setF('observations', v)}
                    multiline
                    placeholder="Observations complémentaires…"
                    placeholderTextColor="#607D8B" />

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
  bigChip: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    backgroundColor: '#0F2137', borderWidth: 1.5, borderColor: '#2A4060',
    alignItems: 'center',
  },
  bigChipActive: { backgroundColor: '#1E3A5F', borderColor: '#C9A84C' },
  bigChipText: { color: '#607D8B', fontWeight: 'bold', fontSize: 16 },
  bigChipTextActive: { color: '#C9A84C', fontSize: 18 },
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
  emptySub: { color: '#607D8B', fontSize: 12, marginTop: 6, textAlign: 'center' },
  card: {
    backgroundColor: '#0F2137', borderRadius: 12,
    padding: 14, marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12,
  },
  numBadge: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#1E3A5F', borderWidth: 1, borderColor: '#9B59B6',
    alignItems: 'center', justifyContent: 'center', marginRight: 8,
  },
  numText: { color: '#9B59B6', fontSize: 11, fontWeight: 'bold' },
  cardName: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold' },
  cardSub: { color: '#607D8B', fontSize: 10, marginTop: 2 },
  lienRisque: { color: '#85C1E9', fontSize: 10, marginTop: 6 },
  cotationsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1A2F4A', borderRadius: 10,
    padding: 12, marginBottom: 8,
  },
  cotBlock: { flex: 1, alignItems: 'center', gap: 6 },
  cotBlockLabel: { color: '#607D8B', fontSize: 10 },
  cotSeparator: {
    width: 1, height: 40, backgroundColor: '#2A4060', marginHorizontal: 8,
  },
  detailText: { color: '#B0BEC5', fontSize: 11, marginTop: 4 },
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
  badge: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  badgeEmpty: { backgroundColor: '#1A2F4A', borderColor: '#2A4060' },
  badgeEmptyText: { color: '#2A4060', fontSize: 14 },
  badgeText: { fontWeight: 'bold', fontSize: 14 },
  cotRow: { flexDirection: 'row', gap: 8 },
  cotBtn: {
    width: 42, height: 34, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, backgroundColor: 'transparent',
  },
  cotBtnText: { fontWeight: 'bold', fontSize: 15 },
  autoBtn: {
    backgroundColor: '#1E3A5F', borderRadius: 6, paddingHorizontal: 10,
    paddingVertical: 4, borderWidth: 1, borderColor: '#C9A84C',
  },
  autoBtnText: { color: '#C9A84C', fontSize: 11, fontWeight: 'bold' },
  modalOverlay: {
    flex: 1, backgroundColor: '#00000090', justifyContent: 'flex-end',
  },
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
  typeItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#1A2F4A', borderRadius: 8, padding: 14, marginBottom: 6,
    borderWidth: 1, borderColor: '#2A4060',
  },
  typeItemActive: { borderColor: '#C9A84C', backgroundColor: '#1E3A5F' },
  typeText: { color: '#B0BEC5', fontSize: 13 },
  typeTextActive: { color: '#C9A84C', fontWeight: 'bold' },
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
