/* ==========================================================================
   SHREE AI FEMALE BOOKKEEPER ASSISTANT - ENGINE (HINDI)
   ========================================================================== */

let isShreeVoiceEnabled = false; // Voice output is disabled. Shree will remain silent and only output text.
let recognition = null;
let isListening = false;
let selectedVoice = null;
let lastSpokenText = ""; // Global cache of last speech synthesis output to prevent feedback loops

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

    // Save cleaned lowercase spoken text to prevent microphone feedback loops
    lastSpokenText = text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()।?]/g,"").trim();

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
        // Wait 2500ms (2.5 seconds) after speaking ends before restarting mic to prevent picking up echoes
        setTimeout(() => {
            isShreeSpeaking = false;
            if (isHandsFreeMode && !isListening) {
                safeStartRecognition();
            } else if (!isHandsFreeMode) {
                setShreeStatus("तैयार");
                updateMicButtonUI(false);
            }
        }, 2500);
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
        recognition.interimResults = true; // Enable real-time partial results
        recognition.maxAlternatives = 1;

        let silenceTimer = null;
        let isProcessed = false;

        recognition.onstart = () => {
            isListening = true;
            isProcessed = false;
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
            // Fallback: if browser stopped recognition before silence timer fired, process whatever was heard
            if (!isProcessed) {
                const textInput = document.getElementById('shree-text-input');
                const finalVal = textInput ? textInput.value.trim() : "";
                if (finalVal) {
                    isProcessed = true;
                    processRecognizedText(finalVal);
                }
            }
            if (silenceTimer) {
                clearTimeout(silenceTimer);
                silenceTimer = null;
            }
            if (isHandsFreeMode && !isShreeSpeaking) {
                safeStartRecognition();
            } else if (!isHandsFreeMode) {
                updateMicButtonUI(false);
                setShreeStatus("तैयार");
            }
        };

        const processRecognizedText = (transcript) => {
            const trimmed = transcript.trim();
            if (!trimmed) return;
            
            const lowerText = trimmed.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()।?]/g,"").trim();
            
            // Self-echo loop prevention: check if recognized text is part of last spoken response
            if (lastSpokenText && (lowerText.includes(lastSpokenText) || lastSpokenText.includes(lowerText))) {
                console.log("Ignoring echo feedback of Shree's own voice:", trimmed);
                return;
            }
            
            console.log("Processing recognized text:", trimmed);
            
            if (isHandsFreeMode) {
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
                    const idx = lowerText.indexOf(matchedWord);
                    let command = trimmed.slice(idx + matchedWord.length).trim();
                    command = command.replace(/^[,.\s?।!]+/g, "").trim();
                    
                    if (command.length > 0) {
                        addMessageToShreeChat("user", trimmed);
                        processShreeCommand(command);
                    } else {
                        addMessageToShreeChat("user", trimmed);
                        speakShreeText("जी कहिए, मैं सुन रही हूँ।");
                        setShreeStatus("सुन रही हूँ...");
                    }
                }
            } else {
                // Standard mode: process everything
                addMessageToShreeChat("user", trimmed);
                processShreeCommand(trimmed);
            }
        };

        recognition.onresult = (event) => {
            if (window.speechSynthesis && window.speechSynthesis.speaking) {
                console.log("Ignoring speech result: SpeechSynthesis is speaking.");
                return;
            }

            if (silenceTimer) {
                clearTimeout(silenceTimer);
                silenceTimer = null;
            }

            let fullTranscript = "";
            for (let i = 0; i < event.results.length; ++i) {
                fullTranscript += event.results[i][0].transcript;
            }

            const currentText = fullTranscript.trim();
            if (!currentText) return;

            // Live update the text input box so the user gets real-time typing feedback!
            const textInput = document.getElementById('shree-text-input');
            if (textInput) {
                textInput.value = currentText;
            }

            console.log("Speech interim/final result:", currentText);

            // Set a 1600ms timeout for silence detection. If the user stops speaking for 1.6s, process it!
            silenceTimer = setTimeout(() => {
                console.log("Silence pause detected. Processing text:", currentText);
                if (!isProcessed) {
                    isProcessed = true;
                    try {
                        recognition.stop();
                    } catch (e) {}
                    processRecognizedText(currentText);
                }
            }, 1600);
        };

        recognition.onerror = (event) => {
            console.error("Speech recognition error:", event.error);
            if (silenceTimer) {
                clearTimeout(silenceTimer);
                silenceTimer = null;
            }
            
            if (event.error === 'no-speech') return;

            // Handle fatal mic permission or capability errors (especially important for mobile HTTPS constraints)
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed' || event.error === 'language-not-supported') {
                isHandsFreeMode = false;
                updateMicButtonUI(false);
                setShreeStatus("त्रुटि");
                
                let errMsg = "माफ़ कीजिये, मैं सुन नहीं पाई।";
                if (event.error === 'not-allowed') {
                    errMsg = "माइक की अनुमति (Microphone Permission) नहीं मिली। कृपया ब्राउज़र सेटिंग्स में जाकर माइक की अनुमति दें। ध्यान दें: मोबाइल पर आवाज़ कमांड के लिए वेबसाइट का HTTPS (सुरक्षित) होना आवश्यक है।";
                    alert("माइक अनुमति त्रुटि: कृपया ब्राउज़र के एड्रेस बार में ताले (lock) के आइकॉन पर क्लिक करके माइक की अनुमति दें। मोबाइल पर वॉइस कमांड चलाने के लिए इसे HTTPS (Firebase Hosting) पर चलाना आवश्यक है।");
                } else if (event.error === 'language-not-supported') {
                    errMsg = "आपके ब्राउज़र में हिंदी भाषा का वॉयस सपोर्ट नहीं है। कृपया क्रोम का उपयोग करें।";
                }
                
                speakShreeText("माफ़ कीजिये, माइक एक्सेस नहीं हो पाया।");
                addMessageToShreeChat("shree", errMsg);
                return;
            }

            if (isHandsFreeMode) {
                if (event.error === 'network' || event.error === 'aborted') return;
                setShreeStatus("पुनः प्रारंभ...");
                safeStartRecognition();
                return;
            }
            
            setShreeStatus("त्रुटि");
            let errMsg = "माफ़ कीजिये, मैं सुन नहीं पाई। कृपया माइक दबाकर दोबारा बोलें।";
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
    if (!recognition || isListening || isShreeSpeaking || (window.speechSynthesis && window.speechSynthesis.speaking)) return;
    try {
        recognition.start();
    } catch (e) {
        console.warn("Recognition start failed, retrying in 1.2s...", e);
        setTimeout(() => {
            if (isHandsFreeMode && !isListening && !isShreeSpeaking && !(window.speechSynthesis && window.speechSynthesis.speaking)) {
                try {
                    recognition.start();
                } catch (err) {
                    console.error("Failed to restart recognition on retry:", err);
                    isHandsFreeMode = false;
                    updateMicButtonUI(false);
                    setShreeStatus("तैयार");
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

// Headphone voice output toggle removed. Voice is enabled by default for seamless speech interaction.

function updateMicButtonUI(listening) {
    const micBtn = document.getElementById('btn-shree-mic');
    const micToggleBtn = document.getElementById('btn-shree-mic-toggle');
    
    if (listening) {
        if (micBtn) {
            micBtn.classList.add('listening');
            micBtn.innerHTML = '<i data-lucide="mic-off"></i>';
        }
        if (micToggleBtn) {
            micToggleBtn.classList.add('listening-active');
            micToggleBtn.innerHTML = '<i data-lucide="mic"></i>';
            micToggleBtn.title = "Mute Microphone";
            micToggleBtn.style.color = "var(--success)"; // green active color
        }
    } else {
        if (micBtn) {
            micBtn.classList.remove('listening');
            micBtn.innerHTML = '<i data-lucide="mic"></i>';
        }
        if (micToggleBtn) {
            micToggleBtn.classList.remove('listening-active');
            micToggleBtn.innerHTML = '<i data-lucide="mic-off"></i>';
            micToggleBtn.title = "Unmute Microphone";
            micToggleBtn.style.color = ""; // reset color
        }
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
    let cmd = commandText.toLowerCase().trim();
    
    // Convert Devanagari Hindi number words to standard digits
    cmd = convertHindiNumberWordsToDigits(cmd);

    // 0. CLEAR CHAT COMMAND (always local for immediate UI cleaning)
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

    // PRIMARY PATH: If Gemini API Key is present, Route directly to Generative AI!
    if (typeof state !== 'undefined' && state.geminiApiKey) {
        setShreeStatus("सोच रही हूँ...");
        callGeminiAI(commandText)
            .then(reply => {
                setShreeStatus("Idle");
                let resObj = null;
                try {
                    let jsonText = reply.trim();
                    const startIdx = jsonText.indexOf('{');
                    const endIdx = jsonText.lastIndexOf('}');
                    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
                        jsonText = jsonText.slice(startIdx, endIdx + 1);
                    }
                    resObj = JSON.parse(jsonText);
                } catch (e) {
                    console.error("Gemini response is not valid JSON:", e, reply);
                    resObj = {
                        speech: reply,
                        action: null,
                        params: {}
                    };
                }

                let speech = resObj ? resObj.speech : reply;
                if (!speech || speech.trim() === "{" || speech.trim() === "}") {
                    speech = "माफ़ कीजिये, मैं समझ नहीं पाई। क्या आप कृपया फिर से कह सकते हैं?";
                }
                addMessageToShreeChat("shree", speech);
                speakShreeText(speech);

                if (resObj.action) {
                    executeAgentAction(resObj.action, resObj.params);
                }
            })
            .catch(err => {
                console.warn("Gemini API call failed, falling back to local processing:", err);
                processLocalCommandFallback(cmd);
            });
        return;
    }

    // OFFLINE FALLBACK PATH: If no Gemini key is present, process locally
    processLocalCommandFallback(cmd);
}

// Local offline matchers fallback processor
function processLocalCommandFallback(cmd) {
    // 1. SPECIFIC CUSTOM TRIGGER: "श्री जय हरि..."
    if (cmd.includes("jai hari") || cmd.includes("shree jai hari") || cmd.includes("shri jai hari") || cmd.includes("जय हरी") || cmd.includes("जय हरि") || cmd.includes("जयहरि")) {
        const parsedExpense = parseCustomJaiHariCommand(cmd);
        if (parsedExpense) {
            const newTx = {
                id: 't_' + Date.now(),
                description: parsedExpense.description,
                category: 'Others',
                amount: parsedExpense.amount,
                date: new Date().toISOString().split('T')[0],
                mode: state.accounts[0]?.name || 'Main Cash',
                clientId: ""
            };
            addExpenseDirect(newTx);
            if (typeof renderDashboard === 'function') renderDashboard();
            if (typeof renderExpensesPage === 'function') renderExpensesPage();

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

    // 2.5 READ SCREEN/PAGE COMMANDS
    const isReadCommand = cmd.includes("read") || cmd.includes("पढ़") || cmd.includes("पढ़") || cmd.includes("सुनाओ") || cmd.includes("सुनाए") || cmd.includes("बोलकर बताओ") || cmd.includes("बताओ क्या है");
    if (isReadCommand) {
        let vocalReply = "";
        let textReply = "";
        const formatCur = v => '₹' + Math.round(v).toLocaleString('en-IN');
        const formatCurVocal = v => Math.round(v) + ' रुपये';

        const mentionsExpense = cmd.includes("expense") || cmd.includes("kharch") || cmd.includes("खर्च") || cmd.includes("भुगतान") || cmd.includes("एक्सपेंस") || cmd.includes("एक्सपेंसेस");
        const mentionsClient = cmd.includes("client") || cmd.includes("grahak") || cmd.includes("ग्राहक") || cmd.includes("क्लाइंट") || cmd.includes("पेमेंट") || cmd.includes("आमदनी") || cmd.includes("income");
        const mentionsDashboard = cmd.includes("dashboard") || cmd.includes("home") || cmd.includes("मुख्य पेज") || cmd.includes("होम") || cmd.includes("डैशबोर्ड") || cmd.includes("बैलेंस") || cmd.includes("balance") || cmd.includes("पैसे") || cmd.includes("पैसा");

        if (mentionsExpense) {
            const recentTxs = state.transactions.slice().reverse().slice(0, 5);
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
            const stats = getGlobalStats();
            vocalReply = `Aapka cash balance ${formatCurVocal(stats.cashBalance)} hai, bank balance ${formatCurVocal(stats.bankBalance)} hai, aur total kharche ${formatCurVocal(stats.periodExpenses)} hain.`;
            textReply = `<strong>Dashboard Summary:</strong><br>💵 Cash Balance: <strong>${formatCur(stats.cashBalance)}</strong><br>🏦 Bank Balance: <strong>${formatCur(stats.bankBalance)}</strong><br>📉 Period Expenses: <strong>${formatCur(stats.periodExpenses)}</strong>`;
        } else {
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
                const recentTxs = state.transactions.slice().reverse().slice(0, 5);
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

    // 3. PAGE NAVIGATION
    const navMatch = matchNavigation(cmd);
    if (navMatch) {
        navigateToPage(navMatch.page);
        const reply = `${navMatch.label} पेज खोला जा रहा है।`;
        addMessageToShreeChat("shree", reply);
        speakShreeText(reply);
        return;
    }

    // Default Fallback
    const defaultReply = "माफ़ कीजिये, मैं यह काम सीधे नहीं कर सकती। यदि आप खर्च जोड़ना या नया ग्राहक बनाना चाहते हैं, तो कृपया वॉइस कमांड का उपयोग करें (जैसे: 'श्री जय हरी, 100 रुपये खर्च चाय के लिए')। सामान्य बातचीत के लिए मास्टर सेटिंग्स में ए आई की चाबी दर्ज करें।";
    addMessageToShreeChat("shree", defaultReply);
    speakShreeText("माफ़ कीजिये, मैं यह काम सीधे नहीं कर सकती हूँ।");
}

// Global cache for discovered Gemini model configuration to prevent repeating discovery
let discoveredGeminiConfig = null;

// Call Google Gemini API directly (Agentic implementation)
async function callGeminiAI(userPrompt) {
    const apiKey = state.geminiApiKey;
    if (!apiKey) throw new Error("Gemini API Key is missing.");

    // Create a context-aware system prompt for Agentic AI
    const systemInstruction = `You are Shree, the sweet and polite female Agentic AI manager of the Wealth Plus bookkeeping web application.
Your goal is to parse user intents and execute matching actions in the system while responding politely in sweet Hinglish.

You MUST respond ONLY with a JSON object in this exact schema (do NOT wrap in markdown backticks or formatting, just plain text JSON):
{
  "speech": "Polite response in Hinglish/Hindi explaining what you are doing (e.g. 'Ji, main abhi clients page par jaa rahi hoon.' or 'Jai Hari! Maine star labs client register kar diya hai.')",
  "action": "ACTION_NAME_OR_NULL",
  "params": {
     "pageId": "string (dashboard, clients, expenses, reports, master)",
     "name": "string (client name)",
     "monthlyPay": "number",
     "amount": "number",
     "category": "string (Food, Shopping, Bills, Transport, Rent, Others)",
     "description": "string (expense details)",
     "clientName": "string",
     "date": "string (YYYY-MM-DD)",
     "mode": "string (Main Cash, HDFC Bank)",
     "commitMessage": "string"
  }
}

Actions you can trigger:
1. "NAVIGATE_PAGE": When user asks to change screen/view. Params: { "pageId": "dashboard" | "clients" | "expenses" | "reports" | "master" }
2. "ADD_CLIENT": Register new client. Params: { "name": "client name", "monthlyPay": number }
3. "DELETE_CLIENT": Remove client. Params: { "name": "client name to search and delete" }
4. "ADD_EXPENSE": Log a purchase/spend. Params: { "amount": number, "description": "reason", "category": "Food" | "Transport" | "Rent" | "Bills" | "Shopping" | "Others", "clientName": "optional client association", "mode": "Main Cash" | "HDFC Bank" }
5. "DELETE_EXPENSE": Delete recent matching transaction. Params: { "amount": number (optional), "description": "substring search (optional)" }
6. "ADD_INCOME": Log received payment from a client. Params: { "amount": number, "clientName": "client name", "description": "details", "mode": "Main Cash" | "HDFC Bank" }
7. "EXPORT_EXCEL": Export bookkeeping sheets to Excel file. Params: {}
8. "GITHUB_DEPLOY": Push/Deploy the app files to GitHub. Params: { "commitMessage": "optional custom commit message" }

If the user request is just general greeting/chat and doesn't match any system actions, set "action" to null.
Keep the "speech" Hinglish responses very natural, polite, and short (1-2 sentences max).

Current App State:
- Clients count: ${state.clients.length} (Registered: ${state.clients.map(c=>c.name).join(', ')})
- Transactions count: ${state.transactions.length}
- Cash/Bank accounts: ${state.accounts.map(a=>a.name).join(', ')}`;

    const requestBody = {
        contents: [{
            parts: [{
                text: `${systemInstruction}\n\nUser Question: ${userPrompt}`
            }]
        }],
        generationConfig: {
            maxOutputTokens: 450,
            temperature: 0.2,
            responseMimeType: "application/json",
            responseSchema: {
                type: "OBJECT",
                properties: {
                    speech: { type: "STRING" },
                    action: { type: "STRING" },
                    params: {
                        type: "OBJECT",
                        properties: {
                            pageId: { type: "STRING" },
                            name: { type: "STRING" },
                            monthlyPay: { type: "NUMBER" },
                            amount: { type: "NUMBER" },
                            category: { type: "STRING" },
                            description: { type: "STRING" },
                            clientName: { type: "STRING" },
                            date: { type: "STRING" },
                            mode: { type: "STRING" },
                            commitMessage: { type: "STRING" }
                        }
                    }
                },
                required: ["speech"]
            }
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

    // Check if it contains client/grahak/ग्राहक/क्लाइंट intent (MUST be present)
    const hasIntent = text.includes("client") || text.includes("grahak") || text.includes("ग्राहक") || text.includes("क्लाइंट");
    
    if (!hasIntent) return null;

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
    if (typeof renderMasterClients === 'function') renderMasterClients();
    if (typeof renderClientsPage === 'function') renderClientsPage();
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
    if (typeof renderDashboard === 'function') renderDashboard();
    if (typeof renderClientsPage === 'function') renderClientsPage();
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
    if (cmd.includes("khaana") || cmd.includes("खाना") || cmd.includes("चाय") || cmd.includes("नाश्ता") || cmd.includes("lunch") || cmd.includes("tea") || cmd.includes("dinner") || cmd.includes("mithai") || cmd.includes("मिठाई")) {
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
    // Default to the first account (e.g. Main Cash) if the user didn't specify one
    if (!matchedAccount && state.accounts.length > 0) {
        matchedAccount = state.accounts[0];
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
    } else {
        // Fallback: Clean key action words and use the rest as description
        let descClean = cmd.replace(amountMatch[0], "")
                           .replace("rupaya", "")
                           .replace("rupaye", "")
                           .replace("rs", "")
                           .replace("रुपये", "")
                           .replace("रुपया", "")
                           .replace("रुपए", "")
                           .replace("रु", "")
                           .replace("खर्च", "")
                           .replace("खर्चा", "")
                           .replace("ऐड कर दो", "")
                           .replace("ऐड करो", "")
                           .replace("ऐड", "")
                           .replace("add", "")
                           .replace("shree", "")
                           .replace("shri", "")
                           .replace("श्री", "")
                           .replace("मिसलेनियस", "")
                           .replace("misc", "")
                           .replace("miscellaneous", "")
                           .replace("ka", "")
                           .replace("की", "")
                           .replace("का", "")
                           .replace("थी", "")
                           .replace("था", "")
                           .replace("लिया", "")
                           .replace("ली", "")
                           .trim();
        if (descClean.length > 1) {
            description = descClean;
        }
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
    if (typeof renderDashboard === 'function') renderDashboard();
    if (typeof renderExpensesPage === 'function') renderExpensesPage();
    return `${expenseData.account.name} से ${expenseData.description} (${expenseData.category}) के लिए ₹${expenseData.amount.toLocaleString('en-IN')} का खर्च दर्ज कर दिया गया है।`;
}

// --- DOM REGISTRATIONS ---

document.addEventListener('DOMContentLoaded', () => {
    initShreeSpeech();

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

    // Voice response mute/unmute (Headphone Toggle removed)

    // Microphone toggle button (Mic Toggle)
    const micToggleBtn = document.getElementById('btn-shree-mic-toggle');
    if (micToggleBtn) {
        micToggleBtn.addEventListener('click', toggleShreeListening);
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

// Helper to convert Hindi number words (e.g. सौ, हजार) to digits
function convertHindiNumberWordsToDigits(text) {
    let result = text;
    
    // Common word-based amounts
    result = result.replace(/(?:एक\s+)?सौ/g, "100");
    result = result.replace(/दो\s+सौ/g, "200");
    result = result.replace(/तीन\s+सौ/g, "300");
    result = result.replace(/चार\s+सौ/g, "400");
    result = result.replace(/पांच\s+सौ/g, "500");
    result = result.replace(/छह\s+सौ/g, "600");
    result = result.replace(/सात\s+सौ/g, "700");
    result = result.replace(/आठ\s+सौ/g, "800");
    result = result.replace(/नौ\s+सौ/g, "900");
    result = result.replace(/डेढ़\s+सौ|डेढ़\s+सौ/g, "150");
    result = result.replace(/ढाई\s+सौ/g, "250");
    
    result = result.replace(/(?:एक\s+)?हजार|(?:एक\s+)?हज़ार/g, "1000");
    result = result.replace(/दो\s+हजार|दो\s+हज़ार/g, "2000");
    result = result.replace(/तीन\s+हजार|तीन\s+हज़ार/g, "3000");
    result = result.replace(/चार\s+हजार|चार\s+हज़ार/g, "4000");
    result = result.replace(/पांच\s+हजार|पांच\s+हज़ार/g, "5000");
    result = result.replace(/दस\s+हजार|दस\s+हज़ार/g, "10000");
    
    result = result.replace(/(?:एक\s+)?लाख/g, "100000");
    result = result.replace(/दो\s+लाख/g, "200000");
    result = result.replace(/पांच\s+लाख/g, "500000");
    
    // Single Devanagari numbers
    result = result.replace(/\bएक\b/g, "1");
    result = result.replace(/\bदो\b/g, "2");
    result = result.replace(/\bतीन\b/g, "3");
    result = result.replace(/\bचार\b/g, "4");
    result = result.replace(/\bपाँच\b|\bपांच\b/g, "5");
    result = result.replace(/\bछह\b|\bछै\b/g, "6");
    result = result.replace(/\bसात\b/g, "7");
    result = result.replace(/\bआठ\b/g, "8");
    result = result.replace(/\bनौ\b/g, "9");
    result = result.replace(/\bदस\b/g, "10");

    return result;
}

// executeAgentAction maps structured actions to application controllers
function executeAgentAction(action, params) {
    console.log("Agent executing action:", action, params);
    if (!params) params = {};

    switch (action) {
        case 'NAVIGATE_PAGE':
            if (params.pageId && typeof navigateToPage === 'function') {
                navigateToPage(params.pageId);
            }
            break;

        case 'ADD_CLIENT':
            if (params.name && typeof addClientDirect === 'function') {
                const monthlyPay = Number(params.monthlyPay) || 0;
                const newClient = {
                    id: 'c_' + Date.now(),
                    name: params.name,
                    monthlyPay: monthlyPay,
                    yearlyPay: monthlyPay * 12
                };
                addClientDirect(newClient);
                if (typeof renderMasterClients === 'function') renderMasterClients();
                if (typeof renderClientsPage === 'function') renderClientsPage();
            }
            break;

        case 'DELETE_CLIENT':
            if (params.name && typeof deleteClientDirect === 'function') {
                const name = params.name.toLowerCase();
                const client = state.clients.find(c => c.name.toLowerCase().includes(name));
                if (client) {
                    deleteClientDirect(client.id);
                    if (typeof renderMasterClients === 'function') renderMasterClients();
                    if (typeof renderClientsPage === 'function') renderClientsPage();
                } else {
                    console.warn("Client not found for deletion:", params.name);
                }
            }
            break;

        case 'ADD_EXPENSE':
            if (params.amount && typeof addExpenseDirect === 'function') {
                const amount = Number(params.amount) || 0;
                let category = params.category || 'Others';
                // capitalize category first letter
                category = category.charAt(0).toUpperCase() + category.slice(1);
                
                let clientId = "";
                if (params.clientName) {
                    const client = state.clients.find(c => c.name.toLowerCase().includes(params.clientName.toLowerCase()));
                    if (client) clientId = client.id;
                }
                
                const newTx = {
                    id: 't_' + Date.now(),
                    description: params.description || category,
                    category: category,
                    amount: amount,
                    date: params.date || new Date().toISOString().split('T')[0],
                    mode: params.mode || (state.accounts[0]?.name || 'Main Cash'),
                    clientId: clientId
                };
                addExpenseDirect(newTx);
                if (typeof renderDashboard === 'function') renderDashboard();
                if (typeof renderExpensesPage === 'function') renderExpensesPage();
            }
            break;

        case 'DELETE_EXPENSE':
            if (typeof deleteExpenseDirect === 'function') {
                const amount = Number(params.amount);
                const desc = params.description ? params.description.toLowerCase() : "";
                const txIndex = state.transactions.findIndex(t => {
                    const matchAmount = amount ? t.amount === amount : true;
                    const matchDesc = desc ? t.description.toLowerCase().includes(desc) : true;
                    return matchAmount && matchDesc;
                });
                if (txIndex !== -1) {
                    const tx = state.transactions[txIndex];
                    deleteExpenseDirect(tx.id);
                    if (typeof renderDashboard === 'function') renderDashboard();
                    if (typeof renderExpensesPage === 'function') renderExpensesPage();
                } else {
                    console.warn("Expense not found for deletion:", params);
                }
            }
            break;

        case 'ADD_INCOME':
            if (params.amount && typeof addIncomeDirect === 'function') {
                const amount = Number(params.amount) || 0;
                let clientId = "";
                if (params.clientName) {
                    const client = state.clients.find(c => c.name.toLowerCase().includes(params.clientName.toLowerCase()));
                    if (client) clientId = client.id;
                }
                if (!clientId && state.clients.length > 0) {
                    clientId = state.clients[0].id;
                }
                const newIncome = {
                    id: 'inc_' + Date.now(),
                    clientId: clientId,
                    amount: amount,
                    date: params.date || new Date().toISOString().split('T')[0],
                    mode: params.mode || (state.accounts[0]?.name || 'Main Cash'),
                    description: params.description || "Received payment"
                };
                addIncomeDirect(newIncome);
                if (typeof renderDashboard === 'function') renderDashboard();
                if (typeof renderClientsPage === 'function') renderClientsPage();
            }
            break;

        case 'EXPORT_EXCEL':
            if (typeof exportToExcel === 'function') {
                exportToExcel();
            }
            break;

        case 'GITHUB_DEPLOY':
            if (typeof deployAppToGitHub === 'function') {
                const commitMsgInput = document.getElementById('github-commit-message');
                if (commitMsgInput) commitMsgInput.value = params.commitMessage || "Update via Shree Agentic AI";
                deployAppToGitHub();
            }
            break;

        default:
            console.warn("Unknown agent action:", action);
    }
}
