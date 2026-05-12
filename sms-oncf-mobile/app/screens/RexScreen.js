import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, TextInput, Modal, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateAndSharePDF } from '../utils/pdfUtils';
import { API_URL } from '../services/authService';

const REX_API = API_URL.replace('/auth', '/rex');

const EMPTY_REX = {
  titre: '',
  dateHeure: '',
  lieu: '',
  materielConcerne: '',
  operationEnCours: '',
  detectionPanne: '',
  naturePanne: '',
  alerteProcedure: '',
  securisationSite: '',
  demandeSecours: '',
  tentativesDepannage: '',
  resolutionIncident: '',
  causeDirecte: '',
  causesIndirectes: '',
  impactCirculations: '',
  impactTrain: '',
  couts: '',
  recommandations: '',
  conclusion: '',
};

export default function RexScreen({ navigation }) {
  const [step, setStep] = useState(0); // 0=liste, 1=formulaire
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [rexList, setRexList] = useState([]);
  const [form, setForm] = useState(EMPTY_REX);
  const [editingId, setEditingId] = useState(null);

  const getToken = async () => await AsyncStorage.getItem('token');

  useEffect(() => { loadRex(); }, []);

  const loadRex = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await axios.get(REX_API, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRexList(res.data);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger les REX');
    } finally {
      setLoading(false);
    }
  };

  const updateForm = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    if (!form.titre) {
      Alert.alert('Erreur', 'Le titre est obligatoire');
      return;
    }
    setSaving(true);
    try {
      const token = await getToken();
      if (editingId) {
        await axios.put(`${REX_API}/${editingId}`, form, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(REX_API, form, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      Alert.alert('Succès', editingId ? 'REX mis à jour !' : 'REX créé !');
      setStep(0);
      setForm(EMPTY_REX);
      setEditingId(null);
      loadRex();
    } catch {
      Alert.alert('Erreur', 'Impossible de sauvegarder');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (rex) => {
    setForm({
      titre: rex.titre || '',
      dateHeure: rex.dateHeure || '',
      lieu: rex.lieu || '',
      materielConcerne: rex.materielConcerne || '',
      operationEnCours: rex.operationEnCours || '',
      detectionPanne: rex.detectionPanne || '',
      naturePanne: rex.naturePanne || '',
      alerteProcedure: rex.alerteProcedure || '',
      securisationSite: rex.securisationSite || '',
      demandeSecours: rex.demandeSecours || '',
      tentativesDepannage: rex.tentativesDepannage || '',
      resolutionIncident: rex.resolutionIncident || '',
      causeDirecte: rex.causeDirecte || '',
      causesIndirectes: rex.causesIndirectes || '',
      impactCirculations: rex.impactCirculations || '',
      impactTrain: rex.impactTrain || '',
      couts: rex.couts || '',
      recommandations: rex.recommandations || '',
      conclusion: rex.conclusion || '',
    });
    setEditingId(rex.id);
    setStep(1);
  };

  const handleDelete = async (rex) => {
    const confirmed = Platform.OS === 'web'
      ? window.confirm(`Supprimer "${rex.titre}" ?`)
      : await new Promise(resolve => Alert.alert('Confirmation', `Supprimer "${rex.titre}" ?`, [
          { text: 'Annuler', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Supprimer', style: 'destructive', onPress: () => resolve(true) },
        ]));
    if (!confirmed) return;
    try {
      const token = await getToken();
      await axios.delete(`${REX_API}/${rex.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadRex();
    } catch {
      Alert.alert('Erreur', 'Impossible de supprimer');
    }
  };

  const generatePDF = async (rex) => {
    setGenerating(true);
    try {
      const section = (title, content, color = '#1E3A5F') =>
        content ? `
          <div style="margin-bottom:10px;">
            <div style="background:${color};color:white;padding:6px 10px;font-weight:bold;font-size:11px;border-radius:4px 4px 0 0;">${title}</div>
            <div style="border:1px solid #ddd;border-top:none;padding:8px 10px;font-size:11px;border-radius:0 0 4px 4px;">${content}</div>
          </div>` : '';

      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: Arial, sans-serif; font-size: 11px; color: #1a1a2e; padding: 16px; }
.header { background: #0A1628; padding: 12px 16px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; border-radius: 6px; }
.oncf { color: #C9A84C; font-size: 20px; font-weight: bold; letter-spacing: 2px; }
.header-right { color: white; text-align: right; font-size: 10px; }
.title-box { text-align: center; background: #E67E22; color: white; padding: 10px; font-weight: bold; font-size: 14px; border-radius: 6px; margin-bottom: 12px; }
.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
.info-item { background: #f8f9fa; border-left: 3px solid #E67E22; padding: 6px 10px; border-radius: 0 4px 4px 0; }
.info-label { font-size: 9px; color: #607D8B; }
.info-value { font-size: 11px; font-weight: bold; margin-top: 2px; }
.section-group { margin-bottom: 14px; }
.section-group-title { font-weight: bold; text-decoration: underline; font-size: 12px; color: #E67E22; margin-bottom: 6px; }
.footer { margin-top: 16px; border-top: 2px solid #E67E22; padding-top: 8px; font-size: 10px; color: #607D8B; display: flex; justify-content: space-between; }
</style>
</head><body>

<div class="header">
  <div>
    <div class="oncf">ONCF</div>
    <div style="color:#B0BEC5;font-size:10px;">Direction Régionale Infrastructure Centre — DRIC</div>
  </div>
  <div class="header-right">
    <div style="font-weight:bold;">Retour d'Expérience</div>
    <div style="color:#E67E22;">REX — SMS Sécurité Ferroviaire</div>
  </div>
</div>

<div class="title-box">${rex.titre || 'REX — Retour d\'Expérience'}</div>

<div class="info-grid">
  <div class="info-item"><div class="info-label">Date et heure</div><div class="info-value">${rex.dateHeure || '—'}</div></div>
  <div class="info-item"><div class="info-label">Lieu</div><div class="info-value">${rex.lieu || '—'}</div></div>
  <div class="info-item"><div class="info-label">Matériel concerné</div><div class="info-value">${rex.materielConcerne || '—'}</div></div>
  <div class="info-item"><div class="info-label">Opération en cours</div><div class="info-value">${rex.operationEnCours || '—'}</div></div>
</div>

<div class="section-group">
  <div class="section-group-title">Déroulement de l'incident</div>
  ${section('Détection de la panne', rex.detectionPanne)}
  ${section('Nature de la panne', rex.naturePanne)}
  ${section('Procédure d\'alerte', rex.alerteProcedure)}
  ${section('Sécurisation du site', rex.securisationSite)}
  ${section('Demande de secours', rex.demandeSecours)}
  ${section('Tentatives de dépannage', rex.tentativesDepannage)}
  ${section('Résolution de l\'incident', rex.resolutionIncident)}
</div>

<div class="section-group">
  <div class="section-group-title">Analyse des causes</div>
  ${section('Cause directe', rex.causeDirecte, '#E74C3C')}
  ${section('Causes indirectes', rex.causesIndirectes, '#E67E22')}
</div>

<div class="section-group">
  <div class="section-group-title">Conséquences</div>
  ${section('Impact sur les circulations', rex.impactCirculations)}
  ${section('Impact sur le train', rex.impactTrain)}
  ${section('Coûts', rex.couts)}
</div>

${section('Recommandations', rex.recommandations, '#27AE60')}
${section('Conclusion', rex.conclusion, '#0A1628')}

<div class="footer">
  <span>ONCF · SMS · Document confidentiel — Usage interne</span>
  <span>Généré le ${new Date().toLocaleDateString('fr-FR')}</span>
</div>
</body></html>`;

      await generateAndSharePDF(html, { dialogTitle: `REX — ${rex.titre}` });
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
              <Text style={styles.headerTitle}>REX</Text>
              <Text style={styles.headerSub}>Retour d'Expérience</Text>
            </View>
            <TouchableOpacity style={styles.addBtn} onPress={() => { setForm(EMPTY_REX); setEditingId(null); setStep(1); }}>
              <Text style={styles.addBtnText}>+ Nouveau</Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading
          ? <ActivityIndicator color="#E67E22" style={{ marginTop: 40 }} />
          : (
            <ScrollView style={styles.list}>
              {rexList.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyIcon}>📋</Text>
                  <Text style={styles.emptyText}>Aucun REX créé</Text>
                  <Text style={styles.emptySubText}>Appuyez sur "+ Nouveau" pour commencer</Text>
                </View>
              ) : (
                rexList.map(rex => (
                  <View key={rex.id} style={styles.card}>
                    <View style={styles.cardTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>{rex.titre}</Text>
                        <Text style={styles.cardMeta}>📅 {rex.dateHeure || '—'} · 📍 {rex.lieu || '—'}</Text>
                        {rex.createdAt && (
                          <Text style={styles.cardCreated}>
                            Créé le {new Date(rex.createdAt).toLocaleDateString('fr-FR')}
                          </Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.cardActions}>
                      <TouchableOpacity style={styles.editBtn} onPress={() => handleEdit(rex)}>
                        <Text style={styles.editBtnText}>✏️ Modifier</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.pdfBtn, generating && { opacity: 0.6 }]}
                        onPress={() => generatePDF(rex)}
                        disabled={generating}
                      >
                        {generating
                          ? <ActivityIndicator color="#0A1628" size="small" />
                          : <Text style={styles.pdfBtnText}>📄 PDF</Text>
                        }
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(rex)}>
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
          <TouchableOpacity onPress={() => { setStep(0); setForm(EMPTY_REX); setEditingId(null); }}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>{editingId ? 'Modifier REX' : 'Nouveau REX'}</Text>
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

          {/* Titre */}
          <View style={styles.sectionBox}>
            <Text style={styles.sectionTitle}>📌 Titre du REX *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Panne de la régaleuse sur LGV2"
              placeholderTextColor="#607D8B"
              value={form.titre}
              onChangeText={v => updateForm('titre', v)}
            />
          </View>

          {/* Contexte */}
          <View style={styles.sectionBox}>
            <Text style={styles.sectionTitle}>📍 Contexte de l'incident</Text>
            <Field label="Date et heure" field="dateHeure" placeholder="Ex: 15/03/2025 à 03h30" />
            <Field label="Lieu" field="lieu" placeholder="Ex: LGV2, km 128, entre PCV 111 et 136" />
            <Field label="Matériel concerné" field="materielConcerne" placeholder="Ex: Régaleuse DH 400" />
            <Field label="Opération en cours" field="operationEnCours" placeholder="Ex: Maintenance de la voie ballast" />
          </View>

          {/* Déroulement */}
          <View style={styles.sectionBox}>
            <Text style={styles.sectionTitle}>📋 Déroulement de l'incident</Text>
            <Field label="Détection de la panne" field="detectionPanne" multiline />
            <Field label="Nature de la panne" field="naturePanne" multiline />
            <Field label="Procédure d'alerte" field="alerteProcedure" multiline />
            <Field label="Sécurisation du site" field="securisationSite" multiline />
            <Field label="Demande de secours" field="demandeSecours" multiline />
            <Field label="Tentatives de dépannage" field="tentativesDepannage" multiline />
            <Field label="Résolution de l'incident" field="resolutionIncident" multiline />
          </View>

          {/* Causes */}
          <View style={styles.sectionBox}>
            <Text style={styles.sectionTitle}>🔍 Analyse des causes</Text>
            <Field label="Cause directe" field="causeDirecte" multiline />
            <Field label="Causes indirectes" field="causesIndirectes" multiline />
          </View>

          {/* Conséquences */}
          <View style={styles.sectionBox}>
            <Text style={styles.sectionTitle}>⚠️ Conséquences</Text>
            <Field label="Impact sur les circulations" field="impactCirculations" placeholder="Ex: Aucun impact constaté" />
            <Field label="Impact sur le train" field="impactTrain" placeholder="Ex: Aucun impact constaté" />
            <Field label="Coûts (main-d'œuvre, matériel, pertes)" field="couts" multiline />
          </View>

          {/* Recommandations */}
          <View style={styles.sectionBox}>
            <Text style={styles.sectionTitle}>✅ Recommandations</Text>
            <Field label="Recommandations" field="recommandations" multiline />
          </View>

          {/* Conclusion */}
          <View style={styles.sectionBox}>
            <Text style={styles.sectionTitle}>📝 Conclusion</Text>
            <Field label="Conclusion" field="conclusion" multiline />
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

  addBtn: { backgroundColor: '#E67E22', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
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
    borderLeftWidth: 4, borderLeftColor: '#E67E22',
  },
  cardTop: { flexDirection: 'row', marginBottom: 10 },
  cardTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  cardMeta: { color: '#607D8B', fontSize: 11, marginBottom: 2 },
  cardCreated: { color: '#4A90D9', fontSize: 10 },
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
  sectionTitle: { color: '#E67E22', fontSize: 13, fontWeight: 'bold', marginBottom: 10 },

  fieldLabel: { color: '#B0BEC5', fontSize: 11, marginBottom: 4 },
  input: {
    backgroundColor: '#1A2F4A', borderWidth: 1, borderColor: '#2A4060',
    borderRadius: 8, padding: 10, color: '#FFFFFF', fontSize: 13,
  },
});