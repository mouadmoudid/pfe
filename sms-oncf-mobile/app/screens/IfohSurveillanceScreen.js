import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert, Modal, TextInput,
  KeyboardAvoidingView, Platform, useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { API_URL } from '../services/authService';

const API       = API_URL.replace('/auth', '/pdvs/ifoh-surveillance');
const API_USERS = API_URL.replace('/auth', '/admin');

const CATEGORIES = [
  { key: 'Prof.',   label: 'Professionnel', color: '#3498DB', bg: '#1A2F4A' },
  { key: 'Socio.',  label: 'Sociologique',  color: '#9B59B6', bg: '#2D1B4A' },
  { key: 'Psycho.', label: 'Psychologique', color: '#E74C3C', bg: '#3A0E0E' },
  { key: 'Physio.', label: 'Physiologique', color: '#27AE60', bg: '#1A3A28' },
];
const CAT_MAP = Object.fromEntries(CATEGORIES.map(c => [c.key, c]));

const INDICATEURS_FIXES = [
  {num:1, cat:'Prof.',  ind:'Erreurs répétées'},
  {num:2, cat:'Prof.',  ind:'Démotivation'},
  {num:3, cat:'Prof.',  ind:'Distraction'},
  {num:4, cat:'Prof.',  ind:'Émotivité'},
  {num:5, cat:'Socio.', ind:'Maladie proche'},
  {num:6, cat:'Socio.', ind:'Maladie collab.'},
  {num:7, cat:'Socio.', ind:'Deuil'},
  {num:8, cat:'Socio.', ind:'Séparation'},
  {num:9, cat:'Socio.', ind:'Mariage'},
  {num:10,cat:'Socio.', ind:'Problème matériel'},
  {num:11,cat:'Socio.', ind:'Navette'},
  {num:12,cat:'Psycho.',ind:'Isolement'},
  {num:13,cat:'Psycho.',ind:'Contact inhabit.'},
  {num:14,cat:'Psycho.',ind:'Incohérence'},
  {num:15,cat:'Psycho.',ind:'Alcool'},
  {num:16,cat:'Psycho.',ind:'Drogue'},
  {num:17,cat:'Psycho.',ind:'Activité extra-pro'},
  {num:18,cat:'Physio.',ind:'Fatigabilité'},
  {num:19,cat:'Physio.',ind:'Variation poids'},
  {num:20,cat:'Physio.',ind:'Intempérance'},
  {num:21,cat:'Physio.',ind:'Patho. psy.'},
  {num:22,cat:'Physio.',ind:'Patho. neuro.'},
];

const CSPR_SOUS_ENTITES = {
  'CT Voie': ['CDT 101V', 'CDT 102V', 'CDT OA OH OT'],
  'CT CSS':  ['CDT 101LC', 'CDT 101SST'],
};

const canEdit = (role) => role === 'CSPR' || role === 'ADMIN';
const isCGPX  = (role) => role === 'CGPX';

const EMPTY_FORM = {
  indicateurNum: null,
  collaborateurNom: '', collaborateurMatricule: '', collaborateurEntite: '',
  presence: '', dateDetection: '', actions: '', suivi: '',
};

function CatBadge({ cat }) {
  const c = CAT_MAP[cat] || {};
  return (
    <View style={[ih.catBadge, { backgroundColor: c.bg, borderColor: c.color }]}>
      <Text style={[ih.catText, { color: c.color }]}>{cat}</Text>
    </View>
  );
}

function PresenceToggle({ value, onChange, disabled }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {['O','N'].map(v => {
        const active = value === v;
        const col = v === 'O'
          ? {bg:'#3A0E0E', border:'#E74C3C', text:'#F1948A'}
          : {bg:'#1A3A28', border:'#27AE60', text:'#82E0AA'};
        return (
          <TouchableOpacity key={v} disabled={disabled}
            style={[ih.presBtn, {borderColor: col.border},
              active && {backgroundColor: col.bg},
              disabled && {opacity:0.5}]}
            onPress={() => onChange && onChange(active ? '' : v)}>
            <Text style={[ih.presBtnText, {color: active ? col.text : col.border}]}>
              {v === 'O' ? '⚠️ Oui' : '✓ Non'}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function IfohSurveillanceScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const WEB = Platform.OS === 'web' && width > 768;

  const [selectedAnnee, setSelectedAnnee] = useState(new Date().getFullYear());
  const [annees, setAnnees]   = useState([new Date().getFullYear()]);
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [generating, setGenerating] = useState(false);
  const [userRole, setUserRole]   = useState('');
  const [userEntite, setUserEntite] = useState('');
  const [step, setStep]       = useState(0);
  const [editing, setEditing] = useState(null);
  const [form, setForm]       = useState({...EMPTY_FORM});
  const [users, setUsers]     = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [modalView, setModalView] = useState(null); // null|'form'|'indSelect'|'collabPicker'
  const [saveError, setSaveError] = useState('');

  const getToken = async () => await AsyncStorage.getItem('token');
  const setF = (k,v) => setForm(p => ({...p,[k]:v}));

  useEffect(() => { loadInitial(); }, []);

  const loadInitial = async () => {
    setLoading(true);
    try {
      const ud = await AsyncStorage.getItem('user');
      if (ud) { const u=JSON.parse(ud); setUserRole(u.role||''); setUserEntite(u.entite||''); }
      const token = await getToken();
      const [annRes, usersRes] = await Promise.allSettled([
        axios.get(`${API}/annees`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_USERS}/users`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (annRes.status==='fulfilled' && annRes.value.data?.length>0) setAnnees(annRes.value.data);
      if (usersRes.status==='fulfilled') setUsers(usersRes.value.data);
    } catch {}
    finally { setLoading(false); }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await axios.get(`${API}?annee=${selectedAnnee}`,
        { headers: { Authorization: `Bearer ${token}` } });
      setData(res.data); setStep(1);
    } catch { Alert.alert('Erreur','Impossible de charger les données'); }
    finally { setLoading(false); }
  };

  // Collaborateurs filtrés par hiérarchie + recherche
  const usersFiltres = users.filter(u => {
    const q = userSearch.toLowerCase();
    const matchSearch = !q || (u.fullName||'').toLowerCase().includes(q) || (u.matricule||'').toLowerCase().includes(q);
    let matchEntite = true;
    if (userRole==='CSPR') matchEntite = (CSPR_SOUS_ENTITES[userEntite]||[]).includes(u.entite);
    else if (userRole==='CGPX') matchEntite = u.entite === userEntite;
    return matchSearch && matchEntite;
  });

  // Grouper par entité pour affichage hiérarchique
  const usersByEntite = usersFiltres.reduce((acc,u) => {
    const e = u.entite||'Autre'; if(!acc[e]) acc[e]=[];
    acc[e].push(u); return acc;
  }, {});

  const dataFiltered = filterCat ? data.filter(d=>d.categorie===filterCat) : data;

  // Grouper données par catégorie → indicateur
  const dataGrouped = CATEGORIES.reduce((acc,cat) => {
    const byInd = INDICATEURS_FIXES.filter(i=>i.cat===cat.key).reduce((a,i) => {
      const rows = dataFiltered.filter(d=>d.indicateurNum===i.num);
      if(rows.length>0) a.push({indicateur:i, rows});
      return a;
    },[]);
    if(byInd.length>0) acc.push({cat, byInd});
    return acc;
  },[]);

  const totalOui = data.filter(d=>d.presence==='O').length;
  const totalNon = data.filter(d=>d.presence==='N').length;

  const openAdd = () => { setEditing(null); setForm({...EMPTY_FORM}); setSaveError(''); setModalView('form'); };
  const openEdit = (item) => {
    setEditing(item); setSaveError('');
    setForm({
      indicateurNum: item.indicateurNum,
      collaborateurNom: item.collaborateurNom||'',
      collaborateurMatricule: item.collaborateurMatricule||'',
      collaborateurEntite: item.collaborateurEntite||'',
      presence: item.presence||'',
      dateDetection: item.dateDetection||'',
      actions: item.actions||'',
      suivi: item.suivi||'',
    });
    setModalView('form');
  };
  const selectCollab = (u) => {
    setF('collaborateurNom', u.fullName||'');
    setF('collaborateurMatricule', u.matricule||'');
    setF('collaborateurEntite', u.entite||'');
    setUserSearch(''); setModalView('form');
  };
  const closeModal = () => { setModalView(null); setEditing(null); setUserSearch(''); setSaveError(''); };

  const handleSave = async () => {
    if (!form.indicateurNum) { setSaveError('Veuillez choisir un indicateur.'); return; }
    if (!form.collaborateurNom) { setSaveError('Veuillez choisir un collaborateur.'); return; }
    setSaveError('');
    setSaving(true);
    try {
      const token = await getToken();
      const payload = {...form, annee:selectedAnnee, entiteCSPR:userEntite};
      if (editing) await axios.put(`${API}/${editing.id}`, payload, {headers:{Authorization:`Bearer ${token}`}});
      else await axios.post(API, payload, {headers:{Authorization:`Bearer ${token}`}});
      closeModal(); loadData();
    } catch(e) {
      const msg = e.response?.data || e.message || 'Impossible de sauvegarder.';
      const status = e.response?.status;
      setSaveError(status ? `Erreur ${status} : ${msg}` : msg);
    }
    finally { setSaving(false); }
  };

  const handleDelete = (item) => {
    const doDelete = async () => {
      try {
        const t = await getToken();
        await axios.delete(`${API}/${item.id}`, {headers:{Authorization:`Bearer ${t}`}});
        loadData();
      } catch { Alert.alert('Erreur','Impossible de supprimer'); }
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`Supprimer "${item.indicateur}" pour ${item.collaborateurNom} ?`)) doDelete();
    } else {
      Alert.alert('Supprimer',`Supprimer "${item.indicateur}" pour ${item.collaborateurNom} ?`,[
        {text:'Annuler',style:'cancel'},
        {text:'Supprimer',style:'destructive',onPress:doDelete},
      ]);
    }
  };

  const presStyle = (pres) => {
    if(pres==='O') return {bg:'#3A0E0E',border:'#E74C3C',text:'#F1948A',label:'⚠️ Oui'};
    if(pres==='N') return {bg:'#1A3A28',border:'#27AE60',text:'#82E0AA',label:'✓ Non'};
    return {bg:'#1A2F4A',border:'#2A4060',text:'#607D8B',label:'— N/A'};
  };

  const printHTML = async (html, filename) => {
    if (Platform.OS === 'web') {
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (win) {
        win.addEventListener('load', () => {
          setTimeout(() => { win.print(); URL.revokeObjectURL(url); }, 300);
        });
      } else {
        URL.revokeObjectURL(url);
        Alert.alert('Info', 'Autorisez les popups pour exporter le PDF.');
      }
    } else {
      const {uri} = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: filename,
        UTI: 'com.adobe.pdf',
      });
    }
  };

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const rows = data.map((d,i) => {
        const cat = CAT_MAP[d.categorie]||{};
        const ps = presStyle(d.presence);
        return `<tr style="background:${i%2===0?'#fff':'#f8f9fa'}">
          <td style="text-align:center">${d.indicateurNum}</td>
          <td style="color:${cat.color};font-weight:bold">${d.categorie}</td>
          <td><b>${d.indicateur}</b></td>
          <td>${d.collaborateurNom||''}</td>
          <td>${d.collaborateurEntite||''}</td>
          <td style="text-align:center;font-weight:bold;color:${ps.text}">${ps.label}</td>
          <td>${d.dateDetection||''}</td>
          <td style="font-size:7px">${d.actions||''}</td>
          <td style="font-size:7px">${d.suivi||''}</td>
        </tr>`;
      }).join('');
      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>* {margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:8px;padding:8px}
@page{size:A4 landscape;margin:5mm}h2{font-size:11px;color:#0A1628;margin-bottom:2px}
p{font-size:8px;color:#607D8B;margin-bottom:5px}table{width:100%;border-collapse:collapse}
th{background:#0A1628;color:#fff;padding:3px 2px;font-size:7px;border:1px solid #ccc;text-align:left}
td{font-size:7px;padding:2px;border:1px solid #ddd;vertical-align:top}</style></head><body>
<h2>IFOH Surveillance – ${userEntite} – ${selectedAnnee}</h2>
<p>${data.length} entrée(s) · Oui: ${totalOui} · Non: ${totalNon} · Généré le ${new Date().toLocaleDateString('fr-FR')}</p>
<table><thead><tr><th>N°</th><th>Cat.</th><th>Indicateur</th><th>Collaborateur</th>
<th>Entité</th><th>O/N</th><th>Date</th><th>Actions</th><th>Suivi</th>
</tr></thead><tbody>${rows}</tbody></table></body></html>`;
      await printHTML(html, `IFOH – ${selectedAnnee}`);
    } catch { Alert.alert('Erreur','Impossible de générer le PDF'); }
    finally { setGenerating(false); }
  };

  // ── ÉTAPE 0 ──
  if (step===0) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={s.backText}>← Retour</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>🔬 IFOH Surveillance</Text>
          <Text style={s.headerSub}>22 indicateurs · 4 catégories · Pr08 FOH</Text>
        </View>
        {loading ? <ActivityIndicator color="#C9A84C" style={{marginTop:40}}/> : (
          <ScrollView style={[s.list, WEB && {maxWidth:800, alignSelf:'center', width:'100%'}]}>
            <Text style={s.sectionLabel}>Année</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:20}}>
              {annees.map(a => (
                <TouchableOpacity key={a} style={[s.chipBtn, selectedAnnee===a && s.chipBtnActive]}
                  onPress={() => setSelectedAnnee(a)}>
                  <Text style={[s.chipText, selectedAnnee===a && s.chipTextActive]}>{a}</Text>
                </TouchableOpacity>
              ))}
              {canEdit(userRole) && (
                <TouchableOpacity style={[s.chipBtn,{borderColor:'#C9A84C'}]}
                  onPress={() => { const ny=Math.max(...annees)+1; setAnnees(p=>[ny,...p]); setSelectedAnnee(ny); }}>
                  <Text style={[s.chipText,{color:'#C9A84C'}]}>+ {Math.max(...annees)+1}</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            <Text style={s.sectionLabel}>Catégories</Text>
            <View style={[{gap:8,marginBottom:16}, WEB && {flexDirection:'row',flexWrap:'wrap'}]}>
              {CATEGORIES.map(c => (
                <View key={c.key} style={[ih.catCard,{borderLeftColor:c.color}, WEB && {flex:1,minWidth:'22%'}]}>
                  <Text style={[{fontSize:12,fontWeight:'bold',color:c.color}]}>{c.label}</Text>
                  <Text style={{color:'#607D8B',fontSize:11,marginTop:2}}>
                    {INDICATEURS_FIXES.filter(i=>i.cat===c.key).length} indicateurs
                  </Text>
                </View>
              ))}
            </View>

            {userEntite ? (
              <View style={s.entiteBox}>
                <Text style={s.entiteLabel}>Périmètre</Text>
                <Text style={s.entiteValue}>{userEntite}</Text>
                {CSPR_SOUS_ENTITES[userEntite] && (
                  <Text style={s.entiteSub}>→ {CSPR_SOUS_ENTITES[userEntite].join(' · ')}</Text>
                )}
              </View>
            ) : null}

            <TouchableOpacity style={s.confirmBtn} onPress={loadData}>
              <Text style={s.confirmBtnText}>Consulter {selectedAnnee} →</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </SafeAreaView>
    );
  }

  // ── ÉTAPE 1 ──
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => { setStep(0); setData([]); }}>
          <Text style={s.backText}>← Retour</Text>
        </TouchableOpacity>
        <View style={s.headerRow}>
          <View>
            <Text style={s.headerTitle}>IFOH Surveillance — {selectedAnnee}</Text>
            <Text style={s.headerSub}>{data.length} entrée(s) · {userEntite}</Text>
          </View>
          <View style={{flexDirection:'row',gap:8}}>
            {canEdit(userRole) && (
              <TouchableOpacity style={s.addBtn} onPress={openAdd}>
                <Text style={s.addBtnText}>+ Entrée</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[s.pdfBtn,generating&&{opacity:0.5}]} onPress={generatePDF} disabled={generating}>
              {generating ? <ActivityIndicator color="#C9A84C" size="small"/> : <Text style={s.pdfBtnText}>PDF</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {isCGPX(userRole) && (
        <View style={s.readOnlyBanner}>
          <Text style={s.readOnlyText}>👁 Lecture seule — {userEntite}</Text>
        </View>
      )}

      {/* FILTRES + STATS */}
      <View style={[ih.filtersWrap, WEB && {paddingHorizontal:24}]}>
        <View style={ih.statsRow}>
          <View style={[ih.statBadge,{borderColor:'#E74C3C',backgroundColor:'#3A0E0E'}]}>
            <Text style={[ih.statText,{color:'#F1948A'}]}>⚠️ Oui : {totalOui}</Text>
          </View>
          <View style={[ih.statBadge,{borderColor:'#27AE60',backgroundColor:'#1A3A28'}]}>
            <Text style={[ih.statText,{color:'#82E0AA'}]}>✓ Non : {totalNon}</Text>
          </View>
          <View style={[ih.statBadge,{borderColor:'#2A4060',backgroundColor:'#1A2F4A'}]}>
            <Text style={[ih.statText,{color:'#607D8B'}]}>Total : {data.length}</Text>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginTop:6}}>
          <TouchableOpacity style={[ih.filterBtn,!filterCat&&ih.filterBtnAll]} onPress={()=>setFilterCat('')}>
            <Text style={[ih.filterBtnText,!filterCat&&{color:'#0A1628',fontWeight:'bold'}]}>Tout</Text>
          </TouchableOpacity>
          {CATEGORIES.map(c => {
            const active = filterCat===c.key;
            const count = data.filter(d=>d.categorie===c.key).length;
            return (
              <TouchableOpacity key={c.key}
                style={[ih.filterBtn,{borderColor:c.color},active&&{backgroundColor:c.bg}]}
                onPress={() => setFilterCat(active?'':c.key)}>
                <Text style={[ih.filterBtnText,{color:active?c.color:'#607D8B'}]}>
                  {c.key} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? <ActivityIndicator color="#C9A84C" style={{marginTop:40}}/> : (
        <ScrollView style={[s.list, WEB && {paddingHorizontal:24}]}
          contentContainerStyle={WEB && {maxWidth:960, alignSelf:'center', width:'100%'}}>
          {dataGrouped.length===0 ? (
            <View style={s.emptyBox}>
              <Text style={s.emptyIcon}>🔬</Text>
              <Text style={s.emptyText}>{filterCat?`Aucune entrée pour ${filterCat}`:`Aucune entrée pour ${selectedAnnee}`}</Text>
              {canEdit(userRole) && !filterCat && <Text style={s.emptySub}>Appuyez sur "+ Entrée" pour commencer</Text>}
            </View>
          ) : (
            dataGrouped.map(({cat,byInd}) => (
              <View key={cat.key} style={{marginBottom:16}}>
                {/* EN-TÊTE CATÉGORIE */}
                <View style={[ih.catHeader,{borderLeftColor:cat.color}]}>
                  <CatBadge cat={cat.key}/>
                  <Text style={[ih.catHeaderTitle,{color:cat.color}]}>{cat.label}</Text>
                  <Text style={ih.catHeaderCount}>{byInd.reduce((s,i)=>s+i.rows.length,0)} entrée(s)</Text>
                </View>

                {WEB ? (
                  /* ── WEB : tableau ── */
                  <View style={ih.webTable}>
                    <View style={[ih.webTr,ih.webTHead]}>
                      <Text style={[ih.webTh,{width:30}]}>N°</Text>
                      <Text style={[ih.webTh,{flex:1.2}]}>Indicateur</Text>
                      <Text style={[ih.webTh,{flex:1.4}]}>Collaborateur</Text>
                      <Text style={[ih.webTh,{flex:0.8}]}>Entité</Text>
                      <Text style={[ih.webTh,{width:70,textAlign:'center'}]}>O/N</Text>
                      <Text style={[ih.webTh,{flex:0.7}]}>Date</Text>
                      <Text style={[ih.webTh,{flex:1.4}]}>Actions</Text>
                      <Text style={[ih.webTh,{flex:1}]}>Suivi</Text>
                      {canEdit(userRole)&&<Text style={[ih.webTh,{width:60}]}/>}
                    </View>
                    {byInd.map(({indicateur,rows}) =>
                      rows.map((item,ri) => {
                        const ps = presStyle(item.presence);
                        return (
                          <View key={item.id} style={[ih.webTr, ri%2===0?ih.webTrEven:ih.webTrOdd]}>
                            {ri===0
                              ? <Text style={[ih.webTd,{width:30,color:cat.color,fontWeight:'bold'}]}>{indicateur.num}</Text>
                              : <View style={{width:30}}/>}
                            {ri===0
                              ? <Text style={[ih.webTd,{flex:1.2,color:'#FFFFFF',fontWeight:'bold'}]}>{indicateur.ind}</Text>
                              : <View style={{flex:1.2}}/>}
                            <Text style={[ih.webTd,{flex:1.4}]}>{item.collaborateurNom}</Text>
                            <Text style={[ih.webTd,{flex:0.8,color:'#C9A84C'}]}>{item.collaborateurEntite}</Text>
                            <View style={{width:70,alignItems:'center',justifyContent:'center'}}>
                              <View style={[ih.presMini,{backgroundColor:ps.bg,borderColor:ps.border}]}>
                                <Text style={{color:ps.text,fontSize:10,fontWeight:'bold'}}>{ps.label}</Text>
                              </View>
                            </View>
                            <Text style={[ih.webTd,{flex:0.7}]}>{item.dateDetection||'—'}</Text>
                            <Text style={[ih.webTd,{flex:1.4}]} numberOfLines={2}>{item.actions||'—'}</Text>
                            <Text style={[ih.webTd,{flex:1}]} numberOfLines={2}>{item.suivi||'—'}</Text>
                            {canEdit(userRole)&&(
                              <View style={{width:60,flexDirection:'row',gap:4,alignItems:'center',justifyContent:'center'}}>
                                <TouchableOpacity style={ih.webBtn} onPress={()=>openEdit(item)}>
                                  <Text style={{fontSize:12}}>✏️</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[ih.webBtn,{borderColor:'#E74C3C',backgroundColor:'#E74C3C20'}]} onPress={()=>handleDelete(item)}>
                                  <Text style={{fontSize:12}}>🗑</Text>
                                </TouchableOpacity>
                              </View>
                            )}
                          </View>
                        );
                      })
                    )}
                  </View>
                ) : (
                  /* ── MOBILE : cartes ── */
                  byInd.map(({indicateur,rows}) => (
                    <View key={indicateur.num} style={{marginBottom:10}}>
                      <View style={[ih.indHeader,{borderLeftColor:cat.color}]}>
                        <Text style={[ih.indNum,{color:cat.color}]}>#{indicateur.num}</Text>
                        <Text style={ih.indTitle}>{indicateur.ind}</Text>
                      </View>
                      {rows.map(item => {
                        const ps = presStyle(item.presence);
                        return (
                          <View key={item.id} style={ih.mobCard}>
                            <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start'}}>
                              <View style={{flexDirection:'row',alignItems:'center',gap:8,flex:1}}>
                                <View style={ih.avatar}>
                                  <Text style={ih.avatarText}>{(item.collaborateurNom||'?')[0].toUpperCase()}</Text>
                                </View>
                                <View style={{flex:1}}>
                                  <Text style={ih.collabName}>{item.collaborateurNom}</Text>
                                  <Text style={ih.collabSub}>
                                    {item.collaborateurEntite}{item.dateDetection?` · ${item.dateDetection}`:''}
                                  </Text>
                                </View>
                              </View>
                              <View style={{alignItems:'flex-end',gap:6}}>
                                <View style={[ih.presBadge,{backgroundColor:ps.bg,borderColor:ps.border}]}>
                                  <Text style={[ih.presBadgeText,{color:ps.text}]}>{ps.label}</Text>
                                </View>
                                {canEdit(userRole)&&(
                                  <View style={{flexDirection:'row',gap:4}}>
                                    <TouchableOpacity style={s.editBtn} onPress={()=>openEdit(item)}>
                                      <Text style={s.editBtnText}>✏️</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={s.deleteBtn} onPress={()=>handleDelete(item)}>
                                      <Text style={s.deleteBtnText}>🗑</Text>
                                    </TouchableOpacity>
                                  </View>
                                )}
                              </View>
                            </View>
                            {item.actions&&<Text style={s.detailText}>📌 {item.actions}</Text>}
                            {item.suivi&&<Text style={s.detailText}>🔄 {item.suivi}</Text>}
                          </View>
                        );
                      })}
                    </View>
                  ))
                )}
              </View>
            ))
          )}
          <View style={{height:40}}/>
        </ScrollView>
      )}

      {/* ── MODAL ── */}
      <Modal visible={modalView!==null} transparent animationType="slide" statusBarTranslucent
        onRequestClose={() => {
          if(modalView==='indSelect'||modalView==='collabPicker') setModalView('form');
          else closeModal();
        }}>
        <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined} style={{flex:1}}>
          <View style={[s.modalOverlay, WEB&&{justifyContent:'center',alignItems:'center'}]}>

            {/* SÉLECTEUR INDICATEUR */}
            {modalView==='indSelect'&&(
              <View style={[s.modalBox, WEB&&ih.webModalBox, {maxHeight:'80%'}]}>
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>🔬 Choisir un indicateur</Text>
                  <TouchableOpacity onPress={()=>setModalView('form')}><Text style={s.closeBtn}>✕</Text></TouchableOpacity>
                </View>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {CATEGORIES.map(cat => (
                    <View key={cat.key}>
                      <View style={[ih.indCatHead,{borderLeftColor:cat.color}]}>
                        <CatBadge cat={cat.key}/>
                        <Text style={[{fontSize:12,fontWeight:'bold',color:cat.color,marginLeft:8}]}>{cat.label}</Text>
                      </View>
                      {INDICATEURS_FIXES.filter(i=>i.cat===cat.key).map(ind => (
                        <TouchableOpacity key={ind.num}
                          style={[ih.indItem, form.indicateurNum===ind.num&&{borderColor:cat.color,backgroundColor:cat.bg}]}
                          onPress={() => { setF('indicateurNum',ind.num); setModalView('form'); }}>
                          <Text style={[ih.indItemNum,{color:cat.color}]}>#{ind.num}</Text>
                          <Text style={[ih.indItemLabel, form.indicateurNum===ind.num&&{color:'#FFFFFF',fontWeight:'bold'}]}>
                            {ind.ind}
                          </Text>
                          {form.indicateurNum===ind.num&&<Text style={{color:cat.color,marginLeft:'auto'}}>✓</Text>}
                        </TouchableOpacity>
                      ))}
                    </View>
                  ))}
                  <View style={{height:20}}/>
                </ScrollView>
              </View>
            )}

            {/* PICKER COLLABORATEUR (groupé par entité = hiérarchique) */}
            {modalView==='collabPicker'&&(
              <View style={[s.modalBox, WEB&&ih.webModalBox, {maxHeight:'80%'}]}>
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>👥 Choisir un collaborateur</Text>
                  <TouchableOpacity onPress={()=>{setUserSearch('');setModalView('form');}}>
                    <Text style={s.closeBtn}>✕</Text>
                  </TouchableOpacity>
                </View>
                <TextInput style={[s.input,{marginBottom:10}]}
                  value={userSearch} onChangeText={setUserSearch}
                  placeholder="Rechercher nom ou matricule…"
                  placeholderTextColor="#607D8B" autoFocus/>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {Object.keys(usersByEntite).length===0 ? (
                    <Text style={{color:'#607D8B',textAlign:'center',padding:20}}>Aucun collaborateur trouvé</Text>
                  ) : Object.entries(usersByEntite).map(([entite,entiteUsers]) => (
                    <View key={entite}>
                      <View style={ih.entiteGrpHeader}>
                        <Text style={ih.entiteGrpTitle}>📍 {entite}</Text>
                        <View style={ih.entiteGrpCount}>
                          <Text style={{color:'#607D8B',fontSize:11}}>{entiteUsers.length}</Text>
                        </View>
                      </View>
                      {entiteUsers.map(u => (
                        <TouchableOpacity key={u.id} style={ih.collabItem} onPress={()=>selectCollab(u)}>
                          <View style={ih.avatar}>
                            <Text style={ih.avatarText}>{(u.fullName||'?')[0].toUpperCase()}</Text>
                          </View>
                          <View style={{flex:1}}>
                            <Text style={ih.collabName}>{u.fullName}</Text>
                            <Text style={ih.collabSub}>{u.matricule}{u.fonctionAssuree?` · ${u.fonctionAssuree}`:''}</Text>
                          </View>
                          <Text style={{color:'#C9A84C',fontSize:18}}>›</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ))}
                  <View style={{height:20}}/>
                </ScrollView>
              </View>
            )}

            {/* FORMULAIRE */}
            {modalView==='form'&&(
              <View style={[s.modalBox, WEB&&ih.webModalBox]}>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={s.modalHeader}>
                    <Text style={s.modalTitle}>{editing?'✏️ Modifier':'➕ Nouvelle entrée IFOH'}</Text>
                    <TouchableOpacity onPress={closeModal}><Text style={s.closeBtn}>✕</Text></TouchableOpacity>
                  </View>

                  <Text style={s.sectionTitle}>Indicateur</Text>
                  {editing ? (
                    <View style={ih.readonlyBlock}>
                      <CatBadge cat={INDICATEURS_FIXES.find(i=>i.num===form.indicateurNum)?.cat||''}/>
                      <Text style={{color:'#FFFFFF',fontSize:13,fontWeight:'bold',marginLeft:8,flex:1}}>
                        #{form.indicateurNum} — {INDICATEURS_FIXES.find(i=>i.num===form.indicateurNum)?.ind||''}
                      </Text>
                    </View>
                  ) : (
                    <TouchableOpacity style={[s.input,{flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderColor:form.indicateurNum?'#C9A84C':'#2A4060'}]}
                      onPress={()=>setModalView('indSelect')}>
                      {form.indicateurNum ? (
                        <View style={{flexDirection:'row',alignItems:'center',gap:8,flex:1}}>
                          <CatBadge cat={INDICATEURS_FIXES.find(i=>i.num===form.indicateurNum)?.cat||''}/>
                          <Text style={{color:'#FFFFFF',fontSize:13}}>
                            #{form.indicateurNum} — {INDICATEURS_FIXES.find(i=>i.num===form.indicateurNum)?.ind}
                          </Text>
                        </View>
                      ) : (
                        <Text style={{color:'#607D8B',fontSize:13,flex:1}}>Choisir un indicateur…</Text>
                      )}
                      <Text style={{color:'#C9A84C'}}>›</Text>
                    </TouchableOpacity>
                  )}

                  <Text style={s.sectionTitle}>Collaborateur</Text>
                  {editing ? (
                    <View style={ih.readonlyBlock}>
                      <View style={ih.avatar}>
                        <Text style={ih.avatarText}>{(form.collaborateurNom||'?')[0].toUpperCase()}</Text>
                      </View>
                      <Text style={{color:'#FFFFFF',fontSize:13,fontWeight:'bold',marginLeft:8}}>
                        {form.collaborateurNom} · {form.collaborateurEntite}
                      </Text>
                    </View>
                  ) : (
                    <TouchableOpacity style={[s.input,{flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderColor:form.collaborateurNom?'#C9A84C':'#2A4060'}]}
                      onPress={()=>setModalView('collabPicker')}>
                      {form.collaborateurNom ? (
                        <View style={{flexDirection:'row',alignItems:'center',gap:8,flex:1}}>
                          <View style={[ih.avatar,{width:28,height:28,borderRadius:14}]}>
                            <Text style={[ih.avatarText,{fontSize:12}]}>{form.collaborateurNom[0].toUpperCase()}</Text>
                          </View>
                          <Text style={{color:'#FFFFFF',fontSize:13}}>
                            {form.collaborateurNom} · {form.collaborateurEntite}
                          </Text>
                        </View>
                      ) : (
                        <Text style={{color:'#607D8B',fontSize:13,flex:1}}>Choisir un collaborateur…</Text>
                      )}
                      <Text style={{color:'#C9A84C'}}>›</Text>
                    </TouchableOpacity>
                  )}

                  <Text style={s.sectionTitle}>Évaluation</Text>
                  <View style={WEB?{flexDirection:'row',gap:20,alignItems:'flex-start'}:{}}>
                    <View style={WEB?{flex:1}:{}}>
                      <Text style={s.fieldLabel}>Présence O/N</Text>
                      <PresenceToggle value={form.presence} onChange={v=>setF('presence',v)}/>
                    </View>
                    <View style={WEB?{flex:1}:{marginTop:8}}>
                      <Text style={s.fieldLabel}>Date de détection</Text>
                      <TextInput style={s.input} value={form.dateDetection}
                        onChangeText={v=>setF('dateDetection',v)}
                        placeholder="AAAA-MM-JJ" placeholderTextColor="#607D8B"/>
                    </View>
                  </View>

                  <View style={WEB?{flexDirection:'row',gap:20,marginTop:4}:{}}>
                    <View style={WEB?{flex:1}:{}}>
                      <Text style={s.fieldLabel}>Actions</Text>
                      <TextInput style={[s.input,{height:70,textAlignVertical:'top'}]}
                        value={form.actions} onChangeText={v=>setF('actions',v)}
                        multiline placeholder="Actions à mettre en place…" placeholderTextColor="#607D8B"/>
                    </View>
                    <View style={WEB?{flex:1}:{}}>
                      <Text style={s.fieldLabel}>Suivi</Text>
                      <TextInput style={[s.input,{height:70,textAlignVertical:'top'}]}
                        value={form.suivi} onChangeText={v=>setF('suivi',v)}
                        multiline placeholder="Suivi des actions…" placeholderTextColor="#607D8B"/>
                    </View>
                  </View>

                  {saveError ? (
                    <View style={s.errorBanner}>
                      <Text style={s.errorText}>⚠️ {saveError}</Text>
                    </View>
                  ) : null}

                  <View style={s.modalBtns}>
                    <TouchableOpacity style={s.cancelBtn} onPress={closeModal}>
                      <Text style={s.cancelBtnText}>Annuler</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.saveBtn,saving&&{opacity:0.5}]} onPress={handleSave} disabled={saving}>
                      {saving ? <ActivityIndicator color="#0A1628" size="small"/>
                        : <Text style={s.saveBtnText}>{editing?'✅ Mettre à jour':'✅ Enregistrer'}</Text>}
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:'#0A1628'},
  header:{backgroundColor:'#0F2137',padding:20,borderBottomLeftRadius:20,borderBottomRightRadius:20,marginBottom:12},
  backText:{color:'#C9A84C',fontSize:14,marginBottom:8},
  headerRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  headerTitle:{color:'#FFFFFF',fontSize:16,fontWeight:'bold'},
  headerSub:{color:'#607D8B',fontSize:11,marginTop:2},
  list:{paddingHorizontal:14},
  sectionLabel:{color:'#C9A84C',fontWeight:'bold',fontSize:13,marginBottom:8},
  chipBtn:{paddingHorizontal:16,paddingVertical:8,borderRadius:20,backgroundColor:'#0F2137',borderWidth:1,borderColor:'#2A4060',marginRight:8},
  chipBtnActive:{backgroundColor:'#C9A84C',borderColor:'#C9A84C'},
  chipText:{color:'#607D8B',fontWeight:'bold'},
  chipTextActive:{color:'#0A1628'},
  entiteBox:{backgroundColor:'#0F2137',borderRadius:10,padding:14,marginBottom:16,borderLeftWidth:4,borderLeftColor:'#C9A84C'},
  entiteLabel:{color:'#607D8B',fontSize:11},
  entiteValue:{color:'#FFFFFF',fontSize:14,fontWeight:'bold',marginTop:2},
  entiteSub:{color:'#C9A84C',fontSize:11,marginTop:4},
  confirmBtn:{backgroundColor:'#C9A84C',borderRadius:12,padding:16,alignItems:'center',marginBottom:20},
  confirmBtnText:{color:'#0A1628',fontWeight:'bold',fontSize:15},
  addBtn:{backgroundColor:'#C9A84C',borderRadius:8,paddingHorizontal:12,paddingVertical:8},
  addBtnText:{color:'#0A1628',fontWeight:'bold',fontSize:12},
  pdfBtn:{backgroundColor:'#1E3A5F',borderRadius:8,paddingHorizontal:12,paddingVertical:8,borderWidth:1,borderColor:'#C9A84C'},
  pdfBtnText:{color:'#C9A84C',fontWeight:'bold',fontSize:12},
  readOnlyBanner:{backgroundColor:'#1A2F4A',marginHorizontal:14,marginBottom:8,borderRadius:8,padding:10,borderWidth:1,borderColor:'#4A90D9'},
  readOnlyText:{color:'#85C1E9',fontSize:12,fontWeight:'600'},
  emptyBox:{alignItems:'center',paddingVertical:60},
  emptyIcon:{fontSize:48,marginBottom:12},
  emptyText:{color:'#FFFFFF',fontSize:14,fontWeight:'bold',textAlign:'center'},
  emptySub:{color:'#607D8B',fontSize:12,marginTop:6},
  detailText:{color:'#B0BEC5',fontSize:11,marginTop:4},
  editBtn:{backgroundColor:'#4A90D920',borderRadius:6,padding:6,borderWidth:1,borderColor:'#4A90D9'},
  editBtnText:{fontSize:13},
  deleteBtn:{backgroundColor:'#E74C3C20',borderRadius:6,padding:6,borderWidth:1,borderColor:'#E74C3C'},
  deleteBtnText:{fontSize:13},
  modalOverlay:{flex:1,backgroundColor:'#00000090',justifyContent:'flex-end'},
  modalBox:{backgroundColor:'#0F2137',borderTopLeftRadius:24,borderTopRightRadius:24,padding:24,maxHeight:'93%'},
  modalHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:16},
  modalTitle:{color:'#FFFFFF',fontSize:16,fontWeight:'bold'},
  closeBtn:{color:'#607D8B',fontSize:20},
  sectionTitle:{color:'#C9A84C',fontSize:12,fontWeight:'bold',marginTop:16,marginBottom:8,borderBottomWidth:1,borderBottomColor:'#2A4060',paddingBottom:4},
  fieldLabel:{color:'#B0BEC5',fontSize:12,marginBottom:4,marginTop:8},
  input:{backgroundColor:'#1A2F4A',borderWidth:1,borderColor:'#2A4060',borderRadius:8,padding:10,color:'#FFFFFF',fontSize:13},
  modalBtns:{flexDirection:'row',gap:10,marginTop:20,marginBottom:8},
  cancelBtn:{flex:1,backgroundColor:'#1A2F4A',borderRadius:10,padding:14,alignItems:'center'},
  cancelBtnText:{color:'#607D8B',fontWeight:'bold'},
  saveBtn:{flex:2,backgroundColor:'#C9A84C',borderRadius:10,padding:14,alignItems:'center'},
  saveBtnText:{color:'#0A1628',fontWeight:'bold',fontSize:14},
  errorBanner:{backgroundColor:'#3A0E0E',borderRadius:8,padding:12,marginTop:12,borderWidth:1,borderColor:'#E74C3C'},
  errorText:{color:'#F1948A',fontSize:12},
});

const ih = StyleSheet.create({
  catBadge:{paddingHorizontal:8,paddingVertical:3,borderRadius:6,borderWidth:1,alignSelf:'flex-start'},
  catText:{fontSize:10,fontWeight:'bold'},
  catCard:{backgroundColor:'#0F2137',borderRadius:8,padding:12,borderLeftWidth:4,marginBottom:4},
  filtersWrap:{paddingHorizontal:14,marginBottom:8},
  statsRow:{flexDirection:'row',gap:8,marginBottom:6,flexWrap:'wrap'},
  statBadge:{paddingHorizontal:10,paddingVertical:5,borderRadius:8,borderWidth:1},
  statText:{fontSize:11,fontWeight:'bold'},
  filterBtn:{paddingHorizontal:10,paddingVertical:5,borderRadius:16,backgroundColor:'#0F2137',borderWidth:1,borderColor:'#2A4060',marginRight:6},
  filterBtnAll:{backgroundColor:'#C9A84C',borderColor:'#C9A84C'},
  filterBtnText:{fontSize:11,fontWeight:'600',color:'#607D8B'},
  presBtn:{paddingHorizontal:16,paddingVertical:8,borderRadius:8,borderWidth:1.5,backgroundColor:'transparent'},
  presBtnText:{fontWeight:'bold',fontSize:13},
  presBadge:{paddingHorizontal:8,paddingVertical:4,borderRadius:8,borderWidth:1},
  presBadgeText:{fontSize:11,fontWeight:'bold'},
  presMini:{paddingHorizontal:6,paddingVertical:2,borderRadius:4,borderWidth:1},
  catHeader:{flexDirection:'row',alignItems:'center',gap:10,borderLeftWidth:4,paddingLeft:12,marginBottom:8,backgroundColor:'#0F2137',padding:10,borderRadius:8},
  catHeaderTitle:{fontSize:14,fontWeight:'bold',flex:1},
  catHeaderCount:{color:'#607D8B',fontSize:12},
  indHeader:{flexDirection:'row',alignItems:'center',gap:8,borderLeftWidth:3,paddingLeft:8,marginBottom:4,backgroundColor:'#111D30',padding:8,borderRadius:6},
  indNum:{fontSize:11,fontWeight:'bold',width:28},
  indTitle:{color:'#FFFFFF',fontSize:12,fontWeight:'bold',flex:1},
  mobCard:{backgroundColor:'#0F2137',borderRadius:10,padding:12,marginBottom:6},
  avatar:{width:36,height:36,borderRadius:18,backgroundColor:'#1E3A5F',borderWidth:1,borderColor:'#2A4060',alignItems:'center',justifyContent:'center'},
  avatarText:{color:'#C9A84C',fontWeight:'bold',fontSize:14},
  collabName:{color:'#FFFFFF',fontSize:13,fontWeight:'bold'},
  collabSub:{color:'#607D8B',fontSize:11,marginTop:2},
  webTable:{backgroundColor:'#0F2137',borderRadius:10,overflow:'hidden',borderWidth:1,borderColor:'#2A4060',marginBottom:4},
  webTr:{flexDirection:'row',alignItems:'center',paddingVertical:8,paddingHorizontal:10},
  webTHead:{backgroundColor:'#1A2F4A',borderBottomWidth:1,borderBottomColor:'#2A4060'},
  webTrEven:{backgroundColor:'#0F2137'},
  webTrOdd:{backgroundColor:'#111D30'},
  webTh:{color:'#C9A84C',fontSize:11,fontWeight:'bold',paddingRight:6},
  webTd:{color:'#B0BEC5',fontSize:11,paddingRight:6},
  webBtn:{backgroundColor:'#4A90D920',borderRadius:5,padding:5,borderWidth:1,borderColor:'#4A90D9'},
  webModalBox:{borderRadius:16,maxWidth:680,width:'90%',maxHeight:'90%',alignSelf:'center'},
  indCatHead:{flexDirection:'row',alignItems:'center',borderLeftWidth:3,paddingLeft:8,marginBottom:4,marginTop:10},
  indItem:{flexDirection:'row',alignItems:'center',backgroundColor:'#1A2F4A',borderRadius:8,padding:12,marginBottom:4,borderWidth:1,borderColor:'#2A4060'},
  indItemNum:{fontSize:11,fontWeight:'bold',width:28},
  indItemLabel:{color:'#B0BEC5',fontSize:13,flex:1},
  entiteGrpHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',backgroundColor:'#1E3A5F',borderRadius:6,padding:8,marginBottom:4,marginTop:8},
  entiteGrpTitle:{color:'#C9A84C',fontSize:12,fontWeight:'bold'},
  entiteGrpCount:{backgroundColor:'#0F2137',borderRadius:10,paddingHorizontal:8,paddingVertical:2},
  collabItem:{flexDirection:'row',alignItems:'center',gap:10,backgroundColor:'#1A2F4A',borderRadius:8,padding:10,marginBottom:4},
  readonlyBlock:{flexDirection:'row',alignItems:'center',backgroundColor:'#1A2F4A',borderRadius:8,padding:12,borderLeftWidth:3,borderLeftColor:'#C9A84C',marginBottom:4},
});
