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

const API       = API_URL.replace('/auth', '/pdvs/pasf-n2');
const API_USERS = API_URL.replace('/auth', '/admin/users');

// ================================================================
// CONSTANTES
// ================================================================
const STATUTS = [
  { key: 'EN_COURS',  label: 'En cours',  icon: '🔵', color: '#3498DB', bg: '#1A2F4A', border: '#3498DB' },
  { key: 'REALISE',   label: 'Réalisé',   icon: '✅', color: '#27AE60', bg: '#1A3A28', border: '#27AE60' },
  { key: 'EN_RETARD', label: 'En retard', icon: '⚠️', color: '#F39C12', bg: '#3A2800', border: '#F39C12' },
  { key: 'ANNULE',    label: 'Annulé',    icon: '❌', color: '#E74C3C', bg: '#3A0E0E', border: '#E74C3C' },
];
const STATUT_MAP = Object.fromEntries(STATUTS.map(s => [s.key, s]));

const CSPR_SOUS_ENTITES = {
  'CT Voie': ['CDT 101V', 'CDT 102V', 'CDT OA OH OT'],
  'CT CSS':  ['CDT 101LC', 'CDT 101SST'],
};

const canEdit = (role) => role === 'CSPR' || role === 'ADMIN';
const isCGPX  = (role) => role === 'CGPX';

const EMPTY_FORM = {
  processus: '', axeNoss: '', source: '', action: '',
  responsableNom: '', responsableMatricule: '',
  contributeurs: '', echeance: '', indicateur: '',
  objectif: '', avancementPct: '', statut: 'EN_COURS',
};

// ================================================================
// COMPOSANTS
// ================================================================
function StatutBadge({ statut, small }) {
  const st = STATUT_MAP[statut] || STATUT_MAP['EN_COURS'];
  return (
    <View style={[ps.statutBadge,
      { backgroundColor: st.bg, borderColor: st.border },
      small && { paddingHorizontal: 6, paddingVertical: 2 }]}>
      <Text style={{ fontSize: small ? 10 : 12 }}>{st.icon}</Text>
      <Text style={[ps.statutText, { color: st.color },
        small && { fontSize: 10 }]}>{st.label}</Text>
    </View>
  );
}

function AvancementBar({ pct }) {
  const val = Math.min(100, Math.max(0, parseInt(pct) || 0));
  const color = val >= 100 ? '#27AE60' : val >= 50 ? '#F39C12' : '#3498DB';
  return (
    <View style={ps.avancBar}>
      <View style={[ps.avancFill, { width: `${val}%`, backgroundColor: color }]} />
      <Text style={[ps.avancText, { color }]}>{val}%</Text>
    </View>
  );
}

// ================================================================
// ÉCRAN PRINCIPAL
// ================================================================
export default function PasfN2Screen({ navigation }) {
  const Wrapper = Platform.OS === 'web' ? View : SafeAreaView;
  const Scroller = Platform.OS === 'web' ? View : ScrollView;

  const { width } = useWindowDimensions();
  const WEB = Platform.OS === 'web' && width > 768;

  const [selectedAnnee, setSelectedAnnee] = useState(new Date().getFullYear());
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
  const [filterStatut, setFilterStatut] = useState('ALL');

  // null | 'form' | 'respPicker' | 'statutSelect'
  const [modalView, setModalView] = useState(null);

  const getToken = async () => await AsyncStorage.getItem('token');
  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => { loadInitial(); }, []);

  const loadInitial = async () => {
    setLoading(true);
    try {
      const ud = await AsyncStorage.getItem('user');
      if (ud) { const u = JSON.parse(ud); setUserRole(u.role||''); setUserEntite(u.entite||''); }
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
      const res = await axios.get(`${API}?annee=${selectedAnnee}`,
        { headers: { Authorization: `Bearer ${token}` } });
      setData(res.data);
      setStep(1);
    } catch { Alert.alert('Erreur', 'Impossible de charger'); }
    finally { setLoading(false); }
  };

  // Filtres
  const dataFiltered = filterStatut === 'ALL'
    ? data
    : data.filter(d => d.statut === filterStatut);

  // Compteurs statuts
  const counts = STATUTS.reduce((acc, s) => {
    acc[s.key] = data.filter(d => d.statut === s.key).length;
    return acc;
  }, {});

  // Avancement global moyen
  const avgAvanc = data.length
    ? Math.round(data.reduce((s, d) => s + (d.avancementPct || 0), 0) / data.length)
    : 0;

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

  const openAdd = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setModalView('form');
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      processus:            item.processus || '',
      axeNoss:              item.axeNoss || '',
      source:               item.source || '',
      action:               item.action || '',
      responsableNom:       item.responsableNom || '',
      responsableMatricule: item.responsableMatricule || '',
      contributeurs:        item.contributeurs || '',
      echeance:             item.echeance || '',
      indicateur:           item.indicateur || '',
      objectif:             item.objectif || '',
      avancementPct:        item.avancementPct != null ? String(item.avancementPct) : '',
      statut:               item.statut || 'EN_COURS',
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
    if (!form.action.trim()) { Alert.alert('Incomplet', 'L\'action est obligatoire'); return; }
    setSaving(true);
    try {
      const token = await getToken();
      const payload = {
        ...form,
        annee: selectedAnnee,
        entiteCSPR: userEntite,
        avancementPct: form.avancementPct ? parseInt(form.avancementPct) : null,
      };
      if (editing)
        await axios.put(`${API}/${editing.id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
      else
        await axios.post(API, payload, { headers: { Authorization: `Bearer ${token}` } });
      closeModal();
      loadData();
    } catch (e) {
      Alert.alert('Erreur', e.response?.data || 'Impossible de sauvegarder.');
    } finally { setSaving(false); }
  };

  const handleDelete = (item) => {
    Alert.alert('Supprimer',
      `Supprimer la ligne "${item.processus} — ${item.axeNoss}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: async () => {
          try {
            const t = await getToken();
            await axios.delete(`${API}/${item.id}`, { headers: { Authorization: `Bearer ${t}` } });
            loadData();
          } catch { Alert.alert('Erreur', 'Impossible de supprimer'); }
        }},
      ]);
  };

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const rows = data.map((d, i) => {
        const st = STATUT_MAP[d.statut] || STATUT_MAP['EN_COURS'];
        const avPct = d.avancementPct || 0;
        const avColor = avPct >= 100 ? '#27AE60' : avPct >= 50 ? '#F39C12' : '#3498DB';
        return `<tr style="background:${i%2===0?'#fff':'#f8f9fa'}">
          <td style="text-align:center;font-weight:bold">${d.ordre}</td>
          <td style="font-weight:bold;color:#0A1628">${d.processus||''}</td>
          <td>${d.axeNoss||''}</td>
          <td style="font-size:7px">${d.source||''}</td>
          <td style="font-size:7px"><b>${d.action||''}</b></td>
          <td>${d.responsableNom||''}</td>
          <td style="font-size:7px">${d.contributeurs||''}</td>
          <td>${d.echeance||''}</td>
          <td style="font-size:7px">${d.indicateur||''}</td>
          <td style="font-size:7px">${d.objectif||''}</td>
          <td style="text-align:center">
            <div style="background:#eee;border-radius:4px;height:10px;width:60px;display:inline-block;vertical-align:middle">
              <div style="background:${avColor};height:10px;border-radius:4px;width:${avPct}%"></div>
            </div>
            <span style="color:${avColor};font-weight:bold;font-size:8px;margin-left:4px">${avPct}%</span>
          </td>
          <td style="text-align:center;background:${st.bg};color:${st.color};font-weight:bold">
            ${st.icon} ${st.label}
          </td>
        </tr>`;
      }).join('');

      // Barre de synthèse
      const statutSummary = STATUTS.map(s =>
        `<span style="background:${s.bg};color:${s.color};border:1px solid ${s.border};
          padding:2px 8px;border-radius:4px;font-size:8px;font-weight:bold;margin-right:4px">
          ${s.icon} ${s.label} : ${counts[s.key]||0}
        </span>`
      ).join('');

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
    <div style="font-size:9px">PASF N2 — ${userEntite} — Contribution au Plan d'Actions de Sécurité Ferroviaire</div>
  </div>
  <div style="text-align:right">
    <div style="font-size:12px;font-weight:bold">PASF N2 — ${selectedAnnee}</div>
    <div style="font-size:9px;color:#C9A84C">
      ${data.length} action(s) · Avancement moyen : ${avgAvanc}% ·
      Généré le ${new Date().toLocaleDateString('fr-FR')}
    </div>
  </div>
</div>
<div style="margin-bottom:8px">${statutSummary}</div>
<table><thead><tr>
  <th style="width:3%">N°</th>
  <th style="width:6%">Processus</th>
  <th style="width:7%">Axe NOSS</th>
  <th style="width:5%">Source</th>
  <th style="width:13%">Action</th>
  <th style="width:8%">Resp.</th>
  <th style="width:8%">Contrib.</th>
  <th style="width:6%">Échéance</th>
  <th style="width:10%">Indicateur</th>
  <th style="width:10%">Objectif</th>
  <th style="width:7%">Av.%</th>
  <th style="width:7%">Statut</th>
</tr></thead><tbody>${rows}</tbody></table>
<div style="margin-top:8px;font-size:8px;color:#607D8B;border-top:1px solid #ddd;padding-top:6px">
  ⚠️ L'action Pr08 FOH est obligatoire — RMS V01 §Pr07
</div>
</body></html>`;

      const { uri } = await Print.printToFileAsync({ html, base64: false, width: 842, height: 595 });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `PASF N2 — ${selectedAnnee}`,
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
      <Wrapper style={Platform.OS === 'web' ? s.webSafe : s.safe}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={s.backText}>← Retour</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>🎯 Contribution PASF N2</Text>
          <Text style={s.headerSub}>Plan d'Actions de Sécurité Ferroviaire · 8 processus</Text>
        </View>

        {loading ? <ActivityIndicator color="#C9A84C" style={{ marginTop: 40 }} /> : (
          <Scroller style={Platform.OS === 'web' ? s.webScroller : s.list} {...(Platform.OS !== 'web' && { showsVerticalScrollIndicator: false })}>
            <Text style={s.sectionLabel}>Année</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginBottom: 20 }}>
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
                  <Text style={[s.chipText, { color: '#C9A84C' }]} numberOfLines={1}>+ {Math.max(...annees) + 1}</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            {/* Info */}
            <View style={ps.infoBox}>
              <Text style={ps.infoText}>
                💡 8 actions pré-remplies depuis la feuille PASF N2 (RMS V01).{'\n'}
                L'action <Text style={{ color: '#F39C12', fontWeight: 'bold' }}>Pr08 FOH ⚠</Text> est obligatoire.{'\n'}
                Vous pouvez ajouter, modifier ou supprimer des lignes.
              </Text>
            </View>

            {/* Statuts légende */}
            <Text style={s.sectionLabel}>Statuts</Text>
            <View style={[{ gap: 8, marginBottom: 20 }, WEB && { flexDirection: 'row', flexWrap: 'wrap' }]}>
              {STATUTS.map(st => (
                <View key={st.key}
                  style={[ps.statutCard, { borderLeftColor: st.color }, WEB && { flex: 1 }]}>
                  <Text style={{ fontSize: 18 }}>{st.icon}</Text>
                  <Text style={[{ fontSize: 12, fontWeight: 'bold', color: st.color, marginLeft: 8 }]}>
                    {st.label}
                  </Text>
                </View>
              ))}
            </View>

            {userEntite && (
              <View style={s.entiteBox}>
                <Text style={s.entiteLabel}>Périmètre</Text>
                <Text style={s.entiteValue}>{userEntite}</Text>
                {CSPR_SOUS_ENTITES[userEntite] && (
                  <Text style={s.entiteSub}>→ {CSPR_SOUS_ENTITES[userEntite].join(' · ')}</Text>
                )}
              </View>
            )}

            <TouchableOpacity style={s.confirmBtn} onPress={loadData}>
              <Text style={s.confirmBtnText}>Consulter {selectedAnnee} →</Text>
            </TouchableOpacity>
          </Scroller>
        )}
      </Wrapper>
    );
  }

  // ================================================================
  // ÉTAPE 1 — Tableau PASF
  // ================================================================
  return (
    <Wrapper style={Platform.OS === 'web' ? s.webSafe : s.safe}>

      {/* HEADER */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => { setStep(0); setData([]); }}>
          <Text style={s.backText}>← Retour</Text>
        </TouchableOpacity>
        <View style={[s.headerRow, { flexWrap: 'wrap', gap: 6 }]}>
          <View>
            <Text style={s.headerTitle}>PASF N2 — {selectedAnnee}</Text>
            <Text style={s.headerSub}>
              {data.length} action(s) · Av. moyen {avgAvanc}% · {userEntite}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            {canEdit(userRole) && (
              <TouchableOpacity style={s.addBtn} onPress={openAdd}>
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

      {/* Bandeau lecture seule */}
      {isCGPX(userRole) && (
        <View style={s.readOnlyBanner}>
          <Text style={s.readOnlyText}>👁 Lecture seule — {userEntite}</Text>
        </View>
      )}

      {/* Avancement global */}
      {data.length > 0 && (
        <View style={[ps.globalAvanc, WEB && { marginHorizontal: 24 }]}>
          <Text style={ps.globalAvancLabel}>Avancement global</Text>
          <View style={{ flex: 1, marginHorizontal: 12 }}>
            <AvancementBar pct={avgAvanc} />
          </View>
          <Text style={ps.globalAvancPct}>{avgAvanc}%</Text>
        </View>
      )}

      {/* FILTRES STATUT */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={{ paddingHorizontal: 14, marginBottom: 8, flexGrow: 0 }}>
        <TouchableOpacity
          style={[ps.filterBtn, filterStatut === 'ALL' && ps.filterBtnAll]}
          onPress={() => setFilterStatut('ALL')}>
          <Text style={[ps.filterBtnText,
            filterStatut === 'ALL' && { color: '#0A1628', fontWeight: 'bold' }]}>
            Tous ({data.length})
          </Text>
        </TouchableOpacity>
        {STATUTS.map(st => {
          const active = filterStatut === st.key;
          return (
            <TouchableOpacity key={st.key}
              style={[ps.filterBtn, { borderColor: st.border },
                active && { backgroundColor: st.bg }]}
              onPress={() => setFilterStatut(active ? 'ALL' : st.key)}>
              <Text style={{ fontSize: 12, marginRight: 4 }}>{st.icon}</Text>
              <Text style={[ps.filterBtnText, { color: active ? st.color : '#607D8B' }]}>
                {st.label} ({counts[st.key] || 0})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? <ActivityIndicator color="#C9A84C" style={{ marginTop: 40 }} /> : (
        <Scroller style={Platform.OS === 'web' ? s.webScroller : s.list} {...(Platform.OS !== 'web' && { showsVerticalScrollIndicator: false })}>

          {dataFiltered.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={s.emptyIcon}>🎯</Text>
              <Text style={s.emptyText}>
                {filterStatut !== 'ALL'
                  ? `Aucune action "${STATUT_MAP[filterStatut]?.label}"`
                  : `Aucune action pour ${selectedAnnee}`}
              </Text>
              {canEdit(userRole) && !filterStatut && (
                <Text style={s.emptySub}>
                  Les 8 actions seront pré-remplies automatiquement
                </Text>
              )}
            </View>
          ) : WEB ? (
            /* ══ VERSION WEB : tableau ══ */
            <View style={ps.webTable}>
              {/* En-têtes */}
              <View style={[ps.webRow, ps.webHead]}>
                <Text style={[ps.webTh, { width: 32, textAlign: 'center' }]}>N°</Text>
                <Text style={[ps.webTh, { width: 80 }]}>Processus</Text>
                <Text style={[ps.webTh, { flex: 0.9 }]}>Axe NOSS</Text>
                <Text style={[ps.webTh, { width: 55 }]}>Source</Text>
                <Text style={[ps.webTh, { flex: 1.8 }]}>Action</Text>
                <Text style={[ps.webTh, { flex: 0.9 }]}>Resp.</Text>
                <Text style={[ps.webTh, { flex: 0.9 }]}>Contrib.</Text>
                <Text style={[ps.webTh, { width: 75 }]}>Échéance</Text>
                <Text style={[ps.webTh, { flex: 1 }]}>Indicateur</Text>
                <Text style={[ps.webTh, { flex: 1 }]}>Objectif</Text>
                <Text style={[ps.webTh, { width: 80 }]}>Av.</Text>
                <Text style={[ps.webTh, { width: 100 }]}>Statut</Text>
                {canEdit(userRole) && <Text style={[ps.webTh, { width: 60 }]} />}
              </View>
              {/* Lignes */}
              {dataFiltered.map((item, i) => {
                const st = STATUT_MAP[item.statut] || STATUT_MAP['EN_COURS'];
                const isFoh = (item.processus || '').includes('FOH ⚠');
                return (
                  <View key={item.id}
                    style={[ps.webRow,
                      i % 2 === 0 ? ps.webRowEven : ps.webRowOdd,
                      isFoh && { borderLeftWidth: 3, borderLeftColor: '#F39C12' }]}>
                    <Text style={[ps.webTd, { width: 32, textAlign: 'center',
                      color: '#C9A84C', fontWeight: 'bold' }]}>
                      {item.ordre}
                    </Text>
                    <View style={{ width: 80 }}>
                      <Text style={[ps.webTd, { fontWeight: 'bold',
                        color: isFoh ? '#F39C12' : '#FFFFFF' }]}>
                        {item.processus}
                      </Text>
                    </View>
                    <Text style={[ps.webTd, { flex: 0.9 }]}>{item.axeNoss}</Text>
                    <Text style={[ps.webTd, { width: 55, color: '#607D8B' }]}>{item.source}</Text>
                    <Text style={[ps.webTd, { flex: 1.8, color: '#FFFFFF' }]}
                      numberOfLines={3}>{item.action}</Text>
                    <Text style={[ps.webTd, { flex: 0.9, color: '#C9A84C' }]}>
                      {item.responsableNom || '—'}
                    </Text>
                    <Text style={[ps.webTd, { flex: 0.9 }]} numberOfLines={2}>
                      {item.contributeurs || '—'}
                    </Text>
                    <Text style={[ps.webTd, { width: 75 }]}>{item.echeance || '—'}</Text>
                    <Text style={[ps.webTd, { flex: 1 }]} numberOfLines={2}>
                      {item.indicateur || '—'}
                    </Text>
                    <Text style={[ps.webTd, { flex: 1 }]} numberOfLines={2}>
                      {item.objectif || '—'}
                    </Text>
                    <View style={{ width: 80, paddingRight: 6 }}>
                      <AvancementBar pct={item.avancementPct} />
                    </View>
                    <View style={{ width: 100, alignItems: 'flex-start' }}>
                      <StatutBadge statut={item.statut} small />
                    </View>
                    {canEdit(userRole) && (
                      <View style={{ width: 60, flexDirection: 'row', gap: 4,
                        alignItems: 'center', justifyContent: 'center' }}>
                        <TouchableOpacity style={ps.webEditBtn}
                          onPress={() => openEdit(item)}>
                          <Text style={{ fontSize: 12 }}>✏️</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[ps.webEditBtn,
                          { borderColor: '#E74C3C', backgroundColor: '#E74C3C20' }]}
                          onPress={() => handleDelete(item)}>
                          <Text style={{ fontSize: 12 }}>🗑</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ) : (
            /* ══ VERSION MOBILE : cartes ══ */
            dataFiltered.map(item => {
              const st = STATUT_MAP[item.statut] || STATUT_MAP['EN_COURS'];
              const isFoh = (item.processus || '').includes('FOH ⚠');
              return (
                <View key={item.id}
                  style={[ps.mobCard,
                    { borderLeftColor: st.color },
                    isFoh && { borderTopWidth: 2, borderTopColor: '#F39C12' }]}>

                  {/* En-tête */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between',
                    alignItems: 'flex-start', marginBottom: 8 }}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <View style={ps.numBadge}>
                          <Text style={ps.numText}>{item.ordre}</Text>
                        </View>
                        <View style={[ps.procBadge,
                          isFoh && { backgroundColor: '#3A2800', borderColor: '#F39C12' }]}>
                          <Text style={[ps.procText,
                            isFoh && { color: '#F39C12' }]}>{item.processus}</Text>
                        </View>
                        <Text style={ps.axeText}>{item.axeNoss}</Text>
                        <Text style={ps.sourceText}>{item.source}</Text>
                      </View>
                      <Text style={ps.actionText}>{item.action}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                      <StatutBadge statut={item.statut} />
                      {canEdit(userRole) && (
                        <View style={{ flexDirection: 'row', gap: 4 }}>
                          <TouchableOpacity style={s.editBtn} onPress={() => openEdit(item)}>
                            <Text style={s.editBtnText}>✏️</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={s.deleteBtn} onPress={() => handleDelete(item)}>
                            <Text style={s.deleteBtnText}>🗑</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Avancement */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <Text style={{ color: '#607D8B', fontSize: 11 }}>Avancement :</Text>
                    <View style={{ flex: 1 }}>
                      <AvancementBar pct={item.avancementPct} />
                    </View>
                  </View>

                  {/* Détails */}
                  {item.responsableNom && (
                    <Text style={ps.detailLine}>👤 {item.responsableNom}</Text>
                  )}
                  {item.echeance && (
                    <Text style={ps.detailLine}>⏰ {item.echeance}</Text>
                  )}
                  {item.indicateur && (
                    <Text style={ps.detailLine}>📊 {item.indicateur}</Text>
                  )}
                  {item.objectif && (
                    <Text style={ps.detailLine}>🎯 {item.objectif}</Text>
                  )}
                  {item.contributeurs && (
                    <Text style={ps.detailLine}>👥 {item.contributeurs}</Text>
                  )}
                </View>
              );
            })
          )}
          <View style={{ height: 40 }} />
        </Scroller>
      )}

      {/* ════════════════════════════════════════════════
          MODAL — null | 'form' | 'respPicker' | 'statutSelect'
      ════════════════════════════════════════════════ */}
      <Modal
        visible={modalView !== null}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => {
          if (modalView === 'respPicker' || modalView === 'statutSelect')
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
                      <View style={ps.entiteGrpHeader}>
                        <Text style={ps.entiteGrpTitle}>📍 {entite}</Text>
                        <Text style={ps.entiteGrpCount}>{eu.length}</Text>
                      </View>
                      {eu.map(u => (
                        <TouchableOpacity key={u.id} style={ps.userItem}
                          onPress={() => selectResp(u)}>
                          <View style={ps.avatar}>
                            <Text style={ps.avatarText}>
                              {(u.fullName || '?')[0].toUpperCase()}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={ps.userName}>{u.fullName}</Text>
                            <Text style={ps.userSub}>
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

            {/* ── SÉLECTEUR STATUT ── */}
            {modalView === 'statutSelect' && (
              <View style={[s.modalBox,
                WEB && { borderRadius: 16, maxWidth: 440, width: '90%', maxHeight: '55%' }]}>
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>📌 Statut de l'action</Text>
                  <TouchableOpacity onPress={() => setModalView('form')}>
                    <Text style={s.closeBtn}>✕</Text>
                  </TouchableOpacity>
                </View>
                {STATUTS.map(st => (
                  <TouchableOpacity key={st.key}
                    style={[ps.statutItem,
                      form.statut === st.key && {
                        borderColor: st.border,
                        backgroundColor: st.bg,
                      }]}
                    onPress={() => { setF('statut', st.key); setModalView('form'); }}>
                    <Text style={{ fontSize: 22 }}>{st.icon}</Text>
                    <Text style={[ps.statutItemText,
                      form.statut === st.key && { color: st.color, fontWeight: 'bold' }]}>
                      {st.label}
                    </Text>
                    {form.statut === st.key && (
                      <Text style={{ color: st.color, marginLeft: 'auto' }}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* ── FORMULAIRE PRINCIPAL ── */}
            {modalView === 'form' && (
              <View style={[s.modalBox,
                WEB && { borderRadius: 16, maxWidth: 720, width: '90%',
                  maxHeight: '92%', alignSelf: 'center' }]}>
                <ScrollView showsVerticalScrollIndicator={false}>

                  <View style={s.modalHeader}>
                    <Text style={s.modalTitle}>
                      {editing ? '✏️ Modifier l\'action' : '➕ Nouvelle action'}
                    </Text>
                    <TouchableOpacity onPress={closeModal}>
                      <Text style={s.closeBtn}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Identification */}
                  <Text style={s.sectionTitle}>Identification</Text>

                  <View style={WEB ? { flexDirection: 'row', gap: 12 } : {}}>
                    <View style={WEB ? { flex: 1 } : {}}>
                      <Text style={s.fieldLabel}>Processus</Text>
                      <TextInput style={s.input}
                        value={form.processus}
                        onChangeText={v => setF('processus', v)}
                        placeholder="Ex: Pr01, Pr08 FOH ⚠"
                        placeholderTextColor="#607D8B" />
                    </View>
                    <View style={WEB ? { flex: 1 } : {}}>
                      <Text style={s.fieldLabel}>Axe NOSS</Text>
                      <TextInput style={s.input}
                        value={form.axeNoss}
                        onChangeText={v => setF('axeNoss', v)}
                        placeholder="Ex: Objectifs, FOH…"
                        placeholderTextColor="#607D8B" />
                    </View>
                    <View style={WEB ? { flex: 0.6 } : {}}>
                      <Text style={s.fieldLabel}>Source</Text>
                      <TextInput style={s.input}
                        value={form.source}
                        onChangeText={v => setF('source', v)}
                        placeholder="NOSS 1…"
                        placeholderTextColor="#607D8B" />
                    </View>
                  </View>

                  {/* Action */}
                  <Text style={s.sectionTitle}>Action *</Text>
                  <TextInput
                    style={[s.input, { height: 80, textAlignVertical: 'top' }]}
                    value={form.action}
                    onChangeText={v => setF('action', v)}
                    multiline
                    placeholder="Description de l'action…"
                    placeholderTextColor="#607D8B" />

                  {/* Responsable + Contributeurs */}
                  <Text style={s.sectionTitle}>Responsable & Contributeurs</Text>

                  <Text style={s.fieldLabel}>Responsable</Text>
                  <TouchableOpacity
                    style={[s.input, {
                      flexDirection: 'row', alignItems: 'center',
                      justifyContent: 'space-between',
                      borderColor: form.responsableNom ? '#C9A84C' : '#2A4060',
                    }]}
                    onPress={() => setModalView('respPicker')}>
                    {form.responsableNom ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                        <View style={[ps.avatar, { width: 28, height: 28, borderRadius: 14 }]}>
                          <Text style={[ps.avatarText, { fontSize: 12 }]}>
                            {form.responsableNom[0].toUpperCase()}
                          </Text>
                        </View>
                        <Text style={{ color: '#FFFFFF', fontSize: 13 }}>{form.responsableNom}</Text>
                      </View>
                    ) : (
                      <Text style={{ color: '#607D8B', fontSize: 13, flex: 1 }}>
                        Choisir un responsable…
                      </Text>
                    )}
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

                  <View style={WEB ? { flexDirection: 'row', gap: 12 } : {}}>
                    <View style={WEB ? { flex: 1 } : {}}>
                      <Text style={s.fieldLabel}>Indicateur</Text>
                      <TextInput style={s.input}
                        value={form.indicateur}
                        onChangeText={v => setF('indicateur', v)}
                        placeholder="Ex: Nb incidents/an"
                        placeholderTextColor="#607D8B" />
                    </View>
                    <View style={WEB ? { flex: 1 } : {}}>
                      <Text style={s.fieldLabel}>Objectif</Text>
                      <TextInput style={s.input}
                        value={form.objectif}
                        onChangeText={v => setF('objectif', v)}
                        placeholder="Ex: Réduire ≥ 15%"
                        placeholderTextColor="#607D8B" />
                    </View>
                  </View>

                  <View style={WEB ? { flexDirection: 'row', gap: 12 } : {}}>
                    <View style={WEB ? { flex: 1 } : {}}>
                      <Text style={s.fieldLabel}>Échéance</Text>
                      <TextInput style={s.input}
                        value={form.echeance}
                        onChangeText={v => setF('echeance', v)}
                        placeholder="AAAA-MM-JJ"
                        placeholderTextColor="#607D8B" />
                    </View>
                    <View style={WEB ? { flex: 0.8 } : {}}>
                      <Text style={s.fieldLabel}>Avancement (%)</Text>
                      <TextInput style={s.input}
                        value={form.avancementPct}
                        onChangeText={v => setF('avancementPct', v)}
                        keyboardType="numeric"
                        placeholder="0 — 100"
                        placeholderTextColor="#607D8B" />
                    </View>
                    <View style={WEB ? { flex: 1 } : {}}>
                      <Text style={s.fieldLabel}>Statut</Text>
                      <TouchableOpacity
                        style={[s.input, {
                          flexDirection: 'row', alignItems: 'center',
                          justifyContent: 'space-between',
                          borderColor: STATUT_MAP[form.statut]?.border || '#2A4060',
                        }]}
                        onPress={() => setModalView('statutSelect')}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 16 }}>{STATUT_MAP[form.statut]?.icon}</Text>
                          <Text style={{
                            color: STATUT_MAP[form.statut]?.color || '#607D8B',
                            fontSize: 13, fontWeight: 'bold',
                          }}>
                            {STATUT_MAP[form.statut]?.label || 'Choisir'}
                          </Text>
                        </View>
                        <Text style={{ color: '#C9A84C' }}>›</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Preview avancement */}
                  {form.avancementPct ? (
                    <View style={{ marginTop: 8 }}>
                      <AvancementBar pct={form.avancementPct} />
                    </View>
                  ) : null}

                  <View style={s.modalBtns}>
                    <TouchableOpacity style={s.cancelBtn} onPress={closeModal}>
                      <Text style={s.cancelBtnText}>Annuler</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.saveBtn, saving && { opacity: 0.5 }]}
                      onPress={handleSave}
                      disabled={saving}>
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
  addBtn: { backgroundColor: '#C9A84C', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  addBtnText: { color: '#0A1628', fontWeight: 'bold', fontSize: 12 },
  pdfBtn: { backgroundColor: '#C9A84C', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  pdfBtnText: { color: '#0A1628', fontWeight: 'bold', fontSize: 12 },
  readOnlyBanner: {
    backgroundColor: '#1A2F4A', marginHorizontal: 14, marginBottom: 8,
    borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#4A90D9',
  },
  readOnlyText: { color: '#85C1E9', fontSize: 12, fontWeight: '600' },
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold', textAlign: 'center' },
  emptySub: { color: '#607D8B', fontSize: 12, marginTop: 6, textAlign: 'center' },
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

const ps = StyleSheet.create({
  // Info box
  infoBox: {
    backgroundColor: '#1E3A5F', borderRadius: 8, padding: 12,
    marginBottom: 16, borderWidth: 1, borderColor: '#4A90D9',
  },
  infoText: { color: '#85C1E9', fontSize: 12, lineHeight: 18 },
  // Statut cards (page accueil)
  statutCard: {
    backgroundColor: '#0F2137', borderRadius: 8, padding: 12,
    borderLeftWidth: 4, flexDirection: 'row', alignItems: 'center', marginBottom: 4,
  },
  // Avancement global
  globalAvanc: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0F2137', marginHorizontal: 14, marginBottom: 8,
    borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#2A4060',
  },
  globalAvancLabel: { color: '#607D8B', fontSize: 11 },
  globalAvancPct: { color: '#C9A84C', fontWeight: 'bold', fontSize: 14, width: 40, textAlign: 'right' },
  // Barre avancement
  avancBar: {
    height: 14, backgroundColor: '#1A2F4A', borderRadius: 7,
    overflow: 'hidden', flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#2A4060', position: 'relative',
  },
  avancFill: { height: 14, borderRadius: 7, position: 'absolute', left: 0 },
  avancText: { fontSize: 10, fontWeight: 'bold', zIndex: 1, paddingHorizontal: 4, width: '100%', textAlign: 'center' },
  // Filtres
  filterBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16,
    backgroundColor: '#0F2137', borderWidth: 1, borderColor: '#2A4060', marginRight: 6,
  },
  filterBtnAll: { backgroundColor: '#C9A84C', borderColor: '#C9A84C' },
  filterBtnText: { fontSize: 11, fontWeight: '600', color: '#607D8B' },
  // Statut badge
  statutBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1,
  },
  statutText: { fontSize: 12, fontWeight: 'bold' },
  // Statut select item
  statutItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#1A2F4A', borderRadius: 8, padding: 14,
    marginBottom: 6, borderWidth: 1, borderColor: '#2A4060',
  },
  statutItemText: { color: '#B0BEC5', fontSize: 14, flex: 1 },
  // Mobile cards
  mobCard: {
    backgroundColor: '#0F2137', borderRadius: 12, padding: 14,
    marginBottom: 10, borderLeftWidth: 4,
  },
  numBadge: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: '#1E3A5F',
    borderWidth: 1, borderColor: '#9B59B6',
    alignItems: 'center', justifyContent: 'center',
  },
  numText: { color: '#9B59B6', fontSize: 11, fontWeight: 'bold' },
  procBadge: {
    backgroundColor: '#1A2F4A', borderRadius: 6, borderWidth: 1,
    borderColor: '#4A90D9', paddingHorizontal: 8, paddingVertical: 3,
  },
  procText: { color: '#85C1E9', fontSize: 11, fontWeight: 'bold' },
  axeText: { color: '#B0BEC5', fontSize: 11 },
  sourceText: { color: '#607D8B', fontSize: 10 },
  actionText: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold', marginTop: 6, lineHeight: 18 },
  detailLine: { color: '#B0BEC5', fontSize: 11, marginTop: 4 },
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
  webEditBtn: {
    backgroundColor: '#4A90D920', borderRadius: 5, padding: 5,
    borderWidth: 1, borderColor: '#4A90D9',
  },
  // Picker responsable
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
});
