import mongoose from 'mongoose';

const SubscriptionSchema = new mongoose.Schema({
    plan: {
        type: String,
        required: true,
        enum: ['Gold', 'Silver', 'Bronze', 'Demo'], // Allowed plans
    },
    pricePerHead: {
        type: Number,
        required: true,
    },
    // monthlyPayment: {  // Added monthly payment field
    //     type: Number,
    // },
    // staff: {
    //     type: Number,
    //     min: 10, // Minimum number of staff
    // },
    features: {
        type: [String], // Array of features
    },
}, { timestamps: true });

const Subscription = mongoose.models.Subscription || mongoose.model('Subscription', SubscriptionSchema);
export default Subscription;
