const axios = require('axios');

class FormitableAPI {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  async fetchRestaurants() {
    try {
      const response = await axios.get('https://api.formitable.com/api/v1.2/restaurants', {
        headers: {
          ApiKey: this.apiKey,
          Accept: 'application/json',
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching restaurants:', error);
      return [];
    }
  }

  async fetchFutureBookings(restaurantUid, fromDate, days) {
    try {
      const response = await axios.get(`https://api.formitable.com/api/v1.2/${restaurantUid}/booking/${fromDate}/${days}`, {
        headers: {
          ApiKey: this.apiKey,
          Accept: 'application/json',
        },
      });

      return response.data;
    } catch (error) {
      console.error(`Error fetching future bookings for restaurant with UID '${restaurantUid}':`, error);
      return [];
    }
  }

  async fetchAvailabilityForFirst(restaurantUid, language) {
    try {
      const response = await axios.get(`https://api.formitable.com/api/v1.2/${restaurantUid}/availability/first/${language}`, {
        headers: {
          ApiKey: this.apiKey,
          Accept: 'application/json',
        },
      });
  
      return response.data;
    } catch (error) {
      console.error(`Error fetching availability data for restaurant with UID '${restaurantUid}':`, error);
      return [];
    }
  }
}

module.exports = FormitableAPI;
