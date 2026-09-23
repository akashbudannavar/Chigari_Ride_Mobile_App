import React from 'react';
import { StyleSheet, View } from 'react-native';
import { CheckCircle2, QrCode, ArrowDown, ShieldCheck, Clock, AlertCircle } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { Colors, FontFamily, Spacing, Radius, Shadows } from '@/constants/theme';
import type { ChigariScannedTicket } from '@/types/ticket';

interface ScannedTicketCardProps {
  ticket: ChigariScannedTicket;
}

export function ScannedTicketCard({ ticket }: ScannedTicketCardProps) {
  const isExpired = ticket.status === 'Expired' || ticket.validityStatus === 'EXPIRED';
  const isBoarded = ticket.status === 'Boarded' || ticket.validityStatus === 'BOARDED' || ticket.journeyState === 'BOARDED';
  const isCompleted = ticket.status === 'Completed' || ticket.validityStatus === 'COMPLETED' || ticket.journeyState === 'EXITED';
  const isValid = !isExpired && !isCompleted && (ticket.status === 'Valid' || isBoarded);
  const isUnknown = ticket.validityStatus === 'UNKNOWN';

  const formattedValidUntil = React.useMemo(() => {
    if (ticket.validUntil) {
      try {
        const d = new Date(ticket.validUntil);
        if (!isNaN(d.getTime())) {
          return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
      } catch {}
    }
    return '4 hours from issue';
  }, [ticket.validUntil]);

  const displayFare = React.useMemo(() => {
    if (typeof ticket.fare === 'number') {
      return `₹${ticket.fare.toFixed(2)}`;
    }
    if (ticket.fareFormatted && ticket.fareFormatted !== 'Fare unavailable') {
      const cleaned = ticket.fareFormatted.replace(/[^\d.]/g, '');
      const num = parseFloat(cleaned);
      if (!isNaN(num)) return `₹${num.toFixed(2)}`;
      return ticket.fareFormatted.startsWith('₹') ? ticket.fareFormatted : `₹${ticket.fareFormatted}`;
    }
    return 'Fare unavailable';
  }, [ticket.fare, ticket.fareFormatted]);

  const displayIssuedAt = ticket.issuedAtFormatted || (ticket.issuedAt ? ticket.issuedAt.split('T')[0] : 'Issue date unavailable');

  return (
    <View style={styles.cardContainer}>
      {/* ─── Top Header Badge ─── */}
      <View
        style={[
          styles.statusBanner,
          isCompleted
            ? { backgroundColor: '#F1F5F9', borderBottomWidth: 1, borderBottomColor: '#CBD5E1' }
            : isBoarded
            ? { backgroundColor: '#E0F2FE', borderBottomWidth: 1, borderBottomColor: '#BAE6FD' }
            : isValid
            ? styles.statusValid
            : isExpired
            ? styles.statusExpired
            : styles.statusUnknown,
        ]}
      >
        {isCompleted ? (
          <CheckCircle2 size={16} color="#475569" strokeWidth={2.4} />
        ) : isBoarded ? (
          <CheckCircle2 size={16} color="#0284C7" strokeWidth={2.4} />
        ) : isValid ? (
          <CheckCircle2 size={16} color="#2E7D32" strokeWidth={2.4} />
        ) : (
          <AlertCircle size={16} color={isExpired ? '#DC2626' : '#D97706'} strokeWidth={2.4} />
        )}
        <Text
          style={[
            styles.statusText,
            isCompleted
              ? { color: '#475569' }
              : isBoarded
              ? { color: '#0369A1' }
              : isValid
              ? styles.statusTextValid
              : isExpired
              ? styles.statusTextExpired
              : styles.statusTextUnknown,
          ]}
        >
          {isCompleted
            ? 'Journey Completed • Exited'
            : isBoarded
            ? 'Passenger Boarded • Active'
            : isValid
            ? 'Ticket Recognized • Valid'
            : isExpired
            ? 'Ticket Recognized • Expired'
            : 'Ticket Scanned • Validity Unknown'}
        </Text>
      </View>

      <View style={styles.contentPadding}>
        {/* ─── Brand & Ticket ID / S.No ─── */}
        <View style={styles.brandRow}>
          <View>
            <Text style={styles.brandTitle}>CHIGARI RIDE</Text>
            <Text style={styles.brandSubtitle}>NWKRTC • HDBRTS</Text>
          </View>
          <View style={styles.sNoBadge}>
            <Text style={styles.sNoText}>
              {ticket.serialNumber ? `S.No: ${ticket.serialNumber}` : ticket.ticketId}
            </Text>
          </View>
        </View>

        {/* ─── Main Focal Point: Clean Fare & Journey Type ─── */}
        <View style={styles.fareContainer}>
          <Text style={styles.fareAmount}>
            {displayFare}
          </Text>
          <View style={styles.typePill}>
            <Text style={styles.typePillText}>{ticket.ticketType || 'Adult Ticket'}</Text>
          </View>
        </View>

        {/* ─── Origin & Destination Flow ─── */}
        <View style={styles.routeFlow}>
          {/* FROM Stop */}
          <View style={styles.stopRow}>
            <View style={styles.dotOrigin} />
            <View style={styles.stopInfo}>
              <Text style={styles.stopLabel}>FROM</Text>
              <Text style={styles.stopName}>{ticket.fromStopName}</Text>
            </View>
          </View>

          {/* Vertical Connecting Line */}
          <View style={styles.connectorContainer}>
            <View style={styles.connectorLine} />
            <ArrowDown size={14} color="#9CA3AF" strokeWidth={2.2} style={styles.connectorArrow} />
          </View>

          {/* TO Stop */}
          <View style={styles.stopRow}>
            <View style={styles.dotDest} />
            <View style={styles.stopInfo}>
              <Text style={styles.stopLabel}>TO</Text>
              <Text style={styles.stopName}>{ticket.toStopName}</Text>
            </View>
          </View>
        </View>

        {/* ─── Subtle Expired Notice (Clean text, no heavy bordered box) ─── */}
        {isExpired && (
          <View style={styles.expiredNoticeRow}>
            <AlertCircle size={13} color="#DC2626" />
            <Text style={styles.expiredNoticeText}>
              {ticket.statusReason || 'This ticket is no longer valid for travel.'}
            </Text>
          </View>
        )}

        {/* ─── Dashed Ticket Perforation ─── */}
        <View style={styles.dashedDivider} />

        {/* ─── Ticket Metadata Footer ─── */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Clock size={13} color="#6B7280" />
            <Text style={styles.metaLabel}>Issued:</Text>
            <Text style={styles.metaValue}>{displayIssuedAt}</Text>
          </View>

          {ticket.operatorId ? (
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Operator:</Text>
              <Text style={styles.metaValue}>{ticket.operatorId}</Text>
            </View>
          ) : (
            <View style={styles.metaItem}>
              <ShieldCheck
                size={13}
                color={isCompleted ? '#475569' : isBoarded ? '#0284C7' : isValid ? '#2E7D32' : '#9CA3AF'}
              />
              <Text style={styles.metaLabel}>Status:</Text>
              <Text
                style={[
                  styles.metaValue,
                  {
                    color: isCompleted ? '#475569' : isBoarded ? '#0284C7' : isValid ? '#2E7D32' : '#DC2626',
                    fontFamily: FontFamily.semiBold,
                  },
                ]}
              >
                {isCompleted ? 'Completed' : isBoarded ? 'Boarded' : ticket.status}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    ...Shadows.low,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
  },
  statusValid: {
    backgroundColor: '#E8F5E9',
    borderBottomWidth: 1,
    borderBottomColor: '#C8E6C9',
  },
  statusExpired: {
    backgroundColor: '#FEF2F2',
    borderBottomWidth: 1,
    borderBottomColor: '#FECACA',
  },
  statusUnknown: {
    backgroundColor: '#FFFBEB',
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  statusText: {
    fontSize: 13,
    fontFamily: FontFamily.semiBold,
  },
  statusTextValid: {
    color: '#2E7D32',
  },
  statusTextExpired: {
    color: '#DC2626',
  },
  statusTextUnknown: {
    color: '#D97706',
  },
  expiredNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.sm,
    marginBottom: 2,
    paddingHorizontal: 2,
  },
  expiredNoticeText: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: '#DC2626',
  },
  contentPadding: {
    padding: Spacing.base,
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  brandTitle: {
    fontSize: 15,
    fontFamily: FontFamily.bold,
    color: '#1F2937',
    letterSpacing: 0.6,
  },
  brandSubtitle: {
    fontSize: 11,
    fontFamily: FontFamily.regular,
    color: '#6B7280',
  },
  sNoBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  sNoText: {
    fontSize: 12,
    fontFamily: FontFamily.medium,
    color: '#4B5563',
  },
  fareContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    marginTop: 2,
    marginBottom: Spacing.xs,
  },
  fareAmount: {
    fontSize: 34,
    fontFamily: FontFamily.bold,
    color: '#111827',
    letterSpacing: -0.5,
  },
  typePill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  typePillText: {
    fontSize: 12,
    fontFamily: FontFamily.semiBold,
    color: '#4B5563',
  },
  routeFlow: {
    marginVertical: Spacing.sm,
    paddingHorizontal: 4,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dotOrigin: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#2E7D32',
    borderWidth: 2.5,
    borderColor: '#C8E6C9',
  },
  dotDest: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#E65100',
    borderWidth: 2.5,
    borderColor: '#FFE0B2',
  },
  stopInfo: {
    flex: 1,
  },
  stopLabel: {
    fontSize: 10,
    fontFamily: FontFamily.semiBold,
    color: '#9CA3AF',
    letterSpacing: 0.8,
  },
  stopName: {
    fontSize: 15,
    fontFamily: FontFamily.semiBold,
    color: '#111827',
  },
  connectorContainer: {
    paddingLeft: 6,
    height: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectorLine: {
    width: 2,
    height: '100%',
    backgroundColor: '#E5E7EB',
  },
  connectorArrow: {
    marginLeft: 6,
  },
  dashedDivider: {
    height: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    marginVertical: Spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaLabel: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: '#6B7280',
  },
  metaValue: {
    fontSize: 12,
    fontFamily: FontFamily.medium,
    color: '#374151',
  },
});
