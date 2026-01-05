// src/app/utils/dateUtils.ts
export function setupMidnightChecker() {
  // Only run on client side
  if (typeof window === 'undefined') return;
  
  // Check if we need to reset on page load
  checkAndResetDailySales();
  
  // Set up interval to check every minute
  const intervalId = setInterval(checkAndResetDailySales, 60000);
  
  // Return cleanup function
  return () => clearInterval(intervalId);
}

function checkAndResetDailySales() {
  if (typeof window === 'undefined') return;
  
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  // Check if it's midnight (00:00)
  if (currentHour === 0 && currentMinute === 0) {
    const today = now.toDateString();
    const lastReset = localStorage.getItem('last_sales_reset');
    
    if (lastReset !== today) {
      localStorage.setItem('last_sales_reset', today);
      
      // Dispatch a custom event that components can listen to
      window.dispatchEvent(new CustomEvent('newDayStarted'));
      
      // Show notification (you can use your toast system)
      if (window.localStorage.getItem('access_token')) {
        // Only show if user is logged in
        console.log('New day started - sales have been reset for today');
      }
    }
  }
}

// Helper to check if a date is today
export function isToday(dateString: string): boolean {
  if (typeof window === 'undefined') return false;
  
  const date = new Date(dateString);
  const today = new Date();
  return date.toDateString() === today.toDateString();
}