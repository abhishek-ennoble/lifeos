import { useMemo } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import { EntryCard } from '@/components/EntryCard';
import { DOMAINS, type Domain, type LifeArea } from '@/constants/domains';
import { useEntries } from '@/hooks/useEntries';
import { useTheme } from '@/hooks/useTheme';

interface InboxListProps {
  /** Restrict to a single domain, or null for all. */
  activeDomain: Domain | null;
  /** Restrict to a single life-area tag, or null for all. */
  activeLifeArea: LifeArea | null;
  header?: React.ReactElement;
}

/**
 * Generalized, filterable entry list (replaces the old per-domain DomainScreen).
 * Reads all non-archived entries and filters client-side by domain + life-area.
 */
export function InboxList({ activeDomain, activeLifeArea, header }: InboxListProps) {
  const { colors } = useTheme();
  const { entries, loading, error, updateEntryStatus, deleteEntry, logLearningSession } =
    useEntries();

  const filtered = useMemo(() => {
    return entries.filter((entry) => {
      if (activeDomain && entry.domain !== activeDomain) {
        return false;
      }
      if (activeLifeArea) {
        const lifeArea = (entry.metadata as { life_area?: string } | null)?.life_area;
        if (lifeArea !== activeLifeArea) {
          return false;
        }
      }
      return true;
    });
  }, [entries, activeDomain, activeLifeArea]);

  return (
    <FlatList
      data={filtered}
      keyExtractor={(item) => item.id}
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
            Nothing here yet. Capture something from Home.
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
