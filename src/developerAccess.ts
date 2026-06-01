export const DEVELOPER_EMAIL = 'jamesdanielkemp@gmail.com'

export function isDeveloperUser(email: string | null | undefined): boolean {
  return (email ?? '').toLowerCase() === DEVELOPER_EMAIL
}
