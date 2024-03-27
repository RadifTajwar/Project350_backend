const express = require('express');
const router = express.Router();
const errorHandler = require("../utils/errorHandler");
const catchAsyncError = require('../middleware/catchAsyncError');
const User = require('../models/userModel');
const { next } = require("express");
const sendToken = require('../utils/jwtToken');
const sendEmail = require('../utils/sendEmail');
const crypto = require("crypto");
const cloudinary = require('../utils/cloudinary');
const upload = require('../middleware/multer');

// Register a new user
exports.registerUser = catchAsyncError(async (req, res, next) => {
    try {
        // Check if user with the same email already exists
        const existingUser = await User.findOne({ email: req.body.email });
        if (existingUser) {
           
            res.status(400).json({ error: 'User with this email already exists' });
            console.log("yes ase");
        }
        else{
            console.log('dhuke nah')
            const myCloud = await cloudinary.v2.uploader.upload(req.body.image, {
                folder: 'avatars',
                width: 150,
                crop: "scale"
            });
            
            const { name, email, password,userType } = req.body;
            
            // Create a new user with the provided data
            const user = await User.create({
                name, email, password,userType,
                avatar: {
                    public_id: myCloud.public_id,
                    url: myCloud.secure_url
                }
            });
    
            // Send JWT token for authentication
            sendToken(user, 201, res);
            console.log('User Registered Successfully!');
        }
        // Upload and store user avatar image in Cloudinary
       
    } catch (error) {
        console.error('Error registering user:', error);
        // Handle error
        res.status(500).json({ error: 'Failed to register user' });
    }
});

// Login a user
exports.loginUser = catchAsyncError(async (req, res, next) => {
    const { email, password } = req.body;
    console.log(email);
    console.log(password);
    // Check if both email and password are provided
    if (!email || !password) {
       return res.status(400).json({ error: 'Enter email and password' });
    }
    const user = await User.findOne({ email }).select('+password');
    console.log(user);
    if (!user) {
        return res.status(400).json({ error: 'No user found' });
    }

    // Check if the provided password matches the user's password
    const isPasswordMatched = await user.comparePassword(password);
    if (!isPasswordMatched) {
       return res.status(400).json({ error: 'password not matched' });
    }
    console.log(user);
    // Send JWT token for authentication
    res.status(200).json({message : 'successfully logged in user' });
    // sendToken(user, 200, res,user.userType);

    console.log('User Logged In Successfully!');
});

// Logout a user
exports.logOut = catchAsyncError(async (req, res, next) => {
    // Clear the JWT token cookie
    res.cookie('token', null, {
        expires: new Date(Date.now()),
        httpOnly: true
    });

    res.status(200).json({
        success: true,
        message: 'Logged Out!'
    });
});

// Forgot password
exports.forgotPassword = catchAsyncError(async (req, res, next) => {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
        return next(new errorHandler('User not Found! ', 404));
    }

    // Generate and save a reset password token for the user
    const resetToken = await user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    // Construct the reset password URL and send the reset email
    const resetPasswordURL = `${process.env.FRONTEND_URL}password/reset/${resetToken}`;
    const message = `Your password reset token is :- \n\n ${resetPasswordURL}\n\n If you have not requested this email then please ignore it!`;

    try {
        await sendEmail({
            email: user.email,
            subject: 'MediLuxe Password Reset',
            message: message
        });
        res.status(200).json({
            success: true,
            message: `Email Sent to ${user.email} Successfully!`
        });
    } catch (error) {
        user.resetPasswordToken = undefined;
        user.resetPasswordExpiry = undefined;
        await user.save({ validateBeforeSave: false });

        return next(new errorHandler(error.message, 500));
    }
});

// Reset password
exports.resetPassword = catchAsyncError(async (req, res, next) => {
    // Get the reset password token and find the user
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({
        resetPasswordToken: resetPasswordToken,
        resetPasswordExpiry: { $gt: Date.now() }
    });

    if (!user) {
        return next(new errorHandler('Reset Password Token is Invalid or Expired!', 400));
    }

    // Check if the new password and confirm password match
    if (req.body.password !== req.body.confirmPassword) {
        return next(new errorHandler('Password does not Match!', 400));
    }

    // Update the user's password and reset token
    user.password = req.body.password;
    user.resetPasswordExpiry = undefined;
    user.resetPasswordToken = undefined;
    await user.save();

    // Send JWT token for authentication (log the user in)
    sendToken(user, 200, res);
});

// Get user details (logged in user)
exports.getUserDetails = catchAsyncError(async (req, res, next) => {
    const user = await User.findById(req.user.id);

    // Respond with the user's details
    res.status(200).json({
        success: true,
        user
    });
});

// Update password
exports.updatePassword = catchAsyncError(async (req, res, next) => {
    const user = await User.findById(req.user.id).select('+password');

    // Check if the old password matches the current password
    const isPasswordMatched = await user.comparePassword(req.body.oldPassword);
    if (!isPasswordMatched) {
        return next(new errorHandler('Old Password is Incorrect!', 400));
    }

    // Check if the new password and confirm password match
    if (req.body.newPassword !== req.body.confirmPassword) {
        return next(new errorHandler('Password does not Match!', 400));
    }

    // Update the user's password and send JWT token for authentication
    user.password = req.body.newPassword;
    await user.save();
    console.log('Password Changed Successfully!');
    sendToken(user, 200, res);
});

// Update user profile
exports.updateUserProfile = catchAsyncError(async (req, res, next) => {
    // Update user's name and email
    const newUserData = {
        name: req.body.name,
        email: req.body.email
    };

    // Handle avatar update and Cloudinary storage
    if (req.body.avatar !== "") {
        const user = await User.findById(req.user.id);
        const imageId = user.avatar.public_id;
        await cloudinary.v2.uploader.destroy(imageId);

        const myCloud = await cloudinary.v2.uploader.upload(req.body.avatar, {
            folder: 'avatars',
            width: 150,
            crop: "scale"
        });

        newUserData.avatar = {
            public_id: myCloud.public_id,
            url: myCloud.secure_url
        };
    }

    // Update the user profile and respond with the updated user details
    const user = await User.findByIdAndUpdate(req.user.id, newUserData, {
        new: true,
        runValidators: true,
        useFindAndModify: false
    });

    console.log('User Modified Successfully!');
    res.status(200).json({
        success: true,
        user
    });
});

// Get all users (Admin)
exports.getAllUsers = catchAsyncError(async (req, res, next) => {
    // Retrieve all users
    const users = await User.find();

    // Respond with the list of users
    res.status(200).json({
        success: true,
        users
    });
});

// Get details of a single user (Admin)
exports.getSingleUser = catchAsyncError(async (req, res, next) => {
    const user = await User.findById(req.params.id);

    // Check if user exists
    if (!user) {
        return next(new errorHandler(`User does not exist with id:${req.params.id}`, 400));
    }

    // Respond with the user details
    res.status(200).json({
        success: true,
        user
    });
});

// Update user role (Admin)
exports.updateUserRole = catchAsyncError(async (req, res, next) => {
    // Update user's name, email, and role
    const newUserData = {
        name: req.body.name,
        email: req.body.email,
        role: req.body.role
    };

    // Find and update the user's role
    const user = await User.findByIdAndUpdate(req.params.id, newUserData, {
        new: true,
        runValidators: true,
        useFindAndModify: false
    });

    console.log('User Role Updated Successfully!');
    res.status(200).json({
        success: true,
        user
    });
});

// Delete a user (Admin)
exports.deleteUser = catchAsyncError(async (req, res, next) => {
    // Find and delete the user along with their avatar image in Cloudinary
    const user = await User.findById(req.params.id);
    if (!user) {
        return next(new errorHandler(`User does not exist with id:${req.params.id}`, 400));
    }

    const imageId = user.avatar.public_id;
    await cloudinary.v2.uploader.destroy(imageId);
    await user.deleteOne();

    console.log('User Deleted Successfully!');
    res.status(200).json({
        success: true,
        message: 'User Deleted Successfully!',
        user
    });
});

