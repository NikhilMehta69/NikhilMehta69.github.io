import * as pdfjsLib from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.min.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.worker.min.mjs';

const pdfInput = document.getElementById('pdfInput');
const statusEl = document.getElementById('status');
const questionCard = document.getElementById('questionCard');
const progressEl = document.getElementById('progress');
const questionTextEl = document.getElementById('questionText');
const answerInput = document.getElementById('answerInput');
const checkBtn = document.getElementById('checkBtn');
const nextBtn = document.getElementById('nextBtn');
const feedbackEl = document.getElementById('feedback');
const summaryEl = document.getElementById('summary');

let quiz = [];
let currentIndex = 0;
let score = 0;
let checked = false;

pdfInput.addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  resetQuizUI();
  statusEl.textContent = `Reading ${file.name}...`;

  try {
    const text = await extractPdfText(file);
    const parsed = parseQuestionsAndAnswers(text);

    if (!parsed.length) {
      statusEl.textContent = 'I could read the file, but I could not parse quiz content. Use numbered questions (1., 2., 3.) and an "Answer Key" / "Answers" section. Scanned-image PDFs are not supported.';
      return;
    }

    quiz = parsed;
    currentIndex = 0;
    score = 0;

    statusEl.textContent = `Loaded ${quiz.length} questions from ${file.name}.`;
    questionCard.style.display = 'block';
    showQuestion();
  } catch (error) {
    console.error(error);
    statusEl.textContent = 'Error reading PDF. Please use a text-based PDF (not an image scan).';
  }
});

checkBtn.addEventListener('click', () => {
  if (!quiz.length || checked) return;

  const userAnswer = normalize(answerInput.value);
  if (!userAnswer) {
    feedbackEl.className = 'wrong';
    feedbackEl.textContent = 'Please type an answer first.';
    return;
  }

  const expectedRaw = quiz[currentIndex].answer;
  const expected = normalize(expectedRaw);
  const isCorrect = userAnswer === expected;

  checked = true;
  if (isCorrect) {
    score += 1;
    feedbackEl.className = 'correct';
    feedbackEl.textContent = '✅ Right!';
  } else {
    feedbackEl.className = 'wrong';
    feedbackEl.textContent = `❌ Wrong. Correct answer: ${expectedRaw}`;
  }

  nextBtn.disabled = false;
  checkBtn.disabled = true;
});

nextBtn.addEventListener('click', () => {
  if (!checked) return;

  currentIndex += 1;
  if (currentIndex >= quiz.length) {
    finishQuiz();
    return;
  }

  showQuestion();
});

function showQuestion() {
  checked = false;
  checkBtn.disabled = false;
  nextBtn.disabled = true;
  feedbackEl.textContent = '';
  feedbackEl.className = '';
  answerInput.value = '';
  answerInput.focus();

  const item = quiz[currentIndex];
  progressEl.textContent = `Question ${currentIndex + 1} of ${quiz.length}`;
  questionTextEl.textContent = item.question;
}

function finishQuiz() {
  questionCard.style.display = 'none';
  summaryEl.style.display = 'block';

  const pct = Math.round((score / quiz.length) * 100);
  summaryEl.textContent = `Done! Score: ${score}/${quiz.length} (${pct}%). Upload another PDF to try again.`;
}

function resetQuizUI() {
  questionCard.style.display = 'none';
  summaryEl.style.display = 'none';
  summaryEl.textContent = '';
  feedbackEl.textContent = '';
}

async function extractPdfText(file) {
  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: buffer });
  const pdf = await loadingTask.promise;

  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => `${item.str}${item.hasEOL ? '\n' : ' '}`)
      .join('')
      .replace(/[ \t]+\n/g, '\n')
      .trim();

    fullText += `${pageText}\n`;
  }

  return fullText;
}

function parseQuestionsAndAnswers(text) {
  const normalizedText = text.replace(/\r/g, '\n').replace(/\n{2,}/g, '\n');
  const answerKeyStart = normalizedText.search(/\b(answer\s*key|answers?)\b[:\s]*/i);
  if (answerKeyStart === -1) return [];

  const questionsSection = normalizedText.slice(0, answerKeyStart);
  const answersSection = normalizedText.slice(answerKeyStart);

  const cleanedQuestions = questionsSection
    .replace(/\s+/g, ' ')
    .replace(/\s(\d+[\.):-]\s)/g, '\n$1');

  const cleanedAnswers = answersSection
    .replace(/\s+/g, ' ')
    .replace(/\s(\d+[\.):-]\s)/g, '\n$1');

  const questionMatches = [...cleanedQuestions.matchAll(/(?:^|\n)\s*(\d+)[\.):-]\s*(.*?)(?=(?:\n\s*\d+[\.):-]\s)|$)/g)];
  const answerMatches = [...cleanedAnswers.matchAll(/(?:^|\n)\s*(\d+)[\.):-]\s*(.*?)(?=(?:\n\s*\d+[\.):-]\s)|$)/g)];

  if (!questionMatches.length || !answerMatches.length) return [];

  const answerByNumber = new Map();
  answerMatches.forEach((match) => {
    answerByNumber.set(Number(match[1]), match[2].trim());
  });

  return questionMatches
    .map((match) => {
      const num = Number(match[1]);
      return {
        num,
        question: match[2].trim(),
        answer: answerByNumber.get(num) || ''
      };
    })
    .filter((item) => item.answer);
}

function normalize(value) {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}
