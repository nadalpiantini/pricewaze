/**
 * Unit Tests: Signal Processing Functions
 *
 * Tests the signal helper functions used throughout the application
 * for displaying and categorizing market signals.
 */

import {
  getSignalIcon,
  getSignalLabel,
  isPositiveSignal,
  SIGNALS,
  USER_REPORTABLE_SIGNALS_POSITIVE,
  USER_REPORTABLE_SIGNALS_NEGATIVE,
} from '@/lib/signals';

describe('signals', () => {
  describe('getSignalIcon', () => {
    it('returns correct icon for known user signals', () => {
      expect(getSignalIcon('noise')).toBe('🔊');
      expect(getSignalIcon('humidity')).toBe('💧');
      expect(getSignalIcon('misleading_photos')).toBe('📸');
      expect(getSignalIcon('quiet_area')).toBe('🟢');
      expect(getSignalIcon('good_condition')).toBe('✨');
      expect(getSignalIcon('transparent_listing')).toBe('📋');
    });

    it('returns fallback icon for unknown signals', () => {
      expect(getSignalIcon('unknown_signal')).toBe('📊');
      expect(getSignalIcon('')).toBe('📊');
    });
  });

  describe('getSignalLabel', () => {
    it('returns correct label for user-reportable signals', () => {
      expect(getSignalLabel('noise')).toBe('Zona ruidosa');
      expect(getSignalLabel('humidity')).toBe('Humedad visible');
      expect(getSignalLabel('quiet_area')).toBe('Zona tranquila');
    });

    it('returns correct label for system signals', () => {
      expect(getSignalLabel('high_activity')).toBe('Alta actividad');
      expect(getSignalLabel('many_visits')).toBe('Muchas visitas');
      expect(getSignalLabel('competing_offers')).toBe('Ofertas competidoras');
      expect(getSignalLabel('long_time_on_market')).toBe('Tiempo en mercado');
      expect(getSignalLabel('recent_price_change')).toBe('Cambio de precio');
    });

    it('returns signal type as fallback for unknown signals', () => {
      expect(getSignalLabel('unknown_type')).toBe('unknown_type');
    });
  });

  describe('isPositiveSignal', () => {
    it('identifies positive signals correctly', () => {
      expect(isPositiveSignal('quiet_area')).toBe(true);
      expect(isPositiveSignal('good_condition')).toBe(true);
      expect(isPositiveSignal('transparent_listing')).toBe(true);
    });

    it('identifies negative signals correctly', () => {
      expect(isPositiveSignal('noise')).toBe(false);
      expect(isPositiveSignal('humidity')).toBe(false);
      expect(isPositiveSignal('misleading_photos')).toBe(false);
    });

    it('returns false for unknown signals', () => {
      expect(isPositiveSignal('unknown')).toBe(false);
    });
  });

  describe('SIGNALS constant', () => {
    it('contains all expected signal types', () => {
      const expectedSignals = [
        'noise',
        'humidity',
        'misleading_photos',
        'quiet_area',
        'good_condition',
        'transparent_listing',
      ];

      expectedSignals.forEach((signal) => {
        expect(SIGNALS).toHaveProperty(signal);
        expect(SIGNALS[signal as keyof typeof SIGNALS]).toHaveProperty('icon');
        expect(SIGNALS[signal as keyof typeof SIGNALS]).toHaveProperty('label');
      });
    });
  });

  describe('signal categorization', () => {
    it('negative signals list is complete', () => {
      expect(USER_REPORTABLE_SIGNALS_NEGATIVE).toHaveLength(3);
      expect(USER_REPORTABLE_SIGNALS_NEGATIVE).toContain('noise');
      expect(USER_REPORTABLE_SIGNALS_NEGATIVE).toContain('humidity');
      expect(USER_REPORTABLE_SIGNALS_NEGATIVE).toContain('misleading_photos');
    });

    it('positive signals list is complete', () => {
      expect(USER_REPORTABLE_SIGNALS_POSITIVE).toHaveLength(3);
      expect(USER_REPORTABLE_SIGNALS_POSITIVE).toContain('quiet_area');
      expect(USER_REPORTABLE_SIGNALS_POSITIVE).toContain('good_condition');
      expect(USER_REPORTABLE_SIGNALS_POSITIVE).toContain('transparent_listing');
    });

    it('no overlap between positive and negative signals', () => {
      const overlap = USER_REPORTABLE_SIGNALS_POSITIVE.filter((signal) =>
        USER_REPORTABLE_SIGNALS_NEGATIVE.includes(signal)
      );
      expect(overlap).toHaveLength(0);
    });
  });
});
