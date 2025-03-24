import express from "express";
import {
    purchase,
    // // recordInstallmentPayment,
    recordPayment,
    verifyPayment
} from "../../controller/paystack.js";



const router = express.Router();

// POST route for adding a subscription
router.post('/initialize-payment', purchase);
router.get('/verify-payment/:reference', verifyPayment);
router.post('/record-payment', recordPayment);
// router.post('/record-installment', recordInstallmentPayment);

export default router;