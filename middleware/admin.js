import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();
export const authAdmin = (req, res, next) => {
    const token =
        req.cookies.admin ||
        req.cookies.vendor ||
        req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // // Optional: ensure it's either an admin or vendor
        // if (decoded.role !== 'admin' && decoded.role !== 'vendor') {
        //     return res.status(403).json({ message: 'Access denied. Not authorized.' });
        // }

        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ message: 'Invalid or expired token.' });
    }
};
