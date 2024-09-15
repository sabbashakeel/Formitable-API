const { Client } = require('pg');
const FormitableAPI = require('./FormitableAPI');
const fs = require('fs');
const path = require('path');

const schemaName = 'YOUR_SCHEMA_NAME';
const connectionString = `postgresql://postgres:PASSWORD@localhost:5432/SCHEMA_NAME?schema=${schemaName}`;
const apiKey = 'YOUR_API_KEY';

// Define the log file path
const logFilePath = path.join(__dirname, 'logs', 'output.log');

// Function to log output to the log file with timestamps
function logToFile(message) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logFilePath, `[${timestamp}] ${message}\n`);
}

// Redirect console output to the log file
const originalConsoleLog = console.log;
console.log = (message) => {
  logToFile(message);
};



const client = new Client({
  connectionString: connectionString,
});

class DataImporter {
    constructor(apiKey, connectionString) {
      this.api = new FormitableAPI(apiKey);
      this.client = new Client({
        connectionString: connectionString,
      });
    }

  async connectDatabase() {
    await this.client.connect();
    logToFile('Connected to the PostgreSQL database.');
  }

  async disconnectDatabase() {
    await this.client.end();
    logToFile('Disconnected from the PostgreSQL database.');
  }

  async createTableIfNotExists(tableName, data, uniqueKey = null) {
    try {
      const columns = Object.keys(data).map(column => `"${column}" TEXT`).join(',\n');
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS ${schemaName}.${tableName} (
          ${columns}${uniqueKey ? `,\nCONSTRAINT ${tableName}_uid_unique UNIQUE (uid)` : ''}
        )`;

      await this.client.query(createTableQuery);
      //console.log(`Table '${tableName}' created or already exists.`);
    } catch (error) {
      logToFile(`Error creating table '${tableName}': ${error}`);
    }
  }

  async insertData(tableName, data) {
    try {
      const insertQuery = `
        INSERT INTO ${schemaName}.${tableName} (${Object.keys(data).map(column => `"${column}"`).join(', ')})
        VALUES (${Object.keys(data).map((_, index) => `$${index + 1}`).join(', ')})`;

      const insertValues = Object.values(data);
      await this.client.query(insertQuery, insertValues);
      logToFile(`Data inserted into table '${tableName}'.`);
    } catch (error) {
      //logToFile(`Error inserting data into table '${tableName}': ${error}`);
    }
  }
  async deleteOldBookings() {
    try {
      const currentDate = new Date();
      currentDate.setDate(currentDate.getDate() - 7); // Subtract 7 days from the current date

      const formattedDate = currentDate.toISOString().split('T')[0];

      const deleteQuery = `
        DELETE FROM ${schemaName}.booking
        WHERE TO_DATE(LEFT("bookingDateTime", 10), 'YYYY-MM-DD') >= $1;
      `;

      await this.client.query(deleteQuery, [formattedDate]);
      logToFile(`Deleted old bookings with a date greater than or equal to ${formattedDate}`);
    } catch (error) {
      logToFile(`Error deleting old bookings: ${error}`);
    }
  }

  async insertFutureBookings(bookings) {
    for (const booking of bookings) {
      await this.createTableIfNotExists('booking', booking);
      await this.insertData('booking', booking);
    }
  }

  async insertRestaurantData(restaurant) {
    await this.createTableIfNotExists('restaurants', restaurant, 'uid');
    await this.insertData('restaurants', restaurant);
  }

  async fetchAndInsertData() {
    try {
      await this.connectDatabase();
      this.deleteOldBookings(); // Call the function to delete old bookings
      const restaurants = await this.api.fetchRestaurants();


      // Calculate the fromDate as 7 days before the current date
      const currentDate = new Date();
      const sevenDaysAgo = new Date(currentDate);
      sevenDaysAgo.setDate(currentDate.getDate() - 7);

      const fromDate = sevenDaysAgo.toISOString().split('T')[0];

    // Now, proceed with inserting future bookings
        for (const restaurant of restaurants) {
        await this.insertRestaurantData(restaurant);

        const days = 31;  
        const futureBookings = await this.api.fetchFutureBookings(restaurant.uid, fromDate, days);
        await this.insertFutureBookings(futureBookings);

  // Availability insertion
  const availabilityLanguage = 'Dutch,English';
  const availabilityData = await this.api.fetchAvailabilityForFirst(
    restaurant.uid,
    availabilityLanguage
  );
  if (availabilityData && typeof availabilityData === 'object') {
    await this.createTableIfNotExists('availability', availabilityData);
    const availabilityWithRestaurantUid = { ...availabilityData };
    await this.insertData('availability', availabilityWithRestaurantUid);
  } else {
    logToFile('Availability data is not in the expected format:', availabilityData);
  }


      }

      await this.disconnectDatabase();
      logToFile('Data insertion completed.');
    } catch (error) {
      logToFile(`Error fetching data from the API or inserting into the database: ${error}`);
    }
  }
}

const dataImporter = new DataImporter(apiKey, connectionString);
dataImporter.fetchAndInsertData();
