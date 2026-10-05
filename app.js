// --- MAP PRE-LOADED MODULE LISTS ---
const BUILTIN_LISTS = {
    adverbes: typeof adverbesList !== 'undefined' ? adverbesList : '',
    connecteurs: typeof connecteursList !== 'undefined' ? connecteursList : '',
    connecteurs_a1_b1: typeof connecteursA1B1List !== 'undefined' ? connecteursA1B1List : '',
    connecteurs_a1_b1_phrases: typeof connecteursA1B1PhrasesList !== 'undefined' ? connecteursA1B1PhrasesList : '',
    frequence_1: typeof frequence1List !== 'undefined' ? frequence1List : ''
};

// --- MAP DELF B1 LISTS (Nested by Register: informal / formal) ---
const DELF_B1_LISTS = {
    'core-grammar': {
        informal: typeof gramaticaInformalList !== 'undefined' ? gramaticaInformalList : "",
        formal: typeof gramaticaFormalList !== 'undefined' ? gramaticaFormalList : ""
    },
    'core-connectors': {
        informal: typeof conectivosInformalList !== 'undefined' ? conectivosInformalList : "",
        formal: typeof conectivosFormalList !== 'undefined' ? conectivosFormalList : ""
    },
    'format-email': {
        informal: typeof emailInformalList !== 'undefined' ? emailInformalList : "",
        formal: typeof emailFormalList !== 'undefined' ? emailFormalList : ""
    },
    'format-letter': {
        informal: "Despedida de carta amigável (Template)\tFormule de politesse amicale (Template)",
        formal: "Despedida de carta administrativa (Template)\tFormule de politesse administrative (Template)"
    },
    'format-forum': {
        informal: "Expressão de opinião (Template)\tExpression d'opinion (Template)",
        formal: "Expressão de opinião (Template)\tExpression d'opinion (Template)" 
    }
};

// --- AUDIO CONTEXT (Duolingo Style Bells) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSoundAndSpeak(isCorrect, textToSpeak) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    const now = audioCtx.currentTime;
    
    if (isCorrect) {
        // Success: Soft double chime (G5 to C6)
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(783.99, now); // G5
        oscillator.frequency.setValueAtTime(1046.50, now + 0.1); // C6
        
        // Envelope: quick attack, smooth decay
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.4, now + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        
        oscillator.start(now);
        oscillator.stop(now + 0.4);
    } else {
        // Error: Soft low bell (Single drop)
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(300, now);
        oscillator.frequency.exponentialRampToValueAtTime(250, now + 0.2);
        
        // Envelope: soft attack, quick drop
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.4, now + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        
        oscillator.start(now);
        oscillator.stop(now + 0.3);
    }
    
    setTimeout(() => {
        speakFrench(textToSpeak);
    }, 400); // Wait for the sound to finish before speaking
}

// --- APPLICATION STATE ---
let queue = [];               
let currentCard = null;       
let isWaitingForNext = false; 
let recognition = null;       
let isRecording = false;
let activeMenuContext = 'main'; // Tracks if user is in 'main' or 'delf' menu      

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
const btnRestart = document.getElementById('btn-restart');
const btnOverride = document.getElementById('btn-override');
const cardsLeft = document.getElementById('cards-left');
const completionBox = document.getElementById('completion-box');

const mainMenu = document.getElementById('main-menu');
const delfB1Menu = document.getElementById('delf-b1-menu');
const btnDelfB1 = document.getElementById('btn-delf-b1');
const btnBackMain = document.getElementById('btn-back-main');
const delfButtons = document.querySelectorAll('.btn-delf');
const registerRadios = document.querySelectorAll('input[name="register"]');

const quizHeader = document.getElementById('quiz-header');
const quizTitle = document.getElementById('quiz-title');
const quizSubtitle = document.getElementById('quiz-subtitle');

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
        activeMenuContext = 'main';
        parseAndStartSession(e.target.result, "Arquivo Local", file.name);
    };
    reader.readAsText(file, 'UTF-8');
});

// --- 3. PARSER FOR PRE-LOADED LIST SELECTOR ---
listSelect.addEventListener('change', (event) => {
    const selectedKey = event.target.value;
    const selectedText = event.target.options[event.target.selectedIndex].text;
    if (selectedKey && BUILTIN_LISTS[selectedKey]) {
        activeMenuContext = 'main';
        parseAndStartSession(BUILTIN_LISTS[selectedKey], "Lista Padrão", selectedText);
    }
});

// --- 4. DELF B1 NAVIGATION & SELECTION ---
btnDelfB1.addEventListener('click', () => {
    mainMenu.classList.add('hidden');
    delfB1Menu.classList.remove('hidden');
});

btnBackMain.addEventListener('click', () => {
    delfB1Menu.classList.add('hidden');
    mainMenu.classList.remove('hidden');
});

function getSelectedRegister() {
    let selected = 'informal';
    registerRadios.forEach(radio => {
        if (radio.checked) selected = radio.value;
    });
    return selected;
}

delfButtons.forEach(button => {
    button.addEventListener('click', (e) => {
        const listId = e.target.getAttribute('data-list');
        const listTitle = e.target.getAttribute('data-title');
        const register = getSelectedRegister();
        const rawText = DELF_B1_LISTS[listId][register];
        
        if (!rawText) {
            alert('Lista não encontrada para o registro selecionado.');
            return;
        }
        
        activeMenuContext = 'delf';
        const subtitleStr = register === 'informal' ? 'Registro: Informal (Tu)' : 'Registro: Formal (Vous)';
        
        parseAndStartSession(rawText, `DELF B1 - ${listTitle}`, subtitleStr);
    });
});

// --- 5. STRING PARSER (TAB separated terms, NEWLINE separated cards) ---
function parseAndStartSession(rawText, title = "", subtitle = "") {
    queue = [];
    
    const lines = rawText.split(/\r?\n/);

    lines.forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine) {
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

    shuffleArray(queue);

    // Configuração dos Títulos
    if (title || subtitle) {
        quizTitle.innerText = title;
        quizSubtitle.innerText = subtitle;
        quizHeader.classList.remove('hidden');
    } else {
        quizHeader.classList.add('hidden');
    }

    fileSection.classList.add('hidden');
    quizSection.classList.remove('hidden');
    completionBox.classList.add('hidden');
    quizForm.classList.remove('hidden');

    nextCard();
}

// --- 6. QUIZ FLOW & QUEUE MANAGEMENT ---
function nextCard() {
    isWaitingForNext = false;
    feedback.classList.add('hidden');
    quizForm.classList.remove('hidden');
    userInput.value = '';

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

// --- 7. SUBMISSION & FEEDBACK PAUSE HANDLING ---
quizForm.addEventListener('submit', (e) => {
    e.preventDefault();

    if (isRecording && recognition) {
        recognition.stop();
    }

    if (isWaitingForNext) {
        nextCard();
        return;
    }

    const userTyped = userInput.value.trim();
    const isCorrect = userTyped.toLowerCase() === currentCard.back.toLowerCase();

    playSoundAndSpeak(isCorrect, currentCard.back);

    if (isCorrect) {
        queue.shift();
        isWaitingForNext = true;
        quizForm.classList.add('hidden');
        
        btnOverride.classList.add('hidden');

        feedbackText.innerHTML = `<strong>Correto!</strong><br>Resposta: <strong>${currentCard.back}</strong>`;
        feedback.className = 'feedback-box correct';
        feedback.classList.remove('hidden');

        btnNext.focus();
    } else {
        const failedCard = queue.shift();
        queue.push(failedCard);

        isWaitingForNext = true;
        quizForm.classList.add('hidden');
        
        btnOverride.classList.remove('hidden');

        const displayTyped = userTyped ? `<code>${userTyped}</code>` : '<em>(Vazio)</em>';
        feedbackText.innerHTML = `<strong>Incorreto!</strong><br>Você digitou: ${displayTyped}<br>Resposta correta: <strong>${currentCard.back}</strong>`;
        feedback.className = 'feedback-box error';
        feedback.classList.remove('hidden');

        btnNext.focus(); 
    }
});

btnOverride.addEventListener('click', () => {
    if (isWaitingForNext) {
        queue.pop();
        nextCard();
    }
});

document.addEventListener('keydown', (e) => {
    if (isWaitingForNext && e.key === 'Enter') {
        e.preventDefault();
        nextCard();
    }
});

// --- 8. NAVIGATION & RESET ---
function returnHome() {
    if (isRecording && recognition) {
        recognition.stop();
    }
    fileInput.value = '';
    listSelect.value = '';
    quizSection.classList.add('hidden');
    fileSection.classList.remove('hidden');
    
    // Logic to restore the correct menu based on state
    if (activeMenuContext === 'delf') {
        mainMenu.classList.add('hidden');
        delfB1Menu.classList.remove('hidden');
    } else {
        mainMenu.classList.remove('hidden');
        delfB1Menu.classList.add('hidden');
    }
}

btnHome.addEventListener('click', returnHome);
btnRestart.addEventListener('click', returnHome);

// --- 9. NATIVE TEXT-TO-SPEECH (TTS) ENGINE ---
function speakFrench(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'fr-FR';
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
    }
}

// --- 10. SPEECH-TO-TEXT (STT) RECOGNITION ENGINE ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = 'fr-FR'; 
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
        isRecording = true;
        btnMic.classList.add('recording');
        btnMic.innerText = '🔴';
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        userInput.value = transcript; 
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
    btnMic.style.display = 'none';
    console.warn('Speech Recognition API not supported in this browser.');
}

function stopRecordingState() {
    isRecording = false;
    btnMic.classList.remove('recording');
    btnMic.innerText = '🎤';
}
