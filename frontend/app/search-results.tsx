import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Platform } from 'react-native';

import { useState, useEffect } from 'react';
import { profileAPI } from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useGuardedRouter } from '../utils/useGuardedRouter';

export default function SearchResultsScreen() {
  const router = useGuardedRouter();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchCriteria, setSearchCriteria] = useState<any>(null);

  useEffect(() => {
    loadSearchResults();
  }, []);

  const loadSearchResults = async () => {
    setLoading(true);
    try {
      const criteriaStr = await AsyncStorage.getItem('search_criteria');
      if (criteriaStr) {
        setSearchCriteria(JSON.parse(criteriaStr));
      }
      
      // For now, get all profiles and filter client-side
      // In production, you'd want server-side filtering
      const response = await profileAPI.getProfiles(0, 100);
      const profilesData = response.data.content || response.data || [];
      let filtered = profilesData;

      if (criteriaStr) {
        const criteria = JSON.parse(criteriaStr);
        filtered = response.data.filter((profile: any) => {
          // Apply filters
          if (criteria.maritalStatus && profile.marital_status !== criteria.maritalStatus) return false;
          if (criteria.state && profile.state?.toLowerCase() !== criteria.state.toLowerCase()) return false;
          if (criteria.city && profile.city?.toLowerCase() !== criteria.city.toLowerCase()) return false;
          if (criteria.manglik && profile.manglik !== criteria.manglik) return false;
          if (criteria.motherTongue && profile.mother_tongue?.toLowerCase() !== criteria.motherTongue.toLowerCase()) return false;
          if (criteria.diet && profile.diet !== criteria.diet) return false;
          return true;
        });
      }

      setProfiles(filtered);
    } catch (error) {
      console.error('Failed to load search results:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProfileImage = (profile: any) => {
    if (profile?.profileImage) {
      return { uri: profile.profileImage };
    }
    if (profile?.profile_image) {
      return { uri: profile.profile_image };
    }
    if (profile?.profileImages && profile.profileImages.length > 0) {
      return { uri: profile.profileImages[0] };
    }
    return require('../assets/images/icon.png');
  };

  const renderProfile = ({ item }: any) => (
    <TouchableOpacity 
      style={styles.profileCard}
      onPress={() => router.push(`/profile-detail/${item.id}`)}
    >
      <Image
        source={getProfileImage(item)}
        style={styles.profileImage}
      />
      <View style={styles.profileInfo}>
        <Text style={styles.profileId}>GS{item.id}</Text>
        <Text style={styles.profileName}>{item.name || 'Anonymous'}</Text>
        <Text style={styles.profileDetail}>
          {item.height || 'N/A'}, {item.marital_status || 'N/A'}
        </Text>
        <Text style={styles.profileDetail}>
          {item.profession || 'Not specified'}
        </Text>
        <Text style={styles.profileDetail}>
          {item.city || 'N/A'}, {item.state || 'N/A'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color="#999" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Search Results</Text>
      </View>

      <View style={styles.resultsCount}>
        <Text style={styles.resultsCountText}>
          {profiles.length} profile{profiles.length !== 1 ? 's' : ''} found
        </Text>
      </View>

      <FlatList
        data={profiles}
        renderItem={renderProfile}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={64} color="#CCC" />
            <Text style={styles.emptyText}>No profiles match your search criteria</Text>
            <TouchableOpacity 
              style={styles.modifyButton}
              onPress={() => router.back()}
            >
              <Text style={styles.modifyButtonText}>Modify Search</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#8B0000',
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  resultsCount: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  resultsCountText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#8B0000',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  profileId: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#8B0000',
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  profileDetail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  emptyContainer: {
    padding: 64,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
    textAlign: 'center',
  },
  modifyButton: {
    marginTop: 24,
    backgroundColor: '#8B0000',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  modifyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});