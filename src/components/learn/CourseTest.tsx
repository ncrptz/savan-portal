'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, XCircle, Award } from 'lucide-react'

interface Q { q: string; options: string[] }
interface Result { score: number; correct: number; total: number; passed: boolean; pass_mark: number; completion_code: string | null }

export default function CourseTest({ courseId }: { courseId: string }) {
  const router = useRouter()
  const [phase, setPhase] = useState<'intro' | 'taking' | 'done'>('intro')
  const [questions, setQuestions] = useState<Q[]>([])
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [result, setResult] = useState<Result | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function start() {
    setBusy(true); setErr('')
    const { data, error } = await createClient().rpc('get_course_questions', { p_course_id: courseId })
    setBusy(false)
    if (error) { setErr(error.message); return }
    const qs = (data as Q[]) ?? []
    if (!qs.length) { setErr('This course has no test yet.'); return }
    setQuestions(qs); setAnswers({}); setPhase('taking')
  }

  async function submit() {
    if (Object.keys(answers).length < questions.length) { setErr('Please answer every question.'); return }
    setBusy(true); setErr('')
    const arr = questions.map((_, i) => answers[i])
    const { data, error } = await createClient().rpc('submit_course_attempt', { p_course_id: courseId, p_answers: arr })
    setBusy(false)
    if (error) { setErr(error.message); return }
    setResult(data as Result); setPhase('done'); router.refresh()
  }

  if (phase === 'intro') {
    return (
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-1">Take the test</h3>
        <p className="text-sm text-gray-600 mb-4">Answer all questions for an instant result. You can retake it if needed.</p>
        {err && <p className="text-sm text-red-600 mb-3">{err}</p>}
        <button onClick={start} disabled={busy} className="btn-primary px-6">{busy ? 'Loading…' : 'Start test'}</button>
      </div>
    )
  }

  if (phase === 'done' && result) {
    return (
      <div className="card text-center py-8">
        {result.passed
          ? <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-3" />
          : <XCircle className="w-14 h-14 text-red-400 mx-auto mb-3" />}
        <h3 className="text-xl font-bold text-gray-900">{result.passed ? 'Passed!' : 'Not passed'}</h3>
        <p className="text-gray-600 mt-1">You scored <strong>{result.score}%</strong> ({result.correct}/{result.total}). Pass mark is {result.pass_mark}%.</p>
        <div className="flex items-center justify-center gap-3 mt-5">
          {result.passed && result.completion_code && (
            <Link href={`/learn/certificate/${result.completion_code}`} className="btn-primary px-5 inline-flex items-center gap-2">
              <Award className="w-4 h-4" />View certificate
            </Link>
          )}
          <button onClick={() => { setPhase('intro'); setResult(null) }} className="btn-secondary px-5">
            {result.passed ? 'Retake' : 'Try again'}
          </button>
        </div>
      </div>
    )
  }

  // taking
  return (
    <div className="card space-y-5">
      <h3 className="font-semibold text-gray-900">Test — {questions.length} question{questions.length !== 1 ? 's' : ''}</h3>
      {questions.map((q, i) => (
        <div key={i}>
          <p className="font-medium text-gray-900 text-sm mb-2">{i + 1}. {q.q}</p>
          <div className="space-y-1.5 pl-1">
            {q.options.map((o, oi) => (
              <label key={oi} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="radio" name={`q-${i}`} checked={answers[i] === oi}
                  onChange={() => setAnswers(a => ({ ...a, [i]: oi }))} />
                {o}
              </label>
            ))}
          </div>
        </div>
      ))}
      {err && <p className="text-sm text-red-600">{err}</p>}
      <button onClick={submit} disabled={busy} className="btn-primary px-6">{busy ? 'Submitting…' : 'Submit test'}</button>
    </div>
  )
}
