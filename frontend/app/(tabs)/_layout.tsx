import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { profileAPI } from '../../utils/api';
import AvatarFallback from '../../components/AvatarFallback';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarGender, setAvatarGender] = useState<string | null>(null);

  useEffect(() => {
    profileAPI
      .getMe()
      .then((res) => {
        const uri = res.data?.profileImage || res.data?.profileImages?.[0];
        if (uri) setAvatarUrl(uri);
        setAvatarGender(res.data?.gender ?? null);
      })
      .catch(() => {});
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: '#B3122E',
        tabBarInactiveTintColor: '#8E8E8E',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: -2,
        },
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#F0F0F0',
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom + 6,
          paddingTop: 8,
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -3 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
            },
            android: {
              elevation: 8,
            },
          }),
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={styles.iconContainer}>
              <Ionicons
                name={focused ? 'home' : 'home-outline'}
                size={24}
                color={focused ? '#B3122E' : '#262626'}
              />
              {focused && <View style={styles.activeDot} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="likes"
        options={{
          title: 'Matches',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={styles.iconContainer}>
              <Ionicons
                name={focused ? 'heart' : 'heart-outline'}
                size={24}
                color={focused ? '#B3122E' : '#262626'}
              />
              {focused && <View style={styles.activeDot} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="shortlist"
        options={{
          title: 'Shortlisted',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={styles.iconContainer}>
              <Ionicons
                name={focused ? 'bookmark' : 'bookmark-outline'}
                size={24}
                color={focused ? '#B3122E' : '#262626'}
              />
              {focused && <View style={styles.activeDot} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={styles.iconContainer}>
              {avatarUrl ? (
                <View style={[styles.avatarRing, focused && styles.avatarRingActive]}>
                  <Image source={{ uri: avatarUrl }} style={styles.avatarImage} contentFit="cover" contentPosition="top" />
                </View>
              ) : (
                <View style={[styles.avatarRing, focused && styles.avatarRingActive]}>
                  <AvatarFallback profile={{ gender: avatarGender }} glyphSize={22} />
                </View>
              )}
              {focused && <View style={styles.activeDot} />}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 28,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#B3122E',
    marginTop: 2,
    position: 'absolute',
    bottom: -4,
  },
  avatarRing: {
    width: 25,
    height: 25,
    borderRadius: 12.5,
    borderWidth: 1.5,
    borderColor: '#DBDBDB',
    overflow: 'hidden',
  },
  avatarRingActive: {
    borderWidth: 2,
    borderColor: '#B3122E',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
});

