import { auth } from '../firebase';

interface ActivityTrackerConfig {
  updateThrottle?: number; // milliseconds between updates
  activityInterval?: number; // milliseconds for periodic updates
}

class ActivityTracker {
  private userId: string | null = null;
  private lastUpdate = 0;
  private updateThrottle: number;
  private activityInterval: number;
  private interval: NodeJS.Timeout | null = null;
  private isTracking = false;

  constructor(config: ActivityTrackerConfig = {}) {
    this.updateThrottle = config.updateThrottle || 30000; // 30 seconds
    this.activityInterval = config.activityInterval || 5 * 60 * 1000; // 5 minutes
    
    // Listen for auth state changes
    auth.onAuthStateChanged((user) => {
      if (user) {
        this.userId = user.uid;
        if (this.isTracking) {
          this.startTracking();
        }
      } else {
        this.userId = null;
        this.stopTracking();
      }
    });
  }

  /**
   * Update user activity in the backend
   */
  private async updateActivity(): Promise<void> {
    if (!this.userId) return;

    const now = Date.now();
    if (now - this.lastUpdate < this.updateThrottle) return;
    
    this.lastUpdate = now;
    
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      const response = await fetch('/api/smart-sync/activity', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.warn('[ActivityTracker] Failed to update activity:', response.status);
      }
    } catch (error) {
      console.error('[ActivityTracker] Error updating activity:', error);
    }
  }

  /**
   * Start tracking user activity
   */
  startTracking(): void {
    if (this.isTracking || !this.userId) return;
    
    this.isTracking = true;
    console.log('[ActivityTracker] Starting activity tracking');

    // Track page visibility changes
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));

    // Track user interactions
    const interactionEvents = ['click', 'keydown', 'scroll', 'mousemove'];
    interactionEvents.forEach(event => {
      document.addEventListener(event, this.handleInteraction.bind(this), { passive: true });
    });

    // Periodic update while active
    this.interval = setInterval(() => {
      if (!document.hidden) {
        this.updateActivity();
      }
    }, this.activityInterval);

    // Initial activity update
    this.updateActivity();
  }

  /**
   * Stop tracking user activity
   */
  stopTracking(): void {
    if (!this.isTracking) return;
    
    this.isTracking = false;
    console.log('[ActivityTracker] Stopping activity tracking');

    // Remove event listeners
    document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    
    const interactionEvents = ['click', 'keydown', 'scroll', 'mousemove'];
    interactionEvents.forEach(event => {
      document.removeEventListener(event, this.handleInteraction.bind(this));
    });

    // Clear interval
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  /**
   * Handle page visibility changes
   */
  private handleVisibilityChange(): void {
    if (!document.hidden) {
      this.updateActivity();
    }
  }

  /**
   * Handle user interactions
   */
  private handleInteraction(): void {
    this.updateActivity();
  }

  /**
   * Force an immediate activity update
   */
  async forceUpdate(): Promise<void> {
    this.lastUpdate = 0; // Reset throttle
    await this.updateActivity();
  }

  /**
   * Get current tracking status
   */
  getStatus(): { isTracking: boolean; userId: string | null } {
    return {
      isTracking: this.isTracking,
      userId: this.userId
    };
  }
}

// Create singleton instance
const activityTracker = new ActivityTracker();

export default activityTracker; 