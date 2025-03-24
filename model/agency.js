import mongoose from 'mongoose';

const { Schema } = mongoose;

const AgencySchema = new Schema(
    {
        company: { type: String, required: true },
        branch: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        phone: { type: String, required: true },
        location: { type: String, required: true },
        code: { type: String, required: true },
        password: { type: String, required: true },
        initials: { type: String, required: true },
        packs: { type: Number, default: 0 },
        activePack: { type: Number, default: 0 },
        availablePacks: { type: Number, default: 0 },
        issuedPack: { type: Number, default: 0 },
        returnedPack: { type: Number, default: 0 },
        points: { type: Number, default: 0 },
        gramPoints: { type: Number, default: 0 },
        moneyBalance: { type: Number, default: 0 },
        emissionSaved: { type: Number, default: 0 },
        token: { type: String },

        // Subscription details (MANUAL renewal required)
        subscription: { type: Schema.Types.ObjectId, ref: 'Subscription' },
        subscriptionStartDate: { type: Date },  // Date when subscription started
        subscriptionExpiryDate: { type: Date }, // When the subscription ends
        subscriptionStatus: {
            type: String,
            enum: ['active', 'expired', 'pending'],
            default: 'pending',
        },
        isSubscriptionOverdue: { type: Boolean, default: false }, // If renewal is overdue

        // Payment history for manual renewal
        payments: [
            {
                amount: { type: Number, required: true }, // Amount paid
                date: { type: Date, default: Date.now }, // Payment date
                method: {
                    type: String,
                    enum: ['credit_card', 'bank_transfer', 'mobile_money', 'cash'],
                    required: true,
                }, // Payment method
                status: {
                    type: String,
                    enum: ['pending', 'completed', 'failed'],
                    default: 'pending',
                }, // Payment status
                transactionId: { type: String }, // Optional transaction reference
            }
        ],
        lastPaymentDate: { type: Date }, // Tracks last successful payment date
        lastPaymentAmount: { type: Number }, // Tracks last payment amount

        // Subscription notifications
        remainderNotificationSent: { type: Boolean, default: false },
        graceNotificationSent: { type: Boolean, default: false },
        dueNotificationSent: { type: Boolean, default: false },
        overDueNotificationSent: { type: Boolean, default: false },
        completeNotificationSent: { type: Boolean, default: false },

        // Other fields
        imageUrl: { type: String },
        imagePublicId: { type: String },
        isVerified: { type: Boolean, default: false },
        isActive: { type: Boolean, default: false },
        users: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        vendors: [{ type: Schema.Types.ObjectId, ref: 'Vendor' }],
    },
    { timestamps: true }
);

const Agency = mongoose.models.Agency || mongoose.model('Agency', AgencySchema);
export default Agency;
