// --- PRE-LOADED BUILT-IN LISTS ---
const BUILTIN_LISTS = {
    connecteurs: `com certeza\tbien sûr\nem vão\ten vain\nde fato\tbel et bien\nalém disso\ten plus\nno entanto\tcependant\ncontudo\tpourtant\nembora\tbien que`,
    adverbes: `para sempre\tà jamais\nno horário\tà l'heure\nagora\tà présent\na tempo\tà temps\ncedo\ten avance\tatrasado\ten retard`,
    frequence_1: `eu sou / estou\tje suis\ntu és / estás\ttu es\tele é / está\til est\tela é / está\telle est`
};

// --- APPLICATION STATE ---
let queue = [];           // Queue array for active study session
let currentCard = null;   // Active card under evaluation
let isWaitingForNext = false; // Flag to manage manual pause on error/success

// --- DOM ELEMENTS ---
const fileInput = document.getElementById('file-input');
const listSelect = document.getElementById('list-select');
const fileSection = document.getElementById('file-section');
const quizSection = document.getElementById('quiz-section');
const promptText = document.getElementById('prompt-text');
const userInput = document.getElementById('user-input');
const quizForm = document.getElementById('quiz-form');
const feedback = document.getElementById('feedback');
const feedbackText = document.getElementById('feedback-text');
const btnNext = document.getElementById('btn-next');
const btnHome = document.getElementById('btn-home');
const cardsLeft = document.getElementById('cards-left');
const completionBox = document.getElementById('completion-box');
const btnRestart = document.getElementById('btn-restart');

// --- 1. PARSER FOR FILE INPUT ---
fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        parseAndStartSession(e.target.result);
    };
    reader.readAsText(file, 'UTF-8');
});

// --- 2. PARSER FOR PRE-LOADED LIST SELECTOR ---
listSelect.addEventListener('change', (event) => {
    const selectedKey = event.target.value;
    if (selectedKey && BUILTIN_LISTS[selectedKey]) {
        parseAndStartSession(BUILTIN_LISTS[selectedKey]);
    }
});

// --- 3. STRING PARSER (TAB separated terms, NEWLINE separated cards) ---
function parseAndStartSession(rawText) {
    queue = [];
    
    // Split by unix (\n) or windows (\r\n) line breaks
    const lines = rawText.split(/\r?\n/);

    lines.forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine) {
            // Split front and back by TAB (\t)
            const parts = trimmedLine.split('\t');
            if (parts.length >= 2) {
                const front = parts[0].trim();
                const back = parts[1].trim();
                queue.push({ front, back });
            }
        }
    });

    if (queue.length === 0) {
        alert('Nenhum card válido encontrado. Formato esperado: frente[TAB]verso[ENTER]');
        return;
    }

    // Hide selection view and open quiz interface
    fileSection.classList.add('hidden');
    quizSection.classList.remove('hidden');
    completionBox.classList.add('hidden');
    quizForm.classList.remove('hidden');

    nextCard();
}

// --- 4. QUIZ FLOW & QUEUE MANAGEMENT ---
function nextCard() {
    isWaitingForNext = false;
    feedback.classList.add('hidden');
    quizForm.classList.remove('hidden');
    userInput.value = '';

    // Check completion condition
    if (queue.length === 0) {
        promptText.innerText = '';
        document.querySelector('.prompt-box').classList.add('hidden');
        quizForm.classList.add('hidden');
        completionBox.classList.remove('hidden');
        cardsLeft.innerText = '0';
        return;
    }

    document.querySelector('.prompt-box').classList.remove('hidden');
    cardsLeft.innerText = queue.length;
    currentCard = queue[0];
    promptText.innerText = currentCard.front;
    userInput.focus();
}

// --- 5. SUBMISSION & FEEDBACK PAUSE HANDLING ---
quizForm.addEventListener('submit', (e) => {
    e.preventDefault();

    // If application is paused displaying feedback state, Enter key triggers advance
    if (isWaitingForNext) {
        nextCard();
        return;
    }

    // Allow empty answers (user doesn't know the word)
    const userTyped = userInput.value.trim();

    const isCorrect = userTyped.toLowerCase() === currentCard.back.toLowerCase();

    // Trigger TTS audio regardless of answer correctness
    speakFrench(currentCard.back);

    if (isCorrect) {
        // Correct answer: remove item from queue
        queue.shift();

        // Pause flow: show success feedback and wait for manual advance
        isWaitingForNext = true;
        quizForm.classList.add('hidden');

        feedbackText.innerHTML = `<strong>Correto!</strong><br>Resposta: <strong>${currentCard.back}</strong>`;
        feedback.className = 'feedback-box correct';
        feedback.classList.remove('hidden');

        btnNext.focus();
    } else {
        // Wrong or empty answer: requeue item to the end of array
        const failedCard = queue.shift();
        queue.push(failedCard);

        // Pause flow: hide input form, display error feedback and enable advance button
        isWaitingForNext = true;
        quizForm.classList.add('hidden');

        const displayTyped = userTyped ? `<code>${userTyped}</code>` : '<em>(Vazio)</em>';
        feedbackText.innerHTML = `<strong>Incorreto!</strong><br>Você digitou: ${displayTyped}<br>Resposta correta: <strong>${currentCard.back}</strong>`;
        feedback.className = 'feedback-box error';
        feedback.classList.remove('hidden');

        btnNext.focus(); // Focus advance button so pressing Enter proceeds
    }
});

// Manual click listener for advance button on feedback screen
btnNext.addEventListener('click', () => {
    if (isWaitingForNext) {
        nextCard();
    }
});

// Listener to capture Enter key while paused on feedback screen
document.addEventListener('keydown', (e) => {
    if (isWaitingForNext && e.key === 'Enter') {
        e.preventDefault();
        nextCard();
    }
});

// --- 6. NAVIGATION & RESET ---
function returnHome() {
    fileInput.value = '';
    listSelect.value = '';
    quizSection.classList.add('hidden');
    fileSection.classList.remove('hidden');
}

btnHome.addEventListener('click', returnHome);
btnRestart.addEventListener('click', returnHome);

// --- 7. NATIVE TEXT-TO-SPEECH (TTS) ENGINE ---
function speakFrench(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'fr-FR';
        utterance.rate = 0.9; // Adjusted reading speed for clear listening

        window.speechSynthesis.speak(utterance);
    }
}
