export function hasActiveTrustedEnrollment(enrollment: {
  exists: boolean;
  status?: unknown;
}): boolean {
  return enrollment.exists && enrollment.status === 'active';
}
