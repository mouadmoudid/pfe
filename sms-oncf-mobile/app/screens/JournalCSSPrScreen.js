import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert, Modal, TextInput,
  KeyboardAvoidingView, Platform, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { API_URL } from '../services/authService';
import DatePickerInput from '../components/DatePickerInput';

const API       = API_URL.replace('/auth', '/pdvs/journal-csspr');
const API_USERS = API_URL.replace('/auth', '/admin');

// ================================================================
// CONSTANTES
// ================================================================
const STATUTS = [
  { key: 'EN_COURS',  label: 'En cours',  icon: '🔵', bg: '#1A2F4A', border: '#3498DB', text: '#85C1E9' },
  { key: 'REALISE',   label: 'Réalisé',   icon: '✅', bg: '#1A3A28', border: '#27AE60', text: '#82E0AA' },
  { key: 'EN_RETARD', label: 'En retard', icon: '⚠️', bg: '#3A2800', border: '#F39C12', text: '#FAD7A0' },
  { key: 'ANNULE',    label: 'Annulé',    icon: '❌', bg: '#3A0E0E', border: '#E74C3C', text: '#F1948A' },
];

const STATUT_MAP = Object.fromEntries(STATUTS.map(s => [s.key, s]));

const canEdit = (role) => role === 'CSPR' || role === 'ADMIN';
const isCGPX  = (role) => role === 'CGPX';

const EMPTY_FORM = {
  decision: '',
  dateDecision: new Date().toISOString().split('T')[0],
  responsableNom: '', responsableMatricule: '',
  contributeurs: '',
  echeance: '',
  avancement: '',
  statut: 'EN_COURS',
  observations: '',
};

// ================================================================
// COMPOSANT BADGE STATUT
// ================================================================
function StatutBadge({ statut }) {
  const st = STATUT_MAP[statut] || STATUT_MAP['EN_COURS'];
  return (
    <View style={[jc.statutBadge,
      { backgroundColor: st.bg, borderColor: st.border }]}>
      <Text style={{ fontSize: 12 }}>{st.icon}</Text>
      <Text style={[jc.statutText, { color: st.text }]}>{st.label}</Text>
    </View>
  );
}

// ================================================================
// ÉCRAN PRINCIPAL
// ================================================================
export default function JournalCSSPrScreen({ navigation }) {
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
  const [users, setUsers]     = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [selectedResp, setSelectedResp] = useState(null);
  const [filterStatut, setFilterStatut] = useState('');

  // null | 'form' | 'respPicker' | 'statutSelect'
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
      const [annRes, usersRes] = await Promise.allSettled([
        axios.get(`${API}/annees`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_USERS}/users`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (annRes.status === 'fulfilled' && annRes.value.data?.length > 0)
        setAnnees(annRes.value.data);
      if (usersRes.status === 'fulfilled')
        setUsers(usersRes.value.data);
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

  const openAdd = () => {
    setEditing(null);
    setSelectedResp(null);
    setUserSearch('');
    setForm({ ...EMPTY_FORM });
    setModalView('form');
  };

  const openEdit = (item) => {
    setEditing(item);
    setSelectedResp(null);
    setUserSearch('');
    setForm({
      decision:             item.decision || '',
      dateDecision:         item.dateDecision || new Date().toISOString().split('T')[0],
      responsableNom:       item.responsableNom || '',
      responsableMatricule: item.responsableMatricule || '',
      contributeurs:        item.contributeurs || '',
      echeance:             item.echeance || '',
      avancement:           item.avancement || '',
      statut:               item.statut || 'EN_COURS',
      observations:         item.observations || '',
    });
    setModalView('form');
  };

  const closeModal = () => {
    setModalView(null);
    setEditing(null);
    setUserSearch('');
  };

  const selectResp = (user) => {
    setSelectedResp(user);
    setF('responsableNom', user.fullName || '');
    setF('responsableMatricule', user.matricule || '');
    setUserSearch('');
    setModalView('form');
  };

  const handleSave = async () => {
    if (!form.decision.trim()) {
      Alert.alert('Incomplet', 'La décision est obligatoire'); return;
    }
    if (!form.dateDecision) {
      Alert.alert('Incomplet', 'La date est obligatoire'); return;
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
    const doDelete = async () => {
      try {
        const token = await getToken();
        await axios.delete(`${API}/${item.id}`,
          { headers: { Authorization: `Bearer ${token}` } });
        loadData();
      } catch { Alert.alert('Erreur', 'Impossible de supprimer'); }
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`Supprimer la décision N°${item.ordre} ?`)) doDelete();
    } else {
      Alert.alert('Supprimer', `Supprimer la décision N°${item.ordre} ?`, [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  // Filtrer par statut
  const dataFiltered = filterStatut
    ? data.filter(d => d.statut === filterStatut)
    : data;

  // Filtrer users pour le picker
  const usersFiltres = users.filter(u => {
    const q = userSearch.toLowerCase();
    return !q ||
      (u.fullName  || '').toLowerCase().includes(q) ||
      (u.matricule || '').toLowerCase().includes(q);
  });

  // Compteurs par statut
  const compteurs = STATUTS.map(st => ({
    ...st,
    count: data.filter(d => d.statut === st.key).length,
  }));

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
        const st = STATUT_MAP[d.statut] || STATUT_MAP['EN_COURS'];
        return `<tr style="background:${i%2===0?'#fff':'#f8f9fa'}">
          <td style="text-align:center">${d.ordre}</td>
          <td>${d.dateDecision || ''}</td>
          <td><b>${d.decision}</b></td>
          <td>${d.responsableNom || ''}</td>
          <td style="font-size:7px">${d.contributeurs || ''}</td>
          <td>${d.echeance || ''}</td>
          <td style="text-align:center">${d.avancement || ''}</td>
          <td style="text-align:center;background:${st.bg};color:${st.text};
              font-weight:bold">${st.label}</td>
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
     border:1px solid #ccc;text-align:left; }
td { font-size:7px;padding:3px;border:1px solid #ddd;vertical-align:top; }
</style></head><body>
<h2>Journal CSSPr – ${userEntite} – ${selectedAnnee}</h2>
<p>${data.length} décision(s) · Généré le ${new Date().toLocaleDateString('fr-FR')}</p>
<table><thead><tr>
  <th>N°</th><th>Date</th><th>Décision</th><th>Resp.</th>
  <th>Contrib.</th><th>Échéance</th><th>Av.</th><th>Statut</th><th>Obs.</th>
</tr></thead><tbody>${rows}</tbody></table>
</body></html>`;

      await printHTML(html, `Journal CSSPr — ${selectedAnnee}`);
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
          <Text style={s.headerTitle}>📒 Journal CSSPr</Text>
          <Text style={s.headerSub}>Décisions de la réunion mensuelle CSSPr</Text>
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
  // ÉTAPE 1 — Journal
  // ================================================================
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => { setStep(0); setData([]); }}>
          <Text style={s.backText}>← Retour</Text>
        </TouchableOpacity>
        <View style={s.headerRow}>
          <View>
            <Text style={s.headerTitle}>Journal CSSPr — {selectedAnnee}</Text>
            <Text style={s.headerSub}>{data.length} décision(s) · {userEntite}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {canEdit(userRole) && (
              <TouchableOpacity style={s.addBtn} onPress={openAdd}>
                <Text style={s.addBtnText}>+ Décision</Text>
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

      {/* Compteurs statuts */}
      {data.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={jc.compteurScroll}>
          <TouchableOpacity
            style={[jc.compteurAll, filterStatut === '' && jc.compteurAllActive]}
            onPress={() => setFilterStatut('')}>
            <Text style={[jc.compteurAllText,
              filterStatut === '' && { color: '#0A1628' }]}>
              Tout ({data.length})
            </Text>
          </TouchableOpacity>
          {compteurs.map(st => (
            <TouchableOpacity key={st.key}
              style={[jc.compteurAll, filterStatut === st.key && jc.compteurAllActive]}
              onPress={() => setFilterStatut(filterStatut === st.key ? '' : st.key)}>
              <Text style={[jc.compteurAllText,
                filterStatut === st.key && { color: '#0A1628' }]}>
                {st.icon} {st.label} ({st.count})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {loading ? <ActivityIndicator color="#C9A84C" style={{ marginTop: 40 }} /> : (
        <ScrollView style={s.list}>
          {dataFiltered.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={s.emptyIcon}>📒</Text>
              <Text style={s.emptyText}>
                {filterStatut
                  ? `Aucune décision "${STATUT_MAP[filterStatut]?.label}"`
                  : `Aucune décision pour ${selectedAnnee}`}
              </Text>
              {canEdit(userRole) && !filterStatut && (
                <Text style={s.emptySub}>
                  Appuyez sur "+ Décision" pour enregistrer
                </Text>
              )}
            </View>
          ) : (
            dataFiltered.map(item => (
              <View key={item.id} style={s.card}>

                {/* En-tête */}
                <View style={s.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={s.numBadge}>
                        <Text style={s.numText}>{item.ordre}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.cardName}>{item.decision}</Text>
                        <Text style={s.cardSub}>
                          📅 {item.dateDecision}
                          {item.echeance ? ` · ⏰ ${item.echeance}` : ''}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <StatutBadge statut={item.statut} />
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

                {/* Détails */}
                <View style={jc.detailsRow}>
                  {item.responsableNom ? (
                    <View style={jc.detailChip}>
                      <Text style={jc.detailChipIcon}>👤</Text>
                      <Text style={jc.detailChipText}>{item.responsableNom}</Text>
                    </View>
                  ) : null}
                  {item.avancement ? (
                    <View style={jc.detailChip}>
                      <Text style={jc.detailChipIcon}>📊</Text>
                      <Text style={jc.detailChipText}>{item.avancement}</Text>
                    </View>
                  ) : null}
                </View>

                {item.contributeurs ? (
                  <Text style={s.detailText}>
                    👥 Contrib. : {item.contributeurs}
                  </Text>
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
          UN SEUL MODAL — null | 'form' | 'respPicker' | 'statutSelect'
      ================================================================ */}
      <Modal
        visible={modalView !== null}
        transparent animationType="slide"
        statusBarTranslucent
        onRequestClose={() => {
          if (modalView === 'respPicker' || modalView === 'statutSelect')
            setModalView('form');
          else closeModal();
        }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}>
          <View style={s.modalOverlay}>

            {/* ── PICKER RESPONSABLE ── */}
            {modalView === 'respPicker' && (
              <View style={[s.modalBox, { maxHeight: '75%' }]}>
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>👤 Choisir un responsable</Text>
                  <TouchableOpacity onPress={() => {
                    setUserSearch(''); setModalView('form');
                  }}>
                    <Text style={s.closeBtn}>✕</Text>
                  </TouchableOpacity>
                </View>

                <TextInput style={[s.input, { marginBottom: 10 }]}
                  value={userSearch}
                  onChangeText={setUserSearch}
                  placeholder="Rechercher nom ou matricule…"
                  placeholderTextColor="#607D8B"
                  autoFocus />

                <ScrollView showsVerticalScrollIndicator={false}>
                  {usersFiltres.length === 0 ? (
                    <Text style={{ color: '#607D8B', textAlign: 'center', padding: 20 }}>
                      Aucun utilisateur trouvé
                    </Text>
                  ) : (
                    usersFiltres.map(u => (
                      <TouchableOpacity key={u.id}
                        style={jc.userItem}
                        onPress={() => selectResp(u)}>
                        <View style={jc.userAvatar}>
                          <Text style={jc.userAvatarText}>
                            {(u.fullName || '?')[0].toUpperCase()}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={jc.userName}>{u.fullName}</Text>
                          <Text style={jc.userSub}>
                            {u.matricule}
                            {u.fonctionAssuree ? ` · ${u.fonctionAssuree}` : ''}
                            {u.entite ? ` · ${u.entite}` : ''}
                          </Text>
                        </View>
                        <Text style={{ color: '#C9A84C', fontSize: 18 }}>›</Text>
                      </TouchableOpacity>
                    ))
                  )}
                  <View style={{ height: 20 }} />
                </ScrollView>
              </View>
            )}

            {/* ── SÉLECTEUR STATUT ── */}
            {modalView === 'statutSelect' && (
              <View style={[s.modalBox, { maxHeight: '50%' }]}>
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>📌 Statut de la décision</Text>
                  <TouchableOpacity onPress={() => setModalView('form')}>
                    <Text style={s.closeBtn}>✕</Text>
                  </TouchableOpacity>
                </View>
                {STATUTS.map(st => (
                  <TouchableOpacity key={st.key}
                    style={[jc.statutItem,
                      form.statut === st.key && {
                        borderColor: st.border,
                        backgroundColor: st.bg,
                      }]}
                    onPress={() => { setF('statut', st.key); setModalView('form'); }}>
                    <Text style={{ fontSize: 20 }}>{st.icon}</Text>
                    <Text style={[jc.statutItemText,
                      form.statut === st.key && { color: st.text, fontWeight: 'bold' }]}>
                      {st.label}
                    </Text>
                    {form.statut === st.key && (
                      <Text style={{ color: st.text, marginLeft: 'auto' }}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* ── FORMULAIRE PRINCIPAL ── */}
            {modalView === 'form' && (
              <View style={s.modalBox}>
                <ScrollView showsVerticalScrollIndicator={false}>

                  <View style={s.modalHeader}>
                    <Text style={s.modalTitle}>
                      {editing ? '✏️ Modifier la décision' : '➕ Nouvelle décision'}
                    </Text>
                    <TouchableOpacity onPress={closeModal}>
                      <Text style={s.closeBtn}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Décision */}
                  <Text style={s.sectionTitle}>Décision</Text>

                  <Text style={s.fieldLabel}>Décision *</Text>
                  <TextInput
                    style={[s.input, { height: 80, textAlignVertical: 'top' }]}
                    value={form.decision}
                    onChangeText={v => setF('decision', v)}
                    multiline
                    placeholder="Description de la décision CSSPr…"
                    placeholderTextColor="#607D8B" />

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.fieldLabel}>Date *</Text>
                      <DatePickerInput
                        value={form.dateDecision}
                        onChange={v => setF('dateDecision', v)}
                        placeholder="Sélectionner une date"
                        inputStyle={s.input} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.fieldLabel}>Échéance</Text>
                      <DatePickerInput
                        value={form.echeance}
                        onChange={v => setF('echeance', v)}
                        placeholder="Sélectionner une date"
                        inputStyle={s.input} />
                    </View>
                  </View>

                  {/* Responsable */}
                  <Text style={s.sectionTitle}>Responsable & Contributeurs</Text>

                  <Text style={s.fieldLabel}>Responsable</Text>
                  <TouchableOpacity
                    style={[s.input, {
                      flexDirection: 'row', alignItems: 'center',
                      justifyContent: 'space-between',
                      borderColor: form.responsableNom ? '#C9A84C' : '#2A4060',
                    }]}
                    onPress={() => setModalView('respPicker')}>
                    <Text style={{
                      color: form.responsableNom ? '#FFFFFF' : '#607D8B',
                      fontSize: 13, flex: 1,
                    }}>
                      {form.responsableNom || 'Choisir un responsable…'}
                    </Text>
                    <Text style={{ color: '#C9A84C', fontSize: 18 }}>›</Text>
                  </TouchableOpacity>

                  <Text style={s.fieldLabel}>Contributeurs</Text>
                  <TextInput style={s.input}
                    value={form.contributeurs}
                    onChangeText={v => setF('contributeurs', v)}
                    placeholder="Ex: RAJI Y., ALAMI H."
                    placeholderTextColor="#607D8B" />

                  {/* Suivi */}
                  <Text style={s.sectionTitle}>Suivi</Text>

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.fieldLabel}>Avancement</Text>
                      <TextInput style={s.input}
                        value={form.avancement}
                        onChangeText={v => setF('avancement', v)}
                        placeholder="Ex: 50% ou En attente"
                        placeholderTextColor="#607D8B" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.fieldLabel}>Statut</Text>
                      <TouchableOpacity
                        style={[s.input, {
                          flexDirection: 'row', alignItems: 'center',
                          justifyContent: 'space-between',
                          borderColor: STATUT_MAP[form.statut]?.border || '#2A4060',
                        }]}
                        onPress={() => setModalView('statutSelect')}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text>{STATUT_MAP[form.statut]?.icon}</Text>
                          <Text style={{
                            color: STATUT_MAP[form.statut]?.text || '#607D8B',
                            fontSize: 12, fontWeight: 'bold',
                          }}>
                            {STATUT_MAP[form.statut]?.label || 'Choisir'}
                          </Text>
                        </View>
                        <Text style={{ color: '#C9A84C' }}>›</Text>
                      </TouchableOpacity>
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
  emptyText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold', textAlign: 'center' },
  emptySub: { color: '#607D8B', fontSize: 12, marginTop: 6 },
  card: { backgroundColor: '#0F2137', borderRadius: 12, padding: 14, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  numBadge: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: '#1E3A5F',
    borderWidth: 1, borderColor: '#9B59B6',
    alignItems: 'center', justifyContent: 'center', marginRight: 8,
  },
  numText: { color: '#9B59B6', fontSize: 11, fontWeight: 'bold' },
  cardName: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold', flexWrap: 'wrap' },
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
    flex: 1, backgroundColor: '#1A2F4A', borderRadius: 10, padding: 14, alignItems: 'center',
  },
  cancelBtnText: { color: '#607D8B', fontWeight: 'bold' },
  saveBtn: {
    flex: 2, backgroundColor: '#C9A84C', borderRadius: 10, padding: 14, alignItems: 'center',
  },
  saveBtnText: { color: '#0A1628', fontWeight: 'bold', fontSize: 14 },
});

const jc = StyleSheet.create({
  compteurScroll: { paddingHorizontal: 14, paddingVertical: 6, marginBottom: 8 },
  compteurAll: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: '#1A2F4A', borderWidth: 1, borderColor: '#2A4060',
    marginRight: 6, alignSelf: 'flex-start',
  },
  compteurAllActive: { backgroundColor: '#C9A84C', borderColor: '#C9A84C' },
  compteurAllText: { color: '#607D8B', fontSize: 11, fontWeight: 'bold' },
  compteurBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16,
    backgroundColor: '#0F2137', borderWidth: 1, marginRight: 6,
  },
  compteurLabel: { fontSize: 11, fontWeight: 'bold' },
  detailsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  detailChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#1A2F4A', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  detailChipIcon: { fontSize: 12 },
  detailChipText: { color: '#B0BEC5', fontSize: 11 },
  statutBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1,
  },
  statutText: { fontSize: 11, fontWeight: 'bold' },
  statutItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#1A2F4A', borderRadius: 8, padding: 14,
    marginBottom: 6, borderWidth: 1, borderColor: '#2A4060',
  },
  statutItemText: { color: '#B0BEC5', fontSize: 13, flex: 1 },
  userItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#1A2F4A', borderRadius: 8, padding: 12, marginBottom: 6,
  },
  userAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#1E3A5F', borderWidth: 1, borderColor: '#C9A84C',
    alignItems: 'center', justifyContent: 'center',
  },
  userAvatarText: { color: '#C9A84C', fontWeight: 'bold', fontSize: 16 },
  userName: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold' },
  userSub: { color: '#607D8B', fontSize: 11, marginTop: 2 },
});
