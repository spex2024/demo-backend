// import paystack from "../helper/paystack-service.js";
import generateInvoiceNumber from "../helper/order-number.js";
// import PaymentModel from "../model/payment.js";
// import Agency from "../model/agency.js";
// import Subscription from "../model/add-subscription.js";





import paystack from "../helper/paystack-service.js";
import PaymentModel from "../model/payment.js";
import Agency from "../model/agency.js";
import Subscription from "../model/add-subscription.js";



const updateAgencySubscription = async (agency, subscription, staff) => {
    try {
        const numberOfStaff = staff || 0;
        const numberOfPacks = numberOfStaff * 2;
        const numberOfUsers = agency.users ? agency.users.length : 0;
        const userPacks = numberOfUsers * 2;
        const availablePacks = numberOfPacks - userPacks;

        // Update subscription details
        agency.subscription = subscription._id;
        agency.subscriptionStartDate = new Date();
        agency.subscriptionExpiryDate = new Date(
            new Date().setMonth(new Date().getMonth() + 1) // 1-month subscription
        );
        agency.subscriptionStatus = "active";
        agency.isSubscriptionOverdue = false;
        agency.issuedPack = userPacks;
        agency.packs = availablePacks;
        agency.isActive = true;

        await agency.save();
        return agency;
    } catch (error) {
        console.error("Error updating agency subscription:", error);
        throw new Error("Failed to update subscription.");
    }
};



export const purchase = async (req, res) => {
    const { email, amount, callback_url, metadata } = req.body;

    try {
        // Fetch the agency details
        const agency = await Agency.findOne({ email }).populate("subscription");

        if (!agency) {
            return res.status(404).json({ message: "Agency not found" });
        }
        const { staff, monthlyPayment, plan } = metadata;

        // Check if the subscription plan exists
        const subscription = await Subscription.findOne({ plan });
        if (!subscription) {
            return res.status(404).json({ message: "Subscription plan not found" });
        }

        // Check for an existing active subscription
        if (agency.subscription && agency.subscription.plan === plan && agency.isActive) {
            return res.status(400).json({ message: "You are already subscribed to this plan." });
        }

        // Initialize transaction with Paystack
        const response = await paystack.initializeTransaction({
            email,
            amount: amount * 100, // Convert to kobo
            callback_url,
        });

        if (!response.body || !response.body.data || !response.body.data.reference) {
            return res.status(500).json({ error: "Failed to initialize transaction with Paystack" });
        }

        res.status(200).json(response.body);
    }catch (error){
        console.error("Error during purchase initialization:", error);
        res.status(500).json({ error: "Failed to initialize purchase" });
    }
};


export const verifyPayment = async (req, res) => {
    const { reference } = req.params;

    try {
        const response = await paystack.verifyTransaction({ reference });

        if (!response.body || !response.body.data) {
            return res.status(400).json({ error: "Invalid response from Paystack" });
        }

        const paymentStatus = response.body.data.status;

        if (paymentStatus !== "success") {
            return res.status(400).json({
                error: "Payment verification failed or incomplete",
                details: response.body.data,
            });
        }

        res.status(200).json({ message: "Payment verified successfully", data: response.body.data });
    } catch (error) {
        console.error("Error verifying payment:", error);
        res.status(500).json({ error: "Failed to verify payment" });
    }
};



export const recordPayment = async (req, res) => {
    const { email, plan, amount, reference, staff } = req.body;

    try {
        // Generate an invoice number
        const orderNumber = await generateInvoiceNumber();

        // Find the agency by email
        const agency = await Agency.findOne({ email }).populate("subscription");
        if (!agency) {
            return res.status(404).json({ message: "Agency not found" });
        }

        // Find the subscription plan by name
        const subscription = await Subscription.findOne({ plan });
        if (!subscription) {
            return res.status(404).json({ message: "Subscription plan not found" });
        }

        // Check if the agency is already subscribed
        if (agency.subscription && agency.subscription.plan === plan && agency.isActive) {
            return res.status(400).json({ message: "You are already subscribed to this plan." });
        }

        // Record the monthly payment
        const newPayment = new PaymentModel({
            agencyId: agency._id,
            plan,
            amountPaid: amount,
            reference,
            paymentType: "monthly",
        });

        await newPayment.save();

        // Update the agency's subscription details
        await updateAgencySubscription(agency, subscription, staff);

        res.status(200).json({
            message: "Payment recorded successfully",
            orderNumber,
            agency,
        });
    } catch (error) {
        console.error("Error recording payment:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};






//
// // Helper function for updating agency subscription
// const updateAgencySubscription = async (agency, newSubscription) => {
//     const numberOfStaff = newSubscription.staff || 0;
//     const numberOfPacks = numberOfStaff * 2;
//     const numberOfUsers = agency.users ? agency.users.length : 0;
//     const userPacks = numberOfUsers * 2;
//     const availablePacks = numberOfPacks - userPacks;
//
//     agency.subscription = newSubscription._id;
//     agency.issuedPack = userPacks;
//     agency.packs = availablePacks;
//     agency.isActive = true;
//
//     return agency.save();
// };

// export const purchase = async (req, res) => {
//     const { email, amount, plan, callback_url , staff } = req.body;
//
//     try {
//         // Fetch the agency details
//         const agency = await Agency.findOne({ email }).populate('subscription');
//
//         // Validate if the agency exists
//         if (!agency) {
//             return res.status(404).json({ message: "Agency not found" });
//         }
//
//         // Check for an existing subscription and payment type
//         const { subscription } = agency;
//         if (subscription) {
//             if (subscription.paymentType === 'one-time' && subscription.price === amount ) {
//                 return res.status(400).json({ message: "You are already subscribed to this one-time plan." });
//             }
//             if (subscription.paymentType === 'installment' && subscription.price === amount && agency.isActive && subscription.plan === plan) {
//                 return res.status(400).json({ message: "You are already on this installment plan." });
//             }
//         }
//
//         // Initialize transaction with Paystack
//         const response = await paystack.initializeTransaction({
//             email,
//             amount: amount * 100, // Paystack expects amount in kobo (smallest unit)
//             callback_url, // Use callback_url provided in request
//         });
//
//         // If successful, return the Paystack transaction response
//         res.status(200).json(response.body);
//     } catch (error) {
//         console.error('Error during purchase initialization:', error);
//         res.status(500).json({ error: 'Failed to initialize purchase' });
//     }
// };
//
//
//
// export const verifyPayment = async (req, res) => {
//     const { reference } = req.params;
//
//     try {
//         const response = await paystack.verifyTransaction({ reference });
//         res.status(200).json(response.body);
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// };

//
//
//
// export const recordOneTimePayment = async (req, res) => {
//     const { email, plan, amount, reference, staff } = req.body;
//
//     try {
//         // Generate an invoice number
//         const orderNumber = await generateInvoiceNumber();
//
//         // Find the agency by email
//         const agency = await Agency.findOne({ email }).populate('subscription');
//         if (!agency) {
//             return res.status(404).json({ message: 'Agency not found' });
//         }
//
//         // Find the subscription plan by name
//         const subscription = await Subscription.findOne({ plan });
//         if (!subscription) {
//             return res.status(404).json({ message: 'Subscription plan not found' });
//         }
//
//         // Check if the agency already has an active subscription
//         if (agency.subscription && agency.subscription.plan === plan && agency.isActive) {
//             return res.status(400).json({ message: "You are already subscribed to this plan." });
//         }
//
//         // Calculate the total number of packs based on staff count
//         const numberOfStaff = staff || 0;
//         const numberOfPacks = numberOfStaff * 2;
//         const numberOfUsers = agency.users ? agency.users.length : 0;
//         const userPacks = numberOfUsers * 2;
//         const availablePacks = numberOfPacks - userPacks;
//
//         // Record the one-time payment
//         const newPayment = new PaymentModel({
//             email,
//             plan,
//             amount,
//             reference,
//             orderNumber,
//             status: 'complete',
//             paymentType: 'one-time',
//         });
//
//         await newPayment.save();
//
//         // Update the agency's subscription details
//         agency.payment.push(newPayment._id);
//         agency.subscription = subscription._id;
//         agency.issuedPack = userPacks;
//         agency.packs = availablePacks;
//         agency.isActive = true;
//
//         await agency.save();
//
//         res.status(200).json({
//             message: ' payment recorded successfully',
//             orderNumber,
//             agency,
//         });
//     } catch (error) {
//         console.error('Error recording one-time payment:', error);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// };





