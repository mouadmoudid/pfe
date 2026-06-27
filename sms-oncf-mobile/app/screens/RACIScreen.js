import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, TextInput, Modal, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateAndSharePDF } from '../utils/pdfUtils';
import QRCode from 'react-native-qrcode-svg';
import { API_URL } from '../services/authService';

const CL_API = API_URL.replace('/auth', '/checklists');

const MOIS_NOMS = [
  '', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const KN_OPTIONS = ['KN1', 'KN2', 'KN3'];

const canExport = (role) => role !== 'AGENT';

export default function RACIScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [step, setStep] = useState(0); // 0=période, 1=tableau
  const [userRole, setUserRole] = useState('');

  const Wrapper = Platform.OS === 'web' ? View : SafeAreaView;
  const Scroller = Platform.OS === 'web' ? View : ScrollView;

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [annee, setAnnee] = useState(currentYear);
  const [mois, setMois] = useState(currentMonth);
  const [checklists, setChecklists] = useState([]);

  // Pour chaque checklist : { kn, responsable }
  const [raciMeta, setRaciMeta] = useState({});

  // Modal QR
  const [qrModal, setQrModal] = useState(false);
  const [selectedCL, setSelectedCL] = useState(null);
  const [generatingCollabPDF, setGeneratingCollabPDF] = useState(false);

  const getToken = async () => await AsyncStorage.getItem('token');

  React.useEffect(() => {
    AsyncStorage.getItem('user').then(u => {
      if (u) setUserRole(JSON.parse(u).role || '');
    });
  }, []);

  const loadChecklists = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await axios.get(
        `${CL_API}/raci?annee=${annee}&mois=${mois}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setChecklists(res.data);

      // Init raciMeta avec KN1 par défaut
      const meta = {};
      res.data.forEach(cl => {
        meta[cl.id] = {
          kn: 'KN1',
          responsable: cl.createdByName || '',
        };
      });
      setRaciMeta(meta);
      setStep(1);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger les checklists');
    } finally {
      setLoading(false);
    }
  };

  const updateMeta = (id, field, value) => {
    setRaciMeta(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  };

  // Extraire les constatations non-vides d'une checklist
  const getConstatations = (cl) => {
    return (cl.items || [])
      .filter(item =>
        item.pointCle !== '__GLOBAL__' &&
        item.constatation &&
        item.constatation.trim() !== '' &&
        !item.constatation.startsWith('Completude:') &&
        !item.constatation.startsWith('Existence:')
      );
  };

  // Générer PDF infos collaborateur (pour QR code)
  const generateCollabPDF = async (cl) => {
    setGeneratingCollabPDF(true);
    try {
        const token = await getToken();

        // Récupérer les infos du collaborateur depuis la DB
        let collabInfo = null;
        const matricule = cl.collaborateurMatricule || cl.chantierNom;

        if (cl.collaborateurMatricule) {
        try {
            const res = await axios.get(
            `${API_URL.replace('/auth', '/admin/by-matricule')}/${cl.collaborateurMatricule}`,
            { headers: { Authorization: `Bearer ${token}` } }
            );
            collabInfo = res.data;
        } catch {}
        }

        const nom = collabInfo?.fullName || cl.collaborateurNom || cl.chantierNom || '-';
        const matriculeAff = collabInfo?.matricule || cl.collaborateurMatricule || '-';
        const poste = collabInfo?.poste || '-';
        const siteUp = collabInfo?.siteUp || cl.siteUp || '-';
        const telephone = collabInfo?.telephone || '-';
        const email = collabInfo?.email || '-';

        const html = `
        <!DOCTYPE html><html><head><meta charset="UTF-8">
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a2e; padding: 20px; }
            .header { background: #0A1628; padding: 16px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
            .oncf { color: #C9A84C; font-size: 22px; font-weight: bold; letter-spacing: 3px; }
            .header-right { color: white; text-align: right; font-size: 11px; }
            .avatar-box { text-align: center; padding: 20px; background: #f8f9fa; margin-bottom: 16px; border-radius: 8px; }
            .avatar { font-size: 60px; margin-bottom: 8px; }
            .collab-name { font-size: 20px; font-weight: bold; color: #1E3A5F; }
            .collab-matricule { font-size: 14px; color: #C9A84C; font-weight: bold; margin-top: 4px; }
            .info-box { background: #f8f9fa; border-left: 4px solid #4A90D9; padding: 12px; margin-bottom: 12px; border-radius: 4px; }
            .info-row { display: flex; padding: 8px 0; border-bottom: 1px solid #eee; }
            .info-row:last-child { border-bottom: none; }
            .info-label { font-weight: bold; width: 140px; color: #607D8B; font-size: 11px; }
            .info-value { font-size: 12px; font-weight: bold; color: #1a1a2e; }
            .section-title { background: #1E3A5F; color: #C9A84C; padding: 8px 12px; font-size: 12px; font-weight: bold; margin: 12px 0 6px; border-radius: 4px; }
            .footer { margin-top: 20px; border-top: 1px solid #ccc; padding-top: 10px; font-size: 10px; color: #607D8B; display: flex; justify-content: space-between; }
        </style>
        </head><body>

        <div class="header">
            <div>
            <div class="oncf">ONCF</div>
            <div style="color:#B0BEC5;font-size:11px;">Direction Régionale Infrastructure Centre — DRIC</div>
            </div>
            <div class="header-right">
            <div style="font-weight:bold;">Fiche Collaborateur</div>
            <div style="color:#C9A84C;">SMS — Contrôle & Inspection</div>
            </div>
        </div>

        <div class="avatar-box">
            <div class="avatar">👤</div>
            <div class="collab-name">${nom}</div>
            <div class="collab-matricule">Matricule : ${matriculeAff}</div>
        </div>

        <div class="section-title">Informations personnelles</div>
        <div class="info-box">
            <div class="info-row">
            <div class="info-label">Nom complet :</div>
            <div class="info-value">${nom}</div>
            </div>
            <div class="info-row">
            <div class="info-label">Matricule :</div>
            <div class="info-value">${matriculeAff}</div>
            </div>
            <div class="info-row">
            <div class="info-label">Poste occupé :</div>
            <div class="info-value">${poste}</div>
            </div>
            <div class="info-row">
            <div class="info-label">Site / UP :</div>
            <div class="info-value">${siteUp}</div>
            </div>
            <div class="info-row">
            <div class="info-label">Téléphone :</div>
            <div class="info-value">${telephone}</div>
            </div>
            <div class="info-row">
            <div class="info-label">Email :</div>
            <div class="info-value">${email}</div>
            </div>
        </div>

        <div class="section-title">Informations du contrôle</div>
        <div class="info-box">
            <div class="info-row">
            <div class="info-label">Type contrôle :</div>
            <div class="info-value">${cl.type === 'COLLABORATEUR' ? 'Contrôle Collaborateur' : 'Contrôle Chantier'}</div>
            </div>
            <div class="info-row">
            <div class="info-label">Date contrôle :</div>
            <div class="info-value">${cl.dateControle || '-'}</div>
            </div>
            <div class="info-row">
            <div class="info-label">Site contrôlé :</div>
            <div class="info-value">${cl.siteUp || '-'}</div>
            </div>
            <div class="info-row">
            <div class="info-label">Contrôlé par :</div>
            <div class="info-value">${cl.createdByName || '-'}</div>
            </div>
        </div>

        <div class="footer">
            <span>ONCF · SMS · Document confidentiel — Usage interne</span>
            <span>Généré le ${new Date().toLocaleDateString('fr-FR')}</span>
        </div>

        </body></html>
        `;

        await generateAndSharePDF(html, { dialogTitle: `Fiche — ${nom}` });
    } catch {
        Alert.alert('Erreur', 'Impossible de générer le PDF');
    } finally {
        setGeneratingCollabPDF(false);
        setQrModal(false);
    }
    };

  // Générer le PDF RACI complet
  const generateRACIPDF = async () => {
    setGenerating(true);
    try {
      let rows = '';

      for (const cl of checklists) {
        const meta = raciMeta[cl.id] || { kn: 'KN1', responsable: cl.createdByName || '' };
        const constatations = getConstatations(cl);

        // Toujours afficher le nom du collaborateur
        const nomCollab = cl.collaborateurNom || 'N/A';
        const dateStr = cl.dateControle || '';
        const knStr = meta.kn;
        const responsableStr = meta.responsable;

        if (constatations.length === 0) {
          rows += '<tr>';
          rows += '<td style="font-size:11px;text-align:center;">' + dateStr + '</td>';
          rows += '<td style="font-size:11px;text-align:center;font-weight:bold;">' + knStr + '</td>';
          rows += '<td style="font-size:11px;">' + responsableStr + '</td>';
          rows += '<td style="font-size:11px;color:#27AE60;">RAS</td>';
          rows += '<td style="font-size:11px;"></td>';
          rows += '<td style="text-align:center;padding:8px;vertical-align:middle;">';
          rows += '<div style="font-weight:bold;font-size:12px;color:#000000;">' + nomCollab + '</div>';
          rows += '</td>';
          rows += '</tr>';
        } else {
          const total = constatations.length;
          constatations.forEach((item, idx) => {
            const sousSection = item.sousSection || '';
            const constatation = item.constatation || '';
            const regularisation = item.regularisation || '';

            rows += '<tr>';
            if (idx === 0) {
              rows += '<td rowspan="' + total + '" style="vertical-align:middle;font-size:11px;text-align:center;">' + dateStr + '</td>';
              rows += '<td rowspan="' + total + '" style="vertical-align:middle;font-size:11px;text-align:center;font-weight:bold;">' + knStr + '</td>';
              rows += '<td rowspan="' + total + '" style="vertical-align:middle;font-size:11px;">' + responsableStr + '</td>';
            }
            rows += '<td style="font-size:11px;"><span style="color:#607D8B;font-size:10px;">' + sousSection + '</span><br/>' + constatation + '</td>';
            rows += '<td style="font-size:11px;">' + regularisation + '</td>';
            if (idx === 0) {
              rows += '<td rowspan="' + total + '" style="vertical-align:middle;text-align:center;padding:8px;">';
              rows += '<div style="font-weight:bold;font-size:12px;color:#000000;">' + nomCollab + '</div>';
              rows += '</td>';
            }
            rows += '</tr>';
          });
        }
      }

      const periodeStr = MOIS_NOMS[mois] + ' ' + annee;
      const emptyRow = '<tr><td colspan="6" style="text-align:center;color:#607D8B;padding:20px;">Aucune checklist pour cette periode</td></tr>';

      const html = '<!DOCTYPE html><html><head><meta charset="UTF-8">'
        + '<style>'
        + '* { margin: 0; padding: 0; box-sizing: border-box; }'
        + 'body { font-family: Arial, sans-serif; font-size: 11px; color: #1a1a2e; padding: 12px; }'
        + '.header-top { display: grid; grid-template-columns: 1fr 3fr 1fr; border: 1px solid #ccc; margin-bottom: 10px; }'
        + '.header-cell { padding: 6px 10px; border-right: 1px solid #ccc; font-size: 10px; }'
        + '.oncf-logo { color: #C9A84C; font-size: 16px; font-weight: bold; letter-spacing: 2px; }'
        + 'table { width: 100%; border-collapse: collapse; }'
        + 'th { background: #1E3A5F; color: white; padding: 6px 8px; font-size: 10px; text-align: left; border: 1px solid #ccc; }'
        + 'td { padding: 6px 8px; border: 1px solid #ddd; vertical-align: middle; }'
        + 'tr:nth-child(even) td { background: #f9f9f9; }'
        + '.periode-title { text-align: center; font-size: 13px; font-weight: bold; margin-bottom: 8px; color: #1E3A5F; }'
        + '</style></head><body>'
        + '<div class="header-top">'
        + '<div class="header-cell"><div>Reference : DR.PSC.M1C.CISF.024</div><div style="font-weight:bold;margin-top:4px;">Page 1 sur 1</div></div>'
        + '<div class="header-cell" style="text-align:center;">'
        + '<div class="oncf-logo">ONCF</div>'
        + '<div style="font-weight:bold;font-size:12px;margin-top:4px;">Registre des Actions de Controle et Inspection - RACI</div>'
        + '</div>'
        + '<div class="header-cell" style="text-align:right;"><div style="font-weight:bold;font-size:11px;">ONCF DRIC</div></div>'
        + '</div>'
        + '<div class="periode-title">Periode : ' + periodeStr + '</div>'
        + '<table><thead><tr>'
        + '<th style="width:80px;">Date</th>'
        + '<th style="width:70px;">Nature Action KN1-KN2-KN3</th>'
        + '<th style="width:120px;">Responsable Action</th>'
        + '<th>Principales remarques - Observation</th>'
        + '<th style="width:130px;">Recommandation - Decisions</th>'
        + '<th style="width:110px;">Emargement(s)</th>'
        + '</tr></thead>'
        + '<tbody>' + (rows || emptyRow) + '</tbody>'
        + '</table></body></html>';

      await generateAndSharePDF(html, { dialogTitle: 'RACI ' + periodeStr });
    } catch {
      Alert.alert('Erreur', 'Impossible de générer le RACI');
    } finally {
      setGenerating(false);
    }
  };

  // ===== ÉTAPE 0 — Sélection période =====
  if (step === 0) {
    return (
      <Wrapper style={Platform.OS === 'web' ? styles.webSafe : styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>RACI</Text>
          <Text style={styles.headerSub}>Registre des Actions de Contrôle et Inspection</Text>
        </View>

        <Scroller style={Platform.OS === 'web' ? styles.webScroller : styles.formContainer} {...(Platform.OS !== 'web' && { showsVerticalScrollIndicator: false })}>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Sélectionnez la période pour générer le RACI
            </Text>
          </View>

          {/* Sélection Année */}
          <Text style={styles.inputLabel}>Année</Text>
          <View style={styles.yearRow}>
            <TouchableOpacity style={styles.yearBtn} onPress={() => setAnnee(annee - 1)}>
              <Text style={styles.yearBtnText}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.yearValue}>{annee}</Text>
            <TouchableOpacity style={styles.yearBtn} onPress={() => setAnnee(annee + 1)}>
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
              📅 {MOIS_NOMS[mois]} {annee}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.nextBtn, loading && { opacity: 0.6 }]}
            onPress={loadChecklists}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#0A1628" />
              : <Text style={styles.nextBtnText}>Charger les checklists →</Text>
            }
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </Scroller>
      </Wrapper>
    );
  }

  // ===== ÉTAPE 1 — Tableau RACI =====
  if (step === 1) {
    return (
      <Wrapper style={Platform.OS === 'web' ? styles.webSafe : styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep(0)}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerTitle}>RACI — {MOIS_NOMS[mois]} {annee}</Text>
              <Text style={styles.headerSub}>{checklists.length} checklist(s)</Text>
            </View>
            {canExport(userRole) && (
              <TouchableOpacity
                style={[styles.generateBtn, generating && { opacity: 0.6 }]}
                onPress={generateRACIPDF}
                disabled={generating}
              >
                {generating
                  ? <ActivityIndicator color="#0A1628" size="small" />
                  : <Text style={styles.generateBtnText}>📄 PDF</Text>
                }
              </TouchableOpacity>
            )}
          </View>
        </View>

        <Scroller style={Platform.OS === 'web' ? styles.webScroller : styles.list} {...(Platform.OS !== 'web' && { showsVerticalScrollIndicator: false })}>
          {checklists.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>Aucune checklist pour cette période</Text>
            </View>
          ) : (
            checklists.map(cl => {
              const meta = raciMeta[cl.id] || { kn: 'KN1', responsable: '' };
              const constatations = getConstatations(cl);

              return (
                <View key={cl.id} style={styles.raciCard}>
                  {/* Header checklist */}
                  <View style={styles.raciCardHeader}>
                    <View style={styles.raciCardLeft}>
                      <Text style={styles.raciCardType}>
                        {cl.type === 'COLLABORATEUR' ? '👤' : '🏗'} {cl.type === 'COLLABORATEUR' ? cl.collaborateurNom : cl.chantierNom}
                      </Text>
                      <Text style={styles.raciCardDate}>📅 {cl.dateControle} · {cl.siteUp}</Text>
                    </View>
                    {/* QR Code */}
                    <TouchableOpacity
                    style={styles.qrBtn}
                    onPress={() => { setSelectedCL(cl); setQrModal(true); }}
                    >
                    <QRCode
                        value={JSON.stringify({
                        id: cl.id,
                        nom: cl.collaborateurNom || cl.chantierNom || '',
                        matricule: cl.collaborateurMatricule || '',
                        siteUp: cl.siteUp || '',
                        date: cl.dateControle || '',
                        type: cl.type || '',
                        })}
                        size={60}
                        color="#FFFFFF"
                        backgroundColor="#0F2137"
                    />
                    <Text style={styles.qrNom} numberOfLines={2}>
                        {cl.collaborateurNom || cl.chantierNom || ''}
                    </Text>
                    <Text style={styles.qrLabel}>Émargement</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Nature Action + Responsable */}
                  <View style={styles.raciMetaRow}>
                    <View style={styles.knSelector}>
                      <Text style={styles.raciLabel}>Nature Action</Text>
                      <View style={styles.knRow}>
                        {KN_OPTIONS.map(kn => (
                          <TouchableOpacity
                            key={kn}
                            style={[styles.knBtn, meta.kn === kn && styles.knBtnActive]}
                            onPress={() => updateMeta(cl.id, 'kn', kn)}
                          >
                            <Text style={[styles.knBtnText, meta.kn === kn && styles.knBtnTextActive]}>
                              {kn}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                    <View style={styles.responsableField}>
                      <Text style={styles.raciLabel}>Responsable</Text>
                      <TextInput
                        style={styles.responsableInput}
                        value={meta.responsable}
                        onChangeText={v => updateMeta(cl.id, 'responsable', v)}
                        placeholder="Nom..."
                        placeholderTextColor="#607D8B"
                      />
                    </View>
                  </View>

                  {/* Constatations */}
                  <View style={styles.constHeader}>
                    <Text style={styles.constHeaderText}>Remarques ({constatations.length})</Text>
                    <Text style={styles.constHeaderText}>Décisions</Text>
                  </View>

                  {constatations.length === 0 ? (
                    <View style={styles.rasBox}>
                      <Text style={styles.rasText}>✓ RAS — Aucune constatation</Text>
                    </View>
                  ) : (
                    constatations.map((item, idx) => (
                      <View key={idx} style={styles.constRow}>
                        <View style={styles.constLeft}>
                          <Text style={styles.constSection}>{item.sousSection}</Text>
                          <Text style={styles.constText}>{item.constatation}</Text>
                        </View>
                        <View style={styles.constRight}>
                          <Text style={styles.constDecision}>{item.regularisation || '—'}</Text>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              );
            })
          )}
          <View style={{ height: 40 }} />
        </Scroller>

        {/* Modal QR Code */}
        <Modal
          visible={qrModal}
          transparent
          animationType="slide"
          onRequestClose={() => setQrModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Émargement</Text>
              <Text style={styles.modalSubtitle}>
                {selectedCL?.type === 'COLLABORATEUR'
                  ? selectedCL?.collaborateurNom
                  : selectedCL?.chantierNom}
              </Text>

              {selectedCL && (
                <View style={styles.qrLarge}>
                  <QRCode
                    value={JSON.stringify({
                      id: selectedCL.id,
                      nom: selectedCL.collaborateurNom || selectedCL.chantierNom || '',
                      matricule: selectedCL.collaborateurMatricule || '',
                      siteUp: selectedCL.siteUp || '',
                      date: selectedCL.dateControle || '',
                      type: selectedCL.type || '',
                    })}
                    size={200}
                    color="#0A1628"
                    backgroundColor="#FFFFFF"
                  />
                </View>
              )}

              <Text style={styles.qrHint}>
                Scannez pour accéder à la fiche ou appuyez sur le bouton ci-dessous
              </Text>

              <TouchableOpacity
                style={[styles.generateCollabBtn, generatingCollabPDF && { opacity: 0.6 }]}
                onPress={() => generateCollabPDF(selectedCL)}
                disabled={generatingCollabPDF}
              >
                {generatingCollabPDF
                  ? <ActivityIndicator color="#0A1628" />
                  : <Text style={styles.generateCollabBtnText}>📄 Générer la fiche PDF</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setQrModal(false)}
              >
                <Text style={styles.cancelBtnText}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

      </Wrapper>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A1628' },
  webSafe: { height: '100vh', backgroundColor: '#0A1628' },
  webScroller: { flex: 1, overflow: 'scroll', paddingBottom: 40 },
  header: {
    backgroundColor: '#0F2137', padding: 20,
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20, marginBottom: 12,
  },
  backText: { color: '#C9A84C', fontSize: 14, marginBottom: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  headerSub: { color: '#607D8B', fontSize: 11, marginTop: 2 },

  formContainer: { paddingHorizontal: 16 },
  list: { paddingHorizontal: 16 },

  infoBox: {
    backgroundColor: '#1E3A5F', borderRadius: 8, padding: 10,
    borderLeftWidth: 3, borderLeftColor: '#4A90D9', marginBottom: 16,
  },
  infoText: { color: '#B0BEC5', fontSize: 12 },

  // Sélection année/mois
  inputLabel: { color: '#B0BEC5', fontSize: 12, marginBottom: 6, marginTop: 12 },
  yearRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 20, marginBottom: 16,
  },
  yearBtn: {
    backgroundColor: '#1E3A5F', borderRadius: 8,
    width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
  },
  yearBtnText: { color: '#C9A84C', fontSize: 24, fontWeight: 'bold' },
  yearValue: { color: '#FFFFFF', fontSize: 28, fontWeight: 'bold', minWidth: 80, textAlign: 'center' },
  moisGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
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
  nextBtn: {
    backgroundColor: '#C9A84C', borderRadius: 10,
    padding: 14, alignItems: 'center',
  },
  nextBtnText: { color: '#0A1628', fontWeight: 'bold', fontSize: 15 },

  // Carte RACI
  raciCard: {
    backgroundColor: '#0F2137', borderRadius: 12,
    padding: 14, marginBottom: 14,
    borderLeftWidth: 4, borderLeftColor: '#C9A84C',
  },
  raciCardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 12,
  },
  raciCardLeft: { flex: 1, marginRight: 12 },
  raciCardType: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  raciCardDate: { color: '#607D8B', fontSize: 11 },

  // QR Code
  qrBtn: { alignItems: 'center' },
  qrLabel: { color: '#607D8B', fontSize: 9, marginTop: 4 },

  // Meta (KN + Responsable)
  raciMetaRow: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  knSelector: { flex: 1 },
  raciLabel: { color: '#607D8B', fontSize: 11, marginBottom: 6 },
  knRow: { flexDirection: 'row', gap: 6 },
  knBtn: {
    flex: 1, backgroundColor: '#1A2F4A',
    borderWidth: 1, borderColor: '#2A4060',
    borderRadius: 6, paddingVertical: 8, alignItems: 'center',
  },
  knBtnActive: { backgroundColor: '#C9A84C', borderColor: '#C9A84C' },
  knBtnText: { color: '#607D8B', fontSize: 12, fontWeight: 'bold' },
  knBtnTextActive: { color: '#0A1628', fontWeight: 'bold' },
  responsableField: { flex: 2 },
  responsableInput: {
    backgroundColor: '#1A2F4A', borderWidth: 1, borderColor: '#2A4060',
    borderRadius: 6, padding: 8, color: '#FFFFFF', fontSize: 12,
  },

  // Constatations
  constHeader: {
    flexDirection: 'row', backgroundColor: '#1E3A5F',
    borderRadius: 6, padding: 8, marginBottom: 4,
  },
  constHeaderText: { flex: 1, color: '#C9A84C', fontSize: 11, fontWeight: 'bold' },
  constRow: {
    flexDirection: 'row', backgroundColor: '#1A2F4A',
    borderRadius: 6, padding: 8, marginBottom: 4,
  },
  constLeft: { flex: 1, marginRight: 8 },
  constRight: { flex: 1 },
  constSection: { color: '#607D8B', fontSize: 9, marginBottom: 2 },
  constText: { color: '#FFFFFF', fontSize: 11 },
  constDecision: { color: '#4A90D9', fontSize: 11 },
  rasBox: {
    backgroundColor: '#27AE6015', borderRadius: 6,
    padding: 10, alignItems: 'center',
  },
  rasText: { color: '#27AE60', fontSize: 12 },

  // Boutons
  generateBtn: {
    backgroundColor: '#C9A84C', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  generateBtnText: { color: '#0A1628', fontWeight: 'bold', fontSize: 13 },

  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#607D8B', fontSize: 14 },

  // Modal QR
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#0F2137',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, alignItems: 'center',
  },
  modalTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  modalSubtitle: { color: '#C9A84C', fontSize: 14, marginBottom: 16 },
  qrLarge: {
    backgroundColor: '#FFFFFF', padding: 16,
    borderRadius: 12, marginBottom: 16,
  },
  qrHint: { color: '#607D8B', fontSize: 12, textAlign: 'center', marginBottom: 16 },
  generateCollabBtn: {
    backgroundColor: '#4A90D9', borderRadius: 10,
    padding: 14, alignItems: 'center', width: '100%', marginBottom: 8,
  },
  generateCollabBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
  cancelBtn: {
    backgroundColor: '#1A2F4A', borderRadius: 10,
    padding: 12, alignItems: 'center', width: '100%',
  },
  cancelBtnText: { color: '#607D8B', fontSize: 14 },
    qrNom: {
    color: '#FFFFFF', fontSize: 9,
    textAlign: 'center', marginTop: 4,
    maxWidth: 70,
    },
});