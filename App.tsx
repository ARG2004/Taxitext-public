import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'react-native';

// Screens
import SplashScreen from './src/screens/SplashScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import DriverLoginScreen from './src/screens/DriverLoginScreen';
import PassengerLoginScreen from './src/screens/PassengerLoginScreen';
import DriverHomeScreen from './src/screens/DriverHomeScreen';
import PassengerHomeScreen from './src/screens/PassengerHomeScreen';
import PassengerRideScreen from './src/screens/PassengerRideScreen';
import DriverMapScreen from './src/screens/DriverMapScreen';
import PassengerRidesScreen from './src/screens/PassengerRidesScreen';
import DriverRidesScreen from './src/screens/DriverRidesScreen';
import ChatScreen from './src/screens/ChatScreen';


const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="DriverLogin" component={DriverLoginScreen} />
        <Stack.Screen name="PassengerLogin" component={PassengerLoginScreen} />
        <Stack.Screen name="DriverHome" component={DriverHomeScreen} />
        <Stack.Screen name="PassengerHome" component={PassengerHomeScreen} />
        <Stack.Screen name="PassengerRide" component={PassengerRideScreen} />
        <Stack.Screen name="DriverMap" component={DriverMapScreen} />
        <Stack.Screen name="PassengerRides" component={PassengerRidesScreen} />
        <Stack.Screen name="DriverRides" component={DriverRidesScreen} />
        <Stack.Screen
          name="Chat"
          component={ChatScreen}
          options={{ headerShown: false, presentation: 'modal' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}