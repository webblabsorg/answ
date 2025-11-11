import { redirect } from 'next/navigation'

export default function HomeworksRoute() {
  // Keep URL accessible but route renders on homepage instead
  redirect('/')
  return null
}
