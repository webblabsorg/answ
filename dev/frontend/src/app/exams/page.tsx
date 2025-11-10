'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { apiClient } from '@/lib/api-client'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Exam {
  id: string
  name: string
  code: string
  category: string
  description: string
  duration_minutes: number
  total_sections: number
  total_questions: number
  _count: {
    questions: number
  }
}

export default function ExamsPage() {
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchExams()
  }, [])

  const fetchExams = async () => {
    try {
      const response = await apiClient.get('/exams')
      setExams(response.data)
    } catch (error) {
      console.error('Failed to fetch exams:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredExams = exams.filter(exam =>
    exam.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exam.code.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      STANDARDIZED_TEST: 'bg-blue-100 text-blue-800',
      PROFESSIONAL_CERT: 'bg-green-100 text-green-800',
      LANGUAGE_TEST: 'bg-purple-100 text-purple-800',
      REGIONAL_EXAM: 'bg-orange-100 text-orange-800',
    }
    return colors[category] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <div className="text-2xl font-bold text-primary cursor-pointer">answly</div>
          </Link>
          <nav className="flex gap-4">
            <Link href="/dashboard">
              <Button variant="ghost">Dashboard</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Exam Catalog</h1>
          <p className="text-muted-foreground">
            Choose from our collection of practice exams
          </p>
        </div>

        {/* Search */}
        <div className="mb-8">
          <Input
            type="text"
            placeholder="Search exams..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md"
          />
        </div>

        {/* Exams Grid */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading exams...</p>
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No exams found</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredExams.map((exam) => (
              <Card key={exam.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-2xl">{exam.code}</CardTitle>
                    <Badge className={getCategoryBadge(exam.category)}>
                      {exam.category.replace('_', ' ')}
                    </Badge>
                  </div>
                  <CardDescription className="text-base">
                    {exam.name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="text-sm text-muted-foreground mb-4">
                    {exam.description}
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration:</span>
                      <span className="font-medium">{exam.duration_minutes} min</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sections:</span>
                      <span className="font-medium">{exam.total_sections}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Questions:</span>
                      <span className="font-medium">{exam._count.questions}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="gap-2">
                  <Link href={`/exams/${exam.id}`} className="flex-1">
                    <Button className="w-full">View Details</Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
