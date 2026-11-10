// --- MAP PRE-LOADED MODULE LISTS ---
const BUILTIN_LISTS = {
    adverbes: typeof adverbesList !== 'undefined' ? adverbesList : '',
    connecteurs: typeof connecteursList !== 'undefined' ? connecteursList : '',
    connecteurs_a1_b1: typeof connecteursA1B1List !== 'undefined' ? connecteursA1B1List : '',
    connecteurs_a1_b1_phrases: typeof connecteursA1B1PhrasesList !== 'undefined' ? connecteursA1B1PhrasesList : '',
    commonVerbes: typeof commonVerbesList !== 'undefined' ? commonVerbesList : '',
    adjectives: typeof adjectivesList !== 'undefined' ? adjectivesList : ''
};

// --- MAP DELF B1 LISTS (Nested by Register: informal / formal) ---
const DELF_B1_LISTS = {
    'core-grammar': {
        informal: typeof gramaticaInformalList !== 'undefined' ? gramaticaInformalList : '',
        formal: typeof gramaticaFormalList !== 'undefined' ? gramaticaFormalList : ''
    },
    'core-connectors': {
        informal: typeof conectivosInformalList !== 'undefined' ? conectivosInformalList : '',
        formal: typeof conectivosFormalList !== 'undefined' ? conectivosFormalList : ''
    },
    'format-email': {
        informal: typeof emailInformalList !== 'undefined' ? emailInformalList : '',
        formal: typeof emailFormalList !== 'undefined' ? emailFormalList : ''
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

// --- SEMANTIC CATEGORY DEFINITIONS (For Multi-Answer Recall Mini-Game) ---
const CATEGORY_CHALLENGES = {
    addition: {
        title: "Adição & Enumeração",
        prompt: "Conectores para adicionar argumentos, enumerar ou introduzir novos pontos:",
        terms: [
            "et", "aussi", "de plus", "en plus", "en outre", "d'abord",
            "tout d'abord", "puis", "ensuite", "d'une part", "d'autre part",
            "d'ailleurs", "par ailleurs", "notamment", "quant à"
        ]
    },
    opposition: {
        title: "Oposição & Concessão",
        prompt: "Conectores e locuções para expressar contraste, oposição ou concessão:",
        terms: [
            "mais", "cependant", "pourtant", "néanmoins", "toutefois",
            "par contre", "en revanche", "alors que", "tandis que",
            "bien que", "malgré", "en dépit de", "au contraire", "loin de là"
        ]
    },
    cause: {
        title: "Causa & Justificativa",
        prompt: "Conectores para explicar o motivo, a origem ou justificar um fato:",
        terms: [
            "parce que", "car", "comme", "puisque", "en effet",
            "vu que", "étant donné que", "grâce à", "à cause de", "en raison de"
        ]
    },
    consequence: {
        title: "Consequência & Conclusão",
        prompt: "Conectores para indicar resultado, consequência lógica ou fechamento:",
        terms: [
            "donc", "alors", "c'est pourquoi", "par conséquent", "du coup",
            "ainsi", "bref", "enfin", "finalement", "en conclusion", "autrement dit"
        ]
    },
    time: {
        title: "Tempo & Frequência",
        prompt: "Advérbios e locuções de tempo, pontualidade ou frequência:",
        terms: [
            "quand", "lorsque", "dès que", "pendant que", "déjà", "encore",
            "toujours", "souvent", "parfois", "rarement", "jamais",
            "à présent", "à l'heure", "à temps", "en avance", "en retard",
            "tout de suite", "immédiatement", "bientôt", "à jamais"
        ]
    },
    manner: {
        title: "Modo, Intensidade & Nuance",
        prompt: "Advérbios e locuções modais de certeza, intensidade ou maneira:",
        terms: [
            "bien sûr", "tout à fait", "vraiment", "en fait", "en réalité",
            "à vrai dire", "apparemment", "peut-être", "probablement",
            "heureusement", "malheureusement", "à l'aise", "à merveille",
            "en vain", "par cœur", "à peine", "à peu près", "au moins",
            "plus ou moins", "pas du tout", "bel et bien", "en général"
        ]
    }
};

// --- AUDIO CONTEXT (Synthesized Chimes) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSoundAndSpeak(isCorrect, textToSpeak) {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    const now = audioCtx.currentTime;
    
    if (isCorrect) {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(783.99, now);
        oscillator.frequency.setValueAtTime(1046.50, now + 0.1);
        
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.4, now + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        
        oscillator.start(now);
        oscillator.stop(now + 0.4);
    } else {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(300, now);
        oscillator.frequency.exponentialRampToValueAtTime(250, now + 0.2);
        
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.4, now + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        
        oscillator.start(now);
        oscillator.stop(now + 0.3);
    }
    
    if (textToSpeak) {
        setTimeout(() => {
            speakFrench(textToSpeak);
        }, 400);
    }
}

// --- APPLICATION STATE ---
let queue = [];
let sessionHistory = [];
let currentCard = null;
let isWaitingForNext = false;
let recognition = null;
let isRecording = false;
let activeMenuContext = 'main'; // 'main' | 'delf' | 'category'
let quizMode = 'standard';      // 'standard' | 'category'
let sessionErrors = 0;
let maxSessionErrors = 3;
let lastSessionConfig = null;
let inputFlashTimeout = null;

// --- DOM ELEMENTS ---
const fileInput = document.getElementById('file-input');
const listSelect = document.getElementById('list-select');
const fileSection = document.getElementById('file-section');
const quizSection = document.getElementById('quiz-section');
const promptBox = document.querySelector('.prompt-box');
const promptText = document.getElementById('prompt-text');
const userInput = document.getElementById('user-input');
const quizForm = document.getElementById('quiz-form');
const feedback = document.getElementById('feedback');
const feedbackText = document.getElementById('feedback-text');
const btnNext = document.getElementById('btn-next');
const btnHome = document.getElementById('btn-home');
const btnMic = document.getElementById('btn-mic');
const btnRestart = document.getElementById('btn-restart');
const btnRetrySession = document.getElementById('btn-retry-session');
const btnOverride = document.getElementById('btn-override');
const cardsLeft = document.getElementById('cards-left');
const completionBox = document.getElementById('completion-box');
const completionMessage = document.getElementById('completion-message');
const sessionSummaryBox = document.getElementById('session-summary-box');

const mainMenu = document.getElementById('main-menu');
const delfB1Menu = document.getElementById('delf-b1-menu');
const categoryMenu = document.getElementById('category-menu');
const btnDelfB1 = document.getElementById('btn-delf-b1');
const btnCategoryMode = document.getElementById('btn-category-mode');
const btnBackMain = document.getElementById('btn-back-main');
const btnBackFromCategory = document.getElementById('btn-back-from-category');
const delfButtons = document.querySelectorAll('.btn-delf');
const categoryButtons = document.querySelectorAll('.btn-category');
const btnCategoryAll = document.getElementById('btn-category-all');
const categoryTargetSelect = document.getElementById('category-target-select');
const categoryErrorLimitSelect = document.getElementById('category-error-limit-select');
const registerRadios = document.querySelectorAll('input[name="register"]');

const quizHeader = document.getElementById('quiz-header');
const quizTitle = document.getElementById('quiz-title');
const quizSubtitle = document.getElementById('quiz-subtitle');

const categoryProgressBox = document.getElementById('category-progress-box');
const categoryProgressCount = document.getElementById('category-progress-count');
const categoryErrorCount = document.getElementById('category-error-count');
const categoryStatusMsg = document.getElementById('category-status-msg');
const categoryFoundChips = document.getElementById('category-found-chips');

// --- 1. UTILITY FUNCTIONS ---
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function normalizeInput(str) {
    return str.trim().toLowerCase().replace(/\s+/g, ' ');
}

function triggerInputFlash(type) {
    if (inputFlashTimeout) {
        clearTimeout(inputFlashTimeout);
    }
    userInput.classList.remove('input-error-flash', 'input-warn-flash');
    // Force DOM reflow to restart CSS keyframe animation on consecutive triggers
    void userInput.offsetWidth;

    const className = type === 'warn' ? 'input-warn-flash' : 'input-error-flash';
    userInput.classList.add(className);

    inputFlashTimeout = setTimeout(() => {
        userInput.classList.remove('input-error-flash', 'input-warn-flash');
    }, 450);
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

// --- 4. DELF B1 & CATEGORY MENU NAVIGATION ---
btnDelfB1.addEventListener('click', () => {
    mainMenu.classList.add('hidden');
    delfB1Menu.classList.remove('hidden');
});

btnBackMain.addEventListener('click', () => {
    delfB1Menu.classList.add('hidden');
    mainMenu.classList.remove('hidden');
});

btnCategoryMode.addEventListener('click', () => {
    mainMenu.classList.add('hidden');
    categoryMenu.classList.remove('hidden');
});

btnBackFromCategory.addEventListener('click', () => {
    categoryMenu.classList.add('hidden');
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
        const listId = e.currentTarget.getAttribute('data-list');
        const listTitle = e.currentTarget.getAttribute('data-title');
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

// --- 5. CATEGORY CHALLENGE SESSION INITIALIZER ---
function buildCategoryCard(categoryKey, targetPreference) {
    const data = CATEGORY_CHALLENGES[categoryKey];
    const totalAvailable = data.terms.length;
    const targetCount = targetPreference === 'all'
        ? totalAvailable
        : Math.min(parseInt(targetPreference, 10) || 3, totalAvailable);

    return {
        categoryKey,
        title: data.title,
        front: `${data.prompt}\n(Meta: ${targetCount} de ${totalAvailable} possíveis)`,
        validTerms: data.terms,
        targetCount,
        foundWords: []
    };
}

function startCategorySession(categoryKeys, sessionTitle) {
    const targetPref = categoryTargetSelect.value;
    const errorLimitPref = categoryErrorLimitSelect.value;

    lastSessionConfig = {
        mode: 'category',
        categoryKeys: [...categoryKeys],
        sessionTitle
    };

    sessionErrors = 0;
    maxSessionErrors = errorLimitPref === 'unlimited'
        ? Infinity
        : (parseInt(errorLimitPref, 10) || 3);

    queue = categoryKeys.map(key => buildCategoryCard(key, targetPref));
    sessionHistory = [...queue];

    if (queue.length > 1) {
        shuffleArray(queue);
    }

    quizMode = 'category';
    activeMenuContext = 'category';

    const targetLabel = targetPref === 'all' ? 'Todos os termos' : `${targetPref} termos/bloco`;
    const errorLabel = maxSessionErrors === Infinity ? 'Erros livres' : `Limite: ${maxSessionErrors} erro(s)`;

    quizTitle.innerText = sessionTitle;
    quizSubtitle.innerText = `${targetLabel} • ${errorLabel}`;
    quizHeader.classList.remove('hidden');

    sessionSummaryBox.classList.add('hidden');
    fileSection.classList.add('hidden');
    quizSection.classList.remove('hidden');
    completionBox.classList.add('hidden');
    quizForm.classList.remove('hidden');

    nextCard();
}

categoryButtons.forEach(button => {
    button.addEventListener('click', (e) => {
        const categoryKey = e.currentTarget.getAttribute('data-category');
        if (CATEGORY_CHALLENGES[categoryKey]) {
            startCategorySession([categoryKey], `Categoria - ${CATEGORY_CHALLENGES[categoryKey].title}`);
        }
    });
});

btnCategoryAll.addEventListener('click', () => {
    const allKeys = Object.keys(CATEGORY_CHALLENGES);
    startCategorySession(allKeys, "Desafio Completo - Todas as Categorias");
});

// --- 6. STANDARD STRING PARSER (TAB separated terms, NEWLINE separated cards) ---
function parseAndStartSession(rawText, title = "", subtitle = "") {
    queue = [];
    quizMode = 'standard';

    lastSessionConfig = {
        mode: 'standard',
        rawText,
        title,
        subtitle
    };
    
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

    if (title || subtitle) {
        quizTitle.innerText = title;
        quizSubtitle.innerText = subtitle;
        quizHeader.classList.remove('hidden');
    } else {
        quizHeader.classList.add('hidden');
    }

    sessionSummaryBox.classList.add('hidden');
    categoryProgressBox.classList.add('hidden');
    fileSection.classList.add('hidden');
    quizSection.classList.remove('hidden');
    completionBox.classList.add('hidden');
    quizForm.classList.remove('hidden');

    nextCard();
}

// --- 7. QUIZ FLOW & QUEUE MANAGEMENT ---
function renderCategoryProgress() {
    if (quizMode !== 'category' || !currentCard) {
        categoryProgressBox.classList.add('hidden');
        return;
    }

    categoryProgressBox.classList.remove('hidden');
    categoryProgressCount.innerText = `${currentCard.foundWords.length} / ${currentCard.targetCount}`;
    categoryErrorCount.innerText = maxSessionErrors === Infinity
        ? `${sessionErrors} (Livre)`
        : `${sessionErrors} / ${maxSessionErrors}`;

    categoryFoundChips.innerHTML = '';

    currentCard.foundWords.forEach(word => {
        const chip = document.createElement('span');
        chip.className = 'category-chip';
        chip.innerText = `✓ ${word}`;
        categoryFoundChips.appendChild(chip);
    });
}

function buildEndOfGameSummaryHTML() {
    const itemsHTML = sessionHistory.map(card => {
        const foundList = card.foundWords.length > 0
            ? card.foundWords.join(', ')
            : '<em>Nenhum</em>';
        const allValidList = card.validTerms.join(', ');

        return `
            <div class="summary-category-item">
                <strong>${card.title} (${card.foundWords.length}/${card.targetCount}):</strong><br>
                <span>Seus acertos: <strong>${foundList}</strong></span><br>
                <small>Gabarito completo do grupo: ${allValidList}</small>
            </div>
        `;
    }).join('');

    return `<div><strong>Resumo & Gabarito da Partida:</strong><hr style="margin: 8px 0; border: none; border-top: 1px solid #ddd;">${itemsHTML}</div>`;
}

function finishCategorySession(didWin) {
    isWaitingForNext = false;
    feedback.classList.add('hidden');
    promptBox.classList.add('hidden');
    categoryProgressBox.classList.add('hidden');
    quizForm.classList.add('hidden');

    if (didWin) {
        completionMessage.innerText = '🎉 Félicitations! Você concluiu o desafio de categorias!';
        completionMessage.className = 'completion-win';
        cardsLeft.innerText = '0';
    } else {
        completionMessage.innerText = `💥 Fim de Jogo! Você atingiu o limite de ${maxSessionErrors} erro(s).`;
        completionMessage.className = 'completion-lose';
    }

    sessionSummaryBox.innerHTML = buildEndOfGameSummaryHTML();
    sessionSummaryBox.classList.remove('hidden');
    completionBox.classList.remove('hidden');
}

function nextCard() {
    isWaitingForNext = false;
    feedback.classList.add('hidden');
    quizForm.classList.remove('hidden');
    userInput.value = '';
    userInput.classList.remove('input-error-flash', 'input-warn-flash');
    categoryStatusMsg.innerText = '';
    categoryStatusMsg.className = 'category-status-msg';

    if (queue.length === 0) {
        if (quizMode === 'category') {
            finishCategorySession(true);
            return;
        }

        promptText.innerText = '';
        promptBox.classList.add('hidden');
        categoryProgressBox.classList.add('hidden');
        quizForm.classList.add('hidden');
        completionMessage.innerText = '🎉 Félicitations! Você completou todos os cards desta lista!';
        completionMessage.className = 'completion-win';
        sessionSummaryBox.classList.add('hidden');
        completionBox.classList.remove('hidden');
        cardsLeft.innerText = '0';
        return;
    }

    promptBox.classList.remove('hidden');
    cardsLeft.innerText = queue.length;
    currentCard = queue[0];

    if (quizMode === 'category') {
        quizTitle.innerText = `Categoria - ${currentCard.title}`;
        renderCategoryProgress();
    } else {
        categoryProgressBox.classList.add('hidden');
    }

    promptText.innerText = currentCard.front;
    userInput.focus();
}

// --- 8. SUBMISSION & FEEDBACK PAUSE HANDLING ---
function handleStandardSubmission(userTyped) {
    const isCorrect = normalizeInput(userTyped) === normalizeInput(currentCard.back);

    userInput.blur();
    playSoundAndSpeak(isCorrect, currentCard.back);

    if (isCorrect) {
        queue.shift();
        isWaitingForNext = true;
        quizForm.classList.add('hidden');
        btnOverride.classList.add('hidden');

        feedbackText.innerHTML = `<strong>Correto!</strong><br>Resposta: <strong>${currentCard.back}</strong>`;
        feedback.className = 'feedback-box correct';
        feedback.classList.remove('hidden');
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
    }
}

function handleCategorySubmission(userTyped) {
    const normalizedTyped = normalizeInput(userTyped);

    const matchedCanonical = currentCard.validTerms.find(
        term => normalizeInput(term) === normalizedTyped
    );

    if (matchedCanonical) {
        const alreadyFound = currentCard.foundWords.some(
            word => normalizeInput(word) === normalizedTyped
        );

        if (alreadyFound) {
            triggerInputFlash('warn');
            categoryStatusMsg.innerText = '⚠️ Termo já utilizado neste bloco!';
            categoryStatusMsg.className = 'category-status-msg status-warn';
            userInput.select();
            return;
        }

        currentCard.foundWords.push(matchedCanonical);
        renderCategoryProgress();
        playSoundAndSpeak(true, matchedCanonical);

        if (currentCard.foundWords.length < currentCard.targetCount) {
            const remaining = currentCard.targetCount - currentCard.foundWords.length;
            categoryStatusMsg.innerText = `✓ Correto! Faltam ${remaining}...`;
            categoryStatusMsg.className = 'category-status-msg status-ok';
            userInput.value = '';
            userInput.focus();
            return;
        }

        // Block completed: do not reveal remaining answers until the whole game finishes
        userInput.blur();
        const completedCard = queue.shift();
        isWaitingForNext = true;
        quizForm.classList.add('hidden');
        btnOverride.classList.add('hidden');

        feedbackText.innerHTML = `<strong>Bloco Concluído (${completedCard.foundWords.length}/${completedCard.targetCount})!</strong><br>` +
            `Suas respostas: <strong>${completedCard.foundWords.join(', ')}</strong>`;
        feedback.className = 'feedback-box correct';
        feedback.classList.remove('hidden');
    } else {
        // Error in Category Mode: flash red, play error sound without voice spoiler, track error limit
        sessionErrors += 1;
        renderCategoryProgress();
        triggerInputFlash('error');
        playSoundAndSpeak(false, null);

        if (maxSessionErrors !== Infinity && sessionErrors >= maxSessionErrors) {
            userInput.blur();
            finishCategorySession(false);
            return;
        }

        const remainingErrors = maxSessionErrors === Infinity
            ? null
            : (maxSessionErrors - sessionErrors);

        const errorDetail = remainingErrors !== null
            ? `Restam ${remainingErrors} tentativa(s) na partida.`
            : 'Tente outro conector deste grupo.';

        categoryStatusMsg.innerText = `✗ Termo incorreto! ${errorDetail}`;
        categoryStatusMsg.className = 'category-status-msg status-error';
        userInput.select();
        userInput.focus();
    }
}

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

    if (quizMode === 'category') {
        handleCategorySubmission(userTyped);
    } else {
        handleStandardSubmission(userTyped);
    }
});

btnNext.addEventListener('click', (e) => {
    e.preventDefault();
    if (isWaitingForNext) {
        nextCard();
    }
});

btnOverride.addEventListener('click', (e) => {
    e.preventDefault();
    if (isWaitingForNext && quizMode === 'standard') {
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

// --- 9. NAVIGATION & RESET ---
function navigateBackToMenu(forceRootMain = false) {
    if (isRecording && recognition) {
        recognition.stop();
    }
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }

    fileInput.value = '';
    listSelect.value = '';
    isWaitingForNext = false;

    if (forceRootMain) {
        activeMenuContext = 'main';
    }

    quizSection.classList.add('hidden');
    fileSection.classList.remove('hidden');
    
    mainMenu.classList.add('hidden');
    delfB1Menu.classList.add('hidden');
    categoryMenu.classList.add('hidden');

    if (activeMenuContext === 'delf') {
        delfB1Menu.classList.remove('hidden');
    } else if (activeMenuContext === 'category') {
        categoryMenu.classList.remove('hidden');
    } else {
        mainMenu.classList.remove('hidden');
    }
}

// Header "← Voltar" returns to the previous submenu (DELF, Category, or Main)
btnHome.addEventListener('click', () => navigateBackToMenu(false));

// Completion "Voltar ao Início" always returns to the root Main Menu
btnRestart.addEventListener('click', () => navigateBackToMenu(true));

// Completion "Jogar Novamente" restarts the exact same session
btnRetrySession.addEventListener('click', () => {
    if (!lastSessionConfig) {
        navigateBackToMenu(true);
        return;
    }

    if (lastSessionConfig.mode === 'category') {
        startCategorySession(lastSessionConfig.categoryKeys, lastSessionConfig.sessionTitle);
    } else {
        parseAndStartSession(lastSessionConfig.rawText, lastSessionConfig.title, lastSessionConfig.subtitle);
    }
});

// --- 10. NATIVE TEXT-TO-SPEECH (TTS) ENGINE ---
function speakFrench(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'fr-FR';
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
    }
}

// --- 11. SPEECH-TO-TEXT (STT) RECOGNITION ENGINE ---
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
