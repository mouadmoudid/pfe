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

const Q_API = API_URL.replace('/auth', '/questionnaire');

const canManageCampagne = (role) => role === 'ADMIN' || role === 'CGPX';
const canViewResults    = (role) => ['ADMIN', 'CGPX', 'CSPR', 'CET'].includes(role);

const AXES = [
  { id: 'axe1', label: 'Axe 1 : Confiance et Engagement', questions: ['q2','q3','q4','q5','q6','q7'] },
  { id: 'axe2', label: 'Axe 2 : Hiérarchie', questions: ['q8','q9','q10','q11','q12','q13'] },
  { id: 'axe3', label: 'Axe 3 : Communication', questions: ['q14','q15','q16','q17'] },
  { id: 'axe4', label: 'Axe 4 : Liberté d\'expression', questions: ['q18','q19','q20'] },
  { id: 'axe5', label: 'Axe 5 : Signalement des incidents', questions: ['q21','q22','q23'] },
  { id: 'axe6', label: 'Axe 6 : Punition face aux erreurs', questions: ['q24','q25','q26'] },
  { id: 'axe7', label: 'Axe 7 : Esprit d\'équipe', questions: ['q27','q28','q29','q30'] },
  { id: 'axe8', label: 'Axe 8 : Charge de travail', questions: ['q31','q32'] },
  { id: 'axe9', label: 'Axe 9 : Amélioration continue', questions: ['q33','q34','q35','q36'] },
];

const QUESTIONS = {
  q2: 'La sécurité ferroviaire n\'est jamais négligée au profit d\'un rendement plus important',
  q3: 'L\'AMI LGV instaure un climat de travail qui favorise la sécurité ferroviaire',
  q4: 'Globalement, le niveau de sécurité ferroviaire à l\'AMI LGV peut être caractérisé d\'excellent',
  q5: 'Notre fonctionnement et nos procédures sont efficaces pour prévenir la survenue des erreurs sécurité',
  q6: 'C\'est uniquement par hasard s\'il n\'y a pas eu des incidents de sécurité plus graves jusqu\'ici',
  q7: 'La direction de mon établissement semble s\'intéresser à la sécurité ferroviaire uniquement après qu\'un événement indésirable se soit produit',
  q8: 'Mon supérieur hiérarchique immédiat exprime sa satisfaction quand il/elle voit un travail réalisé dans le respect des règles de sécurité ferroviaire',
  q9: 'Les politiques d\'encouragement et de récompense des collaborateurs sont équitables',
  q10: 'Les suggestions du personnel pour améliorer la sécurité ferroviaire sont prises en compte',
  q11: 'Chaque fois que la pression augmente, notre supérieur veut nous faire travailler plus rapidement, même si c\'est au détriment de la sécurité',
  q12: 'Mon supérieur hiérarchique immédiat néglige les problèmes récurrents relatifs à la sécurité ferroviaire',
  q13: 'Les membres du personnel de diverses catégories sont présents aux réunions ayant trait à la sécurité',
  q14: 'L\'AMI LGV instaure un climat de travail qui favorise la communication entre les différents niveaux',
  q15: 'Nous sommes bien informés de tout ce qui concerne la sécurité ferroviaire (nouveau projet, événement…)',
  q16: 'Nous recevons un retour d\'information sur les actions mises en place suite au signalement d\'un événement',
  q17: 'Nous recevons un retour d\'information après chaque mission de contrôle, d\'audit ou d\'inspection',
  q18: 'Le personnel s\'exprime librement s\'il voit quelque chose qui peut avoir des conséquences négatives sur la sécurité ferroviaire',
  q19: 'Le personnel se sent libre de remettre en cause des décisions ou des actions de ses supérieurs qui lui semblent contraires à la sécurité',
  q20: 'Le personnel n\'a pas peur de poser des questions quand quelque chose ne semble pas être clair',
  q21: 'Quand une erreur est faite, mais est détectée et corrigée avant d\'avoir affecté la sécurité ferroviaire, elle est signalée',
  q22: 'Quand une erreur est faite, mais n\'a pas le potentiel de nuire à la sécurité ferroviaire, elle est signalée',
  q23: 'Quand une erreur est faite et qu\'elle pourrait nuire à la sécurité ferroviaire mais qu\'elle n\'a finalement pas d\'effet, elle est signalée',
  q24: 'Le système est très rigide avec ceux qui font des erreurs sécurité',
  q25: 'En cas d\'incident, on a l\'impression que c\'est la personne qui est pointée du doigt et non le problème',
  q26: 'Le personnel s\'inquiète du fait que les incidents de sécurité soient notés dans les dossiers administratifs du personnel',
  q27: 'Quand une importante charge de travail doit être effectuée rapidement, nous conjuguons nos efforts en équipe',
  q28: 'Au contact des collègues du service, nous améliorons nos pratiques en termes de sécurité ferroviaire',
  q29: 'Il y a une bonne coopération entre les services qui doivent travailler ensemble',
  q30: 'Des événements indésirables surviennent quand les collaborateurs sont transférés d\'un service à l\'autre',
  q31: 'Nous travaillons en mode dégradé, en essayant de faire trop de choses, trop rapidement',
  q32: 'Nous avons suffisamment de personnel pour faire face à la charge de travail',
  q33: 'De génération en génération la conscience de l\'importance de la sécurité ferroviaire chez le personnel s\'améliore',
  q34: 'Les erreurs sécurité ont conduit à des changements d\'amélioration de la sécurité',
  q35: 'Des plans de progrès individuel, programmés pour les collaborateurs ayant commis des erreurs sécurité, sont suffisants',
  q36: 'Les processus internes pour échange des connaissances et des meilleures pratiques en matière de sécurité ferroviaire sont suffisants',
};

const CHOIX = ['Tout à fait d\'accord', 'D\'accord', 'Pas d\'accord', 'Pas du tout d\'accord'];

const EMPTY_FORM = {
  dateReponse: new Date().toLocaleDateString('fr-FR'),
  exercice: new Date().getFullYear(),
  q2:null,q3:null,q4:null,q5:null,q6:null,q7:null,
  q8:null,q9:null,q10:null,q11:null,q12:null,q13:null,
  q14:null,q15:null,q16:null,q17:null,
  q18:null,q19:null,q20:null,
  q21:null,q22:null,q23:null,
  q24:null,q25:null,q26:null,
  q27:null,q28:null,q29:null,q30:null,
  q31:null,q32:null,
  q33:null,q34:null,q35:null,q36:null,
  q37:'', q38:'', q39:'', q40:'', q41:'', q42:'',
};

export default function CulturePositiveScreen({ navigation }) {
  const [step, setStep] = useState(0); // 0=menu, 1=questionnaire, 2=résultats
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [userRole, setUserRole] = useState('');

  const [campagnes, setCampagnes] = useState([]);
  const [selectedCampagne, setSelectedCampagne] = useState(null);
  const [resultats, setResultats] = useState(null);
  const [form, setForm] = useState({...EMPTY_FORM});

  // Modals
  const [showAddCampagne, setShowAddCampagne] = useState(false);
  const [newExercice, setNewExercice] = useState(new Date().getFullYear().toString());
  const [newDescription, setNewDescription] = useState('');

  const getToken = async () => await AsyncStorage.getItem('token');

  useEffect(() => { loadInitial(); }, []);

  const loadInitial = async () => {
    setLoading(true);
    try {
      const userData = await AsyncStorage.getItem('user');
      const role = userData ? JSON.parse(userData).role : '';
      setUserRole(role);
      const token = await getToken();
      const res = await axios.get(`${Q_API}/campagnes`, {
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
    if (isNaN(ex) || ex < 2020 || ex > 2100) {
      Alert.alert('Erreur', 'Exercice invalide'); return;
    }
    try {
      const token = await getToken();
      await axios.post(`${Q_API}/campagnes`, {
        exercice: ex,
        description: newDescription || `Questionnaire Culture Sécurité ${ex}`,
        statut: 'FERME',
      }, { headers: { Authorization: `Bearer ${token}` } });
      setShowAddCampagne(false);
      setNewExercice(new Date().getFullYear().toString());
      setNewDescription('');
      loadInitial();
    } catch {
      Alert.alert('Erreur', 'Impossible de créer la campagne (exercice déjà existant ?)');
    }
  };

  const handleToggleStatut = async (campagne) => {
    const newStatut = campagne.statut === 'OUVERT' ? 'FERME' : 'OUVERT';
    const msg = newStatut === 'OUVERT'
      ? `Ouvrir la campagne ${campagne.exercice} ? Les collaborateurs pourront remplir le questionnaire.`
      : `Fermer la campagne ${campagne.exercice} ? Les collaborateurs ne pourront plus répondre.`;
    const confirmed = Platform.OS === 'web'
      ? window.confirm(msg)
      : await new Promise(resolve => Alert.alert('Confirmation', msg, [
          { text: 'Annuler', style: 'cancel', onPress: () => resolve(false) },
          { text: newStatut === 'OUVERT' ? 'Ouvrir' : 'Fermer', onPress: () => resolve(true) },
        ]));
    if (!confirmed) return;
    try {
      const token = await getToken();
      await axios.patch(`${Q_API}/campagnes/${campagne.id}/statut?statut=${newStatut}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadInitial();
    } catch {
      Alert.alert('Erreur', 'Impossible de modifier le statut');
    }
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
      await axios.delete(`${Q_API}/campagnes/${campagne.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadInitial();
    } catch {
      Alert.alert('Erreur', 'Impossible de supprimer');
    }
  };

  const handleStartQuestionnaire = (campagne) => {
    setSelectedCampagne(campagne);
    setForm({ ...EMPTY_FORM, exercice: campagne.exercice });
    setStep(1);
  };

  const handleViewResultats = async (campagne) => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await axios.get(`${Q_API}/resultats?exercice=${campagne.exercice}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setResultats(res.data);
      setSelectedCampagne(campagne);
      setStep(2);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger les résultats');
    } finally {
      setLoading(false);
    }
  };

  const setQ = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = async () => {
    const required = Object.keys(QUESTIONS);
    const missing = required.filter(q => form[q] === null);
    if (missing.length > 0) {
      Alert.alert('Incomplet', `Veuillez répondre à toutes les questions (${missing.length} manquante(s))`);
      return;
    }
    if (!form.q37 || !form.q38 || !form.q39 || !form.q40 || !form.q41) {
      Alert.alert('Incomplet', 'Veuillez compléter la fiche signalétique (Q37-Q41)'); return;
    }
    setSubmitting(true);
    try {
      const token = await getToken();
      await axios.post(Q_API, form, { headers: { Authorization: `Bearer ${token}` } });
      Alert.alert('Merci !', 'Votre réponse a été enregistrée anonymement.', [
        { text: 'OK', onPress: () => { setForm({...EMPTY_FORM}); setStep(0); loadInitial(); } }
      ]);
    } catch (e) {
      const msg = e?.response?.data || 'Impossible de soumettre';
      Alert.alert('Erreur', typeof msg === 'string' ? msg : 'Impossible de soumettre');
    } finally {
      setSubmitting(false);
    }
  };

  const generatePDF = async () => {
    if (!resultats) return;
    setGenerating(true);
    try {
      const questionsStats = resultats.questions || {};
      const axesSections = AXES.map(axe => {
        const qs = axe.questions.map(qId => {
          const stats = questionsStats[qId];
          if (!stats) return '';
          const pcts = [
            { label: 'Tout à fait d\'accord', pct: stats.toutAFaitDaccord, color: '#27AE60' },
            { label: 'D\'accord', pct: stats.daccord, color: '#2ECC71' },
            { label: 'Pas d\'accord', pct: stats.pasDaccord, color: '#E67E22' },
            { label: 'Pas du tout d\'accord', pct: stats.pasDuToutDaccord, color: '#E74C3C' },
          ];
          const bars = pcts.map(p =>
            `<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">
              <span style="font-size:9px;width:130px;flex-shrink:0;">${p.label}</span>
              <div style="flex:1;background:#eee;border-radius:3px;height:12px;">
                <div style="width:${p.pct}%;background:${p.color};height:12px;border-radius:3px;"></div>
              </div>
              <span style="font-size:9px;width:35px;text-align:right;">${p.pct}%</span>
            </div>`
          ).join('');
          return `<div style="margin-bottom:10px;padding:8px;background:#f9f9f9;border-radius:4px;border-left:3px solid #27AE60;">
            <p style="font-size:10px;font-weight:bold;margin-bottom:6px;">${QUESTIONS[qId]}</p>
            ${bars}
          </div>`;
        }).join('');

        const axeIdx = AXES.indexOf(axe);
        const score = Object.values(resultats.scoresAxes || {})[axeIdx] || 0;
        const scoreColor = score <= 2 ? '#27AE60' : score <= 3 ? '#E67E22' : '#E74C3C';
        return `<div style="margin-bottom:16px;page-break-inside:avoid;">
          <div style="background:#1E3A5F;color:white;padding:8px 12px;font-weight:bold;font-size:11px;border-radius:4px;margin-bottom:8px;display:flex;justify-content:space-between;">
            <span>${axe.label}</span>
            <span style="color:${scoreColor};">Score: ${score}/4</span>
          </div>
          ${qs}
        </div>`;
      }).join('');

      const signaletique = (key, label) => {
        const data = resultats[key] || {};
        const items = Object.entries(data).map(([k, v]) =>
          `<span style="margin-right:10px;font-size:10px;"><strong>${k}</strong>: ${v}</span>`
        ).join('');
        return `<div style="margin-bottom:6px;"><strong style="font-size:10px;">${label} :</strong> ${items || '—'}</div>`;
      };

      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
* { margin:0;padding:0;box-sizing:border-box; }
body { font-family:Arial,sans-serif;font-size:10px;color:#1a1a2e;padding:12px; }
@page { size:A4;margin:10mm; }
</style>
</head><body>
<div style="background:#0A1628;color:white;padding:12px;border-radius:6px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;">
  <div>
    <div style="font-size:18px;font-weight:bold;color:#C9A84C;letter-spacing:2px;">ONCF</div>
    <div style="font-size:10px;">PIC/DRIC · Arrondissement MI LGV · DT 102V LGV</div>
  </div>
  <div style="text-align:right;">
    <div style="font-weight:bold;font-size:14px;">Questionnaire d'évaluation de la Culture</div>
    <div style="color:#27AE60;">Exercice ${selectedCampagne?.exercice} — ${resultats.totalReponses} réponses anonymes</div>
  </div>
</div>
<div style="background:#E8F8F5;border:1px solid #27AE60;border-radius:4px;padding:8px;margin-bottom:12px;">
  <strong>Scores par axe (1=Très positif · 4=Très négatif) :</strong><br/><br/>
  ${Object.entries(resultats.scoresAxes || {}).map(([k, v], i) => {
    const labels = ['Confiance','Hiérarchie','Communication','Liberté','Signalement','Punition','Équipe','Charge','Amélioration'];
    const color = v <= 2 ? '#27AE60' : v <= 3 ? '#E67E22' : '#E74C3C';
    return `<span style="margin-right:12px;font-size:10px;"><strong>Axe ${i+1} ${labels[i]}</strong>: <span style="color:${color};font-weight:bold;">${v}/4</span></span>`;
  }).join('')}
</div>
${axesSections}
<div style="page-break-before:always;">
  <div style="background:#1E3A5F;color:white;padding:8px 12px;font-weight:bold;font-size:11px;border-radius:4px;margin-bottom:8px;">Fiche signalétique</div>
  ${signaletique('q37', 'Genre')}
  ${signaletique('q38', 'Âge')}
  ${signaletique('q39', 'Fonction')}
  ${signaletique('q40', 'Ancienneté fonction')}
  ${signaletique('q41', 'Ancienneté entité')}
</div>
${resultats.commentaires?.length > 0 ? `
<div style="margin-top:12px;">
  <div style="background:#1E3A5F;color:white;padding:8px 12px;font-weight:bold;font-size:11px;border-radius:4px;margin-bottom:8px;">Commentaires (${resultats.commentaires.length})</div>
  ${resultats.commentaires.map((c, i) => `<div style="padding:6px;border-left:3px solid #C9A84C;margin-bottom:4px;font-size:10px;background:#f9f9f9;">${i+1}. ${c}</div>`).join('')}
</div>` : ''}
<div style="margin-top:12px;text-align:right;font-size:9px;color:#607D8B;">Généré le ${new Date().toLocaleDateString('fr-FR')} — Données anonymes</div>
</body></html>`;

      await generateAndSharePDF(html, { dialogTitle: `Résultats Culture Sécurité ${selectedCampagne?.exercice}` });
    } catch {
      Alert.alert('Erreur', 'Impossible de générer le PDF');
    } finally {
      setGenerating(false);
    }
  };

  // ===== ÉTAPE 0 — Menu campagnes =====
  if (step === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerTitle}>🌟 Culture Positive de Sécurité</Text>
              <Text style={styles.headerSub}>Questionnaire d'évaluation annuel</Text>
            </View>
            {canManageCampagne(userRole) && (
              <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddCampagne(true)}>
                <Text style={styles.addBtnText}>+ Campagne</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {loading
          ? <ActivityIndicator color="#27AE60" style={{ marginTop: 40 }} />
          : (
            <ScrollView style={styles.list}>
              {campagnes.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyIcon}>📋</Text>
                  <Text style={styles.emptyText}>
                    {canManageCampagne(userRole)
                      ? 'Aucune campagne créée'
                      : 'Aucun questionnaire disponible pour le moment'}
                  </Text>
                  {canManageCampagne(userRole) && (
                    <Text style={styles.emptySubText}>Créez une campagne et ouvrez-la pour que les collaborateurs puissent répondre</Text>
                  )}
                </View>
              ) : (
                campagnes.map(c => (
                  <View key={c.id} style={[styles.campagneCard, { borderLeftColor: c.statut === 'OUVERT' ? '#27AE60' : '#607D8B' }]}>
                    {/* En-tête */}
                    <View style={styles.campagneHeader}>
                      <View>
                        <View style={styles.campagneTitleRow}>
                          <Text style={styles.campagneExercice}>Exercice {c.exercice}</Text>
                          <View style={[styles.statutBadge, { backgroundColor: c.statut === 'OUVERT' ? '#27AE6020' : '#60607D20', borderColor: c.statut === 'OUVERT' ? '#27AE60' : '#607D8B' }]}>
                            <Text style={[styles.statutText, { color: c.statut === 'OUVERT' ? '#27AE60' : '#607D8B' }]}>
                              {c.statut === 'OUVERT' ? '🔓 Ouvert' : '🔒 Fermé'}
                            </Text>
                          </View>
                        </View>
                        {c.description && <Text style={styles.campagneDesc}>{c.description}</Text>}
                      </View>
                    </View>

                    {/* Actions selon rôle */}
                    <View style={styles.campagneActions}>
                      {/* Bouton remplir — visible si OUVERT et rôle non gestionnaire */}
                      {c.statut === 'OUVERT' && (
                        <TouchableOpacity
                          style={styles.fillBtn}
                          onPress={() => handleStartQuestionnaire(c)}
                        >
                          <Text style={styles.fillBtnText}>📝 Remplir</Text>
                        </TouchableOpacity>
                      )}

                      {/* Ouvrir/Fermer et Supprimer — ADMIN/CGPX uniquement */}
                      {canManageCampagne(userRole) && (
                        <>
                          <TouchableOpacity
                            style={[styles.toggleBtn, { backgroundColor: c.statut === 'OUVERT' ? '#E74C3C20' : '#27AE6020', borderColor: c.statut === 'OUVERT' ? '#E74C3C' : '#27AE60' }]}
                            onPress={() => handleToggleStatut(c)}
                          >
                            <Text style={[styles.toggleBtnText, { color: c.statut === 'OUVERT' ? '#E74C3C' : '#27AE60' }]}>
                              {c.statut === 'OUVERT' ? '🔒 Fermer' : '🔓 Ouvrir'}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.deleteBtn}
                            onPress={() => handleDeleteCampagne(c)}
                          >
                            <Text style={styles.deleteBtnText}>🗑</Text>
                          </TouchableOpacity>
                        </>
                      )}
                      {/* Résultats — 4 rôles (ADMIN, CGPX, CSPR, CET) */}
                      {canViewResults(userRole) && (
                        <TouchableOpacity
                          style={styles.resultsBtn}
                          onPress={() => handleViewResultats(c)}
                        >
                          <Text style={styles.resultsBtnText}>📊 Résultats</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))
              )}
              <View style={{ height: 40 }} />
            </ScrollView>
          )
        }

        {/* Modal Nouvelle Campagne */}
        <Modal visible={showAddCampagne} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Nouvelle Campagne</Text>
              <Text style={styles.modalSubtitle}>Le questionnaire sera fermé par défaut jusqu'à ce que vous l'ouvriez</Text>
              <Text style={styles.fieldLabel}>Exercice (année) *</Text>
              <TextInput style={styles.modalInput} value={newExercice}
                onChangeText={setNewExercice} keyboardType="numeric"
                placeholder="Ex: 2026" placeholderTextColor="#607D8B" />
              <Text style={styles.fieldLabel}>Description (optionnel)</Text>
              <TextInput style={styles.modalInput} value={newDescription}
                onChangeText={setNewDescription}
                placeholder="Ex: Questionnaire Culture Sécurité 2026"
                placeholderTextColor="#607D8B" />
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

  // ===== ÉTAPE 1 — Questionnaire =====
  if (step === 1) {
    const RadioGroup = ({ qKey, options, isString = false }) => (
      <View style={styles.radioGroup}>
        {options.map((opt, i) => {
          const val = isString ? opt : i + 1;
          const selected = form[qKey] === val;
          return (
            <TouchableOpacity key={i}
              style={[styles.radioBtn, selected && styles.radioBtnSelected]}
              onPress={() => setQ(qKey, val)}
            >
              <View style={[styles.radioCircle, selected && styles.radioCircleSelected]}>
                {selected && <View style={styles.radioDot} />}
              </View>
              <Text style={[styles.radioText, selected && styles.radioTextSelected]}>{opt}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );

    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { setStep(0); setForm({...EMPTY_FORM}); }}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Questionnaire Culture Sécurité</Text>
          <Text style={styles.headerSub}>Exercice {selectedCampagne?.exercice} · Anonyme · 42 questions</Text>
        </View>
        <ScrollView style={styles.formContainer}>

          <View style={styles.infoBox}>
            <Text style={styles.infoBoxText}>🔒 Ce questionnaire est 100% anonyme. Aucune information personnelle ne sera associée à vos réponses.</Text>
          </View>

          <View style={styles.qCard}>
            <Text style={styles.qNum}>1. Date *</Text>
            <TextInput style={styles.qInput} value={form.dateReponse}
              onChangeText={v => setQ('dateReponse', v)} placeholder="JJ/MM/AAAA"
              placeholderTextColor="#607D8B" />
          </View>

          {AXES.map(axe => (
            <View key={axe.id}>
              <View style={styles.axeHeader}>
                <Text style={styles.axeTitle}>{axe.label}</Text>
              </View>
              {axe.questions.map(qId => {
                const num = parseInt(qId.replace('q', ''));
                return (
                  <View key={qId} style={[styles.qCard, form[qId] !== null && styles.qCardAnswered]}>
                    <Text style={styles.qNum}>{num}. {QUESTIONS[qId]}</Text>
                    <RadioGroup qKey={qId} options={CHOIX} />
                  </View>
                );
              })}
            </View>
          ))}

          <View style={styles.axeHeader}>
            <Text style={styles.axeTitle}>Axe 10 : Fiche signalétique</Text>
          </View>

          <View style={[styles.qCard, form.q37 && styles.qCardAnswered]}>
            <Text style={styles.qNum}>37. Vous êtes : *</Text>
            <RadioGroup qKey="q37" options={['Homme', 'Femme']} isString />
          </View>
          <View style={[styles.qCard, form.q38 && styles.qCardAnswered]}>
            <Text style={styles.qNum}>38. Votre âge : *</Text>
            <RadioGroup qKey="q38" options={['Moins de 25 ans', '25 à 35 ans', '36 à 45 ans', '46 ans et plus']} isString />
          </View>
          <View style={[styles.qCard, form.q39 && styles.qCardAnswered]}>
            <Text style={styles.qNum}>39. Quelle est votre fonction au sein de l'ONCF : *</Text>
            <RadioGroup qKey="q39" options={['Technicien de Voie', 'Chef d\'unité de Production', 'Stagiaire Militaire', 'Chef de District', 'Encadrant', 'Contrôleur Voie']} isString />
          </View>
          <View style={[styles.qCard, form.q40 && styles.qCardAnswered]}>
            <Text style={styles.qNum}>40. Depuis combien d'années exercez-vous votre fonction actuelle : *</Text>
            <RadioGroup qKey="q40" options={['Moins de 3 ans', '5 à 10 ans', '10 et plus']} isString />
          </View>
          <View style={[styles.qCard, form.q41 && styles.qCardAnswered]}>
            <Text style={styles.qNum}>41. Depuis combien de temps travaillez-vous au sein de votre entité : *</Text>
            <RadioGroup qKey="q41" options={['Moins de 3 ans', '5 à 10 ans', '10 et plus']} isString />
          </View>
          <View style={styles.qCard}>
            <Text style={styles.qNum}>42. Vos commentaires vis-à-vis de la culture sécurité ferroviaire :</Text>
            <TextInput style={[styles.qInput, { height: 100, textAlignVertical: 'top' }]}
              value={form.q42} onChangeText={v => setQ('q42', v)}
              multiline placeholder="Vos commentaires (optionnel)..." placeholderTextColor="#607D8B" />
          </View>

          <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
            onPress={handleSubmit} disabled={submitting}>
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.submitBtnText}>✅ Soumettre le questionnaire</Text>
            }
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ===== ÉTAPE 2 — Résultats =====
  if (step === 2) {
    const questionsStats = resultats?.questions || {};
    const scoresAxes = resultats?.scoresAxes || {};

    const BarChart = ({ stats }) => {
      if (!stats) return null;
      const data = [
        { label: 'Tout à fait d\'accord', pct: stats.toutAFaitDaccord, color: '#27AE60' },
        { label: 'D\'accord', pct: stats.daccord, color: '#2ECC71' },
        { label: 'Pas d\'accord', pct: stats.pasDaccord, color: '#E67E22' },
        { label: 'Pas du tout d\'accord', pct: stats.pasDuToutDaccord, color: '#E74C3C' },
      ];
      return (
        <View style={styles.barChart}>
          {data.map((d, i) => (
            <View key={i} style={styles.barRow}>
              <Text style={styles.barLabel}>{d.label}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${d.pct}%`, backgroundColor: d.color }]} />
              </View>
              <Text style={styles.barPct}>{d.pct}%</Text>
            </View>
          ))}
        </View>
      );
    };

    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { setStep(0); setResultats(null); }}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerTitle}>Résultats — Exercice {selectedCampagne?.exercice}</Text>
              <Text style={styles.headerSub}>{resultats?.totalReponses || 0} réponses anonymes</Text>
            </View>
            <TouchableOpacity style={[styles.pdfBtn, generating && { opacity: 0.6 }]}
              onPress={generatePDF} disabled={generating}>
              {generating ? <ActivityIndicator color="#0A1628" size="small" /> : <Text style={styles.pdfBtnText}>📄 PDF</Text>}
            </TouchableOpacity>
          </View>
        </View>

        {loading ? <ActivityIndicator color="#27AE60" style={{ marginTop: 40 }} /> : (
          <ScrollView style={styles.list}>
            {/* Scores par axe */}
            <View style={styles.scoresCard}>
              <Text style={styles.scoresTitle}>Scores par axe (1=Très positif · 4=Très négatif)</Text>
              {Object.entries(scoresAxes).map(([k, v], i) => {
                const labels = ['Confiance','Hiérarchie','Communication','Liberté','Signalement','Punition','Équipe','Charge','Amélioration'];
                const color = v <= 2 ? '#27AE60' : v <= 3 ? '#E67E22' : '#E74C3C';
                return (
                  <View key={k} style={styles.scoreRow}>
                    <Text style={styles.scoreLabel}>Axe {i+1} · {labels[i]}</Text>
                    <View style={styles.scoreBarTrack}>
                      <View style={[styles.scoreBarFill, { width: `${(v/4)*100}%`, backgroundColor: color }]} />
                    </View>
                    <Text style={[styles.scoreVal, { color }]}>{v}/4</Text>
                  </View>
                );
              })}
            </View>

            {AXES.map(axe => (
              <View key={axe.id} style={styles.axeResultCard}>
                <Text style={styles.axeResultTitle}>{axe.label}</Text>
                {axe.questions.map(qId => {
                  const num = parseInt(qId.replace('q',''));
                  return (
                    <View key={qId} style={styles.qResultCard}>
                      <Text style={styles.qResultText}>{num}. {QUESTIONS[qId]}</Text>
                      <BarChart stats={questionsStats[qId]} />
                    </View>
                  );
                })}
              </View>
            ))}

            {resultats?.commentaires?.length > 0 && (
              <View style={styles.axeResultCard}>
                <Text style={styles.axeResultTitle}>💬 Commentaires ({resultats.commentaires.length})</Text>
                {resultats.commentaires.map((c, i) => (
                  <View key={i} style={styles.commentCard}>
                    <Text style={styles.commentText}>{c}</Text>
                  </View>
                ))}
              </View>
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

  addBtn: { backgroundColor: '#27AE60', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  addBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 12 },
  pdfBtn: { backgroundColor: '#C9A84C', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  pdfBtnText: { color: '#0A1628', fontWeight: 'bold', fontSize: 13 },

  list: { paddingHorizontal: 16 },
  formContainer: { paddingHorizontal: 16 },

  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold', textAlign: 'center' },
  emptySubText: { color: '#607D8B', fontSize: 12, marginTop: 8, textAlign: 'center', paddingHorizontal: 20 },

  campagneCard: {
    backgroundColor: '#0F2137', borderRadius: 12, padding: 14, marginBottom: 10, borderLeftWidth: 4,
  },
  campagneHeader: { marginBottom: 10 },
  campagneTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  campagneExercice: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  campagneDesc: { color: '#607D8B', fontSize: 12 },
  statutBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  statutText: { fontSize: 11, fontWeight: 'bold' },

  campagneActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  fillBtn: { backgroundColor: '#27AE60', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  fillBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 12 },
  toggleBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1 },
  toggleBtnText: { fontWeight: 'bold', fontSize: 12 },
  resultsBtn: { backgroundColor: '#C9A84C', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  resultsBtnText: { color: '#0A1628', fontWeight: 'bold', fontSize: 12 },
  deleteBtn: { backgroundColor: '#E74C3C20', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#E74C3C' },
  deleteBtnText: { fontSize: 14 },

  infoBox: { backgroundColor: '#27AE6015', borderRadius: 8, padding: 12, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: '#27AE60' },
  infoBoxText: { color: '#27AE60', fontSize: 12, lineHeight: 18 },

  axeHeader: { backgroundColor: '#1E3A5F', padding: 10, borderLeftWidth: 4, borderLeftColor: '#27AE60', marginBottom: 6, marginTop: 8, borderRadius: 6 },
  axeTitle: { color: '#27AE60', fontSize: 13, fontWeight: 'bold' },

  qCard: { backgroundColor: '#0F2137', borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#2A4060' },
  qCardAnswered: { borderColor: '#27AE6050' },
  qNum: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold', marginBottom: 10, lineHeight: 18 },
  qInput: { backgroundColor: '#1A2F4A', borderWidth: 1, borderColor: '#2A4060', borderRadius: 8, padding: 10, color: '#FFFFFF', fontSize: 13 },

  radioGroup: { gap: 6 },
  radioBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A2F4A', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#2A4060' },
  radioBtnSelected: { borderColor: '#27AE60', backgroundColor: '#27AE6015' },
  radioCircle: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#607D8B', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  radioCircleSelected: { borderColor: '#27AE60' },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#27AE60' },
  radioText: { color: '#B0BEC5', fontSize: 13, flex: 1 },
  radioTextSelected: { color: '#FFFFFF', fontWeight: 'bold' },

  submitBtn: { backgroundColor: '#27AE60', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 16, marginBottom: 12 },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },

  scoresCard: { backgroundColor: '#0F2137', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#2A4060' },
  scoresTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold', marginBottom: 10 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  scoreLabel: { color: '#607D8B', fontSize: 10, width: 120 },
  scoreBarTrack: { flex: 1, height: 10, backgroundColor: '#1A2F4A', borderRadius: 5, marginHorizontal: 8 },
  scoreBarFill: { height: 10, borderRadius: 5 },
  scoreVal: { fontSize: 11, fontWeight: 'bold', width: 30, textAlign: 'right' },

  axeResultCard: { backgroundColor: '#0F2137', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#2A4060' },
  axeResultTitle: { color: '#27AE60', fontSize: 13, fontWeight: 'bold', marginBottom: 10 },
  qResultCard: { backgroundColor: '#1A2F4A', borderRadius: 8, padding: 10, marginBottom: 8 },
  qResultText: { color: '#FFFFFF', fontSize: 11, marginBottom: 8, lineHeight: 16 },

  barChart: { gap: 4 },
  barRow: { flexDirection: 'row', alignItems: 'center' },
  barLabel: { color: '#607D8B', fontSize: 9, width: 120 },
  barTrack: { flex: 1, height: 10, backgroundColor: '#0F2137', borderRadius: 4, marginHorizontal: 6 },
  barFill: { height: 10, borderRadius: 4, minWidth: 2 },
  barPct: { color: '#FFFFFF', fontSize: 9, width: 35, textAlign: 'right' },

  commentCard: { backgroundColor: '#1A2F4A', borderRadius: 8, padding: 10, marginBottom: 6, borderLeftWidth: 3, borderLeftColor: '#C9A84C' },
  commentText: { color: '#B0BEC5', fontSize: 12, lineHeight: 18 },

  modalOverlay: { flex: 1, backgroundColor: '#00000080', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: '#0F2137', borderRadius: 16, padding: 24, width: '85%', borderWidth: 1, borderColor: '#27AE60' },
  modalTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  modalSubtitle: { color: '#607D8B', fontSize: 12, marginBottom: 12, lineHeight: 18 },
  fieldLabel: { color: '#B0BEC5', fontSize: 11, marginBottom: 4, marginTop: 8 },
  modalInput: { backgroundColor: '#1A2F4A', borderWidth: 1, borderColor: '#2A4060', borderRadius: 8, padding: 12, color: '#FFFFFF', fontSize: 14, marginBottom: 4 },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 12 },
  modalCancel: { flex: 1, backgroundColor: '#1A2F4A', borderRadius: 8, padding: 12, alignItems: 'center' },
  modalCancelText: { color: '#607D8B', fontWeight: 'bold' },
  modalConfirm: { flex: 1, backgroundColor: '#27AE60', borderRadius: 8, padding: 12, alignItems: 'center' },
  modalConfirmText: { color: '#FFFFFF', fontWeight: 'bold' },
});