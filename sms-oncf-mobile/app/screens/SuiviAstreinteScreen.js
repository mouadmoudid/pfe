import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Modal, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { API_URL } from '../services/authService';

const AST_API = API_URL.replace('/auth', '/astreinte');
const USERS_API = API_URL.replace('/auth', '/admin/users');

const canEdit = (role) => role === 'ADMIN' || role === 'CGPX';

const formatS = (n) => n < 10 ? `S0${n}` : `S${n}`;

const getDateSemaine = (semaine, annee) => {
  const debut = new Date(annee, 0, 1 + (semaine - 1) * 7);
  const fin = new Date(debut);
  fin.setDate(fin.getDate() + 6);
  const fmt = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  return `du ${fmt(debut)} au ${fmt(fin)}`;
};

// Couleurs alternées pour les colonnes collaborateurs (comme le document)
const COL_COLORS = ['#E8F4FD', '#E8F8F5', '#FEF9E7', '#FDEDEC', '#F4ECF7', '#E8F8F5'];

export default function SuiviAstreinteScreen({ navigation }) {
  const [step, setStep] = useState(0); // 0=années, 1=planning, 2=vue semaine
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [annees, setAnnees] = useState([]);
  const [selectedAnnee, setSelectedAnnee] = useState(null);
  const [planning, setPlanning] = useState([]); // [{collaborateurId, fullName, semaines: Set, ...}]
  const [selectedSemaine, setSelectedSemaine] = useState(1);
  const [equipeAstreinte, setEquipeAstreinte] = useState([]);
  const [userRole, setUserRole] = useState('');
  const [allUsers, setAllUsers] = useState([]);

  // Modals
  const [showAddAnnee, setShowAddAnnee] = useState(false);
  const [showAddCollab, setShowAddCollab] = useState(false);
  const [newAnnee, setNewAnnee] = useState(new Date().getFullYear().toString());
  const [selectedCollabForAdd, setSelectedCollabForAdd] = useState(null);

  const getToken = async () => await AsyncStorage.getItem('token');

  useEffect(() => { loadInitial(); }, []);

  const loadInitial = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const userData = await AsyncStorage.getItem('user');
      const role = userData ? JSON.parse(userData).role : '';
      setUserRole(role);

      const anneesRes = await axios.get(`${AST_API}/annees`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnnees(anneesRes.data);

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

  const loadPlanning = async (annee) => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await axios.get(`${AST_API}/planning?annee=${annee}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Convertir les semaines en Set pour accès rapide
      const data = res.data.map(r => ({ ...r, semaines: new Set(r.semaines) }));
      setPlanning(data);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger le planning');
    } finally {
      setLoading(false);
    }
  };

  const loadEquipeSemaine = async (annee, semaine) => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await axios.get(`${AST_API}/semaine?annee=${annee}&semaine=${semaine}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEquipeAstreinte(res.data);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger la semaine');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAnnee = (annee) => {
    setSelectedAnnee(annee);
    loadPlanning(annee);
    setStep(1);
  };

  const handleAddAnnee = () => {
    const anneeNum = parseInt(newAnnee);
    if (isNaN(anneeNum) || anneeNum < 2020 || anneeNum > 2100) {
      Alert.alert('Erreur', 'Année invalide'); return;
    }
    setShowAddAnnee(false);
    setSelectedAnnee(anneeNum);
    setPlanning([]);
    if (!annees.includes(anneeNum)) setAnnees(prev => [anneeNum, ...prev].sort((a, b) => b - a));
    setStep(1);
  };

  const toggleAstreinte = async (collaborateurId, semaine, currentlyIn) => {
    if (!canEdit(userRole)) return;
    setSaving(true);
    try {
      const token = await getToken();
      await axios.post(AST_API, {
        collaborateurId,
        annee: selectedAnnee,
        semaine,
        enAstreinte: !currentlyIn,
      }, { headers: { Authorization: `Bearer ${token}` } });

      // Mettre à jour localement
      setPlanning(prev => prev.map(r => {
        if (r.collaborateurId !== collaborateurId) return r;
        const newSemaines = new Set(r.semaines);
        if (currentlyIn) newSemaines.delete(semaine);
        else newSemaines.add(semaine);
        return { ...r, semaines: newSemaines, totalAstreintes: newSemaines.size };
      }));
    } catch {
      Alert.alert('Erreur', 'Impossible de sauvegarder');
    } finally {
      setSaving(false);
    }
  };

  const handleAddCollab = async () => {
    if (!selectedCollabForAdd) { Alert.alert('Erreur', 'Sélectionnez un collaborateur'); return; }
    setSaving(true);
    try {
      const token = await getToken();
      await axios.post(
        `${AST_API}/collaborateur/${selectedCollabForAdd.id}/annee/${selectedAnnee}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setShowAddCollab(false);
      setSelectedCollabForAdd(null);
      loadPlanning(selectedAnnee);
    } catch {
      Alert.alert('Erreur', 'Impossible d\'ajouter');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveCollab = (collab) => {
    Alert.alert('Confirmation', `Retirer ${collab.fullName} du planning ${selectedAnnee} ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Retirer', style: 'destructive', onPress: async () => {
          try {
            const token = await getToken();
            await axios.delete(`${AST_API}/collaborateur/${collab.collaborateurId}/annee/${selectedAnnee}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            loadPlanning(selectedAnnee);
          } catch {
            Alert.alert('Erreur', 'Impossible de retirer');
          }
        }
      }
    ]);
  };

  const handleVoirSemaine = (semaine) => {
    setSelectedSemaine(semaine);
    loadEquipeSemaine(selectedAnnee, semaine);
    setStep(2);
  };

  const generatePDF = async () => {
    setGenerating(true);
    try {
      // En-tête colonnes collaborateurs
      const headerCols = planning.map((c, i) =>
        `<th style="background:${COL_COLORS[i % COL_COLORS.length]};color:#1E3A5F;padding:5px 3px;font-size:9px;border:1px solid #ccc;min-width:65px;text-align:center;">
          ${c.fullName.replace(' ', '<br/>')}
        </th>`
      ).join('');

      // Lignes semaines
      let rows = '';
      for (let s = 1; s <= 53; s++) {
        const dateStr = getDateSemaine(s, selectedAnnee);
        const cells = planning.map((c, i) => {
          const isAst = c.semaines.has(s);
          return `<td style="text-align:center;font-size:10px;padding:3px;border:1px solid #ddd;background:${isAst ? '#FFF3E0' : '#fff'};font-weight:${isAst ? 'bold' : 'normal'};color:${isAst ? '#E67E22' : '#1a1a2e'};">
            ${isAst ? 'Ast' : ''}
          </td>`;
        }).join('');

        rows += `
          <tr style="background:${s % 2 === 0 ? '#f9f9f9' : '#fff'}">
            <td style="font-weight:bold;font-size:10px;padding:4px 6px;border:1px solid #ddd;background:#1E3A5F;color:white;text-align:center;">${formatS(s)}</td>
            <td style="font-size:9px;padding:4px 6px;border:1px solid #ddd;color:#607D8B;white-space:nowrap;">${dateStr}</td>
            ${cells}
          </tr>`;
      }

      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
* { margin:0;padding:0;box-sizing:border-box; }
body { font-family:Arial,sans-serif;font-size:10px;padding:10px; }
@page { size: A4 landscape; margin: 8mm; }
.header-title { background:#1E3A5F;color:white;text-align:center;padding:10px;font-size:14px;font-weight:bold;border-radius:4px;margin-bottom:4px; }
.header-sub { text-align:center;font-size:10px;color:#607D8B;margin-bottom:8px;font-style:italic; }
table { width:100%;border-collapse:collapse; }
</style>
</head><body>
<div class="header-title">PLANNING DES ASTREINTES ${selectedAnnee} — Saisir « Ast » pour marquer une astreinte</div>
<div class="header-sub">ONCF · PIC/DRIC · Arrondissement MI LGV · DT 102V LGV · Généré le ${new Date().toLocaleDateString('fr-FR')}</div>
<table>
  <thead>
    <tr>
      <th style="background:#0A1628;color:white;padding:6px;font-size:10px;border:1px solid #ccc;width:50px;">SEMAINE</th>
      <th style="background:#0A1628;color:white;padding:6px;font-size:10px;border:1px solid #ccc;width:100px;">Période</th>
      ${headerCols}
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>
</body></html>`;

      const { uri } = await Print.printToFileAsync({
        html, base64: false, width: 842, height: 595,
      });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Planning Astreintes ${selectedAnnee}`,
        UTI: 'com.adobe.pdf',
      });
    } catch {
      Alert.alert('Erreur', 'Impossible de générer le PDF');
    } finally {
      setGenerating(false);
    }
  };

  const generatePDFSemaine = async () => {
    setGenerating(true);
    try {
      const rows = equipeAstreinte.map((c, i) => `
        <tr style="background:${i % 2 === 0 ? '#E8F8F5' : '#fff'}">
          <td style="font-size:11px;padding:5px 8px;border:1px solid #ddd;text-align:center;font-weight:bold;">${i + 1}</td>
          <td style="font-size:11px;padding:5px 8px;border:1px solid #ddd;font-weight:bold;">${c.fullName}</td>
          <td style="font-size:11px;padding:5px 8px;border:1px solid #ddd;">${c.matricule}</td>
          <td style="font-size:11px;padding:5px 8px;border:1px solid #ddd;">${c.fonctionAssuree}</td>
          <td style="font-size:11px;padding:5px 8px;border:1px solid #ddd;">${c.telephone}</td>
          <td style="font-size:11px;padding:5px 8px;border:1px solid #ddd;">${c.residence}</td>
          <td style="font-size:11px;padding:5px 8px;border:1px solid #ddd;text-align:center;color:#27AE60;font-weight:bold;">✓ Astreinte</td>
        </tr>`).join('');

      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
* { margin:0;padding:0;box-sizing:border-box; }
body { font-family:Arial,sans-serif;font-size:11px;padding:16px; }
.header { background:#1E3A5F;color:white;text-align:center;padding:12px;font-size:14px;font-weight:bold;border-radius:4px;margin-bottom:10px; }
.info-bar { background:#E8F8F5;border:1px solid #16A085;border-radius:4px;padding:8px 12px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center; }
table { width:100%;border-collapse:collapse; }
th { background:#16A085;color:white;padding:6px 8px;font-size:11px;text-align:left;border:1px solid #ccc; }
</style>
</head><body>
<div class="header">ÉQUIPE ASTREINTE — COLLABORATEURS EN ASTREINTE POUR LA SEMAINE SÉLECTIONNÉE</div>
<div class="info-bar">
  <span><strong>Semaine sélectionnée :</strong> ${formatS(selectedSemaine)} — ${getDateSemaine(selectedSemaine, selectedAnnee)}</span>
  <span style="color:#16A085;font-weight:bold;">Collaborateurs en astreinte : ${equipeAstreinte.length}</span>
</div>
<table>
  <thead>
    <tr>
      <th style="width:40px;text-align:center;">N°</th>
      <th>Nom / Prénom</th>
      <th>Matricule</th>
      <th>Fonction</th>
      <th>Téléphone</th>
      <th>Adresse</th>
      <th style="text-align:center;">Statut</th>
    </tr>
  </thead>
  <tbody>
    ${rows || '<tr><td colspan="7" style="text-align:center;padding:20px;color:#607D8B;">Aucun collaborateur en astreinte cette semaine</td></tr>'}
  </tbody>
</table>
<div style="margin-top:12px;font-size:10px;color:#607D8B;text-align:right;">
  ONCF · PIC/DRIC · DT 102V LGV · Généré le ${new Date().toLocaleDateString('fr-FR')}
</div>
</body></html>`;

      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Astreinte ${formatS(selectedSemaine)} ${selectedAnnee}`,
        UTI: 'com.adobe.pdf',
      });
    } catch {
      Alert.alert('Erreur', 'Impossible de générer le PDF');
    } finally {
      setGenerating(false);
    }
  };

  // ===== ÉTAPE 0 — Années =====
  if (step === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerTitle}>Suivi Astreinte</Text>
              <Text style={styles.headerSub}>Planning des astreintes par année</Text>
            </View>
            {canEdit(userRole) && (
              <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddAnnee(true)}>
                <Text style={styles.addBtnText}>+ Année</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {loading
          ? <ActivityIndicator color="#E67E22" style={{ marginTop: 40 }} />
          : (
            <ScrollView style={styles.list}>
              {annees.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyIcon}>📡</Text>
                  <Text style={styles.emptyText}>Aucun planning créé</Text>
                  {canEdit(userRole) && <Text style={styles.emptySubText}>Appuyez sur "+ Année" pour commencer</Text>}
                </View>
              ) : (
                annees.map(annee => (
                  <TouchableOpacity key={annee} style={styles.anneeCard} onPress={() => handleSelectAnnee(annee)}>
                    <Text style={styles.anneeIcon}>📅</Text>
                    <Text style={styles.anneeText}>Planning Astreintes {annee}</Text>
                    <Text style={styles.arrow}>›</Text>
                  </TouchableOpacity>
                ))
              )}
              <View style={{ height: 40 }} />
            </ScrollView>
          )
        }

        <Modal visible={showAddAnnee} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Nouvelle Année</Text>
              <TextInput style={styles.modalInput} value={newAnnee} onChangeText={setNewAnnee}
                keyboardType="numeric" placeholder="Ex: 2026" placeholderTextColor="#607D8B" />
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
      </SafeAreaView>
    );
  }

  // ===== ÉTAPE 1 — Planning annuel =====
  if (step === 1) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { setStep(0); setPlanning([]); }}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerTitle}>Planning {selectedAnnee}</Text>
              <Text style={styles.headerSub}>{planning.length} collaborateur(s) · Appuyez sur une cellule pour toggler</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {canEdit(userRole) && (
                <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddCollab(true)}>
                  <Text style={styles.addBtnText}>+ Collab</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.pdfBtn, generating && { opacity: 0.6 }]} onPress={generatePDF} disabled={generating}>
                {generating ? <ActivityIndicator color="#0A1628" size="small" /> : <Text style={styles.pdfBtnText}>📄 PDF</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Bouton Vue Semaine */}
        <View style={styles.viewSemaineBar}>
          <Text style={styles.viewSemaineLabel}>Vue par semaine :</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {Array.from({ length: 53 }, (_, i) => i + 1).map(s => (
              <TouchableOpacity key={s} style={styles.semaineChip} onPress={() => handleVoirSemaine(s)}>
                <Text style={styles.semaineChipText}>{formatS(s)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {loading
          ? <ActivityIndicator color="#E67E22" style={{ marginTop: 40 }} />
          : (
            <ScrollView style={{ flex: 1 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator nestedScrollEnabled>
                <View>
                  {/* En-tête : noms collaborateurs */}
                  <View style={styles.tableHeader}>
                    <View style={[styles.thFixed, { width: 60 }]}>
                      <Text style={styles.thFixedText}>SEM.</Text>
                    </View>
                    <View style={[styles.thFixed, { width: 100 }]}>
                      <Text style={styles.thFixedText}>Période</Text>
                    </View>
                    {planning.map((c, i) => (
                      <View key={c.collaborateurId} style={[styles.thCollab, { width: 80, backgroundColor: COL_COLORS[i % COL_COLORS.length] }]}>
                        <Text style={styles.thCollabText} numberOfLines={2}>{c.fullName}</Text>
                        {canEdit(userRole) && (
                          <TouchableOpacity onPress={() => handleRemoveCollab(c)}>
                            <Text style={{ color: '#E74C3C', fontSize: 10 }}>✕</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </View>

                  {/* Lignes semaines */}
                  {Array.from({ length: 53 }, (_, i) => i + 1).map(s => (
                    <View key={s} style={[styles.dataRow, s % 2 === 0 && styles.dataRowAlt]}>
                      <TouchableOpacity style={[styles.semaineCell, { width: 60 }]} onPress={() => handleVoirSemaine(s)}>
                        <Text style={styles.semaineCellText}>{formatS(s)}</Text>
                      </TouchableOpacity>
                      <View style={[styles.periodeCell, { width: 100 }]}>
                        <Text style={styles.periodeCellText}>{getDateSemaine(s, selectedAnnee)}</Text>
                      </View>
                      {planning.map((c, i) => {
                        const isAst = c.semaines.has(s);
                        return (
                          <TouchableOpacity
                            key={c.collaborateurId}
                            style={[styles.astCell, { width: 80, backgroundColor: isAst ? '#FFF3E020' : 'transparent' }]}
                            onPress={() => toggleAstreinte(c.collaborateurId, s, isAst)}
                            disabled={!canEdit(userRole) || saving}
                          >
                            {isAst && <Text style={styles.astText}>Ast</Text>}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ))}
                </View>
              </ScrollView>
              <View style={{ height: 40 }} />
            </ScrollView>
          )
        }

        {/* Modal Ajouter Collaborateur */}
        <Modal visible={showAddCollab} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { maxHeight: '80%' }]}>
              <Text style={styles.modalTitle}>Ajouter collaborateur</Text>
              <Text style={styles.modalSubtitle}>Planning {selectedAnnee}</Text>
              <ScrollView style={{ maxHeight: 350, marginBottom: 12 }}>
                {allUsers
                  .filter(u => !planning.find(p => p.collaborateurId === u.id))
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
      </SafeAreaView>
    );
  }

  // ===== ÉTAPE 2 — Vue par semaine =====
  if (step === 2) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep(1)}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerTitle}>Équipe Astreinte</Text>
              <Text style={styles.headerSub}>{formatS(selectedSemaine)} · {getDateSemaine(selectedSemaine, selectedAnnee)}</Text>
            </View>
            <TouchableOpacity style={[styles.pdfBtn, generating && { opacity: 0.6 }]} onPress={generatePDFSemaine} disabled={generating}>
              {generating ? <ActivityIndicator color="#0A1628" size="small" /> : <Text style={styles.pdfBtnText}>📄 PDF</Text>}
            </TouchableOpacity>
          </View>
        </View>

        {/* Sélecteur semaine */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.moisScroll}>
          {Array.from({ length: 53 }, (_, i) => i + 1).map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.moisBtn, selectedSemaine === s && styles.moisBtnActive]}
              onPress={() => {
                setSelectedSemaine(s);
                loadEquipeSemaine(selectedAnnee, s);
              }}
            >
              <Text style={[styles.moisBtnText, selectedSemaine === s && styles.moisBtnTextActive]}>
                {formatS(s)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Info bar */}
        <View style={styles.infoBar}>
          <Text style={styles.infoBarLeft}>
            📅 {formatS(selectedSemaine)} — {getDateSemaine(selectedSemaine, selectedAnnee)}
          </Text>
          <Text style={styles.infoBarRight}>
            {loading ? '...' : `${equipeAstreinte.length} collaborateur(s) en astreinte`}
          </Text>
        </View>

        {loading
          ? <ActivityIndicator color="#E67E22" style={{ marginTop: 40 }} />
          : (
            <ScrollView style={styles.list}>
              {/* En-tête */}
              <View style={styles.equipeHeader}>
                <Text style={[styles.equipeHeaderCell, { flex: 0.3 }]}>N°</Text>
                <Text style={[styles.equipeHeaderCell, { flex: 1.5 }]}>Nom / Prénom</Text>
                <Text style={[styles.equipeHeaderCell, { flex: 0.8 }]}>Matricule</Text>
                <Text style={[styles.equipeHeaderCell, { flex: 0.8 }]}>Fonction</Text>
                <Text style={[styles.equipeHeaderCell, { flex: 0.9 }]}>Téléphone</Text>
                <Text style={[styles.equipeHeaderCell, { flex: 0.8 }]}>Adresse</Text>
                <Text style={[styles.equipeHeaderCell, { flex: 0.7 }]}>Statut</Text>
              </View>

              {equipeAstreinte.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyIcon}>📡</Text>
                  <Text style={styles.emptyText}>Aucun collaborateur en astreinte</Text>
                  <Text style={styles.emptySubText}>cette semaine</Text>
                </View>
              ) : (
                equipeAstreinte.map((c, i) => (
                  <View key={c.collaborateurId} style={[styles.equipeRow, i % 2 === 0 ? styles.equipeRowEven : styles.equipeRowOdd]}>
                    <Text style={[styles.equipeCell, { flex: 0.3, fontWeight: 'bold', color: '#E67E22' }]}>{i + 1}</Text>
                    <Text style={[styles.equipeCell, { flex: 1.5, fontWeight: 'bold' }]}>{c.fullName}</Text>
                    <Text style={[styles.equipeCell, { flex: 0.8 }]}>{c.matricule}</Text>
                    <Text style={[styles.equipeCell, { flex: 0.8 }]}>{c.fonctionAssuree}</Text>
                    <Text style={[styles.equipeCell, { flex: 0.9 }]}>{c.telephone}</Text>
                    <Text style={[styles.equipeCell, { flex: 0.8 }]}>{c.residence}</Text>
                    <View style={{ flex: 0.7, alignItems: 'center' }}>
                      <View style={styles.astBadge}>
                        <Text style={styles.astBadgeText}>✓ Ast</Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
              <View style={{ height: 40 }} />
            </ScrollView>
          )
        }
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A1628' },
  header: {
    backgroundColor: '#0F2137', padding: 20,
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20, marginBottom: 8,
  },
  backText: { color: '#C9A84C', fontSize: 14, marginBottom: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  headerSub: { color: '#607D8B', fontSize: 10, marginTop: 2 },

  addBtn: { backgroundColor: '#E67E22', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  addBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 12 },
  pdfBtn: { backgroundColor: '#C9A84C', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  pdfBtnText: { color: '#0A1628', fontWeight: 'bold', fontSize: 12 },

  list: { paddingHorizontal: 12 },
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  emptySubText: { color: '#607D8B', fontSize: 12, marginTop: 4 },

  anneeCard: {
    backgroundColor: '#0F2137', borderRadius: 12, padding: 18, marginBottom: 10,
    borderLeftWidth: 4, borderLeftColor: '#E67E22',
    flexDirection: 'row', alignItems: 'center',
  },
  anneeIcon: { fontSize: 28, marginRight: 14 },
  anneeText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', flex: 1 },
  arrow: { color: '#E67E22', fontSize: 22, fontWeight: 'bold' },

  viewSemaineBar: {
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: '#0F2137', marginBottom: 4,
  },
  viewSemaineLabel: { color: '#607D8B', fontSize: 10, marginBottom: 4 },
  semaineChip: {
    backgroundColor: '#1E3A5F', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4, marginRight: 4,
  },
  semaineChipText: { color: '#4A90D9', fontSize: 10, fontWeight: 'bold' },

  // Tableau
  tableHeader: { flexDirection: 'row', backgroundColor: '#0A1628' },
  thFixed: {
    backgroundColor: '#0A1628', padding: 6,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 0.5, borderColor: '#2A4060',
  },
  thFixedText: { color: '#FFFFFF', fontSize: 9, fontWeight: 'bold', textAlign: 'center' },
  thCollab: {
    padding: 6, justifyContent: 'center', alignItems: 'center',
    borderWidth: 0.5, borderColor: '#2A4060',
  },
  thCollabText: { color: '#1E3A5F', fontSize: 9, fontWeight: 'bold', textAlign: 'center' },

  dataRow: {
    flexDirection: 'row', backgroundColor: '#0F2137',
    borderBottomWidth: 0.5, borderBottomColor: '#2A4060',
  },
  dataRowAlt: { backgroundColor: '#0D1B2A' },
  semaineCell: {
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#1E3A5F', borderRightWidth: 0.5, borderRightColor: '#2A4060',
    paddingVertical: 8,
  },
  semaineCellText: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' },
  periodeCell: {
    justifyContent: 'center', paddingHorizontal: 4,
    borderRightWidth: 0.5, borderRightColor: '#2A4060',
  },
  periodeCellText: { color: '#607D8B', fontSize: 8 },
  astCell: {
    justifyContent: 'center', alignItems: 'center',
    borderRightWidth: 0.5, borderRightColor: '#2A4060',
    paddingVertical: 8, minHeight: 36,
  },
  astText: { color: '#E67E22', fontSize: 12, fontWeight: 'bold' },

  // Vue semaine
  moisScroll: { paddingHorizontal: 8, marginBottom: 4, flexGrow: 0 },
  moisBtn: {
    paddingHorizontal: 10, paddingVertical: 5, marginRight: 4,
    borderRadius: 12, backgroundColor: '#0F2137',
    borderWidth: 1, borderColor: '#2A4060',
  },
  moisBtnActive: { backgroundColor: '#E67E22', borderColor: '#E67E22' },
  moisBtnText: { color: '#607D8B', fontSize: 10 },
  moisBtnTextActive: { color: '#FFFFFF', fontWeight: 'bold' },

  infoBar: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: '#16A08515', marginBottom: 6,
  },
  infoBarLeft: { color: '#607D8B', fontSize: 11 },
  infoBarRight: { color: '#E67E22', fontSize: 11, fontWeight: 'bold' },

  equipeHeader: {
    flexDirection: 'row', backgroundColor: '#16A085',
    paddingVertical: 8, paddingHorizontal: 8,
    borderRadius: 6, marginBottom: 4,
  },
  equipeHeaderCell: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold', textAlign: 'center' },
  equipeRow: {
    flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 8,
    borderRadius: 4, marginBottom: 2, alignItems: 'center',
  },
  equipeRowEven: { backgroundColor: '#0F2137' },
  equipeRowOdd: { backgroundColor: '#0D1B2A' },
  equipeCell: { color: '#FFFFFF', fontSize: 10 },

  astBadge: {
    backgroundColor: '#27AE6020', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 3,
    borderWidth: 1, borderColor: '#27AE60',
  },
  astBadgeText: { color: '#27AE60', fontSize: 9, fontWeight: 'bold' },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: '#00000080', justifyContent: 'center', alignItems: 'center' },
  modalBox: {
    backgroundColor: '#0F2137', borderRadius: 16, padding: 24,
    width: '85%', borderWidth: 1, borderColor: '#E67E22',
  },
  modalTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  modalSubtitle: { color: '#607D8B', fontSize: 12, marginBottom: 12 },
  modalInput: {
    backgroundColor: '#1A2F4A', borderWidth: 1, borderColor: '#2A4060',
    borderRadius: 8, padding: 12, color: '#FFFFFF', fontSize: 16, marginBottom: 8,
  },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 8 },
  modalCancel: { flex: 1, backgroundColor: '#1A2F4A', borderRadius: 8, padding: 12, alignItems: 'center' },
  modalCancelText: { color: '#607D8B', fontWeight: 'bold' },
  modalConfirm: { flex: 1, backgroundColor: '#E67E22', borderRadius: 8, padding: 12, alignItems: 'center' },
  modalConfirmText: { color: '#FFFFFF', fontWeight: 'bold' },

  collabSelectItem: {
    backgroundColor: '#1A2F4A', borderRadius: 8, padding: 10,
    marginBottom: 6, borderWidth: 1, borderColor: '#2A4060',
  },
  collabSelectItemActive: { borderColor: '#E67E22', backgroundColor: '#E67E2220' },
  collabSelectName: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold' },
  collabSelectMat: { color: '#607D8B', fontSize: 11, marginTop: 2 },
});