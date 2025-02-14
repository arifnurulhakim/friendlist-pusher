<template>
    <transition name="slide">
      <div v-if="showPopup" class="notification-popup">
        <p>{{ message }}</p>
      </div>
    </transition>
  </template>
  
  <script>
  import { ref } from 'vue';
  
  export default {
    name: 'PopupNotification',
    setup() {
      const showPopup = ref(false);
      const message = ref('');
  
      const show = (msg) => {
        message.value = msg;
        showPopup.value = true;
  
        // Automatically hide the notification after 3 seconds
        setTimeout(() => {
          showPopup.value = false;
        }, 3000);
      };
  
      return { showPopup, message, show };
    }
  };
  </script>
  
  <style scoped>
  .notification-popup {
    position: fixed;
    top: 20px;
    right: 20px;
    background-color: #4CAF50; /* Green background */
    color: white;
    padding: 15px;
    border-radius: 5px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    z-index: 1000;
  }
  
  /* Slide-in and slide-out animation */
  .slide-enter-active,
  .slide-leave-active {
    transition: transform 0.5s ease, opacity 0.5s ease;
  }
  
  .slide-enter-from,
  .slide-leave-to {
    transform: translateX(100%);
    opacity: 0;
  }
  
  .slide-enter-to,
  .slide-leave-from {
    transform: translateX(0);
    opacity: 1;
  }
  </style>