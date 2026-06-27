import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, TextInput, Modal, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateAndSharePDF } from '../utils/pdfUtils';
import { API_URL } from '../services/authService';

const CONGES_API = API_URL.replace('/auth', '/conges');
const USERS_API = API_URL.replace('/auth', '/admin/users');

const MOIS = [
  { label: 'Janvier', value: 1 },
  { label: 'Février', value: 2 },
  { label: 'Mars', value: 3 },
  { label: 'Avril', value: 4 },
  { label: 'Mai', value: 5 },
  { label: 'Juin', value: 6 },
  { label: 'Juillet', value: 7 },
  { label: 'Août', value: 8 },
  { label: 'Septembre', value: 9 },
  { label: 'Octobre', value: 10 },
  { label: 'Novembre', value: 11 },
  { label: 'Décembre', value: 12 },
];

const canEdit = (role) => role === 'ADMIN' || role === 'CGPX';

const getDateDebutSemaine = (semaine, annee) => {
  const date = new Date(annee, 0, 1 + (semaine - 1) * 7);
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
};

const getSemainesDuMois = (mois, annee) => {
  const semaines = [];
  for (let s = 1; s <= 53; s++) {
    const date = new Date(annee, 0, 1 + (s - 1) * 7);
    if (date.getMonth() + 1 === mois && date.getFullYear() === annee) {
      semaines.push(s);
    }
  }
  return semaines;
};

const formatSize = (n) => n < 10 ? `0${n}` : `${n}`;

export default function SuiviCongesScreen({ navigation }) {
  const [step, setStep] = useState(0); // 0=années, 1=tableau
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [annees, setAnnees] = useState([]);
  const [selectedAnnee, setSelectedAnnee] = useState(null);
  const [selectedMois, setSelectedMois] = useState(new Date().getMonth() + 1);
  const [tableau, setTableau] = useState([]);
  const [userRole, setUserRole] = useState('');
  const [allUsers, setAllUsers] = useState([]);

  // Modals
  const [showAddAnnee, setShowAddAnnee] = useState(false);
  const [showAddCollab, setShowAddCollab] = useState(false);
  const [showEditCell, setShowEditCell] = useState(false);
  const [showEditTotal, setShowEditTotal] = useState(false);

  const [newAnnee, setNewAnnee] = useState(new Date().getFullYear().toString());
  const [selectedCollabForAdd, setSelectedCollabForAdd] = useState(null);
  const [totalJoursInput, setTotalJoursInput] = useState('30');
  const [editCellData, setEditCellData] = useState({ collaborateurId: null, semaine: null, type: 'realise', valeur: '' });
  const [editTotalData, setEditTotalData] = useState({ collaborateurId: null, fullName: '', valeur: '' });

  const getToken = async () => await AsyncStorage.getItem('token');

  useEffect(() => {
    loadInitial();
  }, []);

  const loadInitial = async () => {
  setLoading(true);
  try {
    const token = await getToken();
    const userData = await AsyncStorage.getItem('user');
    const role = userData ? JSON.parse(userData).role : '';
    setUserRole(role);

    // Charger les années (accessible à tous)
    const anneesRes = await axios.get(`${CONGES_API}/annees`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setAnnees(anneesRes.data);

    // Charger les users seulement si ADMIN ou CHEF_KN1
    if (canEdit(role)) {
      const usersRes = await axios.get(USERS_API, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAllUsers(usersRes.data.filter(u => u.role !== 'ADMIN'));
    }
  } catch {
    Alert.alert('Erreur', 'Impossible de charger les données');
  } finally {
    setLoading(false);
  }
};

  const loadTableau = async (annee) => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await axios.get(`${CONGES_API}/tableau?annee=${annee}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTableau(res.data);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger le tableau');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAnnee = (annee) => {
    setSelectedAnnee(annee);
    loadTableau(annee);
    setStep(1);
  };

  const handleAddAnnee = async () => {
    const anneeNum = parseInt(newAnnee);
    if (isNaN(anneeNum) || anneeNum < 2020 || anneeNum > 2100) {
      Alert.alert('Erreur', 'Année invalide');
      return;
    }
    setShowAddAnnee(false);
    setSelectedAnnee(anneeNum);
    setTableau([]);
    setStep(1);
    if (!annees.includes(anneeNum)) setAnnees(prev => [anneeNum, ...prev].sort((a, b) => b - a));
  };

  const handleAddCollab = async () => {
    if (!selectedCollabForAdd) { Alert.alert('Erreur', 'Sélectionnez un collaborateur'); return; }
    const total = parseInt(totalJoursInput);
    if (isNaN(total) || total < 0) { Alert.alert('Erreur', 'Total invalide'); return; }
    setSaving(true);
    try {
      const token = await getToken();
      await axios.post(`${CONGES_API}/config`, {
        collaborateurId: selectedCollabForAdd.id,
        annee: selectedAnnee,
        totalJoursDroits: total,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setShowAddCollab(false);
      setSelectedCollabForAdd(null);
      setTotalJoursInput('30');
      loadTableau(selectedAnnee);
    } catch {
      Alert.alert('Erreur', 'Impossible d\'ajouter le collaborateur');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCell = async () => {
    const val = parseInt(editCellData.valeur) || 0;
    setSaving(true);
    try {
      const token = await getToken();
      await axios.post(`${CONGES_API}/entree`, {
        collaborateurId: editCellData.collaborateurId,
        annee: selectedAnnee,
        semaine: editCellData.semaine,
        type: editCellData.type,
        jours: val,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setShowEditCell(false);
      loadTableau(selectedAnnee);
    } catch {
      Alert.alert('Erreur', 'Impossible de sauvegarder');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTotal = async () => {
    const val = parseInt(editTotalData.valeur) || 0;
    setSaving(true);
    try {
      const token = await getToken();
      await axios.post(`${CONGES_API}/config`, {
        collaborateurId: editTotalData.collaborateurId,
        annee: selectedAnnee,
        totalJoursDroits: val,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setShowEditTotal(false);
      loadTableau(selectedAnnee);
    } catch {
      Alert.alert('Erreur', 'Impossible de sauvegarder');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCollab = async (collab) => {
    const confirmed = Platform.OS === 'web'
      ? window.confirm(`Supprimer ${collab.fullName} de l'année ${selectedAnnee} ?`)
      : await new Promise(resolve => Alert.alert('Confirmation', `Supprimer ${collab.fullName} de l'année ${selectedAnnee} ?`, [
          { text: 'Annuler', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Supprimer', style: 'destructive', onPress: () => resolve(true) },
        ]));
    if (!confirmed) return;
    try {
      const token = await getToken();
      await axios.delete(`${CONGES_API}/config/${collab.collaborateurId}/${selectedAnnee}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadTableau(selectedAnnee);
    } catch {
      Alert.alert('Erreur', 'Impossible de supprimer');
    }
  };

  const semaines = getSemainesDuMois(selectedMois, selectedAnnee || new Date().getFullYear());

  // Grouper par fonction
  const groupes = {};
  tableau.forEach(row => {
    const fn = row.fonctionAssuree || 'Autre';
    if (!groupes[fn]) groupes[fn] = [];
    groupes[fn].push(row);
  });

  const generatePDF = async () => {
    setGenerating(true);
    try {
      // Toutes les semaines de l'année groupées par mois
      let allSemaines = [];
      for (let m = 1; m <= 12; m++) {
        const sems = getSemainesDuMois(m, selectedAnnee);
        if (sems.length > 0) allSemaines.push({ mois: MOIS[m - 1].label, semaines: sems });
      }

      const headerMois = allSemaines.map(g =>
        `<th colspan="${g.semaines.length}" style="background:#1E3A5F;color:white;padding:4px;font-size:9px;border:1px solid #ccc;">${g.mois}</th>`
      ).join('');

      const headerSemaines = allSemaines.flatMap(g =>
        g.semaines.map(s => `<th style="background:#2A4060;color:white;padding:3px 2px;font-size:8px;border:1px solid #ccc;writing-mode:vertical-rl;transform:rotate(180deg);height:60px;">S${formatSize(s)}<br/>${getDateDebutSemaine(s, selectedAnnee)}</th>`)
      ).join('');

      let rows = '';
      Object.entries(groupes).forEach(([fn, members]) => {
        // Ligne groupe
        const totalCols = allSemaines.reduce((acc, g) => acc + g.semaines.length, 0);
        rows += `<tr><td colspan="${3 + 1 + totalCols + 3}" style="background:#E8F0F7;font-weight:bold;font-size:10px;padding:4px 6px;border:1px solid #ccc;">${fn}</td></tr>`;

        members.forEach((row, idx) => {
          const bg = idx % 2 === 0 ? '#fff' : '#f9f9f9';
          const cellsPrevu = allSemaines.flatMap(g =>
            g.semaines.map(s => {
              const val = row.entreesPrevu?.[s] || '';
              return `<td style="text-align:center;font-size:9px;padding:2px;border:1px solid #ddd;background:${bg};color:#1E3A5F;font-weight:bold;">${val}</td>`;
            })
          ).join('');
          const cellsRealise = allSemaines.flatMap(g =>
            g.semaines.map(s => {
              const val = row.entreesRealise?.[s] || '';
              return `<td style="text-align:center;font-size:9px;padding:2px;border:1px solid #ddd;background:${bg};color:#16A085;font-weight:bold;">${val}</td>`;
            })
          ).join('');

          rows += `
            <tr>
              <td rowspan="2" style="font-size:10px;padding:3px 5px;border:1px solid #ddd;font-weight:bold;background:${bg};vertical-align:middle;">${row.fullName}<br/><span style="font-size:8px;color:#888;">Droits: ${row.totalJoursDroits}j</span></td>
              <td rowspan="2" style="font-size:10px;padding:3px 5px;border:1px solid #ddd;background:${bg};vertical-align:middle;">${row.matricule}</td>
              <td rowspan="2" style="font-size:10px;padding:3px 5px;border:1px solid #ddd;background:${bg};vertical-align:middle;">${row.fonctionAssuree}</td>
              <td style="font-size:8px;padding:2px 4px;border:1px solid #ddd;background:#EBF5FF;color:#1E3A5F;font-weight:bold;">Prév</td>
              ${cellsPrevu}
              <td style="text-align:center;font-size:9px;font-weight:bold;padding:2px;border:1px solid #ddd;color:#1E3A5F;background:#EBF5FF;">${row.totalPrevu}</td>
              <td style="border:1px solid #ddd;background:${bg};"></td>
              <td style="border:1px solid #ddd;background:${bg};"></td>
            </tr>
            <tr>
              <td style="font-size:8px;padding:2px 4px;border:1px solid #ddd;background:#E8F8F5;color:#16A085;font-weight:bold;">Réal</td>
              ${cellsRealise}
              <td style="border:1px solid #ddd;background:${bg};"></td>
              <td style="text-align:center;font-size:9px;font-weight:bold;padding:2px;border:1px solid #ddd;color:#16A085;background:#E8F8F5;">${row.totalRealise}</td>
              <td style="text-align:center;font-size:9px;font-weight:bold;padding:2px;border:1px solid #ddd;color:${row.reliquat < 0 ? '#E74C3C' : '#E67E22'};background:#E8F4FD;">${row.reliquat}</td>
            </tr>`;
        });
      });

      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
* { margin:0;padding:0;box-sizing:border-box; }
body { font-family:Arial,sans-serif;font-size:10px;padding:8px; }
table { width:100%;border-collapse:collapse;font-size:9px; }
@page { size: A4 landscape; margin: 8mm; }
</style>
</head><body>
<div class="header">
  <div>
    <div class="oncf">ONCF</div>
    <div style="font-size:10px;">PIC /DRIC</div>
    <div style="font-size:10px;">Arrondissement MI LGV</div>
    <div style="font-size:10px;">DT 102V LGV</div>
  </div>
  <div style="text-align:center;">
    <div style="font-weight:bold;font-size:13px;">Suivi de Congés — Année ${selectedAnnee}</div>
  </div>
  <div style="text-align:right;font-size:10px;">
    <div>Généré le ${new Date().toLocaleDateString('fr-FR')}</div>
  </div>
</div>
<table>
  <thead>
    <tr>
      <th rowspan="2" style="background:#0A1628;color:white;padding:4px;font-size:9px;border:1px solid #ccc;">Noms</th>
      <th rowspan="2" style="background:#0A1628;color:white;padding:4px;font-size:9px;border:1px solid #ccc;">Mtrcle</th>
      <th rowspan="2" style="background:#0A1628;color:white;padding:4px;font-size:9px;border:1px solid #ccc;">Fonction</th>
      <th rowspan="2" style="background:#0A1628;color:white;padding:4px;font-size:9px;border:1px solid #ccc;">P/R</th>
      ${headerMois}
      <th rowspan="2" style="background:#1E3A5F;color:white;padding:4px;font-size:9px;border:1px solid #ccc;">Tot.Prév</th>
      <th rowspan="2" style="background:#16A085;color:white;padding:4px;font-size:9px;border:1px solid #ccc;">Tot.Réal</th>
      <th rowspan="2" style="background:#E67E22;color:white;padding:4px;font-size:9px;border:1px solid #ccc;">Reliquat</th>
    </tr>
    <tr>${headerSemaines}</tr>
  </thead>
  <tbody>${rows}</tbody>
</table>
</body></html>`;

      await generateAndSharePDF(html, { dialogTitle: `Suivi Congés ${selectedAnnee}` });
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de générer le PDF');
    } finally {
      setGenerating(false);
    }
  };

  const Wrapper = Platform.OS === 'web' ? View : SafeAreaView;
  const Scroller = Platform.OS === 'web' ? View : ScrollView;

  // ===== ÉTAPE 0 — Liste années =====
  if (step === 0) {
    return (
      <Wrapper style={Platform.OS === 'web' ? styles.webSafe : styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerTitle}>Suivi de Congés</Text>
              <Text style={styles.headerSub}>Sélectionnez une année</Text>
            </View>
            {canEdit(userRole) && (
              <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddAnnee(true)}>
                <Text style={styles.addBtnText}>+ Année</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {loading
          ? <ActivityIndicator color="#16A085" style={{ marginTop: 40 }} />
          : (
            <Scroller style={Platform.OS === 'web' ? styles.webScroller : styles.list} {...(Platform.OS !== 'web' && { showsVerticalScrollIndicator: false })}>
              {annees.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyIcon}>📅</Text>
                  <Text style={styles.emptyText}>Aucune année configurée</Text>
                  {canEdit(userRole) && <Text style={styles.emptySubText}>Appuyez sur "+ Année" pour commencer</Text>}
                </View>
              ) : (
                annees.map(annee => (
                  <TouchableOpacity
                    key={annee}
                    style={styles.anneeCard}
                    onPress={() => handleSelectAnnee(annee)}
                  >
                    <Text style={styles.anneeIcon}>📅</Text>
                    <Text style={styles.anneeText}>Année {annee}</Text>
                    <Text style={styles.arrow}>›</Text>
                  </TouchableOpacity>
                ))
              )}
              <View style={{ height: 40 }} />
            </Scroller>
          )
        }

        {/* Modal Nouvelle Année */}
        <Modal visible={showAddAnnee} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Nouvelle Année</Text>
              <TextInput
                style={styles.modalInput}
                value={newAnnee}
                onChangeText={setNewAnnee}
                keyboardType="numeric"
                placeholder="Ex: 2026"
                placeholderTextColor="#607D8B"
              />
              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.modalCancel} onPress={() => setShowAddAnnee(false)}>
                  <Text style={styles.modalCancelText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalConfirm} onPress={handleAddAnnee}>
                  <Text style={styles.modalConfirmText}>Créer</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </Wrapper>
    );
  }

  // ===== ÉTAPE 1 — Tableau =====
  return (
    <Wrapper style={Platform.OS === 'web' ? styles.webSafe : styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { setStep(0); setTableau([]); }}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Congés {selectedAnnee}</Text>
            <Text style={styles.headerSub}>{tableau.length} collaborateur(s)</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {canEdit(userRole) && (
              <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddCollab(true)}>
                <Text style={styles.addBtnText}>+ Collab</Text>
              </TouchableOpacity>
            )}
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
          </View>
        </View>
      </View>

      {/* Sélecteur de mois */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.moisScroll}>
        {MOIS.map(m => (
          <TouchableOpacity
            key={m.value}
            style={[styles.moisBtn, selectedMois === m.value && styles.moisBtnActive]}
            onPress={() => setSelectedMois(m.value)}
          >
            <Text style={[styles.moisBtnText, selectedMois === m.value && styles.moisBtnTextActive]}>
              {m.label.substring(0, 3)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading
        ? <ActivityIndicator color="#16A085" style={{ marginTop: 40 }} />
        : (
          <Scroller style={Platform.OS === 'web' ? styles.webScroller : { flex: 1 }} {...(Platform.OS !== 'web' && { showsVerticalScrollIndicator: false })}>
            <ScrollView horizontal showsHorizontalScrollIndicator={true} nestedScrollEnabled>
              <View>
                {/* En-tête tableau */}
                <View style={styles.tableHeader}>
                  <Text style={[styles.thCell, { width: 140 }]}>Nom</Text>
                  <Text style={[styles.thCell, { width: 70 }]}>Matricule</Text>
                  <Text style={[styles.thCell, { width: 80 }]}>Fonction</Text>
                  <Text style={[styles.thCell, { width: 36 }]}>P/R</Text>
                  {semaines.map(s => (
                    <View key={s} style={[styles.thCell, { width: 48 }]}>
                      <Text style={styles.thCellText}>S{formatSize(s)}</Text>
                      <Text style={styles.thCellDate}>{getDateDebutSemaine(s, selectedAnnee)}</Text>
                    </View>
                  ))}
                  <Text style={[styles.thCell, { width: 52, backgroundColor: '#1E3A5F' }]}>Tot.P</Text>
                  <Text style={[styles.thCell, { width: 52, backgroundColor: '#16A085' }]}>Tot.R</Text>
                  <Text style={[styles.thCell, { width: 52, backgroundColor: '#E67E22' }]}>Reliq.</Text>
                  {canEdit(userRole) && <Text style={[styles.thCell, { width: 40 }]}></Text>}
                </View>

                {/* Lignes par groupe */}
                {Object.entries(groupes).map(([fn, members]) => (
                  <View key={fn}>
                    {/* Ligne titre groupe */}
                    <View style={styles.groupRow}>
                      <Text style={styles.groupText}>{fn}</Text>
                    </View>

                    {/* Lignes collaborateurs (2 sous-lignes : Prévu + Réalisé) */}
                    {members.map((row, idx) => (
                      <View key={row.collaborateurId}>
                        {/* Sous-ligne Prévu */}
                        <View style={[styles.dataRow, idx % 2 === 1 && styles.dataRowAlt]}>
                          <View style={{ width: 140 }}>
                            <Text style={styles.nameText}>{row.fullName}</Text>
                            {canEdit(userRole) ? (
                              <TouchableOpacity onPress={() => {
                                setEditTotalData({ collaborateurId: row.collaborateurId, fullName: row.fullName, valeur: row.totalJoursDroits?.toString() || '30' });
                                setShowEditTotal(true);
                              }}>
                                <Text style={styles.totalDroitsText}>Droits: {row.totalJoursDroits}j ✏️</Text>
                              </TouchableOpacity>
                            ) : (
                              <Text style={styles.totalDroitsText}>Droits: {row.totalJoursDroits}j</Text>
                            )}
                          </View>
                          <Text style={[styles.dataCell, { width: 70 }]}>{row.matricule}</Text>
                          <Text style={[styles.dataCell, { width: 80 }]}>{row.fonctionAssuree}</Text>
                          <View style={[styles.typeCell, styles.typeCellPrevu]}>
                            <Text style={styles.typeCellTextPrevu}>Prév</Text>
                          </View>
                          {semaines.map(s => {
                            const val = row.entreesPrevu?.[s];
                            return (
                              <TouchableOpacity
                                key={s}
                                style={[styles.cellBtn, { width: 48 }, val && styles.cellBtnPrevu]}
                                onPress={() => {
                                  if (!canEdit(userRole)) return;
                                  setEditCellData({ collaborateurId: row.collaborateurId, semaine: s, type: 'prevu', valeur: val?.toString() || '' });
                                  setShowEditCell(true);
                                }}
                                disabled={!canEdit(userRole)}
                              >
                                <Text style={[styles.cellBtnText, val && styles.cellBtnTextPrevu]}>
                                  {val || (canEdit(userRole) ? '+' : '')}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                          <Text style={[styles.totalCell, { width: 52, color: '#4A90D9' }]}>{row.totalPrevu || 0}</Text>
                          <View style={{ width: 52 }} />
                          <View style={{ width: 52 }} />
                          {canEdit(userRole) && <View style={{ width: 40 }} />}
                        </View>

                        {/* Sous-ligne Réalisé */}
                        <View style={[styles.dataRowSub, idx % 2 === 1 && styles.dataRowAlt]}>
                          <View style={{ width: 140 }} />
                          <View style={{ width: 70 }} />
                          <View style={{ width: 80 }} />
                          <View style={[styles.typeCell, styles.typeCellRealise]}>
                            <Text style={styles.typeCellTextRealise}>Réal</Text>
                          </View>
                          {semaines.map(s => {
                            const val = row.entreesRealise?.[s];
                            return (
                              <TouchableOpacity
                                key={s}
                                style={[styles.cellBtn, { width: 48 }, val && styles.cellBtnFilled]}
                                onPress={() => {
                                  if (!canEdit(userRole)) return;
                                  setEditCellData({ collaborateurId: row.collaborateurId, semaine: s, type: 'realise', valeur: val?.toString() || '' });
                                  setShowEditCell(true);
                                }}
                                disabled={!canEdit(userRole)}
                              >
                                <Text style={[styles.cellBtnText, val && styles.cellBtnTextFilled]}>
                                  {val || (canEdit(userRole) ? '+' : '')}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                          <View style={{ width: 52 }} />
                          <Text style={[styles.totalCell, { width: 52, color: '#16A085' }]}>{row.totalRealise || 0}</Text>
                          <Text style={[styles.totalCell, { width: 52, color: row.reliquat < 0 ? '#E74C3C' : '#E67E22' }]}>
                            {row.reliquat}
                          </Text>
                          {canEdit(userRole) && (
                            <TouchableOpacity
                              style={[styles.deleteRowBtn, { width: 40 }]}
                              onPress={() => handleDeleteCollab(row)}
                            >
                              <Text style={{ color: '#E74C3C', fontSize: 14 }}>🗑</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                ))}

                {tableau.length === 0 && (
                  <View style={styles.emptyTableBox}>
                    <Text style={styles.emptyText}>Aucun collaborateur pour {selectedAnnee}</Text>
                    {canEdit(userRole) && <Text style={styles.emptySubText}>Appuyez sur "+ Collab" pour ajouter</Text>}
                  </View>
                )}
              </View>
            </ScrollView>
            <View style={{ height: 40 }} />
          </Scroller>
        )
      }

      {/* Modal Saisie Cellule (Prévu ou Réalisé) */}
      <Modal visible={showEditCell} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { borderColor: editCellData.type === 'prevu' ? '#4A90D9' : '#16A085' }]}>
            <Text style={styles.modalTitle}>
              {editCellData.type === 'prevu' ? 'Jours prévus' : 'Jours réalisés'}
            </Text>
            <Text style={styles.modalSubtitle}>Semaine S{formatSize(editCellData.semaine || 0)}</Text>
            <TextInput
              style={styles.modalInput}
              value={editCellData.valeur}
              onChangeText={v => setEditCellData(prev => ({ ...prev, valeur: v }))}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#607D8B"
            />
            <Text style={styles.modalHint}>Saisir 0 pour effacer</Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowEditCell(false)}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, { backgroundColor: editCellData.type === 'prevu' ? '#4A90D9' : '#16A085' }, saving && { opacity: 0.6 }]}
                onPress={handleSaveCell}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.modalConfirmText}>Sauvegarder</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Modifier Total Droits */}
      <Modal visible={showEditTotal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Total jours droits</Text>
            <Text style={styles.modalSubtitle}>{editTotalData.fullName}</Text>
            <TextInput
              style={styles.modalInput}
              value={editTotalData.valeur}
              onChangeText={v => setEditTotalData(prev => ({ ...prev, valeur: v }))}
              keyboardType="numeric"
              placeholder="30"
              placeholderTextColor="#607D8B"
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowEditTotal(false)}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalConfirm, saving && { opacity: 0.6 }]} onPress={handleSaveTotal} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.modalConfirmText}>Sauvegarder</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Ajouter Collaborateur */}
      <Modal visible={showAddCollab} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxHeight: '80%' }]}>
            <Text style={styles.modalTitle}>Ajouter collaborateur</Text>
            <Text style={styles.modalSubtitle}>Année {selectedAnnee}</Text>

            <ScrollView style={{ maxHeight: 300, marginBottom: 12 }}>
              {allUsers
                .filter(u => !tableau.find(t => t.collaborateurId === u.id))
                .map(u => (
                  <TouchableOpacity
                    key={u.id}
                    style={[styles.collabSelectItem, selectedCollabForAdd?.id === u.id && styles.collabSelectItemActive]}
                    onPress={() => setSelectedCollabForAdd(u)}
                  >
                    <Text style={styles.collabSelectName}>{u.fullName}</Text>
                    <Text style={styles.collabSelectMat}>{u.matricule} · {u.fonctionAssuree || u.poste}</Text>
                  </TouchableOpacity>
                ))
              }
            </ScrollView>

            <Text style={styles.fieldLabel}>Total jours droits</Text>
            <TextInput
              style={styles.modalInput}
              value={totalJoursInput}
              onChangeText={setTotalJoursInput}
              keyboardType="numeric"
              placeholder="30"
              placeholderTextColor="#607D8B"
            />

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => { setShowAddCollab(false); setSelectedCollabForAdd(null); }}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalConfirm, saving && { opacity: 0.6 }]} onPress={handleAddCollab} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.modalConfirmText}>Ajouter</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A1628' },
  webSafe: { height: '100vh', backgroundColor: '#0A1628' },
  webScroller: { flex: 1, overflow: 'scroll', paddingBottom: 40 },
  header: {
    backgroundColor: '#0F2137', padding: 20,
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20, marginBottom: 8,
  },
  backText: { color: '#C9A84C', fontSize: 14, marginBottom: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  headerSub: { color: '#607D8B', fontSize: 11, marginTop: 2 },

  addBtn: { backgroundColor: '#16A085', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
  pdfBtn: { backgroundColor: '#C9A84C', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  pdfBtnText: { color: '#0A1628', fontWeight: 'bold', fontSize: 13 },

  list: { paddingHorizontal: 16 },
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  emptySubText: { color: '#607D8B', fontSize: 12, marginTop: 4 },
  emptyTableBox: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },

  anneeCard: {
    backgroundColor: '#0F2137', borderRadius: 12,
    padding: 18, marginBottom: 10,
    borderLeftWidth: 4, borderLeftColor: '#16A085',
    flexDirection: 'row', alignItems: 'center',
  },
  anneeIcon: { fontSize: 28, marginRight: 14 },
  anneeText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', flex: 1 },
  arrow: { color: '#16A085', fontSize: 22, fontWeight: 'bold' },

  // Mois scroll
  moisScroll: { paddingHorizontal: 12, marginBottom: 8, flexGrow: 0 },
  moisBtn: {
    paddingHorizontal: 12, paddingVertical: 6, marginRight: 6,
    borderRadius: 16, backgroundColor: '#0F2137',
    borderWidth: 1, borderColor: '#2A4060',
  },
  moisBtnActive: { backgroundColor: '#16A085', borderColor: '#16A085' },
  moisBtnText: { color: '#607D8B', fontSize: 12 },
  moisBtnTextActive: { color: '#FFFFFF', fontWeight: 'bold' },

  // Tableau
  tableHeader: { flexDirection: 'row', backgroundColor: '#0A1628', paddingVertical: 6 },
  thCell: {
    color: '#FFFFFF', fontSize: 10, fontWeight: 'bold',
    textAlign: 'center', paddingHorizontal: 2,
    backgroundColor: '#1E3A5F', borderWidth: 0.5, borderColor: '#2A4060',
    paddingVertical: 6,
  },
  thCellText: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold', textAlign: 'center' },
  thCellDate: { color: '#B0BEC5', fontSize: 8, textAlign: 'center' },

  groupRow: {
    backgroundColor: '#1E3A5F', padding: 6,
    borderLeftWidth: 4, borderLeftColor: '#16A085',
  },
  groupText: { color: '#16A085', fontSize: 11, fontWeight: 'bold' },

  dataRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0F2137', paddingVertical: 3,
  },
  dataRowSub: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0F2137', paddingVertical: 3,
    borderBottomWidth: 0.5, borderBottomColor: '#2A4060',
    marginBottom: 2,
  },
  dataRowAlt: { backgroundColor: '#0D1B2A' },

  typeCell: {
    width: 36, height: 32, alignItems: 'center', justifyContent: 'center',
    borderWidth: 0.5, borderColor: '#2A4060',
  },
  typeCellPrevu: { backgroundColor: '#1A3A6A' },
  typeCellRealise: { backgroundColor: '#0D3028' },
  typeCellTextPrevu: { color: '#4A90D9', fontSize: 9, fontWeight: 'bold' },
  typeCellTextRealise: { color: '#16A085', fontSize: 9, fontWeight: 'bold' },

  nameText: { color: '#FFFFFF', fontSize: 11, fontWeight: 'bold', paddingHorizontal: 4 },
  totalDroitsText: { color: '#C9A84C', fontSize: 9, paddingHorizontal: 4, marginTop: 2 },
  dataCell: {
    color: '#B0BEC5', fontSize: 10, textAlign: 'center',
    paddingHorizontal: 2, borderRightWidth: 0.5, borderRightColor: '#2A4060',
  },

  cellBtn: {
    height: 36, alignItems: 'center', justifyContent: 'center',
    borderWidth: 0.5, borderColor: '#2A4060',
  },
  cellBtnFilled: { backgroundColor: '#16A08520' },
  cellBtnPrevu: { backgroundColor: '#1E3A5F30' },
  cellBtnText: { color: '#607D8B', fontSize: 11 },
  cellBtnTextFilled: { color: '#16A085', fontWeight: 'bold', fontSize: 13 },
  cellBtnTextPrevu: { color: '#4A90D9', fontWeight: 'bold', fontSize: 13 },

  totalCell: {
    color: '#FFFFFF', fontSize: 12, fontWeight: 'bold',
    textAlign: 'center', backgroundColor: '#1E3A5F',
    borderWidth: 0.5, borderColor: '#2A4060',
  },
  deleteRowBtn: {
    alignItems: 'center', justifyContent: 'center',
    height: 36,
  },

  // Modals
  modalOverlay: {
    flex: 1, backgroundColor: '#00000080',
    justifyContent: 'center', alignItems: 'center',
  },
  modalBox: {
    backgroundColor: '#0F2137', borderRadius: 16,
    padding: 24, width: '85%',
    borderWidth: 1, borderColor: '#16A085',
  },
  modalTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  modalSubtitle: { color: '#607D8B', fontSize: 12, marginBottom: 12 },
  modalInput: {
    backgroundColor: '#1A2F4A', borderWidth: 1, borderColor: '#2A4060',
    borderRadius: 8, padding: 12, color: '#FFFFFF', fontSize: 16,
    marginBottom: 8,
  },
  modalHint: { color: '#607D8B', fontSize: 11, marginBottom: 12 },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 8 },
  modalCancel: {
    flex: 1, backgroundColor: '#1A2F4A', borderRadius: 8,
    padding: 12, alignItems: 'center',
  },
  modalCancelText: { color: '#607D8B', fontWeight: 'bold' },
  modalConfirm: {
    flex: 1, backgroundColor: '#16A085', borderRadius: 8,
    padding: 12, alignItems: 'center',
  },
  modalConfirmText: { color: '#FFFFFF', fontWeight: 'bold' },

  collabSelectItem: {
    backgroundColor: '#1A2F4A', borderRadius: 8,
    padding: 10, marginBottom: 6, borderWidth: 1, borderColor: '#2A4060',
  },
  collabSelectItemActive: { borderColor: '#16A085', backgroundColor: '#16A08520' },
  collabSelectName: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold' },
  collabSelectMat: { color: '#607D8B', fontSize: 11, marginTop: 2 },

  fieldLabel: { color: '#B0BEC5', fontSize: 11, marginBottom: 4 },
});