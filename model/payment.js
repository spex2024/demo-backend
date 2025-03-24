import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema({
    agencyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agency', required: true }, // Agency linked to the payment
    plan: { type: String, required: true }, // Subscription plan
    amountPaid: { type: Number, required: true }, // Total amount paid
    paymentType: { type: String, enum: ['monthly'], required: true }, // Only 'monthly' payments
    reference: { type: String, required: true, unique: true }, // Unique transaction reference
    createdAt: { type: Date, default: Date.now }, // Timestamp
});

const PaymentModel = mongoose.model('Payment', PaymentSchema);

export default PaymentModel;
