'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowRight } from "lucide-react"
import { useRouter } from 'next/navigation'

export default function Component() {
  const [learningGoal, setLearningGoal] = useState('')
  const router = useRouter()
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Here you would typically handle the submission,
    // such as navigating to a new page or updating the UI
    console.log('Learning goal submitted:', learningGoal)
    router.push(`/roadmap?skill=${learningGoal}`)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black text-gray-100">
      <div className="w-full max-w-md space-y-8 px-4">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-purple-400">Dynamic Roadmap</h1>
          <p className="mt-2 text-lg text-purple-200">Personalize your learning journey</p>
        </div>
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-2">
            <label htmlFor="learning-goal" className="text-lg font-medium text-purple-300">
              What do you want to learn today?
            </label>
            <Input
              id="learning-goal"
              type="text"
              placeholder="Enter your learning goal..."
              value={learningGoal}
              onChange={(e) => setLearningGoal(e.target.value)}
              className="w-full rounded-lg border-purple-700 bg-gray-900 text-white placeholder-gray-400 focus:border-purple-500 focus:ring-purple-500"
              required
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-purple-600 hover:bg-purple-700 focus:ring-purple-500"
          >
            Start My Journey
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}