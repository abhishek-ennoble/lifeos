import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  ALL_LIFE_AREAS,
  BROWSABLE_DOMAINS,
  DOMAINS,
  DOMAIN_LABELS,
  LIFE_AREA_LABELS,
  type LifeArea,
} from '@/constants/domains';
import { useEntries } from '@/hooks/useEntries';
import { useTheme } from '@/hooks/useTheme';
import type { Entry } from '@/types/entry';

type Period = 'week' | 'month';

const DAY_MS = 1000 * 60 * 60 * 24;

function withinDays(entry: Entry, days: number, offsetDays = 0): boolean {
  const created = new Date(entry.created_at).getTime();
  const now = Date.now();
  const start = now - (days + offsetDays) * DAY_MS;
  const end = now - offsetDays * DAY_MS;
  return created >= start && created < end;
}

export default function InsightsScreen() {
  const { colors, typography, radius } = useTheme();
  const { entries } = useEntries();
  const [period, setPeriod] = useState<Period>('week');

  const days = period === 'week' ? 7 : 30;

  const stats = useMemo(() => {
    const inPeriod = entries.filter((entry) => withinDays(entry, days));
    const actionable = inPeriod.filter(
      (entry) => entry.domain !== DOMAINS.JOURNAL && entry.domain !== DOMAINS.NOTE,
    );
    const done = actionable.filter((entry) => entry.status === 'done').length;
    const pending = actionable.filter((entry) => entry.status === 'pending').length;

    const thisPeriod = entries.filter((entry) => withinDays(entry, days)).length;
    const lastPeriod = entries.filter((entry) => withinDays(entry, days, days)).length;

    const byDomain = BROWSABLE_DOMAINS.map((domain) => ({
      domain,
      count: inPeriod.filter((entry) => entry.domain === domain).length,
    })).filter((row) => row.count > 0);

    const byLifeArea = ALL_LIFE_AREAS.map((area) => ({
      area,
      count: inPeriod.filter(
        (entry) => (entry.metadata as { life_area?: LifeArea } | null)?.life_area === area,
      ).length,
    })).filter((row) => row.count > 0);

    const habits = entries.filter((entry) => entry.domain === DOMAINS.HEALTH);

    return { done, pending, thisPeriod, lastPeriod, byDomain, byLifeArea, habits };
  }, [entries, days]);

  const completionRate =
    stats.done + stats.pending > 0
      ? Math.round((stats.done / (stats.done + stats.pending)) * 100)
      : 0;

  const momentumDelta = stats.thisPeriod - stats.lastPeriod;

  const maxDomain = Math.max(1, ...stats.byDomain.map((row) => row.count));
  const maxArea = Math.max(1, ...stats.byLifeArea.map((row) => row.count));

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.content}>
      <Text style={[typography.display, { color: colors.textPrimary }]}>Insights</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        A calm look at how things are moving. Momentum, not judgment.
      </Text>

      <View style={styles.segment}>
        {(['week', 'month'] as Period[]).map((value) => {
          const active = period === value;
          return (
            <Pressable
              key={value}
              onPress={() => setPeriod(value)}
              style={[
                styles.segmentItem,
                {
                  backgroundColor: active ? colors.primary : colors.surface,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                },
              ]}>
              <Text
                style={{
                  color: active ? colors.primaryContrast : colors.textSecondary,
                  fontWeight: '600',
                }}>
                {value === 'week' ? 'This week' : 'This month'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Card colors={colors} radius={radius.md}>
        <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Completed</Text>
        <Text style={[styles.bigStat, { color: colors.textPrimary }]}>
          {stats.done}
          <Text style={[styles.bigStatSub, { color: colors.textSecondary }]}>
            {'  '}of {stats.done + stats.pending}
          </Text>
        </Text>
        <View style={[styles.track, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.fill,
              { width: `${completionRate}%`, backgroundColor: colors.success },
            ]}
          />
        </View>
        <Text style={[styles.caption, { color: colors.textSecondary }]}>
          {completionRate}% of what you took on this {period}.
        </Text>
      </Card>

      <Card colors={colors} radius={radius.md}>
        <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Momentum</Text>
        <Text style={[styles.bigStat, { color: colors.textPrimary }]}>{stats.thisPeriod}</Text>
        <Text style={[styles.caption, { color: colors.textSecondary }]}>
          {momentumDelta === 0
            ? `Steady with last ${period}.`
            : momentumDelta > 0
              ? `${momentumDelta} more than last ${period}. Quietly building.`
              : `${Math.abs(momentumDelta)} fewer than last ${period}. A lighter ${period} is fine.`}
        </Text>
      </Card>

      {stats.habits.length > 0 ? (
        <Card colors={colors} radius={radius.md}>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Habits</Text>
          <Text style={[styles.caption, { color: colors.textPrimary, marginTop: 4 }]}>
            {stats.habits.length} {stats.habits.length === 1 ? 'habit' : 'habits'} in motion. Every
            show-up counts — even after a gap.
          </Text>
        </Card>
      ) : null}

      {stats.byDomain.length > 0 ? (
        <Card colors={colors} radius={radius.md}>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>By domain</Text>
          {stats.byDomain.map((row) => (
            <BarRow
              key={row.domain}
              label={DOMAIN_LABELS[row.domain]}
              count={row.count}
              ratio={row.count / maxDomain}
              color={colors.domain[row.domain]}
              colors={colors}
            />
          ))}
        </Card>
      ) : null}

      {stats.byLifeArea.length > 0 ? (
        <Card colors={colors} radius={radius.md}>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>By life area</Text>
          {stats.byLifeArea.map((row) => (
            <BarRow
              key={row.area}
              label={LIFE_AREA_LABELS[row.area]}
              count={row.count}
              ratio={row.count / maxArea}
              color={colors.lifeArea[row.area]}
              colors={colors}
            />
          ))}
        </Card>
      ) : null}

      {stats.thisPeriod === 0 ? (
        <Text style={[styles.emptyNote, { color: colors.textSecondary }]}>
          Nothing captured this {period} yet. Insights fill in as you go.
        </Text>
      ) : null}
    </ScrollView>
  );
}

function Card({
  children,
  colors,
  radius,
}: {
  children: React.ReactNode;
  colors: ReturnType<typeof useTheme>['colors'];
  radius: number;
}) {
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius },
      ]}>
      {children}
    </View>
  );
}

function BarRow({
  label,
  count,
  ratio,
  color,
  colors,
}: {
  label: string;
  count: number;
  ratio: number;
  color: string;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={styles.barRow}>
      <Text style={[styles.barLabel, { color: colors.textPrimary }]}>{label}</Text>
      <View style={styles.barTrackWrap}>
        <View
          style={[styles.barFill, { width: `${Math.max(8, Math.round(ratio * 100))}%`, backgroundColor: color }]}
        />
      </View>
      <Text style={[styles.barCount, { color: colors.textSecondary }]}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 48,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 6,
    marginBottom: 20,
  },
  segment: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  card: {
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bigStat: {
    fontSize: 34,
    fontWeight: '700',
    marginTop: 8,
  },
  bigStatSub: {
    fontSize: 16,
    fontWeight: '500',
  },
  track: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 14,
  },
  fill: {
    height: 8,
    borderRadius: 999,
  },
  caption: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
  },
  barLabel: {
    fontSize: 14,
    width: 84,
  },
  barTrackWrap: {
    flex: 1,
    height: 10,
  },
  barFill: {
    height: 10,
    borderRadius: 999,
  },
  barCount: {
    fontSize: 14,
    fontWeight: '600',
    width: 28,
    textAlign: 'right',
  },
  emptyNote: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 16,
  },
});
