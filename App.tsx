/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, {useEffect, useState} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {getApps, getApp} from '@react-native-firebase/app';
import firestore from '@react-native-firebase/firestore';

function App(): React.JSX.Element {
  const [firebaseStatus, setFirebaseStatus] = useState<string>('Checking...');
  const [mostRecentGameId, setMostRecentGameId] = useState<string>('Loading...');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    // Test Firebase connection
    console.log('🔍 Starting Firebase connection test...');
    
    try {
      console.log('🔍 Attempting to get Firebase apps...');
      let apps = getApps();
      console.log('🔍 getApps() result:', apps);
      console.log('🔍 Number of apps:', apps.length);
      
      if (apps && apps.length > 0) {
        console.log('🔍 Firebase apps found, getting first app...');
        const app = getApp();
        console.log('🔍 getApp() result:', app);
        console.log('🔍 App name:', app?.name);
        
        setFirebaseStatus('✅ Firebase Connected!');
        console.log('✅ Firebase app initialized successfully:', app?.name);
        
        // Now fetch the most recent game ID
        fetchMostRecentGameId();
      } else {
        console.log('🔍 No Firebase apps found');
        setFirebaseStatus('❌ Firebase Not Connected - No apps found');
      }
    } catch (error) {
      console.error('🔍 Firebase error occurred:', error);
      setFirebaseStatus('❌ Firebase Error: ' + (error instanceof Error ? error.message : String(error)));
    }
  }, []);

  const fetchMostRecentGameId = async () => {
    try {
      console.log('🔍 Fetching most recent game ID...');
      
      // Query the games collection, order by creation time, limit to 1
      const gamesSnapshot = await firestore()
        .collection('games')
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();

      if (!gamesSnapshot.empty) {
        const mostRecentGame = gamesSnapshot.docs[0];
        const gameId = mostRecentGame.id;
        const gameData = mostRecentGame.data();
        
        console.log('✅ Most recent game found:', gameId);
        console.log('✅ Game data:', gameData);
        
        setMostRecentGameId(gameId);
      } else {
        console.log('ℹ️ No games found in database');
        setMostRecentGameId('No games found');
      }
    } catch (error) {
      console.error('❌ Error fetching most recent game:', error);
      setError('Error fetching game: ' + (error instanceof Error ? error.message : String(error)));
      setMostRecentGameId('Error loading');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.helloWorld}>Hellow World</Text>
        <Text style={styles.gameId}>Most Recent Game ID: {mostRecentGameId}</Text>
        <Text style={styles.status}>Firebase Status: {firebaseStatus}</Text>
        {error ? <Text style={styles.error}>Error: {error}</Text> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  helloWorld: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 40,
  },
  gameId: {
    fontSize: 24,
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  status: {
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  error: {
    fontSize: 16,
    color: '#FF6B6B',
    textAlign: 'center',
  },
});

export default App;
