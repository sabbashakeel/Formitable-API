# Formitable Restaurant Data Importer

This Node.js application fetches restaurant data, including availability and bookings, from the Formitable API and stores it in a PostgreSQL database. It performs automatic table creation, data insertion, and also cleans up old bookings. Logs are maintained to track the process.

# Features
Connects to Formitable API to fetch restaurants, bookings, and availability data.
Stores data in PostgreSQL: Automatically creates tables if they don’t exist, and inserts new records.
Handles old data: Deletes old bookings older than 7 days from the database.
Logs: Outputs logs with timestamps to a file to track progress and errors.
Prerequisites
Node.js installed on your machine.
PostgreSQL installed and running locally or on a server.
Formitable API Key to access the API.
Installation
Clone the repository:

bash
Copy code
git clone https://github.com/sabbashakeel/Formitable-API
Install the dependencies:

bash
Copy code
npm install pg fs path
Set up your PostgreSQL connection:

Update the connectionString with your PostgreSQL credentials in the script:
javascript
Copy code
const connectionString = `postgresql://postgres:PASSWORD@localhost:5432/SCHEMA_NAME?schema=${schemaName}`;
Replace SCHEMA_NAME and PASSWORD with your database information.
Set your Formitable API key:

# Replace YOUR_API_KEY with your actual API key:
javascript
Copy code
const apiKey = 'YOUR_API_KEY';
Log file configuration:

The logs will be saved to a file in the logs directory (output.log). Ensure the logs directory exists, or the script will create it.
Usage
Make sure your PostgreSQL database is running and correctly configured.

Run the script to fetch and store restaurant data:

bash
Copy code
node index.js
The script will:

# Fetch restaurant data from the Formitable API.
Insert restaurants, bookings, and availability data into the PostgreSQL database.
Delete old bookings (older than 7 days).
Log the process and any errors to logs/output.log.
Database Schema
The following tables will be created (if they don’t already exist):

restaurants: Stores basic restaurant information. The uid column is unique.
booking: Stores future bookings for each restaurant. Old bookings (7+ days) are deleted on each run.
availability: Stores availability data for each restaurant based on provided languages.
Logging
The script logs every action and error with timestamps to the logs/output.log file. This helps track the process and debugging.

