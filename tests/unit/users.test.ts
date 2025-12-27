import { describe, it, expect, beforeEach } from 'vitest';
import {
  createUser,
  findUserById,
  findUserByEmail,
  findUserByAppleId,
  findUserByGoogleId,
  updateUser,
  linkAppleId,
  linkGoogleId,
  deleteUser,
} from '../../src/services/users.ts';
import { db } from '../../src/db/index.ts';

describe('Users Service', () => {
  beforeEach(() => {
    db.exec('DELETE FROM users');
  });

  describe('createUser', () => {
    it('создаёт пользователя с обязательными полями', () => {
      const user = createUser({
        email: 'test@example.com',
        display_name: 'Тест Юзер',
      });

      expect(user.id).toBeDefined();
      expect(user.email).toBe('test@example.com');
      expect(user.display_name).toBe('Тест Юзер');
      expect(user.gender).toBe('female');
      expect(user.created_at).toBeDefined();
    });

    it('применяет кастомный gender', () => {
      const user = createUser({
        email: 'male@example.com',
        display_name: 'Male User',
        gender: 'male',
      });

      expect(user.gender).toBe('male');
    });

    it('сохраняет apple_id при создании', () => {
      const user = createUser({
        email: 'apple@example.com',
        display_name: 'Apple User',
        apple_id: 'apple-sub-123',
      });

      expect(user.apple_id).toBe('apple-sub-123');

      const fromDb = findUserById(user.id);
      expect(fromDb?.apple_id).toBe('apple-sub-123');
    });

    it('сохраняет google_id при создании', () => {
      const user = createUser({
        email: 'google@example.com',
        display_name: 'Google User',
        google_id: 'google-sub-456',
      });

      expect(user.google_id).toBe('google-sub-456');
    });

    it('не даёт создать пользователя с дублирующим email', () => {
      createUser({ email: 'unique@example.com', display_name: 'First' });

      expect(() => {
        createUser({ email: 'unique@example.com', display_name: 'Second' });
      }).toThrow();
    });
  });

  describe('findUserByEmail', () => {
    it('находит существующего пользователя', () => {
      createUser({ email: 'findme@example.com', display_name: 'Find Me' });

      const found = findUserByEmail('findme@example.com');

      expect(found).not.toBeNull();
      expect(found?.display_name).toBe('Find Me');
    });

    it('возвращает null для несуществующего email', () => {
      const found = findUserByEmail('nobody@example.com');
      expect(found).toBeNull();
    });
  });

  describe('findUserByAppleId', () => {
    it('находит пользователя по apple_id', () => {
      const created = createUser({
        email: 'apple-find@example.com',
        display_name: 'Apple Find',
        apple_id: 'find-apple-123',
      });

      const found = findUserByAppleId('find-apple-123');

      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
    });
  });

  describe('findUserByGoogleId', () => {
    it('находит пользователя по google_id', () => {
      const created = createUser({
        email: 'google-find@example.com',
        display_name: 'Google Find',
        google_id: 'find-google-456',
      });

      const found = findUserByGoogleId('find-google-456');

      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
    });
  });

  describe('updateUser', () => {
    it('обновляет display_name', () => {
      const user = createUser({ email: 'update@example.com', display_name: 'Old Name' });

      const updated = updateUser(user.id, { display_name: 'New Name' });

      expect(updated?.display_name).toBe('New Name');
      expect(findUserById(user.id)?.display_name).toBe('New Name');
    });

    it('обновляет gender', () => {
      const user = createUser({
        email: 'gender-update@example.com',
        display_name: 'Gender Test',
        gender: 'female',
      });

      const updated = updateUser(user.id, { gender: 'neutral' });

      expect(updated?.gender).toBe('neutral');
    });

    it('обновляет push_token', () => {
      const user = createUser({ email: 'push@example.com', display_name: 'Push User' });

      const updated = updateUser(user.id, { push_token: 'fcm-token-xyz' });

      expect(updated?.push_token).toBe('fcm-token-xyz');
    });

    it('обновляет push_enabled', () => {
      const user = createUser({ email: 'push-enabled@example.com', display_name: 'Push Enabled' });

      expect(user.push_enabled).toBe(true);

      const updated = updateUser(user.id, { push_enabled: false });

      expect(updated?.push_enabled).toBe(false);
    });

    it('обновляет несколько полей за раз', () => {
      const user = createUser({
        email: 'multi@example.com',
        display_name: 'Multi',
        gender: 'female',
      });

      const updated = updateUser(user.id, {
        display_name: 'Updated Multi',
        gender: 'male',
        push_token: 'new-token',
      });

      expect(updated?.display_name).toBe('Updated Multi');
      expect(updated?.gender).toBe('male');
      expect(updated?.push_token).toBe('new-token');
    });

    it('возвращает null для несуществующего пользователя', () => {
      const updated = updateUser('non-existent-id', { display_name: 'Test' });
      expect(updated).toBeNull();
    });
  });

  describe('linkAppleId', () => {
    it('привязывает apple_id к существующему пользователю', () => {
      const user = createUser({ email: 'link-apple@example.com', display_name: 'Link Apple' });

      expect(user.apple_id).toBeNull();

      linkAppleId(user.id, 'linked-apple-id');

      expect(findUserById(user.id)?.apple_id).toBe('linked-apple-id');
    });
  });

  describe('linkGoogleId', () => {
    it('привязывает google_id к существующему пользователю', () => {
      const user = createUser({ email: 'link-google@example.com', display_name: 'Link Google' });

      expect(user.google_id).toBeNull();

      linkGoogleId(user.id, 'linked-google-id');

      expect(findUserById(user.id)?.google_id).toBe('linked-google-id');
    });
  });

  describe('deleteUser', () => {
    it('удаляет существующего пользователя', () => {
      const user = createUser({ email: 'delete@example.com', display_name: 'Delete Me' });

      const deleted = deleteUser(user.id);

      expect(deleted).toBe(true);
      expect(findUserById(user.id)).toBeNull();
    });

    it('возвращает false для несуществующего пользователя', () => {
      const deleted = deleteUser('non-existent-id');
      expect(deleted).toBe(false);
    });
  });

  describe('полный флоу', () => {
    it('регистрация через Apple -> обновление -> удаление', () => {
      // Регистрация
      const user = createUser({
        email: 'flow-apple@example.com',
        display_name: 'Flow Apple',
        apple_id: 'flow-apple-sub',
      });

      // Повторный логин через apple_id
      const found = findUserByAppleId('flow-apple-sub');
      expect(found?.id).toBe(user.id);

      // Обновление профиля
      updateUser(user.id, { display_name: 'Updated', gender: 'neutral', push_token: 'fcm' });

      // Удаление
      expect(deleteUser(user.id)).toBe(true);
      expect(findUserByAppleId('flow-apple-sub')).toBeNull();
    });

    it('регистрация через Google -> привязка Apple', () => {
      const user = createUser({
        email: 'flow-google@example.com',
        display_name: 'Flow Google',
        google_id: 'flow-google-sub',
      });

      expect(user.apple_id).toBeNull();

      linkAppleId(user.id, 'flow-apple-later');

      // Теперь можно найти по обоим провайдерам
      expect(findUserByGoogleId('flow-google-sub')?.id).toBe(user.id);
      expect(findUserByAppleId('flow-apple-later')?.id).toBe(user.id);
    });
  });
});
