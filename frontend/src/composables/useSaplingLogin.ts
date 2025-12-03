import { i18n } from '@/i18n'; // Import the internationalization instance
import { ref } from 'vue'; // Import Vue's ref function for creating reactive variables
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader'; // Import a custom composable for loading translations
import axios from 'axios'; // Import Axios for making HTTP requests
import { BACKEND_URL, DEBUG_PASSWORD, DEBUG_USERNAME } from '@/constants/project.constants'; // Import constants for backend URL and debug credentials
import type { PersonItem } from '@/entity/entity'; // Import the PersonItem type for type safety
import CookieService from '@/services/cookie.service';

export function useSaplingLogin() {
  //#region State
  // Reactive properties for email and password, initialized with debug credentials
  const email = ref(CookieService.get('username') || DEBUG_USERNAME);
  const password = ref(CookieService.get('password') || DEBUG_PASSWORD);
  const rememberMe = ref(CookieService.get('rememberMe') === 'true');

  // Load translations for the login module
  const { translationService, isLoading } = useTranslationLoader('login');

  // Reactive property for storing error messages
  const messages = ref<string[]>([]);

  // Reactive properties for managing the password change dialog
  const showPasswordChange = ref(false);
  const requirePasswordChange = ref(false);

  // Reactive property for storing the logged-in user's data
  const personData = ref<PersonItem | null>(null);
  //#endregion

  //#region Login
  // Function to handle the login process
  async function handleLogin() {
    try {
      // Send a POST request to the backend to log in
      await axios.post(BACKEND_URL + 'auth/local/login', {
        loginName: email.value,
        loginPassword: password.value,
      });

      // After login, fetch the current user's data
      const response = await axios.get(BACKEND_URL + 'current/person');
      personData.value = response.data;

      // Set cookies if "remember me" is checked
      setRememberMe();

      // Check if the user is required to change their password
      if (personData.value?.requirePasswordChange) {
        requirePasswordChange.value = true;
        showPasswordChange.value = true;
        // Do not redirect, show the password change dialog
      } else {
        // Redirect to the home page if no password change is required
        window.location.href = '/';
      }
    } catch {
      // Add an error message if the login fails
      messages.value.push(i18n.global.t('login.wrongCredentials'));
    }
  }

  // Function to handle successful password change
  function handlePasswordChangeSuccess() {
    showPasswordChange.value = false; // Hide the password change dialog
    window.location.href = '/'; // Redirect to the home page
  }

  // Function to handle successful password change
  function setRememberMe() {
    if (!rememberMe.value) {
      CookieService.delete('username'); // Delete the username cookie
      CookieService.delete('password'); // Delete the password cookie
      CookieService.delete('rememberMe'); // Delete the rememberMe cookie
      return;
    }
    
    CookieService.set('username', email.value); // Save the username in a cookie
    CookieService.set('password', password.value); // Save the password in a cookie
    CookieService.set('rememberMe', rememberMe.value.toString()); // Save the rememberMe state in a cookie
  }
  //#endregion

  //#region Azure
  // Function to handle Azure login
  function handleAzure() {
    window.location.href = BACKEND_URL + 'auth/azure/login'; // Redirect to Azure login
  }
  //#endregion

  //#region Google
  // Function to handle Google login
  function handleGoogle() {
    window.location.href = BACKEND_URL + 'auth/google/login'; // Redirect to Google login
  }
  //#endregion
  
  //#region Return
  // Return all reactive properties and methods for use in components
  return {
    email,
    password,
    rememberMe,
    isLoading,
    messages,
    translationService,
    handleLogin,
    handleAzure,
    handleGoogle,
    showPasswordChange,
    requirePasswordChange,
    handlePasswordChangeSuccess
  };
  //#endregion
}
