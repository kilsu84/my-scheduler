import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { syncPendingSchedules } from '@/app/actions/schedules'
import { PlannerApp } from '@/components/planner/planner-app'

export default async function HomePage({ searchParams }: { searchParams: Promise<{ google?: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  const { google } = await searchParams
  if (google === 'connected') {
    await syncPendingSchedules()
    redirect('/')
  }

  return <PlannerApp userName={session.user.name} />
}
