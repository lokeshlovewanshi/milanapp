import { memo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import AvatarFallback from './AvatarFallback';
import { useReference } from '../utils/useReference';
import { connectionAction, type ConnectionState } from '../utils/useConnections';
import {
  colors,
  font,
  radius,
  spacing,
  profileId,
  profileName,
  profileImage,
  profileHeadline,
  profileHighlights,
  type Profile,
  auth,
} from './theme';

type Props = {
  /** Section heading, e.g. "Recently visited your profile". */
  title: string;
  profiles: Profile[];
  stateOf: (id: string | number | undefined | null) => ConnectionState;
  onConnect: (id: string | number) => void;
  onPressProfile: (id: string | number) => void;
  onSeeAll: () => void;
};

/**
 * A horizontal rail of profiles inside the feed - recent visitors, newest
 * members - each card carrying the same facts a feed card leads with.
 *
 * The heading is a prop because the shape is identical wherever it appears and
 * only the reason for the list differs. Two components would drift: one would
 * get the label fix or the equal-height fix and the other would not.
 *
 * A rail rather than rows because this is a prompt, not a destination: it sits
 * inside the feed and should cost a swipe to skim and nothing to ignore. "See
 * all" goes to the full screen for anyone who wants to work through them.
 *
 * The details are deliberately the feed's own helpers rather than a second
 * opinion about what matters on a profile. Someone deciding whether to connect
 * wants the same things here as there, and two lists that drift apart is how
 * the same person ends up described differently on two screens.
 */
function SuggestionRail({
  title,
  profiles,
  stateOf,
  onConnect,
  onPressProfile,
  onSeeAll,
}: Props) {
  const { width } = useWindowDimensions();

  // Resolved here rather than taken as a prop. As a prop it was optional, home
  // never passed one, and the cards rendered raw lookup codes - "56_H" where
  // the feed card directly below said the readable value. ProfileFeedCard calls
  // this hook itself for exactly this reason; a rail that has to be handed its
  // labels is a rail that will eventually be rendered without them.
  const { label } = useReference();

  // Dismissed here rather than on the server: hiding a suggestion is a "not
  // now", and spending a request plus a table on it would be more machinery
  // than the gesture deserves. It comes back next launch, which is the same
  // thing every other app does with this control.
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = profiles.filter((p) => !dismissed.has(String(profileId(p))));
  if (visible.length === 0) return null;

  // Just under half the screen, so the next card always peeks - that edge is
  // the only thing telling you the rail scrolls.
  const cardWidth = Math.min(Math.max(width * 0.62, 200), 260);

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.heading} numberOfLines={1}>
          {title}
        </Text>
        <TouchableOpacity onPress={onSeeAll} hitSlop={8} accessibilityRole="button">
          <Text style={styles.seeAll}>See all</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
      >
        {visible.map((profile, index) => {
          const id = profileId(profile);
          const key = String(id ?? index);
          const uri = profileImage(profile);
          // connectionAction rather than a second opinion about what the
          // button says: the feed card already uses it, and a rail that called
          // the same state "Requested" while the card below said "Withdraw"
          // would be two answers to one question.
          const action = connectionAction(stateOf(id));
          const highlights = profileHighlights(profile, label);

          return (
            <View key={key} style={[styles.card, { width: cardWidth }]}>
              <TouchableOpacity
                style={styles.dismiss}
                hitSlop={8}
                onPress={() => setDismissed((prev) => new Set(prev).add(key))}
                accessibilityRole="button"
                accessibilityLabel={`Dismiss ${profileName(profile)}`}
              >
                <Ionicons name="close" size={16} color={colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => id != null && onPressProfile(id)}
                style={styles.cardBody}
              >
                {uri ? (
                  <Image source={{ uri }} style={styles.avatar} contentFit="cover" contentPosition="top" />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <AvatarFallback profile={profile} glyphSize={34} />
                  </View>
                )}

                <Text style={styles.name} numberOfLines={1}>
                  {profileName(profile)}
                </Text>

                <Text style={styles.headline} numberOfLines={1}>
                  {profileHeadline(profile, label)}
                </Text>

                {/* Two lines at most. A card that grows with whoever filled in
                    the most fields makes the rail ragged, and the rest is a tap
                    away on the profile itself. */}
                {highlights.slice(0, 2).map((line, i) => (
                  <Text key={i} style={styles.detail} numberOfLines={1}>
                    {line}
                  </Text>
                ))}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.connect, action.variant === 'muted' && styles.connectMuted]}
                activeOpacity={0.85}
                disabled={action.disabled}
                onPress={() => id != null && onConnect(id)}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.connectText,
                    action.variant === 'muted' && styles.connectTextMuted,
                  ]}
                >
                  {action.label}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: spacing.md, paddingBottom: spacing.sm },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  heading: { fontSize: font.body, fontWeight: '700', color: colors.text },
  seeAll: { fontSize: font.small, fontWeight: '600', color: colors.link },

  // alignItems: 'stretch' is what makes every card as tall as the tallest one.
  // Without it each card sizes to its own content, so a profile that filled in
  // two fewer lines got a Connect button floating half way up the rail while
  // its neighbours' sat at the bottom.
  list: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
    paddingVertical: 2,
    alignItems: 'stretch',
  },
  card: {
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.md,
    backgroundColor: colors.elevated,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    alignItems: 'center',
  },
  dismiss: { position: 'absolute', top: 6, right: 6, padding: 4, zIndex: 1 },
  // flex: 1 absorbs the leftover height, which is what pins Connect to the
  // bottom of every card rather than leaving it directly under the last line.
  cardBody: { flex: 1, alignItems: 'center', width: '100%' },

  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.surface },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },

  name: {
    fontSize: font.body,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  headline: {
    fontSize: font.small,
    color: colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  detail: {
    fontSize: font.small,
    color: colors.textFaint,
    marginTop: 1,
    textAlign: 'center',
  },

  connect: {
    width: '100%',
    marginTop: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: auth.crimsonLight,
    paddingVertical: 9,
    alignItems: 'center',
  },
  connectMuted: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  connectText: { fontSize: font.small, fontWeight: '700', color: colors.white },
  connectTextMuted: { color: colors.text },
});

export default memo(SuggestionRail);
