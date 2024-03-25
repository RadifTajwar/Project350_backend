const User = require('../models/userModel'); // Import the user model

// Controller function to handle user registration
exports.registerUser = async (req, res) => {
  try {
    // Extract name, email, and password from the request body
    const { name, email, password } = req.body;

    // Check if the email already exists in the database
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    // Create a new user document
    const user = new User({
      name,
      email,
      password // Make sure to hash the password before saving it to the database in a real-world application
    });

    // Save the user to the database
    await user.save();

    // Respond with a success message
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    // If there's an error, respond with an error message
    console.error('Error registering user:', error);
    res.status(500).json({ message: 'Failed to register user' });
  }
};
