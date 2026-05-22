import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthProvider } from './app/context/AuthContext';

import LoginScreen from './app/screens/LoginScreen';
import RegisterScreen from './app/screens/RegisterScreen';
import DashboardScreen from './app/screens/DashboardScreen';
import ManagerScreen from './app/screens/ManagerScreen';
import AgentScreen from './app/screens/AgentScreen';
import AdminScreen from './app/screens/AdminScreen';
import PlanningScreen from './app/screens/PlanningScreen';
import PlanningKScreen from './app/screens/PlanningKScreen';
import FolderScreen from './app/screens/FolderScreen';
import CheckListScreen from './app/screens/CheckListScreen';
import CollaborateursScreen from './app/screens/CollaborateursScreen';
import ChangePasswordScreen from './app/screens/ChangePasswordScreen';
import CompteRenduScreen from './app/screens/CompteRenduScreen';
import RapportPeriodiqueScreen from './app/screens/RapportPeriodiqueScreen';
import RACIScreen from './app/screens/RACIScreen';
import FicheSuiviScreen from './app/screens/FicheSuiviScreen';
import TableauIndicateursScreen from './app/screens/TableauIndicateursScreen';
import ListeCollaborateursScreen from './app/screens/ListeCollaborateursScreen';
import RexScreen from './app/screens/RexScreen';
import RaceScreen from './app/screens/RaceScreen';
import ReferentielsScreen from './app/screens/ReferentielsScreen';
import SuiviCongesScreen from './app/screens/SuiviCongesScreen';
import SuiviAstreinteScreen from './app/screens/SuiviAstreinteScreen';
import CulturePositiveScreen from './app/screens/CulturePositiveScreen';
import RemonteeInfoScreen from './app/screens/RemonteeInfoScreen';
import CartographieRisquesScreen from './app/screens/CartographieRisquesScreen';
import RegistreDangersScreen from './app/screens/RegistreDangersScreen';
import ElementSoldeScreen from './app/screens/ElementSoldeScreen';
import PdvsCollabScreen from './app/screens/PdvsCollabScreen';
import PdvsSiteScreen from './app/screens/PdvsSiteScreen';
import PdvsManagementScreen from './app/screens/PdvsManagementScreen';
import PlanningKN2Screen from './app/screens/PlanningKN2Screen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
          <Stack.Screen name="Manager" component={ManagerScreen} />
          <Stack.Screen name="Agent" component={AgentScreen} />
          <Stack.Screen name="Admin" component={AdminScreen} />
          <Stack.Screen name="Planning" component={PlanningScreen} />
          <Stack.Screen name="PlanningK" component={PlanningKScreen} />
          <Stack.Screen name="Folder" component={FolderScreen} />
          <Stack.Screen name="CheckList" component={CheckListScreen} />
          <Stack.Screen name="Collaborateurs" component={CollaborateursScreen} />
          <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
          <Stack.Screen name="CompteRendu" component={CompteRenduScreen} />
          <Stack.Screen name="RapportPeriodique" component={RapportPeriodiqueScreen} />
          <Stack.Screen name="RACI" component={RACIScreen} />
          <Stack.Screen name="FicheSuivi" component={FicheSuiviScreen} />
          <Stack.Screen name="TableauIndicateurs" component={TableauIndicateursScreen} />
          <Stack.Screen name="ListeCollaborateurs" component={ListeCollaborateursScreen} />
          <Stack.Screen name="Rex" component={RexScreen} />
          <Stack.Screen name="Race" component={RaceScreen} />
          <Stack.Screen name="Referentiels" component={ReferentielsScreen} />
          <Stack.Screen name="SuiviConges" component={SuiviCongesScreen} />
          <Stack.Screen name="SuiviAstreinte" component={SuiviAstreinteScreen} />
          <Stack.Screen name="CulturePositive" component={CulturePositiveScreen} />
          <Stack.Screen name="RemonteeInfo" component={RemonteeInfoScreen} />
          <Stack.Screen name="CartographieRisques" component={CartographieRisquesScreen} />
          <Stack.Screen name="RegistreDangers" component={RegistreDangersScreen} />
          <Stack.Screen name="ElementSolde" component={ElementSoldeScreen} />
          <Stack.Screen name="PdvsCollab" component={PdvsCollabScreen} />
          <Stack.Screen name="PdvsSite" component={PdvsSiteScreen} />
          <Stack.Screen name="PdvsManagement" component={PdvsManagementScreen} />
          <Stack.Screen name="PlanningKN2" component={PlanningKN2Screen} />


        </Stack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
}