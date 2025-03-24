// cronJobs.js
import cron from "node-cron";
import Agency from "../model/agency.js";
import { sendMail } from "./mail.js";

export const checkInstallment = async () => {
    try {
        const agencies = await Agency.find({
            subscriptionStatus: { $in: ["active", "expired"] }, // Fetch only active or expired subscriptions
        });

        if (agencies.length === 0) {
            console.log("No agencies with active or expired subscriptions found.");
            return; // Stop execution
        }

        const notifications = [];
        const currentDate = new Date();
        const dayOfWeek = currentDate.getDay(); // 0 = Sunday, ..., 6 = Saturday

        for (const agency of agencies) {
            const { subscriptionExpiryDate, subscriptionStatus } = agency;
            if (!subscriptionExpiryDate) continue; // Skip if expiry date is missing

            const expiryDate = new Date(subscriptionExpiryDate);
            const timeDifferenceInDays = Math.floor((expiryDate - currentDate) / (1000 * 60 * 60 * 24));

            console.log(`Agency: ${agency.company}, Days Until Expiry: ${timeDifferenceInDays}`);

            // 1. Reminder before expiry (3 days left)
            if (timeDifferenceInDays <= 3 && timeDifferenceInDays > 0 && subscriptionStatus === "active" && !agency.remainderNotificationSent) {
                notifications.push({
                    email: agency.email,
                    subject: "Subscription Expiry Reminder",
                    message: `<p>Dear ${agency.company}, your subscription will expire in ${timeDifferenceInDays} days. Please renew your subscription.</p>`,
                });
                agency.remainderNotificationSent = true;
                await agency.save();
            }

            // 2. Mark expired subscriptions
            if (timeDifferenceInDays <= 0 && subscriptionStatus === "active") {
                agency.subscriptionStatus = "expired";
                agency.isActive = false;
                notifications.push({
                    email: agency.email,
                    subject: "Subscription Expired - Renewal Required",
                    message: `<p>Dear ${agency.company}, your subscription has expired. Please renew your subscription to reactivate your account.</p>`,
                });
                agency.dueNotificationSent = true;
                await agency.save();
            }

            // 3. Overdue reminders (Monday & Friday)
            if (subscriptionStatus === "expired" && (dayOfWeek === 1 || dayOfWeek === 5) && !agency.overDueNotificationSent) {
                notifications.push({
                    email: agency.email,
                    subject: "Overdue Subscription Renewal",
                    message: `<p>Dear ${agency.company}, your subscription is overdue. Kindly renew your subscription.</p>`,
                });
                agency.overDueNotificationSent = true;
                await agency.save();
            }

            // 4. Thank-you message after renewal
            if (subscriptionStatus === "active" && !agency.completeNotificationSent) {
                notifications.push({
                    email: agency.email,
                    subject: "Subscription Renewed Successfully",
                    message: `<p>Dear ${agency.company}, thank you for renewing your subscription.</p>`,
                });
                agency.completeNotificationSent = true;
                await agency.save();
            }
        }

        // Send emails
        for (const notification of notifications) {
            await sendMail({
                to: notification.email,
                subject: notification.subject,
                html: notification.message,
            });
        }

        console.log(`Checked subscription renewals for ${agencies.length} agencies.`);
    } catch (error) {
        console.error("Error checking agency subscriptions:", error);
    }
};


// Schedule the task to run every day at 12 AM
cron.schedule("0 0 * * *", () => {
    console.log("Running subscription check...");
    checkInstallment();
});

export default checkInstallment;
