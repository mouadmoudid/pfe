import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert, Modal, TextInput,
  KeyboardAvoidingView, Platform, useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { API_URL } from '../services/authService';

const API       = API_URL.replace('/auth', '/pdvs/ete-ramadan');
const API_USERS = API_URL.replace('/auth', '/admin/users');

// ================================================================
// CONSTANTES
// ================================================================
const PERIODES = [
  { key: 'ETE',     label: 'Été',     icon: '☀️', color: '#E67E22', bg: '#3A2800', border: '#E67E22' },
  { key: 'RAMADAN', label: 'Ramadan', icon: '🌙', color: '#9B59B6', bg: '#2D1B4A', border: '#9B59B6' },
];
const PERIODE_MAP = Object.fromEntries(PERIODES.map(p => [p.key, p]));

const CSPR_SOUS_ENTITES = {
  'CT Voie': ['CDT 101V', 'CDT 102V', 'CDT OA OH OT'],
  'CT CSS':  ['CDT 101LC', 'CDT 101SST'],
};

const canEdit = (role) => role === 'CSPR' || role === 'ADMIN';
const isCGPX  = (role) => role === 'CGPX';

const EMPTY_FORM = {
  actionN2: '', cdt: 'Tous', frequence: '', lienRisque: '',
  responsableNom: '', responsableMatricule: '',
  planifie: '', realise: '', observations: '',
};

// CDT prédéfinis
const CDT_OPTIONS = ['Tous', 'Concerné', 'Demandeur', '—'];

// ================================================================
// COMPOSANT ÉTAT P / R
// ================================================================
function EtatCell({ label, value, onChange, color, disabled }) {
  const filled = value && value !== '-' && value !== '';
  return (
    <TouchableOpacity
      disabled={disabled}
      onPress={() => !disabled && onChange && onChange(filled ? '' : new Date().toLocaleDateString('fr-FR'))}
      style={[er.etatCell,
        filled && { backgroundColor: color + '20', borderColor: color }]}>
      <Text style={[er.etatLabel, filled && { color }]}>{label}</Text>
      <Text style={[er.etatValue, filled && { color }]}>
        {filled ? (value.length > 8 ? value.substring(0, 8) : value) : '—'}
      </Text>
    </TouchableOpacity>
  );
}

// ================================================================
// ÉCRAN PRINCIPAL
// ================================================================
export default function PdvsEteRamadanScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const WEB = Platform.OS === 'web' && width > 768;

  const [selectedAnnee, setSelectedAnnee] = useState(new Date().getFullYear());
  const [selectedPeriode, setSelectedPeriode] = useState('ETE');
  const [annees, setAnnees]     = useState([new Date().getFullYear()]);
  const [data, setData]         = useState([]);
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [generating, setGenerating] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [userEntite, setUserEntite] = useState('');
  const [step, setStep]         = useState(0);
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState({ ...EMPTY_FORM });
  const [users, setUsers]       = useState([]);
  const [userSearch, setUserSearch] = useState('');

  // null | 'form' | 'respPicker' | 'cdtSelect'
  const [modalView, setModalView] = useState(null);

  const Wrapper = Platform.OS === 'web' ? View : SafeAreaView;
  const Scroller = Platform.OS === 'web' ? View : ScrollView;

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
        axios.get(API_USERS, { headers: { Authorization: `Bearer ${token}` } }),
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
      const res = await axios.get(
        `${API}?annee=${selectedAnnee}&periode=${selectedPeriode}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setData(res.data);
      setStep(1);
    } catch { Alert.alert('Erreur', 'Impossible de charger les données'); }
    finally { setLoading(false); }
  };

  // Users filtrés par hiérarchie
  const usersFiltres = users.filter(u => {
    const q = userSearch.toLowerCase();
    const matchSearch = !q ||
      (u.fullName  || '').toLowerCase().includes(q) ||
      (u.matricule || '').toLowerCase().includes(q);
    let matchEntite = true;
    if (userRole === 'CSPR')
      matchEntite = (CSPR_SOUS_ENTITES[userEntite] || []).includes(u.entite);
    else if (userRole === 'CGPX')
      matchEntite = u.entite === userEntite;
    return matchSearch && matchEntite;
  });

  const usersByEntite = usersFiltres.reduce((acc, u) => {
    const e = u.entite || 'Autre';
    if (!acc[e]) acc[e] = [];
    acc[e].push(u);
    return acc;
  }, {});

  const periodeInfo = PERIODE_MAP[selectedPeriode];

  const openAdd = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setModalView('form');
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      actionN2:             item.actionN2 || '',
      cdt:                  item.cdt || 'Tous',
      frequence:            item.frequence || '',
      lienRisque:           item.lienRisque || '',
      responsableNom:       item.responsableNom || '',
      responsableMatricule: item.responsableMatricule || '',
      planifie:             item.planifie || '',
      realise:              item.realise || '',
      observations:         item.observations || '',
    });
    setModalView('form');
  };

  const closeModal = () => { setModalView(null); setEditing(null); setUserSearch(''); };

  const selectResp = (u) => {
    setF('responsableNom',       u.fullName  || '');
    setF('responsableMatricule', u.matricule || '');
    setUserSearch('');
    setModalView('form');
  };

  const handleSave = async () => {
    if (!form.actionN2.trim()) {
      Alert.alert('Incomplet', 'L\'action est obligatoire'); return;
    }
    setSaving(true);
    try {
      const token = await getToken();
      const payload = {
        ...form,
        annee: selectedAnnee,
        periode: selectedPeriode,
        entiteCSPR: userEntite,
      };
      if (editing)
        await axios.put(`${API}/${editing.id}`, payload,
          { headers: { Authorization: `Bearer ${token}` } });
      else
        await axios.post(API, payload,
          { headers: { Authorization: `Bearer ${token}` } });
      closeModal();
      loadData();
    } catch (e) {
      Alert.alert('Erreur', e.response?.data || 'Impossible de sauvegarder.');
    } finally { setSaving(false); }
  };

  const handleDelete = (item) => {
    Alert.alert(
      'Supprimer',
      `Supprimer "${item.actionN2}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: async () => {
          try {
            const t = await getToken();
            await axios.delete(`${API}/${item.id}`,
              { headers: { Authorization: `Bearer ${t}` } });
            loadData();
          } catch { Alert.alert('Erreur', 'Impossible de supprimer'); }
        }},
      ]
    );
  };

  // Toggle rapide P ou R directement depuis le tableau
  const toggleEtat = async (item, field) => {
    if (!canEdit(userRole)) return;
    const current = item[field] || '';
    const next = (current && current !== '-')
      ? ''
      : new Date().toLocaleDateString('fr-FR');
    try {
      const token = await getToken();
      await axios.put(`${API}/${item.id}`,
        { ...item, [field]: next },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setData(prev => prev.map(d =>
        d.id === item.id ? { ...d, [field]: next } : d
      ));
    } catch { Alert.alert('Erreur', 'Impossible de mettre à jour'); }
  };

  // Compteurs
  const nbPlanifie = data.filter(d => d.planifie && d.planifie !== '-').length;
  const nbRealise  = data.filter(d => d.realise  && d.realise  !== '-').length;

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const pInfo = PERIODE_MAP[selectedPeriode];
      const rows = data.map((d, i) => `
        <tr style="background:${i % 2 === 0 ? '#fff' : '#f8f9fa'}">
          <td style="text-align:center;font-weight:bold">${d.ordre}</td>
          <td><b>${d.actionN2 || ''}</b></td>
          <td>${d.responsableNom || '—'}</td>
          <td style="text-align:center">${d.cdt || ''}</td>
          <td>${d.frequence || ''}</td>
          <td>${d.lienRisque || ''}</td>
          <td style="text-align:center;background:${d.planifie && d.planifie !== '-' ? '#d6eaf8' : '#f8f9fa'};
            color:${d.planifie && d.planifie !== '-' ? '#2980B9' : '#999'};font-weight:bold">
            ${d.planifie && d.planifie !== '-' ? '✓ ' + d.planifie : '—'}
          </td>
          <td style="text-align:center;background:${d.realise && d.realise !== '-' ? '#d5f5e3' : '#f8f9fa'};
            color:${d.realise && d.realise !== '-' ? '#27AE60' : '#999'};font-weight:bold">
            ${d.realise && d.realise !== '-' ? '✓ ' + d.realise : '—'}
          </td>
          <td style="font-size:7px">${d.observations || ''}</td>
        </tr>`).join('');

      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
* { margin:0;padding:0;box-sizing:border-box; }
body { font-family:Arial,sans-serif;font-size:8px;padding:10px; }
@page { size:A4 landscape;margin:6mm; }
table { width:100%;border-collapse:collapse; }
th { background:#0A1628;color:#fff;padding:4px 3px;font-size:7px;
     border:1px solid #ccc;text-align:left; }
td { font-size:7px;padding:3px;border:1px solid #ddd;vertical-align:top; }
</style></head><body>
<div style="display:flex;justify-content:space-between;align-items:center;
  background:#0A1628;color:#fff;padding:8px 12px;border-radius:6px;margin-bottom:8px">
  <div>
    <div style="font-size:14px;font-weight:bold;color:#C9A84C">ONCF · DRIC</div>
    <div style="font-size:9px">
      PDVS ${pInfo.icon} ${pInfo.label} N2 — ${userEntite}
    </div>
  </div>
  <div style="text-align:right">
    <div style="font-size:12px;font-weight:bold">PDVS ${pInfo.label} N2 — ${selectedAnnee}</div>
    <div style="font-size:9px;color:#C9A84C">
      ${data.length} action(s) · P: ${nbPlanifie} · R: ${nbRealise} ·
      Généré le ${new Date().toLocaleDateString('fr-FR')}
    </div>
  </div>
</div>
<div style="display:flex;gap:8px;margin-bottom:8px">
  <div style="background:#2980B9;color:white;padding:3px 10px;border-radius:4px;font-size:8px;font-weight:bold">
    Planifié (P) : ${nbPlanifie}/${data.length}
  </div>
  <div style="background:#27AE60;color:white;padding:3px 10px;border-radius:4px;font-size:8px;font-weight:bold">
    Réalisé (R) : ${nbRealise}/${data.length}
  </div>
</div>
<table><thead><tr>
  <th style="width:3%;text-align:center">N°</th>
  <th style="width:20%">Action N2</th>
  <th style="width:10%">Resp.</th>
  <th style="width:7%;text-align:center">CDT</th>
  <th style="width:8%">Fréq.</th>
  <th style="width:7%">Lien risque</th>
  <th style="width:12%;text-align:center">P (Planifié)</th>
  <th style="width:12%;text-align:center">R (Réalisé)</th>
  <th>Observations</th>
</tr></thead><tbody>${rows}</tbody></table>
</body></html>`;

      const { uri } = await Print.printToFileAsync({
        html, base64: false, width: 842, height: 595
      });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `PDVS ${periodeInfo.label} N2 — ${selectedAnnee}`,
        UTI: 'com.adobe.pdf',
      });
    } catch { Alert.alert('Erreur', 'Impossible de générer le PDF'); }
    finally { setGenerating(false); }
  };

  // ================================================================
  // ÉTAPE 0 — Sélection période + année
  // ================================================================
  if (step === 0) {
    return (
      <Wrapper style={Platform.OS === 'web' ? s.webSafe : s.safe}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={s.backText}>← Retour</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>PDVS Été / Ramadan N2</Text>
          <Text style={s.headerSub}>Actions spécifiques périodes sensibles</Text>
        </View>

        {loading ? <ActivityIndicator color="#C9A84C" style={{ marginTop: 40 }} /> : (
          <Scroller style={Platform.OS === 'web' ? s.webScroller : s.list} {...(Platform.OS !== 'web' && { showsVerticalScrollIndicator: false })}>

            {/* Sélection Période */}
            <Text style={s.sectionLabel}>Période</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
              {PERIODES.map(p => (
                <TouchableOpacity key={p.key}
                  style={[er.periodeBtn,
                    { borderColor: p.color },
                    selectedPeriode === p.key && { backgroundColor: p.bg }]}
                  onPress={() => setSelectedPeriode(p.key)}>
                  <Text style={er.periodeBtnIcon}>{p.icon}</Text>
                  <Text style={[er.periodeBtnLabel,
                    { color: selectedPeriode === p.key ? p.color : '#607D8B' }]}>
                    {p.label}
                  </Text>
                  {selectedPeriode === p.key && (
                    <View style={[er.periodeBtnCheck, { backgroundColor: p.color }]}>
                      <Text style={{ color: '#fff', fontSize: 10 }}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Sélection Année */}
            <Text style={s.sectionLabel}>Année</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              style={{ flexGrow: 0, marginBottom: 24 }}>
              {annees.map(a => (
                <TouchableOpacity key={a}
                  style={[s.chipBtn, selectedAnnee === a && s.chipBtnActive]}
                  onPress={() => setSelectedAnnee(a)}>
                  <Text style={[s.chipText, selectedAnnee === a && s.chipTextActive]}>{a}</Text>
                </TouchableOpacity>
              ))}
              {canEdit(userRole) && (
                <TouchableOpacity style={[s.chipBtn, { borderColor: '#C9A84C', borderStyle: 'dashed' }]}
                  onPress={() => {
                    const ny = Math.max(...annees) + 1;
                    setAnnees(p => [ny, ...p]); setSelectedAnnee(ny);
                  }}>
                  <Text style={[s.chipText, { color: '#C9A84C' }]} numberOfLines={1}>
                    + {Math.max(...annees) + 1}
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            {/* Info */}
            <View style={[er.infoBox, { borderColor: periodeInfo.color }]}>
              <Text style={{ fontSize: 28, marginBottom: 6 }}>{periodeInfo.icon}</Text>
              <Text style={[er.infoTitle, { color: periodeInfo.color }]}>
                Période {periodeInfo.label}
              </Text>
              <Text style={er.infoText}>
                8 actions pré-remplies spécifiques à la période {periodeInfo.label}.{'\n'}
                Le responsable est à remplir pour chaque ligne.{'\n'}
                P = Planifié · R = Réalisé
              </Text>
            </View>

            {userEntite && (
              <View style={s.entiteBox}>
                <Text style={s.entiteLabel}>Périmètre</Text>
                <Text style={s.entiteValue}>{userEntite}</Text>
                {CSPR_SOUS_ENTITES[userEntite] && (
                  <Text style={s.entiteSub}>
                    → {CSPR_SOUS_ENTITES[userEntite].join(' · ')}
                  </Text>
                )}
              </View>
            )}

            <TouchableOpacity
              style={[s.confirmBtn, { backgroundColor: periodeInfo.color }]}
              onPress={loadData}>
              <Text style={s.confirmBtnText}>
                {periodeInfo.icon} Consulter {periodeInfo.label} {selectedAnnee} →
              </Text>
            </TouchableOpacity>
          </Scroller>
        )}
      </Wrapper>
    );
  }

  // ================================================================
  // ÉTAPE 1 — Tableau actions
  // ================================================================
  return (
    <Wrapper style={Platform.OS === 'web' ? s.webSafe : s.safe}>

      {/* HEADER */}
      <View style={[s.header, { borderBottomColor: periodeInfo.color, borderBottomWidth: 3 }]}>
        <TouchableOpacity onPress={() => { setStep(0); setData([]); }}>
          <Text style={s.backText}>← Retour</Text>
        </TouchableOpacity>
        <View style={[s.headerRow, { flexWrap: 'wrap', gap: 6 }]}>
          <View>
            <Text style={s.headerTitle}>
              {periodeInfo.icon} PDVS {periodeInfo.label} N2 — {selectedAnnee}
            </Text>
            <Text style={s.headerSub}>
              {data.length} action(s) · P:{nbPlanifie} · R:{nbRealise} · {userEntite}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            {canEdit(userRole) && (
              <TouchableOpacity
                style={[s.addBtn, { backgroundColor: periodeInfo.color }]}
                onPress={openAdd}>
                <Text style={s.addBtnText}>+ Action</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[s.pdfBtn, generating && { opacity: 0.5 }]}
              onPress={generatePDF} disabled={generating}>
              {generating
                ? <ActivityIndicator color="#0A1628" size="small" />
                : <Text style={s.pdfBtnText}>📄 PDF</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {isCGPX(userRole) && (
        <View style={s.readOnlyBanner}>
          <Text style={s.readOnlyText}>👁 Lecture seule — {userEntite}</Text>
        </View>
      )}

      {/* Compteurs P / R */}
      <View style={[er.compteurRow, WEB && { paddingHorizontal: 24 }]}>
        <View style={er.compteurBadge}>
          <View style={[er.compteurDot, { backgroundColor: '#3498DB' }]} />
          <Text style={er.compteurText}>Planifié (P) : </Text>
          <Text style={[er.compteurVal, { color: '#3498DB' }]}>
            {nbPlanifie}/{data.length}
          </Text>
        </View>
        <View style={er.compteurBadge}>
          <View style={[er.compteurDot, { backgroundColor: '#27AE60' }]} />
          <Text style={er.compteurText}>Réalisé (R) : </Text>
          <Text style={[er.compteurVal, { color: '#27AE60' }]}>
            {nbRealise}/{data.length}
          </Text>
        </View>
        {canEdit(userRole) && (
          <Text style={er.tapHint}>
            Tapez P/R pour basculer rapidement
          </Text>
        )}
      </View>

      {loading ? <ActivityIndicator color="#C9A84C" style={{ marginTop: 40 }} /> : (
        <Scroller style={Platform.OS === 'web' ? s.webScroller : s.list} {...(Platform.OS !== 'web' && { showsVerticalScrollIndicator: false })}>

          {data.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={s.emptyIcon}>{periodeInfo.icon}</Text>
              <Text style={s.emptyText}>
                Aucune action pour {periodeInfo.label} {selectedAnnee}
              </Text>
              <Text style={s.emptySub}>
                Les 8 actions seront pré-remplies automatiquement
              </Text>
            </View>
          ) : WEB ? (
            /* ══ VERSION WEB : tableau ══ */
            <View style={er.webTable}>
              <View style={[er.webRow, er.webHead]}>
                <Text style={[er.webTh, { width: 32, textAlign: 'center' }]}>N°</Text>
                <Text style={[er.webTh, { flex: 2 }]}>Action N2</Text>
                <Text style={[er.webTh, { flex: 1 }]}>Resp.</Text>
                <Text style={[er.webTh, { width: 80, textAlign: 'center' }]}>CDT</Text>
                <Text style={[er.webTh, { flex: 0.8 }]}>Fréq.</Text>
                <Text style={[er.webTh, { width: 80 }]}>Lien risque</Text>
                <Text style={[er.webTh, { width: 90, textAlign: 'center' }]}>P</Text>
                <Text style={[er.webTh, { width: 90, textAlign: 'center' }]}>R</Text>
                <Text style={[er.webTh, { flex: 1.2 }]}>Obs.</Text>
                {canEdit(userRole) && <Text style={[er.webTh, { width: 60 }]} />}
              </View>

              {data.map((item, i) => (
                <View key={item.id}
                  style={[er.webRow,
                    i % 2 === 0 ? er.webRowEven : er.webRowOdd]}>

                  <Text style={[er.webTd, { width: 32, textAlign: 'center',
                    color: periodeInfo.color, fontWeight: 'bold' }]}>
                    {item.ordre}
                  </Text>

                  <Text style={[er.webTd, { flex: 2, color: '#FFFFFF', fontWeight: '600' }]}
                    numberOfLines={2}>{item.actionN2}</Text>

                  {/* Resp — cliquable pour ouvrir picker */}
                  <TouchableOpacity style={{ flex: 1, paddingRight: 6 }}
                    disabled={!canEdit(userRole)}
                    onPress={() => { openEdit(item); }}>
                    <Text style={[er.webTd,
                      { color: item.responsableNom ? '#C9A84C' : '#E74C3C', fontStyle: item.responsableNom ? 'normal' : 'italic' }]}>
                      {item.responsableNom || '⚠ À remplir'}
                    </Text>
                  </TouchableOpacity>

                  <Text style={[er.webTd, { width: 80, textAlign: 'center' }]}>
                    {item.cdt}
                  </Text>
                  <Text style={[er.webTd, { flex: 0.8 }]}>{item.frequence}</Text>
                  <Text style={[er.webTd, { width: 80, color: '#85C1E9' }]}>
                    {item.lienRisque}
                  </Text>

                  {/* P — toggle rapide */}
                  <TouchableOpacity
                    style={[er.webEtatBtn,
                      { width: 90 },
                      item.planifie && item.planifie !== '-'
                        ? { backgroundColor: '#1A2F4A', borderColor: '#3498DB' }
                        : { borderColor: '#2A4060' }]}
                    disabled={!canEdit(userRole)}
                    onPress={() => toggleEtat(item, 'planifie')}>
                    <Text style={{
                      color: item.planifie && item.planifie !== '-' ? '#3498DB' : '#2A4060',
                      fontSize: 10, fontWeight: 'bold', textAlign: 'center',
                    }}>
                      {item.planifie && item.planifie !== '-' ? '✓ ' + item.planifie : '—'}
                    </Text>
                  </TouchableOpacity>

                  {/* R — toggle rapide */}
                  <TouchableOpacity
                    style={[er.webEtatBtn,
                      { width: 90 },
                      item.realise && item.realise !== '-'
                        ? { backgroundColor: '#1A3A28', borderColor: '#27AE60' }
                        : { borderColor: '#2A4060' }]}
                    disabled={!canEdit(userRole)}
                    onPress={() => toggleEtat(item, 'realise')}>
                    <Text style={{
                      color: item.realise && item.realise !== '-' ? '#27AE60' : '#2A4060',
                      fontSize: 10, fontWeight: 'bold', textAlign: 'center',
                    }}>
                      {item.realise && item.realise !== '-' ? '✓ ' + item.realise : '—'}
                    </Text>
                  </TouchableOpacity>

                  <Text style={[er.webTd, { flex: 1.2 }]} numberOfLines={2}>
                    {item.observations || '—'}
                  </Text>

                  {canEdit(userRole) && (
                    <View style={{ width: 60, flexDirection: 'row', gap: 4,
                      alignItems: 'center', justifyContent: 'center' }}>
                      <TouchableOpacity style={er.webBtn}
                        onPress={() => openEdit(item)}>
                        <Text style={{ fontSize: 12 }}>✏️</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[er.webBtn,
                        { borderColor: '#E74C3C', backgroundColor: '#E74C3C20' }]}
                        onPress={() => handleDelete(item)}>
                        <Text style={{ fontSize: 12 }}>🗑</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </View>
          ) : (
            /* ══ VERSION MOBILE : cartes ══ */
            data.map(item => {
              const hasResp = item.responsableNom && item.responsableNom !== '';
              return (
                <View key={item.id}
                  style={[er.mobCard, { borderLeftColor: periodeInfo.color }]}>

                  {/* En-tête */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between',
                    alignItems: 'flex-start', marginBottom: 10 }}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={[er.numBadge, { borderColor: periodeInfo.color }]}>
                          <Text style={[er.numText, { color: periodeInfo.color }]}>
                            {item.ordre}
                          </Text>
                        </View>
                        <Text style={er.actionText}>{item.actionN2}</Text>
                      </View>

                      {/* Resp — mise en évidence si vide */}
                      <TouchableOpacity
                        style={[er.respChip,
                          hasResp
                            ? { backgroundColor: '#1E3A5F', borderColor: '#C9A84C' }
                            : { backgroundColor: '#3A0E0E', borderColor: '#E74C3C' }]}
                        disabled={!canEdit(userRole)}
                        onPress={() => openEdit(item)}>
                        <Text style={{ fontSize: 12 }}>{hasResp ? '👤' : '⚠️'}</Text>
                        <Text style={[er.respText,
                          { color: hasResp ? '#C9A84C' : '#F1948A' }]}>
                          {hasResp ? item.responsableNom : 'Resp. à remplir'}
                        </Text>
                      </TouchableOpacity>

                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 4,
                        flexWrap: 'wrap' }}>
                        {item.cdt && (
                          <View style={er.infoChip}>
                            <Text style={er.infoChipText}>CDT: {item.cdt}</Text>
                          </View>
                        )}
                        {item.frequence && (
                          <View style={er.infoChip}>
                            <Text style={er.infoChipText}>🔁 {item.frequence}</Text>
                          </View>
                        )}
                        {item.lienRisque && item.lienRisque !== '—' && (
                          <View style={[er.infoChip, { borderColor: '#85C1E9' }]}>
                            <Text style={[er.infoChipText, { color: '#85C1E9' }]}>
                              🔗 {item.lienRisque}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Boutons édition */}
                    {canEdit(userRole) && (
                      <View style={{ gap: 4 }}>
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

                  {/* P / R toggle */}
                  <View style={er.prRow}>
                    <TouchableOpacity
                      style={[er.prBtn,
                        item.planifie && item.planifie !== '-'
                          ? { backgroundColor: '#1A2F4A', borderColor: '#3498DB' }
                          : { borderColor: '#2A4060' }]}
                      disabled={!canEdit(userRole)}
                      onPress={() => toggleEtat(item, 'planifie')}>
                      <Text style={[er.prBtnLabel,
                        { color: item.planifie && item.planifie !== '-'
                          ? '#3498DB' : '#607D8B' }]}>P</Text>
                      <Text style={[er.prBtnValue,
                        { color: item.planifie && item.planifie !== '-'
                          ? '#85C1E9' : '#2A4060' }]}>
                        {item.planifie && item.planifie !== '-'
                          ? '✓ ' + item.planifie : 'Non planifié'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[er.prBtn,
                        item.realise && item.realise !== '-'
                          ? { backgroundColor: '#1A3A28', borderColor: '#27AE60' }
                          : { borderColor: '#2A4060' }]}
                      disabled={!canEdit(userRole)}
                      onPress={() => toggleEtat(item, 'realise')}>
                      <Text style={[er.prBtnLabel,
                        { color: item.realise && item.realise !== '-'
                          ? '#27AE60' : '#607D8B' }]}>R</Text>
                      <Text style={[er.prBtnValue,
                        { color: item.realise && item.realise !== '-'
                          ? '#82E0AA' : '#2A4060' }]}>
                        {item.realise && item.realise !== '-'
                          ? '✓ ' + item.realise : 'Non réalisé'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {item.observations ? (
                    <Text style={er.obsText}>📝 {item.observations}</Text>
                  ) : null}
                </View>
              );
            })
          )}
          <View style={{ height: 40 }} />
        </Scroller>
      )}

      {/* ════════════════════════════════════════════════
          MODAL — null | 'form' | 'respPicker' | 'cdtSelect'
      ════════════════════════════════════════════════ */}
      <Modal
        visible={modalView !== null}
        transparent animationType="slide" statusBarTranslucent
        onRequestClose={() => {
          if (modalView === 'respPicker' || modalView === 'cdtSelect')
            setModalView('form');
          else closeModal();
        }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}>
          <View style={[s.modalOverlay,
            WEB && { justifyContent: 'center', alignItems: 'center' }]}>

            {/* ── PICKER RESPONSABLE ── */}
            {modalView === 'respPicker' && (
              <View style={[s.modalBox,
                WEB && { borderRadius: 16, maxWidth: 560, width: '90%', maxHeight: '80%' }]}>
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>👤 Choisir un responsable</Text>
                  <TouchableOpacity onPress={() => { setUserSearch(''); setModalView('form'); }}>
                    <Text style={s.closeBtn}>✕</Text>
                  </TouchableOpacity>
                </View>
                <TextInput style={[s.input, { marginBottom: 10 }]}
                  value={userSearch} onChangeText={setUserSearch}
                  placeholder="Rechercher…" placeholderTextColor="#607D8B" autoFocus />
                <ScrollView showsVerticalScrollIndicator={false}>
                  {Object.entries(usersByEntite).map(([entite, eu]) => (
                    <View key={entite}>
                      <View style={er.entiteGrpHeader}>
                        <Text style={er.entiteGrpTitle}>📍 {entite}</Text>
                        <Text style={er.entiteGrpCount}>{eu.length}</Text>
                      </View>
                      {eu.map(u => (
                        <TouchableOpacity key={u.id} style={er.userItem}
                          onPress={() => selectResp(u)}>
                          <View style={er.avatar}>
                            <Text style={er.avatarText}>
                              {(u.fullName || '?')[0].toUpperCase()}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={er.userName}>{u.fullName}</Text>
                            <Text style={er.userSub}>
                              {u.matricule}{u.fonctionAssuree ? ` · ${u.fonctionAssuree}` : ''}
                            </Text>
                          </View>
                          <Text style={{ color: '#C9A84C', fontSize: 18 }}>›</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ))}
                  <View style={{ height: 20 }} />
                </ScrollView>
              </View>
            )}

            {/* ── SÉLECTEUR CDT ── */}
            {modalView === 'cdtSelect' && (
              <View style={[s.modalBox,
                WEB && { borderRadius: 16, maxWidth: 400, width: '90%', maxHeight: '50%' }]}>
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>📍 Sélectionner CDT</Text>
                  <TouchableOpacity onPress={() => setModalView('form')}>
                    <Text style={s.closeBtn}>✕</Text>
                  </TouchableOpacity>
                </View>
                {CDT_OPTIONS.map(opt => (
                  <TouchableOpacity key={opt}
                    style={[er.cdtItem,
                      form.cdt === opt && {
                        borderColor: periodeInfo.color,
                        backgroundColor: periodeInfo.bg,
                      }]}
                    onPress={() => { setF('cdt', opt); setModalView('form'); }}>
                    <Text style={[er.cdtText,
                      form.cdt === opt && { color: periodeInfo.color, fontWeight: 'bold' }]}>
                      {opt}
                    </Text>
                    {form.cdt === opt && (
                      <Text style={{ color: periodeInfo.color, marginLeft: 'auto' }}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* ── FORMULAIRE PRINCIPAL ── */}
            {modalView === 'form' && (
              <View style={[s.modalBox,
                WEB && { borderRadius: 16, maxWidth: 680, width: '90%',
                  maxHeight: '92%', alignSelf: 'center' }]}>
                <ScrollView showsVerticalScrollIndicator={false}>

                  <View style={s.modalHeader}>
                    <Text style={s.modalTitle}>
                      {editing
                        ? `✏️ Modifier — ${periodeInfo.icon} ${periodeInfo.label}`
                        : `➕ Nouvelle action — ${periodeInfo.icon} ${periodeInfo.label}`}
                    </Text>
                    <TouchableOpacity onPress={closeModal}>
                      <Text style={s.closeBtn}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Action */}
                  <Text style={s.sectionTitle}>Action N2 *</Text>
                  <TextInput
                    style={[s.input, { height: 70, textAlignVertical: 'top' }]}
                    value={form.actionN2}
                    onChangeText={v => setF('actionN2', v)}
                    multiline
                    placeholder="Description de l'action N2…"
                    placeholderTextColor="#607D8B" />

                  {/* Identification */}
                  <Text style={s.sectionTitle}>Identification</Text>

                  <View style={WEB ? { flexDirection: 'row', gap: 12 } : {}}>
                    <View style={WEB ? { flex: 1 } : {}}>
                      <Text style={s.fieldLabel}>CDT concerné</Text>
                      <TouchableOpacity
                        style={[s.input, {
                          flexDirection: 'row', alignItems: 'center',
                          justifyContent: 'space-between',
                          borderColor: periodeInfo.color,
                        }]}
                        onPress={() => setModalView('cdtSelect')}>
                        <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: 'bold' }}>
                          {form.cdt || 'Choisir…'}
                        </Text>
                        <Text style={{ color: '#C9A84C' }}>›</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={WEB ? { flex: 1 } : {}}>
                      <Text style={s.fieldLabel}>Fréquence</Text>
                      <TextInput style={s.input}
                        value={form.frequence}
                        onChangeText={v => setF('frequence', v)}
                        placeholder="Ex: Hebdo, Bimensuel…"
                        placeholderTextColor="#607D8B" />
                    </View>
                    <View style={WEB ? { flex: 0.8 } : {}}>
                      <Text style={s.fieldLabel}>Lien risque</Text>
                      <TextInput style={s.input}
                        value={form.lienRisque}
                        onChangeText={v => setF('lienRisque', v)}
                        placeholder="RH-01, RE-02…"
                        placeholderTextColor="#607D8B" />
                    </View>
                  </View>

                  {/* Responsable */}
                  <Text style={s.sectionTitle}>Responsable</Text>
                  <TouchableOpacity
                    style={[s.input, {
                      flexDirection: 'row', alignItems: 'center',
                      justifyContent: 'space-between',
                      borderColor: form.responsableNom ? '#C9A84C' : '#E74C3C',
                      borderWidth: form.responsableNom ? 1 : 1.5,
                    }]}
                    onPress={() => setModalView('respPicker')}>
                    {form.responsableNom ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                        <View style={[er.avatar, { width: 28, height: 28, borderRadius: 14 }]}>
                          <Text style={[er.avatarText, { fontSize: 12 }]}>
                            {form.responsableNom[0].toUpperCase()}
                          </Text>
                        </View>
                        <Text style={{ color: '#FFFFFF', fontSize: 13 }}>{form.responsableNom}</Text>
                      </View>
                    ) : (
                      <Text style={{ color: '#F1948A', fontSize: 13, flex: 1 }}>
                        ⚠️ Responsable obligatoire — Choisir…
                      </Text>
                    )}
                    <Text style={{ color: '#C9A84C', fontSize: 18 }}>›</Text>
                  </TouchableOpacity>

                  {/* P / R */}
                  <Text style={s.sectionTitle}>Planification & Réalisation</Text>
                  <View style={WEB ? { flexDirection: 'row', gap: 12 } : { gap: 8 }}>
                    <View style={WEB ? { flex: 1 } : {}}>
                      <Text style={s.fieldLabel}>P — Planifié (date ou remarque)</Text>
                      <TextInput style={s.input}
                        value={form.planifie}
                        onChangeText={v => setF('planifie', v)}
                        placeholder="Ex: 15/06/2026 ou Semaine 24"
                        placeholderTextColor="#607D8B" />
                    </View>
                    <View style={WEB ? { flex: 1 } : {}}>
                      <Text style={s.fieldLabel}>R — Réalisé (date ou remarque)</Text>
                      <TextInput style={s.input}
                        value={form.realise}
                        onChangeText={v => setF('realise', v)}
                        placeholder="Ex: 18/06/2026 ou Effectué"
                        placeholderTextColor="#607D8B" />
                    </View>
                  </View>

                  {/* Observations */}
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
                      style={[s.saveBtn,
                        { backgroundColor: periodeInfo.color },
                        saving && { opacity: 0.5 }]}
                      onPress={handleSave} disabled={saving}>
                      {saving
                        ? <ActivityIndicator color="#fff" size="small" />
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
    borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 20,
  },
  confirmBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
  addBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  addBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 12 },
  pdfBtn: {
    backgroundColor: '#C9A84C', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
  },
  pdfBtnText: { color: '#0A1628', fontWeight: 'bold', fontSize: 12 },
  readOnlyBanner: {
    backgroundColor: '#1A2F4A', marginHorizontal: 14, marginBottom: 8,
    borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#4A90D9',
  },
  readOnlyText: { color: '#85C1E9', fontSize: 12, fontWeight: '600' },
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  emptySub: { color: '#607D8B', fontSize: 12, marginTop: 6 },
  editBtn: {
    backgroundColor: '#4A90D920', borderRadius: 6, padding: 6,
    borderWidth: 1, borderColor: '#4A90D9',
  },
  editBtnText: { fontSize: 13 },
  deleteBtn: {
    backgroundColor: '#E74C3C20', borderRadius: 6, padding: 6,
    borderWidth: 1, borderColor: '#E74C3C',
  },
  deleteBtnText: { fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: '#00000090', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: '#0F2137', borderTopLeftRadius: 24,
    borderTopRightRadius: 24, padding: 24, maxHeight: '93%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  },
  modalTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold', flex: 1 },
  closeBtn: { color: '#607D8B', fontSize: 20, marginLeft: 8 },
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
  saveBtn: { flex: 2, borderRadius: 10, padding: 14, alignItems: 'center' },
  saveBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
});

const er = StyleSheet.create({
  // Page sélection
  periodeBtn: {
    flex: 1, borderRadius: 14, borderWidth: 2, padding: 16,
    alignItems: 'center', gap: 6, position: 'relative',
  },
  periodeBtnIcon: { fontSize: 32 },
  periodeBtnLabel: { fontSize: 14, fontWeight: 'bold' },
  periodeBtnCheck: {
    position: 'absolute', top: 8, right: 8,
    width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  infoBox: {
    borderRadius: 12, borderWidth: 1.5, padding: 16,
    marginBottom: 16, alignItems: 'center',
    backgroundColor: '#0F2137',
  },
  infoTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  infoText: { color: '#B0BEC5', fontSize: 12, textAlign: 'center', lineHeight: 18 },
  // Compteurs
  compteurRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, marginBottom: 8, flexWrap: 'wrap',
  },
  compteurBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#0F2137', borderRadius: 8, padding: 8,
    borderWidth: 1, borderColor: '#2A4060',
  },
  compteurDot: { width: 8, height: 8, borderRadius: 4 },
  compteurText: { color: '#607D8B', fontSize: 11 },
  compteurVal: { fontWeight: 'bold', fontSize: 12 },
  tapHint: { color: '#2A4060', fontSize: 10, fontStyle: 'italic', flex: 1, textAlign: 'right' },
  // Cellule état (formulaire)
  etatCell: {
    flex: 1, borderRadius: 8, borderWidth: 1, borderColor: '#2A4060',
    backgroundColor: '#1A2F4A', padding: 8, alignItems: 'center',
  },
  etatLabel: { color: '#607D8B', fontSize: 10, fontWeight: 'bold' },
  etatValue: { color: '#607D8B', fontSize: 11, marginTop: 2 },
  // Mobile cards
  mobCard: {
    backgroundColor: '#0F2137', borderRadius: 12, padding: 14,
    marginBottom: 10, borderLeftWidth: 4,
  },
  numBadge: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#1E3A5F',
    borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginRight: 4,
  },
  numText: { fontSize: 12, fontWeight: 'bold' },
  actionText: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold', flex: 1, flexWrap: 'wrap' },
  respChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 8, borderWidth: 1, padding: 8, marginTop: 8,
    alignSelf: 'flex-start',
  },
  respText: { fontSize: 12, fontWeight: 'bold' },
  infoChip: {
    backgroundColor: '#1A2F4A', borderRadius: 6, borderWidth: 1,
    borderColor: '#2A4060', paddingHorizontal: 8, paddingVertical: 3,
  },
  infoChipText: { color: '#607D8B', fontSize: 10 },
  prRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  prBtn: {
    flex: 1, borderRadius: 8, borderWidth: 1.5,
    backgroundColor: '#0F2137', padding: 10, alignItems: 'center', gap: 2,
  },
  prBtnLabel: { fontSize: 16, fontWeight: 'bold' },
  prBtnValue: { fontSize: 10 },
  obsText: { color: '#B0BEC5', fontSize: 11, marginTop: 8 },
  // Web table
  webTable: {
    backgroundColor: '#0F2137', borderRadius: 10,
    overflow: 'hidden', borderWidth: 1, borderColor: '#2A4060', marginBottom: 8,
  },
  webRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, paddingHorizontal: 10,
  },
  webHead: { backgroundColor: '#1A2F4A', borderBottomWidth: 1, borderBottomColor: '#2A4060' },
  webRowEven: { backgroundColor: '#0F2137' },
  webRowOdd: { backgroundColor: '#111D30' },
  webTh: { color: '#C9A84C', fontSize: 10, fontWeight: 'bold', paddingRight: 6 },
  webTd: { color: '#B0BEC5', fontSize: 10, paddingRight: 6 },
  webEtatBtn: {
    borderRadius: 6, borderWidth: 1, padding: 4,
    alignItems: 'center', justifyContent: 'center', marginRight: 6,
  },
  webBtn: {
    backgroundColor: '#4A90D920', borderRadius: 5, padding: 5,
    borderWidth: 1, borderColor: '#4A90D9',
  },
  // Picker resp
  entiteGrpHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#1E3A5F', borderRadius: 6, padding: 8, marginBottom: 4, marginTop: 8,
  },
  entiteGrpTitle: { color: '#C9A84C', fontSize: 12, fontWeight: 'bold' },
  entiteGrpCount: { color: '#607D8B', fontSize: 11 },
  userItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#1A2F4A', borderRadius: 8, padding: 10, marginBottom: 4,
  },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#1E3A5F', borderWidth: 1, borderColor: '#C9A84C',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#C9A84C', fontWeight: 'bold', fontSize: 14 },
  userName: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold' },
  userSub: { color: '#607D8B', fontSize: 11, marginTop: 2 },
  // CDT select
  cdtItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1A2F4A', borderRadius: 8, padding: 14,
    marginBottom: 6, borderWidth: 1, borderColor: '#2A4060',
  },
  cdtText: { color: '#B0BEC5', fontSize: 14, flex: 1 },
});
