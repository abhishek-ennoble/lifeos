import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { EntryCard } from '@/components/EntryCard';
import { useAntiEntropy } from '@/hooks/useChat';
import { useEntries } from '@/hooks/useEntries';
import { useTheme } from '@/hooks/useTheme';

export default function AntiEntropyScreen() {
  const { colors, typography, radius } = useTheme();
  const { staleEntries, staleCount, loading, refresh } = useAntiEntropy();
  const { updateEntryStatus, deleteEntry } = useEntries();

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[typography.title, { color: colors.textPrimary }]}>Gentle review</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {loading
          ? 'Loading…'
          : staleCount === 0
            ? 'Nothing has drifted. Lovely.'
            : `${staleCount} ${staleCount === 1 ? 'thing has' : 'things have'} been still for a while. Keep, finish, or let go — no rush.`}
      </Text>

      <FlatList
        data={staleEntries}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <EntryCard
            entry={item}
            onDone={(id) => void updateEntryStatus(id, 'done').then(refresh)}
            onDelete={(id) => void deleteEntry(id).then(refresh)}
          />
        )}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.textSecondary }]}>
            Nothing stale — you&apos;re on top of things.
          </Text>
        }
        contentContainerStyle={styles.list}
      />

      <Pressable
        style={[styles.refreshButton, { backgroundColor: colors.primary, borderRadius: radius.md }]}
        onPress={() => void refresh()}>
        <Text style={[styles.refreshText, { color: colors.primaryContrast }]}>Refresh</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 4,
    marginBottom: 16,
  },
  list: {
    paddingBottom: 80,
  },
  empty: {
    textAlign: 'center',
    marginTop: 40,
  },
  refreshButton: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    padding: 14,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  refreshText: {
    fontWeight: '600',
  },
});
