import { useState, useEffect } from 'react';
import { HelpCircle, CheckCircle2, XCircle, RotateCcw, Award, ChevronRight } from 'lucide-react';
import { QUIZ_QUESTIONS, type QuizQuestion } from '../data/quizData';

export default function Quiz() {
  const [activeQuestions, setActiveQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showExplanation, setShowExplanation] = useState<Record<number, boolean>>({});
  const [isFinished, setIsFinished] = useState(false);

  // Local storage for best score and total attempts
  const [bestScore, setBestScore] = useState<number>(() => {
    return parseInt(localStorage.getItem('cryptolab_quiz_best') || '0', 10);
  });
  const [totalAttempts, setTotalAttempts] = useState<number>(() => {
    return parseInt(localStorage.getItem('cryptolab_quiz_attempts') || '0', 10);
  });

  // Start a new 10-question random quiz session
  function startNewQuiz(customQuestions?: QuizQuestion[]) {
    let pool = customQuestions;
    if (!pool) {
      // Shuffle all 20 questions and take 10
      const shuffled = [...QUIZ_QUESTIONS].sort(() => Math.random() - 0.5);
      pool = shuffled.slice(0, 10);
    }
    setActiveQuestions(pool);
    setCurrentIndex(0);
    setSelectedAnswers({});
    setShowExplanation({});
    setIsFinished(false);
  }

  useEffect(() => {
    startNewQuiz();
  }, []);

  function handleSelectOption(questionId: number, optionIdx: number) {
    if (selectedAnswers[questionId] !== undefined) return; // Already answered
    setSelectedAnswers(prev => ({ ...prev, [questionId]: optionIdx }));
    setShowExplanation(prev => ({ ...prev, [questionId]: true }));
  }

  function handleFinish() {
    setIsFinished(true);
    // Calculate score
    let score = 0;
    activeQuestions.forEach(q => {
      if (selectedAnswers[q.id] === q.correctIndex) score++;
    });

    const newAttempts = totalAttempts + 1;
    setTotalAttempts(newAttempts);
    localStorage.setItem('cryptolab_quiz_attempts', newAttempts.toString());

    if (score > bestScore) {
      setBestScore(score);
      localStorage.setItem('cryptolab_quiz_best', score.toString());
    }
  }

  function retryWrongAnswers() {
    const wrong = activeQuestions.filter(q => selectedAnswers[q.id] !== q.correctIndex);
    if (wrong.length > 0) {
      startNewQuiz(wrong);
    }
  }

  if (activeQuestions.length === 0) return null;

  const currentQ = activeQuestions[currentIndex];
  const answeredCount = Object.keys(selectedAnswers).length;
  const currentAnswer = selectedAnswers[currentQ?.id];

  // Topic breakdown calculation
  const topicStats: Record<string, { total: number; correct: number }> = {};
  activeQuestions.forEach(q => {
    if (!topicStats[q.topic]) topicStats[q.topic] = { total: 0, correct: 0 };
    topicStats[q.topic].total++;
    if (selectedAnswers[q.id] === q.correctIndex) topicStats[q.topic].correct++;
  });

  const totalScore = activeQuestions.filter(q => selectedAnswers[q.id] === q.correctIndex).length;

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-secondary/10 text-secondary">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text">Cryptographic Knowledge Quiz</h1>
            <p className="text-sm text-muted">
              Test your understanding of AES, ECB patterns, IV/nonce safety rules, and GCM authenticated encryption.
            </p>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center justify-between p-4 bg-card border border-border rounded-card shadow-card text-xs">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-muted block">Session Progress</span>
            <span className="font-semibold text-text">{answeredCount} of {activeQuestions.length} answered</span>
          </div>
          <div className="border-l border-border pl-4">
            <span className="text-muted block">Best Score</span>
            <span className="font-semibold text-primary">{bestScore} / 10</span>
          </div>
          <div className="border-l border-border pl-4">
            <span className="text-muted block">Attempts</span>
            <span className="font-semibold text-text">{totalAttempts}</span>
          </div>
        </div>

        <button
          onClick={() => startNewQuiz()}
          className="px-3 py-1.5 border border-border rounded-md hover:bg-surface text-muted hover:text-text flex items-center gap-1.5 transition-colors font-medium"
        >
          <RotateCcw className="w-3.5 h-3.5" /> New Quiz
        </button>
      </div>

      {!isFinished ? (
        <div className="p-6 bg-card border border-border rounded-card shadow-card space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-surface border border-border text-muted">
              Question {currentIndex + 1} of {activeQuestions.length} ({currentQ.topic})
            </span>
          </div>

          <h2 className="text-base font-semibold text-text leading-relaxed">
            {currentQ.question}
          </h2>

          {/* Options */}
          <div className="space-y-2.5">
            {currentQ.options.map((opt, idx) => {
              const isSelected = currentAnswer === idx;
              const isCorrect = currentQ.correctIndex === idx;
              const hasAnswered = currentAnswer !== undefined;

              let style = 'bg-surface border-border text-text hover:border-primary/40';
              if (hasAnswered) {
                if (isCorrect) {
                  style = 'bg-success/10 border-success text-success font-semibold';
                } else if (isSelected) {
                  style = 'bg-danger/10 border-danger text-danger font-semibold';
                } else {
                  style = 'opacity-60 bg-surface border-border text-muted';
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(currentQ.id, idx)}
                  disabled={hasAnswered}
                  className={`w-full text-left p-3.5 rounded-lg border text-xs transition-all flex items-center justify-between ${style}`}
                >
                  <span>{opt}</span>
                  {hasAnswered && isCorrect && <CheckCircle2 className="w-4 h-4 text-success shrink-0 ml-2" />}
                  {hasAnswered && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-danger shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>

          {/* Explanation banner */}
          {showExplanation[currentQ.id] && (
            <div className="p-4 rounded-lg bg-surface border border-border text-xs space-y-1">
              <strong className="text-text block">Explanation:</strong>
              <p className="text-muted leading-relaxed">{currentQ.explanation}</p>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <button
              onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
              disabled={currentIndex === 0}
              className="px-4 py-2 text-xs font-medium border border-border rounded-lg disabled:opacity-40"
            >
              Previous
            </button>

            {currentIndex < activeQuestions.length - 1 ? (
              <button
                onClick={() => setCurrentIndex(i => i + 1)}
                className="px-5 py-2 text-xs font-semibold bg-primary text-white rounded-lg hover:bg-primary/90"
              >
                Next Question
              </button>
            ) : (
              <button
                onClick={handleFinish}
                disabled={answeredCount < activeQuestions.length}
                className="px-5 py-2 text-xs font-semibold bg-success text-white rounded-lg hover:bg-success/90 disabled:opacity-40"
              >
                Complete Quiz
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Quiz Finished View */
        <div className="p-8 bg-card border border-border rounded-card shadow-card text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Award className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-text">Quiz Complete!</h2>
            <p className="text-muted text-sm">
              You scored <strong className="text-primary">{totalScore}</strong> out of {activeQuestions.length} (
              {Math.round((totalScore / activeQuestions.length) * 100)}%)
            </p>
          </div>

          {/* Per-Topic Breakdown */}
          <div className="max-w-md mx-auto text-left p-4 bg-surface rounded-xl border border-border space-y-2 text-xs">
            <strong className="text-text block mb-2">Topic Breakdown:</strong>
            {Object.entries(topicStats).map(([topic, stats]) => (
              <div key={topic} className="flex justify-between items-center py-1 border-b border-border last:border-none">
                <span className="font-medium text-text">{topic}</span>
                <span className="font-mono text-muted">
                  {stats.correct} / {stats.total} ({Math.round((stats.correct / stats.total) * 100)}%)
                </span>
              </div>
            ))}
          </div>

          <div className="flex justify-center gap-3">
            <button
              onClick={() => startNewQuiz()}
              className="px-5 py-2.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary/90"
            >
              Take Another Quiz
            </button>
            {totalScore < activeQuestions.length && (
              <button
                onClick={retryWrongAnswers}
                className="px-5 py-2.5 border border-border text-text text-xs font-semibold rounded-lg hover:bg-surface"
              >
                Retry Wrong Answers
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
