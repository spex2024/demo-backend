import {Meal, Vendor} from '../model/vendor.js';
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { v2 as cloudinary } from 'cloudinary';
import upload from '../middleware/multer-upload.js';
import Agency from "../model/agency.js";
import User from "../model/user.js";
import Admin from "../model/admin.js";
import Order from "../model/order.js";
import {sendMail} from "../helper/mail.js";

dotenv.config();

const URL_APP = "https://vendor.spexafrica.app";
const URL_SITE = "https://vendor.spexafrica.site";
const VERIFY_APP = "https://api.spexafrica.app";
const VERIFY_SITE = "https://api.spexafrica.site";

// Development URLs
const DEV_SITE_URL = "http://localhost:3000"; // or http://localhost:3001
const DEV_VERIFY_URL = "http://localhost:8080";

const getUrlBasedOnReferer = (req) => {
    const referer = req.headers.referer || req.headers.origin || '';

    if (referer.includes('localhost')) {
        return { baseUrl: DEV_SITE_URL, verifyUrl: DEV_VERIFY_URL };
    } else if (referer.includes('.site')) {
        return { baseUrl: URL_SITE, verifyUrl: VERIFY_SITE };
    }

    return { baseUrl: URL_APP, verifyUrl: VERIFY_APP };
};



const sendVerificationEmail = async (vendor, emailToken, req) => {
    const { verifyUrl } = getUrlBasedOnReferer(req);
    const url = `${verifyUrl}/api/vendor/verify/${emailToken}`;
    console.log(verifyUrl)
    await sendMail({
        to: vendor.email,
        subject: 'Account Verification',
        template: 'verification', // Assuming your EJS file is 'verification.ejs'
        context: {
            username: vendor.name,
            verificationLink: url,
            code: vendor.code,
        }
    });
};
const sendResetEmail = async (vendor, resetToken, req) => {
    const { baseUrl } = getUrlBasedOnReferer(req);
    const url = `${baseUrl}/reset/password-reset?token=${resetToken}`;

    await sendMail({
        to: vendor.email,
        subject: 'Password Reset',
        template: 'reset', // Assuming your EJS file is 'verification.ejs'
        context: {
            username: vendor.mail,
            resetLink: url,
        }
    });
};

const generateToken = (payload, expiresIn) => {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

const generateVendorCode = (name, location) => {
    const firstLetterOfName = name.charAt(0).toUpperCase();
    const firstLetterOfLocation = location.charAt(0).toUpperCase();
    const randomThreeDigitNumber = Math.floor(100 + Math.random() * 900); // Generates a random 3-digit number

    return `${firstLetterOfName}${firstLetterOfLocation}${randomThreeDigitNumber}`;
};

// Helper function to update the vendor code
const updateVendorCode = (vendorCode, updatedName, updatedLocation) => {
    // Length of the numeric part (assumed to be 3 digits)
    const numericPartLength = 3;

    // Extract the numeric part from the vendorCode
    const numericPart = vendorCode.slice(-numericPartLength); // Last 3 digits
    // Generate new initials based on updated name and location
    const firstLetterOfName = updatedName.charAt(0).toUpperCase();
    const firstLetterOfLocation = updatedLocation.charAt(0).toUpperCase();
    const newInitials = `${firstLetterOfName}${firstLetterOfLocation}`;

    // Reconstruct the updated vendor code
    const updatedVendorCode = `${newInitials}${numericPart}`;

    return updatedVendorCode;
};

// Vendor registration
export const createVendor = async (req, res) => {
    const uploadSingle = upload.single('profilePhoto');
    uploadSingle(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ message: "Multer error", error: err.message });
        }

        const { company: name, email, location, owner, password, phone } = req.body;
        const profilePhoto = req.file;

        if (!name || !location || !phone || !owner) {
            return res.status(400).json({ message: "Please fill in all required fields" });
        }

        try {
            const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
            const existingVendor = await Vendor.findOne({ $or: [{ email }, { phone }] });
            const existingAgency = await Agency.findOne({ $or: [{ email }, { phone }] });
            const existingAdmin = await Admin.findOne({ $or: [{ email }, { phone }] });

            if (existingUser || existingVendor || existingAgency || existingAdmin) {
                return res.status(400).json({ message: "Email or phone already in use by another account" });
            }


            let uploadedPhoto = null;
            if (profilePhoto) {
                uploadedPhoto = await new Promise((resolve, reject) => {
                    cloudinary.uploader.upload_stream(
                        {
                            folder: 'vendors',
                            transformation: [
                                { quality: 'auto', fetch_format: 'auto' },
                                { crop: 'fill', gravity: 'auto', width: 500, height: 600 }
                            ]
                        },
                        (error, result) => {
                            if (error) {
                                return reject(error);
                            }
                            resolve(result);
                        }
                    ).end(profilePhoto.buffer);
                });
            }

            const vendorCode = generateVendorCode(name, location);
            const hashedPassword = await bcrypt.hash(password, 10);
            const vendor = await Vendor.create({
                name,
                email,
                location,
                phone,
                password: hashedPassword,
                owner,
                code: vendorCode,
                imageUrl: uploadedPhoto ? uploadedPhoto.secure_url : null,
                imagePublicId: uploadedPhoto ? uploadedPhoto.public_id : null,
                isVerified: false,
            });

            const emailToken = generateToken({ vendorId: vendor._id, email: vendor.email }, '2m');
            await sendVerificationEmail(vendor, emailToken ,req);

            setTimeout(async () => {
                try {
                    const vendorToDelete = await Vendor.findOne({ email: vendor.email });
                    if (vendorToDelete && vendorToDelete.isVerified === false) {
                        await Vendor.deleteOne({ email });
                    }
                } catch (error) {
                    console.error(`Error deleting vendor ${email}:`, error.message);
                }
            }, 60 * 60 * 1000);

            res.status(200).json({ message: "Vendor registered successfully. Please check your email for verification link." });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message:error.message });
        }
    });
};
export const addVendor = async (req, res) => {
    const uploadSingle = upload.single("profilePhoto");
    uploadSingle(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ message: "Multer error", error: err.message });
        }

        const { name, email, location, owner, password, phone, categories } = req.body;
        const profilePhoto = req.file;

        console.log("data:", name)

        if (!name || !location || !phone || !owner) {
            return res.status(400).json({ message: "Please fill in all required fields" });

        }

        try {
            // Check if the email or phone is already in use
            const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
            const existingVendor = await Vendor.findOne({ $or: [{ email }, { phone }] });
            const existingAgency = await Agency.findOne({ $or: [{ email }, { phone }] });
            const existingAdmin = await Admin.findOne({ $or: [{ email }, { phone }] });

            if (existingUser || existingVendor || existingAgency || existingAdmin) {
                return res.status(400).json({ message: "Email or phone already in use by another account" });
            }

            // Upload the profile photo if provided
            let uploadedPhoto = null;
            if (profilePhoto) {
                uploadedPhoto = await new Promise((resolve, reject) => {
                    cloudinary.uploader.upload_stream(
                        {
                            folder: "vendors",
                            transformation: [
                                { quality: "auto", fetch_format: "auto" },
                                { crop: "fill", gravity: "auto", width: 500, height: 600 },
                            ],
                        },
                        (error, result) => {
                            if (error) {
                                return reject(error);
                            }
                            resolve(result);
                        }
                    ).end(profilePhoto.buffer);
                });
            }

            // Generate vendor code
            const vendorCode = generateVendorCode(name, location);
            const hashedPassword = await bcrypt.hash(password, 10);

            // Ensure valid categories (only allow Gold, Silver, Bronze, Demo)
            const validCategories = ["Gold", "Silver", "Bronze", "Demo"];
            const assignedCategories = Array.isArray(categories)
                ? categories.filter((cat) => validCategories.includes(cat))
                : ["Demo"]; // Default to Demo if no valid category is provided

            // Create the vendor
            const vendor = await Vendor.create({
                name,
                email,
                location,
                phone,
                password: hashedPassword,
                owner,
                code: vendorCode,
                imageUrl: uploadedPhoto ? uploadedPhoto.secure_url : null,
                imagePublicId: uploadedPhoto ? uploadedPhoto.public_id : null,
                isVerified: true,
                categories: assignedCategories, // Assign categories here
            });

            res.status(200).json({
                message: "Vendor registered successfully. Check your email for your Account ID",
                vendor,
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: error.message });
        }
    });
};


// Verify vendor email
export const verifyEmail = async (req, res) => {
    const token = req.params.token;

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const vendor = await Vendor.findOne({ email: decoded.email });

        if (!vendor) {
            return res.status(404).json({ message: 'Vendor not found' });
        }

        if (vendor.isVerified) {
            res.redirect(`${getUrlBasedOnReferer(req).baseUrl}/verify?status=verified`);
        }

        await Vendor.findOneAndUpdate({ email: decoded.email }, { isVerified: true });



        res.redirect(`${getUrlBasedOnReferer(req).baseUrl}/verify?status=success`);
    } catch (error) {
        if (error.name === 'TokenExpiredError') {

            res.redirect(`${getUrlBasedOnReferer(req).baseUrl}/verify?status=expired`);
        }
        console.error(error.message);
        if (!res.headersSent) {
            return res.status(500).send('Server Error');
        }
    }
};

// Resend verification email
export const resendVerificationEmail = async (req, res) => {
    const { email } = req.body;

    try {
        const vendor = await Vendor.findOne({ email });
        if (!vendor) {
            return res.status(404).json({ message: 'Vendor not found' });
        }

        if (vendor.isVerified) {
            return res.status(400).json({ message: 'Vendor already verified' });
        }

        const token = jwt.sign({ email: vendor.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
        await sendVerificationEmail(vendor, token);

        res.status(200).json({ message: 'Verification email sent successfully' });
    } catch (error) {
        console.error(error.message);
        res.status(500).send({message:error.message});
    }
};

// Vendor sign-in
export const signIn = async (req, res) => {
    const { email, password } = req.body;

    try {
        const vendor = await Vendor.findOne({ email });

        if (!vendor) {
            return res.status(400).json({ message: 'Account does not exist' });
        }

        if (!vendor.isVerified) {
            return res.status(400).json({ message: 'Please verify your email first.' });
        }

        const match = await bcrypt.compare(password, vendor.password);
        if (!match) {
            return res.status(400).json({ message: 'Incorrect password.' });
        }

        const payload = {
            id: vendor._id,
            email: vendor.email,
            role: 'vendor'
        };

        const token = generateToken(payload, '1d');

        const cookieOptions = {
            httpOnly: true,
            sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'strict',
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000,
        };

        // Set cookie for spexafrica.app and its subdomains
        res.cookie('vendor', token, { ...cookieOptions, domain: '.spexafrica.app' });
        // Set cookie for spexafrica.site and its subdomains
        res.cookie('vendor', token, { ...cookieOptions, domain: '.spexafrica.site' });
        res.cookie('vendor', token, { ...cookieOptions, domain: '' });

        res.json({ message: 'Login successful' });
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
};

// Get current vendor
export const getCurrentVendor = async (req, res) => {
    const token = req.cookies.vendor;

    if (!token) {
        return res.status(401).json({ message: 'Unauthorized access' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const vendor = await Vendor.findById(decoded.id).populate('meals').populate({
            path:'agencies',
            populate:{
                path:'users',
                populate:{
                    path: 'orders',
                    populate:[{path:'user'},{path:'vendor'}],
                }
            }}).populate({
            path:'orders',
            populate : [{
                path: 'user',
                populate:'agency'
            },{
                path: 'vendor',
            }
            ]



        });

        if (!vendor) {
            return res.status(404).json({ message: 'Vendor not found' });
        }


        res.status(200).json(vendor);
    } catch (error) {
        console.error(error.message);
        res.status(500).send(`${error.message}`);
    }
};
export const getSharedVendors = async (req, res) => {
    try {
        const user = req.user; // Assume the user is attached to the request

        if (!user) {
            return res.status(401).json({ message: 'Unauthorized access' });
        }

        // Get the user's agency or agencies
        let userAgencies = user.agency;

        // If userAgencies is not an array, convert it to an array
        if (!Array.isArray(userAgencies)) {
            userAgencies = [userAgencies];
        }

        // Find vendors that belong to any of the user's agencies
        const sharedVendors = await Vendor.find({
            agencies: { $in: userAgencies }  // Query vendors with matching agencies
        })
            .populate({
                path: 'meals',  // This ensures you're populating the 'meals' field
                model: 'Meal'   // Make sure this is the correct model name in your app
            });

        // Map the vendor data along with their populated meals
        const result = sharedVendors.map(vendor => ({
            vendorName: vendor.name,
            vendorLocation: vendor.location,
            meals: vendor.meals
        }));

        res.status(200).json(result);
    } catch (error) {
        console.error(error.message);
        res.status(500).send(error.message);
    }
};





// Reset password request
export const resetPasswordRequest = async (req, res) => {
    const { email } = req.body;

    try {
        const vendor = await Vendor.findOne({ email });

        if (!vendor) {
            return res.status(404).json({ message: 'Vendor not found' });
        }

        const resetToken = generateToken({ vendorId: vendor._id, email: vendor.email }, '1h');
        await sendResetEmail(vendor, resetToken);

        res.status(200).json({ message: 'Password reset email sent successfully' });
    } catch (error) {
        console.error(error.message);
        res.status(500).send({message: error.message});
    }
};

// Reset password
export const resetPassword = async (req, res) => {
    const { token, newPassword:password } = req.body;

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const vendor = await Vendor.findById(decoded.vendorId);

        if (!vendor) {
            return res.status(404).json({ message: 'Vendor not found' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        vendor.password = hashedPassword;
        await vendor.save();

        res.status(200).json({ message: 'Password reset successful' });
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
};

// Update vendor
export const updateVendor = async (req, res) => {
    const uploadSingle = upload.single('profilePhoto');
    uploadSingle(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ message: "Multer error", error: err.message });
        }

        const { company, email, phone, location  ,owner} = req.body;
        const profilePhoto = req.file;
        const vendorId = req.params.vendorId;
        try {
            // Find the vendor by ID
            const vendor = await Vendor.findById(vendorId);
            if (!vendor) return res.status(404).json({ message: "Vendor not found" });

            // Check if email or phone already exists for another vendor, agency, or admin
            const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
            const existingAgency = await Agency.findOne({ $or: [{ email }, { phone }] });
            const existingAdmin = await Admin.findOne({ $or: [{ email }, { phone }] });

            if (existingUser || existingAgency ) {
                return res.status(400).json({ message: "Email or phone already in use by another account" });
            }

            if (company || owner|| phone || email) {
                vendor.name= company|| vendor.name;
                vendor.location = location|| vendor.location;
                vendor.phone = phone || vendor.phone;
                vendor.email = email || vendor.email;
                vendor.owner = owner || vendor.owner;
            }

            // Update vendor code based on the new first and last names
            vendor.code = updateVendorCode(vendor.code, company, location);

            // Handle profile photo update
            if (profilePhoto) {
                // Delete old image from Cloudinary if it exists
                if (vendor.imagePublicId) {
                    await cloudinary.uploader.destroy(vendor.imagePublicId);
                }

                // Upload new image to Cloudinary
                const uploadedPhoto = await new Promise((resolve, reject) => {
                    cloudinary.uploader.upload_stream(
                        { folder: 'vendors', transformation: [{ crop: 'fill', width: 500, height: 600 }] },
                        (error, result) => {
                            if (error) {
                                return reject(error);
                            }
                            resolve(result);
                        }
                    ).end(profilePhoto.buffer);
                });

                // Update vendor with new image details
                vendor.imageUrl = uploadedPhoto.secure_url;
                vendor.imagePublicId = uploadedPhoto.public_id;
            }

            // Save updated vendor
            await vendor.save();
            res.status(200).json({ message: "Vendor updated successfully", vendor });

        } catch (error) {
            console.error(error.message);
            res.status(500).json({ message: error.message });
        }
    });
};


// Vendor sign-out
export const signOut = (req, res) => {
    try {
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
        };
        // Set cookie for spexafrica.app and its subdomains
        res.clearCookie('vendor',  { ...cookieOptions, domain: '.spexafrica.app' });
        // Set cookie for spexafrica.site and its subdomains
        res.clearCookie('vendor',  { ...cookieOptions, domain: '.spexafrica.site' });
        res.status(200).json({ message: 'Logout successful' });
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
};

// Get all vendors and populate agencies
export const getAllVendors = async (req, res) => {
    try {
        const vendors = await Vendor.find().populate('agencies').populate('meals');

        if (!vendors || vendors.length === 0) {
            return res.status(404).json({ message: 'No vendors found' });
        }

        res.status(200).json(vendors);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
};

export const getVendor= async (req, res) => {
    const vendorId = req.params.vendorId;
    try {
        const vendor = await Vendor.find(vendorId)

        if (!vendor || vendor.length === 0) {
            return res.status(404).json({ message: 'No vendors found' });
        }

        res.status(200).json(vendor);
    } catch (error) {
        console.error(error.message);
        res.status(500).send(`${error.message}`);
    }
};




// Delete vendor controller
export const deleteVendor = async (req, res) => {
    const { vendorId } = req.params;

    try {
        // Find the vendor by ID
        const vendor = await Vendor.findById(vendorId).populate('meals').populate('orders');

        if (!vendor) {
            return res.status(404).json({ message: 'Vendor not found' });
        }

        // 1. Disconnect vendor from associated agencies
        await Agency.updateMany(
            { vendors: vendorId },
            { $pull: { vendors: vendorId } }
        );

        // 2. Delete all meals associated with the vendor
        const mealIds = vendor.meals.map((meal) => meal._id);
        await Meal.deleteMany({ _id: { $in: mealIds } });

        // 3. Delete all orders associated with the vendor
        const orderIds = vendor.orders.map((order) => order._id);
        await Order.deleteMany({ _id: { $in: orderIds } });

        // 4. Optionally, delete the vendor's profile photo from Cloudinary (if it exists)
        if (vendor.imagePublicId) {
            await cloudinary.uploader.destroy(vendor.imagePublicId);
        }

        // 5. Finally, delete the vendor itself
        await Vendor.findByIdAndDelete(vendorId);

        res.status(200).json({ message: 'Vendor deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

