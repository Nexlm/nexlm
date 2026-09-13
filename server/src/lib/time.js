export const addMinutes = (date, minutes) => new Date(date.getTime() + minutes * 60_000);

export const addHours = (date, hours) => addMinutes(date, hours * 60);

export const isPast = (date, now = new Date()) => new Date(date).getTime() <= now.getTime();

export const secondsUntil = (date, now = new Date()) =>
  Math.max(0, Math.floor((new Date(date).getTime() - now.getTime()) / 1000));
