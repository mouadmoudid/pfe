import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateAndSharePDF } from '../utils/pdfUtils';
import { API_URL } from '../services/authService';

const RACE_API = API_URL.replace('/auth', '/rex/race');

const EMPTY_RACE = {
  numero: '',
  annee: new Date().getFullYear().toString(),
  entite: 'DT 102V LGV',
  dateEvenement: '',
  lieuEvenement: '',
  descriptionEvenement: '',
  degatsValeur: '0',
  degatsTotal: '0',
  facteurHumain: '',
  facteurOrganisationnel: '',
  installation: '',
  entretiensComplementaires: '',
  enchainementFaits: '',
  arbreCauses: '',
  mesuresFacteurHumain: '',
  mesuresFacteurOrganisationnel: '',
  mesuresInstallation: '',
  recommandations: '',
  etabliPar: '',
  etabliLe: '',
  validePar: '',
  valideLe: '',
};

export default function RaceScreen({ navigation }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [raceList, setRaceList] = useState([]);
  const [form, setForm] = useState(EMPTY_RACE);
  const [editingId, setEditingId] = useState(null);

  const getToken = async () => await AsyncStorage.getItem('token');

  useEffect(() => {
    loadRace();
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    const userData = await AsyncStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      setForm(prev => ({ ...prev, etabliPar: user.fullName || '' }));
    }
  };

  const loadRace = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await axios.get(RACE_API, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRaceList(res.data);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger les RACE');
    } finally {
      setLoading(false);
    }
  };

  const updateForm = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    if (!form.entite || !form.dateEvenement) {
      Alert.alert('Erreur', 'Entité et date sont obligatoires');
      return;
    }
    setSaving(true);
    try {
      const token = await getToken();
      if (editingId) {
        await axios.put(`${RACE_API}/${editingId}`, form, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(RACE_API, form, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      Alert.alert('Succès', editingId ? 'RACE mis à jour !' : 'RACE créé !');
      setStep(0);
      setForm(EMPTY_RACE);
      setEditingId(null);
      loadRace();
    } catch {
      Alert.alert('Erreur', 'Impossible de sauvegarder');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (race) => {
    const f = {};
    Object.keys(EMPTY_RACE).forEach(k => { f[k] = race[k] || ''; });
    setForm(f);
    setEditingId(race.id);
    setStep(1);
  };

  const handleDelete = (race) => {
    Alert.alert('Confirmation', `Supprimer RACE N° ${race.numero}/${race.annee} ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive',
        onPress: async () => {
          try {
            const token = await getToken();
            await axios.delete(`${RACE_API}/${race.id}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            loadRace();
          } catch {
            Alert.alert('Erreur', 'Impossible de supprimer');
          }
        }
      }
    ]);
  };

  const generatePDF = async (race) => {
    setGenerating(true);
    try {
      const row = (label, content) =>
        content ? `
          <tr>
            <td style="font-weight:bold;font-size:10px;padding:5px 8px;background:#f8f9fa;width:35%;border:1px solid #ddd;">${label}</td>
            <td style="font-size:11px;padding:5px 8px;border:1px solid #ddd;">${content}</td>
          </tr>` : '';

      const section = (title, content, color = '#1E3A5F') =>
        `<div style="margin-bottom:10px;">
          <div style="background:${color};color:white;padding:6px 10px;font-weight:bold;font-size:11px;">${title}</div>
          <div style="border:1px solid #ddd;border-top:none;padding:8px 10px;font-size:11px;min-height:30px;">${content || ''}</div>
        </div>`;

      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: Arial, sans-serif; font-size: 11px; color: #1a1a2e; padding: 12px; }
.header-top { display: grid; grid-template-columns: 1fr 2fr 1fr; border: 1px solid #ccc; margin-bottom: 10px; }
.header-cell { padding: 6px 10px; border-right: 1px solid #ccc; font-size: 10px; }
.oncf-logo { color: #C9A84C; font-size: 16px; font-weight: bold; letter-spacing: 2px; }
.race-title { text-align: center; font-weight: bold; font-size: 14px; background: #E74C3C; color: white; padding: 8px; margin-bottom: 10px; }
table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
.h2 { font-weight: bold; font-size: 12px; color: #E74C3C; text-decoration: underline; margin: 12px 0 6px; }
.footer { margin-top: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; font-size: 10px; border-top: 1px solid #ccc; padding-top: 8px; }
.sig-box { border: 1px solid #ccc; padding: 10px; min-height: 50px; }
.sig-label { font-weight: bold; margin-bottom: 4px; }
</style>
</head><body>

<div class="header-top">
  <div class="header-cell">
    <div class="oncf-logo">ONCF</div>
    <div style="margin-top:2px;font-weight:bold;">DRI Centre</div>
  </div>
  <div class="header-cell" style="text-align:center;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:2px;">
    <div style="font-weight:bold;font-size:13px;">RACE N° ${race.numero || '...'} / Année ${race.annee || ''}</div>
    <div style="font-size:11px;">Rapport d'Analyse Complémentaire d'Evénement</div>
  </div>
  <div class="header-cell" style="text-align:right;">
    <div>PIC / DRI Centre</div>
    <div style="font-weight:bold;">DT 102V LGV</div>
  </div>
</div>

<table>
  ${row('1. Entité', race.entite)}
  ${row('2. Date de l\'événement', race.dateEvenement)}
  ${row('3. Lieu de l\'événement', race.lieuEvenement)}
</table>

${section('3. Description de l\'Evénement', race.descriptionEvenement)}

<table>
  ${row('4. Evaluation des dégâts (en DH)', race.degatsValeur ? `Pas de dégât : ${race.degatsValeur} DH` : '')}
  ${row('Total des dégâts', race.degatsTotal ? `${race.degatsTotal} DH` : '0 DH')}
</table>

<div class="h2">Eléments issus de l'analyse des PVCCI, PV, rapports circonstanciels</div>
${section('a. Cause(s) de l\'événement — Facteur humain', race.facteurHumain, '#E67E22')}
${section('Facteur organisationnel', race.facteurOrganisationnel, '#E67E22')}
${section('Installation', race.installation, '#E67E22')}

<div class="h2">Eléments issus des entretiens complémentaires avec le personnel</div>
${section('Entretiens complémentaires', race.entretiensComplementaires)}

<div class="h2">Analyse globale des causes de l'événement</div>
${section('a. Enchaînement des faits', race.enchainementFaits)}
${section('b. Arbre des causes final', race.arbreCauses)}

<div class="h2">Mesures prises et actions décidées</div>
${section('c. Facteurs humains', race.mesuresFacteurHumain, '#27AE60')}
${section('d. Facteurs organisationnels', race.mesuresFacteurOrganisationnel, '#27AE60')}
${section('e. Installation', race.mesuresInstallation, '#27AE60')}

<div class="h2">Recommandations faites au niveau hiérarchique supérieur</div>
${section('Recommandations', race.recommandations)}

<div class="footer">
  <div class="sig-box">
    <div class="sig-label">Etabli par : ${race.etabliPar || ''}</div>
    <div>KENITRA, le ${race.etabliLe || '          /          /          '}</div>
    <div style="margin-top:20px;">Signature :</div>
  </div>
  <div class="sig-box">
    <div class="sig-label">Validé par : ${race.validePar || ''}</div>
    <div>Le ${race.valideLe || '          /          /          '}</div>
    <div style="margin-top:20px;">Signature :</div>
  </div>
</div>

</body></html>`;

      await generateAndSharePDF(html, { dialogTitle: `RACE N°${race.numero}/${race.annee}` });
    } catch {
      Alert.alert('Erreur', 'Impossible de générer le PDF');
    } finally {
      setGenerating(false);
    }
  };

  const Field = ({ label, field, multiline = false, placeholder = '' }) => (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && { height: 80, textAlignVertical: 'top' }]}
        placeholder={placeholder || `Saisir ${label.toLowerCase()}...`}
        placeholderTextColor="#607D8B"
        value={form[field]}
        onChangeText={v => updateForm(field, v)}
        multiline={multiline}
      />
    </View>
  );

  // ===== LISTE =====
  if (step === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerTitle}>RACE</Text>
              <Text style={styles.headerSub}>Rapport d'Analyse Complémentaire d'Évènement</Text>
            </View>
            <TouchableOpacity style={styles.addBtn} onPress={() => { setForm(EMPTY_RACE); setEditingId(null); setStep(1); }}>
              <Text style={styles.addBtnText}>+ Nouveau</Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading
          ? <ActivityIndicator color="#E74C3C" style={{ marginTop: 40 }} />
          : (
            <ScrollView style={styles.list}>
              {raceList.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyIcon}>📊</Text>
                  <Text style={styles.emptyText}>Aucun RACE créé</Text>
                  <Text style={styles.emptySubText}>Appuyez sur "+ Nouveau" pour commencer</Text>
                </View>
              ) : (
                raceList.map(race => (
                  <View key={race.id} style={styles.card}>
                    <View style={styles.cardTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>
                          RACE N° {race.numero || '...'} / {race.annee}
                        </Text>
                        <Text style={styles.cardMeta}>📅 {race.dateEvenement || '—'} · 🏢 {race.entite || '—'}</Text>
                        {race.lieuEvenement ? (
                          <Text style={styles.cardMeta}>📍 {race.lieuEvenement}</Text>
                        ) : null}
                        {race.createdAt && (
                          <Text style={styles.cardCreated}>
                            Créé le {new Date(race.createdAt).toLocaleDateString('fr-FR')}
                          </Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.cardActions}>
                      <TouchableOpacity style={styles.editBtn} onPress={() => handleEdit(race)}>
                        <Text style={styles.editBtnText}>✏️ Modifier</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.pdfBtn, generating && { opacity: 0.6 }]}
                        onPress={() => generatePDF(race)}
                        disabled={generating}
                      >
                        {generating
                          ? <ActivityIndicator color="#0A1628" size="small" />
                          : <Text style={styles.pdfBtnText}>📄 PDF</Text>
                        }
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(race)}>
                        <Text style={styles.deleteBtnText}>🗑</Text>
                      </TouchableOpacity>
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

  // ===== FORMULAIRE =====
  if (step === 1) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { setStep(0); setForm(EMPTY_RACE); setEditingId(null); }}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>{editingId ? 'Modifier RACE' : 'Nouveau RACE'}</Text>
            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="#0A1628" size="small" />
                : <Text style={styles.saveBtnText}>💾 Sauvegarder</Text>
              }
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.formContainer}>

          {/* En-tête */}
          <View style={styles.sectionBox}>
            <Text style={styles.sectionTitle}>📌 Identification</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Field label="N° RACE" field="numero" placeholder="Ex: 001" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Année" field="annee" placeholder={new Date().getFullYear().toString()} />
              </View>
            </View>
            <Field label="1. Entité *" field="entite" placeholder="Ex: DT 102V LGV" />
            <Field label="2. Date de l'événement *" field="dateEvenement" placeholder="JJ/MM/AAAA" />
            <Field label="Lieu de l'événement" field="lieuEvenement" placeholder="Ex: LGV2, km 128..." />
          </View>

          {/* Description */}
          <View style={styles.sectionBox}>
            <Text style={styles.sectionTitle}>📋 Description de l'événement</Text>
            <Field label="3. Description de l'Evénement" field="descriptionEvenement" multiline />
          </View>

          {/* Dégâts */}
          <View style={styles.sectionBox}>
            <Text style={styles.sectionTitle}>💰 Evaluation des dégâts</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Field label="Valeur des dégâts (DH)" field="degatsValeur" placeholder="0" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Total des dégâts (DH)" field="degatsTotal" placeholder="0" />
              </View>
            </View>
          </View>

          {/* Causes */}
          <View style={styles.sectionBox}>
            <Text style={styles.sectionTitle}>🔍 Causes de l'événement</Text>
            <Field label="Facteur humain" field="facteurHumain" multiline />
            <Field label="Facteur organisationnel" field="facteurOrganisationnel" multiline />
            <Field label="Installation" field="installation" multiline />
          </View>

          {/* Entretiens */}
          <View style={styles.sectionBox}>
            <Text style={styles.sectionTitle}>👥 Entretiens complémentaires</Text>
            <Field label="Eléments issus des entretiens" field="entretiensComplementaires" multiline />
          </View>

          {/* Analyse */}
          <View style={styles.sectionBox}>
            <Text style={styles.sectionTitle}>📊 Analyse globale</Text>
            <Field label="Enchaînement des faits" field="enchainementFaits" multiline />
            <Field label="Arbre des causes final" field="arbreCauses" multiline />
          </View>

          {/* Mesures */}
          <View style={styles.sectionBox}>
            <Text style={styles.sectionTitle}>✅ Mesures prises et actions décidées</Text>
            <Field label="c. Facteurs humains" field="mesuresFacteurHumain" multiline />
            <Field label="d. Facteurs organisationnels" field="mesuresFacteurOrganisationnel" multiline />
            <Field label="e. Installation" field="mesuresInstallation" multiline />
          </View>

          {/* Recommandations */}
          <View style={styles.sectionBox}>
            <Text style={styles.sectionTitle}>💡 Recommandations</Text>
            <Field label="Recommandations au niveau hiérarchique supérieur" field="recommandations" multiline />
          </View>

          {/* Signatures */}
          <View style={styles.sectionBox}>
            <Text style={styles.sectionTitle}>✍️ Signatures</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Field label="Etabli par" field="etabliPar" placeholder="Nom prénom" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Le" field="etabliLe" placeholder="JJ/MM/AAAA" />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Field label="Validé par" field="validePar" placeholder="Nom prénom" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Le" field="valideLe" placeholder="JJ/MM/AAAA" />
              </View>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A1628' },
  header: {
    backgroundColor: '#0F2137', padding: 20,
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20, marginBottom: 12,
  },
  backText: { color: '#C9A84C', fontSize: 14, marginBottom: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  headerSub: { color: '#607D8B', fontSize: 11, marginTop: 2 },

  addBtn: { backgroundColor: '#E74C3C', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
  saveBtn: { backgroundColor: '#C9A84C', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  saveBtnText: { color: '#0A1628', fontWeight: 'bold', fontSize: 13 },

  list: { paddingHorizontal: 16 },
  formContainer: { paddingHorizontal: 16 },

  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  emptySubText: { color: '#607D8B', fontSize: 13, marginTop: 4 },

  card: {
    backgroundColor: '#0F2137', borderRadius: 12,
    padding: 14, marginBottom: 10,
    borderLeftWidth: 4, borderLeftColor: '#E74C3C',
  },
  cardTop: { flexDirection: 'row', marginBottom: 10 },
  cardTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  cardMeta: { color: '#607D8B', fontSize: 11, marginBottom: 2 },
  cardCreated: { color: '#4A90D9', fontSize: 10, marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: 8 },
  editBtn: { backgroundColor: '#1E3A5F', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  editBtnText: { color: '#4A90D9', fontSize: 12, fontWeight: 'bold' },
  pdfBtn: { backgroundColor: '#C9A84C', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  pdfBtnText: { color: '#0A1628', fontWeight: 'bold', fontSize: 12 },
  deleteBtn: { backgroundColor: '#E74C3C20', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: '#E74C3C' },
  deleteBtnText: { fontSize: 14 },

  sectionBox: {
    backgroundColor: '#0F2137', borderRadius: 12,
    padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#2A4060',
  },
  sectionTitle: { color: '#E74C3C', fontSize: 13, fontWeight: 'bold', marginBottom: 10 },

  fieldLabel: { color: '#B0BEC5', fontSize: 11, marginBottom: 4 },
  input: {
    backgroundColor: '#1A2F4A', borderWidth: 1, borderColor: '#2A4060',
    borderRadius: 8, padding: 10, color: '#FFFFFF', fontSize: 13,
  },
});