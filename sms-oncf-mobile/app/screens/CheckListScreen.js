import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Modal,
  TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { API_URL } from '../services/authService';

const CHECKLIST_API = API_URL.replace('/auth', '/checklists');
const COLLAB_API2 = API_URL.replace('/auth', '/admin/collaborateurs');
const COTATIONS = ['S', 'A', 'M', 'I', 'NA'];
const COTATION_COLORS = {
  S: '#27AE60', A: '#E67E22', M: '#E74C3C', I: '#8E44AD', NA: '#607D8B'
};

const ITEMS_COLLABORATEUR = [
  {
    section: 'Procédures collaborateur',
    sousSection: 'SP320',
    points: [
      'Agrès de sécurité (Pétards à griffe, Torches, clés de berne, GSMR...)',
      'Gabarit des dépôts de matériaux',
      'Dispositif d\'Autorisation de la Traversée de la Zone Dangereuse (D.A.T.Z.D.)',
      'Maitrise de la terminologie relative à la protection du personnel',
      'Sécurité du personnel circulant à pieds dans les emprises',
      'Sécurité du personnel travaillant sur les voies',
      'Mesures à prendre dans le cas des travaux particulièrement bruyants',
    ]
  },
  {
    section: 'Procédures collaborateur',
    sousSection: 'Règlement S2B',
    points: [
      'Tenue réglementaire et gilets de sécurité',
      'Conduite à tenir par les collaborateurs accompagnant les trains de travaux',
      'Dispositions à prendre par les agents voie pour assurer la protection des obstacles inopinés',
      'Limitation inopinée de vitesse',
      'Mesures de sécurité à prendre pour l\'emploi des lorrys poussés à bras',
      'Disposition à prendre pour la protection des travaux exécutés sous couvert d\'une voie interceptée',
      'Protection des travaux exécutés sous le régime de l\'interception de voie',
      'Mesures à prendre pour la circulation et le stationnement des engins',
      'Règles à respecter par l\'agent d\'accompagnement en cas de refoulement',
      'Engagement et dégagement d\'une voie interceptée par un train de travaux',
      'Immobilisation provisoire des aiguillages, leur cadenassement',
      'Circulation sans utilisation de ERTMS N2 sur LGV par un train travaux',
    ]
  },
  {
    section: 'Procédures collaborateur',
    sousSection: 'Consigne générale S2CN°4',
    points: [
      'Procédure à appliquer en cas de présence de personnes dans l\'emprise LGV',
    ]
  },
  {
    section: 'Procédures collaborateur',
    sousSection: 'Consignes locales',
    points: [
      'Existence et maitrise des consignes locales d\'établissement',
    ]
  },
  {
    section: 'Procédures collaborateur',
    sousSection: 'Référentiels LGV',
    points: [
      'Toutes les prescriptions de sécurité des guides pratiques',
      'Prescription de sécurité sur les interventions',
      'Normes de maintenance Voie et AdV LGV',
      'Sécurité technique sur les chantiers voie de la LGV',
      'Tournées de surveillance des voies de la LGV et de leurs abords',
    ]
  },
  {
    section: 'Indicateurs de fiabilité humaine',
    sousSection: 'Indicateurs d\'alerte professionnels',
    points: [
      'Erreurs répétées', 'Démotivation dans le travail',
      'Distraction et manque de concentration', 'Emotivité dans le travail',
    ]
  },
  {
    section: 'Indicateurs de fiabilité humaine',
    sousSection: 'Indicateurs d\'alerte sociologiques',
    points: [
      'Maladie grave d\'un proche', 'Maladie grave du collaborateur',
      'Deuil', 'Séparation ou divorce', 'Mariage', 'Problème matériel', 'Navette',
    ]
  },
  {
    section: 'Indicateurs de fiabilité humaine',
    sousSection: 'Indicateurs d\'alerte psychologiques',
    points: [
      'Isolement volontaire', 'Recherche inhabituelle de contact',
      'Incohérence dans le discours', 'Consommation d\'alcool', 'Drogue',
      'Activité extra-professionnelle incompatible avec le poste',
    ]
  },
  {
    section: 'Indicateurs de fiabilité humaine',
    sousSection: 'Indicateurs d\'alerte physiologiques et médicaux',
    points: [
      'Fatigabilité inhabituelle', 'Variation de poids récente',
      'Intempérance', 'Pathologie psychiatrique aiguë',
      'Pathologie neurologique',
    ]
  },
  {
    section: 'Documentation',
    sousSection: 'Documents à usage courant',
    points: [
      'Extrait du carnet de vie du LRS (Pochette canton)',
      'Schéma du District',
      'Fiches d\'AD et appareils de voie',
      'Carte d\'habilitation',
      'Carnets DPG, bulletin I',
      'Consigne d\'établissement S6A n°2',
      'Carnet de dépêches',
      'Consigne de sécurité des travaux et consignes communes',
    ]
  },
];

const ITEMS_CHANTIER = [
   {
    section: 'Indicateurs de fiabilité humaine',
    sousSection: 'Indicateurs d\'alerte professionnels',
    points: [
      'Erreurs répétées', 'Démotivation dans le travail',
      'Distraction et manque de concentration', 'Emotivité dans le travail',
    ]
  },
  {
    section: 'Indicateurs de fiabilité humaine',
    sousSection: 'Indicateurs d\'alerte sociologiques',
    points: [
      'Maladie grave d\'un proche', 'Maladie grave du collaborateur',
      'Deuil', 'Séparation ou divorce', 'Mariage', 'Problème matériel', 'Navette',
    ]
  },
  {
    section: 'Indicateurs de fiabilité humaine',
    sousSection: 'Indicateurs d\'alerte psychologiques',
    points: [
      'Isolement volontaire', 'Recherche inhabituelle de contact',
      'Incohérence dans le discours', 'Consommation d\'alcool', 'Drogue',
      'Activité extra-professionnelle incompatible avec le poste',
    ]
  },
  {
    section: 'Indicateurs de fiabilité humaine',
    sousSection: 'Indicateurs d\'alerte physiologiques et médicaux',
    points: [
      'Fatigabilité inhabituelle', 'Variation de poids récente',
      'Intempérance', 'Pathologie psychiatrique aiguë, bénigne ou plus grave',
      'Pathologie neurologique',
    ]
  },
  {
    section: 'Collaborateurs sécurité',
    sousSection: 'Rôles',
    points: [
      'Réalisateur', 'Chefs des chantiers élémentaires',
      'Mécanicien train travaux', 'Agent d\'accompagnement',
      'Chargé de la formation et essais de freins', 'Visiteur',
      'Surveillant général de sécurité',
    ]
  },
  {
    section: 'Avant départ au chantier',
    sousSection: 'Préparation',
    points: [
      'Identification de la nature et de l\'étendue du chantier global',
      'Identification des points particuliers (obstacles, tracé, câbles)',
      'Modalité de demande DPG',
      'Prise en compte de la CE S6A n°2 pour les DPG',
      'Consistance et adéquation aux travaux envisagés',
      'Modalités d\'en/dégagement des trains travaux',
      'Ordre de circulation des trains travaux',
      'Essais de freins', 'Eclairage et signaux des engins',
      'Dotation en bulletins I et Consignes de circulation',
    ]
  },
  {
    section: 'Au Chantier',
    sousSection: 'Mise en place',
    points: [
      'Mise en place de la DCP (couverture)',
      'Confirmation de mise en place DCP et repérage',
      'Repérage des chantiers élémentaires',
      'Application des mesures de sécurité prévues par les consignes travaux',
      'Tenue réglementaire et gilet de sécurité',
      'Dispositif d\'annonce si nécessaire',
    ]
  },
  {
    section: 'Au Chantier',
    sousSection: 'Circulation',
    points: [
      'Repérage des trains de travaux et engins',
      'Vitesses sur chantier et sur le parcours d\'approche',
      'Disponibilité et conformité des documents nécessaires',
      'Respect et conformité des charges utiles',
      'Sens de Travail du Ttx', 'Conformité des signaux des Ttx',
    ]
  },
  {
    section: 'À la Fin des Travaux',
    sousSection: 'Clôture',
    points: [
      'Continuité de la voie est rétablie, Voie praticable à la vitesse prescrite',
      'Retrait de la DCP et DCM du chantier',
      'Dégagement des Ttx et des obstacles',
      'Les enregistrements des paramètres laissés en voie Après intervention',
    ]
  },
  {
    section: 'Consignes',
    sousSection: 'Vérification',
    points: [
      'Consigne a l\'usage du réalisateur',
      'Consigne a l\'usage de l\'agent d\'accompagnement de Ttx',
      'Consigne des travaux de nivellement de la voie et adv par BML',
      'Tournées périodiques des collaborateurs voie',
      'Tournées de surveillance des zones PILOT',
    ]
  },
  {
    section: 'Documents',
    sousSection: 'Vérification documents',
    points: [
      'Avis Hebdomadaire de travaux (AHT)',
      'Consigne journalière d\'organisation des travaux',
      'Programme GEST', 'Carnet DPG', 'Carnet des dépêches',
      'Bulletin I', 'Règlement S9A : Travaux sur les voies',
      'Règlement S9Bn°6 : Trains de travaux', 'Consigne S6A n°2',
    ]
  },
  {
    section: 'Agrès',
    sousSection: 'Vérification agrès',
    points: [
      'GSMR', 'Clés de berne', 'Clés de vestibule', 'Lanternes', 'SAM', 'Pétards',
      'Tenue réglementaire et gilet de sécurité', 'Torches à flamme rouge',
      'Drapeaux rouge à main et sur jalon et Drapeaux blancs',
      'Moyens de communication entre acteurs clés', 'Trompes à grande puissance',
      'Agrès pour engin', 'Moyens d’intervention rapides en cas de panne d’engins',
      'Agrès de consolidation', 'Connexion volante de retour de courant'
    ]
  },
  {
    section: 'Environnement',
    sousSection: 'État des lieux',
    points: [
      'État atmosphérique',
      'Interférence avec des chantiers des autres disciplines',
      'Adéquation de l\'éclairage du chantier',
      'Délimitation du chantier vis-à-vis des circulations',
    ]
  },
];

export default function CheckListScreen({ navigation }) {
  const [checklists, setChecklists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [step, setStep] = useState(0);
  const [type, setType] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [collaborateurs, setCollaborateurs] = useState([]);
  const [collabModalVisible, setCollabModalVisible] = useState(false);
  const [collabSearch, setCollabSearch] = useState('');
  const [docGlobal, setDocGlobal] = useState({ existence: 'OUI', miseAJour: 'OUI' });

  const [infos, setInfos] = useState({
    siteUp: '',
    dateControle: new Date().toISOString().split('T')[0],
    reference: 'DR.PSC.M1C.CISF.024',
    collaborateurNom: '',
    collaborateurMatricule: '',
    chantierNom: '',
    chantierType: '',
    isKm: '',
  });

  const [itemsState, setItemsState] = useState({});

  useEffect(() => {
    loadChecklists();
    loadCollaborateurs();
  }, []);

  const getToken = async () => await AsyncStorage.getItem('token');

  const loadChecklists = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await axios.get(`${CHECKLIST_API}/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setChecklists(res.data);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger les check lists');
    } finally {
      setLoading(false);
    }
  };

  const loadCollaborateurs = async () => {
    try {
      const token = await getToken();
      const res = await axios.get(COLLAB_API2, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCollaborateurs(res.data);
    } catch {}
  };

  const initItems = (checkType) => {
    const structure = checkType === 'COLLABORATEUR' ? ITEMS_COLLABORATEUR : ITEMS_CHANTIER;
    const initial = {};
    structure.forEach((section, si) => {
      section.points.forEach((point, pi) => {
        const key = `${si}_${pi}`;
        initial[key] = { cotation: 'S', constatation: '', regularisation: '' };
      });
    });
    setItemsState(initial);
    setDocGlobal({ existence: 'OUI', miseAJour: 'OUI' });
  };

  const handleSave = async () => {
    setCreating(true);
    try {
      const token = await getToken();
      const structure = type === 'COLLABORATEUR' ? ITEMS_COLLABORATEUR : ITEMS_CHANTIER;
      const items = [];
      let ordre = 0;
      structure.forEach((section, si) => {
        section.points.forEach((point, pi) => {
          const key = `${si}_${pi}`;
          const state = itemsState[key] || {};
          items.push({
            section: section.section,
            sousSection: section.sousSection,
            pointCle: point,
            cotation: state.cotation || 'S',
            constatation: state.constatation || '',
            regularisation: state.regularisation || '',
            ordre: ordre++,
          });
        });
      });

      // Ajouter item global Documentation
      if (type === 'COLLABORATEUR') {
        items.push({
          section: 'Documentation',
          sousSection: 'Documents à usage courant',
          pointCle: '__GLOBAL__',
          cotation: 'S',
          constatation: `Existence:${docGlobal.existence}|MiseAJour:${docGlobal.miseAJour}`,
          regularisation: '',
          ordre: ordre++,
        });
      }

      await axios.post(CHECKLIST_API, {
        type,
        ...infos,
        items,
      }, { headers: { Authorization: `Bearer ${token}` } });

      Alert.alert('Succès', 'Check list sauvegardée !');
      setStep(0);
      setType(null);
      setItemsState({});
      setDocGlobal({ existence: 'OUI', miseAJour: 'OUI' });
      setInfos({
        siteUp: '', dateControle: new Date().toISOString().split('T')[0],
        reference: 'DR.PSC.M1C.CISF.024',
        collaborateurNom: '', collaborateurMatricule: '',
        chantierNom: '', chantierType: '', isKm: '',
      });
      loadChecklists();
    } catch {
      Alert.alert('Erreur', 'Impossible de sauvegarder');
    } finally {
      setCreating(false);
    }
  };

  const deleteChecklist = async (cl) => {
    Alert.alert(
      'Confirmation',
      `Supprimer la checklist ${cl.type === 'COLLABORATEUR' ? cl.collaborateurNom : cl.chantierNom} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await getToken();
              await axios.delete(`${CHECKLIST_API}/${cl.id}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              Alert.alert('Succès', 'Check list supprimée');
              loadChecklists();
            } catch (error) {
              const msg = error?.response?.data?.message || error?.response?.data || error.message || 'Impossible de supprimer la check list';
              Alert.alert('Erreur', msg.toString());
            }
          }
        }
      ]
    );
  };

  const generatePDF = async (cl) => {
    setGenerating(true);
    try {
      const token = await getToken();
      const detail = await axios.get(`${CHECKLIST_API}/${cl.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = detail.data;

      // Extraire les données globales documentation
      const globalItem = (data.items || []).find(i => i.pointCle === '__GLOBAL__');
      let docExistence = 'OUI', docMiseAJour = 'OUI';
      if (globalItem?.constatation) {
        const parts = globalItem.constatation.split('|');
        docExistence = parts[0]?.replace('Existence:', '') || 'OUI';
        docMiseAJour = parts[1]?.replace('MiseAJour:', '') || 'OUI';
      }

      const grouped = {};
      (data.items || [])
        .filter(i => i.pointCle !== '__GLOBAL__')
        .forEach(item => {
          if (!grouped[item.section]) grouped[item.section] = {};
          if (!grouped[item.section][item.sousSection])
            grouped[item.section][item.sousSection] = [];
          grouped[item.section][item.sousSection].push(item);
        });

      const cotColor = (c) => {
        switch(c) {
          case 'S': return '#27AE60';
          case 'A': return '#E67E22';
          case 'M': return '#E74C3C';
          case 'I': return '#8E44AD';
          default: return '#607D8B';
        }
      };

      let sectionsHtml = '';
      Object.entries(grouped).forEach(([section, sousSections]) => {
        let rowsHtml = '';
        Object.entries(sousSections).forEach(([sousSec, items]) => {
          items.forEach((item, idx) => {
            rowsHtml += `
              <tr>
                ${idx === 0 ? `<td rowspan="${items.length}" style="vertical-align:middle;font-weight:bold;font-size:11px;background:#f8f9fa;">${sousSec}</td>` : ''}
                <td style="font-size:11px;">${item.pointCle}</td>
                <td style="text-align:center;font-weight:bold;color:${cotColor(item.cotation)}">${item.cotation || ''}</td>
                <td style="text-align:center;font-size:11px;">${item.constatation || ''}</td>
                <td style="text-align:center;font-size:11px;">${item.regularisation || ''}</td>
              </tr>
            `;
          });
        });

        sectionsHtml += `
          <tr style="background:#0A1628;">
            <td colspan="5" style="color:white;font-weight:bold;padding:8px;font-size:12px;">${section}</td>
          </tr>
          ${rowsHtml}
        `;

        // Ajouter ligne Existence/MiseAJour pour la section Documentation
        if (section === 'Documentation') {
          sectionsHtml += `
            <tr style="background:#E8F5E9;">
              <td style="font-weight:bold;font-size:11px;">Existence et Mise à jour</td>
              <td colspan="2" style="font-size:11px;">Documents à usage courant</td>
              <td style="text-align:center;font-weight:bold;color:${docExistence === 'OUI' ? '#27AE60' : '#E74C3C'};">
                Existence: ${docExistence}
              </td>
              <td style="text-align:center;font-weight:bold;color:${docMiseAJour === 'OUI' ? '#27AE60' : '#E74C3C'};">
                Mise à jour: ${docMiseAJour}
              </td>
            </tr>
          `;
        }
      });

      const isCollab = data.type === 'COLLABORATEUR';
      const html = `
        <!DOCTYPE html><html><head><meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; margin: 0; color: #1a1a2e; }
          .header { background: #0A1628; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; }
          .header h1 { color: #C9A84C; font-size: 24px; letter-spacing: 3px; margin: 0; }
          .header p { color: #B0BEC5; font-size: 11px; margin: 2px 0; }
          .ref { background: #f8f9fa; padding: 8px 24px; font-size: 11px; color: #607D8B; border-bottom: 2px solid #C9A84C; }
          .infos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; padding: 16px 24px; background: #f8f9fa; }
          .info-box { background: white; border-radius: 6px; padding: 10px; border-left: 3px solid #C9A84C; }
          .info-label { font-size: 10px; color: #607D8B; }
          .info-value { font-size: 13px; font-weight: bold; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th { background: #1E3A5F; color: #C9A84C; padding: 8px; text-align: left; }
          td { padding: 6px 8px; border-bottom: 1px solid #f0f0f0; vertical-align: middle; }
          tr:nth-child(even) td { background: #fafafa; }
          .footer { background: #0A1628; color: #607D8B; padding: 10px 24px; font-size: 10px; display: flex; justify-content: space-between; margin-top: 20px; }
        </style>
        </head><body>
        <div class="header">
          <div>
            <h1>ONCF</h1>
            <p>Office National des Chemins de Fer</p>
            <p>Direction Régionale Infrastructure Centre — DRIC</p>
          </div>
          <div style="text-align:right;">
            <p style="color:white;font-weight:bold;font-size:13px;">
              ${isCollab ? 'Check-list Contrôle Collaborateurs' : 'Check-list Contrôle Chantier'}
            </p>
            <p style="color:#C9A84C;">Directive Contrôle et Inspection Sécurité Ferroviaire</p>
          </div>
        </div>
        <div class="ref">Référence : ${data.reference || 'DR.PSC.M1C.CISF.024'}</div>
        <div class="infos">
          <div class="info-box">
            <div class="info-label">Site / UP</div>
            <div class="info-value">${data.siteUp || '-'}</div>
          </div>
          ${isCollab ? `
          <div class="info-box">
            <div class="info-label">Collaborateur</div>
            <div class="info-value">${data.collaborateurNom || '-'}</div>
          </div>
          <div class="info-box">
            <div class="info-label">Matricule</div>
            <div class="info-value">${data.collaborateurMatricule || '-'}</div>
          </div>
          ` : `
          <div class="info-box">
            <div class="info-label">Chantier</div>
            <div class="info-value">${data.chantierNom || '-'}</div>
          </div>
          <div class="info-box">
            <div class="info-label">Type chantier</div>
            <div class="info-value">${data.chantierType || '-'}</div>
          </div>
          `}
          <div class="info-box">
            <div class="info-label">Date de Contrôle</div>
            <div class="info-value">${data.dateControle || '-'}</div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width:150px">Objet du contrôle</th>
              <th>(Thèmes) Points clés</th>
              <th style="width:50px">Cotation</th>
              <th style="width:120px">Constatation</th>
              <th style="width:120px">Régularisation</th>
            </tr>
          </thead>
          <tbody>${sectionsHtml}</tbody>
        </table>
        ${data.observations ? `<div style="padding:16px 24px;"><strong>Observations :</strong> ${data.observations}</div>` : ''}
        <div class="footer">
          <span>ONCF · SMS · Document confidentiel — Usage interne</span>
          <span>Généré le ${new Date().toLocaleDateString('fr-FR')}</span>
        </div>
        </body></html>
      `;

      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Check List ${data.type} — ${data.collaborateurNom || data.chantierNom}`,
        UTI: 'com.adobe.pdf',
      });
    } catch {
      Alert.alert('Erreur', 'Impossible de générer le PDF');
    } finally {
      setGenerating(false);
    }
  };

  // ===== VUE LISTE =====
  if (step === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerTitle}>K Check List</Text>
              <Text style={styles.headerSub}>Contrôle & Inspection — DRIC</Text>
            </View>
            <TouchableOpacity style={styles.addBtn} onPress={() => setStep(1)}>
              <Text style={styles.addBtnText}>+ Nouvelle</Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading
          ? <ActivityIndicator color="#C9A84C" style={{ marginTop: 40 }} />
          : (
            <ScrollView style={styles.list}>
              {checklists.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyIcon}>📋</Text>
                  <Text style={styles.emptyText}>Aucune check list</Text>
                  <Text style={styles.emptySubText}>Appuyez sur "+ Nouvelle" pour commencer</Text>
                </View>
              ) : (
                checklists.map(cl => (
                  <View key={cl.id} style={styles.clCard}>
                    <View style={styles.clTop}>
                      <View style={[styles.typeBadge, {
                        backgroundColor: cl.type === 'COLLABORATEUR' ? '#4A90D920' : '#27AE6020'
                      }]}>
                        <Text style={[styles.typeText, {
                          color: cl.type === 'COLLABORATEUR' ? '#4A90D9' : '#27AE60'
                        }]}>
                          {cl.type === 'COLLABORATEUR' ? '👤 Collaborateur' : '🏗 Chantier'}
                        </Text>
                      </View>
                      <Text style={styles.clDate}>{cl.dateControle}</Text>
                    </View>
                    <Text style={styles.clTitle}>
                      {cl.type === 'COLLABORATEUR' ? cl.collaborateurNom : cl.chantierNom}
                    </Text>
                    <Text style={styles.clSite}>{cl.siteUp}</Text>
                    <View style={styles.clActions}>
                      <TouchableOpacity
                        style={styles.pdfBtn}
                        onPress={() => generatePDF(cl)}
                        disabled={generating}
                      >
                        {generating
                          ? <ActivityIndicator color="#0A1628" size="small" />
                          : <Text style={styles.pdfBtnText}>📄 Exporter PDF</Text>
                        }
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => deleteChecklist(cl)}
                      >
                        <Text style={styles.deleteBtnText}>🗑 Supprimer</Text>
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

  // ===== CHOIX TYPE =====
  if (step === 1) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep(0)}>
            <Text style={styles.backText}>← Annuler</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Type de Check List</Text>
        </View>
        <View style={styles.typeContainer}>
          <TouchableOpacity
            style={styles.typeCard}
            onPress={() => { setType('COLLABORATEUR'); initItems('COLLABORATEUR'); setStep(2); }}
          >
            <Text style={styles.typeCardIcon}>👤</Text>
            <Text style={styles.typeCardTitle}>Check List Collaborateur</Text>
            <Text style={styles.typeCardDesc}>
              Contrôle individuel d'un collaborateur — procédures, fiabilité humaine, documentation
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.typeCard, { borderColor: '#27AE60' }]}
            onPress={() => { setType('CHANTIER'); initItems('CHANTIER'); setStep(2); }}
          >
            <Text style={styles.typeCardIcon}>🏗</Text>
            <Text style={styles.typeCardTitle}>Check List Chantier</Text>
            <Text style={styles.typeCardDesc}>
              Contrôle d'un chantier — avant départ, au chantier, fin des travaux, agrès
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ===== SAISIE INFOS =====
  if (step === 2) {
    const isCollab = type === 'COLLABORATEUR';
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep(1)}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Informations générales</Text>
        </View>
        <ScrollView style={styles.formContainer}>

          <Text style={styles.inputLabel}>Site / UP *</Text>
          <TextInput style={styles.input} placeholder="Ex: Voie N°1021V LGV"
            placeholderTextColor="#607D8B" value={infos.siteUp}
            onChangeText={v => setInfos({ ...infos, siteUp: v })} />

          <Text style={styles.inputLabel}>Date de contrôle *</Text>
          <TextInput style={styles.input} placeholder="YYYY-MM-DD"
            placeholderTextColor="#607D8B" value={infos.dateControle}
            onChangeText={v => setInfos({ ...infos, dateControle: v })} />

          <Text style={styles.inputLabel}>Référence</Text>
          <TextInput style={styles.input} value={infos.reference}
            placeholderTextColor="#607D8B"
            onChangeText={v => setInfos({ ...infos, reference: v })} />

          {isCollab ? (
            <>
              <Text style={styles.inputLabel}>Collaborateur *</Text>
              <TouchableOpacity
                style={[styles.input, {
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }]}
                onPress={() => setCollabModalVisible(true)}
              >
                <Text style={{
                  color: infos.collaborateurNom ? '#FFFFFF' : '#607D8B',
                  fontSize: 13
                }}>
                  {infos.collaborateurNom || 'Sélectionner un collaborateur...'}
                </Text>
                <Text style={{ color: '#C9A84C' }}>▼</Text>
              </TouchableOpacity>
              {infos.collaborateurNom !== '' && (
                <Text style={{ color: '#C9A84C', fontSize: 11, marginTop: 4 }}>
                  Matricule : {infos.collaborateurMatricule}
                </Text>
              )}
            </>
          ) : (
            <>
              <Text style={styles.inputLabel}>Nom du chantier *</Text>
              <TextInput style={styles.input} placeholder="Ex: Chantier BDML"
                placeholderTextColor="#607D8B" value={infos.chantierNom}
                onChangeText={v => setInfos({ ...infos, chantierNom: v })} />
              <Text style={styles.inputLabel}>IS/Km</Text>
              <TextInput style={styles.input} placeholder="Ex: KM 123+400"
                placeholderTextColor="#607D8B" value={infos.isKm}
                onChangeText={v => setInfos({ ...infos, isKm: v })} />
              <Text style={styles.inputLabel}>Type de chantier</Text>
              <TextInput style={styles.input}
                placeholder="Ex: Meulage / Ballast / Redressage"
                placeholderTextColor="#607D8B" value={infos.chantierType}
                onChangeText={v => setInfos({ ...infos, chantierType: v })} />
            </>
          )}

          <TouchableOpacity
            style={styles.nextBtn}
            onPress={() => {
              if (!infos.siteUp || !infos.dateControle) {
                Alert.alert('Erreur', 'Site/UP et date sont obligatoires');
                return;
              }
              if (isCollab && !infos.collaborateurNom) {
                Alert.alert('Erreur', 'Veuillez sélectionner un collaborateur');
                return;
              }
              setStep(3);
            }}
          >
            <Text style={styles.nextBtnText}>Continuer → Remplir les items</Text>
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>

        <Modal
          visible={collabModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setCollabModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Choisir un collaborateur</Text>
              <TextInput
                style={[styles.input, { marginBottom: 12 }]}
                placeholder="Rechercher par nom ou matricule..."
                placeholderTextColor="#607D8B"
                value={collabSearch}
                onChangeText={setCollabSearch}
              />
              <ScrollView style={{ maxHeight: 400 }}>
                {collaborateurs
                  .filter(c =>
                    `${c.fullName} ${c.matricule}`
                      .toLowerCase()
                      .includes(collabSearch.toLowerCase())
                  )
                  .map(c => (
                    <TouchableOpacity
                      key={c.id}
                      style={styles.collabOption}
                      onPress={() => {
                        setInfos({
                          ...infos,
                          collaborateurNom: c.fullName,
                          collaborateurMatricule: c.matricule,
                        });
                        setCollabModalVisible(false);
                        setCollabSearch('');
                      }}
                    >
                      <View style={styles.collabOptionAvatar}>
                        <Text style={styles.collabOptionAvatarText}>
                          {c.fullName?.charAt(0)}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.collabOptionName}>{c.fullName}</Text>
                        <Text style={styles.collabOptionMatricule}>{c.matricule}</Text>
                        {c.poste && (
                          <Text style={styles.collabOptionPoste}>{c.poste}</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))
                }
                {collaborateurs.length === 0 && (
                  <View style={{ alignItems: 'center', padding: 30 }}>
                    <Text style={{ color: '#607D8B' }}>
                      Aucun collaborateur — ajoutez-en depuis l'interface Admin
                    </Text>
                  </View>
                )}
              </ScrollView>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setCollabModalVisible(false); setCollabSearch(''); }}
              >
                <Text style={styles.cancelBtnText}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // ===== SAISIE ITEMS =====
  if (step === 3) {
    const structure = type === 'COLLABORATEUR' ? ITEMS_COLLABORATEUR : ITEMS_CHANTIER;
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep(2)}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Évaluation des points</Text>
            <TouchableOpacity
              style={[styles.addBtn, creating && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={creating}
            >
              {creating
                ? <ActivityIndicator color="#0A1628" size="small" />
                : <Text style={styles.addBtnText}>💾 Sauvegarder</Text>
              }
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.itemsContainer}>
          {structure.map((section, si) => (
            <View key={si} style={styles.sectionBlock}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{section.section}</Text>
                <Text style={styles.sousSectionTitle}>{section.sousSection}</Text>
              </View>

              {section.points.map((point, pi) => {
                const key = `${si}_${pi}`;
                const state = itemsState[key] || { cotation: 'S', constatation: '', regularisation: '' };
                return (
                  <View key={pi} style={styles.itemRow}>
                    <Text style={styles.pointText}>{point}</Text>
                    <View style={styles.cotationRow}>
                      {COTATIONS.map(cot => (
                        <TouchableOpacity
                          key={cot}
                          style={[styles.cotBtn, {
                            backgroundColor: state.cotation === cot
                              ? COTATION_COLORS[cot]
                              : COTATION_COLORS[cot] + '20',
                            borderColor: COTATION_COLORS[cot],
                          }]}
                          onPress={() => setItemsState(prev => ({
                            ...prev,
                            [key]: { ...state, cotation: cot }
                          }))}
                        >
                          <Text style={[styles.cotBtnText, {
                            color: state.cotation === cot ? '#fff' : COTATION_COLORS[cot]
                          }]}>{cot}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <TextInput
                      style={styles.smallInput}
                      placeholder="Constatation..."
                      placeholderTextColor="#607D8B"
                      value={state.constatation}
                      onChangeText={v => setItemsState(prev => ({
                        ...prev, [key]: { ...state, constatation: v }
                      }))}
                    />
                    <TextInput
                      style={[styles.smallInput, { marginTop: 8 }]}
                      placeholder="Régularisation..."
                      placeholderTextColor="#607D8B"
                      value={state.regularisation}
                      onChangeText={v => setItemsState(prev => ({
                        ...prev, [key]: { ...state, regularisation: v }
                      }))}
                    />
                  </View>
                );
              })}
            </View>
          ))}

          {/* Bloc global Documentation — uniquement pour COLLABORATEUR */}
          {type === 'COLLABORATEUR' && (
            <View style={styles.docGlobalBox}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Documentation</Text>
                <Text style={styles.sousSectionTitle}>Existence et Mise à jour — Documents à usage courant *</Text>
              </View>

              <View style={styles.docRow}>
                <View style={styles.docField}>
                  <Text style={styles.docFieldLabel}>Existence *</Text>
                  <View style={styles.ouiNonRow}>
                    {['OUI', 'NON'].map(val => (
                      <TouchableOpacity
                        key={val}
                        style={[styles.ouiNonBtn, {
                          backgroundColor: docGlobal.existence === val
                            ? (val === 'OUI' ? '#27AE60' : '#E74C3C')
                            : '#1A2F4A',
                          borderColor: val === 'OUI' ? '#27AE60' : '#E74C3C',
                        }]}
                        onPress={() => setDocGlobal({ ...docGlobal, existence: val })}
                      >
                        <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>
                          {val}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.docField}>
                  <Text style={styles.docFieldLabel}>Mise à jour *</Text>
                  <View style={styles.ouiNonRow}>
                    {['OUI', 'NON'].map(val => (
                      <TouchableOpacity
                        key={val}
                        style={[styles.ouiNonBtn, {
                          backgroundColor: docGlobal.miseAJour === val
                            ? (val === 'OUI' ? '#27AE60' : '#E74C3C')
                            : '#1A2F4A',
                          borderColor: val === 'OUI' ? '#27AE60' : '#E74C3C',
                        }]}
                        onPress={() => setDocGlobal({ ...docGlobal, miseAJour: val })}
                      >
                        <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>
                          {val}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </View>
          )}

          <View style={{ height: 60 }} />
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
  addBtn: { backgroundColor: '#C9A84C', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: '#0A1628', fontWeight: 'bold', fontSize: 13 },

  list: { paddingHorizontal: 16 },
  emptyBox: { alignItems: 'center', paddingVertical: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  emptySubText: { color: '#607D8B', fontSize: 13, marginTop: 4 },

  clCard: {
    backgroundColor: '#0F2137', borderRadius: 12,
    padding: 14, marginBottom: 10,
    borderLeftWidth: 4, borderLeftColor: '#4A90D9',
  },
  clTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  typeText: { fontSize: 12, fontWeight: 'bold' },
  clDate: { color: '#607D8B', fontSize: 12 },
  clTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  clSite: { color: '#607D8B', fontSize: 12, marginBottom: 10 },
  clActions: { flexDirection: 'row', gap: 8 },
  pdfBtn: { backgroundColor: '#C9A84C', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  pdfBtnText: { color: '#0A1628', fontWeight: 'bold', fontSize: 12 },
  deleteBtn: { backgroundColor: '#E74C3C', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  deleteBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 12 },

  typeContainer: { padding: 20, gap: 16 },
  typeCard: {
    backgroundColor: '#0F2137', borderRadius: 14, padding: 24,
    alignItems: 'center', borderWidth: 2, borderColor: '#4A90D9',
  },
  typeCardIcon: { fontSize: 48, marginBottom: 12 },
  typeCardTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  typeCardDesc: { color: '#607D8B', fontSize: 13, textAlign: 'center', lineHeight: 20 },

  formContainer: { paddingHorizontal: 16 },
  inputLabel: { color: '#B0BEC5', fontSize: 12, marginBottom: 4, marginTop: 12 },
  input: {
    backgroundColor: '#1A2F4A', borderWidth: 1, borderColor: '#2A4060',
    borderRadius: 8, padding: 10, color: '#FFFFFF', fontSize: 13,
  },
  nextBtn: {
    backgroundColor: '#C9A84C', borderRadius: 10,
    padding: 14, alignItems: 'center', marginTop: 24,
  },
  nextBtnText: { color: '#0A1628', fontWeight: 'bold', fontSize: 15 },

  itemsContainer: { paddingHorizontal: 16 },
  sectionBlock: { marginBottom: 16 },
  sectionHeader: {
    backgroundColor: '#1E3A5F', borderRadius: 10,
    padding: 12, marginBottom: 8,
  },
  sectionTitle: { color: '#C9A84C', fontSize: 13, fontWeight: 'bold' },
  sousSectionTitle: { color: '#B0BEC5', fontSize: 12, marginTop: 2 },
  itemRow: {
    backgroundColor: '#0F2137', borderRadius: 8,
    padding: 12, marginBottom: 6,
  },
  pointText: { color: '#FFFFFF', fontSize: 12, marginBottom: 8, lineHeight: 18 },
  cotationRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  cotBtn: {
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 6, borderWidth: 1,
  },
  cotBtnText: { fontSize: 12, fontWeight: 'bold' },
  smallInput: {
    backgroundColor: '#1A2F4A', borderWidth: 1, borderColor: '#2A4060',
    borderRadius: 6, padding: 8, color: '#FFFFFF', fontSize: 12,
  },

  // Documentation globale
  docGlobalBox: {
    backgroundColor: '#0F2137', borderRadius: 12,
    padding: 16, marginBottom: 16,
    borderWidth: 2, borderColor: '#27AE60',
  },
  docRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  docField: { flex: 1 },
  docFieldLabel: { color: '#B0BEC5', fontSize: 12, marginBottom: 8 },
  ouiNonRow: { flexDirection: 'row', gap: 8 },
  ouiNonBtn: {
    flex: 1, paddingVertical: 12,
    borderRadius: 8, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#0F2137',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: '85%',
  },
  modalTitle: {
    color: '#FFFFFF', fontSize: 18, fontWeight: 'bold',
    marginBottom: 16, textAlign: 'center',
  },
  collabOption: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1A2F4A', borderRadius: 10,
    padding: 12, marginBottom: 8,
  },
  collabOptionAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#1E3A5F', borderWidth: 1, borderColor: '#4A90D9',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  collabOptionAvatarText: { color: '#4A90D9', fontWeight: 'bold', fontSize: 14 },
  collabOptionName: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  collabOptionMatricule: { color: '#C9A84C', fontSize: 12 },
  collabOptionPoste: { color: '#607D8B', fontSize: 11 },
  cancelBtn: {
    backgroundColor: '#1A2F4A', borderRadius: 10,
    padding: 12, alignItems: 'center', marginTop: 8,
  },
  cancelBtnText: { color: '#607D8B', fontSize: 14 },
});