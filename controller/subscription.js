import Subscription from "../model/add-subscription.js";



// Function to handle adding a subscription
export const addSubscription = async (req, res) => {
    const { plan, pricePerHead, features } = req.body;

    try {
        // Validate plan
        const validPlans = ['Gold', 'Silver', 'Bronze', 'Demo'];
        if (!validPlans.includes(plan)) {
            return res.status(400).json({ error: 'Invalid plan. Choose Gold, Silver, or Bronze.' });
        }

        // Check if the plan already exists
        const existingSubscription = await Subscription.findOne({ plan });
        if (existingSubscription) {
            return res.status(400).json({ error: 'Plan already exists. Please choose a different plan name.' });
        }

        // Create a new subscription
        const newSubscription = await Subscription.create({
            plan,
            pricePerHead,
            features,
        });

        return res.status(201).json(newSubscription);
    } catch (error) {
        console.error('Error adding subscription:', error);
        return res.status(500).json({ error: 'Failed to add subscription' });
    }
};



// Function to handle installment subscription payments


// export const addInstallmentSubscription = async (req, res) => {
//     const { plan, price, features, staff, installmentDuration, monthlyPayment } = req.body;
//
//     try {
//         // Check if the plan already exists
//         const existingSubscription = await Subscription.findOne({ monthlyPayment });
//
//         if (existingSubscription) {
//             return res.status(400).json({ error: 'Plan already exists. Please choose a different plan name.' });
//         }
//         const monthly = Number(monthlyPayment);
//         // Create a new installment subscription
//         const newSubscription = await Subscription.create({
//             plan,
//             price,
//             paymentType: 'installment', // Set paymentType to installment
//             staff,
//             features,
//             installmentDuration, // Include the installment duration
//             monthlyPayment:monthly,
//         });
//
//         return res.status(201).json(newSubscription);
//     } catch (error) {
//         console.error('Error adding installment subscription:', error);
//         return res.status(500).json({ error: error.message});
//     }
// };
//
// // Function to handle custom subscription payments
// export const addCustomSubscription = async (req, res) => {
//     const { plan, price, features, staff, monthlyPayment } = req.body;
//
//     try {
//         // Check if the plan already exists
//         const existingSubscription = await Subscription.findOne({ plan });
//
//         if (existingSubscription) {
//             return res.status(400).json({ error: 'Plan already exists. Please choose a different plan name.' });
//         }
//         const monthly = Number(monthlyPayment);
//         // Create a new custom subscription
//         const newSubscription = await Subscription.create({
//             plan,
//             price,
//             paymentType: 'custom', // Set paymentType to custom
//             staff,
//             features,
//             monthlyPayment : monthly,
//         });
//
//         return res.status(201).json(newSubscription);
//     } catch (error) {
//         console.error('Error adding custom subscription:', error);
//         return res.status(500).json({ error: 'Failed to add custom subscription' });
//     }
// };

// Function to get all subscriptions
export const getAllSubscriptions = async (req, res) => {
    try {
        const subscriptions = await Subscription.find({});
        return res.status(200).json(subscriptions);
    } catch (error) {
        console.error('Error fetching subscriptions:', error);
        return res.status(500).json({ error: 'Failed to fetch subscriptions' });
    }
};
