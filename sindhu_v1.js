/**
 * Sindhu AI Assistant (Sindhu AI Munim)
 * Version: 4.0.0
 * 
 * Elegant Indigo/Violet Theme Assistant supporting client registration,
 * expense allocation, and income logging via voice/text in Hindi, English, and Hinglish.
 */

(function () {
    // Expose updateSindhuVisibility globally
    window.updateSindhuVisibility = function () {
        const sindhuWidget = document.getElementById('sindhu-chat-widget');
        if (!sindhuWidget) return;
        if (typeof state !== 'undefined' && state.currentUser && (state.activePage === 'dashboard' || state.activePage === 'clients')) {
            sindhuWidget.style.display = 'block';
        } else {
            sindhuWidget.style.display = 'none';
            const chatWindow = document.getElementById('sindhu-chat-window');
            if (chatWindow) {
                chatWindow.classList.remove('active');
            }
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
        }
    };

    // Helper: Clean client name for database saving in English
    function cleanClientName(rawName) {
        let cleaned = rawName.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ");
        const stopwords = [
            "add", "kar", "do", "karo", "please", "shree", "sindhu", "ai", "जोड़ो", "जोड़ो", "करो", "कर", "दो", "नए", "नया", "नाम", "है", "को", "से", "के", "client", "क्लाइंट", "ग्राहक", "कस्टमर", "register",
            "श्री", "shri", "hai", "banao", "बनाओ", "बना", "ka", "का", "naam", "se", "ke",
            "jiski", "jiska", "जिसकी", "जिसका", "monthly", "payment", "मंथली", "पेमेंट", "naya", "naye", "new", "aur", "and", "ऐड", "एड",
            "मासिक", "भुगतान", "प्रति", "माह"
        ];
        let words = cleaned.split(/\s+/);
        let filtered = words.filter(w => !stopwords.includes(w.toLowerCase()));
        let name = filtered.join(" ").trim();
        return name.replace(/\s+/g, " ").trim();
    }

    // Local Regex Command Parser
    window.parseLocalCommand = function (text) {
        let cleanText = text.toLowerCase().trim();
        
        // 1. Client Registration check
        const clientKws = ["client", "क्लाइंट", "ग्राहक", "कस्टमर"];
        const addKws = ["add", "register", "banao", "bana do", "naya", "naye", "ऐड", "एड", "जोड़ो", "जोड़ो", "जोड़", "बना", "बनाओ"];
        
        let hasClientKw = clientKws.some(x => cleanText.includes(x));
        let hasAddKw = addKws.some(x => cleanText.includes(x));
        
        if (hasClientKw && hasAddKw) {
            let monthlyPay = 0;
            let textForName = text;
            let monthlyPayRegex = /(?:jiski|jiska|जिसकी|जिसका|की|का)?\s*(?:monthly\s+payment|monthly\s+pay|payment|salary|receivable|मंथली\s+पेमेंट|मंथली|मासिक\s+भुगतान|मासिक\s+पेमेंट|मासिक|प्रति\s+माह|पेमेंट|salary)\s*(?:hai|है)?\s*(?:₹\s*|rs\.?\s*)?(\d{3,8})(?:\s*(?:hai|है))?/i;
            let match = cleanText.match(monthlyPayRegex);
            if (match) {
                monthlyPay = parseInt(match[1], 10);
                let matchedStr = match[0];
                let idx = cleanText.indexOf(matchedStr);
                if (idx !== -1) {
                    textForName = text.substring(0, idx) + text.substring(idx + matchedStr.length);
                }
            }
            
            let name = "";
            let cleanTextForName = textForName.toLowerCase().trim();
            if (cleanTextForName.includes("नाम से") || cleanTextForName.includes("name se")) {
                let sep = cleanTextForName.includes("के नाम से") ? "के नाम से" : (cleanTextForName.includes("name se") ? "name se" : "नाम से");
                let parts = textForName.split(new RegExp(sep, 'i'));
                if (parts[0]) {
                    name = cleanClientName(parts[0]);
                }
            }
            
            if (!name) {
                const indicators = ["name hai", "naam hai", "name is", "naam is", "client ka name", "client ka naam", "नाम है", "नाम", "नाम:"];
                for (let ind of indicators) {
                    if (cleanTextForName.includes(ind)) {
                        let parts = textForName.split(new RegExp(ind, 'i'));
                        if (parts.length > 1 && parts[1]) {
                            name = cleanClientName(parts[1]);
                            break;
                        }
                    }
                }
            }
            
            if (!name) {
                name = cleanClientName(textForName);
            }
            
            if (name.length > 2) {
                return {
                    action: "addClient",
                    name: name,
                    monthlyPay: monthlyPay
                };
            }
        }
        
        // 2. Expense & Income Check
        let amountMatch = cleanText.match(/\b\d{2,7}\b/);
        if (amountMatch) {
            let amount = parseInt(amountMatch[0], 10);
            const incomeKws = ["received", "mile", "mila", "aaye", "income", "प्राप्त", "मिले", "मिला", "जमा"];
            let isIncome = incomeKws.some(x => cleanText.includes(x));
            
            if (isIncome) {
                // Income parsing
                let clientNameVal = "";
                let fromMatch = cleanText.match(/(?:from|received\s+from|se|से|द्वारा)\s*([a-z0-9\s\u0900-\u097F]+)/i);
                if (fromMatch && fromMatch[1]) {
                    clientNameVal = fromMatch[1];
                }
                
                if (clientNameVal) {
                    let clientNameClean = clientNameVal.replace(/\b(shree|sindhu|ai|karo|please|add|received|cash|date|kharch|expense|payment|se|kero|krdo|via|bank|online|upi)\b/gi, "");
                    clientNameClean = cleanClientName(clientNameClean);
                    clientNameVal = clientNameClean.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
                }
                
                let mode = "acc_2"; // default to Bank for income
                let cashAccount = null;
                let bankAccount = null;
                if (typeof state !== 'undefined' && state.accounts) {
                    cashAccount = state.accounts.find(a => a.type === 'Cash') || state.accounts[0];
                    bankAccount = state.accounts.find(a => a.type === 'Bank') || state.accounts[1] || state.accounts[0];
                }
                
                if (cleanText.includes("cash") || cleanText.includes("नकद") || cleanText.includes("कैश")) {
                    mode = cashAccount ? cashAccount.id : "acc_1";
                } else {
                    mode = bankAccount ? bankAccount.id : "acc_2";
                }
                
                return {
                    action: "addIncome",
                    amount: amount,
                    mode: mode,
                    clientName: clientNameVal
                };
            } else {
                // Expense parsing
                let category = "Others";
                let dynamicCats = (typeof state !== 'undefined' && state.categoriesConfig) ? Object.keys(state.categoriesConfig) : ["Food", "Shopping", "Bills", "Transport", "Rent", "Others"];
                
                const transportSynonyms = ["transport", "travelling", "travel", "taxi", "cab", "auto", "petrol", "diesel", "fuel", "ट्रेवल", "ट्रैवल", "किराया", "यात्रा"];
                const foodSynonyms = ["food", "restaurant", "lunch", "dinner", "breakfast", "tea", "coffee", "chai", "mithai", "खाना", "चाय", "नाश्ता", "मिठाई"];
                const billsSynonyms = ["bill", "electricity", "water", "internet", "recharge", "mobile", "wifi", "light", "बिल", "रिचार्ज", "बिजली"];
                const rentSynonyms = ["rent", "office rent", "room rent", "shop rent", "किराया", "भाड़ा"];
                const shoppingSynonyms = ["shopping", "clothes", "groceries", "purchase", "खरीदारी", "सामान"];
                
                let matchedCat = "";
                if (transportSynonyms.some(s => cleanText.includes(s)) && dynamicCats.includes("Transport")) {
                    matchedCat = "Transport";
                } else if (foodSynonyms.some(s => cleanText.includes(s)) && dynamicCats.includes("Food")) {
                    matchedCat = "Food";
                } else if (billsSynonyms.some(s => cleanText.includes(s)) && dynamicCats.includes("Bills")) {
                    matchedCat = "Bills";
                } else if (rentSynonyms.some(s => cleanText.includes(s)) && dynamicCats.includes("Rent")) {
                    matchedCat = "Rent";
                } else if (shoppingSynonyms.some(s => cleanText.includes(s)) && dynamicCats.includes("Shopping")) {
                    matchedCat = "Shopping";
                }
                
                if (matchedCat) {
                    category = matchedCat;
                } else {
                    for (let cat of dynamicCats) {
                        if (cleanText.includes(cat.toLowerCase()) || (cat === "Others" && cleanText.includes("misc"))) {
                            category = cat;
                            break;
                        }
                    }
                }
                
                // Client allocation parsing
                let clientNameVal = "";
                let allocMatchAfter = cleanText.match(/(?:allocate\s+fund\s+to|allocate\s+to|allocation\s+to|fund\s+allocate\s+to|को\s+आवंटित|आवंटन)\s*([a-z0-9\s\u0900-\u097F]+)/i);
                let allocMatchBefore = cleanText.match(/([a-z0-9\s\u0900-\u097F]+?)\s*(?:se\s+fund\s+allocate|se\s+allocate|fund\s+allocate|के\s+फंड|से\s+फंड)/i);
                
                if (allocMatchAfter && allocMatchAfter[1]) {
                    clientNameVal = allocMatchAfter[1];
                } else if (allocMatchBefore && allocMatchBefore[1]) {
                    clientNameVal = allocMatchBefore[1];
                }
                
                if (clientNameVal) {
                    let clientNameClean = clientNameVal.replace(/\b(shree|sindhu|ai|karo|please|add|received|cash|date|kharch|expense|payment|travelling|expenses|se|kero|krdo)\b/gi, "");
                    clientNameClean = cleanClientName(clientNameClean);
                    clientNameVal = clientNameClean.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
                }
                
                let mode = "acc_1"; // default to Cash for expense
                let cashAccount = null;
                let bankAccount = null;
                if (typeof state !== 'undefined' && state.accounts) {
                    cashAccount = state.accounts.find(a => a.type === 'Cash') || state.accounts[0];
                    bankAccount = state.accounts.find(a => a.type === 'Bank') || state.accounts[1] || state.accounts[0];
                }
                
                if (cleanText.includes("cash") || cleanText.includes("नकद") || cleanText.includes("कैश")) {
                    mode = cashAccount ? cashAccount.id : "acc_1";
                } else if (cleanText.includes("bank") || cleanText.includes("online") || cleanText.includes("बैंक") || cleanText.includes("ऑनलाइन")) {
                    mode = bankAccount ? bankAccount.id : "acc_2";
                } else {
                    mode = cashAccount ? cashAccount.id : "acc_1";
                }
                
                let desc = text;
                const kws = ["shree", "sindhu", "ai", "karo", "karein", "add", "kar do", "me", "par", "under", "date", "kharch", "expense", "exp", "rupees", "rs", "rupay", "hua", "hai", "allocate", "fund", "to", "paid", "from", "se", "cash", "bank"];
                for (let kw of kws) {
                    desc = desc.replace(new RegExp("\\b" + kw + "\\b", "gi"), "");
                }
                if (clientNameVal) {
                    desc = desc.replace(new RegExp(clientNameVal, "gi"), "");
                }
                desc = desc.replace(new RegExp(amount.toString(), "g"), "");
                desc = desc.replace(new RegExp(category, "gi"), "");
                desc = desc.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
                desc = desc.replace(/\s+/g, " ").trim();
                if (!desc) {
                    desc = "Expense Entry";
                }
                
                return {
                    action: "addExpense",
                    description: desc,
                    category: category,
                    amount: amount,
                    mode: mode,
                    clientName: clientNameVal
                };
            }
        }
        
        return null;
    };

    // Execute Database Action
    function executeAgentAction(parsed) {
        if (!parsed) return { success: false, error: "could not parse" };
        
        if (parsed.action === 'addClient') {
            const clientObj = {
                id: 'c_' + Date.now(),
                name: parsed.name,
                monthlyPay: parsed.monthlyPay || 0
            };
            if (typeof state !== 'undefined' && state.customClientFields) {
                state.customClientFields.forEach(f => {
                    clientObj[f.name] = f.type === 'number' ? 0 : '';
                });
            }
            if (typeof addClientDirect === 'function') {
                addClientDirect(clientObj);
            }
            return { success: true, message: `Client "${clientObj.name}" created successfully.`, data: clientObj };
        }
        
        if (parsed.action === 'addExpense') {
            let clientId = '';
            if (parsed.clientName && typeof state !== 'undefined') {
                let client = state.clients.find(c => c.name.toLowerCase() === parsed.clientName.toLowerCase());
                if (!client) {
                    client = {
                        id: 'c_' + Date.now(),
                        name: parsed.clientName,
                        monthlyPay: 0
                    };
                    if (state.customClientFields) {
                        state.customClientFields.forEach(f => {
                            client[f.name] = f.type === 'number' ? 0 : '';
                        });
                    }
                    if (typeof addClientDirect === 'function') {
                        addClientDirect(client);
                    }
                }
                clientId = client.id;
            }
            
            const localDate = new Date();
            const year = localDate.getFullYear();
            const month = String(localDate.getMonth() + 1).padStart(2, '0');
            const day = String(localDate.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
            
            const txObj = {
                id: 't_' + Date.now(),
                description: parsed.description || 'Expense Entry',
                category: parsed.category || 'Others',
                amount: parsed.amount,
                date: dateStr,
                mode: parsed.mode || 'acc_1',
                clientId: clientId
            };
            
            if (typeof state !== 'undefined' && state.customTxFields) {
                state.customTxFields.forEach(f => {
                    txObj[f.name] = f.type === 'number' ? 0 : '';
                });
            }
            
            if (typeof addExpenseDirect === 'function') {
                addExpenseDirect(txObj);
            }
            return { success: true, message: `Expense of ₹${txObj.amount} recorded.`, data: txObj };
        }
        
        if (parsed.action === 'addIncome') {
            let clientId = '';
            if (parsed.clientName && typeof state !== 'undefined') {
                let client = state.clients.find(c => c.name.toLowerCase() === parsed.clientName.toLowerCase());
                if (!client) {
                    client = {
                        id: 'c_' + Date.now(),
                        name: parsed.clientName,
                        monthlyPay: 0
                    };
                    if (state.customClientFields) {
                        state.customClientFields.forEach(f => {
                            client[f.name] = f.type === 'number' ? 0 : '';
                        });
                    }
                    if (typeof addClientDirect === 'function') {
                        addClientDirect(client);
                    }
                }
                clientId = client.id;
            } else if (typeof state !== 'undefined') {
                let client = state.clients[0];
                if (!client) {
                    client = {
                        id: 'c_' + Date.now(),
                        name: 'General Client',
                        monthlyPay: 0
                    };
                    if (typeof addClientDirect === 'function') {
                        addClientDirect(client);
                    }
                }
                clientId = client.id;
            }
            
            const localDate = new Date();
            const year = localDate.getFullYear();
            const month = String(localDate.getMonth() + 1).padStart(2, '0');
            const day = String(localDate.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
            
            const logObj = {
                id: 'i_' + Date.now(),
                clientId: clientId,
                amount: parsed.amount,
                date: dateStr,
                mode: parsed.mode || 'acc_2'
            };
            
            if (typeof state !== 'undefined' && state.customClientFields) {
                state.customClientFields.forEach(f => {
                    logObj[f.name] = f.type === 'number' ? 0 : '';
                });
            }
            
            if (typeof addIncomeDirect === 'function') {
                addIncomeDirect(logObj);
            }
            return { success: true, message: `Income of ₹${logObj.amount} recorded.`, data: logObj };
        }
        
        return { success: false, error: "unknown action" };
    }

    // Call Gemini API
    async function callGeminiAI(inputText, apiKey) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const cats = (typeof state !== 'undefined' && state.categoriesConfig) ? Object.keys(state.categoriesConfig) : ["Food", "Shopping", "Bills", "Transport", "Rent", "Others"];
        const accs = (typeof state !== 'undefined' && state.accounts) ? state.accounts.map(a => `${a.name} (ID: ${a.id}, type: ${a.type})`).join(', ') : "Main Cash (ID: acc_1), HDFC Bank (ID: acc_2)";
        
        const systemPrompt = `You are Sindhu (सिन्धु), a warm, female AI financial assistant and bookkeeper for the Wealth Plus app.
Your task is to parse the user's voice or text command (which will be in Hindi, English, or Hinglish) and structure it into a database action.

Available Categories: ${cats.join(', ')}
Available Accounts: ${accs}

Guidelines:
1. For Client registration (e.g. "naya client balkrishna premnarayan add kar do"):
   Identify client name and optional monthly payment.
   -> action: "addClient", name: "Balkrishna Premnarayan", monthlyPay: 25000 (if mentioned).
2. For Expense logging (e.g. "10000 travelling expenses paid from cash, allocate to Balkrishna Premnarayan"):
   Identify amount, category (mapped to one of: ${cats.join(', ')}), mode (an account ID like acc_1 or acc_2), client allocation name (clientName), and description.
   -> action: "addExpense", amount: 10000, category: "Transport", mode: "acc_1", clientName: "Balkrishna Premnarayan", description: "Travelling expenses".
3. For Income logging (e.g. "received 50000 from Balkrishna Premnarayan via bank"):
   Identify amount, source client, and mode (account ID).
   -> action: "addIncome", amount: 50000, clientName: "Balkrishna Premnarayan", mode: "acc_2".
4. If a field is not found or not specified, leave it null or omit it.
5. Generate a warm Hindi spoken confirmation (replyHindi). It MUST start with "जय हरी!" (e.g., "जय हरी! मैंने बालकृष्ण प्रेमनारायण को 25000 रुपये के मासिक भुगतान के साथ नए क्लाइंट के रूप में जोड़ दिया है।").
6. The database inputs (name, description, clientName, category) MUST be in English (Latin script). Only replyHindi must be in Devanagari Hindi.`;

        const requestBody = {
            contents: [
                {
                    parts: [
                        { text: `${systemPrompt}\n\nUser Input: "${inputText}"` }
                    ]
                }
            ],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        action: {
                            type: "STRING",
                            enum: ["addClient", "addExpense", "addIncome", "unknown"]
                        },
                        name: { type: "STRING" },
                        monthlyPay: { type: "INTEGER" },
                        description: { type: "STRING" },
                        category: { type: "STRING" },
                        amount: { type: "INTEGER" },
                        mode: { type: "STRING" },
                        clientName: { type: "STRING" },
                        replyHindi: { type: "STRING" }
                    },
                    required: ["action", "replyHindi"]
                }
            }
        };

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`Gemini API Error: Status ${response.status}`);
        }

        const data = await response.json();
        const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!textResult) {
            throw new Error("Empty response from Gemini API");
        }

        return JSON.parse(textResult);
    }

    // Voice synthesis setup
    function speakSindhuText(text) {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel(); // cancel any active speech
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95;
        utterance.pitch = 1.05;
        
        const voices = window.speechSynthesis.getVoices();
        let selectedVoice = voices.find(v => v.lang.includes('hi-IN') || v.lang.includes('hi_IN'));
        if (!selectedVoice) {
            selectedVoice = voices.find(v => v.name.toLowerCase().includes('hindi') || v.name.toLowerCase().includes('google hi'));
        }
        if (!selectedVoice) {
            selectedVoice = voices.find(v => v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('google-') || v.lang.includes('en-IN'));
        }
        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }
        
        window.speechSynthesis.speak(utterance);
    }

    // Initialize Widget Event Listeners
    document.addEventListener("DOMContentLoaded", () => {
        const toggleBtn = document.getElementById("sindhu-toggle-btn");
        const closeBtn = document.getElementById("sindhu-btn-close");
        const chatWindow = document.getElementById("sindhu-chat-window");
        const chatInput = document.getElementById("sindhu-input");
        const sendBtn = document.getElementById("sindhu-send-btn");
        const micBtn = document.getElementById("sindhu-mic-btn");
        const messagesDiv = document.getElementById("sindhu-messages");
        
        const settingsBtn = document.getElementById("sindhu-btn-settings");
        const settingsPanel = document.getElementById("sindhu-settings");
        const settingsBackBtn = document.getElementById("sindhu-settings-back");
        const geminiKeyInput = document.getElementById("sindhu-gemini-key");
        const voiceReplyCheckbox = document.getElementById("sindhu-voice-reply");

        // Load saved settings
        if (localStorage.getItem("sindhu_gemini_key")) {
            geminiKeyInput.value = localStorage.getItem("sindhu_gemini_key");
        }
        if (localStorage.getItem("sindhu_voice_reply") !== null) {
            voiceReplyCheckbox.checked = localStorage.getItem("sindhu_voice_reply") === "true";
        }

        // Toggle chat window
        if (toggleBtn && chatWindow) {
            toggleBtn.addEventListener("click", () => {
                chatWindow.classList.toggle("active");
                if (chatWindow.classList.contains("active")) {
                    chatInput.focus();
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                }
            });
        }

        if (closeBtn && chatWindow) {
            closeBtn.addEventListener("click", () => {
                chatWindow.classList.remove("active");
                if (window.speechSynthesis) window.speechSynthesis.cancel();
            });
        }

        // Settings actions
        if (settingsBtn && settingsPanel && messagesDiv) {
            settingsBtn.addEventListener("click", () => {
                settingsPanel.classList.toggle("active");
            });
        }
        if (settingsBackBtn && settingsPanel) {
            settingsBackBtn.addEventListener("click", () => {
                settingsPanel.classList.remove("active");
            });
        }
        if (geminiKeyInput) {
            geminiKeyInput.addEventListener("change", () => {
                localStorage.setItem("sindhu_gemini_key", geminiKeyInput.value.trim());
            });
        }
        if (voiceReplyCheckbox) {
            voiceReplyCheckbox.addEventListener("change", () => {
                localStorage.setItem("sindhu_voice_reply", voiceReplyCheckbox.checked.toString());
            });
        }

        // Append message UI helper
        function appendMessage(text, sender) {
            if (!messagesDiv) return;
            const msg = document.createElement("div");
            msg.className = `sindhu-msg msg-${sender}`;
            const p = document.createElement("p");
            p.innerText = text;
            msg.appendChild(p);
            
            const timeSpan = document.createElement("span");
            timeSpan.className = "msg-time";
            const now = new Date();
            timeSpan.innerText = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
            msg.appendChild(timeSpan);
            
            messagesDiv.appendChild(msg);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }

        // Process Assistant Response
        async function processCommand(inputText) {
            if (!inputText.trim()) return;
            appendMessage(inputText, "user");
            chatInput.value = "";

            const key = geminiKeyInput ? geminiKeyInput.value.trim() : "";
            let parsed = null;
            let replyText = "";

            try {
                if (key) {
                    appendMessage("Sindhu is analyzing...", "sindhu");
                    try {
                        parsed = await callGeminiAI(inputText, key);
                        // remove the placeholder
                        const loadingMsg = messagesDiv.querySelector(".sindhu-msg.msg-sindhu:last-child");
                        if (loadingMsg && loadingMsg.innerText.includes("analyzing")) {
                            loadingMsg.remove();
                        }
                    } catch (err) {
                        console.warn("Gemini execution failed, falling back to regex parser:", err);
                        const loadingMsg = messagesDiv.querySelector(".sindhu-msg.msg-sindhu:last-child");
                        if (loadingMsg && loadingMsg.innerText.includes("analyzing")) {
                            loadingMsg.remove();
                        }
                        parsed = parseLocalCommand(inputText);
                    }
                } else {
                    parsed = parseLocalCommand(inputText);
                }

                if (parsed && parsed.action !== "unknown") {
                    const actionResult = executeAgentAction(parsed);
                    if (actionResult.success) {
                        if (parsed.replyHindi) {
                            replyText = parsed.replyHindi;
                        } else {
                            if (parsed.action === 'addClient') {
                                replyText = `जय हरी! मैंने ${parsed.name} को ${parsed.monthlyPay > 0 ? `${parsed.monthlyPay} रुपये प्रति माह के मासिक भुगतान के साथ` : ''} नए क्लाइंट के रूप में जोड़ दिया है।`;
                            } else if (parsed.action === 'addExpense') {
                                replyText = `जय हरी! मैंने ₹${parsed.amount} का ${parsed.category} खर्च ${parsed.clientName ? `${parsed.clientName} के लिए` : ''} दर्ज कर लिया है।`;
                            } else if (parsed.action === 'addIncome') {
                                replyText = `जय हरी! मैंने ${parsed.clientName ? `${parsed.clientName} से` : ''} ₹${parsed.amount} की आय दर्ज कर ली है।`;
                            }
                        }
                    } else {
                        replyText = "जय हरी! आदेश समझ आया, लेकिन डेटाबेस में दर्ज करने में समस्या हुई।";
                    }
                } else {
                    replyText = "जय हरी! मुझे आपका आदेश समझ नहीं आया। क्या आप नए क्लाइंट को जोड़ने या खर्चों को दर्ज करने के लिए कह रहे हैं?";
                }
            } catch (err) {
                console.error("General parse error:", err);
                replyText = "जय हरी! क्षमा करें, कुछ तकनीकी समस्या आ गई है। कृपया पुनः प्रयास करें।";
            }

            appendMessage(replyText, "sindhu");
            if (voiceReplyCheckbox && voiceReplyCheckbox.checked) {
                speakSindhuText(replyText);
            }
        }

        // Send text action
        if (sendBtn && chatInput) {
            sendBtn.addEventListener("click", () => {
                const text = chatInput.value.trim();
                if (text) processCommand(text);
            });
            chatInput.addEventListener("keypress", (e) => {
                if (e.key === "Enter") {
                    const text = chatInput.value.trim();
                    if (text) processCommand(text);
                }
            });
        }

        // Web Speech Recognition
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition && micBtn) {
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'hi-IN'; // default to Hindi listening

            let isListening = false;

            recognition.onstart = () => {
                isListening = true;
                micBtn.classList.add("active");
                chatInput.placeholder = "Listening... Speak now!";
            };

            recognition.onend = () => {
                isListening = false;
                micBtn.classList.remove("active");
                chatInput.placeholder = "Type a command...";
            };

            recognition.onerror = (e) => {
                console.error("Speech recognition error:", e);
                isListening = false;
                micBtn.classList.remove("active");
                chatInput.placeholder = "Type a command...";
            };

            recognition.onresult = (e) => {
                const resultText = e.results[0][0].transcript;
                if (resultText) {
                    chatInput.value = resultText;
                    processCommand(resultText);
                }
            };

            micBtn.addEventListener("click", () => {
                if (isListening) {
                    recognition.stop();
                } else {
                    if (window.speechSynthesis) window.speechSynthesis.cancel();
                    recognition.start();
                }
            });
        } else if (micBtn) {
            micBtn.style.display = "none";
        }

        // Initial visibility check when DOM is ready
        updateSindhuVisibility();
    });

    // Make sure voices are loaded
    if (window.speechSynthesis && window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => {
            // trigger loading of voices
            window.speechSynthesis.getVoices();
        };
    }
})();
