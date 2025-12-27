import cron from 'node-cron';
import { db } from '../db/index.ts';
import { sendPush } from '../services/push.ts';
import { getRandomMessage, personalizeMessage } from '../data/messages.ts';
import type { Gender } from '../types/index.ts';

interface UserForPush {
  id: string;
  display_name: string;
  gender: Gender;
  push_token: string;
}

function getUsersForPush(): UserForPush[] {
  const stmt = db.prepare(`
    SELECT id, display_name, gender, push_token
    FROM users
    WHERE push_enabled = 1
      AND push_token IS NOT NULL
      AND push_token != ''
  `);

  return stmt.all() as UserForPush[];
}

async function sendScheduledPushes(): Promise<void> {
  const users = getUsersForPush();

  if (users.length === 0) {
    console.log('[Scheduler] No users to send pushes to');
    return;
  }

  console.log(`[Scheduler] Sending pushes to ${users.length} users`);

  for (const user of users) {
    try {
      const message = getRandomMessage(user.gender);
      const text = personalizeMessage(message.text, user.display_name);

      await sendPush(user.push_token, {
        title: 'precious.you',
        body: text,
        data: { messageId: message.id },
      });

      console.log(`[Scheduler] Sent push to user ${user.id}`);
    } catch (error) {
      console.error(`[Scheduler] Failed to send push to user ${user.id}:`, error);
    }
  }
}

export function startPushScheduler(): void {
  // Run every day at 10:00, 15:00, and 20:00
  const schedules = ['0 10 * * *', '0 15 * * *', '0 20 * * *'];

  for (const schedule of schedules) {
    cron.schedule(schedule, () => {
      console.log(`[Scheduler] Running scheduled push at ${new Date().toISOString()}`);
      sendScheduledPushes().catch(console.error);
    });
  }

  console.log('[Scheduler] Push scheduler started (10:00, 15:00, 20:00 daily)');
}

export function stopPushScheduler(): void {
  cron.getTasks().forEach(task => task.stop());
  console.log('[Scheduler] Push scheduler stopped');
}

// Manual trigger for testing
export { sendScheduledPushes };
