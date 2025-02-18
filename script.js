/***********************
 * Data & Initialization
 ***********************/
const categories = [{
        name: "General",
        channels: [{
                id: "text1",
                name: "General Chat",
                type: "text"
            }
        ]
    }, {
        name: "Learning",
        channels: [{
                id: "flashcard1",
                name: "Flashcards",
                type: "flashcard"
            }, {
                id: "whiteboard1",
                name: "Whiteboard",
                type: "whiteboard"
            }, {
                id: "code1",
                name: "Code Runner",
                type: "code"
            }
        ]
    }, {
        name: "Reminders",
        channels: [{
                id: "reminder1",
                name: "My Reminders",
                type: "reminder"
            }
        ]
    }
];

// In-memory demo storage:
const chatMessages = {}; // Each message will be an object: { date, text, files }
const flashcards = {}; // Stored as objects: { question, answers: [ { text, correct } ] }
const reminders = {}; // For reminders; each channel id key maps to an array of reminders
if (!window.whiteboardData)
    window.whiteboardData = {};
if (!window.codeData)
    window.codeData = {};

/***********************
 * Sidebar & Channel Selection
 ***********************/
function renderSidebar() {
    const sidebar = document.querySelector(".sidebar");
    sidebar.innerHTML = "";

    // Collapse button
    const collapseBtn = document.createElement("button");
    collapseBtn.textContent = "▶";
    collapseBtn.classList.add("collapse-btn");
    collapseBtn.addEventListener("click", () => sidebar.classList.toggle("collapsed"));
    sidebar.appendChild(collapseBtn);

    // Category rendering
    categories.forEach(category => {
        const catTitle = document.createElement("h2");
        catTitle.textContent = category.name;
        sidebar.appendChild(catTitle);

        const ul = document.createElement("ul");
        ul.classList.add("channel-list");

        category.channels.forEach(channel => {
            const li = document.createElement("li");
            li.textContent = channel.name;
            li.classList.add("channel-item");
            li.dataset.channelId = channel.id;
            li.dataset.channelType = channel.type;

            if (channel.type === "function") {
                // When clicking a saved function, switch to the Code Runner channel and load its code.
                li.addEventListener("click", () => {
                    // Find the Code Runner channel (assumes its type is "code")
                    const codeChannel = categories
                        .flatMap(cat => cat.channels)
                        .find(ch => ch.type === "code");
                    if (codeChannel) {
                        window.codeData[codeChannel.id] = channel.code;
                        selectChannel(codeChannel);
                    }
                });
                // Add a delete button next to the saved function
                const deleteBtn = document.createElement("button");
                deleteBtn.textContent = "Delete";
                deleteBtn.style.marginLeft = "10px";
                deleteBtn.addEventListener("click", (e) => {
                    e.stopPropagation(); // Prevent the parent li click event
                    const functionsCategory = categories.find(cat => cat.name === "Functions");
                    if (functionsCategory) {
                        // Filter out only the function with the matching unique id
                        functionsCategory.channels = functionsCategory.channels.filter(ch => ch.id !== channel.id);
                        renderSidebar();
                    }
                });
                li.appendChild(deleteBtn);
            } else {
                li.addEventListener("click", () => selectChannel(channel));
            }
            ul.appendChild(li);
        });
        sidebar.appendChild(ul);
    });

    // Version text
    const versionText = document.createElement("div");
    versionText.classList.add("version-text");
    versionText.textContent = "v1.12";
    sidebar.appendChild(versionText);

    // Collapse sidebar when clicking outside
    if (!window.sidebarOutsideListenerAdded) {
        const collapseSidebar = (event) => {
            if (sidebar && !sidebar.contains(event.target)) {
                sidebar.classList.add("collapsed");
            }
        };
        document.addEventListener("click", collapseSidebar);
        document.addEventListener("touchstart", collapseSidebar);
        window.sidebarOutsideListenerAdded = true;
    }
}

function selectChannel(channel) {
    document.querySelectorAll(".channel-item").forEach(item => {
        item.classList.remove("active-channel");
        if (item.dataset.channelId === channel.id) {
            item.classList.add("active-channel");
        }
    });
    document.querySelector(".sidebar").classList.add("collapsed");
    renderChannel(channel);
}

function renderChannel(channel) {
    const main = document.querySelector(".main-content");
    main.innerHTML = "";
    if (channel.type === "text") {
        renderTextChannel(main, channel);
    } else if (channel.type === "flashcard") {
        renderFlashcardChannel(main, channel);
    } else if (channel.type === "whiteboard") {
        renderWhiteboardChannel(main, channel);
    } else if (channel.type === "code") {
        renderCodeChannel(main, channel);
    } else if (channel.type === "reminder") {
        renderReminderChannel(main, channel);
    }
}

/***********************
 * 1. General Chat (Text Channel with Attachments and Editable Messages)
 ***********************/
function renderTextChannel(container, channel) {
    container.innerHTML = "";

    const header = document.createElement("h2");
    header.textContent = "Text Channel";
    container.appendChild(header);

    const chatContainer = document.createElement("div");
    chatContainer.classList.add("chat-container");
    chatContainer.style.height = "90%";

    const messagesDiv = document.createElement("div");
    messagesDiv.classList.add("messages-area");
    chatContainer.appendChild(messagesDiv);

    function updateMessages() {
        messagesDiv.innerHTML = "";
        (chatMessages[channel.id] || []).forEach((msg, index) => {
            if (typeof msg === "string") {
                msg = {
                    date: new Date().toLocaleString(),
                    text: msg,
                    files: []
                };
                chatMessages[channel.id][index] = msg;
            }
            const msgContainer = document.createElement("div");
            msgContainer.classList.add("message-container");

            const dateDiv = document.createElement("div");
            dateDiv.classList.add("message-date");
            dateDiv.textContent = msg.date;
            msgContainer.appendChild(dateDiv);

            const contentDiv = document.createElement("div");
            contentDiv.classList.add("message-content");
            const textContainer = document.createElement("span");

            const text = msg.text;
            const urlRegex = /(https?:\/\/\S+|www\.\S+)/gi;
            const parts = text.split(urlRegex);

            parts.forEach((part, i) => {
                if (!part)
                    return;
                if (i % 2 === 1) {
                    let url = part;
                    if (/^www\./i.test(url)) {
                        url = 'http://' + url;
                    }
                    try {
                        new URL(url);
                        const link = document.createElement('a');
                        link.href = url;
                        link.textContent = part;
                        link.target = '_blank';
                        link.rel = 'noopener noreferrer';
                        textContainer.appendChild(link);
                    } catch (e) {
                        textContainer.appendChild(document.createTextNode(part));
                    }
                } else {
                    textContainer.appendChild(document.createTextNode(part));
                }
            });
            contentDiv.appendChild(textContainer);

            if (msg.files && msg.files.length > 0) {
                const filesDiv = document.createElement("div");
                msg.files.forEach(file => {
                    const fileWrapper = document.createElement("div");
                    fileWrapper.style.border = "1px solid #ccc";
                    fileWrapper.style.padding = "5px";
                    fileWrapper.style.marginTop = "5px";
                    if (file.type.startsWith("image/")) {
                        const img = document.createElement("img");
                        img.src = file.content;
                        img.style.maxWidth = "200px";
                        fileWrapper.appendChild(img);
                    } else if (file.type.startsWith("audio/")) {
                        const audio = document.createElement("audio");
                        audio.controls = true;
                        audio.src = file.content;
                        fileWrapper.appendChild(audio);
                    } else if (file.type.startsWith("text/") || file.type === "") {
                        const pre = document.createElement("pre");
                        pre.textContent = file.content;
                        pre.style.maxHeight = "150px";
                        pre.style.overflow = "auto";
                        fileWrapper.appendChild(pre);
                    } else {
                        fileWrapper.textContent = file.name;
                    }
                    const downloadBtn = document.createElement("button");
                    downloadBtn.textContent = "Download";
                    downloadBtn.addEventListener("click", () => {
                        const a = document.createElement("a");
                        if (file.type.startsWith("image/") || file.type.startsWith("audio/")) {
                            a.href = file.content;
                        } else {
                            const blob = new Blob([file.content], {
                                type: file.type || "text/plain"
                            });
                            a.href = URL.createObjectURL(blob);
                        }
                        a.download = file.name;
                        a.click();
                    });
                    fileWrapper.appendChild(downloadBtn);
                    filesDiv.appendChild(fileWrapper);
                });
                contentDiv.appendChild(filesDiv);
            }
            msgContainer.appendChild(contentDiv);

            const btnContainer = document.createElement("div");
            btnContainer.classList.add("toolbar");
            const editBtn = document.createElement("button");
            editBtn.textContent = "Edit";
            const removeBtn = document.createElement("button");
            removeBtn.textContent = "Remove";
            btnContainer.appendChild(editBtn);
            btnContainer.appendChild(removeBtn);
            msgContainer.appendChild(btnContainer);

            editBtn.addEventListener("click", () => {
                const editForm = document.createElement("form");
                const editInput = document.createElement("input");
                editInput.type = "text";
                editInput.value = msg.text;
                editForm.appendChild(editInput);
                const editFilesDiv = document.createElement("div");
                msg.files.forEach((file, fileIndex) => {
                    const fileRow = document.createElement("div");
                    fileRow.textContent = file.name;
                    const removeFileBtn = document.createElement("button");
                    removeFileBtn.type = "button";
                    removeFileBtn.textContent = "Remove";
                    removeFileBtn.addEventListener("click", () => {
                        msg.files.splice(fileIndex, 1);
                        updateMessages();
                    });
                    fileRow.appendChild(removeFileBtn);
                    editFilesDiv.appendChild(fileRow);
                });
                editForm.appendChild(editFilesDiv);
                const newAttachBtn = document.createElement("button");
                newAttachBtn.type = "button";
                newAttachBtn.textContent = "Attach File";
                editForm.appendChild(newAttachBtn);
                const newFileInput = document.createElement("input");
                newFileInput.type = "file";
                newFileInput.style.display = "none";
                newFileInput.multiple = true;
                editForm.appendChild(newFileInput);
                newAttachBtn.addEventListener("click", () => newFileInput.click());
                newFileInput.addEventListener("change", () => {
                    for (const file of newFileInput.files) {
                        if (file.type.startsWith("image/") || file.type.startsWith("audio/")) {
                            const reader = new FileReader();
                            reader.onload = (e) => {
                                msg.files.push({
                                    name: file.name,
                                    type: file.type,
                                    content: e.target.result
                                });
                                updateMessages();
                            };
                            reader.readAsDataURL(file);
                        } else {
                            const reader = new FileReader();
                            reader.onload = (e) => {
                                msg.files.push({
                                    name: file.name,
                                    type: file.type,
                                    content: e.target.result
                                });
                                updateMessages();
                            };
                            reader.readAsText(file);
                        }
                    }
                    newFileInput.value = "";
                });
                const saveBtn = document.createElement("button");
                saveBtn.type = "submit";
                saveBtn.textContent = "Save";
                const cancelBtn = document.createElement("button");
                cancelBtn.type = "button";
                cancelBtn.textContent = "Cancel";
                editForm.appendChild(saveBtn);
                editForm.appendChild(cancelBtn);
                msgContainer.innerHTML = "";
                msgContainer.appendChild(editForm);
                editForm.addEventListener("submit", (e) => {
                    e.preventDefault();
                    msg.text = editInput.value;
                    updateMessages();
                });
                cancelBtn.addEventListener("click", () => {
                    updateMessages();
                });
            });

            removeBtn.addEventListener("click", () => {
                chatMessages[channel.id].splice(index, 1);
                updateMessages();
            });

            messagesDiv.appendChild(msgContainer);
        });
    }

    if (!chatMessages[channel.id]) {
        chatMessages[channel.id] = [];
    }
    updateMessages();

    const footerDiv = document.createElement("div");
    footerDiv.classList.add("toolbar");
    const textInput = document.createElement("input");
    textInput.type = "text";
    textInput.placeholder = "Type a message...";
    textInput.style.flex = "1";
    textInput.style.minWidth = "100px";
    textInput.style.maxWidth = "calc(100% - 120px)";

    footerDiv.appendChild(textInput);
    const attachBtn = document.createElement("button");
    attachBtn.textContent = "Attach File";
    attachBtn.type = "button";
    footerDiv.appendChild(attachBtn);
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.style.display = "none";
    fileInput.multiple = true;
    footerDiv.appendChild(fileInput);
    const sendBtn = document.createElement("button");
    sendBtn.textContent = "Send";
    sendBtn.type = "submit";
    footerDiv.appendChild(sendBtn);
    const fileListDiv = document.createElement("div");
    footerDiv.appendChild(fileListDiv);

    let attachedFiles = [];
    function updateFileList() {
        fileListDiv.innerHTML = "";
        attachedFiles.forEach((file, index) => {
            const fileDiv = document.createElement("div");
            fileDiv.textContent = file.name;
            const removeBtn = document.createElement("button");
            removeBtn.textContent = "Remove";
            removeBtn.type = "button";
            removeBtn.style.marginLeft = "10px";
            removeBtn.addEventListener("click", () => {
                attachedFiles.splice(index, 1);
                updateFileList();
            });
            fileDiv.appendChild(removeBtn);
            fileListDiv.appendChild(fileDiv);
        });
    }
    attachBtn.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", () => {
        for (const file of fileInput.files) {
            if (file.type.startsWith("image/") || file.type.startsWith("audio/")) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    attachedFiles.push({
                        name: file.name,
                        type: file.type,
                        content: e.target.result
                    });
                    updateFileList();
                };
                reader.readAsDataURL(file);
            } else {
                const reader = new FileReader();
                reader.onload = (e) => {
                    attachedFiles.push({
                        name: file.name,
                        type: file.type,
                        content: e.target.result
                    });
                    updateFileList();
                };
                reader.readAsText(file);
            }
        }
        fileInput.value = "";
    });
    const form = document.createElement("form");
    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const text = textInput.value;
        let messageObj;
        if (attachedFiles.length > 0) {
            messageObj = {
                date: new Date().toLocaleString(),
                text,
                files: attachedFiles
            };
        } else {
            messageObj = {
                date: new Date().toLocaleString(),
                text,
                files: []
            };
        }
        if ((typeof text === "string" && text.trim() !== "") || attachedFiles.length > 0) {
            chatMessages[channel.id].push(messageObj);
            updateMessages();
            textInput.value = "";
            attachedFiles = [];
            updateFileList();
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
    });
    form.appendChild(footerDiv);
    chatContainer.appendChild(form);
    container.appendChild(chatContainer);
}

/***********************
 * 2. Flashcard Maker & Tester (Multiple answers, test mode shows score and highlights answers)
 ***********************/
function renderFlashcardChannel(container, channel) {
    const header = document.createElement("h2");
    header.textContent = "Flashcard Maker & Tester";
    container.appendChild(header);

    const modeContainer = document.createElement("div");

    // Creation mode container.
    const creationDiv = document.createElement("div");

    // Form for adding flashcards.
    const form = document.createElement("form");
    form.classList.add("flashcard-form");

    const questionInput = document.createElement("input");
    questionInput.type = "text";
    questionInput.placeholder = "Enter question here";
    questionInput.required = true;
    questionInput.style.width = "100%";
    form.appendChild(questionInput);

    const answersContainer = document.createElement("div");
    answersContainer.id = "answers-container";
    form.appendChild(answersContainer);

    function addAnswerRow(defaultText = "", defaultCorrect = false) {
        const row = document.createElement("div");
        row.classList.add("answer-row");
        const answerInput = document.createElement("input");
        answerInput.type = "text";
        answerInput.placeholder = "Answer";
        answerInput.required = true;
        answerInput.value = defaultText;
        answerInput.style.flex = "1";
        answerInput.style.minWidth = "80px";
        answerInput.style.maxWidth = "calc(100% - 120px)";
        row.appendChild(answerInput);
        const correctToggle = document.createElement("input");
        correctToggle.type = "checkbox";
        correctToggle.title = "Mark as correct answer";
        correctToggle.checked = defaultCorrect;
        row.appendChild(correctToggle);
        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.textContent = "Remove";
        removeBtn.addEventListener("click", () => {
            answersContainer.removeChild(row);
        });
        row.appendChild(removeBtn);
        answersContainer.appendChild(row);
    }
    addAnswerRow();

    const addAnswerBtn = document.createElement("button");
    addAnswerBtn.type = "button";
    addAnswerBtn.textContent = "Add Answer";
    addAnswerBtn.addEventListener("click", () => {
        addAnswerRow();
    });
    form.appendChild(addAnswerBtn);

    const addFlashcardBtn = document.createElement("button");
    addFlashcardBtn.type = "submit";
    addFlashcardBtn.textContent = "Add Flashcard";
    form.appendChild(addFlashcardBtn);

    creationDiv.appendChild(form);

    const startTestBtn = document.createElement("button");
    startTestBtn.type = "button";
    startTestBtn.textContent = "Start Test";
    creationDiv.appendChild(startTestBtn);

    // --- Export Flashcards Button ---
    const exportBtn = document.createElement("button");
    exportBtn.type = "button";
    exportBtn.textContent = "Export Flashcards";
    exportBtn.addEventListener("click", () => {
        const data = flashcards[channel.id] || [];
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], {
            type: "application/json"
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "flashcards.json";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    });
    creationDiv.appendChild(exportBtn);

    // --- Import Flashcards Button ---
    // Create a hidden file input for JSON files.
    const importInput = document.createElement("input");
    importInput.type = "file";
    importInput.accept = "application/json";
    importInput.style.display = "none";
    importInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file)
            return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedData = JSON.parse(event.target.result);
                if (Array.isArray(importedData)) {
                    flashcards[channel.id] = importedData;
                    renderFlashcardsList();
                    // Successfully imported, no alert.
                } else {
                    // Invalid format, no alert.
                }
            } catch (err) {
                // Error parsing JSON, no alert.
            }
        };
        reader.readAsText(file);
    });
    creationDiv.appendChild(importInput);

    const importBtn = document.createElement("button");
    importBtn.type = "button";
    importBtn.textContent = "Import Flashcards";
    importBtn.addEventListener("click", () => {
        importInput.click();
    });
    creationDiv.appendChild(importBtn);

    const flashcardListDiv = document.createElement("div");
    creationDiv.appendChild(flashcardListDiv);

    // Test mode container (hidden initially)
    const testDiv = document.createElement("div");
    testDiv.style.display = "none";
    modeContainer.appendChild(creationDiv);
    modeContainer.appendChild(testDiv);
    container.appendChild(modeContainer);

    function renderFlashcardsList() {
        flashcardListDiv.innerHTML = "";
        flashcards[channel.id] = flashcards[channel.id] || [];
        flashcards[channel.id].forEach((card, index) => {
            const cardDiv = document.createElement("div");
            cardDiv.classList.add("flashcard");

            const questionP = document.createElement("p");
            questionP.textContent = "Q: " + card.question;
            cardDiv.appendChild(questionP);

            const answersList = document.createElement("ul");
            card.answers.forEach(ans => {
                const li = document.createElement("li");
                li.textContent = ans.text + (ans.correct ? " (Correct)" : "");
                answersList.appendChild(li);
            });
            cardDiv.appendChild(answersList);

            const btnContainer = document.createElement("div");
            btnContainer.classList.add("toolbar");

            const editBtn = document.createElement("button");
            editBtn.textContent = "Edit";
            editBtn.type = "button";
            btnContainer.appendChild(editBtn);

            const removeBtn = document.createElement("button");
            removeBtn.textContent = "Remove";
            removeBtn.type = "button";
            btnContainer.appendChild(removeBtn);

            cardDiv.appendChild(btnContainer);

            editBtn.addEventListener("click", () => {
                if (editBtn.textContent === "Edit") {
                    const questionInputEdit = document.createElement("input");
                    questionInputEdit.type = "text";
                    questionInputEdit.value = card.question;
                    cardDiv.replaceChild(questionInputEdit, questionP);

                    const answersEditDiv = document.createElement("div");
                    card.answers.forEach(ans => {
                        const row = document.createElement("div");
                        row.classList.add("answer-row");
                        const answerInputEdit = document.createElement("input");
                        answerInputEdit.type = "text";
                        answerInputEdit.value = ans.text;
                        row.appendChild(answerInputEdit);
                        const correctToggleEdit = document.createElement("input");
                        correctToggleEdit.type = "checkbox";
                        correctToggleEdit.checked = ans.correct;
                        row.appendChild(correctToggleEdit);
                        answersEditDiv.appendChild(row);
                    });
                    const addNewAnswerBtn = document.createElement("button");
                    addNewAnswerBtn.type = "button";
                    addNewAnswerBtn.textContent = "Add Answer";
                    addNewAnswerBtn.addEventListener("click", () => {
                        const row = document.createElement("div");
                        row.classList.add("answer-row");
                        const answerInputEdit = document.createElement("input");
                        answerInputEdit.type = "text";
                        answerInputEdit.placeholder = "New answer";
                        row.appendChild(answerInputEdit);
                        const correctToggleEdit = document.createElement("input");
                        correctToggleEdit.type = "checkbox";
                        row.appendChild(correctToggleEdit);
                        answersEditDiv.appendChild(row);
                    });
                    answersEditDiv.appendChild(addNewAnswerBtn);
                    cardDiv.replaceChild(answersEditDiv, answersList);
                    editBtn.textContent = "Save";
                } else {
                    const questionInputEdit = cardDiv.querySelector('input[type="text"]');
                    card.question = questionInputEdit.value;
                    const newAnswers = [];
                    const rows = cardDiv.querySelectorAll(".answer-row");
                    rows.forEach(row => {
                        const textInput = row.querySelector('input[type="text"]');
                        const toggle = row.querySelector('input[type="checkbox"]');
                        if (textInput && textInput.value.trim() !== "") {
                            newAnswers.push({
                                text: textInput.value,
                                correct: toggle.checked
                            });
                        }
                    });
                    card.answers = newAnswers;
                    renderFlashcardsList();
                }
            });

            removeBtn.addEventListener("click", () => {
                flashcards[channel.id].splice(index, 1);
                renderFlashcardsList();
            });

            flashcardListDiv.appendChild(cardDiv);
        });

        // Update Start Test button state
        startTestBtn.disabled = !flashcards[channel.id] || flashcards[channel.id].length === 0;
    }

    // Initial render of flashcards list
    renderFlashcardsList();

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const question = questionInput.value.trim();
        if (!question)
            return;
        const answerRows = answersContainer.querySelectorAll(".answer-row");
        const answersArr = [];
        answerRows.forEach(row => {
            const textInput = row.querySelector('input[type="text"]');
            const toggle = row.querySelector('input[type="checkbox"]');
            if (textInput && textInput.value.trim() !== "") {
                answersArr.push({
                    text: textInput.value,
                    correct: toggle.checked
                });
            }
        });
        if (answersArr.length === 0)
            return;
        flashcards[channel.id] = flashcards[channel.id] || [];
        flashcards[channel.id].push({
            question,
            answers: answersArr
        });
        questionInput.value = "";
        answersContainer.innerHTML = "";
        addAnswerRow();
        renderFlashcardsList();
    });

    startTestBtn.addEventListener("click", () => {
        creationDiv.style.display = "none";
        renderTestMode(testDiv, channel);
        testDiv.style.display = "block";
    });

    function renderTestMode(testContainer, channel) {
        testContainer.innerHTML = "";
        const flashcardsArr = [...(flashcards[channel.id] || [])].sort(() => Math.random() - 0.5);
        if (flashcardsArr.length === 0) {
            testContainer.textContent = "No flashcards available for testing.";
            return;
        }
        const formTest = document.createElement("form");

        flashcardsArr.forEach((card, idx) => {
            const questionDiv = document.createElement("div");
            questionDiv.style.marginBottom = "10px";

            const questionP = document.createElement("p");
            questionP.textContent = "Q: " + card.question;
            questionDiv.appendChild(questionP);

            card.answers.forEach((ans, aIdx) => {
                const label = document.createElement("label");
                label.style.display = "block";

                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.name = `card${idx}`;
                checkbox.value = aIdx;

                label.appendChild(checkbox);
                label.appendChild(document.createTextNode(" " + ans.text));
                questionDiv.appendChild(label);
            });

            formTest.appendChild(questionDiv);
        });

        const submitTestBtn = document.createElement("button");
        submitTestBtn.type = "submit";
        submitTestBtn.textContent = "Submit Answers";
        formTest.appendChild(submitTestBtn);

        const backBtn = document.createElement("button");
        backBtn.type = "button";
        backBtn.textContent = "Back";
        backBtn.addEventListener("click", () => {
            testContainer.style.display = "none";
            creationDiv.style.display = "block";
        });
        formTest.appendChild(backBtn);

        const resultDiv = document.createElement("div");
        resultDiv.style.marginTop = "10px";
        formTest.appendChild(resultDiv);

        formTest.addEventListener("submit", (e) => {
            e.preventDefault();
            let score = 0;

            flashcardsArr.forEach((card, idx) => {
                const selected = Array.from(formTest.querySelectorAll(`input[name="card${idx}"]:checked`))
                    .map(input => parseInt(input.value));

                const correctIndices = card.answers
                    .map((ans, aIdx) => (ans.correct ? aIdx : null))
                    .filter(aIdx => aIdx !== null);

                if (selected.sort().toString() === correctIndices.sort().toString()) {
                    score++;
                }

                // Apply correct/incorrect styles and disable checkboxes
                const labels = formTest.querySelectorAll(`input[name="card${idx}"]`);
                labels.forEach(input => {
                    const value = parseInt(input.value);
                    if (correctIndices.includes(value)) {
                        input.parentElement.classList.add("correct-highlight");
                    }
                    if (!correctIndices.includes(value) && input.checked) {
                        input.parentElement.classList.add("incorrect-highlight");
                    }
                    input.disabled = true;
                });
                submitTestBtn.disabled = true;
            });

            resultDiv.textContent = `Your score: ${score} / ${flashcardsArr.length}`;
        });

        testContainer.appendChild(formTest);
    }
}

/***********************
 * 3. Whiteboard (Full-screen canvas with relative brush size and brush indicator)
 ***********************/
function renderWhiteboardChannel(container, channel) {
    // Create header
    const header = document.createElement("h2");
    header.textContent = "Whiteboard";
    container.appendChild(header);

    // Create toolbar
    const toolbar = document.createElement("div");
    toolbar.classList.add("toolbar");
    toolbar.style.display = "flex";
    toolbar.style.gap = "10px";
    toolbar.style.marginBottom = "10px";

    // Color Picker
    const colorPicker = document.createElement("input");
    colorPicker.type = "color";
    colorPicker.value = "#000000";
    toolbar.appendChild(colorPicker);

    // Size Slider
    const sizeSlider = document.createElement("input");
    sizeSlider.type = "range";
    sizeSlider.min = "1";
    sizeSlider.max = "20";
    sizeSlider.value = "1";
    toolbar.appendChild(sizeSlider);

    // Eraser Button
    const eraserButton = document.createElement("button");
    eraserButton.textContent = "Eraser";
    toolbar.appendChild(eraserButton);

    // --- New Buttons for Pan and Zoom ---
    // Pan Mode Button
    const panModeButton = document.createElement("button");
    panModeButton.textContent = "Pan Mode";
    panModeButton.style.backgroundColor = "";
    toolbar.appendChild(panModeButton);

    // Zoom In Button
    const zoomInButton = document.createElement("button");
    zoomInButton.textContent = "Zoom In";
    toolbar.appendChild(zoomInButton);

    // Zoom Out Button
    const zoomOutButton = document.createElement("button");
    zoomOutButton.textContent = "Zoom Out";
    toolbar.appendChild(zoomOutButton);
    // --- End New Buttons ---

    container.appendChild(toolbar);

    // Create canvas
    const canvas = document.createElement("canvas");
    container.appendChild(canvas);
    const context = canvas.getContext("2d");

    // Disable right-clicking
    document.oncontextmenu = function () {
        return false;
    }

    // Load saved drawings for the channel
    if (!window.whiteboardData[channel]) {
        window.whiteboardData[channel] = [];
    }
    const drawings = window.whiteboardData[channel];

    // Load persistent pan/zoom data for the channel.
    if (!window.whiteboardPanZoomData) {
        window.whiteboardPanZoomData = {};
    }
    if (!window.whiteboardPanZoomData[channel]) {
        window.whiteboardPanZoomData[channel] = {
            offsetX: 0,
            offsetY: 0,
            scale: 1
        };
    }
    let {
        offsetX,
        offsetY,
        scale
    } = window.whiteboardPanZoomData[channel];

    // Cursor position
    let cursorX,
    cursorY,
    prevCursorX,
    prevCursorY;

    // Brush settings
    let brushColor = "#000000";
    let brushSize = 1;
    let eraserMode = false;

    // Track Pan Mode state (for left‑mouse/touch panning)
    let panMode = false;

    // Event listeners for controls
    colorPicker.addEventListener("input", () => {
		brushColor = colorPicker.value;
		eraserMode = false;  // Ensure eraser mode is turned off when a new color is selected
		eraserButton.style.backgroundColor = "";  // Remove red background from eraser button
	});

    sizeSlider.addEventListener("input", () => {
        brushSize = parseInt(sizeSlider.value, 10);
    });

    eraserButton.addEventListener("click", () => {
        eraserMode = !eraserMode;
        eraserButton.style.backgroundColor = eraserMode ? "#ff0000" : "";
    });

    // Pan Mode toggle button
    panModeButton.addEventListener("click", () => {
        panMode = !panMode;
        panModeButton.style.backgroundColor = panMode ? "#cccccc" : "";
    });

    // Zoom In button (zooming centered on canvas center)
    zoomInButton.addEventListener("click", () => {
        const factor = 1.25;
        const newScale = scale * factor;
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        // Adjust offsets so that the true coordinate at the canvas center remains unchanged.
        offsetX = offsetX + cx * (1 / newScale - 1 / scale);
        offsetY = offsetY + cy * (1 / newScale - 1 / scale);
        scale = newScale;
        redrawCanvas();
        window.whiteboardPanZoomData[channel] = {
            offsetX,
            offsetY,
            scale
        };
    });

    // Zoom Out button (zooming centered on canvas center)
    zoomOutButton.addEventListener("click", () => {
        const factor = 1.5;
        const newScale = scale / factor;
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        offsetX = offsetX + cx * (1 / newScale - 1 / scale);
        offsetY = offsetY + cy * (1 / newScale - 1 / scale);
        scale = newScale;
        redrawCanvas();
        window.whiteboardPanZoomData[channel] = {
            offsetX,
            offsetY,
            scale
        };
    });

    // Convert coordinates
    function toScreenX(xTrue) {
        return (xTrue + offsetX) * scale;
    }
    function toScreenY(yTrue) {
        return (yTrue + offsetY) * scale;
    }
    function toTrueX(xScreen) {
        return (xScreen / scale) - offsetX;
    }
    function toTrueY(yScreen) {
        return (yScreen / scale) - offsetY;
    }

    function trueWidth() {
        return canvas.clientWidth / scale;
    }
    function trueHeight() {
        return canvas.clientHeight / scale;
    }

    function redrawCanvas() {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;

        context.fillStyle = '#fff';
        context.fillRect(0, 0, canvas.width, canvas.height);

        // Draw previous drawings
        for (let i = 0; i < drawings.length; i++) {
            const line = drawings[i];
            drawLine(toScreenX(line.x0), toScreenY(line.y0), toScreenX(line.x1), toScreenY(line.y1), line.color, line.size);
        }

        // Draw zoom anchor dot at the center
        drawZoomAnchorDot();
    }

    function drawZoomAnchorDot() {
        // Calculate the center of the canvas based on the current zoom and offset
        const centerX = (canvas.width / 2);
        const centerY = (canvas.height / 2);

        // Set the size of the cross
        const crossSize = 20;

        // Save the current drawing context state
        context.save();

        // Set the global composite operation to 'difference' to invert the colors under the cross
        context.globalCompositeOperation = 'difference';

        // Draw vertical line of the cross
        context.beginPath();
        context.moveTo(centerX, centerY - crossSize / 2);
        context.lineTo(centerX, centerY + crossSize / 2);
        context.strokeStyle = 'white'; // White color to apply the 'difference' effect
        context.lineWidth = 1;
        context.stroke();

        // Draw horizontal line of the cross
        context.beginPath();
        context.moveTo(centerX - crossSize / 2, centerY);
        context.lineTo(centerX + crossSize / 2, centerY);
        context.strokeStyle = 'white'; // White color to apply the 'difference' effect
        context.lineWidth = 2;
        context.stroke();

        // Restore the drawing context to remove the 'difference' mode for other drawing operations
        context.restore();
    }

    redrawCanvas();

    window.addEventListener("resize", () => redrawCanvas());

    function drawCursorCircle() {
        redrawCanvas(); // Prevents trails

        // Use actual screen coordinates for the cursor position
        const cursorScreenX = cursorX;
        const cursorScreenY = cursorY;

        // Keep cursor size fixed relative to the screen
        const displaySize = eraserMode ? brushSize * 3 : brushSize; // Match eraser effect size

        context.beginPath();
        context.arc(cursorScreenX, cursorScreenY, displaySize / 2, 0, Math.PI * 2);
        context.strokeStyle = eraserMode ? "red" : "black";
        context.lineWidth = 1;
        context.stroke();
    }

    // Mouse Events (desktop)
    let leftMouseDown = false,
    rightMouseDown = false;

    canvas.addEventListener('mousedown', (event) => {
        if (event.button === 0)
            leftMouseDown = true;
        if (event.button === 2)
            rightMouseDown = true;
        cursorX = prevCursorX = event.offsetX;
        cursorY = prevCursorY = event.offsetY;
    });

    canvas.addEventListener('mousemove', (event) => {
        cursorX = event.offsetX;
        cursorY = event.offsetY;

        if (leftMouseDown) {
            if (panMode) {
                offsetX += (cursorX - prevCursorX) / scale;
                offsetY += (cursorY - prevCursorY) / scale;
                redrawCanvas();
            } else {
                const scaledX = toTrueX(cursorX);
                const scaledY = toTrueY(cursorY);
                const prevScaledX = toTrueX(prevCursorX);
                const prevScaledY = toTrueY(prevCursorY);

                if (eraserMode) {
                    const eraserRadius = (brushSize / scale) * 2; // Ensure the eraser size matches zoom

                    for (let i = drawings.length - 1; i >= 0; i--) {
                        let d = drawings[i];
                        if (isNearLine(d.x0, d.y0, d.x1, d.y1, scaledX, scaledY, eraserRadius)) {
                            drawings.splice(i, 1);
                        }
                    }
                    window.whiteboardData[channel] = drawings;
                    redrawCanvas();
                } else {
                    drawings.push({
                        x0: prevScaledX,
                        y0: prevScaledY,
                        x1: scaledX,
                        y1: scaledY,
                        color: brushColor,
                        size: brushSize
                    });
                    drawLine(prevCursorX, prevCursorY, cursorX, cursorY, brushColor, brushSize);
                }
            }
        }

        prevCursorX = cursorX;
        prevCursorY = cursorY;

        drawCursorCircle(); // Draw the cursor preview
    });

    canvas.addEventListener('mouseup', () => {
        leftMouseDown = false;
        rightMouseDown = false;
    });

    function drawLine(x0, y0, x1, y1, color, size) {
        context.beginPath();
        context.moveTo(x0, y0);
        context.lineTo(x1, y1);
        context.strokeStyle = color;
        context.lineWidth = size;
        context.lineCap = "round";
        context.stroke();
    }

    function isNearLine(x0, y0, x1, y1, px, py, threshold) {
        const A = px - x0;
        const B = py - y0;
        const C = x1 - x0;
        const D = y1 - y0;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = lenSq !== 0 ? dot / lenSq : -1;

        let nearestX,
        nearestY;
        if (param < 0) {
            nearestX = x0;
            nearestY = y0;
        } else if (param > 1) {
            nearestX = x1;
            nearestY = y1;
        } else {
            nearestX = x0 + param * C;
            nearestY = y0 + param * D;
        }

        const dist = Math.hypot(px - nearestX, py - nearestY);
        return dist <= threshold;
    }

    // --- Updated Touch Events for Mobile ---
    // In mobile, only one-finger touch is used.
    // When Pan Mode is active, one-finger moves pan the canvas.
    // Otherwise, one-finger touch draws/erases.
    // --- Updated Touch Events for Mobile ---
    const prevTouches = [null];

    canvas.addEventListener('touchstart', (event) => {
        // Always store the first touch only; ignore extra touches.
        if (event.touches.length > 0) {
            prevTouches[0] = event.touches[0];
        }
    });

    canvas.addEventListener('touchmove', (event) => {
        event.preventDefault(); // Prevent scrolling
        const rect = canvas.getBoundingClientRect();

        if (event.touches.length !== 1)
            return;

        const touch = event.touches[0];
        cursorX = touch.clientX - rect.left; // Update cursorX with touch position
        cursorY = touch.clientY - rect.top; // Update cursorY with touch position

        if (panMode) {
            const prevTouch = prevTouches[0];
            const prevTouchX = prevTouch.clientX - rect.left;
            const prevTouchY = prevTouch.clientY - rect.top;
            offsetX += (cursorX - prevTouchX) / scale;
            offsetY += (cursorY - prevTouchY) / scale;
            redrawCanvas();
            window.whiteboardPanZoomData[channel] = {
                offsetX,
                offsetY,
                scale
            };
            prevTouches[0] = touch;
        } else {
            const scaledX = toTrueX(cursorX);
            const scaledY = toTrueY(cursorY);
            const prevTouch = prevTouches[0];
            const prevTouchX = prevTouch.clientX - rect.left;
            const prevTouchY = prevTouch.clientY - rect.top;
            const prevScaledX = toTrueX(prevTouchX);
            const prevScaledY = toTrueY(prevTouchY);

            if (eraserMode) {
                const eraserRadius = (brushSize / scale) * 2;
                for (let i = drawings.length - 1; i >= 0; i--) {
                    let d = drawings[i];
                    if (isNearLine(d.x0, d.y0, d.x1, d.y1, scaledX, scaledY, eraserRadius)) {
                        drawings.splice(i, 1);
                    }
                }
                window.whiteboardData[channel] = drawings;
                redrawCanvas();
            } else {
                drawings.push({
                    x0: prevScaledX,
                    y0: prevScaledY,
                    x1: scaledX,
                    y1: scaledY,
                    color: brushColor,
                    size: brushSize
                });
                drawLine(prevTouchX, prevTouchY, cursorX, cursorY, brushColor, brushSize);
                window.whiteboardData[channel] = drawings;
            }
            prevTouches[0] = touch;
        }

        drawCursorCircle(); // Ensure the circle preview updates on touch
    });

    canvas.addEventListener('touchend', (event) => {
        if (event.touches.length === 0) {
            prevTouches[0] = null;
        }
    });
    // --- End Updated Touch Events ---

    // --- End Updated Touch Events ---
}

/***********************
 * 4. Code Runner (Full code editor, non-resizable)
 ***********************/
function renderCodeChannel(container, channel) {
    // Create header container with title and Save button
    const headerContainer = document.createElement("div");
    headerContainer.style.display = "flex";
    headerContainer.style.justifyContent = "space-between";
    headerContainer.style.alignItems = "center";

    const header = document.createElement("h2");
    header.textContent = "Code Runner";
    headerContainer.appendChild(header);

    const saveBtn = document.createElement("button");
    saveBtn.textContent = "Save";
    headerContainer.appendChild(saveBtn);
    container.appendChild(headerContainer);

    // Create Export and Import buttons container with an editable function name field anchored to the right
    const ioContainer = document.createElement("div");
    ioContainer.classList.add("toolbar");
    ioContainer.style.margin = "10px 0";
    ioContainer.style.display = "flex";
    ioContainer.style.alignItems = "center";

    const exportBtn = document.createElement("button");
    exportBtn.textContent = "Export";
    ioContainer.appendChild(exportBtn);

    const importBtn = document.createElement("button");
    importBtn.textContent = "Import";
    ioContainer.appendChild(importBtn);

    // Editable text field for function name, anchored to the right
    const functionNameInput = document.createElement("input");
    functionNameInput.type = "text";
    functionNameInput.placeholder = "Function Name..";
    functionNameInput.style.flex = "1"; // Expand as much as possible while leaving space for buttons
    functionNameInput.style.minWidth = "80px"; // Prevent it from becoming too small
    functionNameInput.style.maxWidth = "calc(100% - 120px)";
    ioContainer.appendChild(functionNameInput);

    container.appendChild(ioContainer);

    // Create code editor wrapper
    const wrapper = document.createElement("div");
    wrapper.classList.add("code-runner-wrapper");
    wrapper.style.height = "calc(100% - 40px)";
    wrapper.style.position = "relative";
    container.appendChild(wrapper);

    // Run button and code area
    const runBtn = document.createElement("button");
    runBtn.textContent = "Run Code";
    runBtn.classList.add("run-btn");
    wrapper.appendChild(runBtn);

    const codeArea = document.createElement("textarea");
    codeArea.classList.add("code-runner-textarea");
    codeArea.style.boxSizing = "border-box";
    codeArea.style.resize = "none";
    wrapper.appendChild(codeArea);

    // Initialize or load existing code
    if (window.codeData[channel.id]) {
        codeArea.value = window.codeData[channel.id];
    }

    codeArea.addEventListener("input", () => {
        window.codeData[channel.id] = codeArea.value;
    });

    // Output div for code execution results
    const outputDiv = document.createElement("div");
    outputDiv.classList.add("code-runner-output");
    wrapper.appendChild(outputDiv);

    // Code execution handler
    runBtn.addEventListener("click", () => {
        const code = codeArea.value;
        const logs = [];
        const originalConsoleLog = console.log;

        console.log = function (...args) {
            logs.push(args.join(" "));
            originalConsoleLog.apply(console, args);
        };

        try {
            const result = eval(code);
            let outputText = logs.length > 0
                 ? logs.join("\n")
                 : (result !== undefined ? result : "Code executed successfully.");
            outputDiv.textContent = outputText;
        } catch (error) {
            outputDiv.textContent = "Error: " + error;
        }
        console.log = originalConsoleLog;
    });

    // When the function name input changes, update the save button text if a function with that name exists.
    functionNameInput.addEventListener("input", () => {
        let functionsCategory = categories.find(cat => cat.name === "Functions");
        if (functionsCategory) {
            const existingFunction = functionsCategory.channels.find(ch =>
                    ch.name.toLowerCase() === functionNameInput.value.trim().toLowerCase());
            saveBtn.textContent = existingFunction ? "Update" : "Save";
        } else {
            saveBtn.textContent = "Save";
        }
    });

    // Save/Update functionality
    saveBtn.addEventListener("click", () => {
        const code = codeArea.value;
        if (!code.trim()) {
            // Do not save empty code.
            return;
        }

        // Ensure Functions category exists
        let functionsCategory = categories.find(cat => cat.name === "Functions");
        if (!functionsCategory) {
            functionsCategory = {
                name: "Functions",
                channels: []
            };
            categories.push(functionsCategory);
        }

        let enteredName = functionNameInput.value.trim();
        if (enteredName === "") {
            // Default name if none provided.
            enteredName = "Saved Function " + (functionsCategory.channels.length + 1);
        }

        // Check if a function with that name already exists (case-insensitive)
        const existingIndex = functionsCategory.channels.findIndex(ch =>
                ch.name.toLowerCase() === enteredName.toLowerCase());
        if (existingIndex !== -1) {
            // Update existing function
            functionsCategory.channels[existingIndex].code = code;
        } else {
            // Create new function entry with a unique id
            const funcId = "func_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
            const newFuncChannel = {
                id: funcId,
                name: enteredName,
                type: "function",
                code: code
            };
            functionsCategory.channels.push(newFuncChannel);
        }
        renderSidebar();
        // Clear the function name input and reset save button text
        functionNameInput.value = "";
        saveBtn.textContent = "Save";
    });

    // Export functionality
    exportBtn.addEventListener("click", () => {
        let functionsCategory = categories.find(cat => cat.name === "Functions");
        if (!functionsCategory?.channels?.length) {
            return;
        }

        const data = functionsCategory.channels;
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], {
            type: "application/json"
        });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = "code_functions.json";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    });

    // Import functionality (replace by name)
    importBtn.addEventListener("click", () => {
        const importInput = document.createElement("input");
        importInput.type = "file";
        importInput.accept = "application/json";
        importInput.style.display = "none";

        importInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (!file)
                return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const importedData = JSON.parse(event.target.result);
                    if (!Array.isArray(importedData)) {
                        return;
                    }

                    let functionsCategory = categories.find(cat => cat.name === "Functions");
                    if (!functionsCategory) {
                        functionsCategory = {
                            name: "Functions",
                            channels: []
                        };
                        categories.push(functionsCategory);
                    }

                    // For each imported function, replace an existing one with the same name (case-insensitive) or add new
                    importedData.forEach(importedFunc => {
                        const existingIndex = functionsCategory.channels.findIndex(ch =>
                                ch.name.toLowerCase() === importedFunc.name.toLowerCase());
                        if (existingIndex !== -1) {
                            functionsCategory.channels[existingIndex] = importedFunc;
                        } else {
                            functionsCategory.channels.push(importedFunc);
                        }
                    });
                    renderSidebar();
                } catch (err) {
                    // Handle errors if needed
                }
            };
            reader.readAsText(file);
        });
        importInput.click();
    });
}

/***********************
 * 5. Reminders Channel
 ***********************/
function renderReminderChannel(container, channel) {
    const header = document.createElement("h2");
    header.textContent = "Reminders";
    container.appendChild(header);

    // Contrast calculation function
    function getContrastingTextColor(bgColor) {
        const parseColor = (colorStr) => {
            colorStr = colorStr.trim().toLowerCase();
            if (colorStr.startsWith('#')) {
                let hex = colorStr.slice(1);
                if ([3, 4].includes(hex.length)) {
                    hex = hex.split('').map(c => c + c).join('');
                }
                return {
                    r: parseInt(hex.substring(0, 2), 16),
                    g: parseInt(hex.substring(2, 4), 16),
                    b: parseInt(hex.substring(4, 6), 16)
                };
            }
            if (colorStr.startsWith('rgb')) {
                const parts = colorStr.match(/(\d+)/g) || [];
                return {
                    r: parseInt(parts[0]) || 0,
                    g: parseInt(parts[1]) || 0,
                    b: parseInt(parts[2]) || 0
                };
            }
            return {
                r: 255,
                g: 255,
                b: 255
            };
        };

        const calculateLuminance = (r, g, b) => {
            const srgbToLinear = (c) => {
                c /= 255;
                return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
            };
            return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
        };

        const {
            r,
            g,
            b
        } = parseColor(bgColor);
        return calculateLuminance(r, g, b) > 0.179 ? '#000000' : '#ffffff';
    }

    // Ensure reminders storage exists
    if (!reminders[channel.id]) {
        reminders[channel.id] = [];
    }

    // List of reminders
    const listDiv = document.createElement("div");
    container.appendChild(listDiv);

    function renderReminders() {
        listDiv.innerHTML = "";
        reminders[channel.id].forEach((reminder, index) => {
            const reminderDiv = document.createElement("div");
            reminderDiv.classList.add("reminder-container");

            // Set background and calculated text color
            reminderDiv.style.backgroundColor = reminder.color;
            const textColor = getContrastingTextColor(reminder.color);
            reminderDiv.style.color = textColor;

            reminderDiv.style.padding = "10px";
            reminderDiv.style.margin = "5px 0";
            reminderDiv.style.borderRadius = "4px";

            if (reminder.date) {
                const dateDiv = document.createElement("div");
                dateDiv.textContent = new Date(reminder.date).toLocaleString();
                reminderDiv.appendChild(dateDiv);
            }

            const textDiv = document.createElement("div");
            textDiv.textContent = reminder.text;
            reminderDiv.appendChild(textDiv);

            const removeBtn = document.createElement("button");
            removeBtn.textContent = "Remove";
            removeBtn.addEventListener("click", () => {
                reminders[channel.id].splice(index, 1);
                renderReminders();
            });
            reminderDiv.appendChild(removeBtn);
            listDiv.appendChild(reminderDiv);
        });
    }
    renderReminders();

    // Add reminder form
    const form = document.createElement("form");

    // Date input
    const dateInput = document.createElement("input");
    dateInput.type = "datetime-local";
    form.appendChild(dateInput);

    // Text input
    const textInput = document.createElement("input");
    textInput.type = "text";
    textInput.placeholder = "Reminder text";
    textInput.required = true;
    form.appendChild(textInput);

    // Color picker
    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.value = "#007bff";
    colorInput.style.marginLeft = "10px";
    form.appendChild(colorInput);

    // Submit button
    const addBtn = document.createElement("button");
    addBtn.type = "submit";
    addBtn.textContent = "Add Reminder";
    form.appendChild(addBtn);

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const newReminder = {
            date: dateInput.value || null,
            text: textInput.value,
            color: colorInput.value
        };
        reminders[channel.id].push(newReminder);
        dateInput.value = "";
        textInput.value = "";
        renderReminders();
    });
    container.appendChild(form);
}

/***********************
 * Initialize on DOM Ready
 ***********************/
document.addEventListener("DOMContentLoaded", () => {
    renderSidebar();
    if (categories.length > 0 && categories[0].channels.length > 0) {
        selectChannel(categories[0].channels[0]);
    }
});
