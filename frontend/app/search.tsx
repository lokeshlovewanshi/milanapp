import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert } from 'react-native';

import { useState } from 'react';
import { Picker } from '@react-native-picker/picker';
import { profileAPI } from '../utils/api';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useGuardedRouter } from '../utils/useGuardedRouter';
import { parseProfileId } from '../components/theme';

export default function AdvancedSearchScreen() {
  const router = useGuardedRouter();
  const [profileId, setProfileId] = useState('');
  const [ageFrom, setAgeFrom] = useState('');
  const [ageTo, setAgeTo] = useState('');
  const [heightFrom, setHeightFrom] = useState('');
  const [heightTo, setHeightTo] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [education, setEducation] = useState('');
  const [profession, setProfession] = useState('');
  const [annualIncome, setAnnualIncome] = useState('');
  const [manglik, setManglik] = useState('');
  const [motherTongue, setMotherTongue] = useState('');
  const [diet, setDiet] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearchById = async () => {
    // parseProfileId, not parseInt: members type the code exactly as the app
    // prints it ("GSJM00234"), and parseInt on that is NaN - which is why this
    // box only ever worked for someone who happened to type bare digits.
    const id = parseProfileId(profileId);
    if (id === null) {
      Alert.alert(
        'Enter a Profile ID',
        'A profile ID looks like GSJM00234. You can type it with or without the letters.'
      );
      return;
    }
    try {
      await profileAPI.getProfile(id);
      router.push(`/profile-detail/${id}`);
    } catch (error: any) {
      Alert.alert('Not found', `No profile matches ${profileId.trim()}.`);
    }
  };

  const handleAdvancedSearch = async () => {
    setLoading(true);
    try {
      const searchCriteria = { ageFrom, ageTo, heightFrom, heightTo, maritalStatus, state, city, education, profession, annualIncome, manglik, motherTongue, diet };
      await AsyncStorage.setItem('search_criteria', JSON.stringify(searchCriteria));
      router.push('/search-results');
    } catch (error: any) {
      Alert.alert('Error', 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setProfileId(''); setAgeFrom(''); setAgeTo(''); setHeightFrom(''); setHeightTo('');
    setMaritalStatus(''); setState(''); setCity(''); setEducation(''); setProfession('');
    setAnnualIncome(''); setManglik(''); setMotherTongue(''); setDiet('');
  };

  const SearchInput = ({ icon, placeholder, value, onChangeText, keyboardType }: any) => (
    <View style={styles.inputContainer}>
      <View style={styles.inputIconContainer}>
        <Ionicons name={icon || 'create'} size={18} color="#8B5CF6" />
      </View>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
      />
    </View>
  );

  const SearchPicker = ({ icon, selectedValue, onValueChange, items }: any) => (
    <View style={styles.pickerWrapper}>
      <View style={styles.pickerIconContainer}>
        <Ionicons name={icon || 'list'} size={18} color="#8B5CF6" />
      </View>
      <View style={styles.pickerContainer}>
        <Picker selectedValue={selectedValue} onValueChange={onValueChange} style={styles.picker}>
          {items.map((item: any, idx: number) => (
            <Picker.Item key={idx} label={item.label} value={item.value} />
          ))}
        </Picker>
      </View>
    </View>
  );

  const Label = ({ text }: { text: string }) => (
    <Text style={styles.label}>{text}</Text>
  );

  return (
    <View style={styles.container}>
      {/* Gradient Header */}
      <LinearGradient
        colors={['#6366F1', '#8B5CF6']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity testID="search-back-btn" onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <View style={styles.headerIcon}>
              <LinearGradient colors={['#10B981', '#059669']} style={styles.iconGradient}>
                <Ionicons name="search" size={24} color="#FFFFFF" />
              </LinearGradient>
            </View>
            <View>
              <Text style={styles.headerTitle}>Advanced Search</Text>
              <Text style={styles.headerSubtitle}>Find your perfect match</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Search by Profile ID Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <LinearGradient colors={['#8B5CF6', '#6366F1']} style={styles.sectionIcon}>
              <Ionicons name="finger-print" size={20} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.sectionTitle}>Search by Profile ID</Text>
          </View>
          <View style={styles.searchByIdRow}>
            <View style={[styles.inputContainer, { flex: 1 }]}>
              <View style={styles.inputIconContainer}>
                <Ionicons name="key" size={18} color="#8B5CF6" />
              </View>
              <TextInput
                testID="search-profile-id-input"
                style={styles.input}
                placeholder="e.g. GSJM00234"
                placeholderTextColor="#9CA3AF"
                value={profileId}
                onChangeText={setProfileId}
                autoCapitalize="characters"
                autoCorrect={false}
                // Not "numeric". The ID people read off a profile starts with
                // letters, and a digits-only keypad cannot type it.
                keyboardType="default"
              />
            </View>
            <TouchableOpacity testID="search-by-id-btn" onPress={handleSearchById} activeOpacity={0.8}>
              <LinearGradient
                colors={['#EC4899', '#F43F5E']}
                style={styles.searchIdButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="search" size={22} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Filter Profiles Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <LinearGradient colors={['#EC4899', '#F43F5E']} style={styles.sectionIcon}>
              <Ionicons name="filter" size={20} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.sectionTitle}>Filter Profiles</Text>
          </View>

          {/* Age Range */}
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Label text="Age From" />
              <SearchInput icon="calendar" placeholder="18" value={ageFrom} onChangeText={setAgeFrom} keyboardType="numeric" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Label text="Age To" />
              <SearchInput icon="calendar" placeholder="35" value={ageTo} onChangeText={setAgeTo} keyboardType="numeric" />
            </View>
          </View>

          {/* Height Range */}
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Label text="Height From (ft)" />
              <SearchInput icon="resize" placeholder="5.0" value={heightFrom} onChangeText={setHeightFrom} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Label text="Height To (ft)" />
              <SearchInput icon="resize" placeholder="6.0" value={heightTo} onChangeText={setHeightTo} />
            </View>
          </View>

          <Label text="Marital Status" />
          <SearchPicker icon="heart" selectedValue={maritalStatus} onValueChange={setMaritalStatus}
            items={[{ label: 'Any', value: '' }, { label: 'Never Married', value: 'Never Married' }, { label: 'Divorced', value: 'Divorced' }, { label: 'Widowed', value: 'Widowed' }]}
          />

          <Label text="State" />
          <SearchInput icon="map" placeholder="Enter state" value={state} onChangeText={setState} />

          <Label text="City" />
          <SearchInput icon="location" placeholder="Enter city" value={city} onChangeText={setCity} />

          <Label text="Education" />
          <SearchInput icon="school" placeholder="B.Tech, MBA, etc." value={education} onChangeText={setEducation} />

          <Label text="Profession" />
          <SearchInput icon="briefcase" placeholder="Engineer, Doctor, etc." value={profession} onChangeText={setProfession} />

          <Label text="Annual Income" />
          <SearchPicker icon="cash" selectedValue={annualIncome} onValueChange={setAnnualIncome}
            items={[{ label: 'Any', value: '' }, { label: '0-5 lakh', value: '0-5 lakh' }, { label: '5-10 lakh', value: '5-10 lakh' }, { label: '10-15 lakh', value: '10-15 lakh' }, { label: '15-20 lakh', value: '15-20 lakh' }, { label: '20-30 lakh', value: '20-30 lakh' }, { label: '30+ lakh', value: '30+ lakh' }]}
          />

          <Label text="Manglik" />
          <SearchPicker icon="planet" selectedValue={manglik} onValueChange={setManglik}
            items={[{ label: 'Any', value: '' }, { label: 'Yes', value: 'Yes' }, { label: 'No', value: 'No' }, { label: 'Partial', value: 'Partial' }]}
          />

          <Label text="Mother Tongue" />
          <SearchInput icon="language" placeholder="Hindi, English, etc." value={motherTongue} onChangeText={setMotherTongue} />

          <Label text="Diet" />
          <SearchPicker icon="restaurant" selectedValue={diet} onValueChange={setDiet}
            items={[{ label: 'Any', value: '' }, { label: 'Vegetarian', value: 'Vegetarian' }, { label: 'Non-Vegetarian', value: 'Non-Vegetarian' }, { label: 'Eggetarian', value: 'Eggetarian' }]}
          />

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity testID="search-reset-btn" style={styles.resetButton} onPress={handleReset} activeOpacity={0.8}>
              <Ionicons name="refresh" size={20} color="#6366F1" />
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>

            <TouchableOpacity
              testID="search-submit-btn"
              style={styles.searchButtonWrapper}
              onPress={handleAdvancedSearch}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#EC4899', '#F43F5E']}
                style={[styles.searchMainButton, loading && styles.buttonDisabled]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="search" size={22} color="#FFFFFF" />
                <Text style={styles.searchMainButtonText}>
                  {loading ? 'Searching...' : 'Search Profiles'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  headerTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  headerIcon: {
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  iconGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  sectionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  searchByIdRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  searchIdButton: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 6,
    marginTop: 14,
  },
  inputContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputIconContainer: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1F2937',
  },
  pickerWrapper: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  pickerIconContainer: {
    marginRight: 6,
  },
  pickerContainer: {
    flex: 1,
  },
  picker: {
    height: 50,
    color: '#1F2937',
  },
  row: {
    flexDirection: 'row',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  resetButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#6366F1',
    backgroundColor: '#FFFFFF',
  },
  resetButtonText: {
    color: '#6366F1',
    fontSize: 16,
    fontWeight: 'bold',
  },
  searchButtonWrapper: {
    flex: 2,
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  searchMainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
  },
  searchMainButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
