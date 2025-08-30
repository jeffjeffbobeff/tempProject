/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, {useEffect, useState} from 'react';
import type {PropsWithChildren} from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  Alert,
} from 'react-native';
import {getApps, getApp} from '@react-native-firebase/app';
import firestore from '@react-native-firebase/firestore';

import {
  Colors,
  DebugInstructions,
  Header,
  LearnMoreLinks,
  ReloadInstructions,
} from 'react-native/Libraries/NewAppScreen';

type SectionProps = PropsWithChildren<{
  title: string;
}>;

function Section({children, title}: SectionProps): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  return (
    <View style={styles.sectionContainer}>
      <Text
        style={[
          styles.sectionTitle,
          {
            color: isDarkMode ? Colors.white : Colors.black,
          },
        ]}>
        {title}
      </Text>
      <Text
        style={[
          styles.sectionDescription,
          {
            color: isDarkMode ? Colors.light : Colors.dark,
          },
        ]}>
        {children}
      </Text>
    </View>
  );
}

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  const [firebaseStatus, setFirebaseStatus] = useState<string>('Checking...');

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  useEffect(() => {
    // Test Firebase connection with detailed logging
    console.log('🔍 Starting Firebase connection test...');
    
    try {
      console.log('🔍 Attempting to get Firebase apps...');
      let apps = getApps();
      console.log('🔍 getApps() result:', apps);
      console.log('🔍 Number of apps:', apps.length);
      
      // If no apps found, log the issue
      if (!apps || apps.length === 0) {
        console.log('🔍 No Firebase apps found - this means the GoogleService-Info.plist is not being read');
        console.log('🔍 The file needs to be properly added to the Xcode project build phases');
      }
      
      if (apps && apps.length > 0) {
        console.log('🔍 Firebase apps found, getting first app...');
        const app = getApp();
        console.log('🔍 getApp() result:', app);
        console.log('🔍 App name:', app?.name);
        console.log('🔍 App options:', app?.options);
        
        setFirebaseStatus('✅ Firebase Connected!');
        console.log('✅ Firebase app initialized successfully:', app?.name);
      } else {
        console.log('🔍 Still no Firebase apps found after initialization attempt');
        setFirebaseStatus('❌ Firebase Not Connected - No apps found');
      }
    } catch (error) {
      console.error('🔍 Firebase error occurred:', error);
      console.error('🔍 Error message:', error instanceof Error ? error.message : String(error));
      console.error('🔍 Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      setFirebaseStatus('❌ Firebase Error: ' + (error instanceof Error ? error.message : String(error)));
    }
    
    // Additional debugging
    console.log('🔍 Checking if Firebase modules are available...');
    console.log('🔍 getApps function:', typeof getApps);
    console.log('🔍 getApp function:', typeof getApp);
    
    // Test if we can import the modules
    try {
      const firebaseApp = require('@react-native-firebase/app');
      console.log('🔍 Firebase app module:', firebaseApp);
      console.log('🔍 Available exports:', Object.keys(firebaseApp));
    } catch (importError) {
      console.error('🔍 Error importing Firebase app module:', importError);
    }
    
    try {
      const firestoreModule = require('@react-native-firebase/firestore');
      console.log('🔍 Firestore module:', firestoreModule);
      console.log('🔍 Available exports:', Object.keys(firestoreModule));
    } catch (importError) {
      console.error('🔍 Error importing Firestore module:', importError);
    }
  }, []);

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={backgroundStyle}>
        <Header />
        <View
          style={{
            backgroundColor: isDarkMode ? Colors.black : Colors.white,
          }}>
          <Section title="Firebase Status">
            <Text style={styles.highlight}>{firebaseStatus}</Text>
          </Section>
          <Section title="Step One">
            Edit <Text style={styles.highlight}>App.tsx</Text> to change this
            screen and then come back to see your edits.
          </Section>
          <Section title="See Your Changes">
            <ReloadInstructions />
          </Section>
          <Section title="Debug">
            <DebugInstructions />
          </Section>
          <Section title="Learn More">
            Read the docs to discover what to do next:
          </Section>
          <LearnMoreLinks />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
  },
  highlight: {
    fontWeight: '700',
  },
});

export default App;
