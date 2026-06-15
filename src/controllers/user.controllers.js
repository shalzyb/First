const User = require("../models/user.models");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { token } = require("morgan");
const { sendEmail, sendTemplateEmail } = require("../../utils/email");

const signUp = async (req, res) => {
    const { firstName, lastName, email, password } = req.body;
    try {

        if (!firstName || !lastName || !email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }
        const user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: "User already exists" });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const otp = Math.floor(100000 + Math.random() * 900000).toString();// To generate a 6-digit OTP
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // OTP valid for 10 minutes
        const newUser = new User({ firstName, lastName, email, password: hashedPassword, otp, otpExpiry });

        await newUser.save();

        sendTemplateEmail(
            email,
            "Welcome to TechyJaunt",
            "signup",
            {
                firstName,
                lastName,
                email,
                loginLink: `${process.env.APP_URL || 'http://localhost:3000'}/login`,
                passwordMessage: "Your password has been securely saved.",
                verificationLink: `${process.env.APP_URL || 'http://localhost:3000'}/verify?email=${encodeURIComponent(email)}&otp=${otp}`
            }
        ).catch((error) => console.error('Signup email send failed:', error));

        const userResponse = {
            id: newUser._id,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            email: newUser.email
        };
        return res.status(201).json({ message: "User created successfully", user: userResponse, });
    } catch (e) {
        console.log(e);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

const signIn = async (req, res) => {
    const { email, password } = req.body;
    try {
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        if (!user.isVerified) {
            return res.status(400).json({ message: "Please verify your email before signing in" });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid email or password" });
        }
        const token = jwt.sign({ id: user._id, firstName: user.firstName, }, process.env.JWT_SECRET, {
            expiresIn: "1h",
        });


        const userResponse = {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            token: token,
            role: user.role
        };
        return res.status(200).json({ message: "Sign in successful", userResponse });
    } catch (e) {
        console.log(e);
        return res.status(500).json({ message: "Internal Server Error" });
        console.log("Request body:", req.body);

        const user = await User.findOne({ email });
        console.log("User found:", user);

        if (!user) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        if (!user.isVerified) {
            return res.status(400).json({ message: "Please verify your email before signing in" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        console.log("Password match:", isMatch);
    }
};

const makeAdmin = async (req, res) => {
    const { userId } = req.params;
    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        user.role = "admin";
        await user.save();

        // Send admin promotion email
        sendTemplateEmail(
            user.email,
            "🎉 You've Been Promoted to Admin!",
            "makeadmin",
            {
                userName: user.firstName,
                userEmail: user.email,
                promotedBy: req.user?.firstName || "System Administrator",
                promotionDate: new Date().toLocaleDateString(),
                adminLink: `${process.env.APP_URL || 'http://localhost:3000'}/admin`
            }
        ).catch((error) => console.error('Admin promotion email send failed:', error));

        return res.status(200).json({ message: "User role updated to admin" });
    } catch (e) {
        console.log(e);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

const getAllUsers = async (req, res) => {
    if (req.user.role !== "admin") {
        return res.status(403).json({ message: "you are not authorized to perform this action" });
    }
    try {
        const users = await User.find().select("-password");
        return res.status(200).json({ users });
    } catch (e) {
        console.log(e);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

const verifyEmail = async (req, res) => {
    const { email, otp } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: "Invalid OTP" });
        }

        if (user.otpExpiry < new Date()) {
            return res.status(400).json({ message: "OTP has expired" });
        }

        user.isVerified = true;
        user.otp = undefined;
        await user.save();


        return res.status(200).json({ message: "Email verified successfully" });
    } catch (e) {
        console.log(e);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
const resendOtp = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        // Generate a new OTP and update the user document
        const otp = Math.floor(100000 + Math.random() * 900000).toString(); // Generate a 6-digit OTP
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // OTP expires in 10 minutes
        user.otp = otp;
        user.otpExpiry = otpExpiry;
        await user.save();

        // Send OTP via email using template
        sendTemplateEmail(
            user.email,
            "Your Verification Code",
            "resendotp",
            {
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                otp: otp,
                expiryMinutes: 10
            }
        ).catch((error) => console.error('Resend OTP email send failed:', error));

        return res.status(200).json({ message: "OTP resent successfully" });
    } catch (e) {
        console.log(e);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

module.exports = {
    signUp,
    signIn,
    makeAdmin,
    resendOtp,
    verifyEmail,
    getAllUsers,

};