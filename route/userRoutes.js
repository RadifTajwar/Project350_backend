const express = require('express');
const router = express.Router();

// Import your user model
const User = require('../models/userModel');
const {registerUser} = require('../controller/userController')

// Define routes
router.route('/user').post(registerUser);

// Add more routes as needed

module.exports = router;
