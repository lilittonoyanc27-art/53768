export type QuestionStatus = 'unanswered' | 'passed' | 'correct' | 'incorrect';

export interface Question {
  id: number;
  letter: string;
  category: 'football' | 'travel';
  categoryLabelArm: string;
  categoryLabelEs: string;
  spanishQuestion: string;
  armenianQuestion: string;
  spanishAnswer: string;
  armenianAnswer: string;
  status: QuestionStatus;
  revealedAnswer: boolean;
  revealedArmenianQuestion: boolean;
  userAnswer?: string;
}

export interface GameSummary {
  correct: number;
  incorrect: number;
  passed: number;
  unanswered: number;
  totalTimeSpent: number; // in seconds
  scorePercentage: number;
}
