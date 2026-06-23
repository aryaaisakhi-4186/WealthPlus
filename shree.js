/* ==========================================================================
   SHREE AI FEMALE BOOKKEEPER ASSISTANT - ENGINE (HINDI)
   ========================================================================== */

let isShreeVoiceEnabled = true;
let recognition = null;
let isListening = false;
let selectedVoice = null;

// Initialize Speech Synthesis and attempt to select a sweet female voice
function initShreeVoices() {
    if (!window.speechSynthesis) return;

    const findFemaleVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        
        // Check if there is a saved custom voice selection
        const savedVoiceName = localStorage.getItem('shree_selected_voice_name');
        if (savedVoiceName && savedVoiceName !== 'AUTO_DETECT') {
            const savedVoice = voices.find(v => v.name === savedVoiceName);
            if (savedVoice) {
                selectedVoice = savedVoice;
                populateVoiceList();
                return;
            }
        }

        // 1. Priority: Hindi Female Voice (Swara, Kalpana, Google Hindi etc.)
        let voice = voices.find(v => {
            const name = v.name.toLowerCase();
            const lang = v.lang.toLowerCase();
            return lang.includes('hi-in') && (name.includes('female') || name.includes('swara') || name.includes('kalpana') || name.includes('google'));
        });
        
        // 2. Fallback: Indian English Female Voice (Neerja, Heera, Google en-IN etc.)
        if (!voice) {
            voice = voices.find(v => {
                const name = v.name.toLowerCase();
                const lang = v.lang.toLowerCase();
                return lang.includes('en-in') && (name.includes('female') || name.includes('neerja') || name.includes('heera') || name.includes('google'));
            });
        }
        
        // 3. Fallback: Global English Female Voice (Zira, Hazel, Samantha, Tessa, Victoria, etc.)
        if (!voice) {
            voice = voices.find(v => {
                const name = v.name.toLowerCase();
                return name.includes('female') || 
                       name.includes('zira') || 
                       name.includes('hazel') || 
                       name.includes('samantha') || 
                       name.includes('tessa') ||
                       name.includes('victoria');
            });
        }
        
        // 4. Fallback: Any Hindi or Indian English voice
        if (!voice) {
            voice = voices.find(v => v.lang.includes('hi-IN') || v.lang.includes('en-IN'));
        }
        
        selectedVoice = voice || voices[0];
        populateVoiceList();
    };

    findFemaleVoice();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
        const originalOnVoicesChanged = window.speechSynthesis.onvoiceschanged;
        window.speechSynthesis.onvoiceschanged = () => {
            if (originalOnVoicesChanged) originalOnVoicesChanged();
            findFemaleVoice();
        };
    }
}

// Populate voices list in the UI dropdown
function populateVoiceList() {
    if (!window.speechSynthesis) return;
    const voiceSelect = document.getElementById('shree-voice-select');
    if (!voiceSelect) return;

    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return;

    // Check if list is already populated (avoid duplicate appends)
    if (voiceSelect.options.length > 1 && voiceSelect.options[1].value !== "") return;

    voiceSelect.innerHTML = '';

    // Add a default auto voice option
    const autoOption = document.createElement('option');
    autoOption.value = 'AUTO_DETECT';
    autoOption.textContent = 'Auto (Sweet Hindi)';
    voiceSelect.appendChild(autoOption);

    // Group voices so Hindi/Indian voices are at the top
    const hiInVoices = [];
    const enInVoices = [];
    const otherVoices = [];

    voices.forEach(v => {
        const lang = v.lang.toLowerCase();
        if (lang.includes('hi-in')) {
            hiInVoices.push(v);
        } else if (lang.includes('en-in')) {
            enInVoices.push(v);
        } else {
            otherVoices.push(v);
        }
    });

    const addVoiceToSelect = (v) => {
        const option = document.createElement('option');
        option.value = v.name;
        option.textContent = `${v.name} (${v.lang})`;
        voiceSelect.appendChild(option);
    };

    hiInVoices.forEach(addVoiceToSelect);
    enInVoices.forEach(addVoiceToSelect);
    otherVoices.forEach(addVoiceToSelect);

    // Restore saved voice preference
    const savedVoiceName = localStorage.getItem('shree_selected_voice_name');
    if (savedVoiceName) {
        voiceSelect.value = savedVoiceName;
    } else {
        voiceSelect.value = 'AUTO_DETECT';
    }
}

let isShreeSpeaking = false;

// Speak response in a sweet female voice
function speakShreeText(text) {
    if (!isShreeVoiceEnabled || !window.speechSynthesis) return;

    window.speechSynthesis.cancel(); // stop current speak
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Check if user chose AUTO_DETECT or a custom voice
    const savedVoiceName = localStorage.getItem('shree_selected_voice_name');
    if (savedVoiceName && savedVoiceName !== 'AUTO_DETECT') {
        const voices = window.speechSynthesis.getVoices();
        const savedVoice = voices.find(v => v.name === savedVoiceName);
        if (savedVoice) selectedVoice = savedVoice;
    }

    if (selectedVoice) {
        utterance.voice = selectedVoice;
        
        const name = selectedVoice.name.toLowerCase();
        const lang = selectedVoice.lang.toLowerCase();
        
        // Native High Quality voices should remain natural and clear
        if (lang.includes('hi-in') && (name.includes('google') || name.includes('swara') || name.includes('kalpana') || name.includes('natural'))) {
            utterance.pitch = 1.0; 
            utterance.rate = 0.95;
        } else if (name.includes('male')) {
            // Male fallback: high-pitch to make it sound female-like
            utterance.pitch = 1.25;
            utterance.rate = 0.90;
        } else {
            // Generic/default voice fallbacks
            utterance.pitch = 1.15;
            utterance.rate = 0.92;
        }
        utterance.lang = selectedVoice.lang;
    } else {
        utterance.pitch = 1.0;
        utterance.lang = 'hi-IN'; // default to Hindi
    }
    
    utterance.onstart = () => {
        isShreeSpeaking = true;
        // Temporarily pause recognition to prevent feedback
        if (recognition && isListening) {
            try {
                recognition.abort();
            } catch (e) {
                console.error("Error aborting recognition on speaking start:", e);
            }
        }
        setShreeStatus("बोल रही हूँ...");
    };

    utterance.onend = () => {
        // Wait 1000ms after speaking ends before restarting mic
        setTimeout(() => {
            isShreeSpeaking = false;
            if (isHandsFreeMode && !isListening) {
                safeStartRecognition();
            } else if (!isHandsFreeMode) {
                setShreeStatus("तैयार");
                updateMicButtonUI(false);
            }
        }, 1000);
    };

    utterance.onerror = () => {
        isShreeSpeaking = false;
        if (isHandsFreeMode && !isListening) {
            safeStartRecognition();
        }
    };
    
    window.speechSynthesis.speak(utterance);
}

// Initialize Speech Recognition
function initShreeSpeech() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'hi-IN'; // Native Hindi recognition
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            isListening = true;
            updateMicButtonUI(true);
            if (isHandsFreeMode) {
                setShreeStatus("सतत सुन रही हूँ...");
            } else {
                setShreeStatus("सुन रही हूँ...");
            }
        };

        recognition.onspeechend = () => {
            recognition.stop();
        };

        recognition.onend = () => {
            isListening = false;
            if (isHandsFreeMode && !isShreeSpeaking) {
                safeStartRecognition();
            } else if (!isHandsFreeMode) {
                updateMicButtonUI(false);
                setShreeStatus("तैयार");
            }
        };

        recognition.onresult = (event) => {
            // CRITICAL: Ignore own voice speech feedback to prevent infinite loop
            if (window.speechSynthesis && window.speechSynthesis.speaking) {
                console.log("Ignoring speech result: SpeechSynthesis is speaking.");
                return;
            }

            const transcript = event.results[event.results.length - 1][0].transcript.trim();
            const lowerText = transcript.toLowerCase();
            
            console.log("Speech recognized:", transcript);
            
            if (isHandsFreeMode) {
                // Check for wake words
                const wakeWords = ["wakeup shree", "wake up shree", "वेकअप श्री", "वेक अप श्री", "shree suno", "श्री सुनो", "सुनो श्री", "shree", "श्री", "shri", "jai hari", "जय हरी", "जय हरि"];
                let foundWakeWord = false;
                let matchedWord = "";
                
                for (let word of wakeWords) {
                    if (lowerText.includes(word)) {
                        foundWakeWord = true;
                        matchedWord = word;
                        break;
                    }
                }
                
                if (foundWakeWord) {
                    // Extract command after wake word
                    const idx = lowerText.indexOf(matchedWord);
                    let command = transcript.slice(idx + matchedWord.length).trim();
                    command = command.replace(/^[,.\s?।!]+/g, "").trim();
                    
                    if (command.length > 0) {
                        addMessageToShreeChat("user", transcript);
                        processShreeCommand(command);
                    } else {
                        addMessageToShreeChat("user", transcript);
                        speakShreeText("जी कहिए, मैं सुन रही हूँ।");
                        setShreeStatus("सुन रही हूँ...");
                    }
                }
            } else {
                // Standard mode: process everything
                addMessageToShreeChat("user", transcript);
                processShreeCommand(transcript);
            }
        };

        recognition.onerror = (event) => {
            console.error("Speech recognition error:", event.error);
            
            // 'no-speech' is normal when hands-free is active and user is silent.
            if (event.error === 'no-speech') return;

            if (isHandsFreeMode) {
                if (event.error === 'network' || event.error === 'aborted') return;
                setShreeStatus("पुनः प्रारंभ...");
                safeStartRecognition();
                return;
            }
            
            setShreeStatus("त्रुटि");
            let errMsg = "माफ़ कीजिये, मैं सुन नहीं पाई। कृपया माइक दबाकर दोबारा बोलें।";
            if (event.error === 'not-allowed') {
                errMsg = "माइक की अनुमति (Microphone Permission) नहीं मिली। कृपया ब्राउज़र सेटिंग्स में जाकर माइक की अनुमति दें। ध्यान दें: मोबाइल पर आवाज़ कमांड के लिए वेबसाइट का HTTPS (सुरक्षित) होना आवश्यक है।";
                alert("माइक अनुमति त्रुटि: कृपया ब्राउज़र के एड्रेस बार में ताले (lock) के आइकॉन पर क्लिक करके माइक की अनुमति दें। मोबाइल पर वॉइस कमांड चलाने के लिए इसे Firebase Hosting (HTTPS) पर चलाना आवश्यक है।");
            }
            speakShreeText("माफ़ कीजिये, मैं सुन नहीं पाई।");
            addMessageToShreeChat("shree", errMsg);
        };
    } else {
        console.warn("Speech recognition is not supported by this browser.");
        const mic = document.getElementById('btn-shree-mic');
        if (mic) mic.style.display = 'none';
    }
}

// Set header status text
function setShreeStatus(text) {
    const el = document.getElementById('shree-status-text');
    if (el) el.innerHTML = `AI सहायक &bull; ${text}`;
}

let isHandsFreeMode = false;

function safeStartRecognition() {
    if (!recognition || isListening) return;
    try {
        recognition.start();
    } catch (e) {
        console.warn("Recognition start failed, retrying in 1.2s...", e);
        setTimeout(() => {
            if (isHandsFreeMode && !isListening) {
                try {
                    recognition.start();
                } catch (err) {
                    console.error("Failed to restart recognition on retry:", err);
                }
            }
        }, 1200);
    }
}

function toggleShreeListening() {
    if (!recognition) {
        alert("माइक इनपुट इस ब्राउज़र में समर्थित नहीं है। कृपया क्रोम/एज का उपयोग करें या टाइप करें।");
        return;
    }
    if (isListening) {
        isHandsFreeMode = false;
        recognition.stop();
        speakShreeText("माइक बंद कर दिया गया है।");
    } else {
        isHandsFreeMode = true;
        try {
            recognition.start();
            speakShreeText("वॉयस असिस्टेंट सक्रिय है। आप श्री या जय हरी बोलकर निर्देश दे सकते हैं।");
        } catch (e) {
            console.error(e);
            safeStartRecognition();
        }
    }
}

function toggleShreeVoiceOutput() {
    isShreeVoiceEnabled = !isShreeVoiceEnabled;
    const btn = document.getElementById('btn-shree-voice-toggle');
    if (isShreeVoiceEnabled) {
        btn.classList.add('voice-active');
        btn.innerHTML = '<i data-lucide="volume-2"></i>';
        speakShreeText("आवाज़ चालू कर दी गई है।");
    } else {
        btn.classList.remove('voice-active');
        btn.innerHTML = '<i data-lucide="volume-x"></i>';
        if (window.speechSynthesis) window.speechSynthesis.cancel();
    }
    lucide.createIcons();
}

function updateMicButtonUI(listening) {
    const micBtn = document.getElementById('btn-shree-mic');
    if (!micBtn) return;
    if (listening) {
        micBtn.classList.add('listening');
        micBtn.innerHTML = '<i data-lucide="mic-off"></i>';
    } else {
        micBtn.classList.remove('listening');
        micBtn.innerHTML = '<i data-lucide="mic"></i>';
    }
    lucide.createIcons();
}

// Append chat bubbles to window
function addMessageToShreeChat(sender, text) {
    const container = document.getElementById('shree-messages-container');
    const msg = document.createElement('div');
    msg.className = `shree-msg msg-${sender}`;
    
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    msg.innerHTML = `
        <p>${text}</p>
        <span class="msg-time">${timeStr}</span>
    `;
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
}

// --- SHREE NATURAL LANGUAGE COMMAND INTERPRETER ---

function processShreeCommand(commandText) {
    const cmd = commandText.toLowerCase().trim();

    // 0. CLEAR CHAT COMMAND (e.g., "श्री अपना चैट बॉक्स क्लियर कर दो", "चैट साफ करो")
    if (cmd.includes("clear chat") || cmd.includes("चैट क्लियर") || cmd.includes("चैट साफ") || cmd.includes("चैट साफ़") || cmd.includes("चैट मिटाओ")) {
        const container = document.getElementById('shree-messages-container');
        if (container) {
            container.innerHTML = `
                <div class="shree-msg msg-shree">
                    <p>नमस्ते! मैं श्री हूँ, आपकी AI मुनीम। मैं आपकी आवाज़ सुनकर खर्च दर्ज कर सकती हूँ। बोलकर प्रयास करें: <em>"श्री जय हरि, मिसलेनियस एक्सपेंसेस में 100 रुपये खर्च हुए ऑफिस रिफ्रमेंट के लिए"</em></p>
                    <span class="msg-time">सक्रिय</span>
                </div>
            `;
        }
        const reply = "चैट बॉक्स साफ़ कर दिया गया है।";
        speakShreeText(reply);
        return;
    }

    // ==========================================
    // 1. SPECIFIC CUSTOM TRIGGER: "श्री जय हरि, मिसलेनियस एक्सपेंसेस में 100 रुपये खर्च हुए ऑफिस रिफ्रेशमेंट के लिए"
    // ==========================================
    if (cmd.includes("jai hari") || cmd.includes("shree jai hari") || cmd.includes("shri jai hari") || cmd.includes("जय हरी") || cmd.includes("जय हरि") || cmd.includes("जयहरि")) {
        const parsedExpense = parseCustomJaiHariCommand(cmd);
        if (parsedExpense) {
            // Add transaction via direct cloud sync function
            const newTx = {
                id: 't_' + Date.now(),
                description: parsedExpense.description,
                category: 'Others', // Misc. Expenses
                amount: parsedExpense.amount,
                date: new Date().toISOString().split('T')[0],
                mode: state.accounts[0]?.name || 'Main Cash', // default to first account
                clientId: ""
            };
            addExpenseDirect(newTx); // Syncs to local storage and firebase cloud in real time

            const vocalReply = `जय हरी! अन्य खर्च में ${parsedExpense.description} के लिए ${parsedExpense.amount} रुपये दर्ज कर दिए गए हैं।`;
            const textReply = `<strong>जय हरी!</strong> ₹${parsedExpense.amount} सफलतापूर्वक <strong>Others (Misc.)</strong> श्रेणी में दर्ज कर दिया गया है।<br>विवरण: "${parsedExpense.description}"`;
            
            addMessageToShreeChat("shree", textReply);
            speakShreeText(vocalReply);
            return;
        }
    }

    // 2. HELP COMMANDS
    if (cmd.includes("help") || cmd.includes("मदद") || cmd.includes("सहायता") || cmd.includes("क्या कर सकती हो") || cmd.includes("what can you do")) {
        const reply = "मैं श्री हूँ। मैं आपके खाते की मुनीमी कर सकती हूँ। आप बोलकर नया खर्च जोड़ सकते हैं, जैसे: 'श्री जय हरि, 100 रुपये खर्च ऑफिस रिफ्रेशमेंट के लिए'।";
        addMessageToShreeChat("shree", reply);
        speakShreeText(reply);
        return;
    }

    // 2.5 READ SCREEN/PAGE COMMANDS (e.g., "श्री एक्सपेंस पढ़कर बताओ", "इसे पढ़ो", "पेज सुनाओ")
    const isReadCommand = cmd.includes("read") || cmd.includes("पढ़") || cmd.includes("पढ़") || cmd.includes("सुनाओ") || cmd.includes("सुनाए") || cmd.includes("बोलकर बताओ") || cmd.includes("बताओ क्या है");
    if (isReadCommand) {
        let vocalReply = "";
        let textReply = "";
        const formatCur = v => '₹' + Math.round(v).toLocaleString('en-IN');
        const formatCurVocal = v => Math.round(v) + ' रुपये';

        // Check if specific section is mentioned
        const mentionsExpense = cmd.includes("expense") || cmd.includes("kharch") || cmd.includes("खर्च") || cmd.includes("भुगतान") || cmd.includes("एक्सपेंस") || cmd.includes("एक्सपेंसेस");
        const mentionsClient = cmd.includes("client") || cmd.includes("grahak") || cmd.includes("ग्राहक") || cmd.includes("क्लाइंट") || cmd.includes("पेमेंट") || cmd.includes("आमदनी") || cmd.includes("income");
        const mentionsDashboard = cmd.includes("dashboard") || cmd.includes("home") || cmd.includes("मुख्य पेज") || cmd.includes("होम") || cmd.includes("डैशबोर्ड") || cmd.includes("बैलेंस") || cmd.includes("balance") || cmd.includes("पैसे") || cmd.includes("पैसा");

        if (mentionsExpense) {
            // Read Expenses list
            const recentTxs = state.transactions.slice().reverse().slice(0, 5); // last 5
            vocalReply = "Haal hi ke kharche hain: ";
            textReply = "<strong>Recent Expenses Summary:</strong><br>";
            if (recentTxs.length > 0) {
                recentTxs.forEach((tx, idx) => {
                    const categoryLabel = tx.category || 'Others';
                    const desc = tx.description || categoryLabel;
                    vocalReply += `${desc} ke liye ${formatCurVocal(tx.amount)}. `;
                    textReply += `${idx + 1}. ${desc}: <strong>${formatCur(tx.amount)}</strong> (${tx.date})<br>`;
                });
            } else {
                vocalReply = "Abhi koi kharcha darj nahi kiya gaya hai.";
                textReply += "No expenses logged yet.";
            }
        } else if (mentionsClient) {
            // Read Clients list
            const totalClients = state.clients.length;
            vocalReply = `Aapke total ${totalClients} client hain. `;
            textReply = `<strong>Client Page Summary:</strong><br>👥 Total Clients: <strong>${totalClients}</strong><br>`;
            if (state.clients.length > 0) {
                vocalReply += "Udaharan ke liye, ";
                const list = state.clients.slice(0, 3);
                list.forEach(c => {
                    vocalReply += `${c.name} ka retainer ${formatCurVocal(c.monthlyPay)} hai. `;
                    textReply += `&bull; ${c.name}: <strong>${formatCur(c.monthlyPay)}</strong>/month<br>`;
                });
            }
        } else if (mentionsDashboard) {
            // Read Dashboard
            const stats = getGlobalStats();
            vocalReply = `Aapka cash balance ${formatCurVocal(stats.cashBalance)} hai, bank balance ${formatCurVocal(stats.bankBalance)} hai, aur total kharche ${formatCurVocal(stats.periodExpenses)} hain.`;
            textReply = `<strong>Dashboard Summary:</strong><br>💵 Cash Balance: <strong>${formatCur(stats.cashBalance)}</strong><br>🏦 Bank Balance: <strong>${formatCur(stats.bankBalance)}</strong><br>📉 Period Expenses: <strong>${formatCur(stats.periodExpenses)}</strong>`;
        } else {
            // Read based on active page
            const activePage = state.activePage || 'dashboard';
            if (activePage === 'dashboard') {
                const stats = getGlobalStats();
                vocalReply = `Dashboard par aapka cash balance ${formatCurVocal(stats.cashBalance)} hai, bank balance ${formatCurVocal(stats.bankBalance)} hai, aur total kharche ${formatCurVocal(stats.periodExpenses)} hain.`;
                textReply = `<strong>Dashboard Summary:</strong><br>💵 Cash Balance: <strong>${formatCur(stats.cashBalance)}</strong><br>🏦 Bank Balance: <strong>${formatCur(stats.bankBalance)}</strong><br>📉 Period Expenses: <strong>${formatCur(stats.periodExpenses)}</strong>`;
            } else if (activePage === 'clients') {
                const totalClients = state.clients.length;
                vocalReply = `Client page par aapke total ${totalClients} client hain. `;
                textReply = `<strong>Client Page Summary:</strong><br>👥 Total Clients: <strong>${totalClients}</strong><br>`;
                if (state.clients.length > 0) {
                    vocalReply += "Udaharan ke liye, ";
                    const list = state.clients.slice(0, 3);
                    list.forEach(c => {
                        vocalReply += `${c.name} ka retainer ${formatCurVocal(c.monthlyPay)} hai. `;
                        textReply += `&bull; ${c.name}: <strong>${formatCur(c.monthlyPay)}</strong>/month<br>`;
                    });
                }
            } else if (activePage === 'expenses') {
                const recentTxs = state.transactions.slice().reverse().slice(0, 5); // last 5
                vocalReply = "Expenses page par haal hi ke kharche hain: ";
                textReply = "<strong>Recent Expenses Summary:</strong><br>";
                if (recentTxs.length > 0) {
                    recentTxs.forEach((tx, idx) => {
                        const categoryLabel = tx.category || 'Others';
                        const desc = tx.description || categoryLabel;
                        vocalReply += `${desc} ke liye ${formatCurVocal(tx.amount)}. `;
                        textReply += `${idx + 1}. ${desc}: <strong>${formatCur(tx.amount)}</strong> (${tx.date})<br>`;
                    });
                } else {
                    vocalReply = "Abhi koi kharcha darj nahi kiya gaya hai.";
                    textReply += "No expenses logged yet.";
                }
            } else if (activePage === 'reports') {
                vocalReply = "Reports page par aap alag-alag ledgers aur statements check kar sakte hain.";
                textReply = "<strong>Reports Summary:</strong><br>You can check client ledgers and financial reports on this page.";
            } else if (activePage === 'master') {
                vocalReply = "Master settings page par aap configuration aur settings settings check kar sakte hain.";
                textReply = "<strong>Master Settings Summary:</strong><br>Manage accounts, budgets, and configurations here.";
            } else {
                vocalReply = "Main page ke content ko read kar sakti hoon. Kripya page open karein.";
                textReply = "I can read page content when you navigate to a specific page.";
            }
        }

        addMessageToShreeChat("shree", textReply);
        speakShreeText(vocalReply);
        return;
    }

    // 4. BALANCE QUERIES
    const balQuery = matchBalanceQuery(cmd);
    if (balQuery) {
        const reply = handleBalanceQuery(balQuery);
        addMessageToShreeChat("shree", reply);
        speakShreeText(reply);
        return;
    }

    // 5. CREATE CLIENTS
    const clientMatch = matchCreateClient(cmd);
    if (clientMatch) {
        const reply = handleCreateClient(clientMatch);
        addMessageToShreeChat("shree", reply);
        speakShreeText(reply);
        return;
    }

    // 6. LOG RECEIVED AMOUNTS
    const incomeMatch = matchLogIncome(cmd);
    if (incomeMatch) {
        const reply = handleLogIncome(incomeMatch);
        addMessageToShreeChat("shree", reply);
        speakShreeText(reply);
        return;
    }

    // 7. GENERAL EXPENSE ENTRIES
    const expenseMatch = matchLogExpense(cmd);
    if (expenseMatch) {
        const reply = handleLogExpense(expenseMatch);
        addMessageToShreeChat("shree", reply);
        speakShreeText(reply);
        return;
    }

    // 3. PAGE NAVIGATION (Moved down to prevent intercepting specific actions)
    const navMatch = matchNavigation(cmd);
    if (navMatch) {
        navigateToPage(navMatch.page);
        const reply = `${navMatch.label} पेज खोला जा रहा है।`;
        addMessageToShreeChat("shree", reply);
        speakShreeText(reply);
        return;
    }

    // Default Fallback - Call Gemini API if Key is present, otherwise show default local help
    if (typeof state !== 'undefined' && state.geminiApiKey) {
        setShreeStatus("सोच रही हूँ...");
        callGeminiAI(commandText)
            .then(reply => {
                setShreeStatus("Idle");
                addMessageToShreeChat("shree", reply);
                speakShreeText(reply);
            })
            .catch(err => {
                console.error("Gemini API error:", err);
                setShreeStatus("त्रुटि");
                const defaultReply = `माफ़ कीजिये, सर्वर से संपर्क नहीं हो पाया। (त्रुटि: ${err.message})`;
                addMessageToShreeChat("shree", defaultReply);
                speakShreeText("माफ़ कीजिये, सर्वर से संपर्क नहीं हो पाया।");
            });
    } else {
        const defaultReply = "माफ़ कीजिये, मैं यह काम सीधे नहीं कर सकती। यदि आप खर्च जोड़ना या नया ग्राहक बनाना चाहते हैं, तो कृपया वॉइस कमांड का उपयोग करें (जैसे: 'श्री जय हरी, 100 रुपये खर्च चाय के लिए')। सामान्य बातचीत के लिए मास्टर सेटिंग्स में ए आई की चाबी दर्ज करें।";
        addMessageToShreeChat("shree", defaultReply);
        speakShreeText("माफ़ कीजिये, मैं यह काम सीधे नहीं कर सकती हूँ।");
    }
}

// Global cache for discovered Gemini model configuration to prevent repeating discovery
let discoveredGeminiConfig = null;

// Call Google Gemini API directly
async function callGeminiAI(userPrompt) {
    const apiKey = state.geminiApiKey;
    if (!apiKey) throw new Error("Gemini API Key is missing.");

    // Create a context-aware system prompt
    const systemInstruction = `You are Shree, the sweet and polite female AI manager of the Wealth Plus bookkeeping web application.
Your character:
- Speak in sweet Hinglish (Hindi mixed with English, written in English script or Devanagari script, e.g., "Haan, maine check kiya. Main screen par dashboard open kar diya hai.").
- Keep your answers short, sweet, and professional. Maximum 2-3 sentences.
- You are talking to the business owner/user.
- Current app stats: clients count: ${state.clients.length}, transactions count: ${state.transactions.length}.
- Answer general questions (business tips, calculations, general knowledge, chit-chat) politely in Hinglish.
- If the user asks you to do something that you cannot do (such as deleting transactions, editing clients, exporting files, system resets, or other unsupported operations), explain politely that you cannot do this task directly, and guide them on how to do it manually if applicable (e.g., "Maaf kijiye, main directly delete nahi kar sakti. Aap screen par check karke manually delete kar sakte hain.").`;

    const requestBody = {
        contents: [{
            parts: [{
                text: `${systemInstruction}\n\nUser Question: ${userPrompt}\nShree Response:`
            }]
        }],
        generationConfig: {
            maxOutputTokens: 250,
            temperature: 0.7
        }
    };

    // Helper to send generateContent request
    const sendGenerateContent = async (version, modelName) => {
        const url = `https://generativelanguage.googleapis.com/${version}/${modelName}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            const msg = errData.error?.message || `HTTP error! status: ${response.status}`;
            throw new Error(msg);
        }
        const data = await response.json();
        if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
            return data.candidates[0].content.parts[0].text.trim();
        } else {
            throw new Error("Invalid response format from Gemini API.");
        }
    };

    // If we already successfully made a call or discovered a working config, reuse it
    if (discoveredGeminiConfig) {
        try {
            return await sendGenerateContent(discoveredGeminiConfig.version, discoveredGeminiConfig.model);
        } catch (e) {
            console.warn("Cached Gemini config failed, retrying discovery:", e);
            discoveredGeminiConfig = null; // Clear cache to trigger rediscovery
        }
    }

    // Attempt 1: Try gemini-1.5-flash with v1beta endpoint (Google AI Studio's default)
    try {
        console.log("Attempting Gemini call with gemini-1.5-flash on v1beta...");
        const result = await sendGenerateContent("v1beta", "models/gemini-1.5-flash");
        discoveredGeminiConfig = { version: "v1beta", model: "models/gemini-1.5-flash" };
        return result;
    } catch (err1) {
        console.warn("Gemini call failed with gemini-1.5-flash on v1beta:", err1.message);
        
        // Attempt 2: Try gemini-1.5-flash with v1 endpoint (stable endpoint)
        try {
            console.log("Attempting Gemini call with gemini-1.5-flash on v1...");
            const result = await sendGenerateContent("v1", "models/gemini-1.5-flash");
            discoveredGeminiConfig = { version: "v1", model: "models/gemini-1.5-flash" };
            return result;
        } catch (err2) {
            console.warn("Gemini call failed with gemini-1.5-flash on v1:", err2.message);

            // Attempt 3: Try gemini-2.5-flash with v1 endpoint (standard model for 2026)
            try {
                console.log("Attempting Gemini call with gemini-2.5-flash on v1...");
                const result = await sendGenerateContent("v1", "models/gemini-2.5-flash");
                discoveredGeminiConfig = { version: "v1", model: "models/gemini-2.5-flash" };
                return result;
            } catch (err3) {
                console.warn("Gemini call failed with gemini-2.5-flash on v1:", err3.message);

                // Attempt 4: Try gemini-2.0-flash with v1 endpoint
                try {
                    console.log("Attempting Gemini call with gemini-2.0-flash on v1...");
                    const result = await sendGenerateContent("v1", "models/gemini-2.0-flash");
                    discoveredGeminiConfig = { version: "v1", model: "models/gemini-2.0-flash" };
                    return result;
                } catch (err4) {
                    console.warn("Gemini call failed with gemini-2.0-flash on v1:", err4.message);

                    // Attempt 5: Try gemini-pro on v1 (older stable model)
                    try {
                        console.log("Attempting Gemini call with gemini-pro on v1...");
                        const result = await sendGenerateContent("v1", "models/gemini-pro");
                        discoveredGeminiConfig = { version: "v1", model: "models/gemini-pro" };
                        return result;
                    } catch (err5) {
                        console.warn("Gemini call failed with gemini-pro on v1:", err5.message);

                        // Attempt 6: Let's query ListModels to find out exactly what models this API key has access to!
                        console.log("Attempting to list available models for API key...");
                        let availableModels = [];
                        let listError = null;

                        // Try fetching list from v1beta
                        try {
                            const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
                            if (listResponse.ok) {
                                const listData = await listResponse.json();
                                if (listData.models) availableModels = listData.models;
                            }
                        } catch (e) {
                            listError = e;
                        }

                        // If empty, try fetching list from v1
                        if (availableModels.length === 0) {
                            try {
                                const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
                                if (listResponse.ok) {
                                    const listData = await listResponse.json();
                                    if (listData.models) availableModels = listData.models;
                                }
                            } catch (e) {
                                if (!listError) listError = e;
                            }
                        }

                        if (availableModels.length > 0) {
                            // Find a model supporting generateContent
                            const generateModels = availableModels.filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'));
                            if (generateModels.length > 0) {
                                // Sort candidates by preference (flash -> pro -> others)
                                const candidates = [];
                                const preferredOrder = ['flash', 'pro', 'gemini'];
                                for (const pref of preferredOrder) {
                                    const matching = generateModels.filter(m => m.name.toLowerCase().includes(pref) && !candidates.some(c => c.name === m.name));
                                    candidates.push(...matching);
                                }
                                generateModels.forEach(m => {
                                    if (!candidates.some(c => c.name === m.name)) candidates.push(m);
                                });

                                console.log("List of discovered candidate models:", candidates.map(c => c.name));

                                // Loop through candidates and find the first one that successfully runs (skips overloaded models)
                                let lastError = null;
                                for (const modelCandidate of candidates) {
                                    const version = "v1beta";
                                    console.log(`Attempting discovered model ${modelCandidate.name} on ${version}...`);
                                    try {
                                        const result = await sendGenerateContent(version, modelCandidate.name);
                                        discoveredGeminiConfig = { version: version, model: modelCandidate.name };
                                        return result;
                                    } catch (errCandidate) {
                                        console.warn(`Discovered model ${modelCandidate.name} failed:`, errCandidate.message);
                                        lastError = errCandidate;
                                        // Continue to the next candidate model
                                    }
                                }
                                throw new Error(`All discovered models failed. Last error: ${lastError ? lastError.message : 'unknown'}`);
                            }
                        }

                        // If listing models failed or returned nothing, bubble up the errors
                        const finalErr = new Error(`None of the models succeeded. \n- v1beta (gemini-1.5-flash): ${err1.message}\n- v1 (gemini-1.5-flash): ${err2.message}\n- v1 (gemini-2.5-flash): ${err3.message}\n- v1 (gemini-2.0-flash): ${err4.message}\n- v1 (gemini-pro): ${err5.message}\n- listModels error: ${listError ? listError.message : 'no models found'}`);
                        throw finalErr;
                    }
                }
            }
        }
    }
}

// Special parser: Extracts amount and description for Jai Hari trigger in Hindi/Hinglish
function parseCustomJaiHariCommand(cmd) {
    // Standardize digits (convert Hindi Devanagari digits to standard numerals)
    let text = cmd.replace(/[०१२३४५६७८९]/g, d => "०१२३४५६७८९".indexOf(d));
    
    // 1. Extract amount (digits)
    const amountMatch = text.match(/(\d+)/);
    if (!amountMatch) return null;
    const amount = Number(amountMatch[1]);

    // 2. Extract description (look for text before "ke liye" or "के लिए")
    let description = "Office Refreshment";
    
    if (text.includes("ke liye")) {
        const parts = text.split("ke liye")[0].split("kharch hue");
        if (parts.length > 1) {
            description = parts[1].trim();
        } else {
            // fallback splitting
            const lastWords = text.split("rs");
            if (lastWords.length > 1) {
                description = lastWords[1].split("ke liye")[0].replace("kharch hue", "").replace("me", "").trim();
            }
        }
    } else if (text.includes("के लिए")) {
        const parts1 = text.split("के लिए")[0];
        let parts = parts1.split("खर्च हुए");
        if (parts.length > 1) {
            description = parts[1].trim();
        } else {
            parts = parts1.split("खर्च");
            if (parts.length > 1) {
                description = parts[1].trim();
            } else {
                const amtStr = amountMatch[1];
                const idx = parts1.indexOf(amtStr);
                if (idx !== -1) {
                    description = parts1.slice(idx + amtStr.length)
                        .replace("रुपये", "")
                        .replace("रुपया", "")
                        .replace("रुपए", "")
                        .replace("रु", "")
                        .replace("में", "")
                        .replace("मे", "")
                        .trim();
                }
            }
        }
    }

    // Clean up keywords from description
    if (description) {
        description = description
            .replace(/office refreshment/gi, "Office Refreshment")
            .replace(/refreshment/gi, "Refreshment")
            .replace(/chai/gi, "Chai/Tea")
            .replace(/चाय/g, "Chai/Tea")
            .replace(/,/g, "")
            .trim();
            
        // Capitalize if it's in English
        if (description.match(/^[a-zA-Z]/)) {
            description = description.charAt(0).toUpperCase() + description.slice(1);
        }
    }

    return {
        amount: amount,
        description: description || "Office Refreshment"
    };
}

// Navigation matcher
function matchNavigation(cmd) {
    if (cmd.includes("dashboard") || cmd.includes("home") || cmd.includes("मुख्य पेज") || cmd.includes("होम") || cmd.includes("डैशबोर्ड")) {
        return { page: 'dashboard', label: 'डैशबोर्ड' };
    }
    if (cmd.includes("client") || cmd.includes("income") || cmd.includes("आमदनी") || cmd.includes("ग्राहक") || cmd.includes("पेमेंट") || cmd.includes("क्लाइंट")) {
        return { page: 'clients', label: 'ग्राहक और आमदनी' };
    }
    if (cmd.includes("expense") || cmd.includes("kharch") || cmd.includes("खर्च") || cmd.includes("भुगतान") || cmd.includes("एक्सपेंस") || cmd.includes("एक्सपेंसेस")) {
        return { page: 'expenses', label: 'खर्चे' };
    }
    if (cmd.includes("report") || cmd.includes("ledger") || cmd.includes("हिसाब") || cmd.includes("बहीखाता") || cmd.includes("रिपोर्ट") || cmd.includes("लेजर") || cmd.includes("लेज़र")) {
        return { page: 'reports', label: 'रिपोर्ट और खाता बही' };
    }
    if (cmd.includes("master") || cmd.includes("settings") || cmd.includes("सेटिंग") || cmd.includes("सेटअप") || cmd.includes("मास्टर")) {
        return { page: 'master', label: 'मास्टर सेटिंग्स' };
    }
    return null;
}

// Balance Query matcher
function matchBalanceQuery(cmd) {
    if (cmd.includes("balance") || cmd.includes("कितना पैसा") || cmd.includes("कितने पैसे") || cmd.includes("शेष")) {
        let targetAccount = null;
        for (let acc of state.accounts) {
            if (cmd.includes(acc.name.toLowerCase())) {
                targetAccount = acc;
                break;
            }
        }
        return { account: targetAccount };
    }
    return null;
}

function handleBalanceQuery(query) {
    const formatCur = v => '₹' + Math.round(v).toLocaleString('en-IN');
    
    if (query.account) {
        const accName = query.account.name;
        const totalIn = state.incomeLogs.filter(l => l.mode === accName).reduce((sum, l) => sum + Number(l.amount), 0);
        const totalOut = state.transactions.filter(t => t.mode === accName).reduce((sum, t) => sum + Number(t.amount), 0);
        return `${query.account.name} का शेष बैलेंस ${formatCur(totalIn - totalOut)} है।`;
    } else {
        const stats = getGlobalStats();
        return `कैश बैलेंस ${formatCur(stats.cashBalance)} है, और बैंक बैलेंस ${formatCur(stats.bankBalance)} है।`;
    }
}

// Create client (Supports English & Hindi Devanagari names, works with/without monthly pay)
function matchCreateClient(cmd) {
    let text = cmd.replace("shree", "").replace("shri", "").replace("श्री", "").trim();

    // Check if it contains client/grahak/ग्राहक/क्लाइंट intent
    const hasIntent = text.includes("client") || text.includes("grahak") || text.includes("ग्राहक") || text.includes("क्लाइंट");
    const hasAction = text.includes("add") || text.includes("create") || text.includes("जोड़") || text.includes("बना") || text.includes("दर्ज") || text.includes("ऐड") || text.includes("एड");

    if (!hasIntent && !hasAction) return null;

    // 1. Try matching name and monthly retainer amount (e.g. Acme 25000 / Acme grahak with 25000)
    const regexWithAmount = /([a-zA-Z\s\u0900-\u097F]+)\s+(?:with|monthly|retainer|के साथ|का|मासिक)?\s*(\d+)/i;
    let match = text.match(regexWithAmount);
    if (match) {
        let rawName = match[1];
        let cleaned = cleanClientName(rawName);
        let englishName = transliterateDevanagariToEnglish(cleaned);
        if (englishName.length > 1) {
            return { name: englishName, monthlyPay: Number(match[2]) };
        }
    }

    // 2. Try matching name without monthly retainer (defaults to 0)
    let rawName = "";
    if (text.includes("ke naam se") || text.includes("के नाम से") || text.includes("नाम से")) {
        rawName = text.split(/(?:ke naam se|के नाम से|नाम से)/)[0];
    } else {
        rawName = text;
    }

    let cleaned = cleanClientName(rawName);
    let englishName = transliterateDevanagariToEnglish(cleaned);
    if (englishName.length > 1) {
        return { name: englishName, monthlyPay: 0 };
    }

    return null;
}

// Clean client name by removing common prefixes and suffixes
function cleanClientName(rawName) {
    let name = rawName;
    const wordsToRemove = [
        "client", "grahak", "ग्राहक", "क्लाइंट", 
        "add", "create", "ऐड", "एड", "new", "new client", "नया ग्राहक",
        "बनाओ", "जोड़ो", "दर्ज करो", "बना दो", "जोड़ो", "बना",
        "नया", "नए", "एक", "में", "करो", "कर दो", "कर", "दो", 
        "के नाम से", "नाम से", "नाम", "के", "से", "को", "ek", "naya", "ko", "kar", "do"
    ];
    
    wordsToRemove.forEach(word => {
        const escWord = word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`\\b${escWord}\\b`, 'gi');
        name = name.replace(regex, '');
        name = name.replace(new RegExp(`(?:^|\\s)${escWord}(?:\\s|$)`, 'g'), ' ');
    });
    
    return name.replace(/^[,.\s?।!]+/g, "").replace(/[,.\s?।!]+$/g, "").replace(/\s+/g, " ").trim();
}

// Transliterate Devanagari name to standard English uppercase
function transliterateDevanagariToEnglish(text) {
    const mapping = {
        'अ': 'a', 'आ': 'a', 'इ': 'i', 'ई': 'i', 'उ': 'u', 'ऊ': 'u', 'ऋ': 'ri', 'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au',
        'क': 'ka', 'ख': 'kha', 'ग': 'ga', 'घ': 'gha', 'ङ': 'nga',
        'च': 'cha', 'छ': 'chha', 'ज': 'ja', 'झ': 'jha', 'ञ': 'nya',
        'ट': 'ta', 'ठ': 'tha', 'ड': 'da', 'ढ': 'dha', 'ण': 'na',
        'त': 'ta', 'थ': 'tha', 'द': 'da', 'ध': 'dha', 'न': 'na',
        'प': 'pa', 'फ': 'pha', 'ब': 'ba', 'भ': 'bha', 'म': 'ma',
        'य': 'ya', 'र': 'ra', 'ल': 'la', 'व': 'va',
        'श': 'sha', 'ष': 'sha', 'स': 'sa', 'ह': 'ha',
        'क्ष': 'ksha', 'त्र': 'tra', 'ज्ञ': 'gya',
        'ा': 'a', 'ि': 'i', 'ी': 'i', 'ु': 'u', 'ू': 'u', 'ृ': 'ri', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au',
        'ं': 'n', 'ः': 'h', 'ँ': 'n', '्': ''
    };

    let result = "";
    let i = 0;
    const consonants = ['क','ख','ग','घ','ङ','च','छ','ज','झ','ञ','ट','ठ','ड','ढ','ण','त','थ','द','ध','न','प','फ','ब','भ','म','य','र','ल','व','श','ष','स','ह','क्ष','त्र','ज्ञ'];
    const matras = ['ा','ि','ी','ु','ू','ृ','े','ै','ो','ौ','ं','ः','ँ'];

    while (i < text.length) {
        let char = text[i];
        let nextChar = (i + 1 < text.length) ? text[i+1] : '';
        
        if (char === ' ') {
            result += ' ';
            i++;
            continue;
        }

        if (char.match(/[a-zA-Z]/)) {
            result += char;
            i++;
            continue;
        }

        let mapped = mapping[char] || char;

        if (consonants.includes(char)) {
            if (nextChar === '्') {
                if (mapped.endsWith('a')) {
                    mapped = mapped.slice(0, -1);
                }
                i += 2;
                result += mapped;
                continue;
            } else if (matras.includes(nextChar)) {
                if (mapped.endsWith('a')) {
                    mapped = mapped.slice(0, -1);
                }
                let matraMapped = mapping[nextChar] || '';
                result += mapped + matraMapped;
                i += 2;
                continue;
            } else {
                if (i + 1 === text.length || text[i+1] === ' ') {
                    if (mapped.endsWith('a') && mapped.length > 1) {
                        mapped = mapped.slice(0, -1);
                    }
                }
                result += mapped;
                i++;
                continue;
            }
        } else {
            result += mapped;
            i++;
        }
    }
    
    return result.toUpperCase().trim()
        .replace(/\s+/g, ' ')
        .replace(/PREMA/g, 'PREM')
        .replace(/NARAYANA/g, 'NARAYAN')
        .replace(/BALAKRISHNA/g, 'BALKRISHNA')
        .replace(/KRISHNA/g, 'KRISHNA');
}

function handleCreateClient(clientData) {
    const exists = state.clients.find(c => c.name.toLowerCase() === clientData.name.toLowerCase());
    if (exists) return `ग्राहक ${clientData.name} पहले से ही मौजूद है।`;

    const newClient = {
        id: 'c_' + Date.now(),
        name: clientData.name.charAt(0).toUpperCase() + clientData.name.slice(1),
        monthlyPay: clientData.monthlyPay
    };
    addClientDirect(newClient);
    return `ग्राहक ${newClient.name} को ₹${clientData.monthlyPay.toLocaleString('en-IN')} के मासिक रिटेनर के साथ जोड़ दिया गया है।`;
}

// Log Income
function matchLogIncome(cmd) {
    const amountMatch = cmd.match(/(\d+)/);
    if (!amountMatch) return null;
    const amount = Number(amountMatch[1]);

    let matchedClient = null;
    for (let c of state.clients) {
        if (cmd.includes(c.name.toLowerCase())) { matchedClient = c; break; }
    }

    let matchedAccount = null;
    for (let a of state.accounts) {
        if (cmd.includes(a.name.toLowerCase())) { matchedAccount = a; break; }
    }

    if (amount && matchedClient && matchedAccount) {
        return { client: matchedClient, account: matchedAccount, amount: amount };
    }
    return null;
}

function handleLogIncome(incomeData) {
    const newIncome = {
        id: 'i_' + Date.now(),
        clientId: incomeData.client.id,
        amount: incomeData.amount,
        date: new Date().toISOString().split('T')[0],
        mode: incomeData.account.name
    };
    addIncomeDirect(newIncome);
    return `${incomeData.client.name} से प्राप्त ₹${incomeData.amount.toLocaleString('en-IN')} को ${incomeData.account.name} में जमा कर दिया गया है।`;
}

// Log Expense
function matchLogExpense(cmd) {
    const amountMatch = cmd.match(/(\d+)/);
    if (!amountMatch) return null;
    const amount = Number(amountMatch[1]);

    let category = 'Others';
    const categories = ['Food', 'Shopping', 'Bills', 'Transport', 'Rent'];
    for (let cat of categories) {
        if (cmd.includes(cat.toLowerCase())) { category = cat; break; }
    }
    // Hindi category keywords maps
    if (cmd.includes("khaana") || cmd.includes("खाना") || cmd.includes("चाय") || cmd.includes("नाश्ता") || cmd.includes("lunch") || cmd.includes("tea") || cmd.includes("dinner")) {
        category = 'Food';
    } else if (cmd.includes("recharge") || cmd.includes("electricity") || cmd.includes("बिजली") || cmd.includes("bill") || cmd.includes("server") || cmd.includes("बिल")) {
        category = 'Bills';
    } else if (cmd.includes("petrol") || cmd.includes("किराया") || cmd.includes("travel") || cmd.includes("auto") || cmd.includes("taxi") || cmd.includes("गाड़ी")) {
        category = 'Transport';
    } else if (cmd.includes("room") || cmd.includes("rent") || cmd.includes("दुकान किराया")) {
        category = 'Rent';
    } else if (cmd.includes("kharidari") || cmd.includes("खरीद") || cmd.includes("कपड़े") || cmd.includes("shopping") || cmd.includes("सामान")) {
        category = 'Shopping';
    }

    let matchedAccount = null;
    for (let a of state.accounts) {
        if (cmd.includes(a.name.toLowerCase())) { matchedAccount = a; break; }
    }

    let matchedClient = null;
    for (let c of state.clients) {
        if (cmd.includes(c.name.toLowerCase())) { matchedClient = c; break; }
    }

    let description = "खर्च प्रविष्टि";
    if (cmd.includes("for ")) {
        const parts = cmd.split("for ");
        if (parts.length > 1) description = parts[1].split("from")[0].split("into")[0].trim();
    } else if (cmd.includes("ke liye")) {
        const parts = cmd.split("ke liye");
        description = parts[0].replace(/\d+/g, "").replace("rupaya", "").replace("rupaye", "").replace("rs", "").trim();
    } else if (cmd.includes("के लिए")) {
        const parts = cmd.split("के लिए");
        description = parts[0].replace(/\d+/g, "").replace("रुपये", "").replace("रुपया", "").replace("रुपए", "").replace("रु", "").trim();
    }

    if (matchedAccount) description = description.replace(matchedAccount.name.toLowerCase(), "").trim();
    if (matchedClient) description = description.replace(matchedClient.name.toLowerCase(), "").trim();
    
    // Capitalize if in English
    if (description.match(/^[a-zA-Z]/)) {
        description = description.charAt(0).toUpperCase() + description.slice(1);
    }

    if (amount && matchedAccount) {
        return {
            amount: amount,
            category: category,
            account: matchedAccount,
            client: matchedClient,
            description: description || `${category} Expense`
        };
    }
    return null;
}

function handleLogExpense(expenseData) {
    const newExpense = {
        id: 't_' + Date.now(),
        description: expenseData.description,
        category: expenseData.category,
        amount: expenseData.amount,
        date: new Date().toISOString().split('T')[0],
        mode: expenseData.account.name,
        clientId: expenseData.client ? expenseData.client.id : ""
    };
    addExpenseDirect(newExpense);
    return `${expenseData.account.name} से ${expenseData.description} (${expenseData.category}) के लिए ₹${expenseData.amount.toLocaleString('en-IN')} का खर्च दर्ज कर दिया गया है।`;
}

// --- DOM REGISTRATIONS ---

document.addEventListener('DOMContentLoaded', () => {
    initShreeVoices();
    initShreeSpeech();

    // Voice selection listener
    const voiceSelect = document.getElementById('shree-voice-select');
    if (voiceSelect) {
        voiceSelect.addEventListener('change', (e) => {
            const val = e.target.value;
            if (val === 'AUTO_DETECT') {
                localStorage.removeItem('shree_selected_voice_name');
                const voices = window.speechSynthesis.getVoices();
                let voice = voices.find(v => {
                    const name = v.name.toLowerCase();
                    const lang = v.lang.toLowerCase();
                    return lang.includes('hi-in') && (name.includes('female') || name.includes('swara') || name.includes('kalpana') || name.includes('google'));
                });
                if (!voice) voice = voices.find(v => v.lang.includes('hi-IN'));
                selectedVoice = voice || voices[0];
            } else {
                localStorage.setItem('shree_selected_voice_name', val);
                const voices = window.speechSynthesis.getVoices();
                selectedVoice = voices.find(v => v.name === val) || selectedVoice;
            }
            speakShreeText("जय हरी! आवाज़ बदल दी गई है।");
        });
    }

    // Toggle Chat window bubble
    const toggleBtn = document.getElementById('btn-shree-toggle');
    const closeBtn = document.getElementById('btn-shree-close');
    const chatWindow = document.getElementById('shree-chat-window');

    if (toggleBtn && closeBtn && chatWindow) {
        toggleBtn.addEventListener('click', () => {
            chatWindow.classList.add('active');
            toggleBtn.style.display = 'none';
            speakShreeText("नमस्ते! मैं श्री हूँ। मैं आपकी क्या सहायता कर सकती हूँ?");
        });

        closeBtn.addEventListener('click', () => {
            chatWindow.classList.remove('active');
            toggleBtn.style.display = 'flex';
        });
    }

    // Voice response mute/unmute
    const voiceToggle = document.getElementById('btn-shree-voice-toggle');
    if (voiceToggle) {
        voiceToggle.addEventListener('click', toggleShreeVoiceOutput);
    }

    // Mic button trigger
    const micBtn = document.getElementById('btn-shree-mic');
    if (micBtn) {
        micBtn.addEventListener('click', toggleShreeListening);
    }

    // Send button triggers
    const sendBtn = document.getElementById('btn-shree-send');
    const textInput = document.getElementById('shree-text-input');

    const triggerSend = () => {
        if (!textInput) return;
        const val = textInput.value.trim();
        if (val) {
            addMessageToShreeChat("user", val);
            processShreeCommand(val);
            textInput.value = '';
        }
    };

    if (sendBtn && textInput) {
        sendBtn.addEventListener('click', triggerSend);
        textInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') triggerSend();
        });
    }
});
