import React from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Shimmer } from './Shimmer';

const { width } = Dimensions.get('window');
const PHOTO_ASPECT = 4 / 5;
const MEDIA_HEIGHT = Math.round(width / PHOTO_ASPECT);

export function StoriesSkeleton() {
  return (
    <View style={styles.storiesContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.storiesContent}
      >
        {[1, 2, 3, 4, 5, 6].map((key) => (
          <View key={`story-skel-${key}`} style={styles.storyItem}>
            <View style={styles.storyRing}>
              <Shimmer style={styles.storyAvatar} />
            </View>
            <Shimmer style={styles.storyText} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

export function PostSkeleton() {
  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <Shimmer style={styles.avatar} />
        <View style={styles.headerText}>
          <Shimmer style={styles.nameLine} />
          <Shimmer style={styles.codeLine} />
        </View>
        <Shimmer style={styles.dots} />
      </View>

      {/* Media Image */}
      <Shimmer style={styles.media} />

      {/* Action Row */}
      <View style={styles.actions}>
        <View style={styles.actionsLeft}>
          <Shimmer style={styles.actionIcon} />
          <Shimmer style={styles.actionIcon} />
          <Shimmer style={styles.actionIcon} />
        </View>
        <Shimmer style={styles.actionIcon} />
      </View>

      {/* Connect button row & Captions */}
      <View style={styles.body}>
        <View style={styles.connectRow}>
          <Shimmer style={styles.connectBtn} />
        </View>
        <Shimmer style={styles.captionLine1} />
        <Shimmer style={styles.captionLine2} />
        <Shimmer style={styles.captionLine3} />
      </View>
    </View>
  );
}

export default function FeedSkeleton() {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
    >
      {/* Top Stories Skeleton */}
      <StoriesSkeleton />

      {/* Banner Skeleton */}
      <View style={styles.bannerContainer}>
        <Shimmer style={styles.banner} />
      </View>

      {/* Suggested Rails Header Skeleton */}
      <View style={styles.railHeader}>
        <Shimmer style={styles.railTitle} />
        <Shimmer style={styles.railAction} />
      </View>

      {/* Feed Post Skeletons */}
      <PostSkeleton />
      <PostSkeleton />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 40,
    backgroundColor: '#FFFFFF',
  },

  // Stories
  storiesContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  storiesContent: {
    paddingHorizontal: 12,
    gap: 14,
  },
  storyItem: {
    alignItems: 'center',
    width: 68,
  },
  storyRing: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  storyAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  storyText: {
    width: 46,
    height: 9,
    borderRadius: 4,
  },

  // Banner
  bannerContainer: {
    paddingHorizontal: 14,
    marginTop: 10,
    marginBottom: 14,
  },
  banner: {
    width: '100%',
    height: 96,
    borderRadius: 14,
  },

  // Rail Header
  railHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  railTitle: {
    width: 140,
    height: 16,
    borderRadius: 4,
  },
  railAction: {
    width: 50,
    height: 14,
    borderRadius: 4,
  },

  // Post Card Skeleton
  card: {
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    borderBottomWidth: 8,
    borderBottomColor: '#F0F2F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  headerText: {
    flex: 1,
    gap: 5,
  },
  nameLine: {
    width: 120,
    height: 13,
    borderRadius: 4,
  },
  codeLine: {
    width: 75,
    height: 10,
    borderRadius: 4,
  },
  dots: {
    width: 20,
    height: 12,
    borderRadius: 6,
  },

  // Media
  media: {
    width: width,
    height: MEDIA_HEIGHT,
    backgroundColor: '#E5E7EB',
  },

  // Actions
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  actionsLeft: {
    flexDirection: 'row',
    gap: 14,
  },
  actionIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },

  // Body
  body: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  connectRow: {
    marginBottom: 10,
  },
  connectBtn: {
    width: 96,
    height: 30,
    borderRadius: 6,
  },
  captionLine1: {
    width: '60%',
    height: 12,
    borderRadius: 4,
    marginBottom: 6,
  },
  captionLine2: {
    width: '85%',
    height: 12,
    borderRadius: 4,
    marginBottom: 6,
  },
  captionLine3: {
    width: '40%',
    height: 11,
    borderRadius: 4,
  },
});
