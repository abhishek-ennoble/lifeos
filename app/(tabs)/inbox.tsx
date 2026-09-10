import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { InboxFiltersModal } from '@/components/InboxFiltersModal';
import { InboxList } from '@/components/InboxList';
import {
  ALL_LIFE_AREAS,
  BROWSABLE_DOMAINS,
  DOMAINS,
  DOMAIN_LABELS,
  LIFE_AREA_LABELS,
  type Domain,
  type LifeArea,
} from '@/constants/domains';
import { useEntries } from '@/hooks/useEntries';
import { useSettings } from '@/hooks/useSettings';
import { useTheme } from '@/hooks/useTheme';
import { collectIdeaThreads } from '@/lib/idea-threads';
import {
  countActiveInboxFilters,
  DEFAULT_INBOX_FILTERS,
  INBOX_SORT_LABELS,
  type InboxSortMode,
} from '@/lib/inbox-query';

const SORT_MODES: InboxSortMode[] = ['newest', 'oldest', 'due_soonest', 'priority'];

export default function InboxScreen() {
  const { colors, typography, radius } = useTheme();
  const { entries } = useEntries();
  const { settings, updateSettings } = useSettings();
  const { highlightEntryId } = useLocalSearchParams<{ highlightEntryId?: string }>();
  const [activeDomain, setActiveDomain] = useState<Domain | null>(null);
  const [activeLifeArea, setActiveLifeArea] = useState<LifeArea | null>(null);
  const [activeIdeaThread, setActiveIdeaThread] = useState<string | null>(null);
  const [filtersVisible, setFiltersVisible] = useState(false);

  const activeFilterCount = countActiveInboxFilters(settings.inboxFilters);

  const ideaThreads = useMemo(() => {
    const ideas = entries.filter((entry) => entry.domain === DOMAINS.IDEA);
    return collectIdeaThreads(ideas);
  }, [entries]);

  const showIdeaThreads =
    activeDomain === DOMAINS.IDEA || (activeDomain === null && ideaThreads.length > 0);

  const header = (
    <View style={styles.header}>
      <Text style={[typography.display, { color: colors.textPrimary }]}>Inbox</Text>
      <Text style={[styles.hint, { color: colors.textSecondary }]}>Everything, in one place.</Text>

      <View style={styles.toolbar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sortRow}>
          {SORT_MODES.map((mode) => (
            <Chip
              key={mode}
              label={INBOX_SORT_LABELS[mode]}
              active={settings.inboxSort === mode}
              color={colors.primary}
              textColor={colors.textSecondary}
              activeText={colors.primaryContrast}
              border={colors.border}
              radius={radius.pill}
              onPress={() => void updateSettings({ inboxSort: mode })}
            />
          ))}
        </ScrollView>
        <Pressable
          onPress={() => setFiltersVisible(true)}
          style={[
            styles.filtersButton,
            {
              borderColor: activeFilterCount > 0 ? colors.primary : colors.border,
              borderRadius: radius.pill,
            },
          ]}>
          <Text
            style={[
              styles.filtersText,
              { color: activeFilterCount > 0 ? colors.primary : colors.textSecondary },
            ]}>
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}>
        <Chip
          label="All"
          active={activeDomain === null}
          color={colors.primary}
          textColor={colors.textSecondary}
          activeText={colors.primaryContrast}
          border={colors.border}
          radius={radius.pill}
          onPress={() => {
            setActiveDomain(null);
            setActiveIdeaThread(null);
          }}
        />
        {BROWSABLE_DOMAINS.map((domain) => (
          <Chip
            key={domain}
            label={DOMAIN_LABELS[domain]}
            active={activeDomain === domain}
            color={colors.domain[domain]}
            textColor={colors.textSecondary}
            activeText={colors.primaryContrast}
            border={colors.border}
            radius={radius.pill}
            onPress={() => {
              const next = activeDomain === domain ? null : domain;
              setActiveDomain(next);
              if (next !== DOMAINS.IDEA) {
                setActiveIdeaThread(null);
              }
            }}
          />
        ))}
      </ScrollView>

      {showIdeaThreads && ideaThreads.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}>
          <Chip
            label="All threads"
            active={activeIdeaThread === null}
            color={colors.domain[DOMAINS.IDEA]}
            textColor={colors.textSecondary}
            activeText={colors.primaryContrast}
            border={colors.border}
            radius={radius.pill}
            onPress={() => setActiveIdeaThread(null)}
          />
          {ideaThreads.map((thread) => (
            <Chip
              key={thread}
              label={thread}
              active={activeIdeaThread === thread}
              color={colors.domain[DOMAINS.IDEA]}
              textColor={colors.textSecondary}
              activeText={colors.primaryContrast}
              border={colors.border}
              radius={radius.pill}
              onPress={() => {
                setActiveDomain(DOMAINS.IDEA);
                setActiveIdeaThread(activeIdeaThread === thread ? null : thread);
              }}
            />
          ))}
        </ScrollView>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}>
        {ALL_LIFE_AREAS.map((area) => (
          <Chip
            key={area}
            label={LIFE_AREA_LABELS[area]}
            active={activeLifeArea === area}
            color={colors.lifeArea[area]}
            textColor={colors.textSecondary}
            activeText={colors.primaryContrast}
            border={colors.border}
            radius={radius.pill}
            onPress={() => setActiveLifeArea(activeLifeArea === area ? null : area)}
          />
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <InboxList
        activeDomain={activeDomain}
        activeLifeArea={activeLifeArea}
        activeIdeaThread={activeIdeaThread}
        sortMode={settings.inboxSort}
        filters={settings.inboxFilters}
        highlightEntryId={highlightEntryId ?? null}
        header={header}
      />

      <InboxFiltersModal
        visible={filtersVisible}
        filters={settings.inboxFilters}
        onClose={() => setFiltersVisible(false)}
        onChange={(partial) =>
          void updateSettings({ inboxFilters: { ...settings.inboxFilters, ...partial } })
        }
        onReset={() => void updateSettings({ inboxFilters: DEFAULT_INBOX_FILTERS })}
      />
    </View>
  );
}

interface ChipProps {
  label: string;
  active: boolean;
  color: string;
  textColor: string;
  activeText: string;
  border: string;
  radius: number;
  onPress: () => void;
}

function Chip({ label, active, color, textColor, activeText, border, radius, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? color : 'transparent',
          borderColor: active ? color : border,
          borderRadius: radius,
        },
      ]}>
      <Text style={[styles.chipText, { color: active ? activeText : textColor }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    paddingTop: 12,
    paddingBottom: 8,
  },
  hint: {
    fontSize: 14,
    marginTop: 4,
    marginBottom: 12,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sortRow: {
    gap: 8,
    paddingVertical: 6,
    paddingRight: 4,
    flexGrow: 1,
  },
  filtersButton: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: 'center',
  },
  filtersText: {
    fontSize: 13,
    fontWeight: '600',
  },
  chipRow: {
    gap: 8,
    paddingVertical: 6,
    paddingRight: 8,
  },
  chip: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
