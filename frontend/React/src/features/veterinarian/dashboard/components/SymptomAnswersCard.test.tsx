import { fireEvent, render, screen } from '@testing-library/react'

import { SymptomAnswersCard } from './SymptomAnswersCard'
import type { ScreeningAnswer } from '../types/dashboard.types'

function makeRows(count: number): ScreeningAnswer[] {
  return Array.from({ length: count }, (_, index) => ({
    question: `Question ${index + 1}`,
    answer: `Answer ${index + 1}`,
  }))
}

describe('SymptomAnswersCard', () => {
  it('shows only the first five rows and a Show more button', () => {
    render(<SymptomAnswersCard rows={makeRows(7)} />)

    expect(screen.getByText('Question 1')).toBeInTheDocument()
    expect(screen.getByText('Question 5')).toBeInTheDocument()
    expect(screen.queryByText('Question 6')).not.toBeInTheDocument()
    expect(screen.queryByText('Question 7')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Show more' })).toBeInTheDocument()
  })

  it('shows every row after Show more and collapses back to five rows', () => {
    render(<SymptomAnswersCard rows={makeRows(7)} />)

    fireEvent.click(screen.getByRole('button', { name: 'Show more' }))

    expect(screen.getByText('Question 6')).toBeInTheDocument()
    expect(screen.getByText('Question 7')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Show less' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Show less' }))

    expect(screen.queryByText('Question 6')).not.toBeInTheDocument()
    expect(screen.queryByText('Question 7')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Show more' })).toBeInTheDocument()
  })

  it('hides the toggle when five or fewer rows are present', () => {
    render(<SymptomAnswersCard rows={makeRows(5)} />)

    expect(screen.getByText('Question 5')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders nothing when there are no rows', () => {
    const { container } = render(<SymptomAnswersCard rows={[]} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('shows the question before the answer', () => {
    render(<SymptomAnswersCard rows={[{ question: 'Is the skin itchy?', answer: 'Yes' }]} />)

    const question = screen.getByText('Is the skin itchy?')
    const answer = screen.getByText('Yes')

    expect(question.compareDocumentPosition(answer)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
  })
})
