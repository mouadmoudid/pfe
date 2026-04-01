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


        </Stack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
}