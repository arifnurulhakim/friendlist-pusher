<template>
  <div id="friend-list-container">
    <h1>Friend List</h1>
    
    <!-- Tabs for Friend List and Invites -->
    <div class="tabs">
      <button @click="activeTab = 'friends'" :class="{ active: activeTab === 'friends' }">Friends</button>
      <button @click="activeTab = 'invites'" :class="{ active: activeTab === 'invites' }">Invites</button>
    </div>

    <!-- Friend List Section -->
    <div v-if="activeTab === 'friends'" class="friend-list">
    <h2>Online Friends</h2>
    <ul>
      <li v-for="friend in friendlistOnline" :key="friend.player_id" class="friend-item online">
        <img :src="'https://ui-avatars.com/api/?name=' + friend.friend_name" class="avatar">
        <div class="friend-info">
          <p class="friend-name">{{ friend.friend_name }}</p>
          <span class="status online-status">● Online</span>
        </div>  
      </li>
    </ul>

    <h2>Offline Friends</h2>
    <ul>
      <li v-for="friend in friendlistOffline" :key="friend.player_id" class="friend-item offline">
        <img :src="'https://ui-avatars.com/api/?name=' + friend.friend_name" class="avatar">
        <div class="friend-info">
          <p class="friend-name">{{ friend.friend_name }}</p>
          <span class="status offline-status">● Offline</span>
        </div>
      </li>
    </ul>
  </div>



    <!-- Invites Section -->
    <div v-if="activeTab === 'invites'">
      <h2>Friend Requests</h2>
      <ul>
  <template v-if="friendRequest.length > 0">
    <li v-for="fr in friendRequest" :key="fr.id">
      {{ fr.friend_name }} (ID: {{ fr.friend_id }})
      <button @click="() => { console.log('Klik Accept:', fr.friend_id); acceptInvite(fr.id); }">
        Accept
      </button>
      <button @click="() => { console.log('Klik Decline:', fr.friend_id); declineInvite(fr.id); }">
        Decline
      </button>
    </li>
  </template>
  <template v-else>
    <li v-for="fr in invites" :key="fr.id">
      {{ fr.friend_name }} (ID: {{ fr.friend_id }})
      <button @click="() => { console.log('Klik Accept:', fr.friend_id); acceptInvite(fr.id); }">
        Accept
      </button>
      <button @click="() => { console.log('Klik Decline:', fr.friend_id); declineInvite(fr.id); }">
        Decline
      </button>
    </li>
  </template>
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
    const friendlistOnline = ref([]); 
    const friendlistOffline= ref([]); 
    const friendRequest = ref([]); // Temporary variable for friend requests
    const popupNotification = ref(null);
    const userId = localStorage.getItem('user_id');
    const token = localStorage.getItem('token');
    const baseUrl = import.meta.env.VITE_BASE_URL || '';

    if (!userId || !token) {
      console.error("User is not authenticated.");
      return;
    }

    // Fetch friend list from API
    const fetchFriendList = async () => {
  try {
    const response = await fetch(`${baseUrl}/api/friendlist`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    
    if (data.data) {
      friends.value = data.data.map(friend => ({
        ...friend
      }));

      // ✅ Separate online and offline lists
      friendlistOnline.value = friends.value.filter(friend => friend.status ==  'online');
      friendlistOffline.value = friends.value.filter(friend => friend.status == 'offline');
    } else {
      friends.value = [];
      friendlistOnline.value = [];
      friendlistOffline.value = [];
    }

  } catch (error) {
    console.error("Failed to fetch friend list:", error);
  }
};

    // Fetch friend invites from API
    const fetchFriendInvites = async () => {
      try {
        const response = await fetch(`${baseUrl}/api/friendlist-invite`, {
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
    
    const response = await fetch(`${baseUrl}/api/friendlist-accept/${inviteId}`, {
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
      friends.value = friends.value.map(friend => ({
        ...friend,
        status: "offline" // Default to offline until Pusher updates
    }));
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
        const response = await fetch(`${baseUrl}/api/friendlist-ignore/${inviteId}`, {
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
let channel2;
    onMounted(async () => {
  // Start Pusher/Echo subscription immediately
  const { appContext } = getCurrentInstance();
  const echo = appContext.config.globalProperties.$echo;
  
 

console.log(friends);

  if (echo) {
    channel = echo.private(`user.${userId}`);
    channel.listen('Invite', (event) => {
      console.log('Updated Invites:', event.invites);

      // Check if there are new invites
      const newInvites = event.invites.filter(
        invite => !invites.value.some(existing => existing.id === invite.id)
      );

      if (newInvites.length > 0) {
        // Update the invites list with the new data from the event
        invites.value = event.invites;

        // Show the notification
        if (popupNotification.value) {
          popupNotification.value.show('You have a new friend request!');
        }
      }
    });

    channel2 = echo.private(`friendlist`);
   channel2.listen("Friendlist", (event) => {
    console.log("📨 Data dari Pusher:", event.data); // Cek data dari Pusher

    if (Array.isArray(event.data)) {
        const updatedStatusMap = new Map(
            event.data.map(friend => [friend.friend_id, friend.status]) // Buat map dari friend_id ke status
        );

        console.log("🗺️ Updated Status Map:", updatedStatusMap); // Cek map yang dibuat

        friends.value = friends.value.map(friend => {
            if (updatedStatusMap.has(friend.friend_id)) {
                console.log("🔄 Memperbarui teman:", friend.friend_id, "menjadi", updatedStatusMap.get(friend.friend_id)); // Log pembaruan
                return { ...friend, status: updatedStatusMap.get(friend.friend_id) };
            }
            return friend;
        });

        console.log("🔄 Updated Friends:", friends.value); // Cek hasil pembaruan

        friendlistOnline.value = friends.value.filter(friend => friend.status === "online");
        friendlistOffline.value = friends.value.filter(friend => friend.status === "offline");

        console.log("✅ Online Friends:", friendlistOnline.value);
        console.log("✅ Offline Friends:", friendlistOffline.value);
    } else {
        console.error("❌ Format data tidak sesuai:", event.data);
    }
});

  } else {
    console.error("Echo instance is not available!");
  }

  // Fetch initial data based on the active tab
  if (activeTab.value === 'invites') {
    await fetchFriendInvites();
  } else {
    await fetchFriendList();
  }
});

// Watch for changes in activeTab
watch(activeTab, async (newTab) => {
  if (activeTab.value === 'invites') {
    await fetchFriendInvites();
  } else {
    await fetchFriendList();
  }
});


    return {
      activeTab,
      friends,
      friendlistOnline,
      friendlistOffline, 
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

.friend-list {
  max-width: 400px;
  background: #1e1e2e;
  padding: 15px;
  border-radius: 10px;
  color: white;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
  font-family: Arial, sans-serif;
}

h2 {
  font-size: 18px;
  margin-bottom: 10px;
  border-bottom: 2px solid rgba(255, 255, 255, 0.2);
  padding-bottom: 5px;
}

ul {
  list-style: none;
  padding: 0;
}

.friend-item {
  display: flex;
  align-items: center;
  padding: 8px;
  margin: 5px 0;
  border-radius: 8px;
  transition: background 0.3s;
}

.friend-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  margin-right: 10px;
  border: 2px solid transparent;
}

.friend-info {
  flex: 1;
  flex-direction: row;
}

.friend-name {
  font-size: 14px;
  font-weight: bold;
}

.status {
  font-size: 12px;
  display: block;
  margin-top: 3px;
}

.online-status {
  color: #4CAF50;
}

.offline-status {
  color: #aaa;
}

.online .avatar {
  border-color: #4CAF50;
}

.offline .avatar {
  border-color: #555;
}
</style>