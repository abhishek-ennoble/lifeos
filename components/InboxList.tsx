import { useMemo, useRef, useEffect } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import { EntryCard } from '@/components/EntryCard';
import { DOMAINS, type Domain, type LifeArea } from '@/constants/domains';
import { useEntries } from '@/hooks/useEntries';
import { useTheme } from '@/hooks/useTheme';
import { getIdeaThread } from '@/lib/idea-threads';
import {
  entryMatchesInboxFilters,
  sortInboxEntries,
  type InboxFilters,
  type InboxSortMode,
} from '@/lib/inbox-query';
import type { Entry } from '@/types/entry';

interface InboxListProps {
  /** Restrict to a single domain, or null for all. */
  activeDomain: Domain | null;
  /** Restrict to a single life-area tag, or null for all. */
  activeLifeArea: LifeArea | null;
  /** When filtering ideas, restrict to a named thread. */
  activeIdeaThread?: string | null;
  sortMode: InboxSortMode;
  filters: InboxFilters;
  /** Scroll to and highlight this entry (e.g. from notification tap). */
  highlightEntryId?: string | null;
  header?: React.ReactElement;
}

/**
 * Generalized, filterable entry list (replaces the old per-domain DomainScreen).
 * Reads all non-archived entries and filters client-side by domain + life-area.
 */
export function InboxList({
  activeDomain,
  activeLifeArea,
  activeIdeaThread,
  sortMode,
  filters,
  highlightEntryId,
  header,
}: InboxListProps) {
  const { colors } = useTheme();
  const { entries, loading, error, updateEntryStatus, deleteEntry, logLearningSession } =
    useEntries();
  const listRef = useRef<FlatList<Entry>>(null);

  const filtered = useMemo(() => {
    const matched = entries.filter((entry) => {
      if (activeDomain && entry.domain !== activeDomain) {
        return false;
      }
      if (activeLifeArea) {
        const lifeArea = (entry.metadata as { life_area?: string } | null)?.life_area;
        if (lifeArea !== activeLifeArea) {
          return false;
        }
      }
      if (activeIdeaThread) {
        if (entry.domain !== DOMAINS.IDEA) {
          return false;
        }
        if (getIdeaThread(entry) !== activeIdeaThread) {
          return false;
        }
      }
      if (!entryMatchesInboxFilters(entry, filters)) {
        return false;
      }
      return true;
    });

    return sortInboxEntries(matched, sortMode);
  }, [entries, activeDomain, activeLifeArea, activeIdeaThread, sortMode, filters]);

  useEffect(() => {
    if (!highlightEntryId || filtered.length === 0) {
      return;
    }
    const index = filtered.findIndex((entry) => entry.id === highlightEntryId);
    if (index >= 0) {
      setTimeout(() => {
        listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.3 });
      }, 300);
    }
  }, [filtered, highlightEntryId]);

  return (
    <FlatList
      ref={listRef}
      data={filtered}
      keyExtractor={(item) => item.id}
      onScrollToIndexFailed={(info) => {
        setTimeout(() => {
          listRef.current?.scrollToIndex({ index: info.index, animated: true });
        }, 100);
      }}
      ListHeaderComponent={
        <View>
          {header}
          {loading ? <ActivityIndicator style={styles.loader} color={colors.primary} /> : null}
          {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
        </View>
      }
      renderItem={({ item }) => (
        <EntryCard
          entry={item}
          highlighted={highlightEntryId === item.id}
          onDone={(id) => void updateEntryStatus(id, 'done')}
          onDelete={deleteEntry}
          onLogSession={
            item.domain === DOMAINS.LEARNING
              ? (id) => void logLearningSession(id, 4)
              : undefined
          }
        />
      )}
      ListEmptyComponent={
        !loading ? (
          <Text style={[styles.empty, { color: colors.textSecondary }]}>
            {entries.length > 0
              ? 'No entries match your filters.'
              : 'Nothing here yet. Capture something from Home.'}
          </Text>
        ) : null
      }
      contentContainerStyle={styles.listContent}
      keyboardShouldPersistTaps="handled"
    />
  );
}

const styles = StyleSheet.create({
  loader: {
    marginTop: 16,
  },
  error: {
    marginTop: 8,
  },
  empty: {
    textAlign: 'center',
    marginTop: 32,
    fontSize: 15,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    flexGrow: 1,
  },
});
