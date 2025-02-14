<template>
  <div id="friend-list-container">
    <h1>Friend List</h1>
    
    <!-- Tabs for Friend List and Invites -->
    <div class="tabs">
      <button @click="activeTab = 'friends'" :class="{ active: activeTab === 'friends' }">Friends</button>
      <button @click="activeTab = 'invites'" :class="{ active: activeTab === 'invites' }">Invites</button>
    </div>

    <!-- Friend List Section -->
    <div v-if="activeTab === 'friends'">
      <h2>Online Friends</h2>
      <ul>
        <li v-for="friend in onlineFriends" :key="friend.id">
          {{ friend.friend_name }} (Online)
        </li>
      </ul>

      <h2>Offline Friends</h2>
      <ul>
        <li v-for="friend in offlineFriends" :key="friend.id">
          {{ friend.friend_name }} (Offline)
        </li>
      </ul>
    </div>

    <!-- Invites Section -->
    <div v-if="activeTab === 'invites'">
      <h2>Friend Requests</h2>
      <ul>
        <li v-for="fr in friendRequest" :key="fr.id">
  {{ fr.friend_name }} (ID: {{ fr.friend_id }})
  <button @click="() => { console.log('Klik Accept:', fr.friend_id); acceptInvite(fr.id); }">
    Accept
  </button>
  <button @click="() => { console.log('Klik Decline:', fr.friend_id); declineInvite(fr.id); }">
    Decline
  </button>
</li>
      </ul>
    </div>

    <PopupNotification ref="popupNotification" />
  </div>
</template>

<script>
import { ref, onMounted, onBeforeUnmount, getCurrentInstance, computed, watch } from 'vue';
import PopupNotification from './PopupNotification.vue';

export default {
  name: 'InviteListener',
  components: {
    PopupNotification
  },
  setup() {
    const activeTab = ref('friends'); // Default tab
    const friends = ref([]); // All friends
    const invites = ref([]); // Friend requests
    const friendRequest = ref([]); // Temporary variable for friend requests
    const popupNotification = ref(null);
    const userId = localStorage.getItem('user_id');
    const token = localStorage.getItem('token');

    if (!userId || !token) {
      console.error("User is not authenticated.");
      return;
    }

    // Fetch friend list from API
    const fetchFriendList = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/api/friendlist', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
       
        
        friends.value = data.data || [];
      } catch (error) {
        console.error("Failed to fetch friend list:", error);
      }
    };

    // Fetch friend invites from API
    const fetchFriendInvites = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/api/friendlist-invite', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
         // Debugging: Log the API response
        friendRequest.value = data.data || []; // Ensure this matches the API response structure
      } catch (error) {
        console.error("Failed to fetch friend invites:", error);
      }
    };

    // Accept a friend request
    const acceptInvite = async (inviteId) => {
  try {
    console.log("Accepting invite:", inviteId);
    
    const response = await fetch(`http://127.0.0.1:8000/api/friendlist-accept/${inviteId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json' // Tambahkan content type
      }
    });

    const result = await response.json();
    console.log("API Response:", result); // Lihat respons dari API

    if (response.ok) {
      console.log("Invite accepted successfully!");
      await fetchFriendInvites();
      await fetchFriendList();
    } else {
      console.error("Failed to accept invite:", result.message || "Unknown error");
    }
  } catch (error) {
    console.error("Error accepting invite:", error);
  }
};
    // Decline a friend request
    const declineInvite = async (inviteId) => {
      try {
        const response = await fetch(`http://127.0.0.1:8000/api/friendlist-ignore/${inviteId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          // Refresh the invites list
          await fetchFriendInvites();
        }
      } catch (error) {
        console.error("Failed to decline invite:", error);
      }
    };

    // Separate friends into online and offline
    const onlineFriends = computed(() => {
      return friends.value.filter(friend => friend.accepted === true);
    });

    const offlineFriends = computed(() => {
      return friends.value.filter(friend => friend.ignored === true);
    });

    let channel;

    onMounted(async () => {
  // Start Pusher/Echo subscription immediately
  const { appContext } = getCurrentInstance();
  const echo = appContext.config.globalProperties.$echo;
 

  if (echo) {
    channel = echo.private(`user.${userId}`);
    channel.listen('Invite', (event) => {
    
      // Check if there are new invites
  const newInvites = event.invites.filter(
    invite => !invites.value.some(existing => existing.id === invite.id)
  );

  if (newInvites.length > 0) {
    invites.value = event.invites; // Update the invites list
    if (popupNotification.value) {
      popupNotification.value.show('You have a new friend request!');
      fetchFriendInvites();
    }
  }
    });
  } else {
    console.error("Echo instance is not available!");
  }

  if (activeTab.value === 'friends') {
        await fetchFriendList();
      } else {
        await fetchFriendInvites();
      }
});

watch(activeTab, async (newTab) => {
      if (newTab === 'friends') {
        await fetchFriendList();
      } else {
        await fetchFriendInvites();
      }
    });
    return {
      activeTab,
      friends,
      invites,
      friendRequest, // Make sure this is returned
      onlineFriends,
      offlineFriends,
      popupNotification,
      acceptInvite,
      declineInvite
    };
  }
};
</script>

<style scoped>
#friend-list-container {
  padding: 20px;
}

.tabs {
  margin-bottom: 20px;
}

.tabs button {
  padding: 10px 20px;
  margin-right: 10px;
  cursor: pointer;
  border: none;
  background-color: #f0f0f0;
}

.tabs button.active {
  background-color: #007bff;
  color: white;
}

ul {
  list-style-type: none;
  padding: 0;
}

ul li {
  margin: 10px 0;
}
</style>