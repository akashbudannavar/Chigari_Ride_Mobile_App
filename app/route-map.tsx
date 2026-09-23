import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  TextInput,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  Search,
  X,
  MapPin,
  Route as RouteIcon,
  Sparkles,
  ChevronDown,
  Navigation,
  ArrowDown,
  Building2,
  Train,
} from 'lucide-react-native';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/ui/Text';
import { Colors, FontFamily, Spacing, Radius, Shadows } from '@/constants/theme';
import { useLanguage } from '@/contexts/LanguageContext';

export interface RouteStop {
  number: number;
  name: string;
  section: 'Dharwad' | 'Central Corridor' | 'Hubballi';
  isMajorTerminal?: boolean;
  typeBadge?: string;
  tagline?: string;
}

export const CHIGARI_ROUTE_STOPS: RouteStop[] = [
  // ─── DHARWAD SECTION (1 - 13) ───
  {
    number: 1,
    name: 'Dharwad New Bus Stand',
    section: 'Dharwad',
    isMajorTerminal: true,
    typeBadge: 'Terminal',
    tagline: 'Northern Terminus (Services 201B, 100D, 202C)',
  },
  {
    number: 2,
    name: 'Dharwad BRTS Terminal',
    section: 'Dharwad',
    isMajorTerminal: true,
    typeBadge: 'BRTS Hub',
    tagline: 'Main City BRTS Terminus (Service 200A)',
  },
  {
    number: 3,
    name: 'Jubilee Circle',
    section: 'Dharwad',
    typeBadge: 'Key Junction',
    tagline: 'Commercial District & Key Junction',
  },
  {
    number: 4,
    name: 'Dharwad Court Circle',
    section: 'Dharwad',
    tagline: 'District Courts & Administrative Complex',
  },
  {
    number: 5,
    name: 'NTTF',
    section: 'Dharwad',
    tagline: 'Nettur Technical Training Foundation',
  },
  {
    number: 6,
    name: 'Hosayellapur',
    section: 'Dharwad',
    tagline: 'Residential & Market Access',
  },
  {
    number: 7,
    name: 'Tollnaka',
    section: 'Dharwad',
    tagline: 'Old Toll Junction & Transit Stop',
  },
  {
    number: 8,
    name: 'Vidyagiri',
    section: 'Dharwad',
    isMajorTerminal: false,
    typeBadge: 'Education Hub',
    tagline: 'JSS Institutions & University Access',
  },
  {
    number: 9,
    name: 'Gandhinagar',
    section: 'Dharwad',
    tagline: 'Residential Suburb',
  },
  {
    number: 10,
    name: 'Lakamanahalli',
    section: 'Dharwad',
    tagline: 'Industrial Area & Residential Sector',
  },
  {
    number: 11,
    name: 'Navalur',
    section: 'Dharwad',
    tagline: 'Suburban Enclave & Industrial Corridor',
  },
  {
    number: 12,
    name: 'Sattur',
    section: 'Dharwad',
    tagline: 'Sattur Colony & Highway Node',
  },
  {
    number: 13,
    name: 'SDM Medical College',
    section: 'Dharwad',
    isMajorTerminal: false,
    typeBadge: 'Healthcare',
    tagline: 'SDM Hospital & Healthcare Campus',
  },

  // ─── CENTRAL CORRIDOR (14 - 30) ───
  {
    number: 14,
    name: 'Navalur Railway Station',
    section: 'Central Corridor',
    typeBadge: 'Railway Link',
    tagline: 'Suburban Rail Transit Interchange',
  },
  {
    number: 15,
    name: 'KMF 1',
    section: 'Central Corridor',
    tagline: 'Karnataka Milk Federation Dairy Center',
  },
  {
    number: 16,
    name: 'Rayapur',
    section: 'Central Corridor',
    isMajorTerminal: false,
    typeBadge: 'BRTS Depot',
    tagline: 'BRTS Control Depot & Corridor Center',
  },
  {
    number: 17,
    name: 'ISKCON',
    section: 'Central Corridor',
    tagline: 'Spiritual Center & Pilgrimage Node',
  },
  {
    number: 18,
    name: 'RTO',
    section: 'Central Corridor',
    tagline: 'Regional Transport Office & Testing Track',
  },
  {
    number: 19,
    name: 'Navanagar',
    section: 'Central Corridor',
    isMajorTerminal: false,
    typeBadge: 'Sub-Hub',
    tagline: 'Major Residential Township & Civic Hub',
  },
  {
    number: 20,
    name: 'APMC 3rd Gate',
    section: 'Central Corridor',
    tagline: 'Agricultural Produce Market Access',
  },
  {
    number: 21,
    name: 'Shantiniketan',
    section: 'Central Corridor',
    tagline: 'Residential Sector',
  },
  {
    number: 22,
    name: 'Bairidevarkoppa',
    section: 'Central Corridor',
    tagline: 'Transit Village & Outer Enclave',
  },
  {
    number: 23,
    name: 'Unkal Lake',
    section: 'Central Corridor',
    typeBadge: 'Scenic Landmark',
    tagline: 'Lake Promenade & Tourism Destination',
  },
  {
    number: 24,
    name: 'Unkal',
    section: 'Central Corridor',
    tagline: 'Historic Settlement & Local Market',
  },
  {
    number: 25,
    name: 'Unkal Cross',
    section: 'Central Corridor',
    tagline: 'Commercial Corridor Gateway',
  },
  {
    number: 26,
    name: 'BVB',
    section: 'Central Corridor',
    isMajorTerminal: false,
    typeBadge: 'Tech Campus',
    tagline: 'KLE Technological University Campus',
  },
  {
    number: 27,
    name: 'Vidyanagar',
    section: 'Central Corridor',
    typeBadge: 'Commercial Hub',
    tagline: 'Heart of Modern Hubballi Commercial Zone',
  },
  {
    number: 28,
    name: 'KIMS',
    section: 'Central Corridor',
    isMajorTerminal: false,
    typeBadge: 'Medical Center',
    tagline: 'Karnataka Institute of Medical Sciences',
  },
  {
    number: 29,
    name: 'Hosur Regional Bus Station',
    section: 'Central Corridor',
    isMajorTerminal: true,
    typeBadge: 'Transit Hub',
    tagline: 'Major Feeder Interchange & Express Hub',
  },
  {
    number: 30,
    name: 'Hosur Cross',
    section: 'Central Corridor',
    typeBadge: 'Branch Junction',
    tagline: 'Key Junction for Gokul Branch (202C)',
  },

  // ─── HUBBALLI SECTION & BRANCHES (31 - 36) ───
  {
    number: 31,
    name: 'Gokul Bus Station',
    section: 'Hubballi',
    isMajorTerminal: true,
    typeBadge: 'Branch Terminal',
    tagline: 'Southern Terminus for Service 202C (Gokul Road)',
  },
  {
    number: 32,
    name: 'Hubballi Central Bus Stand / Rani Channamma Circle',
    section: 'Hubballi',
    isMajorTerminal: true,
    typeBadge: 'CBD Hub',
    tagline: 'Historic City Center & Commercial Node',
  },
  {
    number: 33,
    name: 'HDMC',
    section: 'Hubballi',
    tagline: 'Municipal Corporation Headquarters',
  },
  {
    number: 34,
    name: 'Dr. B R Ambedkar Circle',
    section: 'Hubballi',
    typeBadge: 'Branch Junction',
    tagline: 'Central Junction for Railway Station & CBT',
  },
  {
    number: 35,
    name: 'Hubballi CBT',
    section: 'Hubballi',
    isMajorTerminal: true,
    typeBadge: 'CBT Terminal',
    tagline: 'Main City Bus Terminus (Service 200A Terminus)',
  },
  {
    number: 36,
    name: 'Hubballi Railway Station',
    section: 'Hubballi',
    isMajorTerminal: true,
    typeBadge: 'Railway Hub',
    tagline: 'SSS Hubballi Junction (Services 201B & 100D Terminus)',
  },
];

export default function RouteMapScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSection, setSelectedSection] = useState<'All' | 'Dharwad' | 'Central Corridor' | 'Hubballi'>('All');

  const triggerHaptic = (style = Haptics.ImpactFeedbackStyle.Light) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(style);
    }
  };

  const handleBack = () => {
    triggerHaptic();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const filteredStops = useMemo(() => {
    return CHIGARI_ROUTE_STOPS.filter((stop) => {
      const matchesSection = selectedSection === 'All' || stop.section === selectedSection;
      const matchesQuery =
        !searchQuery.trim() ||
        stop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stop.number.toString() === searchQuery.trim() ||
        (stop.tagline && stop.tagline.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesSection && matchesQuery;
    });
  }, [searchQuery, selectedSection]);

  // Group stops by section for systematic layout when viewing All or filtered
  const sections = useMemo(() => {
    const list: { title: string; stops: RouteStop[]; color: string; badge: string }[] = [];
    const dharwad = filteredStops.filter((s) => s.section === 'Dharwad');
    const central = filteredStops.filter((s) => s.section === 'Central Corridor');
    const hubballi = filteredStops.filter((s) => s.section === 'Hubballi');

    if (dharwad.length > 0) {
      list.push({
        title: t('routeMap.dharwadSection'),
        stops: dharwad,
        color: '#15803D',
        badge: `1 – 13 ${t('routeMap.stops')}`,
      });
    }
    if (central.length > 0) {
      list.push({
        title: t('routeMap.centralCorridor'),
        stops: central,
        color: '#0284C7',
        badge: `14 – 30 ${t('routeMap.stops')}`,
      });
    }
    if (hubballi.length > 0) {
      list.push({
        title: t('routeMap.hubballiSection'),
        stops: hubballi,
        color: '#7C3AED',
        badge: `31 – 36 ${t('routeMap.stops')}`,
      });
    }
    return list;
  }, [filteredStops, t]);

  return (
    <Screen backgroundColor={Colors.background} safeAreaTop={false} safeAreaBottom={false}>
      {/* ─── Top Header Bar ─── */}
      <View style={[styles.headerBar, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          onPress={handleBack}
          accessibilityLabel="Back"
          accessibilityRole="button"
        >
          <ArrowLeft size={22} color={Colors.textPrimary} strokeWidth={2.4} />
        </Pressable>

        <View style={styles.headerTitles}>
          <Text style={styles.headerTitle}>{t('routeMap.title')}</Text>
          <Text style={styles.headerSubtitle}>{t('routeMap.subtitle')}</Text>
        </View>

        <View style={styles.headerRightBadge}>
          <Text style={styles.headerRightBadgeText}>{`${CHIGARI_ROUTE_STOPS.length} ${t('routeMap.stops')}`}</Text>
        </View>
      </View>

      {/* ─── Search & Corridor Overview Bar ─── */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={18} color="#64748B" strokeWidth={2.2} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('routeMap.searchPlaceholder')}
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <Pressable
              onPress={() => setSearchQuery('')}
              hitSlop={8}
            >
              <X size={16} color="#64748B" strokeWidth={2} />
            </Pressable>
          )}
        </View>

        {/* Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterPillsRow}
        >
          {(['All', 'Dharwad', 'Central Corridor', 'Hubballi'] as const).map((sec) => {
            const isSelected = selectedSection === sec;
            const label =
              sec === 'All'
                ? `${t('tickets.all')} (${CHIGARI_ROUTE_STOPS.length})`
                : sec === 'Dharwad'
                ? t('routeMap.dharwadSection')
                : sec === 'Central Corridor'
                ? t('routeMap.centralCorridor')
                : t('routeMap.hubballiSection');
            return (
              <Pressable
                key={sec}
                style={[
                  styles.filterPill,
                  isSelected && styles.filterPillActive,
                ]}
                onPress={() => {
                  triggerHaptic();
                  setSelectedSection(sec);
                }}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    isSelected && styles.filterPillTextActive,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ─── Visual Route Timeline ─── */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Route Corridor Status Header Banner */}
        <View style={styles.corridorBanner}>
          <View style={styles.corridorBadgeLeft}>
            <View style={styles.pulseDot} />
            <Text style={styles.corridorBadgeText}>HIGH SPEED BRTS CORRIDOR</Text>
          </View>
          <Text style={styles.corridorDistanceText}>29.5 km Connected Transit</Text>
        </View>

        {/* Section Groups */}
        {sections.map((sectionGroup, groupIdx) => (
          <View key={sectionGroup.title} style={styles.sectionGroupWrapper}>
            {/* Section Header Card */}
            <View style={[styles.sectionHeaderCard, { borderLeftColor: sectionGroup.color }]}>
              <View style={styles.sectionHeaderLeft}>
                <Text style={[styles.sectionGroupTitle, { color: sectionGroup.color }]}>
                  {sectionGroup.title}
                </Text>
                <Text style={styles.sectionGroupSubtitle}>
                  {sectionGroup.title.includes('DHARWAD')
                    ? 'Northern City Zone & Educational Sector'
                    : sectionGroup.title.includes('CENTRAL')
                    ? 'High-Speed Express Highway Sector'
                    : 'Southern Metropolis & Commercial Center'}
                </Text>
              </View>
              <View style={[styles.sectionCountBadge, { backgroundColor: sectionGroup.color + '18' }]}>
                <Text style={[styles.sectionCountBadgeText, { color: sectionGroup.color }]}>
                  {sectionGroup.badge}
                </Text>
              </View>
            </View>

            {/* Timeline Stops inside Section */}
            <View style={styles.stopsTimelineContainer}>
              {sectionGroup.stops.map((stop, stopIdx) => {
                const isFirstOfAll = stop.number === 1;
                const isLastOfAll = stop.number === CHIGARI_ROUTE_STOPS.length;
                const isSectionLast = stopIdx === sectionGroup.stops.length - 1;
                const isVeryLastInView =
                  groupIdx === sections.length - 1 && isSectionLast;

                return (
                  <View key={stop.number} style={styles.stopTimelineRow}>
                    {/* Left Column: Line & Node Indicator */}
                    <View style={styles.timelineNodeCol}>
                      {/* Top connecting segment */}
                      <View
                        style={[
                          styles.timelineSegment,
                          {
                            backgroundColor:
                              isFirstOfAll && stopIdx === 0
                                ? 'transparent'
                                : '#15803D',
                          },
                        ]}
                      />

                      {/* Node circle */}
                      <View
                        style={[
                          styles.timelineNode,
                          stop.isMajorTerminal && styles.timelineNodeTerminal,
                          (isFirstOfAll || isLastOfAll) && styles.timelineNodeEndTerminus,
                        ]}
                      >
                        {stop.isMajorTerminal ? (
                          <View style={styles.innerTerminalDot} />
                        ) : (
                          <Text style={styles.nodeStopNumberText}>
                            {stop.number}
                          </Text>
                        )}
                      </View>

                      {/* Bottom connecting segment */}
                      <View
                        style={[
                          styles.timelineSegment,
                          {
                            backgroundColor: isVeryLastInView
                              ? 'transparent'
                              : '#15803D',
                          },
                        ]}
                      />
                    </View>

                    {/* Right Column: Stop Card */}
                    <View
                      style={[
                        styles.stopInfoCard,
                        stop.isMajorTerminal && styles.stopInfoCardMajor,
                        (isFirstOfAll || isLastOfAll) && styles.stopInfoCardTerminus,
                      ]}
                    >
                      <View style={styles.stopCardTop}>
                        <View style={styles.stopTitleWrapper}>
                          <View style={styles.stopNumberTag}>
                            <Text style={styles.stopNumberTagText}>
                              #{stop.number}
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.stopNameText,
                              stop.isMajorTerminal && styles.stopNameMajor,
                            ]}
                          >
                            {stop.name}
                          </Text>
                        </View>

                        {stop.typeBadge && (
                          <View
                            style={[
                              styles.stopTypeBadge,
                              stop.isMajorTerminal
                                ? styles.stopTypeBadgeTerminal
                                : styles.stopTypeBadgeNormal,
                            ]}
                          >
                            <Text
                              style={[
                                styles.stopTypeBadgeText,
                                stop.isMajorTerminal && styles.stopTypeBadgeTextTerminal,
                              ]}
                            >
                              {stop.typeBadge}
                            </Text>
                          </View>
                        )}
                      </View>

                      {stop.tagline && (
                        <Text style={styles.stopTaglineText}>
                          {stop.tagline}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        ))}

        {filteredStops.length === 0 && (
          <View style={styles.emptyStateContainer}>
            <MapPin size={36} color="#94A3B8" strokeWidth={1.8} />
            <Text style={styles.emptyStateTitle}>No stops found</Text>
            <Text style={styles.emptyStateSubtitle}>
              Try searching for &quot;CBT&quot;, &quot;Railway&quot;, &quot;Vidyanagar&quot;, or &quot;Navanagara&quot;
            </Text>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.low,
  },
  headerTitles: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: Spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: FontFamily.semiBold,
    color: '#15803D',
    marginTop: 1,
  },
  headerRightBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  headerRightBadgeText: {
    fontSize: 12,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: '#15803D',
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.background,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: Spacing.md,
    height: 44,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    gap: 8,
    ...Shadows.low,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: FontFamily.regular,
    color: '#1E293B',
    paddingVertical: 0,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: Spacing.sm,
    paddingBottom: 2,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
  },
  filterPillActive: {
    backgroundColor: '#15803D',
    borderColor: '#15803D',
  },
  filterPillText: {
    fontSize: 12,
    fontFamily: FontFamily.medium,
    fontWeight: '600',
    color: '#64748B',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
  },
  corridorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderWidth: 1.2,
    borderColor: '#BBF7D0',
    marginBottom: Spacing.base,
  },
  corridorBadgeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#15803D',
  },
  corridorBadgeText: {
    fontSize: 11,
    fontFamily: FontFamily.bold,
    fontWeight: '800',
    color: '#15803D',
    letterSpacing: 0.5,
  },
  corridorDistanceText: {
    fontSize: 12,
    fontFamily: FontFamily.medium,
    color: '#475569',
  },
  sectionGroupWrapper: {
    marginBottom: Spacing.lg,
  },
  sectionHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderLeftWidth: 4,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadows.low,
  },
  sectionHeaderLeft: {
    flex: 1,
  },
  sectionGroupTitle: {
    fontSize: 14,
    fontFamily: FontFamily.bold,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  sectionGroupSubtitle: {
    fontSize: 11,
    fontFamily: FontFamily.regular,
    color: '#64748B',
    marginTop: 1,
  },
  sectionCountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  sectionCountBadgeText: {
    fontSize: 11,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
  },
  stopsTimelineContainer: {
    paddingLeft: 4,
  },
  stopTimelineRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 64,
  },
  timelineNodeCol: {
    width: 38,
    alignItems: 'center',
  },
  timelineSegment: {
    width: 3.5,
    flex: 1,
    backgroundColor: '#15803D',
  },
  timelineNode: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#15803D',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  timelineNodeTerminal: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#15803D',
    borderColor: '#DCFCE7',
    borderWidth: 3,
    ...Shadows.low,
  },
  timelineNodeEndTerminus: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0F172A',
    borderColor: '#15803D',
    borderWidth: 3,
  },
  innerTerminalDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  nodeStopNumberText: {
    fontSize: 10,
    fontFamily: FontFamily.bold,
    fontWeight: '800',
    color: '#15803D',
  },
  stopInfoCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginLeft: 10,
    marginBottom: 8,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    ...Shadows.low,
  },
  stopInfoCardMajor: {
    borderColor: '#BBF7D0',
    backgroundColor: '#FAFCF8',
  },
  stopInfoCardTerminus: {
    borderColor: '#15803D',
    backgroundColor: '#F0FDF4',
  },
  stopCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  stopTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  stopNumberTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  stopNumberTagText: {
    fontSize: 11,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: '#475569',
  },
  stopNameText: {
    fontSize: 14.5,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  stopNameMajor: {
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: '#0F172A',
  },
  stopTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  stopTypeBadgeTerminal: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  stopTypeBadgeNormal: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stopTypeBadgeText: {
    fontSize: 10.5,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: '#64748B',
  },
  stopTypeBadgeTextTerminal: {
    color: '#15803D',
  },
  stopTaglineText: {
    fontSize: 11.5,
    fontFamily: FontFamily.regular,
    color: '#64748B',
    marginTop: 3,
    lineHeight: 16,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: '#475569',
  },
  emptyStateSubtitle: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    color: '#94A3B8',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  pressed: {
    opacity: 0.75,
  },
});
