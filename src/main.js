import { createApp } from 'vue';
import App from './App.vue';

// Import Laravel Echo and Pusher
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// Import Axios
import axios from 'axios';

// Set up Vue app
const app = createApp(App);
const baseUrl = import.meta.env.VITE_BASE_URL || '';

// Define login function
const login = async () => {
  try {
    // Make API request to login
    const response = await axios.post(`${baseUrl}/api/playersLogin`, {
      email_or_username: 'behkm2',  // Example username or email
      password: 'password'           // Example password
    });
    console.log(response.data.data.token);
    // Check if login was successful and store the token
    if (response.data.data.token) {
      localStorage.setItem('token', response.data.data.token);
      localStorage.setItem('user_id', response.data.data.id);

      return response.data.data.token;
    }
  } catch (error) {
    console.error('Login failed:', error);
    return null;
  }
};

// Initialize Echo after login
const initializeEcho = async () => {
  const token = await login();
  if (token) {

    window.Pusher = Pusher;

    window.Echo = new Echo({
      broadcaster: 'pusher',
      key: 'a7b6de51c5d845967222',
      cluster: 'ap1',
      forceTLS: false,  // Make sure this is false for local development
      disableStats: true,
      authEndpoint: `${baseUrl}/api/broadcasting/auth`,
      auth: {
        headers: {
          'Authorization': `Bearer ${token}`  // Use the token from login
        }
      }
    });

    // Now, you can use echo to listen for events.
    app.config.globalProperties.$echo = window.Echo;

    app.mount('#app');
  }
};

// Call the function to initialize everything
initializeEcho();