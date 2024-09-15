const { Client } = require('pg');
const FormitableAPI = require('./FormitableAPI');
const fs = require('fs');
const path = require('path');

const schemaName = 'middelburg';
const connectionString = `postgresql://postgres:DX7)6Qb!HW5Wf2S*@localhost:5432/centaur?schema=${schemaName}`;
const apiKey = 'CTc3hCbkrz4nR7mms0NeBQFAaXbBFCZ3bO8s47Giez4=';

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


  async insertRestaurantData(restaurant) {
    await this.createTableIfNotExists('restaurants', restaurant, 'uid');
    await this.insertData('restaurants', restaurant);
  }

  async fetchAndInsertData() {
    try {
      await this.connectDatabase();
      const restaurants = await this.api.fetchRestaurants();

      for (const restaurant of restaurants) {
        await this.insertRestaurantData(restaurant);

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
