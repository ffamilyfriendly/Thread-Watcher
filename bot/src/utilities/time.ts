export function seconds_to_duration_parts(total_seconds: number) {
  const hours = Math.floor(total_seconds / 3600);
  const minutes = Math.floor((total_seconds % 3600) / 60);
  const seconds = Math.floor(total_seconds % 60);
  return { hours, minutes, seconds };
}
