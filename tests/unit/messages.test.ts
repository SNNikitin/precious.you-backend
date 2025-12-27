import { describe, it, expect } from 'vitest';
import { MESSAGES, getRandomMessage, personalizeMessage } from '../../src/data/messages.ts';

describe('Messages', () => {
  describe('MESSAGES constant', () => {
    it('should have at least 20 messages', () => {
      expect(MESSAGES.length).toBeGreaterThanOrEqual(20);
    });

    it('should have all required properties', () => {
      for (const message of MESSAGES) {
        expect(message).toHaveProperty('id');
        expect(message).toHaveProperty('text');
        expect(message).toHaveProperty('category');
        expect(message).toHaveProperty('gender');
        expect(typeof message.id).toBe('string');
        expect(typeof message.text).toBe('string');
        expect(typeof message.category).toBe('string');
        expect(['female', 'male', 'neutral']).toContain(message.gender);
      }
    });

    it('should have unique IDs', () => {
      const ids = MESSAGES.map(m => m.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have messages in all categories', () => {
      const categories = new Set(MESSAGES.map(m => m.category));
      expect(categories.has('affirmation')).toBe(true);
      expect(categories.has('motivation')).toBe(true);
      expect(categories.has('comfort')).toBe(true);
      expect(categories.has('appreciation')).toBe(true);
      expect(categories.has('self_worth')).toBe(true);
    });
  });

  describe('getRandomMessage', () => {
    it('should return a message for female gender', () => {
      const message = getRandomMessage('female');
      expect(message).toBeDefined();
      expect(['female', 'neutral']).toContain(message.gender);
    });

    it('should return a message for neutral gender', () => {
      const message = getRandomMessage('neutral');
      expect(message).toBeDefined();
      expect(message.gender).toBe('neutral');
    });

    it('should return different messages on multiple calls (randomness)', () => {
      const messages = new Set<string>();
      for (let i = 0; i < 50; i++) {
        messages.add(getRandomMessage('female').id);
      }
      // Should have at least 3 different messages after 50 calls
      expect(messages.size).toBeGreaterThan(2);
    });

    it('should default to female gender', () => {
      const message = getRandomMessage();
      expect(['female', 'neutral']).toContain(message.gender);
    });
  });

  describe('personalizeMessage', () => {
    it('should replace {{name}} placeholder', () => {
      const result = personalizeMessage('{{name}}, ты молодец!', 'Анна');
      expect(result).toBe('Анна, ты молодец!');
    });

    it('should replace multiple {{name}} placeholders', () => {
      const result = personalizeMessage('{{name}}, {{name}} умничка!', 'Мария');
      expect(result).toBe('Мария, Мария умничка!');
    });

    it('should return text unchanged if no placeholder', () => {
      const result = personalizeMessage('Ты молодец!', 'Анна');
      expect(result).toBe('Ты молодец!');
    });

    it('should handle empty name', () => {
      const result = personalizeMessage('{{name}}, привет!', '');
      expect(result).toBe(', привет!');
    });

    it('should handle special characters in name', () => {
      const result = personalizeMessage('{{name}}, привет!', "O'Connor");
      expect(result).toBe("O'Connor, привет!");
    });
  });
});
