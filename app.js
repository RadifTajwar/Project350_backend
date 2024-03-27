// Import the necessary modules for creating an Express app
const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());


// Import the error middleware, body parser, file upload, and dotenv for environment variables

const dotenv = require('dotenv');

// Load environment variables from the config file
dotenv.config({path: '.env'});
console.log(process.env.DB_URI);

// Use JSON parsing and extended URL encoding for request bodies
app.use(express.json());



// Import and use routes for different parts of the API
const userRoutes = require('./route/userRoutes');
app.use('/api',userRoutes);
console.log('object')
// Export the Express app for use in other parts of the application
module.exports = app;
