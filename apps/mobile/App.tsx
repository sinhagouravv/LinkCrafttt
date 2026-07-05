import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Clipboard,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Use localhost for iOS simulator, or replace with your machine's IP (e.g., 192.168.x.x) for physical devices.
const API_BASE = 'http://localhost:5005/api';
const REDIRECT_BASE = 'http://localhost:5005';

interface ShortURL {
  id: string;
  originalUrl: string;
  shortCode: string;
  clicks: number;
  createdAt: string;
}

export default function App() {
  // Auth state
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Shortener state
  const [originalUrl, setOriginalUrl] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [urls, setUrls] = useState<ShortURL[]>([]);
  const [error, setError] = useState('');

  // Fetch user's links
  const fetchUrls = async (userToken: string) => {
    try {
      const res = await fetch(`${API_BASE}/urls`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const json = await res.json();
      if (json.success) {
        setUrls(json.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    const endpoint = isRegistering ? 'register' : 'login';
    try {
      const res = await fetch(`${API_BASE}/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (json.success) {
        setToken(json.data.token);
        setIsLoggedIn(true);
        setEmail('');
        setPassword('');
        fetchUrls(json.data.token);
        Alert.alert('Success', `Successfully ${isRegistering ? 'registered' : 'logged in'}!`);
      } else {
        Alert.alert('Authentication Failed', json.error || 'Check your credentials.');
      }
    } catch (err) {
      Alert.alert('Network Error', 'Cannot connect to server. Check host configurations.');
    }
  };

  const handleShorten = async () => {
    if (!originalUrl) {
      setError('Please input an original URL.');
      return;
    }
    setError('');

    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(`${API_BASE}/urls`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ originalUrl, customCode }),
      });
      const json = await res.json();
      if (json.success) {
        setOriginalUrl('');
        setCustomCode('');
        Alert.alert('URL Shortened', `Short Code: ${json.data.shortCode}`);
        if (token) {
          fetchUrls(token);
        }
      } else {
        setError(json.error || 'Failed to shorten URL.');
      }
    } catch (err) {
      setError('Failed to contact the server.');
    }
  };

  const handleCopy = (code: string) => {
    const fullLink = `${REDIRECT_BASE}/${code}`;
    Clipboard.setString(fullLink);
    Alert.alert('Copied!', 'Short URL has been copied to your clipboard.');
  };

  const handleLogout = () => {
    setToken(null);
    setIsLoggedIn(false);
    setUrls([]);
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <StatusBar style="light" />
      <ScrollView className="flex-1 px-5 pt-8">
        {/* Header */}
        <View className="items-center mb-8">
          <Text className="text-3xl font-extrabold text-white tracking-tight">
            Link<Text className="text-blue-500">Craft</Text>
          </Text>
          <Text className="text-slate-400 text-xs mt-1">URL Shortener & Analytics</Text>
        </View>

        {/* Shorten Link Box */}
        <View className="bg-slate-900 border border-slate-800 p-5 rounded-2xl mb-8">
          <Text className="text-white text-lg font-bold mb-3">Shorten a Link</Text>
          
          <Text className="text-slate-400 text-xs mb-1 font-medium">Original URL</Text>
          <TextInput
            placeholder="https://example.com/very-long-url"
            placeholderTextColor="#475569"
            value={originalUrl}
            onChangeText={setOriginalUrl}
            className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white mb-4"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text className="text-slate-400 text-xs mb-1 font-medium">Custom Alias (Optional)</Text>
          <TextInput
            placeholder="my-link"
            placeholderTextColor="#475569"
            value={customCode}
            onChangeText={setCustomCode}
            className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white mb-4"
            autoCapitalize="none"
            autoCorrect={false}
          />

          {error ? <Text className="text-red-400 text-xs mb-3">{error}</Text> : null}

          <TouchableOpacity
            onPress={handleShorten}
            className="bg-blue-600 rounded-xl py-3 items-center"
          >
            <Text className="text-white font-bold text-base">Shorten URL</Text>
          </TouchableOpacity>
        </View>

        {/* Auth Panel */}
        {!isLoggedIn ? (
          <View className="bg-slate-900 border border-slate-800 p-5 rounded-2xl mb-12">
            <Text className="text-white text-lg font-bold mb-1">
              {isRegistering ? 'Register Account' : 'Sign In'}
            </Text>
            <Text className="text-slate-400 text-xs mb-4">
              Sign in to manage and view click statistics for your URLs.
            </Text>

            <Text className="text-slate-400 text-xs mb-1 font-medium">Email Address</Text>
            <TextInput
              placeholder="email@example.com"
              placeholderTextColor="#475569"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white mb-4"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text className="text-slate-400 text-xs mb-1 font-medium">Password</Text>
            <TextInput
              placeholder="••••••••"
              placeholderTextColor="#475569"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white mb-5"
              autoCapitalize="none"
            />

            <TouchableOpacity
              onPress={handleAuth}
              className="bg-slate-800 rounded-xl py-3 items-center mb-4"
            >
              <Text className="text-white font-bold text-base">
                {isRegistering ? 'Create Account' : 'Sign In'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setIsRegistering(!isRegistering)}
              className="items-center"
            >
              <Text className="text-blue-400 text-xs font-semibold">
                {isRegistering ? 'Already have an account? Sign In' : "Don't have an account? Register"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Logged In Dashboard */
          <View className="mb-12">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-white text-xl font-bold">Your Links</Text>
              <TouchableOpacity onPress={handleLogout}>
                <Text className="text-red-400 font-semibold text-xs">Sign Out</Text>
              </TouchableOpacity>
            </View>

            {urls.length === 0 ? (
              <View className="bg-slate-900 border border-dashed border-slate-800 p-8 rounded-2xl items-center">
                <Text className="text-slate-500 text-sm">No links generated yet.</Text>
              </View>
            ) : (
              <View className="gap-3">
                {urls.map((item) => (
                  <View key={item.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                    <View className="flex-row justify-between items-center mb-1">
                      <Text className="text-white font-bold text-base truncate max-w-[180px]">
                        /{item.shortCode}
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleCopy(item.shortCode)}
                        className="bg-slate-800 px-3 py-1 rounded-lg"
                      >
                        <Text className="text-blue-400 text-xs font-bold">Copy</Text>
                      </TouchableOpacity>
                    </View>
                    <Text className="text-slate-500 text-xs mb-2 truncate">{item.originalUrl}</Text>
                    <View className="flex-row justify-between items-center pt-2 border-t border-slate-950">
                      <Text className="text-slate-400 text-[11px]">
                        Clicks: <Text className="text-blue-400 font-bold">{item.clicks}</Text>
                      </Text>
                      <Text className="text-slate-500 text-[10px]">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
