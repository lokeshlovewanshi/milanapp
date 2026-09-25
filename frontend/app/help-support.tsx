import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Linking,
  Alert,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import { ticketAPI } from "../utils/api";
import { useGuardedRouter } from "../utils/useGuardedRouter";
import { auth, colors, font, spacing } from "../components/theme";

/**
 * Shown until the API answers, and kept as the fallback if it never does.
 *
 * The real values come from the server so that changing the support number is
 * a config change rather than a store release - but Help & Support is the one
 * screen that must never be blank, since it is where someone goes when
 * something else is already broken.
 */
const FALLBACK_PHONE = "7440814972";
const FALLBACK_EMAIL = "lovewanshisamaj@gmail.com";

/**
 * Contact details for the people running Lodha Milan.
 *
 * Both rows hand off to the phone's own apps rather than trying to send
 * anything from inside this one: `tel:` opens the dialer with the number
 * filled in, `mailto:` opens whichever mail client the member already uses and
 * is already signed into. That avoids needing SMTP credentials in the app, and
 * means a reply lands in a mailbox they actually read.
 *
 * A support page is also a Play Store expectation for this category - reviewers
 * look for a contact route, and members look for one before they trust a
 * matrimony platform with their family's details.
 */
export default function HelpSupportScreen() {
  const router = useGuardedRouter();
  const insets = useSafeAreaInsets();

  const [phone, setPhone] = useState(FALLBACK_PHONE);
  const [email, setEmail] = useState(FALLBACK_EMAIL);

  useEffect(() => {
    ticketAPI
      .contact()
      .then((res) => {
        if (res?.data?.phone) setPhone(res.data.phone);
        if (res?.data?.email) setEmail(res.data.email);
      })
      // Silent on purpose: the fallbacks above are already on screen, so a
      // failed fetch shows the old number rather than an error.
      .catch(() => {});
  }, []);

  const open = async (url: string, fallback: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      // Tablets and some emulators have no dialer or mail client at all, and
      // openURL simply throws. Showing the raw value means the member can
      // still copy it down rather than hitting a dead end.
      Alert.alert("Could not open", fallback);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.title}>Help &amp; Support</Text>
        <Text style={styles.subtitle}>
          Any question about your profile, a match, or your account - talk to us
          directly.
        </Text>

        <Text style={styles.sectionLabel}>Contact us</Text>

        <Pressable
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          onPress={() => open(`tel:${phone}`, phone)}
          accessibilityRole="button"
          accessibilityLabel={`Call ${phone}`}
        >
          <View style={styles.iconWrap}>
            <Ionicons name="call-outline" size={20} color={auth.iconRed} />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Call us</Text>
            <Text style={styles.rowValue}>{phone}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          onPress={() =>
            open(
              `mailto:${email}?subject=${encodeURIComponent("Lodha Milan - support")}`,
              email,
            )
          }
          accessibilityRole="button"
          accessibilityLabel={`Email ${email}`}
        >
          <View style={styles.iconWrap}>
            <Ionicons name="mail-outline" size={20} color={auth.iconRed} />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Email us</Text>
            <Text style={styles.rowValue}>{email}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
        </Pressable>

        <Text style={styles.sectionLabel}>Raise a query</Text>

        <Pressable
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          onPress={() => router.push("/support/new")}
          accessibilityRole="button"
          accessibilityLabel="Raise a query"
        >
          <View style={styles.iconWrap}>
            <Ionicons name="create-outline" size={20} color={auth.iconRed} />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Raise a query</Text>
            <Text style={styles.rowValue}>
              Tell us what's wrong and we'll follow up here
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          onPress={() => router.push("/support")}
          accessibilityRole="button"
          accessibilityLabel="My tickets"
        >
          <View style={styles.iconWrap}>
            <Ionicons
              name="chatbubbles-outline"
              size={20}
              color={auth.iconRed}
            />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>My Tickets</Text>
            <Text style={styles.rowValue}>
              See replies to queries you've raised
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
        </Pressable>

        <Text style={styles.footnote}>
          We usually reply within one working day.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  topBar: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  body: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  title: { fontSize: 26, fontWeight: "700", color: colors.text },
  subtitle: {
    fontSize: font.body,
    color: "#6B7280",
    marginTop: spacing.sm,
    lineHeight: 19,
  },
  sectionLabel: {
    fontSize: font.small,
    color: "#9CA3AF",
    marginTop: spacing.xl,
    marginBottom: spacing.xs,
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E4E4E4",
  },
  rowPressed: { opacity: 0.6 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FDECEE",
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: { flex: 1 },
  rowTitle: { fontSize: font.title, fontWeight: "600", color: colors.text },
  rowValue: { fontSize: font.body, color: "#6B7280", marginTop: 2 },
  footnote: {
    fontSize: font.small,
    color: colors.textFaint,
    marginTop: spacing.xl,
    textAlign: "center",
  },
});
