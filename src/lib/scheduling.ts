import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { addDays, setHours, setMinutes, setSeconds, isBefore, getDay } from 'date-fns';

export function getNextValidSendTime(
  now: Date,
  timezone: string,
  scheduleWindow: { startHour: number; endHour: number; days: number[] }
): Date {
  // Convert current UTC time to the campaign's timezone
  let targetZonedTime = toZonedTime(now, timezone);
  
  const { startHour, endHour, days } = scheduleWindow;

  // We loop to find the next valid day and time
  for (let offset = 0; offset < 14; offset++) {
    // If it's a future day, start checking from midnight of that day
    if (offset > 0) {
      targetZonedTime = setHours(setMinutes(setSeconds(targetZonedTime, 0), 0), 0);
    }

    const currentDayOfWeek = getDay(targetZonedTime);
    
    // Check if the current day is an allowed sending day
    if (days.includes(currentDayOfWeek)) {
      const hour = targetZonedTime.getHours();

      // Case 1: We are before the start window for the day
      if (hour < startHour) {
        targetZonedTime = setHours(setMinutes(setSeconds(targetZonedTime, 0), 0), startHour);
        return fromZonedTime(targetZonedTime, timezone);
      }
      
      // Case 2: We are within the window
      if (hour >= startHour && hour < endHour) {
        // If we are evaluating the very first iteration (now), it's valid immediately.
        // If it's a future day (we reset to midnight), we should have caught it in Case 1.
        return fromZonedTime(targetZonedTime, timezone);
      }

      // Case 3: We are after the end window for the day.
      // Do nothing here, the loop will increment offset and check tomorrow.
    }

    // Add 1 day for next iteration
    targetZonedTime = addDays(targetZonedTime, 1);
  }

  // Fallback: if we couldn't find a valid time in 14 days, just schedule it for now.
  return now;
}
