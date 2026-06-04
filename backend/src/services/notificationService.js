import { prisma } from '../prisma.js';
import { sendStudyBlockReminder } from './emailService.js';

export function startNotificationScheduler() {
  console.log('[NotificationService] Study reminder worker started.');
  
  setInterval(async () => {
    try {
      const now = new Date();
      const fifteenMinsFromNow = new Date(now.getTime() + 15 * 60 * 1000);
      
      // Find pending study blocks starting in the next 15 minutes
      const upcomingBlocks = await prisma.planBlock.findMany({
        where: {
          scheduledStart: {
            gte: now,
            lte: fifteenMinsFromNow
          },
          status: 'PENDING'
        },
        include: {
          plan: true,
          topic: true
        }
      });
      
      for (const block of upcomingBlocks) {
        const userId = block.plan.userId;
        const msg = `Your study block for "${block.topic.name}" starts soon at ${new Date(block.scheduledStart).toLocaleTimeString()}!`;
        
        const exists = await prisma.notification.findFirst({
          where: {
            userId,
            message: msg
          }
        });
        
        if (!exists) {
          await prisma.notification.create({
            data: {
              userId,
              type: 'STUDY_REMINDER',
              message: msg,
              channel: 'IN_APP'
            }
          });
          console.log(`[NotificationService] Generated alert for user ${userId}: ${msg}`);

          // Send Email via Resend
          try {
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (user) {
              await sendStudyBlockReminder({
                userEmail: user.email,
                userName: user.name,
                topicName: block.topic.name,
                scheduledTime: block.scheduledStart
              });
              await prisma.notification.create({
                data: {
                  userId,
                  type: 'STUDY_REMINDER_EMAIL',
                  message: `Email reminder sent: ${msg}`,
                  channel: 'EMAIL'
                }
              });
            }
          } catch (emailErr) {
            console.error('[NotificationService] Failed to send email reminder:', emailErr.message);
          }
        }
      }
    } catch (err) {
      console.error('[NotificationService] Error executing check:', err.message);
    }
  }, 60 * 1000);
}
