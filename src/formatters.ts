export const formatDate = (date: Date, separator: string = "-"): string => {
  const day = date.getUTCDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getUTCFullYear();

  return [year, month, day].join(separator);
};

export const formatTime = (date: Date, separator: string = "-"): string => {
  const hours = date.getUTCHours().toString().padStart(2, "0");
  const minutes = date.getUTCMinutes().toString().padStart(2, "0");
  const seconds = date.getUTCSeconds().toString().padStart(2, "0");

  return [hours, minutes, seconds].join(separator);
};
