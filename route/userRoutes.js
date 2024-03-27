const express = require('express');
const router = express.Router();
const cloudinary = require('../utils/cloudinary');
const upload = require('../middleware/multer');
// Import your user model

const {registerUser, loginUser} = require('../controller/userController')

// Define routes
router.route('/user/signup').post(registerUser);
router.route('/user/login').post(loginUser)
// Add more routes as needed

module.exports = router;
