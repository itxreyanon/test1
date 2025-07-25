export class BotFeatures {
  constructor(ig, realtimeHandler) {
    this.ig = ig;
    this.realtime = realtimeHandler;
  }

  // Auto-reply to direct messages
  async setupAutoReply() {
    this.ig.realtime.on('message', async (data) => {
      const { message } = data;
      
      // Skip if it's our own message
      if (message.user_id === this.ig.state.cookieUserId) return;
      
      // Skip if no text content
      if (!message.text) return;

      try {
        // Simple auto-reply logic
        const reply = this.generateReply(message.text);
        
        if (reply) {
          // Send typing indicator
          await this.realtime.sendTyping(message.thread_id, true);
          
          // Wait a bit to seem natural
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Send reply
          await this.realtime.sendMessage(message.thread_id, reply);
          
          // Stop typing
          await this.realtime.sendTyping(message.thread_id, false);
          
          console.log('🤖 Auto-replied to message');
        }
      } catch (error) {
        console.error('❌ Auto-reply failed:', error.message);
      }
    });
  }

  generateReply(messageText) {
    const text = messageText.toLowerCase();
    
    // Simple keyword-based responses
    if (text.includes('hello') || text.includes('hi')) {
      return 'Hello! How can I help you?';
    }
    
    if (text.includes('how are you')) {
      return 'I\'m doing great, thanks for asking!';
    }
    
    if (text.includes('bye') || text.includes('goodbye')) {
      return 'Goodbye! Have a great day!';
    }
    
    if (text.includes('help')) {
      return 'I\'m a bot. You can say hello, ask how I am, or say goodbye!';
    }
    
    // Default response for unrecognized messages
    return 'Thanks for your message! I\'m a bot and still learning.';
  }

  // Auto-like recent posts from followed users
  async autoLikePosts(limit = 5) {
    try {
      console.log('❤️ Starting auto-like for recent posts...');
      
      const timelineFeed = this.ig.feed.timeline();
      const posts = await timelineFeed.request();
      
      let likedCount = 0;
      
      for (const post of posts.feed_items.slice(0, limit)) {
        if (post.media_or_ad && !post.media_or_ad.has_liked) {
          try {
            await this.ig.media.like(post.media_or_ad.id);
            console.log(`❤️ Liked post from @${post.media_or_ad.user.username}`);
            likedCount++;
            
            // Wait between likes to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 2000));
          } catch (error) {
            console.error('❌ Failed to like post:', error.message);
          }
        }
      }
      
      console.log(`✅ Auto-liked ${likedCount} posts`);
    } catch (error) {
      console.error('❌ Auto-like failed:', error.message);
    }
  }

  // Get account statistics
  async getAccountStats() {
    try {
      const userInfo = await this.ig.user.info(this.ig.state.cookieUserId);
      const directInbox = await this.ig.feed.directInbox().request();
      
      const stats = {
        username: userInfo.username,
        followers: userInfo.follower_count,
        following: userInfo.following_count,
        posts: userInfo.media_count,
        unreadMessages: directInbox.inbox.unseen_count,
        totalThreads: directInbox.inbox.threads.length
      };
      
      console.log('📊 Account Statistics:', stats);
      return stats;
    } catch (error) {
      console.error('❌ Failed to get account stats:', error.message);
      return null;
    }
  }

  // Send presence updates (online/offline)
  async updatePresence(isOnline = true) {
    try {
      await this.realtime.ig.realtime.direct.sendForegroundState({
        inForegroundApp: isOnline,
        inForegroundDevice: isOnline,
        keepAliveTimeout: isOnline ? 60 : 900
      });
      
      console.log(`👤 Presence updated: ${isOnline ? 'Online' : 'Offline'}`);
    } catch (error) {
      console.error('❌ Failed to update presence:', error.message);
    }
  }

  // Monitor specific users' activity
  async monitorUsers(usernames = []) {
    console.log('👀 Monitoring users:', usernames);
    
    this.ig.realtime.on('appPresence', (data) => {
      // You would need to map user IDs to usernames
      console.log('👤 User activity detected:', data.presence_event);
    });
  }
}
