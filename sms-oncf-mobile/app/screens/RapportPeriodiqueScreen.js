import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { API_URL } from '../services/authService';

const PLANNING_API = API_URL.replace('/auth', '/planning');

const MOIS_NOMS = [
  '', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export default function RapportPeriodiqueScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [step, setStep] = useState(0); // 0=sélection période, 1=formulaire

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [annee, setAnnee] = useState(currentYear);
  const [mois, setMois] = useState(currentMonth);
  const [stats, setStats] = useState(null);

  // Champs manuels
  const [responsable, setResponsable] = useState('');
  const [fonction, setFonction] = useState('CHEF DE DISTRICT 102V LGV');
  const [recommendations, setRecommendations] = useState('RAS');
  const [nonConformites, setNonConformites] = useState([
    { date: '', nonConformite: '', action: '' },
    { date: '', nonConformite: '', action: '' },
  ]);

  const getToken = async () => await AsyncStorage.getItem('token');

  const loadStats = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await axios.get(
        `${PLANNING_API}/rapport?annee=${annee}&mois=${mois}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStats(res.data);

      // Pré-remplir responsable depuis AsyncStorage
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        setResponsable(user.fullName || '');
      }

      setStep(1);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger les données du planning');
    } finally {
      setLoading(false);
    }
  };

  const updateNonConformite = (idx, field, value) => {
    const updated = [...nonConformites];
    updated[idx] = { ...updated[idx], [field]: value };
    setNonConformites(updated);
  };

  const addNonConformite = () => {
    setNonConformites([...nonConformites, { date: '', nonConformite: '', action: '' }]);
  };

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const collab = stats?.collaborateurs || {};
      const chantier = stats?.chantier || {};

      const periodeDebut = `01/${String(mois).padStart(2, '0')}/${annee}`;
      const dernierJour = new Date(annee, mois, 0).getDate();
      const periodeFin = `${dernierJour}/${String(mois).padStart(2, '0')}/${annee}`;

      const nonConfHtml = nonConformites
        .filter(nc => nc.date || nc.nonConformite || nc.action)
        .map(nc => `
          <tr>
            <td style="font-size:11px;text-align:center;">${nc.date || ''}</td>
            <td style="font-size:11px;">${nc.nonConformite || ''}</td>
            <td style="font-size:11px;">${nc.action || ''}</td>
          </tr>
        `).join('') || `
          <tr>
            <td colspan="3" style="text-align:center;font-size:11px;color:#607D8B;">Aucune non-conformité relevée</td>
          </tr>
        `;

      const html = `
        <!DOCTYPE html><html><head><meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 11px; color: #1a1a2e; padding: 16px; }

          .header-top { display: grid; grid-template-columns: 1fr 2fr 1fr; border: 1px solid #ccc; margin-bottom: 8px; }
          .header-cell { padding: 6px 10px; border-right: 1px solid #ccc; font-size: 10px; }
          .oncf-logo { color: #C9A84C; font-size: 16px; font-weight: bold; letter-spacing: 2px; }

          .info-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
          .info-table td { padding: 6px 10px; border: 1px solid #ccc; font-size: 11px; }
          .info-label { background: #f0f0f0; font-weight: bold; width: 220px; }

          .bilan-title {
            background: #1E3A5F; color: white;
            text-align: center; font-weight: bold;
            font-size: 12px; padding: 8px;
            margin: 12px 0 0;
          }
          .section-yellow {
            background: #FFD700; color: #1a1a2e;
            text-align: center; font-weight: bold;
            font-size: 11px; padding: 6px;
          }

          table.stats { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
          table.stats th {
            background: #f0f0f0; padding: 6px 8px;
            font-size: 10px; border: 1px solid #ccc;
            text-align: center;
          }
          table.stats td {
            padding: 6px 8px; border: 1px solid #ccc;
            text-align: center; font-size: 12px; font-weight: bold;
          }
          .prevu-header { background: #E8E8E8; }
          .realise-header { background: #E8E8E8; }
          .avancement-val { color: #27AE60; font-size: 14px; }

          table.synthese { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
          table.synthese th {
            background: #1E3A5F; color: white;
            padding: 6px 8px; font-size: 10px;
            border: 1px solid #ccc; text-align: center;
          }
          table.synthese td {
            padding: 6px 8px; border: 1px solid #ccc;
            font-size: 11px; vertical-align: middle;
          }

          .reco-box {
            border: 1px solid #ccc; padding: 10px;
            margin: 10px 0; min-height: 50px;
            font-size: 11px;
          }
          .reco-label { font-weight: bold; text-decoration: underline; font-size: 11px; margin-bottom: 6px; }

          .footer-sig {
            display: flex; justify-content: space-between;
            margin-top: 20px; font-size: 11px;
            border-top: 1px solid #ccc; padding-top: 10px;
          }
        </style>
        </head><body>

        <!-- En-tête -->
        <div class="header-top">
          <div class="header-cell">
            <div>Référence : DR.PSC.M1C.CISF.024</div>
            <div>Version 1 du 20/06/2013</div>
            <div>Contrôle et inspection sécurité ferroviaire</div>
            <div>Page 1 sur 1</div>
          </div>
          <div class="header-cell" style="text-align:center;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:4px;">
            <div class="oncf-logo">ONCF</div>
            <div style="font-weight:bold;font-size:12px;">Compte Rendu de contrôles des procédures, documentation,</div>
            <div style="font-size:11px;">installations matériel et autres équipement</div>
          </div>
          <div class="header-cell" style="text-align:right;">
            <div>Pole Infrastructure & Circulation</div>
            <div style="font-weight:bold;">D R I Centre.</div>
            <div style="font-weight:bold;font-size:14px;">*KN1</div>
          </div>
        </div>

        <!-- Infos responsable -->
        <table class="info-table">
          <tr>
            <td class="info-label">Responsable de l'action du contrôle</td>
            <td>Mr. ${responsable || '___________'}</td>
          </tr>
          <tr>
            <td class="info-label">(KN1)</td>
            <td>Fonction assurée : ${fonction || '___________'}</td>
          </tr>
          <tr>
            <td class="info-label">Période des contrôles</td>
            <td>DU ${periodeDebut} AU ${periodeFin}</td>
          </tr>
        </table>

        <!-- Titre bilan -->
        <div class="bilan-title">BILAN DES CONTROLES DE SECURITE REALISES AU COURS DE LA PERIODE</div>

        <!-- Collaborateurs -->
        <div class="section-yellow">Collaborateurs/procédures – Documentation</div>
        <table class="stats">
          <thead>
            <tr>
              <th colspan="3" class="prevu-header">PREVU</th>
              <th colspan="3" class="realise-header">REALISE</th>
            </tr>
            <tr>
              <th>Annuel</th>
              <th>Mois</th>
              <th>Cumul</th>
              <th>Mois</th>
              <th>Cumul</th>
              <th>Avancement</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${collab.annuelPrevu || 0}</td>
              <td>${collab.moisPrevu || 0}</td>
              <td>${collab.cumulPrevu || 0}</td>
              <td>${collab.moisRealise || 0}</td>
              <td>${collab.cumulRealise || 0}</td>
              <td class="avancement-val">${collab.avancement || 0}%</td>
            </tr>
          </tbody>
        </table>

        <!-- Chantier -->
        <div class="section-yellow">Chantier /procédures – Documentation</div>
        <table class="stats">
          <thead>
            <tr>
              <th colspan="3" class="prevu-header">PREVU</th>
              <th colspan="3" class="realise-header">REALISE</th>
            </tr>
            <tr>
              <th>Annuel</th>
              <th>Mois</th>
              <th>Cumul</th>
              <th>Mois</th>
              <th>Cumul</th>
              <th>Avancement</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${chantier.annuelPrevu || 0}</td>
              <td>${chantier.moisPrevu || 0}</td>
              <td>${chantier.cumulPrevu || 0}</td>
              <td>${chantier.moisRealise || 0}</td>
              <td>${chantier.cumulRealise || 0}</td>
              <td class="avancement-val">${chantier.avancement || 0}%</td>
            </tr>
          </tbody>
        </table>

        <!-- Synthèse non-conformités -->
        <table class="synthese">
          <thead>
            <tr>
              <th style="width:100px;">Dates des contrôles</th>
              <th>Synthèse des principales non-conformités relevées</th>
              <th>Actions réalisées ou proposées par le KN1</th>
            </tr>
          </thead>
          <tbody>${nonConfHtml}</tbody>
        </table>

        <!-- Recommandations -->
        <div class="reco-label">Recommandations</div>
        <div class="reco-box">${recommendations || 'RAS'}</div>

        <!-- Signatures -->
        <div class="footer-sig">
          <div>
            <div>Dressé par : Mr ${responsable || '___________'}</div>
            <div style="margin-top:6px;">À KENITRA, LE ${periodeFin}</div>
            <div style="margin-top:30px;">Signature :</div>
          </div>
          <div style="text-align:right;">
            <div><u>Vérifié et signé par le Chargé technique et sécurité voie</u></div>
            <div style="margin-top:6px;">Signature :</div>
          </div>
        </div>

        </body></html>
      `;

      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Rapport Périodique ${MOIS_NOMS[mois]} ${annee}`,
        UTI: 'com.adobe.pdf',
      });

    } catch (err) {
      Alert.alert('Erreur', 'Impossible de générer le PDF');
    } finally {
      setGenerating(false);
    }
  };

  // ===== ÉTAPE 0 — Sélection période =====
  if (step === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Rapport Périodique</Text>
          <Text style={styles.headerSub}>Synthèse mensuelle — DRIC</Text>
        </View>

        <ScrollView style={styles.formContainer}>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Sélectionnez l'année et le mois pour générer le rapport périodique
            </Text>
          </View>

          {/* Sélection Année */}
          <Text style={styles.inputLabel}>Année</Text>
          <View style={styles.yearRow}>
            <TouchableOpacity
              style={styles.yearBtn}
              onPress={() => setAnnee(annee - 1)}
            >
              <Text style={styles.yearBtnText}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.yearValue}>{annee}</Text>
            <TouchableOpacity
              style={styles.yearBtn}
              onPress={() => setAnnee(annee + 1)}
            >
              <Text style={styles.yearBtnText}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Sélection Mois */}
          <Text style={styles.inputLabel}>Mois</Text>
          <View style={styles.moisGrid}>
            {MOIS_NOMS.slice(1).map((nom, idx) => {
              const m = idx + 1;
              return (
                <TouchableOpacity
                  key={m}
                  style={[styles.moisBtn, mois === m && styles.moisBtnActive]}
                  onPress={() => setMois(m)}
                >
                  <Text style={[styles.moisBtnText, mois === m && styles.moisBtnTextActive]}>
                    {nom.substring(0, 3)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.periodeSummary}>
            <Text style={styles.periodeSummaryText}>
              📅 Période : {MOIS_NOMS[mois]} {annee}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.nextBtn, loading && { opacity: 0.6 }]}
            onPress={loadStats}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#0A1628" />
              : <Text style={styles.nextBtnText}>Continuer → Remplir le rapport</Text>
            }
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ===== ÉTAPE 1 — Formulaire =====
  if (step === 1) {
    const collab = stats?.collaborateurs || {};
    const chantier = stats?.chantier || {};

    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep(0)}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Rapport {MOIS_NOMS[mois]} {annee}</Text>
          <Text style={styles.headerSub}>Complétez les informations</Text>
        </View>

        <ScrollView style={styles.formContainer}>

          {/* Infos responsable */}
          <View style={styles.sectionBox}>
            <Text style={styles.sectionBoxTitle}>Informations générales</Text>

            <Text style={styles.inputLabel}>Responsable (KN1) *</Text>
            <TextInput style={styles.input}
              placeholder="Nom et Prénom..."
              placeholderTextColor="#607D8B"
              value={responsable}
              onChangeText={setResponsable} />

            <Text style={styles.inputLabel}>Fonction</Text>
            <TextInput style={styles.input}
              placeholder="Ex: CHEF DE DISTRICT 102V LGV"
              placeholderTextColor="#607D8B"
              value={fonction}
              onChangeText={setFonction} />
          </View>

          {/* Bilan automatique */}
          <View style={styles.bilanBox}>
            <Text style={styles.bilanTitle}>Bilan automatique depuis le planning</Text>

            {/* Collaborateurs */}
            <View style={styles.bilanSection}>
              <View style={styles.bilanSectionHeader}>
                <Text style={styles.bilanSectionTitle}>👤 Collaborateurs/Procédures</Text>
              </View>
              <View style={styles.bilanRow}>
                <View style={styles.bilanCol}>
                  <Text style={styles.bilanLabel}>Annuel prévu</Text>
                  <Text style={styles.bilanValue}>{collab.annuelPrevu || 0}</Text>
                </View>
                <View style={styles.bilanCol}>
                  <Text style={styles.bilanLabel}>Mois prévu</Text>
                  <Text style={styles.bilanValue}>{collab.moisPrevu || 0}</Text>
                </View>
                <View style={styles.bilanCol}>
                  <Text style={styles.bilanLabel}>Cumul prévu</Text>
                  <Text style={styles.bilanValue}>{collab.cumulPrevu || 0}</Text>
                </View>
              </View>
              <View style={styles.bilanRow}>
                <View style={styles.bilanCol}>
                  <Text style={styles.bilanLabel}>Mois réalisé</Text>
                  <Text style={[styles.bilanValue, { color: '#4A90D9' }]}>{collab.moisRealise || 0}</Text>
                </View>
                <View style={styles.bilanCol}>
                  <Text style={styles.bilanLabel}>Cumul réalisé</Text>
                  <Text style={[styles.bilanValue, { color: '#4A90D9' }]}>{collab.cumulRealise || 0}</Text>
                </View>
                <View style={styles.bilanCol}>
                  <Text style={styles.bilanLabel}>Avancement</Text>
                  <Text style={[styles.bilanValue, { color: '#27AE60' }]}>{collab.avancement || 0}%</Text>
                </View>
              </View>
            </View>

            {/* Chantier */}
            <View style={[styles.bilanSection, { marginTop: 8 }]}>
              <View style={[styles.bilanSectionHeader, { backgroundColor: '#27AE6020' }]}>
                <Text style={[styles.bilanSectionTitle, { color: '#27AE60' }]}>🏗 Chantier/Procédures</Text>
              </View>
              <View style={styles.bilanRow}>
                <View style={styles.bilanCol}>
                  <Text style={styles.bilanLabel}>Annuel prévu</Text>
                  <Text style={styles.bilanValue}>{chantier.annuelPrevu || 0}</Text>
                </View>
                <View style={styles.bilanCol}>
                  <Text style={styles.bilanLabel}>Mois prévu</Text>
                  <Text style={styles.bilanValue}>{chantier.moisPrevu || 0}</Text>
                </View>
                <View style={styles.bilanCol}>
                  <Text style={styles.bilanLabel}>Cumul prévu</Text>
                  <Text style={styles.bilanValue}>{chantier.cumulPrevu || 0}</Text>
                </View>
              </View>
              <View style={styles.bilanRow}>
                <View style={styles.bilanCol}>
                  <Text style={styles.bilanLabel}>Mois réalisé</Text>
                  <Text style={[styles.bilanValue, { color: '#4A90D9' }]}>{chantier.moisRealise || 0}</Text>
                </View>
                <View style={styles.bilanCol}>
                  <Text style={styles.bilanLabel}>Cumul réalisé</Text>
                  <Text style={[styles.bilanValue, { color: '#4A90D9' }]}>{chantier.cumulRealise || 0}</Text>
                </View>
                <View style={styles.bilanCol}>
                  <Text style={styles.bilanLabel}>Avancement</Text>
                  <Text style={[styles.bilanValue, { color: '#27AE60' }]}>{chantier.avancement || 0}%</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Non-conformités manuelles */}
          <View style={styles.sectionBox}>
            <Text style={styles.sectionBoxTitle}>Synthèse des non-conformités</Text>
            <Text style={styles.sectionBoxSub}>Optionnel — laissez vide si RAS</Text>

            {nonConformites.map((nc, idx) => (
              <View key={idx} style={styles.ncRow}>
                <Text style={styles.ncLabel}>Entrée {idx + 1}</Text>
                <TextInput style={styles.input}
                  placeholder="Date (ex: 10/09/2024)"
                  placeholderTextColor="#607D8B"
                  value={nc.date}
                  onChangeText={v => updateNonConformite(idx, 'date', v)} />
                <TextInput style={[styles.input, { marginTop: 6 }]}
                  placeholder="Non-conformité relevée..."
                  placeholderTextColor="#607D8B"
                  value={nc.nonConformite}
                  onChangeText={v => updateNonConformite(idx, 'nonConformite', v)} />
                <TextInput style={[styles.input, { marginTop: 6 }]}
                  placeholder="Action réalisée ou proposée..."
                  placeholderTextColor="#607D8B"
                  value={nc.action}
                  onChangeText={v => updateNonConformite(idx, 'action', v)} />
              </View>
            ))}

            <TouchableOpacity style={styles.addNcBtn} onPress={addNonConformite}>
              <Text style={styles.addNcBtnText}>+ Ajouter une ligne</Text>
            </TouchableOpacity>
          </View>

          {/* Recommandations */}
          <View style={styles.sectionBox}>
            <Text style={styles.sectionBoxTitle}>Recommandations</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top', marginTop: 8 }]}
              placeholder="Recommandations..."
              placeholderTextColor="#607D8B"
              multiline
              value={recommendations}
              onChangeText={setRecommendations}
            />
          </View>

          {/* Bouton générer */}
          <TouchableOpacity
            style={[styles.generateBtn, generating && { opacity: 0.6 }]}
            onPress={generatePDF}
            disabled={generating}
          >
            {generating
              ? <ActivityIndicator color="#0A1628" />
              : <Text style={styles.generateBtnText}>📄 Générer le Rapport PDF</Text>
            }
          </TouchableOpacity>

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
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  headerSub: { color: '#607D8B', fontSize: 11, marginTop: 2 },

  formContainer: { paddingHorizontal: 16 },

  infoBox: {
    backgroundColor: '#1E3A5F', borderRadius: 8, padding: 10,
    borderLeftWidth: 3, borderLeftColor: '#4A90D9', marginBottom: 16,
  },
  infoText: { color: '#B0BEC5', fontSize: 12 },

  // Sélection année
  yearRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 20, marginTop: 8, marginBottom: 16,
  },
  yearBtn: {
    backgroundColor: '#1E3A5F', borderRadius: 8,
    width: 44, height: 44,
    alignItems: 'center', justifyContent: 'center',
  },
  yearBtnText: { color: '#C9A84C', fontSize: 24, fontWeight: 'bold' },
  yearValue: { color: '#FFFFFF', fontSize: 28, fontWeight: 'bold', minWidth: 80, textAlign: 'center' },

  // Sélection mois
  moisGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 8, marginTop: 8, marginBottom: 12,
  },
  moisBtn: {
    width: '22%', backgroundColor: '#0F2137',
    borderRadius: 8, padding: 10, alignItems: 'center',
    borderWidth: 1, borderColor: '#2A4060',
  },
  moisBtnActive: { backgroundColor: '#C9A84C', borderColor: '#C9A84C' },
  moisBtnText: { color: '#607D8B', fontSize: 12 },
  moisBtnTextActive: { color: '#0A1628', fontWeight: 'bold' },

  periodeSummary: {
    backgroundColor: '#1E3A5F', borderRadius: 8,
    padding: 12, alignItems: 'center', marginBottom: 16,
  },
  periodeSummaryText: { color: '#C9A84C', fontSize: 14, fontWeight: 'bold' },

  inputLabel: { color: '#B0BEC5', fontSize: 12, marginBottom: 4, marginTop: 10 },
  input: {
    backgroundColor: '#1A2F4A', borderWidth: 1, borderColor: '#2A4060',
    borderRadius: 8, padding: 10, color: '#FFFFFF', fontSize: 13,
  },
  nextBtn: {
    backgroundColor: '#C9A84C', borderRadius: 10,
    padding: 14, alignItems: 'center', marginTop: 8,
  },
  nextBtnText: { color: '#0A1628', fontWeight: 'bold', fontSize: 15 },

  // Sections
  sectionBox: {
    backgroundColor: '#0F2137', borderRadius: 12,
    padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#2A4060',
  },
  sectionBoxTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  sectionBoxSub: { color: '#607D8B', fontSize: 11, marginBottom: 8 },

  // Bilan automatique
  bilanBox: {
    backgroundColor: '#0F2137', borderRadius: 12,
    padding: 16, marginBottom: 12,
    borderWidth: 2, borderColor: '#C9A84C',
  },
  bilanTitle: { color: '#C9A84C', fontSize: 13, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  bilanSection: {
    backgroundColor: '#1A2F4A', borderRadius: 10, overflow: 'hidden',
  },
  bilanSectionHeader: {
    backgroundColor: '#4A90D920', padding: 8,
  },
  bilanSectionTitle: { color: '#4A90D9', fontSize: 12, fontWeight: 'bold' },
  bilanRow: { flexDirection: 'row', padding: 8, gap: 4 },
  bilanCol: { flex: 1, alignItems: 'center' },
  bilanLabel: { color: '#607D8B', fontSize: 9, marginBottom: 2 },
  bilanValue: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },

  // Non-conformités
  ncRow: {
    backgroundColor: '#1A2F4A', borderRadius: 8,
    padding: 12, marginBottom: 8,
  },
  ncLabel: { color: '#607D8B', fontSize: 11, marginBottom: 6 },
  addNcBtn: {
    borderWidth: 1, borderColor: '#4A90D9', borderRadius: 8,
    padding: 10, alignItems: 'center', marginTop: 8,
    borderStyle: 'dashed',
  },
  addNcBtnText: { color: '#4A90D9', fontSize: 13 },

  generateBtn: {
    backgroundColor: '#C9A84C', borderRadius: 10,
    padding: 14, alignItems: 'center', marginTop: 8,
  },
  generateBtnText: { color: '#0A1628', fontWeight: 'bold', fontSize: 15 },
});