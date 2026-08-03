// --- MAP PRE-LOADED MODULE LISTS ---
const BUILTIN_LISTS = {
    adverbes: typeof adverbesList !== 'undefined' ? adverbesList : '',
    connecteurs: typeof connecteursList !== 'undefined' ? connecteursList : '',
    connecteurs_a1_b1: typeof connecteursA1B1List !== 'undefined' ? connecteursA1B1List : '',
    connecteurs_a1_b1_phrases: typeof connecteursA1B1PhrasesList !== 'undefined' ? connecteursA1B1PhrasesList : '',
    frequence_1: typeof frequence1List !== 'undefined' ? frequence1List : ''
};

// --- APPLICATION STATE ---
let queue = [];               // Queue array for active study session
let currentCard = null;       // Active card under evaluation
let isWaitingForNext = false; // Flag to manage manual pause on error/success
let recognition = null;       // SpeechRecognition instance
let isRecording = false;      // Recording state flag

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
const btnMic = document.getElementById('btn-mic');
const cardsLeft = document.getElementById('cards-left');
const completionBox = document.getElementById('completion-box');
const btnRestart = document.getElementById('btn-restart');

// --- 1. UTILITY: FISHER-YATES SHUFFLE ALGORITHM ---
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// --- 2. PARSER FOR FILE INPUT ---
fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        parseAndStartSession(e.target.result);
    };
    reader.readAsText(file, 'UTF-8');
});

// --- 3. PARSER FOR PRE-LOADED LIST SELECTOR ---
listSelect.addEventListener('change', (event) => {
    const selectedKey = event.target.value;
    if (selectedKey && BUILTIN_LISTS[selectedKey]) {
        parseAndStartSession(BUILTIN_LISTS[selectedKey]);
    }
});

// --- 4. STRING PARSER (TAB separated terms, NEWLINE separated cards) ---
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

    // Shuffle cards randomly at the start of every game
    shuffleArray(queue);

    // Hide selection view and open quiz interface
    fileSection.classList.add('hidden');
    quizSection.classList.remove('hidden');
    completionBox.classList.add('hidden');
    quizForm.classList.remove('hidden');

    nextCard();
}

// --- 5. QUIZ FLOW & QUEUE MANAGEMENT ---
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

// --- 6. SUBMISSION & FEEDBACK PAUSE HANDLING ---
quizForm.addEventListener('submit', (e) => {
    e.preventDefault();

    // Stop recording if active upon submit
    if (isRecording && recognition) {
        recognition.stop();
    }

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

// --- 7. NAVIGATION & RESET ---
function returnHome() {
    if (isRecording && recognition) {
        recognition.stop();
    }
    fileInput.value = '';
    listSelect.value = '';
    quizSection.classList.add('hidden');
    fileSection.classList.remove('hidden');
}

btnHome.addEventListener('click', returnHome);
btnRestart.addEventListener('click', returnHome);

// --- 8. NATIVE TEXT-TO-SPEECH (TTS) ENGINE ---
function speakFrench(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'fr-FR';
        utterance.rate = 0.9;

        window.speechSynthesis.speak(utterance);
    }
}

// --- 9. SPEECH-TO-TEXT (STT) RECOGNITION ENGINE ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = 'fr-FR'; // Recognized language set to French
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
        isRecording = true;
        btnMic.classList.add('recording');
        btnMic.innerText = '🔴';
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        userInput.value = transcript; // Auto-fill input with recognized speech
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        stopRecordingState();
    };

    recognition.onend = () => {
        stopRecordingState();
    };

    btnMic.addEventListener('click', () => {
        if (isRecording) {
            recognition.stop();
        } else {
            recognition.start();
        }
    });
} else {
    // Hide mic button if browser doesn't support Web Speech API
    btnMic.style.display = 'none';
    console.warn('Speech Recognition API not supported in this browser.');
}

function stopRecordingState() {
    isRecording = false;
    btnMic.classList.remove('recording');
    btnMic.innerText = '🎤';
}
