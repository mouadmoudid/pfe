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

const API       = API_URL.replace('/auth', '/pdvs/rapport-kn2');
const API_USERS = API_URL.replace('/auth', '/users');

const TYPES_RAPPORT = ['TRIMESTRIEL', 'SEMESTRIEL', 'ANNUEL'];
const NATURES       = ['M', 'I', 'Obs'];
const SAMI          = ['S', 'A', 'M', 'I'];
const SAMI_COLORS   = { S: '#27AE60', A: '#3498DB', M: '#F39C12', I: '#E74C3C' };
const OUI_NON       = ['O', 'N'];
const SEMESTRES     = ['S1', 'S2'];

const CSPR_CDT = {
  'CT Voie': ['CDT 101V', 'CDT 102V', 'CDT OA OH OT'],
  'CT CSS':  ['CDT 101LC', 'CDT 101SST'],
};

const canEdit = (role) => role === 'CSPR' || role === 'ADMIN';

const SECTIONS = [
  { key: 's1', label: '1. Évaluation KN1', icon: '📋' },
  { key: 's2', label: '2. Collab / Procédures', icon: '👥' },
  { key: 's3', label: '3. Installations / Site', icon: '🏗️' },
  { key: 's4', label: '4. Documentation', icon: '📂' },
  { key: 's5', label: '5. FOH – 4 dimensions', icon: '🧠' },
  { key: 's6', label: '6. Analyse & Recommandations', icon: '💡' },
];

const FOH_DIMS = [
  { key: 'OrgMgmt',    label: 'Organisation / Management' },
  { key: 'Collectifs', label: 'Collectifs de travail' },
  { key: 'Situations', label: 'Situations de travail' },
  { key: 'Individus',  label: 'Individus (comp. non tech.)' },
];

const EMPTY_RAPPORT = {
  dateRapport: new Date().toISOString().split('T')[0],
  typeRapport: 'TRIMESTRIEL',
  cdtControle: '',
  parNom: '', parFonction: '',
  s1Organisation: '', s1Execution: '', s1Qualite: '', s1ActionsKN1: '', s1Bouclage: '',
  s4Observations: '',
  s5OrgMgmtConstatations: '', s5OrgMgmtActions: '', s5OrgMgmtBouclage: '',
  s5CollectifsConstatations: '', s5CollectifsActions: '', s5CollectifsBouclage: '',
  s5SituationsConstatations: '', s5SituationsActions: '', s5SituationsBouclage: '',
  s5IndividusConstatations: '', s5IndividusActions: '', s5IndiviusBouclage: '',
  s6Synthese: '', s6PointsForts: '', s6AAmeliorer: '', s6Recommandations: '', s6Echeance: '',
};

// ================================================================
// COMPOSANTS UTILITAIRES
// ================================================================
function SectionHeader({ icon, label, color = '#E87722' }) {
  return (
    <View style={[rk.sectionHead, { borderLeftColor: color }]}>
      <Text style={{ fontSize: 18 }}>{icon}</Text>
      <Text style={[rk.sectionHeadText, { color }]}>{label}</Text>
    </View>
  );
}

function FieldLabel({ label, required }) {
  return (
    <Text style={rk.fieldLabel}>
      {label}{required && <Text style={{ color: '#E87722' }}> *</Text>}
    </Text>
  );
}

function TextArea({ value, onChangeText, placeholder, rows = 3, disabled }) {
  return (
    <TextInput
      style={[rk.input, { height: rows * 22, textAlignVertical: 'top' }]}
      value={value} onChangeText={onChangeText}
      multiline placeholder={placeholder}
      placeholderTextColor="#607D8B"
      editable={!disabled} />
  );
}

function SAMIBadge({ value }) {
  const color = SAMI_COLORS[value] || '#607D8B';
  return (
    <View style={[rk.samiBadge, { backgroundColor: color + '20', borderColor: color }]}>
      <Text style={[rk.samiText, { color }]}>{value || '—'}</Text>
    </View>
  );
}

// ================================================================
// ÉCRAN PRINCIPAL
// ================================================================
export default function RapportKN2Screen({ navigation }) {
  const { width } = useWindowDimensions();
  const WEB = Platform.OS === 'web' && width > 768;

  const [step, setStep]           = useState(0); // 0=liste, 1=form, 2=detail
  const [rapports, setRapports]   = useState([]);
  const [loading, setLoading]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [generating, setGenerating] = useState(false);
  const [userRole, setUserRole]   = useState('');
  const [userEntite, setUserEntite] = useState('');
  const [userNom, setUserNom]     = useState('');
  const [userFonction, setUserFonction] = useState('');
  const [selectedRapport, setSelectedRapport] = useState(null); // rapport complet
  const [activeSection, setActiveSection] = useState('s1');

  // Formulaire
  const [form, setForm]           = useState({ ...EMPTY_RAPPORT });
  const [collabs, setCollabs]     = useState([]);
  const [sites, setSites]         = useState([]);
  const [docs, setDocs]           = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId]       = useState(null);

  // Données auto
  const [initData, setInitData]   = useState(null);
  const [loadingInit, setLoadingInit] = useState(false);

  // Modals
  const [modalType, setModalType] = useState(null); // 'type'|'cdt'|'nature_N'|'sami_N'|'oui_non'|'semestre'
  const [modalTarget, setModalTarget] = useState(null);
  const [selectedSemestre, setSelectedSemestre] = useState('S1');
  const [selectedAnnee, setSelectedAnnee]       = useState(new Date().getFullYear());

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
        setUserNom(u.fullName || '');
        setUserFonction(u.fonctionAssuree || '');
      }
      const token = await getToken();
      const res = await axios.get(API, { headers: { Authorization: `Bearer ${token}` } });
      setRapports(res.data);
    } catch {}
    finally { setLoading(false); }
  };

  const loadRapportDetail = async (id) => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await axios.get(`${API}/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setSelectedRapport(res.data);
      setStep(2);
    } catch { Alert.alert('Erreur', 'Impossible de charger le rapport'); }
    finally { setLoading(false); }
  };

  const loadInitData = async (cdt) => {
    if (!cdt) return;
    setLoadingInit(true);
    try {
      const token = await getToken();
      const res = await axios.get(
        `${API}/init-data?cdtControle=${cdt}&annee=${selectedAnnee}&semestre=${selectedSemestre}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setInitData(res.data);
    } catch {}
    finally { setLoadingInit(false); }
  };

  const openNew = () => {
    setIsEditing(false);
    setEditId(null);
    setForm({ ...EMPTY_RAPPORT, parNom: userNom, parFonction: userFonction });
    setCollabs([]);
    setSites([]);
    setDocs([]);
    setInitData(null);
    setActiveSection('s1');
    setStep(1);
  };

  const openEdit = (rapport) => {
    setIsEditing(true);
    setEditId(rapport.rapport.id);
    setForm({ ...rapport.rapport });
    setCollabs(rapport.collabs || []);
    setSites(rapport.sites || []);
    setDocs(rapport.docs || []);
    setActiveSection('s1');
    setStep(1);
  };

  const handleSave = async () => {
    if (!form.cdtControle) { Alert.alert('Incomplet', 'CDT contrôlé obligatoire'); return; }
    if (!form.dateRapport)  { Alert.alert('Incomplet', 'Date obligatoire'); return; }
    setSaving(true);
    try {
      const token = await getToken();
      const payload = { ...form, collabs, sites, docs };
      if (isEditing)
        await axios.put(`${API}/${editId}`, payload, { headers: { Authorization: `Bearer ${token}` } });
      else
        await axios.post(API, payload, { headers: { Authorization: `Bearer ${token}` } });
      Alert.alert('Succès', 'Rapport sauvegardé');
      loadInitial();
      setStep(0);
    } catch { Alert.alert('Erreur', 'Impossible de sauvegarder'); }
    finally { setSaving(false); }
  };

  const handleDelete = (id) => {
    Alert.alert('Supprimer', 'Supprimer ce rapport ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        const t = await getToken();
        await axios.delete(`${API}/${id}`, { headers: { Authorization: `Bearer ${t}` } });
        loadInitial(); setStep(0);
      }},
    ]);
  };

  // ── Collab helpers ──
  const addCollab = () => setCollabs(p => [...p, { collabNom:'', procedure:'', cotationSAMI:'', constatations:'', nature:'' }]);
  const removeCollab = (i) => setCollabs(p => p.filter((_, idx) => idx !== i));
  const setCollab = (i, k, v) => setCollabs(p => p.map((c, idx) => idx === i ? { ...c, [k]: v } : c));

  // ── Site helpers ──
  const addSite = () => setSites(p => [...p, { lieu:'', observations:'', actionsN2:'', isKm:'' }]);
  const removeSite = (i) => setSites(p => p.filter((_, idx) => idx !== i));
  const setSite = (i, k, v) => setSites(p => p.map((s, idx) => idx === i ? { ...s, [k]: v } : s));

  // ── Doc helpers ──
  const addDoc = () => setDocs(p => [...p, { designation:'', existe:'', aJour:'', maitrisee:'', actions:'' }]);
  const removeDoc = (i) => setDocs(p => p.filter((_, idx) => idx !== i));
  const setDoc = (i, k, v) => setDocs(p => p.map((d, idx) => idx === i ? { ...d, [k]: v } : d));

  // ── Collab PDVS helpers ──
  const getCollabNamesFromPDVS = () =>
    [...new Set((initData?.collabsAuto || []).map(c => c.collabNom))];
  const getProcsForCollab = (collabNom) =>
    (initData?.collabsAuto || []).filter(c => c.collabNom === collabNom);
  const selectCollabFromPDVS = (rowIndex, collabNom) => {
    const procs = getProcsForCollab(collabNom);
    if (procs.length === 1) {
      setCollabs(p => p.map((c, idx) => idx === rowIndex
        ? { ...c, collabNom, procedure: procs[0].procedure, cotationSAMI: procs[0].cotationSAMI }
        : c));
      setModalType(null);
    } else {
      setCollabs(p => p.map((c, idx) => idx === rowIndex
        ? { ...c, collabNom, procedure: '', cotationSAMI: '' }
        : c));
      setModalType('proc');
    }
  };
  const selectProcFromPDVS = (rowIndex, entry) => {
    setCollabs(p => p.map((c, idx) => idx === rowIndex
      ? { ...c, procedure: entry.procedure, cotationSAMI: entry.cotationSAMI }
      : c));
    setModalType(null);
  };

  // ── Site PDVS helpers ──
  const getSitesFromPDVS = () => initData?.sitesAuto || [];
  const selectSiteFromPDVS = (rowIndex, siteEntry) => {
    setSites(p => p.map((s, idx) => idx === rowIndex
      ? { ...s, lieu: siteEntry.lieu, actionsN2: siteEntry.actionsN2 }
      : s));
    setModalType(null);
  };

  // ================================================================
  // GÉNÉRATION PDF
  // ================================================================
  const generatePDF = async (data) => {
    setGenerating(true);
    try {
      const r = data?.rapport || form;
      const cls = data?.collabs || collabs;
      const sts = data?.sites   || sites;
      const dcs = data?.docs    || docs;

      const collabRows = cls.map((c, i) => `
        <tr style="background:${i%2===0?'#fff':'#f8f9fa'}">
          <td>${c.collabNom||''}</td>
          <td>${c.procedure||''}</td>
          <td style="text-align:center;font-weight:bold;color:${SAMI_COLORS[c.cotationSAMI]||'#333'}">${c.cotationSAMI||''}</td>
          <td>${c.constatations||''}</td>
          <td style="text-align:center">${c.nature||''}</td>
        </tr>`).join('');

      const siteRows = sts.map((s, i) => `
        <tr style="background:${i%2===0?'#fff':'#f8f9fa'}">
          <td>${s.lieu||''}</td>
          <td>${s.observations||''}</td>
          <td style="text-align:center">${s.isKm||''}</td>
          <td>${s.actionsN2||''}</td>
        </tr>`).join('');

      const docRows = dcs.map((d, i) => `
        <tr style="background:${i%2===0?'#fff':'#f8f9fa'}">
          <td>${d.designation||''}</td>
          <td style="text-align:center">${d.existe||''}</td>
          <td style="text-align:center">${d.aJour||''}</td>
          <td style="text-align:center">${d.maitrisee||''}</td>
          <td>${d.actions||''}</td>
        </tr>`).join('');

      const fohRows = FOH_DIMS.map((dim, i) => `
        <tr style="background:${i%2===0?'#fff':'#f8f9fa'}">
          <td style="font-weight:bold">${dim.label}</td>
          <td>${r[`s5${dim.key}Constatations`]||''}</td>
          <td>${r[`s5${dim.key}Actions`]||''}</td>
          <td>${r[`s5${dim.key}Bouclage`] || r[`s5IndiviusBouclage`] ||''}</td>
        </tr>`).join('');

      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
* { margin:0;padding:0;box-sizing:border-box; }
body { font-family:Arial,sans-serif;font-size:8px;padding:10px; }
@page { size:A4;margin:8mm; }
h3 { font-size:9px;color:#1A1A1A;margin:10px 0 4px;padding:4px 8px;
     border-left:4px solid #E87722;background:#FFF8F0; }
table { width:100%;border-collapse:collapse;margin-bottom:6px; }
th { background:#1A1A1A;color:#fff;padding:4px 3px;font-size:7px;
     border:1px solid #ccc;text-align:left; }
td { font-size:7px;padding:3px;border:1px solid #ddd;vertical-align:top; }
.s1cell { background:#f8f9fa;border-radius:4px;padding:6px;margin-bottom:4px; }
.s1label { font-weight:bold;color:#1A1A1A;font-size:7px; }
.s1val { color:#333;font-size:7px;margin-top:2px; }
</style></head><body>

<div style="background:#1A1A1A;color:#fff;padding:8px 12px;border-radius:6px;margin-bottom:10px;
  display:flex;justify-content:space-between;align-items:center">
  <div>
    <div style="font-size:13px;font-weight:bold;color:#E87722">ONCF · DRIC — CR KN2</div>
    <div style="font-size:9px">Réf. M5.1-DSAS-DVCI</div>
  </div>
  <div style="text-align:right">
    <div style="font-size:10px">CDT : <b>${r.cdtControle||''}</b> | Type : ${r.typeRapport||''}</div>
    <div style="font-size:9px;color:#E87722">Date : ${r.dateRapport||''}</div>
  </div>
</div>

<div style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap">
  <div style="background:#FFF8F0;border:1px solid #E87722;border-radius:4px;padding:4px 8px;font-size:8px">
    <b>Par :</b> ${r.parNom||''}
  </div>
  <div style="background:#FFF8F0;border:1px solid #E87722;border-radius:4px;padding:4px 8px;font-size:8px">
    <b>Fonction :</b> ${r.parFonction||''}
  </div>
</div>

<h3>1. ÉVALUATION KN1 DU CDT</h3>
<table><tr>
  <td style="width:20%;font-weight:bold">Organisation</td><td>${r.s1Organisation||''}</td>
  <td style="width:20%;font-weight:bold">Exécution</td><td>${r.s1Execution||''}</td>
</tr><tr>
  <td style="font-weight:bold">Qualité</td><td>${r.s1Qualite||''}</td>
  <td style="font-weight:bold">Actions KN1</td><td>${r.s1ActionsKN1||''}</td>
</tr><tr>
  <td style="font-weight:bold">Bouclage</td><td colspan="3">${r.s1Bouclage||''}</td>
</tr></table>

<h3>2. COLLAB / PROCÉDURES N2</h3>
<table><thead><tr>
  <th style="width:20%">Collaborateur</th><th style="width:15%">Procédure</th>
  <th style="width:8%;text-align:center">SAMI</th>
  <th>Constatations</th><th style="width:8%;text-align:center">Nature</th>
</tr></thead><tbody>${collabRows||'<tr><td colspan="5" style="text-align:center;color:#999">Aucun</td></tr>'}</tbody></table>

<h3>3. INSTALLATIONS / SITE</h3>
<table><thead><tr>
  <th style="width:15%">Lieu</th><th>Constatations / Obs.</th>
  <th style="width:8%;text-align:center">IS/km</th><th>Actions N2</th>
</tr></thead><tbody>${siteRows||'<tr><td colspan="4" style="text-align:center;color:#999">Aucun</td></tr>'}</tbody></table>

<h3>4. DOCUMENTATION</h3>
<table><thead><tr>
  <th>Désignation</th>
  <th style="width:8%;text-align:center">Existe</th>
  <th style="width:8%;text-align:center">À jour</th>
  <th style="width:10%;text-align:center">Maîtrisée</th>
  <th>Actions</th>
</tr></thead><tbody>${docRows||'<tr><td colspan="5" style="text-align:center;color:#999">Aucun</td></tr>'}</tbody></table>
${r.s4Observations ? `<div style="margin:4px 0;font-size:7px"><b>Observations :</b> ${r.s4Observations}</div>` : ''}

<h3>5. FOH – 4 DIMENSIONS (Pr08)</h3>
<table><thead><tr>
  <th style="width:20%">Dimension FOH</th>
  <th>Constatations CDT</th><th>Actions</th><th>Bouclage</th>
</tr></thead><tbody>${fohRows}</tbody></table>

<h3>6. ANALYSE ET RECOMMANDATIONS</h3>
<table><tr>
  <td style="width:25%;font-weight:bold">Synthèse</td>
  <td colspan="3">${r.s6Synthese||''}</td>
</tr><tr>
  <td style="font-weight:bold">Points forts</td><td>${r.s6PointsForts||''}</td>
  <td style="font-weight:bold">À améliorer</td><td>${r.s6AAmeliorer||''}</td>
</tr><tr>
  <td style="font-weight:bold">Recommandations</td>
  <td colspan="2">${r.s6Recommandations||''}</td>
  <td style="font-weight:bold">Échéance : ${r.s6Echeance||''}</td>
</tr></table>

</body></html>`;

      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `CR KN2 — ${r.cdtControle} — ${r.dateRapport}`,
        UTI: 'com.adobe.pdf',
      });
    } catch { Alert.alert('Erreur', 'Impossible de générer le PDF'); }
    finally { setGenerating(false); }
  };

  // ================================================================
  // ÉTAPE 0 — LISTE DES RAPPORTS
  // ================================================================
  if (step === 0) {
    return (
      <Wrapper style={Platform.OS === 'web' ? s.webSafe : s.safe}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={s.backText}>← Retour</Text>
          </TouchableOpacity>
          <View style={[s.headerRow, { flexWrap: 'wrap', gap: 6 }]}>
            <View>
              <Text style={s.headerTitle}>📝 Rapports KN2</Text>
              <Text style={s.headerSub}>{rapports.length} rapport(s) · {userEntite}</Text>
            </View>
            {canEdit(userRole) && (
              <TouchableOpacity style={s.addBtn} onPress={openNew}>
                <Text style={s.addBtnText}>+ Nouveau rapport</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {loading ? <ActivityIndicator color="#E87722" style={{ marginTop: 40 }} /> : (
          <Scroller style={Platform.OS === 'web' ? s.webScroller : s.list} {...(Platform.OS !== 'web' && { showsVerticalScrollIndicator: false })}>
            {rapports.length === 0 ? (
              <View style={s.emptyBox}>
                <Text style={s.emptyIcon}>📝</Text>
                <Text style={s.emptyText}>Aucun rapport KN2</Text>
              </View>
            ) : rapports.map(r => (
              <TouchableOpacity key={r.id} style={rk.rapportCard}
                onPress={() => loadRapportDetail(r.id)}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <View style={rk.typeBadge}>
                        <Text style={rk.typeText}>{r.typeRapport}</Text>
                      </View>
                      <Text style={rk.cdtText}>{r.cdtControle}</Text>
                    </View>
                    <Text style={rk.dateText}>📅 {r.dateRapport}</Text>
                    <Text style={rk.parText}>👤 {r.parNom}</Text>
                  </View>
                  <View style={{ gap: 4 }}>
                    <TouchableOpacity style={s.pdfBtn}
                      onPress={() => { loadRapportDetail(r.id).then(() => {}); generatePDF({ rapport: r, collabs: [], sites: [], docs: [] }); }}
                      disabled={generating}>
                      <Text style={s.pdfBtnText}>📄</Text>
                    </TouchableOpacity>
                    {canEdit(userRole) && (
                      <>
                        <TouchableOpacity style={s.editBtn}
                          onPress={async () => { const d = await axios.get(`${API}/${r.id}`, { headers: { Authorization: `Bearer ${await getToken()}` } }); openEdit(d.data); }}>
                          <Text style={s.editBtnText}>✏️</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={s.deleteBtn} onPress={() => handleDelete(r.id)}>
                          <Text style={s.deleteBtnText}>🗑</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
            <View style={{ height: 40 }} />
          </Scroller>
        )}
      </Wrapper>
    );
  }

  // ================================================================
  // ÉTAPE 2 — DÉTAIL RAPPORT (lecture)
  // ================================================================
  if (step === 2 && selectedRapport) {
    const r   = selectedRapport.rapport;
    const cls = selectedRapport.collabs || [];
    const sts = selectedRapport.sites   || [];
    const dcs = selectedRapport.docs    || [];
    return (
      <Wrapper style={Platform.OS === 'web' ? s.webSafe : s.safe}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => setStep(0)}>
            <Text style={s.backText}>← Retour</Text>
          </TouchableOpacity>
          <View style={[s.headerRow, { flexWrap: 'wrap', gap: 6 }]}>
            <View>
              <Text style={s.headerTitle}>📝 CR KN2 — {r.cdtControle}</Text>
              <Text style={s.headerSub}>{r.dateRapport} · {r.typeRapport}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {canEdit(userRole) && (
                <TouchableOpacity style={s.addBtn}
                  onPress={() => openEdit(selectedRapport)}>
                  <Text style={s.addBtnText}>✏️ Modifier</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[s.pdfBtn, { paddingHorizontal: 12 }, generating && { opacity: 0.5 }]}
                onPress={() => generatePDF(selectedRapport)} disabled={generating}>
                {generating ? <ActivityIndicator color="#0A1628" size="small" />
                  : <Text style={s.pdfBtnText}>📄 PDF</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <Scroller style={Platform.OS === 'web' ? s.webScroller : s.list} {...(Platform.OS !== 'web' && { showsVerticalScrollIndicator: false })}>
          {/* En-tête */}
          <View style={rk.detailCard}>
            <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
              <View style={{ flex: 1 }}>
                <Text style={rk.detailLabel}>Par</Text>
                <Text style={rk.detailValue}>{r.parNom}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={rk.detailLabel}>Fonction</Text>
                <Text style={rk.detailValue}>{r.parFonction}</Text>
              </View>
            </View>
          </View>

          {/* Section 1 */}
          <SectionHeader icon="📋" label="1. Évaluation KN1 du CDT" />
          {[
            { k: 's1Organisation', l: 'Organisation' },
            { k: 's1Execution', l: 'Exécution' },
            { k: 's1Qualite', l: 'Qualité' },
            { k: 's1ActionsKN1', l: 'Actions KN1' },
            { k: 's1Bouclage', l: 'Bouclage' },
          ].map(f => r[f.k] ? (
            <View key={f.k} style={rk.detailRow}>
              <Text style={rk.detailLabel}>{f.l}</Text>
              <Text style={rk.detailValue}>{r[f.k]}</Text>
            </View>
          ) : null)}

          {/* Section 2 */}
          <SectionHeader icon="👥" label="2. Collab / Procédures N2" />
          {cls.map((c, i) => (
            <View key={i} style={rk.collabCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={rk.collabName}>{c.collabNom}</Text>
                <SAMIBadge value={c.cotationSAMI} />
              </View>
              <Text style={rk.detailLabel}>{c.procedure}</Text>
              {c.constatations ? <Text style={rk.detailValue}>{c.constatations}</Text> : null}
              {c.nature ? <Text style={[rk.detailLabel, { color: '#E87722' }]}>Nature : {c.nature}</Text> : null}
            </View>
          ))}

          {/* Section 3 */}
          <SectionHeader icon="🏗️" label="3. Installations / Site" />
          {sts.map((st, i) => (
            <View key={i} style={rk.collabCard}>
              <Text style={rk.collabName}>{st.lieu}</Text>
              {st.isKm ? <Text style={rk.detailLabel}>IS/km : {st.isKm}</Text> : null}
              {st.observations ? <Text style={rk.detailValue}>{st.observations}</Text> : null}
              {st.actionsN2 ? <Text style={[rk.detailLabel, { color: '#E87722' }]}>Action N2 : {st.actionsN2}</Text> : null}
            </View>
          ))}

          {/* Section 4 */}
          <SectionHeader icon="📂" label="4. Documentation" />
          {dcs.map((d, i) => (
            <View key={i} style={rk.detailRow}>
              <Text style={rk.collabName}>{d.designation}</Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Text style={rk.detailLabel}>Existe : {d.existe}</Text>
                <Text style={rk.detailLabel}>À jour : {d.aJour}</Text>
                <Text style={rk.detailLabel}>Maîtrisée : {d.maitrisee}</Text>
              </View>
              {d.actions ? <Text style={rk.detailValue}>{d.actions}</Text> : null}
            </View>
          ))}
          {r.s4Observations ? (
            <View style={rk.detailRow}>
              <Text style={rk.detailLabel}>Observations</Text>
              <Text style={rk.detailValue}>{r.s4Observations}</Text>
            </View>
          ) : null}

          {/* Section 5 */}
          <SectionHeader icon="🧠" label="5. FOH – 4 dimensions" />
          {FOH_DIMS.map(dim => (
            <View key={dim.key} style={rk.collabCard}>
              <Text style={[rk.collabName, { color: '#E87722' }]}>{dim.label}</Text>
              {r[`s5${dim.key}Constatations`] && <Text style={rk.detailValue}>{r[`s5${dim.key}Constatations`]}</Text>}
              {r[`s5${dim.key}Actions`] && <Text style={rk.detailLabel}>Actions : {r[`s5${dim.key}Actions`]}</Text>}
            </View>
          ))}

          {/* Section 6 */}
          <SectionHeader icon="💡" label="6. Analyse & Recommandations" />
          {[
            { k: 's6Synthese', l: 'Synthèse' },
            { k: 's6PointsForts', l: 'Points forts' },
            { k: 's6AAmeliorer', l: 'À améliorer' },
            { k: 's6Recommandations', l: 'Recommandations' },
            { k: 's6Echeance', l: 'Échéance' },
          ].map(f => r[f.k] ? (
            <View key={f.k} style={rk.detailRow}>
              <Text style={rk.detailLabel}>{f.l}</Text>
              <Text style={rk.detailValue}>{r[f.k]}</Text>
            </View>
          ) : null)}

          <View style={{ height: 40 }} />
        </Scroller>
      </Wrapper>
    );
  }

  // ================================================================
  // ÉTAPE 1 — FORMULAIRE
  // ================================================================
  const cdtOptions = CSPR_CDT[userEntite] || [];

  return (
    <Wrapper style={Platform.OS === 'web' ? s.webSafe : s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => setStep(0)}>
          <Text style={s.backText}>← Retour</Text>
        </TouchableOpacity>
        <View style={[s.headerRow, { flexWrap: 'wrap', gap: 6 }]}>
          <Text style={s.headerTitle}>
            {isEditing ? '✏️ Modifier rapport' : '➕ Nouveau rapport KN2'}
          </Text>
          <TouchableOpacity style={[s.addBtn, saving && { opacity: 0.5 }]}
            onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#0A1628" size="small" />
              : <Text style={s.addBtnText}>✅ Sauvegarder</Text>}
          </TouchableOpacity>
        </View>
      </View>

      {/* Navigation sections */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, paddingHorizontal: 14, paddingVertical: 6 }}>
        {SECTIONS.map(sec => (
          <TouchableOpacity key={sec.key}
            style={[rk.secTab, activeSection === sec.key && rk.secTabActive]}
            onPress={() => setActiveSection(sec.key)}>
            <Text style={{ fontSize: 13 }}>{sec.icon}</Text>
            <Text style={[rk.secTabText,
              activeSection === sec.key && { color: '#E87722', fontWeight: 'bold' }]}>
              {sec.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Scroller style={Platform.OS === 'web' ? s.webScroller : s.list} {...(Platform.OS !== 'web' && { showsVerticalScrollIndicator: false })}>

        {/* ── EN-TÊTE (toujours visible) ── */}
        {activeSection === 's1' && (
          <View style={rk.formCard}>
            <SectionHeader icon="ℹ️" label="En-tête du rapport" />

            <View style={WEB ? { flexDirection: 'row', gap: 12 } : {}}>
              <View style={WEB ? { flex: 1 } : {}}>
                <FieldLabel label="Date du rapport" required />
                <TextInput style={s.input} value={form.dateRapport}
                  onChangeText={v => setF('dateRapport', v)}
                  placeholder="AAAA-MM-JJ" placeholderTextColor="#607D8B" />
              </View>
              <View style={WEB ? { flex: 1 } : {}}>
                <FieldLabel label="Type de rapport" required />
                <TouchableOpacity style={[s.input, { flexDirection:'row', justifyContent:'space-between', alignItems:'center', borderColor: '#E87722' }]}
                  onPress={() => setModalType('type')}>
                  <Text style={{ color: '#FFFFFF' }}>{form.typeRapport || 'Choisir…'}</Text>
                  <Text style={{ color: '#E87722' }}>›</Text>
                </TouchableOpacity>
              </View>
            </View>

            <FieldLabel label="CDT contrôlé" required />
            <TouchableOpacity style={[s.input, { flexDirection:'row', justifyContent:'space-between', alignItems:'center' }]}
              onPress={() => setModalType('cdt')}>
              <Text style={{ color: form.cdtControle ? '#FFFFFF' : '#607D8B' }}>
                {form.cdtControle || 'Sélectionner le CDT…'}
              </Text>
              <Text style={{ color: '#E87722' }}>›</Text>
            </TouchableOpacity>

            {form.cdtControle && !isEditing && (
              <View style={rk.initBox}>
                <Text style={rk.initTitle}>⚡ Pré-remplissage automatique</Text>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                  {SEMESTRES.map(sem => (
                    <TouchableOpacity key={sem}
                      style={[rk.semBtn, selectedSemestre === sem && rk.semBtnActive]}
                      onPress={() => setSelectedSemestre(sem)}>
                      <Text style={[rk.semBtnText, selectedSemestre === sem && { color: '#E87722', fontWeight: 'bold' }]}>{sem}</Text>
                    </TouchableOpacity>
                  ))}
                  <TextInput style={[rk.semBtn, { color: '#FFFFFF', minWidth: 60 }]}
                    value={String(selectedAnnee)} keyboardType="numeric"
                    onChangeText={v => setSelectedAnnee(parseInt(v) || selectedAnnee)} />
                </View>
                <TouchableOpacity style={rk.initBtn} onPress={() => loadInitData(form.cdtControle)}
                  disabled={loadingInit}>
                  {loadingInit
                    ? <ActivityIndicator color="#0A1628" size="small" />
                    : <Text style={rk.initBtnText}>Charger données PDVS ({selectedSemestre} {selectedAnnee})</Text>}
                </TouchableOpacity>
                {initData && (
                  <Text style={{ color: '#27AE60', fontSize: 11, marginTop: 6 }}>
                    ✓ {initData.collabsAuto?.length||0} collaborateur(s) et {initData.sitesAuto?.length||0} site(s) chargés
                  </Text>
                )}
              </View>
            )}

            <View style={WEB ? { flexDirection: 'row', gap: 12 } : {}}>
              <View style={WEB ? { flex: 1 } : {}}>
                <FieldLabel label="Par (nom)" />
                <TextInput style={s.input} value={form.parNom}
                  onChangeText={v => setF('parNom', v)}
                  placeholder="Nom du CSPR" placeholderTextColor="#607D8B" />
              </View>
              <View style={WEB ? { flex: 1 } : {}}>
                <FieldLabel label="Fonction" />
                <TextInput style={s.input} value={form.parFonction}
                  onChangeText={v => setF('parFonction', v)}
                  placeholder="Fonction" placeholderTextColor="#607D8B" />
              </View>
            </View>

            {/* Section 1 — KN1 */}
            <SectionHeader icon="📋" label="1. Évaluation KN1 du CDT" />
            {[
              { k: 's1Organisation', l: 'Organisation', ph: 'Appréciation organisation du CDT…' },
              { k: 's1Execution',    l: 'Exécution',    ph: 'Appréciation exécution des contrôles…' },
              { k: 's1Qualite',      l: 'Qualité',      ph: 'Appréciation qualité des KN1…' },
              { k: 's1ActionsKN1',   l: 'Actions KN1',  ph: 'Actions issues du KN1 précédent…' },
              { k: 's1Bouclage',     l: 'Bouclage',     ph: 'Bouclage des actions précédentes…' },
            ].map(f => (
              <View key={f.k}>
                <FieldLabel label={f.l} />
                <TextArea value={form[f.k]} onChangeText={v => setF(f.k, v)} placeholder={f.ph} rows={2} />
              </View>
            ))}
          </View>
        )}

        {/* ── SECTION 2 — COLLAB ── */}
        {activeSection === 's2' && (
          <View style={rk.formCard}>
            <SectionHeader icon="👥" label="2. Collab / Procédures N2" />
            <Text style={rk.autoNote}>
              {initData
                ? '⚡ Sélectionnez un collaborateur — procédure et SAMI se remplissent automatiquement depuis PDVS N2. Constatations et nature sont à saisir manuellement.'
                : '⚠️ Chargez d\'abord les données PDVS depuis la section En-tête pour accéder à la liste des collaborateurs.'}
            </Text>

            {collabs.map((c, i) => (
              <View key={i} style={rk.rowCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={rk.rowNum}>#{i + 1}</Text>
                  {canEdit(userRole) && (
                    <TouchableOpacity onPress={() => removeCollab(i)}>
                      <Text style={{ color: '#E74C3C', fontSize: 14 }}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={WEB ? { flexDirection: 'row', gap: 10 } : {}}>
                  <View style={WEB ? { flex: 1.5 } : {}}>
                    <FieldLabel label="Collaborateur" />
                    <TouchableOpacity
                      style={[s.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                        borderColor: c.collabNom ? '#27AE60' : '#2A4060' }]}
                      onPress={() => { setModalType('collab'); setModalTarget(i); }}>
                      <Text style={{ color: c.collabNom ? '#FFFFFF' : '#607D8B', flex: 1 }}>
                        {c.collabNom || 'Sélectionner un collaborateur…'}
                      </Text>
                      <Text style={{ color: '#E87722' }}>›</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={WEB ? { flex: 1 } : {}}>
                    <FieldLabel label="Procédure" />
                    {c.collabNom && getProcsForCollab(c.collabNom).length > 1 ? (
                      <TouchableOpacity
                        style={[s.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                          borderColor: c.procedure ? '#27AE60' : '#E87722' }]}
                        onPress={() => { setModalType('proc'); setModalTarget(i); }}>
                        <Text style={{ color: c.procedure ? '#FFFFFF' : '#607D8B', flex: 1 }}>
                          {c.procedure || 'Choisir une procédure…'}
                        </Text>
                        <Text style={{ color: c.procedure ? '#27AE60' : '#E87722' }}>›</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={[s.input, { backgroundColor: '#1A3A28', borderColor: '#27AE60',
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                        <Text style={{ color: c.procedure ? '#FFFFFF' : '#607D8B', flex: 1 }}>
                          {c.procedure || '—'}
                        </Text>
                        {c.procedure && <Text style={{ color: '#27AE60', fontSize: 10 }}>⚡</Text>}
                      </View>
                    )}
                  </View>
                  <View style={WEB ? { flex: 0.5 } : {}}>
                    <FieldLabel label="SAMI" />
                    <View style={[s.input, {
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                      backgroundColor: c.cotationSAMI ? SAMI_COLORS[c.cotationSAMI] + '20' : '#1A2F4A',
                      borderColor: c.cotationSAMI ? SAMI_COLORS[c.cotationSAMI] : '#2A4060',
                    }]}>
                      <Text style={{ color: c.cotationSAMI ? SAMI_COLORS[c.cotationSAMI] : '#607D8B',
                        fontWeight: 'bold', fontSize: 16 }}>
                        {c.cotationSAMI || '—'}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={WEB ? { flexDirection: 'row', gap: 10 } : {}}>
                  <View style={WEB ? { flex: 2 } : {}}>
                    <FieldLabel label="Constatations terrain ✏️" />
                    <TextArea value={c.constatations} rows={2}
                      onChangeText={v => setCollab(i, 'constatations', v)}
                      placeholder="Observations terrain…" />
                  </View>
                  <View style={WEB ? { flex: 0.6 } : {}}>
                    <FieldLabel label="Nature ✏️" />
                    <TouchableOpacity
                      style={[s.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
                      onPress={() => { setModalType('nature'); setModalTarget(i); }}>
                      <Text style={{ color: c.nature ? '#E87722' : '#607D8B', fontWeight: 'bold' }}>
                        {c.nature || '—'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}

            <TouchableOpacity style={rk.addRowBtn} onPress={addCollab}>
              <Text style={rk.addRowBtnText}>+ Ajouter un collaborateur</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── SECTION 3 — SITE ── */}
        {activeSection === 's3' && (
          <View style={rk.formCard}>
            <SectionHeader icon="🏗️" label="3. Installations / Site" />
            <Text style={rk.autoNote}>
              {initData
                ? '⚡ Sélectionnez un site — lieu et actions N2 se remplissent automatiquement depuis PDVS N2. IS/km et constatations sont à saisir manuellement.'
                : '⚠️ Chargez d\'abord les données PDVS depuis la section En-tête pour accéder à la liste des sites.'}
            </Text>

            {sites.map((st, i) => (
              <View key={i} style={rk.rowCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={rk.rowNum}>#{i + 1}</Text>
                  {canEdit(userRole) && (
                    <TouchableOpacity onPress={() => removeSite(i)}>
                      <Text style={{ color: '#E74C3C', fontSize: 14 }}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={WEB ? { flexDirection: 'row', gap: 10 } : {}}>
                  <View style={WEB ? { flex: 1.5 } : {}}>
                    <FieldLabel label="Site / Lieu" />
                    <TouchableOpacity
                      style={[s.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                        borderColor: st.lieu ? '#27AE60' : '#2A4060' }]}
                      onPress={() => { setModalType('site'); setModalTarget(i); }}>
                      <Text style={{ color: st.lieu ? '#FFFFFF' : '#607D8B', flex: 1 }}>
                        {st.lieu || 'Sélectionner un site…'}
                      </Text>
                      <Text style={{ color: '#E87722' }}>›</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={WEB ? { flex: 0.6 } : {}}>
                    <FieldLabel label="IS/km ✏️" />
                    <TextInput style={s.input}
                      value={st.isKm} onChangeText={v => setSite(i, 'isKm', v)}
                      placeholder="Ex: 42+500" placeholderTextColor="#607D8B" />
                  </View>
                </View>

                <FieldLabel label="Constatations terrain ✏️" />
                <TextArea value={st.observations} rows={2}
                  onChangeText={v => setSite(i, 'observations', v)}
                  placeholder="Observations terrain…" />

                <FieldLabel label="Actions N2" />
                <View style={[s.input, { backgroundColor: '#1A3A28', borderColor: '#27AE60',
                  minHeight: 56, justifyContent: 'flex-start', flexDirection: 'row',
                  alignItems: 'flex-start', gap: 8 }]}>
                  <Text style={{ color: st.actionsN2 ? '#FFFFFF' : '#607D8B', flex: 1, fontSize: 13,
                    textAlignVertical: 'top' }}>
                    {st.actionsN2 || '—'}
                  </Text>
                  <Text style={{ color: '#27AE60', fontSize: 10 }}>⚡</Text>
                </View>
              </View>
            ))}

            <TouchableOpacity style={rk.addRowBtn} onPress={addSite}>
              <Text style={rk.addRowBtnText}>+ Ajouter un site</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── SECTION 4 — DOCUMENTATION ── */}
        {activeSection === 's4' && (
          <View style={rk.formCard}>
            <SectionHeader icon="📂" label="4. Documentation" />
            {docs.map((d, i) => (
              <View key={i} style={rk.rowCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={rk.rowNum}>#{i + 1}</Text>
                  <TouchableOpacity onPress={() => removeDoc(i)}>
                    <Text style={{ color: '#E74C3C', fontSize: 14 }}>✕</Text>
                  </TouchableOpacity>
                </View>

                <FieldLabel label="Désignation du document" />
                <TextInput style={s.input} value={d.designation}
                  onChangeText={v => setDoc(i, 'designation', v)}
                  placeholder="Nom du document…" placeholderTextColor="#607D8B" />

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {[
                    { k: 'existe', l: 'Existe' },
                    { k: 'aJour', l: 'À jour' },
                    { k: 'maitrisee', l: 'Maîtrisée' },
                  ].map(f => (
                    <View key={f.k} style={{ flex: 1 }}>
                      <FieldLabel label={f.l} />
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {OUI_NON.map(v => (
                          <TouchableOpacity key={v}
                            style={[rk.ouiNonBtn,
                              d[f.k] === v && {
                                backgroundColor: v === 'O' ? '#1A3A28' : '#3A0E0E',
                                borderColor: v === 'O' ? '#27AE60' : '#E74C3C',
                              }]}
                            onPress={() => setDoc(i, f.k, v)}>
                            <Text style={[rk.ouiNonText,
                              d[f.k] === v && { color: v === 'O' ? '#27AE60' : '#E74C3C', fontWeight: 'bold' }]}>
                              {v}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  ))}
                </View>

                <FieldLabel label="Actions" />
                <TextArea value={d.actions} rows={2}
                  onChangeText={v => setDoc(i, 'actions', v)}
                  placeholder="Actions correctives…" />
              </View>
            ))}

            <TouchableOpacity style={rk.addRowBtn} onPress={addDoc}>
              <Text style={rk.addRowBtnText}>+ Ajouter un document</Text>
            </TouchableOpacity>

            <FieldLabel label="Observations générales documentation" />
            <TextArea value={form.s4Observations} rows={3}
              onChangeText={v => setF('s4Observations', v)}
              placeholder="Observations générales sur la documentation…" />
          </View>
        )}

        {/* ── SECTION 5 — FOH ── */}
        {activeSection === 's5' && (
          <View style={rk.formCard}>
            <SectionHeader icon="🧠" label="5. FOH – 4 dimensions (Pr08)" />
            {FOH_DIMS.map(dim => (
              <View key={dim.key} style={rk.rowCard}>
                <Text style={[rk.rowNum, { color: '#E87722', marginBottom: 8, fontSize: 13 }]}>
                  {dim.label}
                </Text>
                <FieldLabel label="Constatations CDT" />
                <TextArea value={form[`s5${dim.key}Constatations`]} rows={2}
                  onChangeText={v => setF(`s5${dim.key}Constatations`, v)}
                  placeholder="Constatations terrain…" />
                <FieldLabel label="Actions" />
                <TextArea value={form[`s5${dim.key}Actions`]} rows={2}
                  onChangeText={v => setF(`s5${dim.key}Actions`, v)}
                  placeholder="Actions correctives…" />
                <FieldLabel label="Bouclage" />
                <TextArea value={form[dim.key === 'Individus' ? 's5IndiviusBouclage' : `s5${dim.key}Bouclage`]} rows={1}
                  onChangeText={v => setF(dim.key === 'Individus' ? 's5IndiviusBouclage' : `s5${dim.key}Bouclage`, v)}
                  placeholder="Bouclage de l'action…" />
              </View>
            ))}
          </View>
        )}

        {/* ── SECTION 6 — ANALYSE ── */}
        {activeSection === 's6' && (
          <View style={rk.formCard}>
            <SectionHeader icon="💡" label="6. Analyse et Recommandations" />
            {[
              { k: 's6Synthese',        l: 'Synthèse globale',   ph: 'Bilan général du KN2…', rows: 4 },
              { k: 's6PointsForts',     l: 'Points forts',       ph: 'Points positifs constatés…', rows: 3 },
              { k: 's6AAmeliorer',      l: 'À améliorer',        ph: 'Points à améliorer…', rows: 3 },
              { k: 's6Recommandations', l: 'Recommandations',    ph: 'Recommandations au CDT…', rows: 3 },
            ].map(f => (
              <View key={f.k}>
                <FieldLabel label={f.l} />
                <TextArea value={form[f.k]} rows={f.rows}
                  onChangeText={v => setF(f.k, v)} placeholder={f.ph} />
              </View>
            ))}
            <FieldLabel label="Échéance" />
            <TextInput style={s.input} value={form.s6Echeance}
              onChangeText={v => setF('s6Echeance', v)}
              placeholder="Ex: T3 2026" placeholderTextColor="#607D8B" />
          </View>
        )}

        <View style={{ height: 40 }} />
      </Scroller>

      {/* ── MODALS ── */}
      <Modal visible={!!modalType} transparent animationType="slide"
        onRequestClose={() => setModalType(null)}>
        <View style={[s.modalOverlay, WEB && { justifyContent: 'center', alignItems: 'center' }]}>
          <View style={[s.modalBox,
            WEB && { borderRadius: 16, maxWidth: 440, width: '90%', maxHeight: '60%' }]}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>
                {modalType === 'type'   ? '📋 Type de rapport' :
                 modalType === 'cdt'    ? '📍 CDT contrôlé' :
                 modalType === 'sami'   ? '🎯 Cotation SAMI' :
                 modalType === 'nature' ? '🏷️ Nature' :
                 modalType === 'collab' ? '👤 Collaborateur' :
                 modalType === 'proc'   ? '📋 Procédure' :
                 modalType === 'site'   ? '🏗️ Site / Installation' : ''}
              </Text>
              <TouchableOpacity onPress={() => setModalType(null)}>
                <Text style={s.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              {/* Type rapport */}
              {modalType === 'type' && TYPES_RAPPORT.map(t => (
                <TouchableOpacity key={t}
                  style={[rk.selectItem, form.typeRapport === t && rk.selectItemActive]}
                  onPress={() => { setF('typeRapport', t); setModalType(null); }}>
                  <Text style={[rk.selectText, form.typeRapport === t && { color: '#E87722', fontWeight: 'bold' }]}>{t}</Text>
                  {form.typeRapport === t && <Text style={{ color: '#E87722', marginLeft: 'auto' }}>✓</Text>}
                </TouchableOpacity>
              ))}
              {/* CDT */}
              {modalType === 'cdt' && cdtOptions.map(cdt => (
                <TouchableOpacity key={cdt}
                  style={[rk.selectItem, form.cdtControle === cdt && rk.selectItemActive]}
                  onPress={() => { setF('cdtControle', cdt); setModalType(null); }}>
                  <Text style={[rk.selectText, form.cdtControle === cdt && { color: '#E87722', fontWeight: 'bold' }]}>{cdt}</Text>
                  {form.cdtControle === cdt && <Text style={{ color: '#E87722', marginLeft: 'auto' }}>✓</Text>}
                </TouchableOpacity>
              ))}
              {/* SAMI */}
              {modalType === 'sami' && SAMI.map(v => {
                const color = SAMI_COLORS[v];
                const current = modalTarget !== null ? collabs[modalTarget]?.cotationSAMI : '';
                return (
                  <TouchableOpacity key={v}
                    style={[rk.selectItem, current === v && { borderColor: color, backgroundColor: color + '15' }]}
                    onPress={() => { setCollab(modalTarget, 'cotationSAMI', v); setModalType(null); }}>
                    <View style={[rk.samiBadge, { borderColor: color, backgroundColor: color + '20' }]}>
                      <Text style={[rk.samiText, { color }]}>{v}</Text>
                    </View>
                    {current === v && <Text style={{ color, marginLeft: 'auto' }}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
              {/* Nature */}
              {modalType === 'nature' && NATURES.map(v => {
                const current = modalTarget !== null ? collabs[modalTarget]?.nature : '';
                return (
                  <TouchableOpacity key={v}
                    style={[rk.selectItem, current === v && rk.selectItemActive]}
                    onPress={() => { setCollab(modalTarget, 'nature', v); setModalType(null); }}>
                    <Text style={[rk.selectText, current === v && { color: '#E87722', fontWeight: 'bold' }]}>{v}</Text>
                    {current === v && <Text style={{ color: '#E87722', marginLeft: 'auto' }}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
              {/* Collaborateur picker */}
              {modalType === 'collab' && (() => {
                const names = getCollabNamesFromPDVS();
                if (names.length === 0) return (
                  <View style={{ padding: 24, alignItems: 'center' }}>
                    <Text style={{ color: '#607D8B', textAlign: 'center', lineHeight: 20 }}>
                      Aucun collaborateur disponible.{'\n'}Chargez les données PDVS depuis l'en-tête.
                    </Text>
                  </View>
                );
                return names.map(name => {
                  const active = collabs[modalTarget]?.collabNom === name;
                  return (
                    <TouchableOpacity key={name}
                      style={[rk.selectItem, active && rk.selectItemActive]}
                      onPress={() => selectCollabFromPDVS(modalTarget, name)}>
                      <Text style={[rk.selectText, active && { color: '#E87722', fontWeight: 'bold' }]}>{name}</Text>
                      {active && <Text style={{ color: '#E87722' }}>✓</Text>}
                    </TouchableOpacity>
                  );
                });
              })()}
              {/* Site picker */}
              {modalType === 'site' && (() => {
                const siteList = getSitesFromPDVS();
                if (siteList.length === 0) return (
                  <View style={{ padding: 24, alignItems: 'center' }}>
                    <Text style={{ color: '#607D8B', textAlign: 'center', lineHeight: 20 }}>
                      Aucun site disponible.{'\n'}Chargez les données PDVS depuis l'en-tête.
                    </Text>
                  </View>
                );
                return siteList.map((entry, idx) => {
                  const active = sites[modalTarget]?.lieu === entry.lieu;
                  return (
                    <TouchableOpacity key={idx}
                      style={[rk.selectItem, active && rk.selectItemActive]}
                      onPress={() => selectSiteFromPDVS(modalTarget, entry)}>
                      <View style={{ flex: 1 }}>
                        <Text style={[rk.selectText, active && { color: '#E87722', fontWeight: 'bold' }]}>
                          {entry.lieu}
                        </Text>
                        {entry.actionsN2 ? (
                          <Text style={{ color: '#607D8B', fontSize: 11, marginTop: 2 }}>
                            {entry.actionsN2.length > 50 ? entry.actionsN2.substring(0, 50) + '…' : entry.actionsN2}
                          </Text>
                        ) : null}
                      </View>
                      {active && <Text style={{ color: '#E87722', marginLeft: 8 }}>✓</Text>}
                    </TouchableOpacity>
                  );
                });
              })()}
              {/* Procédure picker */}
              {modalType === 'proc' && (() => {
                const collabNom = modalTarget !== null ? collabs[modalTarget]?.collabNom : '';
                const procs = getProcsForCollab(collabNom);
                return procs.map(entry => {
                  const active = collabs[modalTarget]?.procedure === entry.procedure;
                  const color = SAMI_COLORS[entry.cotationSAMI] || '#607D8B';
                  return (
                    <TouchableOpacity key={entry.procedure}
                      style={[rk.selectItem, active && rk.selectItemActive]}
                      onPress={() => selectProcFromPDVS(modalTarget, entry)}>
                      <Text style={[rk.selectText, { flex: 1 }, active && { color: '#E87722', fontWeight: 'bold' }]}>
                        {entry.procedure}
                      </Text>
                      <View style={[rk.samiBadge, { borderColor: color, backgroundColor: color + '20' }]}>
                        <Text style={[rk.samiText, { color }]}>{entry.cotationSAMI}</Text>
                      </View>
                      {active && <Text style={{ color: '#E87722', marginLeft: 8 }}>✓</Text>}
                    </TouchableOpacity>
                  );
                });
              })()}
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
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
  header: { backgroundColor: '#0F2137', padding: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, marginBottom: 8 },
  backText: { color: '#E87722', fontSize: 14, marginBottom: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  headerSub: { color: '#607D8B', fontSize: 11, marginTop: 2 },
  list: { paddingHorizontal: 14 },
  addBtn: { backgroundColor: '#E87722', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  addBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 12 },
  pdfBtn: { backgroundColor: '#E87722', borderRadius: 6, padding: 6, borderWidth: 1, borderColor: '#E87722' },
  pdfBtnText: { color: '#0A1628', fontWeight: 'bold', fontSize: 12 },
  editBtn: { backgroundColor: '#4A90D920', borderRadius: 6, padding: 6, borderWidth: 1, borderColor: '#4A90D9' },
  editBtnText: { fontSize: 13 },
  deleteBtn: { backgroundColor: '#E74C3C20', borderRadius: 6, padding: 6, borderWidth: 1, borderColor: '#E74C3C' },
  deleteBtnText: { fontSize: 13 },
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  input: { backgroundColor: '#1A2F4A', borderWidth: 1, borderColor: '#2A4060', borderRadius: 8, padding: 10, color: '#FFFFFF', fontSize: 13, marginBottom: 2 },
  modalOverlay: { flex: 1, backgroundColor: '#00000090', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#0F2137', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  closeBtn: { color: '#607D8B', fontSize: 20 },
});

const rk = StyleSheet.create({
  rapportCard: { backgroundColor: '#0F2137', borderRadius: 12, padding: 14, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#E87722' },
  typeBadge: { backgroundColor: '#E87722', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  typeText: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' },
  cdtText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  dateText: { color: '#607D8B', fontSize: 11, marginTop: 4 },
  parText: { color: '#B0BEC5', fontSize: 11, marginTop: 2 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10, borderLeftWidth: 4, paddingLeft: 12, marginBottom: 10, marginTop: 14, backgroundColor: '#0F2137', padding: 10, borderRadius: 8 },
  sectionHeadText: { fontSize: 13, fontWeight: 'bold', flex: 1 },
  fieldLabel: { color: '#B0BEC5', fontSize: 12, marginBottom: 4, marginTop: 8 },
  autoNote: { color: '#607D8B', fontSize: 11, fontStyle: 'italic', backgroundColor: '#1A2F4A', padding: 8, borderRadius: 6, marginBottom: 10 },
  formCard: { backgroundColor: '#0F2137', borderRadius: 12, padding: 14, marginBottom: 8 },
  rowCard: { backgroundColor: '#1A2F4A', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#2A4060' },
  rowNum: { color: '#E87722', fontWeight: 'bold', fontSize: 11 },
  addRowBtn: { borderWidth: 1.5, borderColor: '#E87722', borderRadius: 8, borderStyle: 'dashed', padding: 10, alignItems: 'center', marginTop: 4, marginBottom: 8 },
  addRowBtnText: { color: '#E87722', fontWeight: 'bold', fontSize: 12 },
  secTab: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: '#0F2137', borderWidth: 1, borderColor: '#2A4060', marginRight: 6 },
  secTabActive: { backgroundColor: '#1A2F4A', borderColor: '#E87722' },
  secTabText: { color: '#607D8B', fontSize: 10 },
  samiBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, alignItems: 'center' },
  samiText: { fontWeight: 'bold', fontSize: 14 },
  ouiNonBtn: { flex: 1, borderRadius: 8, borderWidth: 1, borderColor: '#2A4060', backgroundColor: '#0F2137', padding: 8, alignItems: 'center' },
  ouiNonText: { color: '#607D8B', fontWeight: 'bold' },
  initBox: { backgroundColor: '#1A2F4A', borderRadius: 10, padding: 12, marginTop: 10, borderWidth: 1, borderColor: '#E87722' },
  initTitle: { color: '#E87722', fontWeight: 'bold', fontSize: 12 },
  initBtn: { backgroundColor: '#E87722', borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 10 },
  initBtnText: { color: '#0A1628', fontWeight: 'bold', fontSize: 12 },
  semBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#0F2137', borderWidth: 1, borderColor: '#2A4060' },
  semBtnActive: { borderColor: '#E87722', backgroundColor: '#1A2F4A' },
  semBtnText: { color: '#607D8B', fontWeight: 'bold' },
  detailCard: { backgroundColor: '#0F2137', borderRadius: 10, padding: 14, marginBottom: 8 },
  detailRow: { backgroundColor: '#0F2137', borderRadius: 8, padding: 10, marginBottom: 6, borderLeftWidth: 3, borderLeftColor: '#E87722' },
  detailLabel: { color: '#607D8B', fontSize: 11, marginBottom: 2 },
  detailValue: { color: '#FFFFFF', fontSize: 13 },
  collabCard: { backgroundColor: '#1A2F4A', borderRadius: 10, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: '#2A4060' },
  collabName: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13, marginBottom: 4 },
  selectItem: { backgroundColor: '#1A2F4A', borderRadius: 8, padding: 14, marginBottom: 6, borderWidth: 1, borderColor: '#2A4060', flexDirection: 'row', alignItems: 'center' },
  selectItemActive: { borderColor: '#E87722', backgroundColor: '#1E3A5F' },
  selectText: { color: '#B0BEC5', fontSize: 14, flex: 1 },
});
