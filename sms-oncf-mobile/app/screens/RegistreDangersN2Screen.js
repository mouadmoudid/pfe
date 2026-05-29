import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert, Modal, TextInput, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../services/authService';
import { generateAndSharePDF } from '../utils/pdfUtils';

const RISQUE_API = API_URL.replace('/auth', '/risques');
const USERS_API  = API_URL.replace('/auth', '/admin/users');

const canEdit      = (role) => ['ADMIN', 'CGPX', 'CSPR', 'CET'].includes(role);
const canExportPDF = (role) => ['ADMIN', 'CSPR', 'CET'].includes(role);

const CRITICITE_CONFIG = {
  C: { label: 'Critique', color: '#E74C3C', bg: '#E74C3C20', border: '#E74C3C' },
  E: { label: 'Élevé',    color: '#E67E22', bg: '#E67E2220', border: '#E67E22' },
  M: { label: 'Modéré',   color: '#F1C40F', bg: '#F1C40F20', border: '#F1C40F' },
  F: { label: 'Faible',   color: '#27AE60', bg: '#27AE6020', border: '#27AE60' },
};

const EMPTY_N2 = {
  codeTaxo: '',
  barrieresPrevention: '',
  barrieresProtection: '',
  planAction: '',
  responsableNom: '',
  responsableId: null,
};

export default function RegistreDangersN2Screen({ navigation }) {
  const [risques, setRisques]           = useState([]);
  const [filtered, setFiltered]         = useState([]);
  const [users, setUsers]               = useState([]);
  const [loading, setLoading]           = useState(false);
  const [saving, setSaving]             = useState(false);
  const [generating, setGenerating]     = useState(false);
  const [userRole, setUserRole]         = useState('');
  const [userEntite, setUserEntite]     = useState('');
  const [search, setSearch]             = useState('');
  const [filterCriticite, setFilterCriticite] = useState('ALL');
  const [editingRisque, setEditingRisque] = useState(null); // risque being edited
  const [n2Form, setN2Form]             = useState({ ...EMPTY_N2 });
  const [showRespPicker, setShowRespPicker] = useState(false);

  const getToken = async () => await AsyncStorage.getItem('token');

  useEffect(() => { loadInitial(); }, []);
  useEffect(() => { applyFilters(); }, [risques, search, filterCriticite]);

  const loadInitial = async () => {
    setLoading(true);
    try {
      const userData = await AsyncStorage.getItem('user');
      const user = userData ? JSON.parse(userData) : {};
      setUserRole(user.role || '');
      setUserEntite(user.entite || '');
      const token = await getToken();
      const [risquesRes, usersRes] = await Promise.all([
        axios.get(RISQUE_API, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(USERS_API,  { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setRisques(risquesRes.data);
      setUsers(usersRes.data);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger les données');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let data = [...risques];
    if (filterCriticite !== 'ALL') data = data.filter(r => r.criticite === filterCriticite);
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(r =>
        r.danger?.toLowerCase().includes(q) ||
        r.risque?.toLowerCase().includes(q) ||
        r.facteur?.toLowerCase().includes(q) ||
        r.codeTaxo?.toLowerCase().includes(q)
      );
    }
    setFiltered(data);
  };

  const openEdit = (r) => {
    setEditingRisque(r);
    setN2Form({
      codeTaxo:            r.codeTaxo || '',
      barrieresPrevention: r.barrieresPrevention || '',
      barrieresProtection: r.barrieresProtection || '',
      planAction:          r.planAction || '',
      responsableNom:      r.responsableNom || '',
      responsableId:       r.responsableId || null,
    });
  };

  const closeEdit = () => setEditingRisque(null);

  const handleSave = async () => {
    if (!editingRisque) return;
    setSaving(true);
    try {
      const token = await getToken();
      await axios.patch(
        `${RISQUE_API}/${editingRisque.id}/n2`,
        n2Form,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEditingRisque(null);
      loadInitial();
    } catch {
      Alert.alert('Erreur', 'Impossible de sauvegarder');
    } finally {
      setSaving(false);
    }
  };

  const counts = { C: 0, E: 0, M: 0, F: 0 };
  filtered.forEach(r => { if (counts[r.criticite] !== undefined) counts[r.criticite]++; });

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const critColor = { C: '#E74C3C', E: '#E67E22', M: '#F1C40F', F: '#27AE60' };
      const critLabel = { C: 'Critique', E: 'Élevé', M: 'Modéré', F: 'Faible' };

      const rows = filtered.map((r, i) => {
        const bg = i % 2 === 0 ? '#fff' : '#f5f5f5';
        const cc = critColor[r.criticite] || '#999';
        const cl = critLabel[r.criticite] || r.criticite || '';
        const td = (val, extra = '') =>
          `<td style="font-size:8px;padding:4px 5px;border:1px solid #ddd;vertical-align:top;${extra}">${val || ''}</td>`;
        return `<tr style="background:${bg}">
          ${td(r.codeTaxo)}
          ${td(r.lieu)}
          ${td(r.facteur)}
          ${td(`<strong>${r.danger || ''}</strong>`)}
          ${td(r.frequence ?? '', 'text-align:center;')}
          ${td(r.gravite ?? '', 'text-align:center;')}
          <td style="font-size:8px;padding:4px 5px;border:1px solid #ddd;text-align:center;vertical-align:top;">
            <span style="background:${cc};color:${r.criticite === 'M' ? '#333' : '#fff'};
              padding:2px 6px;border-radius:3px;font-weight:bold;font-size:8px;">${cl}</span>
          </td>
          ${td(r.barrieresPrevention)}
          ${td(r.barrieresProtection)}
          ${td(r.planAction)}
          ${td(r.responsableNom)}
        </tr>`;
      }).join('');

      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: Arial, sans-serif; font-size: 8px; padding: 8px; }
@page { size: A4 landscape; margin: 6mm; }
table { width: 100%; border-collapse: collapse; }
th {
  background: #0A1628; color: white; padding: 5px 4px;
  font-size: 8px; text-align: left; border: 1px solid #333;
}
</style>
</head><body>

<div style="background:#0A1628;color:white;padding:8px 14px;border-radius:4px;
  margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
  <div>
    <div style="font-size:15px;font-weight:bold;color:#C9A84C;letter-spacing:2px;">ONCF</div>
    <div style="font-size:8px;">PIC/DRIC · Arrondissement MI LGV · DT 102V LGV</div>
    ${userEntite ? `<div style="font-size:8px;color:#9B59B6;margin-top:2px;">${userEntite}</div>` : ''}
  </div>
  <div style="text-align:right;">
    <div style="font-weight:bold;font-size:13px;">Registre des Dangers N2</div>
    <div style="font-size:8px;color:#C9A84C;">
      ${filtered.length} risque(s) · Généré le ${new Date().toLocaleDateString('fr-FR')}
    </div>
  </div>
</div>

<div style="display:flex;gap:6px;margin-bottom:8px;">
  <div style="background:#E74C3C;color:white;padding:3px 8px;border-radius:3px;font-size:8px;font-weight:bold;">Critique : ${counts.C}</div>
  <div style="background:#E67E22;color:white;padding:3px 8px;border-radius:3px;font-size:8px;font-weight:bold;">Élevé : ${counts.E}</div>
  <div style="background:#F1C40F;color:#333;padding:3px 8px;border-radius:3px;font-size:8px;font-weight:bold;">Modéré : ${counts.M}</div>
  <div style="background:#27AE60;color:white;padding:3px 8px;border-radius:3px;font-size:8px;font-weight:bold;">Faible : ${counts.F}</div>
</div>

<table>
  <thead>
    <tr>
      <th style="width:7%">Code Taxo.</th>
      <th style="width:7%">Lieu/Secteur</th>
      <th style="width:9%">Facteur</th>
      <th style="width:13%">Danger</th>
      <th style="width:4%">Fréq.</th>
      <th style="width:4%">Gravité</th>
      <th style="width:6%">Criticité</th>
      <th style="width:14%">Barrières prévention</th>
      <th style="width:14%">Barrières protection</th>
      <th style="width:14%">Plan d'action</th>
      <th style="width:8%">Resp.</th>
    </tr>
  </thead>
  <tbody>
    ${rows || '<tr><td colspan="11" style="text-align:center;padding:20px;color:#999;">Aucun risque N2 enregistré</td></tr>'}
  </tbody>
</table>

<div style="margin-top:8px;font-size:7px;color:#607D8B;">
  Criticité = Fréquence × Gravité ·
  C (≥8) : Critique · E (≥4) : Élevé · M (≥2) : Modéré · F (1) : Faible ·
  Établi par le responsable N2
</div>
</body></html>`;

      await generateAndSharePDF(html, { dialogTitle: 'Registre des Dangers N2' });
    } catch {
      Alert.alert('Erreur', 'Impossible de générer le PDF');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>⚠️ Registre des Dangers N2</Text>
            <Text style={styles.headerSub}>
              {filtered.length} risque(s){userEntite ? ` · ${userEntite}` : ''}
            </Text>
          </View>
          {canExportPDF(userRole) && (
            <TouchableOpacity
              style={[styles.pdfBtn, generating && { opacity: 0.6 }]}
              onPress={generatePDF}
              disabled={generating}
            >
              {generating
                ? <ActivityIndicator color="#0A1628" size="small" />
                : <Text style={styles.pdfBtnText}>📄 PDF</Text>
              }
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* FILTRES CRITICITÉ */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.countersScroll}>
        {[
          { key: 'ALL', label: 'Tous',     count: filtered.length, color: '#9B59B6', bg: '#9B59B620' },
          { key: 'C',   label: 'Critique', count: counts.C, color: '#E74C3C', bg: '#E74C3C20' },
          { key: 'E',   label: 'Élevé',    count: counts.E, color: '#E67E22', bg: '#E67E2220' },
          { key: 'M',   label: 'Modéré',   count: counts.M, color: '#F1C40F', bg: '#F1C40F20' },
          { key: 'F',   label: 'Faible',   count: counts.F, color: '#27AE60', bg: '#27AE6020' },
        ].map(item => (
          <TouchableOpacity
            key={item.key}
            style={[styles.counterChip, {
              backgroundColor: filterCriticite === item.key ? item.color : item.bg,
              borderColor: item.color,
            }]}
            onPress={() => setFilterCriticite(item.key)}
          >
            <Text style={[styles.counterCount, { color: filterCriticite === item.key ? '#fff' : item.color }]}>
              {item.count}
            </Text>
            <Text style={[styles.counterLabel, { color: filterCriticite === item.key ? '#fff' : item.color }]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* RECHERCHE */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Rechercher danger, risque, facteur, code taxo..."
          placeholderTextColor="#607D8B"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* LISTE */}
      {loading
        ? <ActivityIndicator color="#9B59B6" style={{ marginTop: 40 }} />
        : (
          <ScrollView style={styles.list}>
            {filtered.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyIcon}>⚠️</Text>
                <Text style={styles.emptyText}>Aucun risque trouvé</Text>
                <Text style={styles.emptySubText}>
                  Les risques sont ajoutés depuis la Cartographie des Risques
                </Text>
              </View>
            ) : (
              filtered.map(r => {
                const crit = CRITICITE_CONFIG[r.criticite] || CRITICITE_CONFIG.F;
                const hasN2 = r.codeTaxo || r.barrieresPrevention || r.barrieresProtection
                           || r.planAction || r.responsableNom;
                return (
                  <View key={r.id} style={[styles.risqueCard, { borderLeftColor: crit.color }]}>

                    {/* En-tête */}
                    <View style={styles.cardHeader}>
                      <View style={styles.cardHeaderLeft}>
                        <View style={[styles.critBadge, { backgroundColor: crit.bg, borderColor: crit.border }]}>
                          <Text style={[styles.critBadgeText, { color: crit.color }]}>{crit.label}</Text>
                        </View>
                        <Text style={styles.facteurText}>{r.facteur}</Text>
                        {r.codeTaxo ? (
                          <View style={styles.taxoBadge}>
                            <Text style={styles.taxoText}>🏷 {r.codeTaxo}</Text>
                          </View>
                        ) : null}
                      </View>
                      <View style={styles.scoreBox}>
                        <Text style={styles.scoreLabel}>F×G</Text>
                        <Text style={[styles.scoreValue, { color: crit.color }]}>
                          {r.frequence}×{r.gravite}={r.frequence * r.gravite}
                        </Text>
                      </View>
                    </View>

                    {/* Danger */}
                    <Text style={styles.dangerText}>{r.danger}</Text>

                    {/* Risque */}
                    <View style={styles.risqueRow}>
                      <Text style={styles.risqueLabel}>Risque :</Text>
                      <Text style={styles.risqueText}>{r.risque}</Text>
                    </View>

                    {/* Barrières */}
                    {(r.barrieresPrevention || r.barrieresProtection) ? (
                      <View style={{ gap: 4, marginBottom: 8 }}>
                        {r.barrieresPrevention ? (
                          <View style={[styles.barriereBox, { borderLeftColor: '#4A90D9' }]}>
                            <Text style={[styles.barriereLabel, { color: '#4A90D9' }]}>🛡 Prévention</Text>
                            <Text style={styles.barriereText}>{r.barrieresPrevention}</Text>
                          </View>
                        ) : null}
                        {r.barrieresProtection ? (
                          <View style={[styles.barriereBox, { borderLeftColor: '#E67E22' }]}>
                            <Text style={[styles.barriereLabel, { color: '#E67E22' }]}>🔒 Protection</Text>
                            <Text style={styles.barriereText}>{r.barrieresProtection}</Text>
                          </View>
                        ) : null}
                      </View>
                    ) : null}

                    {/* Plan d'action */}
                    {r.planAction ? (
                      <View style={styles.planBox}>
                        <Text style={styles.planLabel}>📋 Plan d'action</Text>
                        <Text style={styles.planText}>{r.planAction}</Text>
                      </View>
                    ) : null}

                    {/* Responsable */}
                    {r.responsableNom ? (
                      <View style={styles.respInline}>
                        <Text style={styles.respInlineLabel}>Responsable : </Text>
                        <Text style={styles.respInlineName}>👤 {r.responsableNom}</Text>
                      </View>
                    ) : null}

                    {/* Bouton édition N2 */}
                    {canEdit(userRole) && (
                      <TouchableOpacity
                        style={[styles.n2EditBtn, hasN2 && styles.n2EditBtnFilled]}
                        onPress={() => openEdit(r)}
                      >
                        <Text style={[styles.n2EditBtnText, hasN2 && styles.n2EditBtnTextFilled]}>
                          {hasN2 ? '✏️ Modifier les champs N2' : '➕ Remplir les champs N2'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        )}

      {/* ===== MODAL ÉDITION CHAMPS N2 ===== */}
      <Modal
        visible={editingRisque !== null}
        transparent
        animationType="slide"
        onRequestClose={closeEdit}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <ScrollView showsVerticalScrollIndicator={false}>

              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>⚠️ Champs N2</Text>
                  <Text style={styles.modalSubtitle} numberOfLines={1}>
                    {editingRisque?.danger}
                  </Text>
                </View>
                <TouchableOpacity onPress={closeEdit}>
                  <Text style={{ color: '#607D8B', fontSize: 20 }}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Code Taxo */}
              <Text style={styles.fieldLabel}>🏷 Code Taxonomique</Text>
              <TextInput
                style={styles.input}
                value={n2Form.codeTaxo}
                onChangeText={v => setN2Form(p => ({ ...p, codeTaxo: v }))}
                placeholder="Ex: TAX-001"
                placeholderTextColor="#607D8B"
                autoCapitalize="characters"
              />

              {/* Barrières prévention */}
              <Text style={styles.fieldLabel}>🛡 Barrières de prévention</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                value={n2Form.barrieresPrevention}
                multiline
                onChangeText={v => setN2Form(p => ({ ...p, barrieresPrevention: v }))}
                placeholder="Mesures de prévention en place..."
                placeholderTextColor="#607D8B"
              />

              {/* Barrières protection */}
              <Text style={styles.fieldLabel}>🔒 Barrières de protection</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                value={n2Form.barrieresProtection}
                multiline
                onChangeText={v => setN2Form(p => ({ ...p, barrieresProtection: v }))}
                placeholder="Mesures de protection en place..."
                placeholderTextColor="#607D8B"
              />

              {/* Plan d'action */}
              <Text style={styles.fieldLabel}>📋 Plan d'action</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                value={n2Form.planAction}
                multiline
                onChangeText={v => setN2Form(p => ({ ...p, planAction: v }))}
                placeholder="Actions prévues pour réduire le risque..."
                placeholderTextColor="#607D8B"
              />

              {/* Responsable */}
              <Text style={styles.fieldLabel}>👤 Responsable</Text>
              <TouchableOpacity
                style={[styles.input, styles.respSelector]}
                onPress={() => setShowRespPicker(true)}
              >
                <Text style={n2Form.responsableNom ? styles.respSelectedText : styles.respPlaceholder}>
                  {n2Form.responsableNom || 'Sélectionner un responsable...'}
                </Text>
                <Text style={{ color: '#607D8B' }}>▼</Text>
              </TouchableOpacity>

              {/* Boutons */}
              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={closeEdit}>
                  <Text style={styles.cancelBtnText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.saveBtnText}>✅ Enregistrer</Text>
                  }
                </TouchableOpacity>
              </View>

            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ===== MODAL RESPONSABLE PICKER ===== */}
      <Modal
        visible={showRespPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRespPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxHeight: '70%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>👤 Choisir un responsable</Text>
              <TouchableOpacity onPress={() => setShowRespPicker(false)}>
                <Text style={{ color: '#607D8B', fontSize: 20 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.userRow}
              onPress={() => {
                setN2Form(p => ({ ...p, responsableNom: '', responsableId: null }));
                setShowRespPicker(false);
              }}
            >
              <Text style={styles.userNone}>— Aucun responsable —</Text>
            </TouchableOpacity>

            <ScrollView>
              {users.map(u => (
                <TouchableOpacity
                  key={u.id}
                  style={[styles.userRow, n2Form.responsableId === u.id && styles.userRowSelected]}
                  onPress={() => {
                    setN2Form(p => ({ ...p, responsableNom: u.fullName, responsableId: u.id }));
                    setShowRespPicker(false);
                  }}
                >
                  <View>
                    <Text style={[styles.userName, n2Form.responsableId === u.id && { color: '#9B59B6' }]}>
                      {u.fullName}
                    </Text>
                    <Text style={styles.userMeta}>
                      {u.role} · {u.entite || '—'}{u.matricule ? ` · ${u.matricule}` : ''}
                    </Text>
                  </View>
                  {n2Form.responsableId === u.id && (
                    <Text style={{ color: '#9B59B6', fontSize: 18 }}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A1628' },

  header: {
    backgroundColor: '#0F2137', padding: 20,
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20, marginBottom: 8,
  },
  backText: { color: '#9B59B6', fontSize: 14, marginBottom: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  headerSub: { color: '#607D8B', fontSize: 11, marginTop: 2 },

  pdfBtn: { backgroundColor: '#C9A84C', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginLeft: 8 },
  pdfBtnText: { color: '#0A1628', fontWeight: 'bold', fontSize: 12 },

  countersScroll: { paddingHorizontal: 12, marginBottom: 6, flexGrow: 0 },
  counterChip: {
    borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8,
    marginRight: 8, alignItems: 'center', minWidth: 70,
  },
  counterCount: { fontSize: 18, fontWeight: 'bold' },
  counterLabel: { fontSize: 10, marginTop: 2 },

  searchContainer: { paddingHorizontal: 12, marginBottom: 8 },
  searchInput: {
    backgroundColor: '#0F2137', borderWidth: 1, borderColor: '#2A4060',
    borderRadius: 10, padding: 10, color: '#FFFFFF', fontSize: 13,
  },

  list: { paddingHorizontal: 12 },
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  emptySubText: { color: '#607D8B', fontSize: 12, marginTop: 6, textAlign: 'center' },

  risqueCard: {
    backgroundColor: '#0F2137', borderRadius: 12, padding: 14,
    marginBottom: 10, borderLeftWidth: 5,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, flexWrap: 'wrap' },
  critBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  critBadgeText: { fontSize: 11, fontWeight: 'bold' },
  facteurText: { color: '#607D8B', fontSize: 11 },
  taxoBadge: { backgroundColor: '#9B59B620', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#9B59B6' },
  taxoText: { color: '#9B59B6', fontSize: 10, fontWeight: 'bold' },
  scoreBox: { alignItems: 'center', backgroundColor: '#1A2F4A', borderRadius: 8, padding: 6 },
  scoreLabel: { color: '#607D8B', fontSize: 9 },
  scoreValue: { fontSize: 12, fontWeight: 'bold' },

  dangerText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold', marginBottom: 6 },
  risqueRow: { flexDirection: 'row', marginBottom: 8 },
  risqueLabel: { color: '#607D8B', fontSize: 12, marginRight: 6 },
  risqueText: { color: '#B0BEC5', fontSize: 12, flex: 1, lineHeight: 18 },

  barriereBox: {
    backgroundColor: '#1A2F4A', borderRadius: 8, padding: 8, borderLeftWidth: 3,
  },
  barriereLabel: { fontSize: 11, fontWeight: 'bold', marginBottom: 2 },
  barriereText: { color: '#B0BEC5', fontSize: 11, lineHeight: 16 },

  planBox: {
    backgroundColor: '#1A2F4A', borderRadius: 8, padding: 10,
    marginBottom: 8, borderLeftWidth: 3, borderLeftColor: '#C9A84C',
  },
  planLabel: { color: '#C9A84C', fontSize: 11, fontWeight: 'bold', marginBottom: 4 },
  planText: { color: '#B0BEC5', fontSize: 11, lineHeight: 16 },

  respInline: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  respInlineLabel: { color: '#607D8B', fontSize: 11 },
  respInlineName: { color: '#9B59B6', fontSize: 11, fontWeight: 'bold' },

  n2EditBtn: {
    marginTop: 6, borderRadius: 8, padding: 10, alignItems: 'center',
    borderWidth: 1, borderColor: '#9B59B6', backgroundColor: '#9B59B610',
  },
  n2EditBtnFilled: { backgroundColor: '#9B59B620', borderColor: '#9B59B6' },
  n2EditBtnText: { color: '#9B59B6', fontSize: 12, fontWeight: 'bold' },
  n2EditBtnTextFilled: { color: '#9B59B6' },

  modalOverlay: { flex: 1, backgroundColor: '#00000090', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: '#0F2137', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: '92%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  modalSubtitle: { color: '#607D8B', fontSize: 11, marginTop: 2 },

  fieldLabel: { color: '#B0BEC5', fontSize: 12, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#1A2F4A', borderWidth: 1, borderColor: '#2A4060',
    borderRadius: 8, padding: 10, color: '#FFFFFF', fontSize: 13,
  },
  respSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  respSelectedText: { color: '#FFFFFF', fontSize: 13 },
  respPlaceholder: { color: '#607D8B', fontSize: 13 },

  userRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: '#2A4060',
  },
  userRowSelected: { backgroundColor: '#9B59B610' },
  userNone: { color: '#607D8B', fontSize: 13, fontStyle: 'italic', paddingVertical: 4 },
  userName: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold' },
  userMeta: { color: '#607D8B', fontSize: 11, marginTop: 2 },

  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 16, marginBottom: 8 },
  cancelBtn: { flex: 1, backgroundColor: '#1A2F4A', borderRadius: 10, padding: 14, alignItems: 'center' },
  cancelBtnText: { color: '#607D8B', fontWeight: 'bold' },
  saveBtn: { flex: 2, backgroundColor: '#9B59B6', borderRadius: 10, padding: 14, alignItems: 'center' },
  saveBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
});
