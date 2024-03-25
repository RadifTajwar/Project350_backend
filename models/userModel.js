const mongoose = require('mongoose');

// Define the user schema
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true // Ensures that no two users can have the same email
  },
  password: {
    type: String,
    required: true
  }
});

// Create a model based on the schema
const User = mongoose.model('User', userSchema);

module.exports = User;
