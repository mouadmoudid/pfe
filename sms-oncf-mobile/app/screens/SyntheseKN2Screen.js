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

const API = API_URL.replace('/auth', '/pdvs/synthese-kn2');

// ================================================================
// CONSTANTES
// ================================================================
const SEMESTRES = ['S1', 'S2'];

const TENDANCES = [
  { key: '↗', label: 'En hausse',  color: '#27AE60' },
  { key: '→', label: 'Stable',     color: '#F39C12' },
  { key: '↘', label: 'En baisse',  color: '#E74C3C' },
];
const TENDANCE_MAP = Object.fromEntries(TENDANCES.map(t => [t.key, t]));

const SAMI_CONFIG = {
  S: { label: 'Satisfaisant', color: '#27AE60', bg: '#1A3A28', border: '#27AE60' },
  A: { label: 'Acceptable',   color: '#3498DB', bg: '#1A2F4A', border: '#3498DB' },
  M: { label: 'À Améliorer',  color: '#F39C12', bg: '#3A2800', border: '#F39C12' },
  I: { label: 'Insuffisant',  color: '#E74C3C', bg: '#3A0E0E', border: '#E74C3C' },
};

const PRIORITE_CONFIG = {
  Haute:   { color: '#E74C3C', bg: '#3A0E0E' },
  Moyenne: { color: '#F39C12', bg: '#3A2800' },
  Basse:   { color: '#27AE60', bg: '#1A3A28' },
};

const GRAVITE_CONFIG = {
  Élevée:  { color: '#E74C3C' },
  Modérée: { color: '#F39C12' },
  Faible:  { color: '#27AE60' },
};

const DOMAINES = ['Prof.', 'Socio.', 'Psycho.', 'Physio.'];
const PRIORITES = ['Haute', 'Moyenne', 'Basse'];
const GRAVITES  = ['Élevée', 'Modérée', 'Faible'];

const canEdit = (role) => role === 'CSPR' || role === 'ADMIN';

const EMPTY_FRAG = { domaine: 'Prof.', description: '', cdt: '', gravite: 'Modérée', action: '', echeance: '' };
const EMPTY_RECO = { recommandation: '', destinataire: '', priorite: 'Haute', echeance: '', suivi: '' };

// ================================================================
// COMPOSANTS
// ================================================================
function SectionHeader({ title, color = '#C9A84C', icon }) {
  return (
    <View style={[sk.sectionHeader, { borderLeftColor: color }]}>
      {icon && <Text style={{ fontSize: 18 }}>{icon}</Text>}
      <Text style={[sk.sectionHeaderText, { color }]}>{title}</Text>
    </View>
  );
}

function KpiCard({ label, realise, objectif, color = '#3498DB' }) {
  const ecart = objectif != null ? realise - objectif : null;
  return (
    <View style={[sk.kpiCard, { borderTopColor: color }]}>
      <Text style={sk.kpiLabel}>{label}</Text>
      <Text style={[sk.kpiValue, { color }]}>{realise ?? '—'}</Text>
      {objectif != null && (
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
          <Text style={sk.kpiObj}>Obj: {objectif}</Text>
          <Text style={[sk.kpiEcart,
            { color: ecart >= 0 ? '#27AE60' : '#E74C3C' }]}>
            {ecart >= 0 ? '+' : ''}{ecart}
          </Text>
        </View>
      )}
    </View>
  );
}

function SamiRow({ sami, data, cdts, pct, tendance, onTendance, editable }) {
  const cfg = SAMI_CONFIG[sami];
  return (
    <View style={[sk.samiRow, { borderLeftColor: cfg.color }]}>
      <View style={[sk.samiBadge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
        <Text style={[sk.samiLetter, { color: cfg.color }]}>{sami}</Text>
      </View>
      <View style={{ flex: 1, flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
        {cdts.map(cdt => (
          <View key={cdt} style={sk.samiCdtCell}>
            <Text style={sk.samiCdtLabel} numberOfLines={1}>{cdt.replace('CDT ','')}</Text>
            <Text style={[sk.samiCdtVal, { color: cfg.color }]}>
              {data?.[cdt] ?? '—'}
            </Text>
          </View>
        ))}
        <View style={[sk.samiCdtCell, { borderColor: cfg.color }]}>
          <Text style={sk.samiCdtLabel}>Total</Text>
          <Text style={[sk.samiCdtVal, { color: cfg.color, fontWeight: 'bold' }]}>
            {data?.total ?? '—'}
          </Text>
        </View>
        <View style={[sk.samiCdtCell, { borderColor: '#607D8B' }]}>
          <Text style={sk.samiCdtLabel}>%</Text>
          <Text style={[sk.samiCdtVal, { color: '#B0BEC5' }]}>
            {data?.pct != null ? `${data.pct}%` : '—'}
          </Text>
        </View>
      </View>
      {/* Tendance */}
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {TENDANCES.map(t => (
          <TouchableOpacity key={t.key}
            disabled={!editable}
            style={[sk.tendanceBtn,
              tendance === t.key && {
                backgroundColor: t.color + '30',
                borderColor: t.color,
              }]}
            onPress={() => editable && onTendance(t.key)}>
            <Text style={[sk.tendanceTxt,
              { color: tendance === t.key ? t.color : '#2A4060' }]}>
              {t.key}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ================================================================
// ÉCRAN PRINCIPAL
// ================================================================
export default function SyntheseKN2Screen({ navigation }) {
  const { width } = useWindowDimensions();
  const WEB = Platform.OS === 'web' && width > 768;

  const [selectedAnnee, setSelectedAnnee]     = useState(new Date().getFullYear());
  const [selectedSemestre, setSelectedSemestre] = useState('S1');
  const [annees, setAnnees]     = useState([new Date().getFullYear()]);
  const [synData, setSynData]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [generating, setGenerating] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [userEntite, setUserEntite] = useState('');
  const [step, setStep]         = useState(0);

  // Objectifs + tendances (partie manuelle)
  const [manual, setManual]     = useState({
    objectifKN2: '', objectifKN1: '', objectifMI: '', objectifTauxPDVS: '',
    tendanceS: '', tendanceA: '', tendanceM: '', tendanceI: '',
  });

  // Fragilités
  const [editFrag, setEditFrag] = useState(null);
  const [formFrag, setFormFrag] = useState({ ...EMPTY_FRAG });

  // Recommandations
  const [editReco, setEditReco] = useState(null);
  const [formReco, setFormReco] = useState({ ...EMPTY_RECO });

  // null | 'objectifs' | 'frag' | 'reco' | 'domaineSelect' | 'graviteSelect' | 'prioriteSelect'
  const [modalView, setModalView] = useState(null);

  const Wrapper = Platform.OS === 'web' ? View : SafeAreaView;
  const Scroller = Platform.OS === 'web' ? View : ScrollView;

  const getToken = async () => await AsyncStorage.getItem('token');

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
      const res = await axios.get(
        `${API}?annee=${selectedAnnee}&semestre=${selectedSemestre}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSynData(res.data);
      // Pré-remplir manuel
      const m = res.data.manual;
      if (m) {
        setManual({
          objectifKN2:      m.objectifKN2 ?? '',
          objectifKN1:      m.objectifKN1 ?? '',
          objectifMI:       m.objectifMI  ?? '',
          objectifTauxPDVS: m.objectifTauxPDVS ?? '',
          tendanceS: m.tendanceS || '',
          tendanceA: m.tendanceA || '',
          tendanceM: m.tendanceM || '',
          tendanceI: m.tendanceI || '',
        });
      }
      setStep(1);
    } catch { Alert.alert('Erreur', 'Impossible de charger les données'); }
    finally { setLoading(false); }
  };

  const saveManual = async () => {
    setSaving(true);
    try {
      const token = await getToken();
      await axios.put(API, {
        ...manual,
        objectifKN2:      manual.objectifKN2 !== '' ? parseInt(manual.objectifKN2) : null,
        objectifKN1:      manual.objectifKN1 !== '' ? parseInt(manual.objectifKN1) : null,
        objectifMI:       manual.objectifMI  !== '' ? parseInt(manual.objectifMI)  : null,
        objectifTauxPDVS: manual.objectifTauxPDVS !== '' ? parseFloat(manual.objectifTauxPDVS) : null,
        annee: selectedAnnee, semestre: selectedSemestre, entiteCSPR: userEntite,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setModalView(null);
      loadData();
    } catch { Alert.alert('Erreur', 'Impossible de sauvegarder'); }
    finally { setSaving(false); }
  };

  // Tendance rapide (sans ouvrir modal)
  const setTendance = async (sami, val) => {
    if (!canEdit(userRole)) return;
    const newManual = { ...manual, [`tendance${sami}`]: val };
    setManual(newManual);
    try {
      const token = await getToken();
      await axios.put(API, {
        ...newManual,
        objectifKN2:      newManual.objectifKN2 !== '' ? parseInt(newManual.objectifKN2) : null,
        objectifKN1:      newManual.objectifKN1 !== '' ? parseInt(newManual.objectifKN1) : null,
        objectifMI:       newManual.objectifMI  !== '' ? parseInt(newManual.objectifMI)  : null,
        objectifTauxPDVS: newManual.objectifTauxPDVS !== '' ? parseFloat(newManual.objectifTauxPDVS) : null,
        annee: selectedAnnee, semestre: selectedSemestre, entiteCSPR: userEntite,
      }, { headers: { Authorization: `Bearer ${token}` } });
    } catch {}
  };

  // ── FRAGILITÉS CRUD ──
  const saveFrag = async () => {
    if (!formFrag.description.trim()) {
      Alert.alert('Incomplet', 'La description est obligatoire'); return;
    }
    setSaving(true);
    try {
      const token = await getToken();
      const payload = { ...formFrag, annee: selectedAnnee, semestre: selectedSemestre, entiteCSPR: userEntite };
      if (editFrag)
        await axios.put(`${API}/fragilites/${editFrag.id}`, payload,
          { headers: { Authorization: `Bearer ${token}` } });
      else
        await axios.post(`${API}/fragilites`, payload,
          { headers: { Authorization: `Bearer ${token}` } });
      setModalView(null); setEditFrag(null);
      loadData();
    } catch { Alert.alert('Erreur', 'Impossible de sauvegarder'); }
    finally { setSaving(false); }
  };

  const deleteFrag = (item) => {
    Alert.alert('Supprimer', `Supprimer "${item.description}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        const t = await getToken();
        await axios.delete(`${API}/fragilites/${item.id}`, { headers: { Authorization: `Bearer ${t}` } });
        loadData();
      }},
    ]);
  };

  // ── RECOMMANDATIONS CRUD ──
  const saveReco = async () => {
    if (!formReco.recommandation.trim()) {
      Alert.alert('Incomplet', 'La recommandation est obligatoire'); return;
    }
    setSaving(true);
    try {
      const token = await getToken();
      const payload = { ...formReco, annee: selectedAnnee, semestre: selectedSemestre, entiteCSPR: userEntite };
      if (editReco)
        await axios.put(`${API}/recommandations/${editReco.id}`, payload,
          { headers: { Authorization: `Bearer ${token}` } });
      else
        await axios.post(`${API}/recommandations`, payload,
          { headers: { Authorization: `Bearer ${token}` } });
      setModalView(null); setEditReco(null);
      loadData();
    } catch { Alert.alert('Erreur', 'Impossible de sauvegarder'); }
    finally { setSaving(false); }
  };

  const deleteReco = (item) => {
    Alert.alert('Supprimer', `Supprimer la recommandation N°${item.ordre} ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        const t = await getToken();
        await axios.delete(`${API}/recommandations/${item.id}`, { headers: { Authorization: `Bearer ${t}` } });
        loadData();
      }},
    ]);
  };

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const bilan = synData?.bilanAuto || {};
      const cots  = synData?.cotationsAuto || {};
      const frags = synData?.fragilites || [];
      const recos = synData?.recommandations || [];
      const cdts  = Object.keys((bilan?.kn2Realises || {})).filter(k => k !== 'total');
      const m     = synData?.manual || {};

      // Section A
      const bilanRows = [
        { label: 'Nb KN2 réalisés', data: bilan.kn2Realises, obj: m.objectifKN2 },
        { label: 'Nb KN1 évalués',  data: bilan.kn1Evalues,  obj: m.objectifKN1 },
        { label: 'Actions M/I bouclées', data: null, val: `${bilan.actionsMI?.bouclees||0}/${bilan.actionsMI?.total||0}`, obj: m.objectifMI },
        { label: 'Taux PDVS N1 (%)', data: null, val: `${bilan.tauxPDVS||0}%`, obj: m.objectifTauxPDVS ? `${m.objectifTauxPDVS}%` : '—' },
      ];

      const cdtHeaders = cdts.map(c => `<th>${c}</th>`).join('');
      const bilanHtml = bilanRows.map((r, i) => {
        const vals = r.data
          ? cdts.map(c => `<td style="text-align:center">${r.data[c]??'—'}</td>`).join('')
          : `<td colspan="${cdts.length}" style="text-align:center">${r.val??'—'}</td>`;
        const tot = r.data ? r.data.total : '—';
        const ecart = r.obj != null && tot !== '—'
          ? `<span style="color:${tot-r.obj>=0?'#27AE60':'#E74C3C'}">${tot-r.obj>=0?'+':''}${tot-r.obj}</span>`
          : '—';
        return `<tr style="background:${i%2===0?'#fff':'#f8f9fa'}">
          <td><b>${r.label}</b></td>${vals}
          <td style="text-align:center;font-weight:bold">${tot}</td>
          <td style="text-align:center">${r.obj??'—'}</td>
          <td style="text-align:center">${ecart}</td>
        </tr>`;
      }).join('');

      // Section B
      const cotHtml = ['S','A','M','I'].map(s => {
        const cfg = SAMI_CONFIG[s];
        const d = cots[s] || {};
        const td = cdts.map(c => `<td style="text-align:center;color:${cfg.color};font-weight:bold">${d[c]??0}</td>`).join('');
        const tend = manual[`tendance${s}`] || '—';
        const tendCol = TENDANCE_MAP[tend]?.color || '#607D8B';
        return `<tr><td style="background:${cfg.bg};color:${cfg.color};font-weight:bold;text-align:center">${s}</td>
          ${td}
          <td style="text-align:center;font-weight:bold;color:${cfg.color}">${d.total??0}</td>
          <td style="text-align:center;color:#607D8B">${d.pct??0}%</td>
          <td style="text-align:center;font-size:14px;color:${tendCol}">${tend}</td>
        </tr>`;
      }).join('');

      // Section C
      const fragHtml = frags.map((f, i) => {
        const gc = GRAVITE_CONFIG[f.gravite] || {};
        return `<tr style="background:${i%2===0?'#fff':'#f8f9fa'}">
          <td style="text-align:center">${f.ordre}</td>
          <td>${f.domaine||''}</td><td>${f.description||''}</td>
          <td>${f.cdt||''}</td>
          <td style="color:${gc.color||'#333'};font-weight:bold">${f.gravite||''}</td>
          <td>${f.action||''}</td><td>${f.echeance||''}</td>
        </tr>`;
      }).join('') || '<tr><td colspan="7" style="text-align:center;color:#999">Aucune fragilité</td></tr>';

      // Section D
      const recoHtml = recos.map((r, i) => {
        const pc = PRIORITE_CONFIG[r.priorite] || {};
        return `<tr style="background:${i%2===0?'#fff':'#f8f9fa'}">
          <td style="text-align:center">${r.ordre}</td>
          <td>${r.recommandation||''}</td><td>${r.destinataire||''}</td>
          <td style="background:${pc.bg||'#fff'};color:${pc.color||'#333'};font-weight:bold;text-align:center">
            ${r.priorite||''}
          </td>
          <td>${r.echeance||''}</td><td>${r.suivi||''}</td>
        </tr>`;
      }).join('') || '<tr><td colspan="6" style="text-align:center;color:#999">Aucune recommandation</td></tr>';

      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
* { margin:0;padding:0;box-sizing:border-box; }
body { font-family:Arial,sans-serif;font-size:8px;padding:10px; }
@page { size:A4;margin:8mm; }
h2 { font-size:12px;color:#0A1628; }
h3 { font-size:10px;color:#0A1628;margin:12px 0 4px;padding:4px 8px;
     border-left:4px solid #C9A84C;background:#f5f0e0; }
table { width:100%;border-collapse:collapse;margin-bottom:8px; }
th { background:#0A1628;color:#fff;padding:4px 3px;font-size:7px;border:1px solid #ccc; }
td { font-size:7px;padding:3px;border:1px solid #ddd;vertical-align:top; }
</style></head><body>
<div style="background:#0A1628;color:#fff;padding:8px 12px;border-radius:6px;margin-bottom:10px;
  display:flex;justify-content:space-between;align-items:center">
  <div>
    <div style="font-size:13px;font-weight:bold;color:#C9A84C">ONCF · DRIC</div>
    <div style="font-size:9px">Synthèse KN2 — ${userEntite} — ${selectedSemestre} ${selectedAnnee}</div>
  </div>
  <div style="text-align:right;font-size:9px;color:#C9A84C">
    Généré le ${new Date().toLocaleDateString('fr-FR')}
  </div>
</div>

<h3>A. BILAN QUANTITATIF</h3>
<table><thead><tr>
  <th>Indicateur</th>${cdtHeaders}
  <th style="text-align:center">Total</th>
  <th style="text-align:center">Objectif</th>
  <th style="text-align:center">Écart</th>
</tr></thead><tbody>${bilanHtml}</tbody></table>

<h3>B. COTATIONS SAMI</h3>
<table><thead><tr>
  <th style="text-align:center">Cotation</th>${cdtHeaders}
  <th style="text-align:center">Total</th>
  <th style="text-align:center">%</th>
  <th style="text-align:center">Tendance</th>
</tr></thead><tbody>${cotHtml}</tbody></table>

<h3>C. FRAGILITÉS</h3>
<table><thead><tr>
  <th style="width:4%;text-align:center">N°</th>
  <th style="width:8%">Domaine</th><th style="width:22%">Description</th>
  <th style="width:8%">CDT</th><th style="width:8%">Gravité</th>
  <th style="width:30%">Action</th><th style="width:10%">Échéance</th>
</tr></thead><tbody>${fragHtml}</tbody></table>

<h3>D. RECOMMANDATIONS</h3>
<table><thead><tr>
  <th style="width:4%;text-align:center">N°</th>
  <th style="width:30%">Recommandation</th><th style="width:15%">Destinataire</th>
  <th style="width:8%;text-align:center">Priorité</th>
  <th style="width:10%">Échéance</th><th>Suivi</th>
</tr></thead><tbody>${recoHtml}</tbody></table>
</body></html>`;

      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Synthèse KN2 — ${selectedSemestre} ${selectedAnnee}`,
        UTI: 'com.adobe.pdf',
      });
    } catch { Alert.alert('Erreur', 'Impossible de générer le PDF'); }
    finally { setGenerating(false); }
  };

  // ================================================================
  // ÉTAPE 0 — Sélection
  // ================================================================
  if (step === 0) {
    return (
      <Wrapper style={Platform.OS === 'web' ? s.webSafe : s.safe}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={s.backText}>← Retour</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>📊 Synthèse KN2</Text>
          <Text style={s.headerSub}>Dashboard auto · Bilan · Cotations · Fragilités · Recos</Text>
        </View>
        {loading ? <ActivityIndicator color="#C9A84C" style={{ marginTop: 40 }} /> : (
          <Scroller style={Platform.OS === 'web' ? s.webScroller : s.list} {...(Platform.OS !== 'web' && { showsVerticalScrollIndicator: false })}>
            <Text style={s.sectionLabel}>Semestre</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
              {SEMESTRES.map(sem => (
                <TouchableOpacity key={sem}
                  style={[sk.semBtn, selectedSemestre === sem && sk.semBtnActive]}
                  onPress={() => setSelectedSemestre(sem)}>
                  <Text style={[sk.semBtnText, selectedSemestre === sem && sk.semBtnTextActive]}>
                    {sem}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.sectionLabel}>Année</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginBottom: 20 }}>
              {annees.map(a => (
                <TouchableOpacity key={a}
                  style={[s.chipBtn, selectedAnnee === a && s.chipBtnActive]}
                  onPress={() => setSelectedAnnee(a)}>
                  <Text style={[s.chipText, selectedAnnee === a && s.chipTextActive]}>{a}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={[s.chipBtn, { borderColor: '#C9A84C', borderStyle: 'dashed' }]}
                onPress={() => {
                  const ny = Math.max(...annees) + 1;
                  setAnnees(p => [ny, ...p]); setSelectedAnnee(ny);
                }}>
                <Text style={[s.chipText, { color: '#C9A84C' }]} numberOfLines={1}>+ {Math.max(...annees) + 1}</Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={sk.legendeBox}>
              <Text style={sk.legendeTitle}>📐 Données automatiques depuis :</Text>
              {[
                { icon: '📅', src: 'Planning KN2', dest: 'Nb KN2 réalisés / Nb KN1 évalués' },
                { icon: '📋', src: 'Contrôle Management', dest: 'Cotations SAMI par CDT' },
                { icon: '👥', src: 'PDVS N2 Collab/Proc', dest: 'Actions M/I bouclées · Taux PDVS' },
              ].map(item => (
                <View key={item.src} style={sk.legendeRow}>
                  <Text style={{ fontSize: 14 }}>{item.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={sk.legendeSrc}>{item.src}</Text>
                    <Text style={sk.legendeDest}>→ {item.dest}</Text>
                  </View>
                </View>
              ))}
              <Text style={[sk.legendeTitle, { marginTop: 8 }]}>✏️ Saisis manuellement :</Text>
              <Text style={sk.legendeDest}>
                Objectifs · Tendances (↗ → ↘) · Fragilités · Recommandations
              </Text>
            </View>

            <TouchableOpacity style={s.confirmBtn} onPress={loadData}>
              <Text style={s.confirmBtnText}>
                Générer Synthèse {selectedSemestre} {selectedAnnee} →
              </Text>
            </TouchableOpacity>
          </Scroller>
        )}
      </Wrapper>
    );
  }

  // ================================================================
  // ÉTAPE 1 — Dashboard
  // ================================================================
  const bilan = synData?.bilanAuto || {};
  const cots  = synData?.cotationsAuto || {};
  const frags = synData?.fragilites || [];
  const recos = synData?.recommandations || [];
  const cdts  = Object.keys(bilan?.kn2Realises || {}).filter(k => k !== 'total');

  return (
    <Wrapper style={Platform.OS === 'web' ? s.webSafe : s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => { setStep(0); setSynData(null); }}>
          <Text style={s.backText}>← Retour</Text>
        </TouchableOpacity>
        <View style={[s.headerRow, { flexWrap: 'wrap', gap: 6 }]}>
          <View>
            <Text style={s.headerTitle}>
              📊 Synthèse KN2 — {selectedSemestre} {selectedAnnee}
            </Text>
            <Text style={s.headerSub}>{userEntite}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {canEdit(userRole) && (
              <TouchableOpacity style={sk.objBtn}
                onPress={() => setModalView('objectifs')}>
                <Text style={sk.objBtnText}>⚙️ Objectifs</Text>
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

      {loading ? <ActivityIndicator color="#C9A84C" style={{ marginTop: 40 }} /> : (
        <Scroller style={Platform.OS === 'web' ? s.webScroller : s.list} {...(Platform.OS !== 'web' && { showsVerticalScrollIndicator: false })}>

          {/* ══ A. BILAN QUANTITATIF ══ */}
          <SectionHeader title="A. Bilan Quantitatif" icon="📈" />
          <View style={[sk.kpiGrid, WEB && { flexDirection: 'row', flexWrap: 'wrap' }]}>
            <KpiCard
              label="KN2 Réalisés"
              realise={bilan.kn2Realises?.total}
              objectif={synData?.manual?.objectifKN2}
              color="#3498DB" />
            <KpiCard
              label="KN1 Évalués"
              realise={bilan.kn1Evalues?.total}
              objectif={synData?.manual?.objectifKN1}
              color="#9B59B6" />
            <KpiCard
              label="Actions M/I Bouclées"
              realise={bilan.actionsMI?.bouclees}
              objectif={synData?.manual?.objectifMI}
              color="#F39C12" />
            <KpiCard
              label="Taux PDVS N1 (%)"
              realise={bilan.tauxPDVS != null ? `${bilan.tauxPDVS}%` : null}
              objectif={synData?.manual?.objectifTauxPDVS != null
                ? `${synData.manual.objectifTauxPDVS}%` : null}
              color="#27AE60" />
          </View>

          {/* Détail par CDT (WEB : tableau, MOBILE : cartes) */}
          {WEB ? (
            <View style={sk.bilanTable}>
              <View style={[sk.bilanRow, sk.bilanHead]}>
                <Text style={[sk.bilanTh, { flex: 1.5 }]}>Indicateur</Text>
                {cdts.map(c => (
                  <Text key={c} style={[sk.bilanTh, { flex: 1, textAlign: 'center' }]}>
                    {c.replace('CDT ', '')}
                  </Text>
                ))}
                <Text style={[sk.bilanTh, { width: 60, textAlign: 'center' }]}>Total</Text>
                <Text style={[sk.bilanTh, { width: 60, textAlign: 'center' }]}>Obj.</Text>
                <Text style={[sk.bilanTh, { width: 60, textAlign: 'center' }]}>Écart</Text>
              </View>
              {[
                { label: 'KN2 Réalisés', data: bilan.kn2Realises, obj: synData?.manual?.objectifKN2 },
                { label: 'KN1 Évalués',  data: bilan.kn1Evalues,  obj: synData?.manual?.objectifKN1 },
              ].map((row, i) => {
                const tot = row.data?.total ?? 0;
                const ecart = row.obj != null ? tot - row.obj : null;
                return (
                  <View key={row.label}
                    style={[sk.bilanRow, i % 2 === 0 ? sk.bilanEven : sk.bilanOdd]}>
                    <Text style={[sk.bilanTd, { flex: 1.5, color: '#FFFFFF' }]}>{row.label}</Text>
                    {cdts.map(c => (
                      <Text key={c} style={[sk.bilanTd, { flex: 1, textAlign: 'center' }]}>
                        {row.data?.[c] ?? '—'}
                      </Text>
                    ))}
                    <Text style={[sk.bilanTd, { width: 60, textAlign: 'center', fontWeight: 'bold', color: '#C9A84C' }]}>
                      {tot}
                    </Text>
                    <Text style={[sk.bilanTd, { width: 60, textAlign: 'center' }]}>
                      {row.obj ?? '—'}
                    </Text>
                    <Text style={[sk.bilanTd, { width: 60, textAlign: 'center',
                      color: ecart == null ? '#607D8B' : ecart >= 0 ? '#27AE60' : '#E74C3C',
                      fontWeight: 'bold' }]}>
                      {ecart != null ? (ecart >= 0 ? '+' : '') + ecart : '—'}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={{ gap: 6, marginBottom: 8 }}>
              {cdts.map(cdt => (
                <View key={cdt} style={sk.cdtMobCard}>
                  <Text style={sk.cdtMobTitle}>{cdt}</Text>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ color: '#3498DB', fontWeight: 'bold', fontSize: 16 }}>
                        {bilan.kn2Realises?.[cdt] ?? '—'}
                      </Text>
                      <Text style={sk.cdtMobLabel}>KN2</Text>
                    </View>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ color: '#9B59B6', fontWeight: 'bold', fontSize: 16 }}>
                        {bilan.kn1Evalues?.[cdt] ?? '—'}
                      </Text>
                      <Text style={sk.cdtMobLabel}>KN1</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* ══ B. COTATIONS SAMI ══ */}
          <SectionHeader title="B. Cotations SAMI" icon="📊" />
          <View style={{ gap: 6, marginBottom: 16 }}>
            {['S','A','M','I'].map(sami => (
              <SamiRow key={sami}
                sami={sami}
                data={cots[sami]}
                cdts={cdts}
                tendance={manual[`tendance${sami}`]}
                onTendance={(val) => setTendance(sami, val)}
                editable={canEdit(userRole)} />
            ))}
          </View>

          {/* ══ C. FRAGILITÉS ══ */}
          <View style={[sk.sectionTitleRow]}>
            <SectionHeader title="C. Fragilités" icon="⚠️" />
            {canEdit(userRole) && (
              <TouchableOpacity style={s.addBtn}
                onPress={() => {
                  setEditFrag(null);
                  setFormFrag({ ...EMPTY_FRAG });
                  setModalView('frag');
                }}>
                <Text style={s.addBtnText}>+ Fragilité</Text>
              </TouchableOpacity>
            )}
          </View>

          {frags.length === 0 ? (
            <Text style={sk.emptySecText}>Aucune fragilité enregistrée</Text>
          ) : WEB ? (
            <View style={sk.bilanTable}>
              <View style={[sk.bilanRow, sk.bilanHead]}>
                <Text style={[sk.bilanTh, { width: 30, textAlign: 'center' }]}>N°</Text>
                <Text style={[sk.bilanTh, { width: 80 }]}>Domaine</Text>
                <Text style={[sk.bilanTh, { flex: 2 }]}>Description</Text>
                <Text style={[sk.bilanTh, { width: 80 }]}>CDT</Text>
                <Text style={[sk.bilanTh, { width: 80 }]}>Gravité</Text>
                <Text style={[sk.bilanTh, { flex: 2 }]}>Action</Text>
                <Text style={[sk.bilanTh, { width: 80 }]}>Échéance</Text>
                {canEdit(userRole) && <Text style={[sk.bilanTh, { width: 60 }]} />}
              </View>
              {frags.map((f, i) => {
                const gc = GRAVITE_CONFIG[f.gravite] || {};
                return (
                  <View key={f.id} style={[sk.bilanRow, i%2===0 ? sk.bilanEven : sk.bilanOdd]}>
                    <Text style={[sk.bilanTd, { width: 30, textAlign: 'center', color: '#C9A84C' }]}>
                      {f.ordre}
                    </Text>
                    <Text style={[sk.bilanTd, { width: 80 }]}>{f.domaine}</Text>
                    <Text style={[sk.bilanTd, { flex: 2, color: '#FFFFFF' }]}>{f.description}</Text>
                    <Text style={[sk.bilanTd, { width: 80 }]}>{f.cdt}</Text>
                    <Text style={[sk.bilanTd, { width: 80, color: gc.color, fontWeight: 'bold' }]}>
                      {f.gravite}
                    </Text>
                    <Text style={[sk.bilanTd, { flex: 2 }]}>{f.action}</Text>
                    <Text style={[sk.bilanTd, { width: 80 }]}>{f.echeance}</Text>
                    {canEdit(userRole) && (
                      <View style={{ width: 60, flexDirection: 'row', gap: 4,
                        alignItems: 'center', justifyContent: 'center' }}>
                        <TouchableOpacity style={sk.webEditBtn}
                          onPress={() => { setEditFrag(f); setFormFrag({ domaine: f.domaine, description: f.description, cdt: f.cdt||'', gravite: f.gravite, action: f.action||'', echeance: f.echeance||'' }); setModalView('frag'); }}>
                          <Text style={{ fontSize: 12 }}>✏️</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[sk.webEditBtn, { borderColor: '#E74C3C', backgroundColor: '#E74C3C20' }]}
                          onPress={() => deleteFrag(f)}>
                          <Text style={{ fontSize: 12 }}>🗑</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ) : (
            frags.map(f => {
              const gc = GRAVITE_CONFIG[f.gravite] || {};
              return (
                <View key={f.id} style={[sk.fragCard, { borderLeftColor: gc.color || '#607D8B' }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                        <Text style={{ color: '#C9A84C', fontWeight: 'bold', fontSize: 11 }}>
                          #{f.ordre}
                        </Text>
                        <Text style={[sk.gravBadge, { color: gc.color }]}>{f.gravite}</Text>
                        <Text style={{ color: '#607D8B', fontSize: 10 }}>{f.domaine}</Text>
                        {f.cdt && <Text style={{ color: '#85C1E9', fontSize: 10 }}>{f.cdt}</Text>}
                      </View>
                      <Text style={sk.fragDesc}>{f.description}</Text>
                      {f.action && <Text style={sk.fragAction}>📌 {f.action}</Text>}
                      {f.echeance && <Text style={sk.fragEcheance}>⏰ {f.echeance}</Text>}
                    </View>
                    {canEdit(userRole) && (
                      <View style={{ gap: 4 }}>
                        <TouchableOpacity style={s.editBtn}
                          onPress={() => { setEditFrag(f); setFormFrag({ domaine: f.domaine, description: f.description, cdt: f.cdt||'', gravite: f.gravite, action: f.action||'', echeance: f.echeance||'' }); setModalView('frag'); }}>
                          <Text style={s.editBtnText}>✏️</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={s.deleteBtn} onPress={() => deleteFrag(f)}>
                          <Text style={s.deleteBtnText}>🗑</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          )}

          {/* ══ D. RECOMMANDATIONS ══ */}
          <View style={sk.sectionTitleRow}>
            <SectionHeader title="D. Recommandations" icon="💡" />
            {canEdit(userRole) && (
              <TouchableOpacity style={s.addBtn}
                onPress={() => {
                  setEditReco(null);
                  setFormReco({ ...EMPTY_RECO });
                  setModalView('reco');
                }}>
                <Text style={s.addBtnText}>+ Reco.</Text>
              </TouchableOpacity>
            )}
          </View>

          {recos.length === 0 ? (
            <Text style={sk.emptySecText}>Aucune recommandation enregistrée</Text>
          ) : WEB ? (
            <View style={sk.bilanTable}>
              <View style={[sk.bilanRow, sk.bilanHead]}>
                <Text style={[sk.bilanTh, { width: 30, textAlign: 'center' }]}>N°</Text>
                <Text style={[sk.bilanTh, { flex: 2 }]}>Recommandation</Text>
                <Text style={[sk.bilanTh, { flex: 1 }]}>Destinataire</Text>
                <Text style={[sk.bilanTh, { width: 80, textAlign: 'center' }]}>Priorité</Text>
                <Text style={[sk.bilanTh, { width: 80 }]}>Échéance</Text>
                <Text style={[sk.bilanTh, { flex: 1.5 }]}>Suivi</Text>
                {canEdit(userRole) && <Text style={[sk.bilanTh, { width: 60 }]} />}
              </View>
              {recos.map((r, i) => {
                const pc = PRIORITE_CONFIG[r.priorite] || {};
                return (
                  <View key={r.id} style={[sk.bilanRow, i%2===0 ? sk.bilanEven : sk.bilanOdd]}>
                    <Text style={[sk.bilanTd, { width: 30, textAlign: 'center', color: '#C9A84C' }]}>
                      {r.ordre}
                    </Text>
                    <Text style={[sk.bilanTd, { flex: 2, color: '#FFFFFF' }]}>{r.recommandation}</Text>
                    <Text style={[sk.bilanTd, { flex: 1 }]}>{r.destinataire}</Text>
                    <View style={{ width: 80, alignItems: 'center', justifyContent: 'center' }}>
                      <View style={[sk.prioMini, { backgroundColor: pc.bg, borderColor: pc.color }]}>
                        <Text style={{ color: pc.color, fontSize: 9, fontWeight: 'bold' }}>{r.priorite}</Text>
                      </View>
                    </View>
                    <Text style={[sk.bilanTd, { width: 80 }]}>{r.echeance}</Text>
                    <Text style={[sk.bilanTd, { flex: 1.5 }]}>{r.suivi}</Text>
                    {canEdit(userRole) && (
                      <View style={{ width: 60, flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'center' }}>
                        <TouchableOpacity style={sk.webEditBtn}
                          onPress={() => { setEditReco(r); setFormReco({ recommandation: r.recommandation||'', destinataire: r.destinataire||'', priorite: r.priorite||'Haute', echeance: r.echeance||'', suivi: r.suivi||'' }); setModalView('reco'); }}>
                          <Text style={{ fontSize: 12 }}>✏️</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[sk.webEditBtn, { borderColor: '#E74C3C', backgroundColor: '#E74C3C20' }]}
                          onPress={() => deleteReco(r)}>
                          <Text style={{ fontSize: 12 }}>🗑</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ) : (
            recos.map(r => {
              const pc = PRIORITE_CONFIG[r.priorite] || {};
              return (
                <View key={r.id} style={[sk.recoCard, { borderLeftColor: pc.color || '#607D8B' }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Text style={{ color: '#C9A84C', fontWeight: 'bold', fontSize: 11 }}>#{r.ordre}</Text>
                        <View style={[sk.prioMini, { backgroundColor: pc.bg, borderColor: pc.color }]}>
                          <Text style={{ color: pc.color, fontSize: 9, fontWeight: 'bold' }}>{r.priorite}</Text>
                        </View>
                        {r.destinataire && (
                          <Text style={{ color: '#85C1E9', fontSize: 10 }}>→ {r.destinataire}</Text>
                        )}
                        {r.echeance && (
                          <Text style={{ color: '#607D8B', fontSize: 10 }}>⏰ {r.echeance}</Text>
                        )}
                      </View>
                      <Text style={sk.recoText}>{r.recommandation}</Text>
                      {r.suivi && <Text style={sk.recoSuivi}>📋 {r.suivi}</Text>}
                    </View>
                    {canEdit(userRole) && (
                      <View style={{ gap: 4 }}>
                        <TouchableOpacity style={s.editBtn}
                          onPress={() => { setEditReco(r); setFormReco({ recommandation: r.recommandation||'', destinataire: r.destinataire||'', priorite: r.priorite||'Haute', echeance: r.echeance||'', suivi: r.suivi||'' }); setModalView('reco'); }}>
                          <Text style={s.editBtnText}>✏️</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={s.deleteBtn} onPress={() => deleteReco(r)}>
                          <Text style={s.deleteBtnText}>🗑</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          )}

          <View style={{ height: 40 }} />
        </Scroller>
      )}

      {/* ════════════════════════════════════════════
          MODALS
      ════════════════════════════════════════════ */}
      <Modal visible={modalView !== null} transparent animationType="slide" statusBarTranslucent
        onRequestClose={() => {
          if (['domaineSelect','graviteSelect','prioriteSelect'].includes(modalView))
            setModalView(editFrag ? 'frag' : 'reco');
          else { setModalView(null); setEditFrag(null); setEditReco(null); }
        }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={[s.modalOverlay, WEB && { justifyContent: 'center', alignItems: 'center' }]}>

            {/* ── Objectifs ── */}
            {modalView === 'objectifs' && (
              <View style={[s.modalBox, WEB && sk.webModal]}>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={s.modalHeader}>
                    <Text style={s.modalTitle}>⚙️ Objectifs du semestre</Text>
                    <TouchableOpacity onPress={() => setModalView(null)}>
                      <Text style={s.closeBtn}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={WEB ? { flexDirection: 'row', gap: 12 } : {}}>
                    {[
                      { key: 'objectifKN2', label: 'Objectif KN2 Réalisés', placeholder: 'Ex: 12' },
                      { key: 'objectifKN1', label: 'Objectif KN1 Évalués',  placeholder: 'Ex: 8'  },
                    ].map(f => (
                      <View key={f.key} style={WEB ? { flex: 1 } : {}}>
                        <Text style={s.fieldLabel}>{f.label}</Text>
                        <TextInput style={s.input}
                          value={String(manual[f.key] ?? '')}
                          onChangeText={v => setManual(p => ({ ...p, [f.key]: v }))}
                          keyboardType="numeric" placeholder={f.placeholder}
                          placeholderTextColor="#607D8B" />
                      </View>
                    ))}
                  </View>
                  <View style={WEB ? { flexDirection: 'row', gap: 12 } : {}}>
                    {[
                      { key: 'objectifMI',       label: 'Objectif M/I Bouclées',   placeholder: 'Ex: 5'  },
                      { key: 'objectifTauxPDVS', label: 'Objectif Taux PDVS (%)',  placeholder: 'Ex: 80' },
                    ].map(f => (
                      <View key={f.key} style={WEB ? { flex: 1 } : {}}>
                        <Text style={s.fieldLabel}>{f.label}</Text>
                        <TextInput style={s.input}
                          value={String(manual[f.key] ?? '')}
                          onChangeText={v => setManual(p => ({ ...p, [f.key]: v }))}
                          keyboardType="numeric" placeholder={f.placeholder}
                          placeholderTextColor="#607D8B" />
                      </View>
                    ))}
                  </View>
                  <View style={s.modalBtns}>
                    <TouchableOpacity style={s.cancelBtn} onPress={() => setModalView(null)}>
                      <Text style={s.cancelBtnText}>Annuler</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.5 }]}
                      onPress={saveManual} disabled={saving}>
                      {saving ? <ActivityIndicator color="#0A1628" size="small" />
                        : <Text style={s.saveBtnText}>✅ Enregistrer</Text>}
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            )}

            {/* ── Picker domaine ── */}
            {modalView === 'domaineSelect' && (
              <View style={[s.modalBox, WEB && sk.webModalSm, { maxHeight: '50%' }]}>
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>Domaine</Text>
                  <TouchableOpacity onPress={() => setModalView('frag')}>
                    <Text style={s.closeBtn}>✕</Text>
                  </TouchableOpacity>
                </View>
                {DOMAINES.map(d => (
                  <TouchableOpacity key={d}
                    style={[sk.selectItem, formFrag.domaine === d && { borderColor: '#C9A84C', backgroundColor: '#1E3A5F' }]}
                    onPress={() => { setFormFrag(p => ({ ...p, domaine: d })); setModalView('frag'); }}>
                    <Text style={[sk.selectText, formFrag.domaine === d && { color: '#C9A84C' }]}>{d}</Text>
                    {formFrag.domaine === d && <Text style={{ color: '#C9A84C', marginLeft: 'auto' }}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* ── Picker gravité ── */}
            {modalView === 'graviteSelect' && (
              <View style={[s.modalBox, WEB && sk.webModalSm, { maxHeight: '50%' }]}>
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>Gravité</Text>
                  <TouchableOpacity onPress={() => setModalView('frag')}>
                    <Text style={s.closeBtn}>✕</Text>
                  </TouchableOpacity>
                </View>
                {GRAVITES.map(g => {
                  const gc = GRAVITE_CONFIG[g] || {};
                  return (
                    <TouchableOpacity key={g}
                      style={[sk.selectItem, formFrag.gravite === g && { borderColor: gc.color }]}
                      onPress={() => { setFormFrag(p => ({ ...p, gravite: g })); setModalView('frag'); }}>
                      <Text style={[sk.selectText, formFrag.gravite === g && { color: gc.color, fontWeight: 'bold' }]}>{g}</Text>
                      {formFrag.gravite === g && <Text style={{ color: gc.color, marginLeft: 'auto' }}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* ── Picker priorité ── */}
            {modalView === 'prioriteSelect' && (
              <View style={[s.modalBox, WEB && sk.webModalSm, { maxHeight: '50%' }]}>
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>Priorité</Text>
                  <TouchableOpacity onPress={() => setModalView('reco')}>
                    <Text style={s.closeBtn}>✕</Text>
                  </TouchableOpacity>
                </View>
                {PRIORITES.map(p => {
                  const pc = PRIORITE_CONFIG[p] || {};
                  return (
                    <TouchableOpacity key={p}
                      style={[sk.selectItem, formReco.priorite === p && { borderColor: pc.color, backgroundColor: pc.bg }]}
                      onPress={() => { setFormReco(prev => ({ ...prev, priorite: p })); setModalView('reco'); }}>
                      <Text style={[sk.selectText, formReco.priorite === p && { color: pc.color, fontWeight: 'bold' }]}>{p}</Text>
                      {formReco.priorite === p && <Text style={{ color: pc.color, marginLeft: 'auto' }}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* ── Fragilité form ── */}
            {modalView === 'frag' && (
              <View style={[s.modalBox, WEB && sk.webModal]}>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={s.modalHeader}>
                    <Text style={s.modalTitle}>{editFrag ? '✏️ Modifier la fragilité' : '➕ Nouvelle fragilité'}</Text>
                    <TouchableOpacity onPress={() => { setModalView(null); setEditFrag(null); }}>
                      <Text style={s.closeBtn}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={WEB ? { flexDirection: 'row', gap: 12 } : {}}>
                    <View style={WEB ? { flex: 1 } : {}}>
                      <Text style={s.fieldLabel}>Domaine</Text>
                      <TouchableOpacity style={[s.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
                        onPress={() => setModalView('domaineSelect')}>
                        <Text style={{ color: '#FFFFFF', fontSize: 13 }}>{formFrag.domaine}</Text>
                        <Text style={{ color: '#C9A84C' }}>›</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={WEB ? { flex: 1 } : {}}>
                      <Text style={s.fieldLabel}>CDT</Text>
                      <TextInput style={s.input} value={formFrag.cdt}
                        onChangeText={v => setFormFrag(p => ({ ...p, cdt: v }))}
                        placeholder="Ex: CDT 101V" placeholderTextColor="#607D8B" />
                    </View>
                    <View style={WEB ? { flex: 1 } : {}}>
                      <Text style={s.fieldLabel}>Gravité</Text>
                      <TouchableOpacity style={[s.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderColor: GRAVITE_CONFIG[formFrag.gravite]?.color || '#2A4060' }]}
                        onPress={() => setModalView('graviteSelect')}>
                        <Text style={{ color: GRAVITE_CONFIG[formFrag.gravite]?.color || '#FFFFFF', fontSize: 13, fontWeight: 'bold' }}>
                          {formFrag.gravite}
                        </Text>
                        <Text style={{ color: '#C9A84C' }}>›</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={s.fieldLabel}>Description *</Text>
                  <TextInput style={[s.input, { height: 70, textAlignVertical: 'top' }]}
                    value={formFrag.description}
                    onChangeText={v => setFormFrag(p => ({ ...p, description: v }))}
                    multiline placeholder="Description de la fragilité…"
                    placeholderTextColor="#607D8B" />
                  <View style={WEB ? { flexDirection: 'row', gap: 12 } : {}}>
                    <View style={WEB ? { flex: 2 } : {}}>
                      <Text style={s.fieldLabel}>Action</Text>
                      <TextInput style={s.input} value={formFrag.action}
                        onChangeText={v => setFormFrag(p => ({ ...p, action: v }))}
                        placeholder="Action corrective…" placeholderTextColor="#607D8B" />
                    </View>
                    <View style={WEB ? { flex: 1 } : {}}>
                      <Text style={s.fieldLabel}>Échéance</Text>
                      <TextInput style={s.input} value={formFrag.echeance}
                        onChangeText={v => setFormFrag(p => ({ ...p, echeance: v }))}
                        placeholder="Ex: T2 2026" placeholderTextColor="#607D8B" />
                    </View>
                  </View>
                  <View style={s.modalBtns}>
                    <TouchableOpacity style={s.cancelBtn} onPress={() => { setModalView(null); setEditFrag(null); }}>
                      <Text style={s.cancelBtnText}>Annuler</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.5 }]}
                      onPress={saveFrag} disabled={saving}>
                      {saving ? <ActivityIndicator color="#0A1628" size="small" />
                        : <Text style={s.saveBtnText}>{editFrag ? '✅ Mettre à jour' : '✅ Enregistrer'}</Text>}
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            )}

            {/* ── Recommandation form ── */}
            {modalView === 'reco' && (
              <View style={[s.modalBox, WEB && sk.webModal]}>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={s.modalHeader}>
                    <Text style={s.modalTitle}>{editReco ? '✏️ Modifier la reco.' : '➕ Nouvelle recommandation'}</Text>
                    <TouchableOpacity onPress={() => { setModalView(null); setEditReco(null); }}>
                      <Text style={s.closeBtn}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={s.fieldLabel}>Recommandation *</Text>
                  <TextInput style={[s.input, { height: 80, textAlignVertical: 'top' }]}
                    value={formReco.recommandation}
                    onChangeText={v => setFormReco(p => ({ ...p, recommandation: v }))}
                    multiline placeholder="Recommandation détaillée…"
                    placeholderTextColor="#607D8B" />
                  <View style={WEB ? { flexDirection: 'row', gap: 12 } : {}}>
                    <View style={WEB ? { flex: 1 } : {}}>
                      <Text style={s.fieldLabel}>Destinataire</Text>
                      <TextInput style={s.input} value={formReco.destinataire}
                        onChangeText={v => setFormReco(p => ({ ...p, destinataire: v }))}
                        placeholder="Ex: CET, CDT 101V…" placeholderTextColor="#607D8B" />
                    </View>
                    <View style={WEB ? { flex: 1 } : {}}>
                      <Text style={s.fieldLabel}>Priorité</Text>
                      <TouchableOpacity style={[s.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderColor: PRIORITE_CONFIG[formReco.priorite]?.color || '#2A4060' }]}
                        onPress={() => setModalView('prioriteSelect')}>
                        <Text style={{ color: PRIORITE_CONFIG[formReco.priorite]?.color || '#FFFFFF', fontSize: 13, fontWeight: 'bold' }}>
                          {formReco.priorite}
                        </Text>
                        <Text style={{ color: '#C9A84C' }}>›</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={WEB ? { flex: 1 } : {}}>
                      <Text style={s.fieldLabel}>Échéance</Text>
                      <TextInput style={s.input} value={formReco.echeance}
                        onChangeText={v => setFormReco(p => ({ ...p, echeance: v }))}
                        placeholder="Ex: T3 2026" placeholderTextColor="#607D8B" />
                    </View>
                  </View>
                  <Text style={s.fieldLabel}>Suivi</Text>
                  <TextInput style={[s.input, { height: 60, textAlignVertical: 'top' }]}
                    value={formReco.suivi}
                    onChangeText={v => setFormReco(p => ({ ...p, suivi: v }))}
                    multiline placeholder="Suivi de la recommandation…"
                    placeholderTextColor="#607D8B" />
                  <View style={s.modalBtns}>
                    <TouchableOpacity style={s.cancelBtn} onPress={() => { setModalView(null); setEditReco(null); }}>
                      <Text style={s.cancelBtnText}>Annuler</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.5 }]}
                      onPress={saveReco} disabled={saving}>
                      {saving ? <ActivityIndicator color="#0A1628" size="small" />
                        : <Text style={s.saveBtnText}>{editReco ? '✅ Mettre à jour' : '✅ Enregistrer'}</Text>}
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
  header: { backgroundColor: '#0F2137', padding: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, marginBottom: 12 },
  backText: { color: '#C9A84C', fontSize: 14, marginBottom: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  headerSub: { color: '#607D8B', fontSize: 11, marginTop: 2 },
  list: { paddingHorizontal: 14 },
  sectionLabel: { color: '#C9A84C', fontWeight: 'bold', fontSize: 13, marginBottom: 8 },
  chipBtn: { minWidth: 64, height: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#0F2137', borderWidth: 1, borderColor: '#2A4060', marginRight: 8, alignItems: 'center', justifyContent: 'center' },
  chipBtnActive: { backgroundColor: '#C9A84C', borderColor: '#C9A84C' },
  chipText: { color: '#607D8B', fontWeight: 'bold', fontSize: 13 },
  chipTextActive: { color: '#0A1628' },
  confirmBtn: { backgroundColor: '#C9A84C', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 20 },
  confirmBtnText: { color: '#0A1628', fontWeight: 'bold', fontSize: 15 },
  addBtn: { backgroundColor: '#C9A84C', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  addBtnText: { color: '#0A1628', fontWeight: 'bold', fontSize: 11 },
  pdfBtn: { backgroundColor: '#C9A84C', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  pdfBtnText: { color: '#0A1628', fontWeight: 'bold', fontSize: 12 },
  editBtn: { backgroundColor: '#4A90D920', borderRadius: 6, padding: 6, borderWidth: 1, borderColor: '#4A90D9' },
  editBtnText: { fontSize: 13 },
  deleteBtn: { backgroundColor: '#E74C3C20', borderRadius: 6, padding: 6, borderWidth: 1, borderColor: '#E74C3C' },
  deleteBtnText: { fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: '#00000090', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#0F2137', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '93%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', flex: 1 },
  closeBtn: { color: '#607D8B', fontSize: 20 },
  fieldLabel: { color: '#B0BEC5', fontSize: 12, marginBottom: 4, marginTop: 10 },
  input: { backgroundColor: '#1A2F4A', borderWidth: 1, borderColor: '#2A4060', borderRadius: 8, padding: 10, color: '#FFFFFF', fontSize: 13 },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 20, marginBottom: 8 },
  cancelBtn: { flex: 1, backgroundColor: '#1A2F4A', borderRadius: 10, padding: 14, alignItems: 'center' },
  cancelBtnText: { color: '#607D8B', fontWeight: 'bold' },
  saveBtn: { flex: 2, backgroundColor: '#C9A84C', borderRadius: 10, padding: 14, alignItems: 'center' },
  saveBtnText: { color: '#0A1628', fontWeight: 'bold', fontSize: 14 },
});

const sk = StyleSheet.create({
  semBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#0F2137', borderWidth: 1.5, borderColor: '#2A4060', alignItems: 'center' },
  semBtnActive: { backgroundColor: '#1E3A5F', borderColor: '#C9A84C' },
  semBtnText: { color: '#607D8B', fontWeight: 'bold', fontSize: 18 },
  semBtnTextActive: { color: '#C9A84C', fontSize: 20 },
  legendeBox: { backgroundColor: '#0F2137', borderRadius: 10, padding: 14, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#C9A84C' },
  legendeTitle: { color: '#C9A84C', fontSize: 12, fontWeight: 'bold', marginBottom: 8 },
  legendeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  legendeSrc: { color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' },
  legendeDest: { color: '#607D8B', fontSize: 11 },
  // KPI
  kpiGrid: { gap: 8, marginBottom: 12 },
  kpiCard: { backgroundColor: '#0F2137', borderRadius: 10, padding: 12, borderTopWidth: 3, flex: 1, minWidth: '45%' },
  kpiLabel: { color: '#607D8B', fontSize: 10, marginBottom: 4 },
  kpiValue: { fontSize: 22, fontWeight: 'bold' },
  kpiObj: { color: '#607D8B', fontSize: 10 },
  kpiEcart: { fontSize: 11, fontWeight: 'bold' },
  // Bilan table
  bilanTable: { backgroundColor: '#0F2137', borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#2A4060', marginBottom: 12 },
  bilanRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10 },
  bilanHead: { backgroundColor: '#1A2F4A', borderBottomWidth: 1, borderBottomColor: '#2A4060' },
  bilanEven: { backgroundColor: '#0F2137' },
  bilanOdd: { backgroundColor: '#111D30' },
  bilanTh: { color: '#C9A84C', fontSize: 10, fontWeight: 'bold', paddingRight: 6 },
  bilanTd: { color: '#B0BEC5', fontSize: 10, paddingRight: 6 },
  // CDT mobile
  cdtMobCard: { backgroundColor: '#0F2137', borderRadius: 10, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cdtMobTitle: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  cdtMobLabel: { color: '#607D8B', fontSize: 10, marginTop: 2 },
  // SAMI
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, borderLeftWidth: 4, paddingLeft: 12, marginBottom: 8, marginTop: 12, backgroundColor: '#0F2137', padding: 10, borderRadius: 8 },
  sectionHeaderText: { fontSize: 13, fontWeight: 'bold', flex: 1 },
  samiRow: { backgroundColor: '#0F2137', borderRadius: 10, padding: 10, marginBottom: 6, flexDirection: 'row', alignItems: 'center', gap: 8, borderLeftWidth: 4 },
  samiBadge: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  samiLetter: { fontSize: 16, fontWeight: 'bold' },
  samiCdtCell: { backgroundColor: '#1A2F4A', borderRadius: 6, borderWidth: 1, borderColor: '#2A4060', padding: 6, alignItems: 'center', minWidth: 48 },
  samiCdtLabel: { color: '#607D8B', fontSize: 9 },
  samiCdtVal: { fontSize: 14, fontWeight: 'bold', marginTop: 2 },
  tendanceBtn: { width: 28, height: 28, borderRadius: 6, borderWidth: 1, borderColor: '#2A4060', alignItems: 'center', justifyContent: 'center' },
  tendanceTxt: { fontSize: 14, fontWeight: 'bold' },
  // Section title row
  sectionTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  emptySecText: { color: '#607D8B', fontSize: 12, fontStyle: 'italic', marginBottom: 12, paddingLeft: 4 },
  // Fragilité card
  fragCard: { backgroundColor: '#0F2137', borderRadius: 10, padding: 12, marginBottom: 6, borderLeftWidth: 4 },
  gravBadge: { fontSize: 10, fontWeight: 'bold' },
  fragDesc: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold', marginTop: 4 },
  fragAction: { color: '#B0BEC5', fontSize: 11, marginTop: 4 },
  fragEcheance: { color: '#607D8B', fontSize: 10, marginTop: 2 },
  // Reco card
  recoCard: { backgroundColor: '#0F2137', borderRadius: 10, padding: 12, marginBottom: 6, borderLeftWidth: 4 },
  recoText: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold', marginTop: 4, lineHeight: 18 },
  recoSuivi: { color: '#B0BEC5', fontSize: 11, marginTop: 4 },
  prioMini: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  // Web
  webEditBtn: { backgroundColor: '#4A90D920', borderRadius: 5, padding: 5, borderWidth: 1, borderColor: '#4A90D9' },
  webModal: { borderRadius: 16, maxWidth: 680, width: '90%', maxHeight: '90%', alignSelf: 'center' },
  webModalSm: { borderRadius: 16, maxWidth: 400, width: '90%', maxHeight: '55%', alignSelf: 'center' },
  // Objectifs
  objBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1.5, borderColor: '#607D8B', backgroundColor: '#1A2F4A' },
  objBtnText: { color: '#B0BEC5', fontWeight: 'bold', fontSize: 12 },
  // Select item
  selectItem: { backgroundColor: '#1A2F4A', borderRadius: 8, padding: 14, marginBottom: 6, borderWidth: 1, borderColor: '#2A4060', flexDirection: 'row', alignItems: 'center' },
  selectText: { color: '#B0BEC5', fontSize: 14, flex: 1 },
});
