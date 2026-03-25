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

const CL_API = API_URL.replace('/auth', '/checklists');

export default function CompteRenduScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [checklists, setChecklists] = useState([]);
  const [selectedCL, setSelectedCL] = useState(null);
  const [step, setStep] = useState(0);

  const [section2, setSection2] = useState({
    lieu: '', constatations: '', isKm: '', actions: '',
  });

  const [section4, setSection4] = useState([
    { nom: 'GSMR', completude: 'Oui', etat: 'Bon', actions: '' },
    { nom: 'Clés de berne', completude: 'Oui', etat: 'Bon', actions: '' },
    { nom: 'Clés de vestibule', completude: 'Oui', etat: 'Bon', actions: '' },
    { nom: 'Lanternes', completude: 'Oui', etat: 'Bon', actions: '' },
    { nom: 'SAM', completude: 'Oui', etat: 'Bon', actions: '' },
    { nom: 'Pétards', completude: 'Oui', etat: 'Bon', actions: '' },
  ]);

  const [section7, setSection7] = useState([
    { rubrique: '', constatations: '', actions: '' },
    { rubrique: '', constatations: '', actions: '' },
  ]);

  useEffect(() => { loadChecklists(); }, []);

  const getToken = async () => await AsyncStorage.getItem('token');

  const loadChecklists = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await axios.get(`${CL_API}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setChecklists(res.data.filter(cl => cl.type === 'COLLABORATEUR' || cl.type === 'CHANTIER'));
    } catch {
      Alert.alert('Erreur', 'Impossible de charger les check lists');
    } finally {
      setLoading(false);
    }
  };

  const selectCheckList = async (cl) => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await axios.get(`${CL_API}/${cl.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedCL(res.data);

      // Extraire les données des agrès pour section4
      const items = res.data.items || [];
      const agresItems = items.filter(item =>
        item.sousSection === 'Vérification agrès' &&
        ['GSMR', 'Clés de berne', 'Clés de vestibule', 'Lanternes', 'SAM', 'Pétards'].includes(item.pointCle)
      );

      const updatedSection4 = section4.map(agre => {
        const item = agresItems.find(i => i.pointCle === agre.nom);
        if (item && item.constatation && item.constatation.includes('Completude:')) {
          const parts = item.constatation.split('|');
          return {
            ...agre,
            completude: parts[0]?.replace('Completude:', '') || 'Oui',
            etat: parts[1]?.replace('Etat:', '') || 'Bon',
            actions: item.regularisation || '',
          };
        }
        return agre;
      });
      setSection4(updatedSection4);

      setStep(1);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger la check list');
    } finally {
      setLoading(false);
    }
  };

  const getMoyenneSousSection = (items, sousSection) => {
    const filtered = items.filter(i => i.sousSection === sousSection);
    if (filtered.length === 0) return 'S';
    const hasM = filtered.some(i => i.cotation === 'M');
    const hasA = filtered.some(i => i.cotation === 'A');
    if (hasM) return 'M';
    if (hasA) return 'A';
    return 'S';
  };

  const getIndicateurConstat = (items, sousSection) => {
    const filtered = items.filter(i => i.sousSection === sousSection);
    if (filtered.length === 0) return 'RAS';
    const hasNonS = filtered.some(i => i.cotation !== 'S');
    return hasNonS ? 'A vérifier' : 'RAS';
  };

  const cotationColor = (c) => {
    switch(c) {
      case 'S': return '#27AE60';
      case 'A': return '#E67E22';
      case 'M': return '#E74C3C';
      default: return '#607D8B';
    }
  };

  const updateSection4 = (idx, field, value) => {
    const updated = [...section4];
    updated[idx] = { ...updated[idx], [field]: value };
    setSection4(updated);
  };

  const updateSection7 = (idx, field, value) => {
    const updated = [...section7];
    updated[idx] = { ...updated[idx], [field]: value };
    setSection7(updated);
  };

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const userData = await AsyncStorage.getItem('user');
      const currentUser = userData ? JSON.parse(userData) : {};
      const data = selectedCL;
      const items = data.items || [];
      const isChantier = data.type === 'CHANTIER';

      const globalItem = items.find(i => i.pointCle === '__GLOBAL__');
      let docExistence = 'OUI', docMiseAJour = 'OUI';
      if (globalItem?.constatation) {
        const parts = globalItem.constatation.split('|');
        docExistence = parts[0]?.replace('Existence:', '') || 'OUI';
        docMiseAJour = parts[1]?.replace('MiseAJour:', '') || 'OUI';
      }

      const date = data.dateControle || new Date().toLocaleDateString('fr-FR');

      let html = '';

      if (isChantier) {
        // Generate CHANTIER report
        const chantierSections = [
          { section: 'Collaborateurs sécurité', sousSection: 'Rôles' },
          { section: 'Avant départ au chantier', sousSection: 'Préparation' },
          { section: 'Au Chantier', sousSection: 'Mise en place' },
          { section: 'Au Chantier', sousSection: 'Circulation' },
          { section: 'À la Fin des Travaux', sousSection: 'Clôture' },
          { section: 'Consignes', sousSection: 'Vérification' },
          { section: 'Documents', sousSection: 'Vérification documents' },
          { section: 'Agrès', sousSection: 'Vérification agrès' },
          { section: 'Environnement', sousSection: 'État des lieux' },
        ];

        const indicateurs = [
          { label: 'Indicateurs d\'alerte professionnels', sousSection: 'Indicateurs d\'alerte professionnels' },
          { label: 'Indicateurs d\'alerte sociologiques', sousSection: 'Indicateurs d\'alerte sociologiques' },
          { label: 'Indicateurs d\'alerte psychologiques', sousSection: 'Indicateurs d\'alerte psychologiques' },
          { label: 'Indicateurs d\'alerte physiologiques et médicaux', sousSection: 'Indicateurs d\'alerte physiologiques et médicaux' },
        ];

        const chantierRows = chantierSections.map(sec => {
          const moyenne = getMoyenneSousSection(items.filter(i => i.section === sec.section), sec.sousSection);
          return { section: sec.section, sousSection: sec.sousSection, moyenne };
        }).filter(row => items.some(i => i.section === row.section && i.sousSection === row.sousSection));

        const indicateursHtml = indicateurs.map(ind => {
          const constat = getIndicateurConstat(items, ind.sousSection);
          return `
            <tr>
              <td style="font-size:11px;">${ind.label}</td>
              <td style="text-align:center;font-size:11px;color:${constat === 'RAS' ? '#27AE60' : '#E67E22'};">${constat}</td>
              <td style="font-size:11px;"></td>
            </tr>
          `;
        }).join('');

        const section2Html = section2.lieu || section2.constatations ? `
          <tr>
            <td style="font-size:11px;">${section2.lieu || ''}</td>
            <td style="font-size:11px;">${section2.constatations || 'RAS'}</td>
            <td style="font-size:11px;">${section2.isKm || ''}</td>
            <td style="font-size:11px;">${section2.actions || ''}</td>
          </tr>
        ` : `
          <tr><td colspan="4" style="text-align:center;color:#607D8B;font-size:11px;">RAS</td></tr>
        `;

        const agresHtml = section4.map(a => `
          <tr>
            <td style="font-size:11px;font-weight:bold;">${a.nom}</td>
            <td style="text-align:center;font-size:11px;font-weight:bold;color:${a.completude === 'Oui' ? '#27AE60' : '#E74C3C'};">
              ${a.completude}
            </td>
            <td style="text-align:center;font-size:11px;font-weight:bold;color:${a.etat === 'Bon' ? '#27AE60' : '#E74C3C'};">
              ${a.etat}
            </td>
            <td style="text-align:center;font-size:11px;"></td>
            <td style="text-align:center;font-size:11px;"></td>
            <td style="font-size:10px;color:#E74C3C;">${a.actions}</td>
          </tr>`).join('');

        const section7Html = section7.map(row => `
          <tr>
            <td style="font-size:11px;">${row.rubrique || ''}</td>
            <td style="font-size:11px;">${row.constatations || ''}</td>
            <td style="font-size:11px;">${row.actions || ''}</td>
          </tr>
        `).join('');

        html = `
          <!DOCTYPE html><html><head><meta charset="UTF-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; font-size: 11px; color: #1a1a2e; padding: 16px; }
            .header-top { display: grid; grid-template-columns: 1fr 2fr 1fr; border: 1px solid #ccc; margin-bottom: 8px; }
            .header-cell { padding: 6px 10px; border-right: 1px solid #ccc; font-size: 10px; }
            .header-center { text-align: center; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
            th { background: #1E3A5F; color: white; padding: 6px 8px; font-size: 10px; text-align: left; }
            td { padding: 5px 8px; border: 1px solid #ddd; vertical-align: middle; }
            tr:nth-child(even) td { background: #f9f9f9; }
            .info-table td { padding: 5px 8px; border: 1px solid #ccc; }
            .info-label { background: #f0f0f0; font-weight: bold; width: 200px; }
            .section-title { font-weight: bold; text-decoration: underline; font-size: 12px; margin: 12px 0 6px; }
            .footer-sig { display: flex; justify-content: space-between; margin-top: 20px; font-size: 11px; border-top: 1px solid #ccc; padding-top: 10px; }
            .oncf-logo { color: #C9A84C; font-size: 18px; font-weight: bold; letter-spacing: 2px; }
          </style>
          </head><body>

          <div class="header-top">
            <div class="header-cell">
              <div>Référence : DR.PSC.M1C.CISF.024</div>
              <div>Version 1 du 20/06/2013</div>
              <div>Contrôle et inspection sécurité ferroviaire</div>
              <div>Page 1 sur 1</div>
            </div>
            <div class="header-cell header-center" style="display:flex;flex-direction:column;justify-content:center;align-items:center;gap:4px;">
              <div class="oncf-logo">ONCF</div>
              <div>Compte Rendu de contrôles des procédures, documentation,</div>
              <div>installations matériel et autres équipement</div>
            </div>
            <div class="header-cell" style="text-align:right;">
              <div>Pole Infrastructure & Circulation</div>
              <div style="font-weight:bold;">D R I Centre.</div>
              <div style="font-weight:bold;font-size:14px;">*KN1</div>
            </div>
          </div>

          <table class="info-table" style="margin-bottom:8px;">
            <tr>
              <td class="info-label">Date du contrôle :</td>
              <td colspan="3">${date}</td>
            </tr>
            <tr>
              <td class="info-label">Contrôle réalisé par :</td>
              <td>Mr. ${currentUser.fullName || '___________'}</td>
              <td class="info-label">Fonction : CDT Adjoint KN1</td>
              <td></td>
            </tr>
            <tr>
              <td class="info-label">Entité ou site contrôlé :</td>
              <td colspan="3">Chantier — ${data.chantierNom || ''} (${data.chantierType || ''})</td>
            </tr>
          </table>

          <div style="border:1px solid #ccc;padding:8px;margin-bottom:10px;">
            <div style="font-weight:bold;font-size:11px;margin-bottom:6px;">Enregistrements SMS utilisés :</div>
            <div style="display:flex;flex-wrap:wrap;gap:2px;">
              <div style="width:48%;font-size:10px;">✓ Check-list du contrôle de sécurité chantier</div>
              <div style="width:48%;font-size:10px;">_ Fiches de suivi individuel</div>
              <div style="width:48%;font-size:10px;">_ Fiches de suivi des Sites</div>
              <div style="width:48%;font-size:10px;">_ Fiche de classification des collaborateurs de sécurité</div>
              <div style="width:48%;font-size:10px;">✓ Fiche d'indicateurs d'alerte relatifs à la fiabilité humaine</div>
              <div style="width:48%;font-size:10px;">_ Cartographie des risques</div>
              <div style="width:48%;font-size:10px;">_ Plan de veille collaborateurs/procédures</div>
              <div style="width:48%;font-size:10px;">_ Compte-rendu du dernier contrôle de sécurité</div>
            </div>
          </div>

          <div class="section-title">1. CONTRÔLE CHANTIER :</div>
          <table>
            <tr>
              <th style="width:25%;">Section</th>
              <th style="width:25%;">Sous-section</th>
              <th style="width:15%;">Évaluation</th>
              <th style="width:35%;">Actions correctives</th>
            </tr>
            ${chantierRows.map((row, idx) => `
              <tr>
                <td style="font-size:11px;font-weight:bold;">${row.section}</td>
                <td style="font-size:11px;">${row.sousSection}</td>
                <td style="text-align:center;font-weight:bold;color:${cotationColor(row.moyenne)};background:${cotationColor(row.moyenne)}20;padding:4px 8px;">
                  ${row.moyenne}
                </td>
                <td style="font-size:10px;"></td>
              </tr>
            `).join('')}
          </table>

          <div class="section-title">2. INDICATEURS D'ALERTE FIABILITÉ HUMAINE :</div>
          <table>
            <tr>
              <th style="width:50%;">Indicateur</th>
              <th style="width:20%;">Constat</th>
              <th style="width:30%;">Actions</th>
            </tr>
            ${indicateursHtml}
          </table>

          <div class="section-title">3. AGRÈS DE SÉCURITÉ :</div>
          <table>
            <tr>
              <th style="width:25%;">Désignation</th>
              <th style="width:15%;">Complétude</th>
              <th style="width:15%;">État</th>
              <th style="width:15%;">Validité</th>
              <th style="width:15%;">Régularisation</th>
              <th style="width:15%;">Actions</th>
            </tr>
            ${agresHtml}
          </table>

          <div class="section-title">4. AUTRES CONSTATIONS :</div>
          <table>
            <tr>
              <th style="width:25%;">Lieu</th>
              <th style="width:35%;">Constatations</th>
              <th style="width:15%;">KM</th>
              <th style="width:25%;">Actions</th>
            </tr>
            ${section2Html}
          </table>

          <div class="section-title">5. OBSERVATIONS GÉNÉRALES :</div>
          <table>
            <tr>
              <th style="width:25%;">Rubrique</th>
              <th style="width:35%;">Constatations</th>
              <th style="width:40%;">Actions</th>
            </tr>
            ${section7Html}
          </table>

          <div class="footer-sig">
            <div>
              <div>Contrôleur : ___________________________</div>
              <div style="margin-top:8px;">Date : ____/____/________</div>
            </div>
            <div>
              <div>Visa hiérarchique : ___________________________</div>
              <div style="margin-top:8px;">Date : ____/____/________</div>
            </div>
          </div>

          </body></html>
        `;
      } else {
        // Generate COLLABORATEUR report (existing code)
        const sousSections = [
          'SP320', 'Règlement S2B',
          'Règlements S9A et leurs consignes',
          'Règlements S9B et leurs consignes',
          'Consigne générale S2CN°4',
          'Consignes locales', 'Guide pratiques Voie', 'Référentiels LGV',
        ];

        const hasNonConformite = items
          .filter(i => i.section === 'Procédures collaborateur')
          .some(i => i.cotation === 'A' || i.cotation === 'M');

        const section1Rows = sousSections.map(ss => {
          const moyenne = getMoyenneSousSection(
            items.filter(i => i.section === 'Procédures collaborateur'), ss
          );
          return { sousSection: ss, moyenne };
        }).filter(row => items.some(i => i.sousSection === row.sousSection));

        const indicateurs = [
          { label: 'Indicateurs d\'alerte professionnels', sousSection: 'Indicateurs d\'alerte professionnels' },
          { label: 'Indicateurs d\'alerte sociologiques', sousSection: 'Indicateurs d\'alerte sociologiques' },
          { label: 'Indicateurs d\'alerte psychologiques', sousSection: 'Indicateurs d\'alerte psychologiques' },
          { label: 'Indicateurs d\'alerte physiologiques et médicaux', sousSection: 'Indicateurs d\'alerte physiologiques et médicaux' },
        ];

        const indicateursHtml = indicateurs.map(ind => {
          const constat = getIndicateurConstat(items, ind.sousSection);
          return `
            <tr>
              <td style="font-size:11px;">${ind.label}</td>
              <td style="text-align:center;font-size:11px;color:${constat === 'RAS' ? '#27AE60' : '#E67E22'};">${constat}</td>
              <td style="font-size:11px;"></td>
            </tr>
          `;
        }).join('');

        const section7Html = section7.map(row => `
          <tr>
            <td style="font-size:11px;">${row.rubrique || ''}</td>
            <td style="font-size:11px;">${row.constatations || ''}</td>
            <td style="font-size:11px;">${row.actions || ''}</td>
          </tr>
        `).join('');

        const section2Html = section2.lieu || section2.constatations ? `
          <tr>
            <td style="font-size:11px;">${section2.lieu || ''}</td>
            <td style="font-size:11px;">${section2.constatations || 'RAS'}</td>
            <td style="font-size:11px;">${section2.isKm || ''}</td>
            <td style="font-size:11px;">${section2.actions || ''}</td>
          </tr>
        ` : `
          <tr><td colspan="4" style="text-align:center;color:#607D8B;font-size:11px;">RAS</td></tr>
        `;

        const agresHtml = section4.map(a => `
          <tr>
            <td style="font-size:11px;font-weight:bold;">${a.nom}</td>
            <td style="text-align:center;font-size:11px;font-weight:bold;color:${a.completude === 'Oui' ? '#27AE60' : '#E74C3C'};">
              ${a.completude}
            </td>
            <td style="text-align:center;font-size:11px;font-weight:bold;color:${a.etat === 'Bon' ? '#27AE60' : '#E74C3C'};">
              ${a.etat}
            </td>
            <td style="text-align:center;font-size:11px;"></td>
            <td style="text-align:center;font-size:11px;"></td>
            <td style="font-size:10px;color:#E74C3C;">${a.actions}</td>
          </tr>`).join('');

        const section1Html = section1Rows.length > 0 ? `
            <tr>
              <td rowspan="${section1Rows.length}" style="vertical-align:middle;font-weight:bold;font-size:11px;text-align:center;">
                ${data.collaborateurNom || '-'}<br/>
                <small style="color:#607D8B;">${data.collaborateurMatricule || ''}</small>
              </td>
              <td rowspan="${section1Rows.length}" style="vertical-align:middle;font-size:11px;text-align:center;">
                Technicien Maintenance Voie LGV
              </td>
              ${section1Rows.map((row, idx) => `
                ${idx > 0 ? '</tr><tr>' : ''}
                <td style="font-size:11px;color:#E67E22;">${row.sousSection}</td>
                <td style="text-align:center;font-weight:bold;color:${cotationColor(row.moyenne)};background:${cotationColor(row.moyenne)}20;padding:4px 8px;">
                  ${row.moyenne}
                </td>
                ${idx === 0 ? `
                <td rowspan="${section1Rows.length}" style="vertical-align:middle;font-size:10px;color:#607D8B;">
                  Sur les Connaissances / Vif
                </td>
                <td rowspan="${section1Rows.length}" style="vertical-align:middle;font-size:10px;">
                  ${hasNonConformite ? 'Sensibiliser le collaborateur sur les écarts relevés.' : 'RAS'}
                </td>
                ` : ''}
              `).join('')}
            </tr>
            ` : `<tr><td colspan="6" style="text-align:center;color:#607D8B;">Aucune donnée</td></tr>`;

        html = `
          <!DOCTYPE html><html><head><meta charset="UTF-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; font-size: 11px; color: #1a1a2e; padding: 16px; }
            .header-top { display: grid; grid-template-columns: 1fr 2fr 1fr; border: 1px solid #ccc; margin-bottom: 8px; }
            .header-cell { padding: 6px 10px; border-right: 1px solid #ccc; font-size: 10px; }
            .header-center { text-align: center; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
            th { background: #1E3A5F; color: white; padding: 6px 8px; font-size: 10px; text-align: left; }
            td { padding: 5px 8px; border: 1px solid #ddd; vertical-align: middle; }
            tr:nth-child(even) td { background: #f9f9f9; }
            .info-table td { padding: 5px 8px; border: 1px solid #ccc; }
            .info-label { background: #f0f0f0; font-weight: bold; width: 200px; }
            .section-title { font-weight: bold; text-decoration: underline; font-size: 12px; margin: 12px 0 6px; }
            .footer-sig { display: flex; justify-content: space-between; margin-top: 20px; font-size: 11px; border-top: 1px solid #ccc; padding-top: 10px; }
            .oncf-logo { color: #C9A84C; font-size: 18px; font-weight: bold; letter-spacing: 2px; }
          </style>
          </head><body>

          <div class="header-top">
            <div class="header-cell">
              <div>Référence : DR.PSC.M1C.CISF.024</div>
              <div>Version 1 du 20/06/2013</div>
              <div>Contrôle et inspection sécurité ferroviaire</div>
              <div>Page 1 sur 1</div>
            </div>
            <div class="header-cell header-center" style="display:flex;flex-direction:column;justify-content:center;align-items:center;gap:4px;">
              <div class="oncf-logo">ONCF</div>
              <div>Compte Rendu de contrôles des procédures, documentation,</div>
              <div>installations matériel et autres équipement</div>
            </div>
            <div class="header-cell" style="text-align:right;">
              <div>Pole Infrastructure & Circulation</div>
              <div style="font-weight:bold;">D R I Centre.</div>
              <div style="font-weight:bold;font-size:14px;">*KN1</div>
            </div>
          </div>

          <table class="info-table" style="margin-bottom:8px;">
            <tr>
              <td class="info-label">Date du contrôle :</td>
              <td colspan="3">${date}</td>
            </tr>
            <tr>
              <td class="info-label">Contrôle réalisé par :</td>
              <td>Mr. ${currentUser.fullName || '___________'}</td>
              <td class="info-label">Fonction : CDT Adjoint KN1</td>
              <td></td>
            </tr>
            <tr>
              <td class="info-label">Entité ou site contrôlé :</td>
              <td colspan="3">Collaborateur — ${data.siteUp || ''}</td>
            </tr>
          </table>

          <div style="border:1px solid #ccc;padding:8px;margin-bottom:10px;">
            <div style="font-weight:bold;font-size:11px;margin-bottom:6px;">Enregistrements SMS utilisés :</div>
            <div style="display:flex;flex-wrap:wrap;gap:2px;">
              <div style="width:48%;font-size:10px;">✓ Check-list du contrôle de sécurité</div>
              <div style="width:48%;font-size:10px;">_ Fiches de suivi individuel</div>
              <div style="width:48%;font-size:10px;">_ Fiches de suivi des Sites</div>
              <div style="width:48%;font-size:10px;">_ Fiche de classification des collaborateurs de sécurité</div>
              <div style="width:48%;font-size:10px;">✓ Fiche d'indicateurs d'alerte relatifs à la fiabilité humaine</div>
              <div style="width:48%;font-size:10px;">_ Cartographie des risques</div>
              <div style="width:48%;font-size:10px;">_ Plan de veille collaborateurs/procédures</div>
              <div style="width:48%;font-size:10px;">_ Compte-rendu du dernier contrôle de sécurité</div>
            </div>
          </div>

          <div class="section-title">1. COLLABORATEURS/PROCEDURES :</div>
          <table>
            <tr>
              <th style="width:20%;">Collaborateur</th>
              <th style="width:15%;">Fonction</th>
              <th style="width:20%;">Sous-section</th>
              <th style="width:10%;">Évaluation</th>
              <th style="width:20%;">Objectif</th>
              <th style="width:15%;">Actions</th>
            </tr>
            ${section1Html}
          </table>

          <div class="section-title">2. INSTALLATIONS & EQUIPEMENTS :</div>
          <table>
            <tr>
              <th style="width:25%;">Lieu</th>
              <th style="width:35%;">Constatations</th>
              <th style="width:15%;">IS/Km</th>
              <th style="width:25%;">Actions</th>
            </tr>
            ${section2Html}
          </table>

          <div class="section-title">3. OUTILS ET AGRES DE SECURITE :</div>
          <table>
            <tr>
              <th>Désignation</th>
              <th style="width:70px;">Complétude</th>
              <th style="width:50px;">État</th>
              <th style="width:60px;">Validité</th>
              <th style="width:50px;">Autre</th>
              <th>Actions</th>
            </tr>
            ${agresHtml}
          </table>

          <div class="section-title">4. INDICATEURS DE FIABILITE HUMAINE :</div>
          <table>
            <tr>
              <th>Rubriques</th>
              <th style="width:120px;">Constatations</th>
              <th>Actions</th>
            </tr>
            ${indicateursHtml}
          </table>

          <div class="section-title">5. DIVERS (Sécurité prestataires externes et internes) :</div>
          <table>
            <tr>
              <th>Rubriques</th>
              <th>Constatations</th>
              <th>Actions</th>
            </tr>
            ${section7Html}
          </table>

          <div class="footer-sig">
            <div>
              <div>Dressé par Mr. ${currentUser.fullName || '___________'}</div>
              <div>À KENITRA, LE ${date}</div>
              <div style="margin-top:30px;">Signature : _______________</div>
            </div>
            <div style="text-align:right;">
              <div><u>Vérifié et signé par le Chargé technique et sécurité voie</u></div>
              <div style="margin-top:30px;">Signature : _______________</div>
            </div>
          </div>

          </body></html>
        `;
      } // End of else block for COLLABORATEUR

      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const dialogTitle = isChantier
        ? `Compte Rendu Chantier — ${data.chantierNom || 'Chantier'}`
        : `Compte Rendu KN1 — ${data.collaborateurNom}`;
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle,
        UTI: 'com.adobe.pdf',
      });
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de générer le PDF');
    } finally {
      setGenerating(false);
    }
  };

  // ===== ÉTAPE 0 — Liste des check lists =====
  if (step === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Compte Rendu KN1</Text>
          <Text style={styles.headerSub}>Sélectionnez une check list</Text>
        </View>

        {loading
          ? <ActivityIndicator color="#C9A84C" style={{ marginTop: 40 }} />
          : (
            <ScrollView style={styles.list}>
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  Sélectionnez une check list pour générer le compte rendu
                </Text>
              </View>

              {checklists.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyIcon}>📋</Text>
                  <Text style={styles.emptyText}>Aucune check list disponible</Text>
                  <Text style={styles.emptySubText}>Créez d'abord une check list</Text>
                </View>
              ) : (
                checklists.map(cl => (
                  <TouchableOpacity
                    key={cl.id}
                    style={styles.clCard}
                    onPress={() => selectCheckList(cl)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.clLeft}>
                      <View style={styles.clAvatar}>
                        <Text style={styles.clAvatarText}>👤</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.clName}>
                          {cl.type === 'CHANTIER' ? cl.chantierNom : cl.collaborateurNom}
                        </Text>
                        <Text style={styles.clMatricule}>
                          {cl.type === 'CHANTIER' ? `Type: ${cl.chantierType}` : `Matricule: ${cl.collaborateurMatricule}`}
                        </Text>
                        <Text style={styles.clDate}>📅 {cl.dateControle} · {cl.siteUp}</Text>
                      </View>
                    </View>
                    <Text style={styles.arrow}>›</Text>
                  </TouchableOpacity>
                ))
              )}
              <View style={{ height: 40 }} />
            </ScrollView>
          )
        }
      </SafeAreaView>
    );
  }

  // ===== ÉTAPE 1 — Formulaire =====
  if (step === 1) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep(0)}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Compléter le Compte Rendu</Text>
          <Text style={styles.headerSub}>
            {selectedCL?.type === 'CHANTIER' ? selectedCL?.chantierNom : selectedCL?.collaborateurNom}
          </Text>
        </View>

        <ScrollView style={styles.formContainer}>

          <View style={styles.selectedCLBox}>
            <Text style={styles.selectedCLName}>
              {selectedCL?.type === 'CHANTIER' ? '🏗️' : '👤'} {selectedCL?.type === 'CHANTIER' ? selectedCL?.chantierNom : selectedCL?.collaborateurNom}
            </Text>
            <Text style={styles.selectedCLDate}>{selectedCL?.dateControle}</Text>
          </View>

          {/* Section 2 — Optionnelle */}
          <View style={styles.sectionBox}>
            <Text style={styles.sectionBoxTitle}>2. Installations & Équipements</Text>
            <Text style={styles.sectionBoxSub}>Optionnel — laisser vide si RAS</Text>

            <Text style={styles.inputLabel}>Lieu</Text>
            <TextInput style={styles.input}
              placeholder="Ex: Chantier redressage des rails..."
              placeholderTextColor="#607D8B"
              value={section2.lieu}
              onChangeText={v => setSection2({ ...section2, lieu: v })} />

            <Text style={styles.inputLabel}>Constatations</Text>
            <TextInput style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
              placeholder="Ex: RAS" placeholderTextColor="#607D8B" multiline
              value={section2.constatations}
              onChangeText={v => setSection2({ ...section2, constatations: v })} />

            <Text style={styles.inputLabel}>IS/Km</Text>
            <TextInput style={styles.input}
              placeholder="Ex: 145.881" placeholderTextColor="#607D8B"
              value={section2.isKm}
              onChangeText={v => setSection2({ ...section2, isKm: v })} />

            <Text style={styles.inputLabel}>Actions réalisées ou programmées</Text>
            <TextInput style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
              placeholder="Ex: RAS" placeholderTextColor="#607D8B" multiline
              value={section2.actions}
              onChangeText={v => setSection2({ ...section2, actions: v })} />
          </View>

          {/* Section 4 — Obligatoire */}
          <View style={styles.sectionBox4}>
            <Text style={styles.sectionBoxTitle}>4. Outils et Agrès de Sécurité *</Text>
            <Text style={styles.sectionBoxSub}>Obligatoire — remplissez les constatations</Text>

            {section4.map((agre, idx) => (
              <View key={idx} style={styles.agreRow}>
                <Text style={styles.agreNom}>{agre.nom}</Text>
                <View style={styles.agreFields}>
                  <View style={styles.agreField}>
                    <Text style={styles.agreLabel}>Complétude</Text>
                    <View style={styles.ouiNonRow}>
                      {['Oui', 'Non'].map(val => (
                        <TouchableOpacity
                          key={val}
                          style={[styles.ouiNonBtn, {
                            backgroundColor: agre.completude === val
                              ? (val === 'Oui' ? '#27AE60' : '#E74C3C')
                              : '#1A2F4A',
                            borderColor: val === 'Oui' ? '#27AE60' : '#E74C3C',
                          }]}
                          onPress={() => updateSection4(idx, 'completude', val)}
                        >
                          <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>{val}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <View style={styles.agreField}>
                    <Text style={styles.agreLabel}>État</Text>
                    <View style={styles.ouiNonRow}>
                      {['Bon', 'Mauvais'].map(val => (
                        <TouchableOpacity
                          key={val}
                          style={[styles.ouiNonBtn, {
                            backgroundColor: agre.etat === val
                              ? (val === 'Bon' ? '#27AE60' : '#E74C3C')
                              : '#1A2F4A',
                            borderColor: val === 'Bon' ? '#27AE60' : '#E74C3C',
                          }]}
                          onPress={() => updateSection4(idx, 'etat', val)}
                        >
                          <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>{val}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
                <TextInput
                  style={styles.agreActions}
                  placeholder="Actions si nécessaire..."
                  placeholderTextColor="#607D8B"
                  value={agre.actions}
                  onChangeText={v => updateSection4(idx, 'actions', v)}
                />
              </View>
            ))}
          </View>

          {/* Section 7 — Optionnelle */}
          <View style={styles.sectionBox}>
            <Text style={styles.sectionBoxTitle}>7. Divers — Sécurité prestataires</Text>
            <Text style={styles.sectionBoxSub}>Optionnel — laisser vide si RAS</Text>

            {section7.map((row, idx) => (
              <View key={idx} style={styles.agreRow}>
                <Text style={styles.agreLabel}>Ligne {idx + 1}</Text>
                <TextInput style={styles.input}
                  placeholder="Rubriques..."
                  placeholderTextColor="#607D8B"
                  value={row.rubrique}
                  onChangeText={v => updateSection7(idx, 'rubrique', v)} />
                <TextInput style={[styles.input, { marginTop: 6 }]}
                  placeholder="Constatations..."
                  placeholderTextColor="#607D8B"
                  value={row.constatations}
                  onChangeText={v => updateSection7(idx, 'constatations', v)} />
                <TextInput style={[styles.input, { marginTop: 6 }]}
                  placeholder="Actions..."
                  placeholderTextColor="#607D8B"
                  value={row.actions}
                  onChangeText={v => updateSection7(idx, 'actions', v)} />
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.generateBtn}
            onPress={generatePDF}
            disabled={generating}
          >
            {generating
              ? <ActivityIndicator color="#0A1628" />
              : <Text style={styles.generateBtnText}>📄 Générer le PDF KN1</Text>
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

  list: { paddingHorizontal: 16 },
  formContainer: { paddingHorizontal: 16 },

  infoBox: {
    backgroundColor: '#1E3A5F', borderRadius: 8, padding: 10,
    borderLeftWidth: 3, borderLeftColor: '#4A90D9', marginBottom: 12,
  },
  infoText: { color: '#B0BEC5', fontSize: 12 },

  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  emptySubText: { color: '#607D8B', fontSize: 13, marginTop: 4, textAlign: 'center' },

  clCard: {
    backgroundColor: '#0F2137', borderRadius: 12,
    padding: 14, marginBottom: 10,
    borderLeftWidth: 4, borderLeftColor: '#4A90D9',
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
  },
  clLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  clAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#1E3A5F', borderWidth: 1, borderColor: '#4A90D9',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  clAvatarText: { fontSize: 20 },
  clName: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold', marginBottom: 2 },
  clMatricule: { color: '#C9A84C', fontSize: 11, marginBottom: 2 },
  clDate: { color: '#607D8B', fontSize: 11 },
  arrow: { color: '#C9A84C', fontSize: 22, fontWeight: 'bold' },

  selectedCLBox: {
    backgroundColor: '#1E3A5F', borderRadius: 10,
    padding: 14, marginBottom: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  selectedCLName: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  selectedCLDate: { color: '#C9A84C', fontSize: 12 },

  sectionBox: {
    backgroundColor: '#0F2137', borderRadius: 12,
    padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#2A4060',
  },
  sectionBox4: {
    backgroundColor: '#0F2137', borderRadius: 12,
    padding: 16, marginBottom: 12,
    borderWidth: 2, borderColor: '#E67E22',
  },
  sectionBoxTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  sectionBoxSub: { color: '#607D8B', fontSize: 11, marginBottom: 12 },

  inputLabel: { color: '#B0BEC5', fontSize: 12, marginBottom: 4, marginTop: 10 },
  input: {
    backgroundColor: '#1A2F4A', borderWidth: 1, borderColor: '#2A4060',
    borderRadius: 8, padding: 10, color: '#FFFFFF', fontSize: 13,
  },

  agreRow: {
    backgroundColor: '#1A2F4A', borderRadius: 8,
    padding: 12, marginBottom: 8,
  },
  agreNom: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold', marginBottom: 8 },
  agreFields: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  agreField: { flex: 1 },
  agreLabel: { color: '#607D8B', fontSize: 11, marginBottom: 6 },
  ouiNonRow: { flexDirection: 'row', gap: 6 },
  ouiNonBtn: {
    flex: 1, paddingVertical: 8,
    borderRadius: 6, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  agreActions: {
    backgroundColor: '#0F2137', borderWidth: 1, borderColor: '#2A4060',
    borderRadius: 6, padding: 8, color: '#FFFFFF', fontSize: 12,
  },

  generateBtn: {
    backgroundColor: '#C9A84C', borderRadius: 10,
    padding: 14, alignItems: 'center', marginTop: 8,
  },
  generateBtnText: { color: '#0A1628', fontWeight: 'bold', fontSize: 15 },
});