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

const API       = API_URL.replace('/auth', '/pdvs/collab');
const API_USERS = API_URL.replace('/auth', '/users');

// ================================================================
// CONSTANTES
// ================================================================
const SEMESTRES = ['S1', 'S2'];

const CRITERES_FRAGILISE = [
  'Nouvelle recrue',
  'Resp. incident',
  'Coté M/I',
  'Remarques CPA',
  '+55 ans',
  '-',
];

const COTATIONS_SAMI = ['S', 'A', 'M', 'I'];

const COTATION_COLORS = {
  S: { bg: '#1A3A28', border: '#27AE60', text: '#82E0AA' },
  A: { bg: '#1A2F4A', border: '#3498DB', text: '#85C1E9' },
  M: { bg: '#3A2800', border: '#F39C12', text: '#FAD7A0' },
  I: { bg: '#3A0E0E', border: '#E74C3C', text: '#F1948A' },
};

const PROCEDURES = [
  { key: 'sp320',     label: 'SP320'       },
  { key: 's2b',       label: 'S2B'         },
  { key: 's9a',       label: 'S9A'         },
  { key: 's9b',       label: 'S9B'         },
  { key: 'cgS2c',     label: 'CG S2C'      },
  { key: 'consLoc',   label: 'Cons. loc.'  },
  { key: 'guides',    label: 'Guides'      },
  { key: 'refInterv', label: 'Réf. Interv.'},
  { key: 'refNormes', label: 'Réf. Normes' },
  { key: 'refSecCh',  label: 'Réf. Séc.Ch.'},
  { key: 'refTour',   label: 'Réf. Tour.'  },
  { key: 'inR3001',   label: 'IN R3 001'   },
];

const CSPR_SOUS_ENTITES = {
  'CT Voie': ['CDT 101V', 'CDT 102V', 'CDT OA OH OT'],
  'CT CSS':  ['CDT 101LC', 'CDT 101SST'],
};

const canEdit   = (role) => role === 'CSPR' || role === 'ADMIN';
const canView   = (role) => ['CSPR', 'CET', 'ADMIN', 'CGPX'].includes(role);
const isCGPX    = (role) => role === 'CGPX';

const EMPTY_FORM = {
  matricule: '', collaborateurNom: '', dt: '', fonction: '', entite: '',
  semestre: 'S1', annee: new Date().getFullYear(),
  critereFragilise: '-', lienRisqueMajeur: '',
  sp320: '', s2b: '', s9a: '', s9b: '', cgS2c: '',
  consLoc: '', guides: '', refInterv: '', refNormes: '',
  refSecCh: '', refTour: '', inR3001: '',
  cotationN2: '', ecartKn1: '', actions: '', bouclage: '',
};

// ================================================================
// COMPOSANT COTATION SAMI (bouton sélecteur)
// ================================================================
function CotationSelector({ value, onChange }) {
  return (
    <View style={ss.cotRow}>
      {COTATIONS_SAMI.map(c => {
        const col = COTATION_COLORS[c];
        const active = value === c;
        return (
          <TouchableOpacity
            key={c}
            style={[ss.cotBtn,
              { borderColor: col.border },
              active && { backgroundColor: col.bg }]}
            onPress={() => onChange(active ? '' : c)}>
            <Text style={[ss.cotBtnText,
              { color: active ? col.text : col.border }]}>{c}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ================================================================
// COMPOSANT BADGE COTATION
// ================================================================
function CotationBadge({ value }) {
  if (!value) return <Text style={ss.badgeEmpty}>—</Text>;
  const col = COTATION_COLORS[value] || {};
  return (
    <View style={[ss.badge, { backgroundColor: col.bg, borderColor: col.border }]}>
      <Text style={[ss.badgeText, { color: col.text }]}>{value}</Text>
    </View>
  );
}

// ================================================================
// ÉCRAN PRINCIPAL
// ================================================================
export default function PdvsCollabScreen({ navigation }) {
  const [step, setStep]           = useState(0); // 0=période, 1=tableau
  const [selectedSemestre, setSelectedSemestre] = useState('S1');
  const [selectedAnnee, setSelectedAnnee]       = useState(new Date().getFullYear());
  const [annees, setAnnees]       = useState([new Date().getFullYear()]);
  const [data, setData]           = useState([]);
  const [loading, setLoading]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [generating, setGenerating] = useState(false);
  const [userRole, setUserRole]   = useState('');
  const [userEntite, setUserEntite] = useState('');
  const [editing, setEditing]     = useState(null);
  const [form, setForm]           = useState({ ...EMPTY_FORM });
  const [collaborateurs, setCollaborateurs] = useState([]);
  const [collabSearch, setCollabSearch]     = useState('');
  const [selectedCollab, setSelectedCollab] = useState(null);

  // Un seul Modal — null | 'form' | 'picker' | 'critere'
  const [modalView, setModalView] = useState(null);

  const getToken = async () => await AsyncStorage.getItem('token');

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
      const [annRes, collabRes] = await Promise.allSettled([
        axios.get(`${API}/annees`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_USERS}/by-entite`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (annRes.status === 'fulfilled' && annRes.value.data.length > 0)
        setAnnees(annRes.value.data);
      if (collabRes.status === 'fulfilled')
        setCollaborateurs(collabRes.value.data);
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
    setSelectedCollab(null);
    setCollabSearch('');
    // Déterminer l'entité par défaut selon le rôle
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
    setSelectedCollab(null);
    setForm({
      matricule:        item.matricule || '',
      collaborateurNom: item.collaborateurNom || '',
      dt:               item.dt || '',
      fonction:         item.fonction || '',
      entite:           item.entite || '',
      semestre:         item.semestre,
      annee:            item.annee,
      critereFragilise: item.critereFragilise || '-',
      lienRisqueMajeur: item.lienRisqueMajeur || '',
      sp320:            item.sp320 || '',
      s2b:              item.s2b || '',
      s9a:              item.s9a || '',
      s9b:              item.s9b || '',
      cgS2c:            item.cgS2c || '',
      consLoc:          item.consLoc || '',
      guides:           item.guides || '',
      refInterv:        item.refInterv || '',
      refNormes:        item.refNormes || '',
      refSecCh:         item.refSecCh || '',
      refTour:          item.refTour || '',
      inR3001:          item.inR3001 || '',
      cotationN2:       item.cotationN2 || '',
      ecartKn1:         item.ecartKn1 || '',
      actions:          item.actions || '',
      bouclage:         item.bouclage || '',
    });
    setModalView('form');
  };

  const selectCollab = (collab) => {
    setSelectedCollab(collab);
    setForm(prev => ({
      ...prev,
      matricule:        collab.matricule || '',
      collaborateurNom: collab.fullName  || '',
      dt:               collab.entite    || '',
      fonction:         collab.fonctionAssuree || '',
      entite:           collab.entite    || prev.entite,
    }));
    setCollabSearch('');
    setModalView('form');
  };

  const closeModal = () => {
    setModalView(null);
    setCollabSearch('');
  };

  const setF = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    if (!editing && !selectedCollab) {
      Alert.alert('Incomplet', 'Veuillez choisir un collaborateur');
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
    Alert.alert('Supprimer',
      `Supprimer la ligne de ${item.collaborateurNom} ?`,
      [
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

  // ── filtrer collaborateurs selon rôle et hiérarchie ──
  // CSPR → ses sous-entités | CGPX → son entité exacte | CET/ADMIN → tous
  const collabsFiltres = collaborateurs.filter(c => {
    const q = collabSearch.toLowerCase();
    const matchSearch = !q ||
      (c.fullName  || '').toLowerCase().includes(q) ||
      (c.matricule || '').toLowerCase().includes(q);
    let matchEntite = true;
    if (userRole === 'CSPR') {
      const sousEntites = CSPR_SOUS_ENTITES[userEntite] || [];
      matchEntite = sousEntites.includes(c.entite);
    } else if (userRole === 'CGPX') {
      matchEntite = c.entite === userEntite;
    }
    // CET et ADMIN voient tous
    return matchSearch && matchEntite;
  });

  // ── calcul cotation globale automatique ──
  const calculCotationAuto = () => {
    const vals = PROCEDURES.map(p => form[p.key]).filter(Boolean);
    if (vals.length === 0) return '';
    if (vals.includes('I')) return 'I';
    if (vals.includes('M')) return 'M';
    if (vals.includes('A')) return 'A';
    return 'S';
  };

  // ── Export PDF ──
  const generatePDF = async () => {
    setGenerating(true);
    try {
      const rows = data.map((d, i) => {
        const procs = PROCEDURES.map(p => {
          const v = d[p.key] || '';
          const col = v ? COTATION_COLORS[v] : null;
          const bg = col ? col.bg.replace('#', '') : 'ffffff';
          const txt = col ? col.text.replace('#', '') : '607D8B';
          return `<td style="text-align:center;background:#${bg};color:#${txt};font-weight:bold">${v || '—'}</td>`;
        }).join('');
        const cN2 = d.cotationN2 || '';
        const col2 = cN2 ? COTATION_COLORS[cN2] : null;
        const bg2 = col2 ? col2.bg.replace('#', '') : 'f8f9fa';
        const txt2 = col2 ? col2.text.replace('#', '') : '333';
        return `<tr style="background:${i%2===0?'#fff':'#f8f9fa'}">
          <td>${i+1}</td>
          <td><b>${d.collaborateurNom}</b></td>
          <td>${d.matricule}</td>
          <td>${d.dt || ''}</td>
          <td>${d.fonction || ''}</td>
          <td style="color:#E74C3C;font-weight:bold">${d.critereFragilise || '-'}</td>
          <td style="font-size:7px">${d.lienRisqueMajeur || ''}</td>
          ${procs}
          <td style="text-align:center;background:#${bg2};color:#${txt2};font-weight:bold">${cN2 || '—'}</td>
          <td style="font-size:7px">${d.ecartKn1 || ''}</td>
          <td style="font-size:7px">${d.actions || ''}</td>
          <td style="font-size:7px">${d.bouclage || ''}</td>
        </tr>`;
      }).join('');

      const procHeaders = PROCEDURES.map(p =>
        `<th>${p.label}</th>`).join('');

      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
* { margin:0;padding:0;box-sizing:border-box; }
body { font-family:Arial,sans-serif;font-size:7px;padding:8px; }
@page { size:A4 landscape;margin:5mm; }
h2 { font-size:11px;color:#0A1628;margin-bottom:2px; }
p { font-size:8px;color:#607D8B;margin-bottom:5px; }
table { width:100%;border-collapse:collapse; }
th { background:#0A1628;color:#fff;padding:3px 2px;font-size:7px;border:1px solid #ccc;white-space:nowrap; }
td { font-size:7px;padding:2px;border:1px solid #ddd;vertical-align:top; }
</style></head><body>
<h2>PDVS N2 – Collab/Proc – CT Voie – ${selectedSemestre} ${selectedAnnee}</h2>
<p>${data.length} collaborateur(s) • Généré le ${new Date().toLocaleDateString('fr-FR')}</p>
<table><thead><tr>
  <th>N°</th><th>Collaborateur</th><th>Mat.</th><th>DT</th><th>Fonc.</th>
  <th>Critère fragilisé</th><th>Lien risque</th>
  ${procHeaders}
  <th>Cot.N2</th><th>Écart/KN1</th><th>Actions</th><th>Bouclage</th>
</tr></thead><tbody>${rows}</tbody></table>
</body></html>`;

      const { uri } = await Print.printToFileAsync({ html, base64: false, width: 842, height: 595 });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `PDVS N2 Collab — ${selectedSemestre} ${selectedAnnee}`,
        UTI: 'com.adobe.pdf',
      });
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
          <Text style={s.headerTitle}>📋 PDVS N2 — Collab/Proc</Text>
          <Text style={s.headerSub}>Plan de Veille Sécurité Niveau 2</Text>
        </View>

        {loading
          ? <ActivityIndicator color="#C9A84C" style={{ marginTop: 40 }} />
          : (
          <ScrollView style={s.list}>
            {/* Semestre */}
            <Text style={s.sectionLabel}>Semestre</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
              {SEMESTRES.map(sem => (
                <TouchableOpacity key={sem}
                  style={[s.bigChip, selectedSemestre === sem && s.bigChipActive]}
                  onPress={() => setSelectedSemestre(sem)}>
                  <Text style={[s.bigChipText,
                    selectedSemestre === sem && s.bigChipTextActive]}>
                    {sem}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Année */}
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

            {/* Info entité */}
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
              PDVS N2 — {selectedSemestre} {selectedAnnee}
            </Text>
            <Text style={s.headerSub}>
              {data.length} collaborateur(s) · {userEntite}
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

      {/* Bandeau lecture seule pour CGPX */}
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
              <Text style={s.emptyIcon}>📋</Text>
              <Text style={s.emptyText}>Aucune entrée pour cette période</Text>
              {canEdit(userRole) && (
                <Text style={s.emptySub}>
                  Appuyez sur "+ Ajouter" pour saisir le PDVS
                </Text>
              )}
              {isCGPX(userRole) && (
                <Text style={s.emptySub}>
                  Le CSPR de votre entité n'a pas encore saisi les données
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
                      <Text style={s.cardNum}>{idx + 1}</Text>
                      <View>
                        <Text style={s.cardName}>{item.collaborateurNom}</Text>
                        <Text style={s.cardSub}>
                          {item.matricule} · {item.dt} · {item.fonction}
                        </Text>
                      </View>
                    </View>
                    {/* Fragilité */}
                    {item.critereFragilise && item.critereFragilise !== '-' && (
                      <View style={s.fragiliteTag}>
                        <Text style={s.fragiliteText}>
                          ⚠️ {item.critereFragilise}
                        </Text>
                      </View>
                    )}
                    {item.lienRisqueMajeur ? (
                      <Text style={s.lienRisque}>🔗 {item.lienRisqueMajeur}</Text>
                    ) : null}
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <CotationBadge value={item.cotationN2} />
                    {canEdit(userRole) && (
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <TouchableOpacity style={s.editBtn}
                          onPress={() => openEdit(item)}>
                          <Text style={s.editBtnText}>✏️</Text>
                        </TouchableOpacity>
                        {userRole === 'ADMIN' && (
                          <TouchableOpacity style={s.deleteBtn}
                            onPress={() => handleDelete(item)}>
                            <Text style={s.deleteBtnText}>🗑</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                </View>

                {/* Grille procédures */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: 4, marginTop: 8 }}>
                    {PROCEDURES.map(p => (
                      <View key={p.key} style={s.procCell}>
                        <Text style={s.procLabel}>{p.label}</Text>
                        <CotationBadge value={item[p.key]} />
                      </View>
                    ))}
                  </View>
                </ScrollView>

                {/* Suivi */}
                {item.actions ? (
                  <Text style={s.detailText}>📌 {item.actions}</Text>
                ) : null}
                {item.bouclage ? (
                  <Text style={s.detailText}>✅ {item.bouclage}</Text>
                ) : null}
                {item.ecartKn1 ? (
                  <Text style={s.detailText}>↕️ Écart KN1 : {item.ecartKn1}</Text>
                ) : null}
              </View>
            ))
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ================================================================
          UN SEUL MODAL — null | 'form' | 'picker' | 'critere'
      ================================================================ */}
      <Modal
        visible={modalView !== null}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => {
          if (modalView === 'picker' || modalView === 'critere')
            setModalView('form');
          else closeModal();
        }}>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}>
          <View style={s.modalOverlay}>

            {/* ══ PICKER COLLABORATEUR ══ */}
            {modalView === 'picker' && (
              <View style={[s.modalBox, { maxHeight: '80%' }]}>
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>👥 Choisir un collaborateur</Text>
                  <TouchableOpacity onPress={() => {
                    setCollabSearch('');
                    setModalView('form');
                  }}>
                    <Text style={s.closeBtn}>✕</Text>
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={[s.input, { marginBottom: 10 }]}
                  value={collabSearch}
                  onChangeText={setCollabSearch}
                  placeholder="Rechercher nom ou matricule…"
                  placeholderTextColor="#607D8B"
                  autoFocus
                />

                <ScrollView showsVerticalScrollIndicator={false}>
                  {collabsFiltres.length === 0 ? (
                    <Text style={{ color: '#607D8B', textAlign: 'center', padding: 20 }}>
                      Aucun collaborateur trouvé
                    </Text>
                  ) : (
                    collabsFiltres.map(c => (
                      <TouchableOpacity
                        key={c.id}
                        style={s.collabItem}
                        onPress={() => selectCollab(c)}>
                        <View style={{ flex: 1 }}>
                          <Text style={s.collabItemName}>{c.fullName}</Text>
                          <Text style={s.collabItemSub}>
                            {c.matricule}
                            {c.fonctionAssuree ? ` · ${c.fonctionAssuree}` : ''}
                            {c.entite ? ` · ${c.entite}` : ''}
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

            {/* ══ PICKER CRITÈRE FRAGILISÉ ══ */}
            {modalView === 'critere' && (
              <View style={[s.modalBox, { maxHeight: '60%' }]}>
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>⚠️ Critère fragilisé</Text>
                  <TouchableOpacity onPress={() => setModalView('form')}>
                    <Text style={s.closeBtn}>✕</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView>
                  {CRITERES_FRAGILISE.map(c => (
                    <TouchableOpacity
                      key={c}
                      style={[s.critereItem,
                        form.critereFragilise === c && s.critereItemActive]}
                      onPress={() => {
                        setF('critereFragilise', c);
                        setModalView('form');
                      }}>
                      <Text style={[s.critereText,
                        form.critereFragilise === c && s.critereTextActive]}>
                        {c === '-' ? '— Aucun' : c}
                      </Text>
                      {form.critereFragilise === c && (
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
                      {editing ? '✏️ Modifier' : '➕ Nouveau'}
                    </Text>
                    <TouchableOpacity onPress={closeModal}>
                      <Text style={s.closeBtn}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  {/* ── Identification ── */}
                  <Text style={s.sectionTitle}>Collaborateur</Text>

                  {!editing ? (
                    <TouchableOpacity
                      style={[s.collabPickerBtn,
                        selectedCollab && s.collabPickerBtnFilled]}
                      onPress={() => setModalView('picker')}>
                      {selectedCollab ? (
                        <View style={{ flex: 1 }}>
                          <Text style={s.collabPickerName}>
                            {selectedCollab.fullName}
                          </Text>
                          <Text style={s.collabPickerSub}>
                            {selectedCollab.matricule}
                            {selectedCollab.entite ? ` · ${selectedCollab.entite}` : ''}
                          </Text>
                        </View>
                      ) : (
                        <Text style={s.collabPickerPlaceholder}>
                          Appuyer pour choisir un collaborateur…
                        </Text>
                      )}
                      <Text style={{ color: '#C9A84C', fontSize: 18 }}>›</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={s.collabReadonly}>
                      <Text style={s.collabPickerName}>{form.collaborateurNom}</Text>
                      <Text style={s.collabPickerSub}>
                        {form.matricule} · {form.dt} · {form.fonction}
                      </Text>
                    </View>
                  )}

                  {/* ── Fragilité ── */}
                  <Text style={s.sectionTitle}>Fragilité</Text>

                  <Text style={s.fieldLabel}>Critère fragilisé</Text>
                  <TouchableOpacity
                    style={[s.collabPickerBtn,
                      form.critereFragilise !== '-' && s.collabPickerBtnFilled]}
                    onPress={() => setModalView('critere')}>
                    <Text style={[s.collabPickerName,
                      { color: form.critereFragilise === '-' ? '#607D8B' : '#FAD7A0' }]}>
                      {form.critereFragilise === '-' ? 'Aucun critère' : form.critereFragilise}
                    </Text>
                    <Text style={{ color: '#C9A84C', fontSize: 18 }}>›</Text>
                  </TouchableOpacity>

                  <Text style={s.fieldLabel}>Lien risque majeur</Text>
                  <TextInput style={s.input}
                    value={form.lienRisqueMajeur}
                    onChangeText={v => setF('lienRisqueMajeur', v)}
                    placeholder="Ex : RI-01 Géométrie voie"
                    placeholderTextColor="#607D8B" />

                  {/* ── Procédures ── */}
                  <Text style={s.sectionTitle}>Procédures vérifiées — Cotation S/A/M/I</Text>

                  {PROCEDURES.map(p => (
                    <View key={p.key} style={{ marginBottom: 10 }}>
                      <Text style={s.fieldLabel}>{p.label}</Text>
                      <CotationSelector
                        value={form[p.key]}
                        onChange={v => setF(p.key, v)}
                      />
                    </View>
                  ))}

                  {/* ── Évaluation ── */}
                  <Text style={s.sectionTitle}>Évaluation globale</Text>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.fieldLabel}>Cotation N2</Text>
                      <CotationSelector
                        value={form.cotationN2}
                        onChange={v => setF('cotationN2', v)}
                      />
                    </View>
                    <TouchableOpacity
                      style={s.autoBtn}
                      onPress={() => setF('cotationN2', calculCotationAuto())}>
                      <Text style={s.autoBtnText}>Auto</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={s.fieldLabel}>Écart / KN1</Text>
                  <TextInput style={s.input}
                    value={form.ecartKn1}
                    onChangeText={v => setF('ecartKn1', v)}
                    placeholder="Ex : Baisse sur S9B"
                    placeholderTextColor="#607D8B" />

                  {/* ── Suivi ── */}
                  <Text style={s.sectionTitle}>Suivi</Text>

                  <Text style={s.fieldLabel}>Actions</Text>
                  <TextInput
                    style={[s.input, { height: 70, textAlignVertical: 'top' }]}
                    value={form.actions}
                    onChangeText={v => setF('actions', v)}
                    multiline
                    placeholder="Actions à réaliser…"
                    placeholderTextColor="#607D8B" />

                  <Text style={s.fieldLabel}>Bouclage</Text>
                  <TextInput style={s.input}
                    value={form.bouclage}
                    onChangeText={v => setF('bouclage', v)}
                    placeholder="Statut bouclage…"
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
  addBtn: { backgroundColor: '#C9A84C', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  addBtnText: { color: '#0A1628', fontWeight: 'bold', fontSize: 12 },
  pdfBtn: {
    backgroundColor: '#1E3A5F', borderRadius: 8, paddingHorizontal: 12,
    paddingVertical: 8, borderWidth: 1, borderColor: '#C9A84C',
  },
  pdfBtnText: { color: '#C9A84C', fontWeight: 'bold', fontSize: 12 },
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  emptySub: { color: '#607D8B', fontSize: 12, marginTop: 6 },

  card: { backgroundColor: '#0F2137', borderRadius: 12, padding: 14, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  cardNum: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#1E3A5F', color: '#C9A84C',
    textAlign: 'center', lineHeight: 24, fontWeight: 'bold', fontSize: 11,
  },
  cardName: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold' },
  cardSub: { color: '#607D8B', fontSize: 10, marginTop: 2 },
  fragiliteTag: {
    marginTop: 6, alignSelf: 'flex-start',
    backgroundColor: '#3A0E0E', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: '#E74C3C',
  },
  fragiliteText: { color: '#F1948A', fontSize: 10, fontWeight: 'bold' },
  lienRisque: { color: '#85C1E9', fontSize: 10, marginTop: 4 },
  procCell: { alignItems: 'center', minWidth: 60 },
  procLabel: { color: '#607D8B', fontSize: 9, marginBottom: 4, textAlign: 'center' },
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

  // Badges & cotations
  badge: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  badgeText: { fontWeight: 'bold', fontSize: 14 },
  badgeEmpty: { color: '#2A4060', fontSize: 14 },
  cotRow: { flexDirection: 'row', gap: 8 },
  cotBtn: {
    width: 38, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, backgroundColor: 'transparent',
  },
  cotBtnText: { fontWeight: 'bold', fontSize: 14 },

  // Bouton auto
  autoBtn: {
    backgroundColor: '#1E3A5F', borderRadius: 8, padding: 8,
    borderWidth: 1, borderColor: '#C9A84C', marginTop: 20,
  },
  autoBtnText: { color: '#C9A84C', fontSize: 11, fontWeight: 'bold' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: '#00000090', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: '#0F2137', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: '93%',
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
  fieldLabel: { color: '#B0BEC5', fontSize: 12, marginBottom: 6, marginTop: 8 },
  input: {
    backgroundColor: '#1A2F4A', borderWidth: 1, borderColor: '#2A4060',
    borderRadius: 8, padding: 10, color: '#FFFFFF', fontSize: 13,
  },

  // Collab picker
  collabPickerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#1A2F4A', borderWidth: 1, borderColor: '#2A4060',
    borderRadius: 8, padding: 12, marginBottom: 4,
  },
  collabPickerBtnFilled: { borderColor: '#C9A84C' },
  collabPickerName: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  collabPickerSub: { color: '#607D8B', fontSize: 11, marginTop: 2 },
  collabPickerPlaceholder: { color: '#607D8B', fontSize: 13, flex: 1 },
  collabReadonly: {
    backgroundColor: '#1A2F4A', borderRadius: 8, padding: 12,
    borderLeftWidth: 3, borderLeftColor: '#C9A84C', marginBottom: 4,
  },
  collabItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1A2F4A', borderRadius: 8, padding: 12, marginBottom: 6,
  },
  collabItemName: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold' },
  collabItemSub: { color: '#607D8B', fontSize: 11, marginTop: 2 },

  // Critère
  critereItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#1A2F4A', borderRadius: 8, padding: 14, marginBottom: 6,
    borderWidth: 1, borderColor: '#2A4060',
  },
  critereItemActive: { borderColor: '#C9A84C', backgroundColor: '#1E3A5F' },
  critereText: { color: '#B0BEC5', fontSize: 13 },
  critereTextActive: { color: '#C9A84C', fontWeight: 'bold' },

  // Boutons modal
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

  // Bandeau lecture seule CGPX
  readOnlyBanner: {
    backgroundColor: '#1A2F4A', marginHorizontal: 14, marginBottom: 8,
    borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#4A90D9',
    flexDirection: 'row', alignItems: 'center',
  },
  readOnlyText: { color: '#85C1E9', fontSize: 12, fontWeight: '600' },
});

const ss = StyleSheet.create({
  cotRow: { flexDirection: 'row', gap: 8 },
  cotBtn: {
    width: 38, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, backgroundColor: 'transparent',
  },
  cotBtnText: { fontWeight: 'bold', fontSize: 14 },
  badge: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  badgeText: { fontWeight: 'bold', fontSize: 14 },
  badgeEmpty: { color: '#2A4060', fontSize: 14 },
});
