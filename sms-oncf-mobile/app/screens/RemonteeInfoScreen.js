import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert, Modal, TextInput, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateAndSharePDF } from '../utils/pdfUtils';
import { API_URL } from '../services/authService';

const R_API = API_URL.replace('/auth', '/remontee');

const canViewAll = (role) => role === 'ADMIN' || role === 'CGPX' || role === 'CSPR' || role === 'CET';
// Alias : gestion campagnes = 4 rôles (AGENT exclu)
const canManage = canViewAll;

export default function RemonteeInfoScreen({ navigation }) {
  const [step, setStep] = useState(0); // 0=campagnes, 1=formulaire, 2=résultats
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [userRole, setUserRole] = useState('');

  const [campagnes, setCampagnes] = useState([]);
  const [selectedCampagne, setSelectedCampagne] = useState(null);
  const [maReponse, setMaReponse] = useState(null);
  const [resultats, setResultats] = useState([]);

  const [form, setForm] = useState({
    dateReponse: new Date().toLocaleDateString('fr-FR'),
    problemesRencontres: '',
    commentairesCDT: '',
    solutionsProposees: '',
  });

  const [showAddCampagne, setShowAddCampagne] = useState(false);
  const [newExercice, setNewExercice] = useState(new Date().getFullYear().toString());
  const [newDescription, setNewDescription] = useState('');

  const getToken = async () => await AsyncStorage.getItem('token');

  useEffect(() => { loadInitial(); }, []);

  const loadInitial = async () => {
    setLoading(true);
    try {
      const userData = await AsyncStorage.getItem('user');
      const parsed = userData ? JSON.parse(userData) : {};
      setUserRole(parsed.role || '');
      const token = await getToken();
      const res = await axios.get(`${R_API}/campagnes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCampagnes(res.data);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger les campagnes');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampagne = async () => {
    const ex = parseInt(newExercice);
    if (isNaN(ex) || ex < 2020 || ex > 2100) { Alert.alert('Erreur', 'Exercice invalide'); return; }
    try {
      const token = await getToken();
      await axios.post(`${R_API}/campagnes`, {
        exercice: ex,
        description: newDescription || `Remontée d'information ${ex}`,
        statut: 'FERME',
      }, { headers: { Authorization: `Bearer ${token}` } });
      setShowAddCampagne(false);
      setNewExercice(new Date().getFullYear().toString());
      setNewDescription('');
      loadInitial();
    } catch {
      Alert.alert('Erreur', 'Impossible de créer (exercice déjà existant ?)');
    }
  };

  const handleToggleStatut = async (campagne) => {
    const newStatut = campagne.statut === 'OUVERT' ? 'FERME' : 'OUVERT';
    const msg = newStatut === 'OUVERT'
      ? `Ouvrir la campagne ${campagne.exercice} ?`
      : `Fermer la campagne ${campagne.exercice} ?`;
    const confirmed = Platform.OS === 'web'
      ? window.confirm(msg)
      : await new Promise(resolve => Alert.alert('Confirmation', msg, [
          { text: 'Annuler', style: 'cancel', onPress: () => resolve(false) },
          { text: newStatut === 'OUVERT' ? 'Ouvrir' : 'Fermer', onPress: () => resolve(true) },
        ]));
    if (!confirmed) return;
    try {
      const token = await getToken();
      await axios.patch(`${R_API}/campagnes/${campagne.id}/statut?statut=${newStatut}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadInitial();
    } catch { Alert.alert('Erreur', 'Impossible de modifier le statut'); }
  };

  const handleDeleteCampagne = async (campagne) => {
    const confirmed = Platform.OS === 'web'
      ? window.confirm(`Supprimer la campagne ${campagne.exercice} et toutes ses réponses ?`)
      : await new Promise(resolve => Alert.alert('Confirmation', `Supprimer la campagne ${campagne.exercice} et toutes ses réponses ?`, [
          { text: 'Annuler', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Supprimer', style: 'destructive', onPress: () => resolve(true) },
        ]));
    if (!confirmed) return;
    try {
      const token = await getToken();
      await axios.delete(`${R_API}/campagnes/${campagne.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadInitial();
    } catch { Alert.alert('Erreur', 'Impossible de supprimer'); }
  };

  const handleOpenForm = async (campagne) => {
    setSelectedCampagne(campagne);
    setLoading(true);
    try {
      const token = await getToken();
      const res = await axios.get(`${R_API}/ma-reponse?exercice=${campagne.exercice}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data) {
        setMaReponse(res.data);
        setForm({
          dateReponse: res.data.dateReponse || new Date().toLocaleDateString('fr-FR'),
          problemesRencontres: res.data.problemesRencontres || '',
          commentairesCDT: res.data.commentairesCDT || '',
          solutionsProposees: res.data.solutionsProposees || '',
        });
      } else {
        setMaReponse(null);
        setForm({ dateReponse: new Date().toLocaleDateString('fr-FR'), problemesRencontres: '', commentairesCDT: '', solutionsProposees: '' });
      }
      setStep(1);
    } catch {
      setMaReponse(null);
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  const handleViewResultats = async (campagne) => {
    setSelectedCampagne(campagne);
    setLoading(true);
    try {
      const token = await getToken();
      const res = await axios.get(`${R_API}/resultats?exercice=${campagne.exercice}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setResultats(res.data);
      setStep(2);
    } catch { Alert.alert('Erreur', 'Impossible de charger les résultats'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    if (!form.problemesRencontres.trim()) {
      Alert.alert('Incomplet', 'Le champ "Problèmes rencontrés" est obligatoire'); return;
    }
    setSubmitting(true);
    try {
      const token = await getToken();
      await axios.post(R_API, {
        exercice: selectedCampagne.exercice,
        dateReponse: form.dateReponse,
        problemesRencontres: form.problemesRencontres,
        commentairesCDT: form.commentairesCDT,
        solutionsProposees: form.solutionsProposees,
      }, { headers: { Authorization: `Bearer ${token}` } });
      Alert.alert('Succès', maReponse ? 'Réponse mise à jour !' : 'Réponse envoyée !', [
        { text: 'OK', onPress: () => { setStep(0); loadInitial(); } }
      ]);
    } catch (e) {
      const msg = e?.response?.data || 'Impossible de soumettre';
      Alert.alert('Erreur', typeof msg === 'string' ? msg : 'Erreur');
    } finally { setSubmitting(false); }
  };

  // Calculer les stats pour les graphes
  const getStats = () => {
    const total = resultats.length;
    if (total === 0) return null;

    // Compter les réponses non vides pour chaque champ
    const avecProblemes = resultats.filter(r => r.problemesRencontres?.trim()).length;
    const avecCommentaires = resultats.filter(r => r.commentairesCDT?.trim()).length;
    const avecSolutions = resultats.filter(r => r.solutionsProposees?.trim()).length;

    return {
      total,
      avecProblemes,
      avecCommentaires,
      avecSolutions,
      pctProblemes: Math.round((avecProblemes / total) * 100),
      pctCommentaires: Math.round((avecCommentaires / total) * 100),
      pctSolutions: Math.round((avecSolutions / total) * 100),
    };
  };

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const stats = getStats();
      const total = resultats.length;

      // Sections textes regroupés
      const problemesHtml = resultats
        .filter(r => r.problemesRencontres?.trim())
        .map((r, i) => `<div style="padding:6px 8px;border-left:3px solid #E74C3C;background:#fff3f3;margin-bottom:6px;border-radius:0 4px 4px 0;font-size:10px;">
          <span style="color:#607D8B;font-size:9px;">Réponse anonyme #${i + 1}</span><br/>
          ${r.problemesRencontres}
        </div>`).join('');

      const commentairesHtml = resultats
        .filter(r => r.commentairesCDT?.trim())
        .map((r, i) => `<div style="padding:6px 8px;border-left:3px solid #E67E22;background:#fff8f0;margin-bottom:6px;border-radius:0 4px 4px 0;font-size:10px;">
          <span style="color:#607D8B;font-size:9px;">Réponse anonyme #${i + 1}</span><br/>
          ${r.commentairesCDT}
        </div>`).join('');

      const solutionsHtml = resultats
        .filter(r => r.solutionsProposees?.trim())
        .map((r, i) => `<div style="padding:6px 8px;border-left:3px solid #27AE60;background:#f0fff4;margin-bottom:6px;border-radius:0 4px 4px 0;font-size:10px;">
          <span style="color:#607D8B;font-size:9px;">Réponse anonyme #${i + 1}</span><br/>
          ${r.solutionsProposees}
        </div>`).join('');

      const barHtml = (label, count, pct, color) => `
        <div style="margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
            <span style="font-size:11px;font-weight:bold;">${label}</span>
            <span style="font-size:11px;color:${color};font-weight:bold;">${count}/${total} (${pct}%)</span>
          </div>
          <div style="background:#eee;border-radius:4px;height:16px;">
            <div style="width:${pct}%;background:${color};height:16px;border-radius:4px;"></div>
          </div>
        </div>`;

      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
* { margin:0;padding:0;box-sizing:border-box; }
body { font-family:Arial,sans-serif;font-size:10px;color:#1a1a2e;padding:14px; }
@page { size:A4;margin:10mm; }
h3 { font-size:12px;color:#1E3A5F;border-bottom:2px solid #E67E22;padding-bottom:4px;margin:14px 0 8px; }
</style>
</head><body>

<div style="background:#0A1628;color:white;padding:12px 16px;border-radius:6px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;">
  <div>
    <div style="font-size:18px;font-weight:bold;color:#C9A84C;letter-spacing:2px;">ONCF</div>
    <div style="font-size:10px;">PIC/DRIC · Arrondissement MI LGV · DT 102V LGV</div>
  </div>
  <div style="text-align:right;">
    <div style="font-weight:bold;font-size:14px;">Remontée d'information</div>
    <div style="color:#E67E22;">Exercice ${selectedCampagne?.exercice} — ${total} réponses anonymes</div>
  </div>
</div>

<h3>📊 Vue d'ensemble</h3>
<div style="background:#f8f9fa;border-radius:6px;padding:12px;margin-bottom:14px;">
  ${barHtml('Réponses avec problèmes rencontrés', stats?.avecProblemes || 0, stats?.pctProblemes || 0, '#E74C3C')}
  ${barHtml('Réponses avec commentaires CDT', stats?.avecCommentaires || 0, stats?.pctCommentaires || 0, '#E67E22')}
  ${barHtml('Réponses avec solutions proposées', stats?.avecSolutions || 0, stats?.pctSolutions || 0, '#27AE60')}
</div>

<h3>🔴 Problèmes rencontrés (${resultats.filter(r => r.problemesRencontres?.trim()).length} réponses)</h3>
${problemesHtml || '<p style="color:#607D8B;font-size:10px;">Aucune réponse</p>'}

<h3>🟠 Commentaires supplémentaires du CDT (${resultats.filter(r => r.commentairesCDT?.trim()).length} réponses)</h3>
${commentairesHtml || '<p style="color:#607D8B;font-size:10px;">Aucune réponse</p>'}

<h3>🟢 Solutions proposées (${resultats.filter(r => r.solutionsProposees?.trim()).length} réponses)</h3>
${solutionsHtml || '<p style="color:#607D8B;font-size:10px;">Aucune réponse</p>'}

<div style="margin-top:14px;text-align:right;font-size:9px;color:#607D8B;border-top:1px solid #eee;padding-top:8px;">
  Données 100% anonymes · Généré le ${new Date().toLocaleDateString('fr-FR')}
</div>
</body></html>`;

      await generateAndSharePDF(html, { dialogTitle: `Remontée Info ${selectedCampagne?.exercice}` });
    } catch { Alert.alert('Erreur', 'Impossible de générer le PDF'); }
    finally { setGenerating(false); }
  };

  // ===== ÉTAPE 0 — Campagnes =====
  if (step === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerTitle}>📢 Remontée d'information</Text>
              <Text style={styles.headerSub}>Collecte anonyme des retours terrain</Text>
            </View>
            {canManage(userRole) && (
              <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddCampagne(true)}>
                <Text style={styles.addBtnText}>+ Campagne</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {loading ? <ActivityIndicator color="#E67E22" style={{ marginTop: 40 }} /> : (
          <ScrollView style={styles.list}>
            {campagnes.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={styles.emptyText}>
                  {canManage(userRole) ? 'Aucune campagne créée' : 'Aucune campagne disponible pour le moment'}
                </Text>
                {canManage(userRole) && (
                  <Text style={styles.emptySubText}>Créez et ouvrez une campagne pour que les collaborateurs puissent soumettre leurs remontées</Text>
                )}
              </View>
            ) : campagnes.map(c => (
              <View key={c.id} style={[styles.campagneCard, { borderLeftColor: c.statut === 'OUVERT' ? '#E67E22' : '#607D8B' }]}>
                <View style={styles.campagneHeader}>
                  <View style={styles.campagneTitleRow}>
                    <Text style={styles.campagneExercice}>Exercice {c.exercice}</Text>
                    <View style={[styles.statutBadge, {
                      backgroundColor: c.statut === 'OUVERT' ? '#E67E2220' : '#60607D20',
                      borderColor: c.statut === 'OUVERT' ? '#E67E22' : '#607D8B'
                    }]}>
                      <Text style={[styles.statutText, { color: c.statut === 'OUVERT' ? '#E67E22' : '#607D8B' }]}>
                        {c.statut === 'OUVERT' ? '🔓 Ouvert' : '🔒 Fermé'}
                      </Text>
                    </View>
                  </View>
                  {c.description && <Text style={styles.campagneDesc}>{c.description}</Text>}
                </View>
                <View style={styles.campagneActions}>
                  {c.statut === 'OUVERT' && (
                    <TouchableOpacity style={styles.fillBtn} onPress={() => handleOpenForm(c)}>
                      <Text style={styles.fillBtnText}>📝 {canViewAll(userRole) ? 'Ma remontée' : 'Soumettre'}</Text>
                    </TouchableOpacity>
                  )}
                  {c.statut === 'FERME' && !canViewAll(userRole) && (
                    <TouchableOpacity style={styles.viewMyBtn} onPress={() => handleOpenForm(c)}>
                      <Text style={styles.viewMyBtnText}>👁 Ma réponse</Text>
                    </TouchableOpacity>
                  )}
                  {canManage(userRole) && (
                    <>
                      <TouchableOpacity
                        style={[styles.toggleBtn, {
                          backgroundColor: c.statut === 'OUVERT' ? '#E74C3C20' : '#27AE6020',
                          borderColor: c.statut === 'OUVERT' ? '#E74C3C' : '#27AE60'
                        }]}
                        onPress={() => handleToggleStatut(c)}
                      >
                        <Text style={[styles.toggleBtnText, { color: c.statut === 'OUVERT' ? '#E74C3C' : '#27AE60' }]}>
                          {c.statut === 'OUVERT' ? '🔒 Fermer' : '🔓 Ouvrir'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteCampagne(c)}>
                        <Text style={styles.deleteBtnText}>🗑</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {canViewAll(userRole) && (
                    <TouchableOpacity style={styles.resultsBtn} onPress={() => handleViewResultats(c)}>
                      <Text style={styles.resultsBtnText}>📊 Résultats</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
            <View style={{ height: 40 }} />
          </ScrollView>
        )}

        <Modal visible={showAddCampagne} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Nouvelle Campagne</Text>
              <Text style={styles.modalSubtitle}>La campagne sera fermée par défaut</Text>
              <Text style={styles.fieldLabel}>Exercice (année) *</Text>
              <TextInput style={styles.modalInput} value={newExercice} onChangeText={setNewExercice}
                keyboardType="numeric" placeholder="Ex: 2026" placeholderTextColor="#607D8B" />
              <Text style={styles.fieldLabel}>Description (optionnel)</Text>
              <TextInput style={styles.modalInput} value={newDescription} onChangeText={setNewDescription}
                placeholder="Ex: Remontée d'information 2026" placeholderTextColor="#607D8B" />
              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.modalCancel} onPress={() => setShowAddCampagne(false)}>
                  <Text style={styles.modalCancelText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalConfirm} onPress={handleCreateCampagne}>
                  <Text style={styles.modalConfirmText}>Créer</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // ===== ÉTAPE 1 — Formulaire =====
  if (step === 1) {
    const isReadOnly = selectedCampagne?.statut === 'FERME';
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { setStep(0); setMaReponse(null); }}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isReadOnly ? '👁 Ma réponse' : maReponse ? '✏️ Modifier ma remontée' : '📝 Nouvelle remontée'}
          </Text>
          <Text style={styles.headerSub}>
            Exercice {selectedCampagne?.exercice}
            {isReadOnly ? ' · Fermé (lecture seule)' : maReponse ? ' · Modifier votre réponse' : ''}
          </Text>
        </View>
        <ScrollView style={styles.formContainer}>

          <View style={styles.anonBox}>
            <Text style={styles.anonIcon}>🔒</Text>
            <Text style={styles.anonText}>Votre réponse est anonyme. Votre nom ne sera pas affiché dans les résultats.</Text>
          </View>

          <View style={styles.qCard}>
            <Text style={styles.qLabel}>1. Date *</Text>
            <TextInput style={[styles.input, isReadOnly && styles.inputReadOnly]}
              value={form.dateReponse} onChangeText={v => setForm(p => ({ ...p, dateReponse: v }))}
              placeholder="JJ/MM/AAAA" placeholderTextColor="#607D8B" editable={!isReadOnly} />
          </View>

          <View style={styles.qCard}>
            <Text style={styles.qLabel}>2. Problèmes rencontrés (Remontée par les collaborateurs) *</Text>
            <TextInput style={[styles.input, { height: 110, textAlignVertical: 'top' }, isReadOnly && styles.inputReadOnly]}
              value={form.problemesRencontres}
              onChangeText={v => setForm(p => ({ ...p, problemesRencontres: v }))}
              multiline placeholder="Décrivez les problèmes rencontrés sur le terrain..."
              placeholderTextColor="#607D8B" editable={!isReadOnly} />
          </View>

          <View style={styles.qCard}>
            <Text style={styles.qLabel}>3. Commentaires supplémentaires du CDT</Text>
            <TextInput style={[styles.input, { height: 110, textAlignVertical: 'top' }, isReadOnly && styles.inputReadOnly]}
              value={form.commentairesCDT}
              onChangeText={v => setForm(p => ({ ...p, commentairesCDT: v }))}
              multiline placeholder="Commentaires du Chef de District..."
              placeholderTextColor="#607D8B" editable={!isReadOnly} />
          </View>

          <View style={styles.qCard}>
            <Text style={styles.qLabel}>4. Solutions proposées</Text>
            <TextInput style={[styles.input, { height: 110, textAlignVertical: 'top' }, isReadOnly && styles.inputReadOnly]}
              value={form.solutionsProposees}
              onChangeText={v => setForm(p => ({ ...p, solutionsProposees: v }))}
              multiline placeholder="Proposez des solutions..."
              placeholderTextColor="#607D8B" editable={!isReadOnly} />
          </View>

          {!isReadOnly && (
            <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
              onPress={handleSubmit} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" /> :
                <Text style={styles.submitBtnText}>
                  {maReponse ? '✅ Mettre à jour ma remontée' : '✅ Soumettre ma remontée'}
                </Text>
              }
            </TouchableOpacity>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ===== ÉTAPE 2 — Résultats avec graphes =====
  if (step === 2) {
    const stats = getStats();
    const total = resultats.length;

    const StatBar = ({ label, count, pct, color, icon }) => (
      <View style={styles.statBarContainer}>
        <View style={styles.statBarHeader}>
          <Text style={styles.statBarLabel}>{icon} {label}</Text>
          <Text style={[styles.statBarVal, { color }]}>{count}/{total} ({pct}%)</Text>
        </View>
        <View style={styles.statBarTrack}>
          <View style={[styles.statBarFill, { width: `${pct}%`, backgroundColor: color }]} />
        </View>
      </View>
    );

    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { setStep(0); setResultats([]); }}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerTitle}>Résultats — Exercice {selectedCampagne?.exercice}</Text>
              <Text style={styles.headerSub}>{total} réponse(s) anonymes</Text>
            </View>
            <TouchableOpacity style={[styles.pdfBtn, generating && { opacity: 0.6 }]}
              onPress={generatePDF} disabled={generating}>
              {generating ? <ActivityIndicator color="#0A1628" size="small" /> :
                <Text style={styles.pdfBtnText}>📄 PDF</Text>}
            </TouchableOpacity>
          </View>
        </View>

        {loading ? <ActivityIndicator color="#E67E22" style={{ marginTop: 40 }} /> : (
          <ScrollView style={styles.list}>
            {total === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyIcon}>📊</Text>
                <Text style={styles.emptyText}>Aucune réponse pour cet exercice</Text>
              </View>
            ) : (
              <>
                {/* Vue d'ensemble */}
                <View style={styles.overviewCard}>
                  <Text style={styles.overviewTitle}>📊 Vue d'ensemble</Text>
                  <Text style={styles.overviewSub}>{total} réponse(s) anonymes reçue(s)</Text>
                  {stats && (
                    <View style={{ marginTop: 12 }}>
                      <StatBar label="Avec problèmes" count={stats.avecProblemes} pct={stats.pctProblemes} color="#E74C3C" icon="🔴" />
                      <StatBar label="Avec commentaires CDT" count={stats.avecCommentaires} pct={stats.pctCommentaires} color="#E67E22" icon="🟠" />
                      <StatBar label="Avec solutions proposées" count={stats.avecSolutions} pct={stats.pctSolutions} color="#27AE60" icon="🟢" />
                    </View>
                  )}
                </View>

                {/* Section Problèmes */}
                {resultats.filter(r => r.problemesRencontres?.trim()).length > 0 && (
                  <View style={styles.sectionCard}>
                    <View style={[styles.sectionCardHeader, { borderLeftColor: '#E74C3C' }]}>
                      <Text style={styles.sectionCardTitle}>🔴 Problèmes rencontrés</Text>
                      <Text style={styles.sectionCardCount}>{resultats.filter(r => r.problemesRencontres?.trim()).length} réponse(s)</Text>
                    </View>
                    {resultats.filter(r => r.problemesRencontres?.trim()).map((r, i) => (
                      <View key={r.id} style={[styles.reponseCard, { borderLeftColor: '#E74C3C' }]}>
                        <Text style={styles.anonLabel}>🔒 Réponse anonyme #{i + 1}</Text>
                        <Text style={styles.reponseText}>{r.problemesRencontres}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Section Commentaires CDT */}
                {resultats.filter(r => r.commentairesCDT?.trim()).length > 0 && (
                  <View style={styles.sectionCard}>
                    <View style={[styles.sectionCardHeader, { borderLeftColor: '#E67E22' }]}>
                      <Text style={styles.sectionCardTitle}>🟠 Commentaires CDT</Text>
                      <Text style={styles.sectionCardCount}>{resultats.filter(r => r.commentairesCDT?.trim()).length} réponse(s)</Text>
                    </View>
                    {resultats.filter(r => r.commentairesCDT?.trim()).map((r, i) => (
                      <View key={r.id} style={[styles.reponseCard, { borderLeftColor: '#E67E22' }]}>
                        <Text style={styles.anonLabel}>🔒 Réponse anonyme #{i + 1}</Text>
                        <Text style={styles.reponseText}>{r.commentairesCDT}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Section Solutions */}
                {resultats.filter(r => r.solutionsProposees?.trim()).length > 0 && (
                  <View style={styles.sectionCard}>
                    <View style={[styles.sectionCardHeader, { borderLeftColor: '#27AE60' }]}>
                      <Text style={styles.sectionCardTitle}>🟢 Solutions proposées</Text>
                      <Text style={styles.sectionCardCount}>{resultats.filter(r => r.solutionsProposees?.trim()).length} réponse(s)</Text>
                    </View>
                    {resultats.filter(r => r.solutionsProposees?.trim()).map((r, i) => (
                      <View key={r.id} style={[styles.reponseCard, { borderLeftColor: '#27AE60' }]}>
                        <Text style={styles.anonLabel}>🔒 Réponse anonyme #{i + 1}</Text>
                        <Text style={styles.reponseText}>{r.solutionsProposees}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A1628' },
  header: { backgroundColor: '#0F2137', padding: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, marginBottom: 12 },
  backText: { color: '#C9A84C', fontSize: 14, marginBottom: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  headerSub: { color: '#607D8B', fontSize: 11, marginTop: 2 },

  addBtn: { backgroundColor: '#E67E22', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  addBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 12 },
  pdfBtn: { backgroundColor: '#C9A84C', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  pdfBtnText: { color: '#0A1628', fontWeight: 'bold', fontSize: 13 },

  list: { paddingHorizontal: 16 },
  formContainer: { paddingHorizontal: 16 },

  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold', textAlign: 'center' },
  emptySubText: { color: '#607D8B', fontSize: 12, marginTop: 8, textAlign: 'center', paddingHorizontal: 20 },

  campagneCard: { backgroundColor: '#0F2137', borderRadius: 12, padding: 14, marginBottom: 10, borderLeftWidth: 4 },
  campagneHeader: { marginBottom: 10 },
  campagneTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  campagneExercice: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  campagneDesc: { color: '#607D8B', fontSize: 12 },
  statutBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  statutText: { fontSize: 11, fontWeight: 'bold' },
  campagneActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  fillBtn: { backgroundColor: '#E67E22', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  fillBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 12 },
  viewMyBtn: { backgroundColor: '#1E3A5F', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  viewMyBtnText: { color: '#4A90D9', fontWeight: 'bold', fontSize: 12 },
  toggleBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1 },
  toggleBtnText: { fontWeight: 'bold', fontSize: 12 },
  resultsBtn: { backgroundColor: '#C9A84C', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  resultsBtnText: { color: '#0A1628', fontWeight: 'bold', fontSize: 12 },
  deleteBtn: { backgroundColor: '#E74C3C20', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#E74C3C' },
  deleteBtnText: { fontSize: 14 },

  anonBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#27AE6015', borderRadius: 8, padding: 12, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: '#27AE60', gap: 8 },
  anonIcon: { fontSize: 20 },
  anonText: { color: '#27AE60', fontSize: 12, flex: 1, lineHeight: 18 },

  qCard: { backgroundColor: '#0F2137', borderRadius: 10, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#2A4060' },
  qLabel: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold', marginBottom: 8 },
  input: { backgroundColor: '#1A2F4A', borderWidth: 1, borderColor: '#2A4060', borderRadius: 8, padding: 10, color: '#FFFFFF', fontSize: 13 },
  inputReadOnly: { backgroundColor: '#0F2137', borderColor: '#1A2F4A', color: '#B0BEC5' },

  submitBtn: { backgroundColor: '#E67E22', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 8, marginBottom: 12 },
  submitBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold' },

  // Stats
  overviewCard: { backgroundColor: '#0F2137', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#2A4060' },
  overviewTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold' },
  overviewSub: { color: '#607D8B', fontSize: 11, marginTop: 2 },
  statBarContainer: { marginBottom: 12 },
  statBarHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  statBarLabel: { color: '#FFFFFF', fontSize: 12 },
  statBarVal: { fontSize: 12, fontWeight: 'bold' },
  statBarTrack: { height: 14, backgroundColor: '#1A2F4A', borderRadius: 7 },
  statBarFill: { height: 14, borderRadius: 7, minWidth: 4 },

  sectionCard: { backgroundColor: '#0F2137', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#2A4060' },
  sectionCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderLeftWidth: 4, paddingLeft: 10, marginBottom: 10 },
  sectionCardTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold' },
  sectionCardCount: { color: '#607D8B', fontSize: 11 },
  reponseCard: { backgroundColor: '#1A2F4A', borderRadius: 8, padding: 10, marginBottom: 8, borderLeftWidth: 3 },
  anonLabel: { color: '#607D8B', fontSize: 10, marginBottom: 6 },
  reponseText: { color: '#FFFFFF', fontSize: 12, lineHeight: 18 },

  modalOverlay: { flex: 1, backgroundColor: '#00000080', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: '#0F2137', borderRadius: 16, padding: 24, width: '85%', borderWidth: 1, borderColor: '#E67E22' },
  modalTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  modalSubtitle: { color: '#607D8B', fontSize: 12, marginBottom: 12 },
  fieldLabel: { color: '#B0BEC5', fontSize: 11, marginBottom: 4, marginTop: 8 },
  modalInput: { backgroundColor: '#1A2F4A', borderWidth: 1, borderColor: '#2A4060', borderRadius: 8, padding: 12, color: '#FFFFFF', fontSize: 14, marginBottom: 4 },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 12 },
  modalCancel: { flex: 1, backgroundColor: '#1A2F4A', borderRadius: 8, padding: 12, alignItems: 'center' },
  modalCancelText: { color: '#607D8B', fontWeight: 'bold' },
  modalConfirm: { flex: 1, backgroundColor: '#E67E22', borderRadius: 8, padding: 12, alignItems: 'center' },
  modalConfirmText: { color: '#FFFFFF', fontWeight: 'bold' },
});