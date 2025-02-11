<template>
  <div id="invite-list-container">
    <h1>Friend Invites</h1>
    <ul id="invite-list">
      <!-- List of invites will be displayed here -->
      <li v-for="invite in invites" :key="invite.id">
        Friend: {{ invite.player_id }}, Status: {{ invite.invited ? 'Invited' : 'Not Invited' }}
      </li>
    </ul>
  </div>
</template>

<script>
import { ref, onMounted, onBeforeUnmount, getCurrentInstance } from 'vue';

export default {
  name: 'InviteListener',
  setup() {
    const invites = ref([]);
    const userId = localStorage.getItem('user_id'); // Retrieve user ID from localStorage
    const token = localStorage.getItem('token');    // Retrieve token from localStorage
    
    if (!userId || !token) {
      console.error("User is not authenticated.");
      return;
    }

    // Accessing Echo instance
    let channel;

    onMounted(() => {
      // Accessing Echo from the Vue instance using getCurrentInstance()
      const { appContext } = getCurrentInstance();
      const echo = appContext.config.globalProperties.$echo;

      if (echo) {
        // Subscribing to a private channel
        channel = echo.private(`user.${userId}`);
        channel.listen('Invite', (event) => {
          console.log('Updated Invites:', event.invites);
          invites.value = event.invites; // Update the invite list
        });
      } else {
        console.error("Echo instance is not available!");
      }
    });

    onBeforeUnmount(() => {
      if (channel) {
        // Unsubscribe from the channel when the component is destroyed
        channel.unsubscribe();
        console.log("Unsubscribed from the channel.");
      }
    });

    return { invites };
  }
};
</script>

<style scoped>
#invite-list {
  list-style-type: none;
  padding: 0;
}

#invite-list li {
  margin: 10px 0;
}
</style>