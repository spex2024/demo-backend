import express from 'express';
import {
    // addOneTimeSubscription,
    // addInstallmentSubscription,
    // addCustomSubscription,
    addSubscription,
    getAllSubscriptions,
} from "../../controller/subscription.js";

const router = express.Router();

// POST route for adding a one-time subscription
router.post('/add', addSubscription);

// // POST route for adding an installment subscription
// router.post('/add/installment', addInstallmentSubscription);
//
// // POST route for adding a custom subscription
// router.post('/add/custom', addCustomSubscription);

// GET route for fetching all subscriptions
router.get('/plans', getAllSubscriptions);

export default router;
