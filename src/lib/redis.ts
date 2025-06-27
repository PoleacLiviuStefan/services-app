// lib/redis.ts
import { createClient } from 'redis';

// Pentru development local și production
const getRedisUrl = () => {
  if (process.env.REDIS_URL) return process.env.REDIS_URL;

  return null;
};

const REDIS_URL = getRedisUrl();

if (REDIS_URL) {
  console.log('Using Redis URL:', REDIS_URL.replace(/\/\/[^:]*:[^@]*@/, '//****:****@'));
} else {
  console.log('Redis not configured - running without real-time features');
}

// Funcție helper pentru a crea client doar dacă avem URL
function createRedisClient() {
  if (!REDIS_URL) return null;
  
  return createClient({
    url: REDIS_URL,
    socket: {
      connectTimeout: 15000, // Timp mai mare pentru conexiuni externe
      lazyConnect: true,
      keepAlive: 30000,
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          console.log('Redis: Max retries reached, giving up');
          return false;
        }
        const delay = Math.min(retries * 200, 5000);
        console.log(`Redis: Reconnecting in ${delay}ms (attempt ${retries})`);
        return delay;
      }
    }
  });
}

// Client principal pentru operațiuni normale
export const redisClient = createRedisClient();

// Client pentru subscribe (Redis necesită conexiuni separate pentru pub/sub)
export const redisSubscriber = createRedisClient();

// Client pentru publish
export const redisPublisher = createRedisClient();

// Event handlers pentru debugging (doar dacă avem clienți)
if (redisClient) {
  redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err.message);
  });

  redisClient.on('connect', () => {
    console.log('✅ Redis Client Connected');
  });

  redisClient.on('ready', () => {
    console.log('✅ Redis Client Ready');
  });

  redisClient.on('reconnecting', () => {
    console.log('🔄 Redis Client Reconnecting...');
  });
}

if (redisSubscriber) {
  redisSubscriber.on('error', (err) => {
    console.error('Redis Subscriber Error:', err.message);
  });

  redisSubscriber.on('connect', () => {
    console.log('✅ Redis Subscriber Connected');
  });

  redisSubscriber.on('ready', () => {
    console.log('✅ Redis Subscriber Ready');
  });
}

if (redisPublisher) {
  redisPublisher.on('error', (err) => {
    console.error('Redis Publisher Error:', err.message);
  });

  redisPublisher.on('connect', () => {
    console.log('✅ Redis Publisher Connected');
  });

  redisPublisher.on('ready', () => {
    console.log('✅ Redis Publisher Ready');
  });
}

// Funcții helper pentru inițializare cu error handling
export async function initRedisClient() {
  if (!redisClient) {
    console.log('Redis client not available - skipping');
    return null;
  }
  
  try {
    if (!redisClient.isOpen) {
      console.log('Connecting to Redis client...');
      await redisClient.connect();
    }
    return redisClient;
  } catch (error) {
    console.error('Failed to connect Redis client:', error.message);
    return null;
  }
}

export async function initRedisSubscriber() {
  if (!redisSubscriber) {
    console.log('Redis subscriber not available - skipping');
    return null;
  }
  
  try {
    if (!redisSubscriber.isOpen) {
      console.log('Connecting to Redis subscriber...');
      await redisSubscriber.connect();
    }
    return redisSubscriber;
  } catch (error) {
    console.error('Failed to connect Redis subscriber:', error.message);
    return null;
  }
}

export async function initRedisPublisher() {
  if (!redisPublisher) {
    console.log('Redis publisher not available - skipping');
    return null;
  }
  
  try {
    if (!redisPublisher.isOpen) {
      console.log('Connecting to Redis publisher...');
      await redisPublisher.connect();
    }
    return redisPublisher;
  } catch (error) {
    console.error('Failed to connect Redis publisher:', error.message);
    return null;
  }
}

// Funcție pentru cleanup
export async function closeRedisConnections() {
  try {
    const promises = [];
    
    if (redisClient && redisClient.isOpen) {
      promises.push(redisClient.disconnect());
    }
    if (redisSubscriber && redisSubscriber.isOpen) {
      promises.push(redisSubscriber.disconnect());
    }
    if (redisPublisher && redisPublisher.isOpen) {
      promises.push(redisPublisher.disconnect());
    }
    
    if (promises.length > 0) {
      await Promise.all(promises);
      console.log('All Redis connections closed');
    }
  } catch (error) {
    console.error('Error closing Redis connections:', error.message);
  }
}

// Test conexiunea la pornire (doar pentru debugging)
if (REDIS_URL && process.env.NODE_ENV === 'development') {
  console.log('🔄 Testing Redis connection...');
  initRedisClient()
    .then((client) => {
      if (client) {
        console.log('🎉 Redis connection test successful!');
      } else {
        console.log('❌ Redis connection test failed');
      }
    })
    .catch((error) => {
      console.log('❌ Redis connection test error:', error.message);
    });
}

// Constante pentru channel-uri Redis
export const REDIS_CHANNELS = {
  CHAT_EVENTS: 'chat_events',
  USER_EVENTS: 'user_events',
  CONVERSATION_EVENTS: 'conversation_events'
} as const;