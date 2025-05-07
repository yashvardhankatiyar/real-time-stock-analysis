import time
import threading

class Cache:
    """Simple in-memory cache with expiration"""
    
    def __init__(self, default_ttl=300):  # default TTL: 5 minutes
        self._cache = {}
        self._lock = threading.RLock()  # Reentrant lock for thread safety
        self._default_ttl = default_ttl
        
        # Start a background thread to clean expired items
        self._start_cleanup_thread()
    
    def set(self, key, value, ttl=None):
        """
        Store a value in the cache with an expiration time
        
        Args:
            key: Cache key
            value: Value to store
            ttl: Time to live in seconds (None uses default TTL)
        """
        if ttl is None:
            ttl = self._default_ttl
            
        expiry = time.time() + ttl
        
        with self._lock:
            self._cache[key] = {
                'value': value,
                'expiry': expiry
            }
    
    def get(self, key):
        """
        Get a value from the cache if it exists and hasn't expired
        
        Args:
            key: Cache key
            
        Returns:
            The cached value or None if not found or expired
        """
        with self._lock:
            if key not in self._cache:
                return None
                
            cache_item = self._cache[key]
            
            # Check if item has expired
            if time.time() > cache_item['expiry']:
                del self._cache[key]
                return None
                
            return cache_item['value']
    
    def delete(self, key):
        """
        Delete an item from the cache
        
        Args:
            key: Cache key
        """
        with self._lock:
            if key in self._cache:
                del self._cache[key]
    
    def clear(self):
        """Clear all items from the cache"""
        with self._lock:
            self._cache.clear()
    
    def _start_cleanup_thread(self):
        """Start a background thread to periodically clean expired items"""
        def cleanup_worker():
            while True:
                time.sleep(60)  # Run cleanup every minute
                self._cleanup_expired()
        
        thread = threading.Thread(target=cleanup_worker, daemon=True)
        thread.start()
    
    def _cleanup_expired(self):
        """Remove all expired items from the cache"""
        current_time = time.time()
        
        with self._lock:
            # Identify keys to delete
            keys_to_delete = [
                key for key, item in self._cache.items()
                if current_time > item['expiry']
            ]
            
            # Delete expired keys
            for key in keys_to_delete:
                del self._cache[key]