(() => {
  let activeChannelId = null;
  
  const el = (tag, props = {}, ...children) => {
    const e = document.createElement(tag);
    for (let [k, v] of Object.entries(props)) {
      if (k === 'class') e.className = v;
      else if (k === 'style') Object.assign(e.style, v);
      else if (k.startsWith('on') && typeof v === 'function')
        e.addEventListener(k.slice(2).toLowerCase(), v);
      else e[k] = v;
    }
    children.forEach(child => {
      if (typeof child === 'string') e.appendChild(document.createTextNode(child));
      else if (child) e.appendChild(child);
    });
    return e;
  };

  
  const categories = [
  { name: "General", channels: [{ id: "text1", name: "General Chat", type: "text" }] },
  { name: "Learning", channels: [
      { id: "flashcard1", name: "Flashcards", type: "flashcard" },
      { id: "whiteboard1", name: "Whiteboard", type: "whiteboard" },
      { id: "code1", name: "Code Runner", type: "code" }
    ]
  },
  { name: "Reminders", channels: [{ id: "reminder1", name: "My Reminders", type: "reminder" }] },
  { name: "Utilities", channels: [{ id: "crypt1", name: "Crypt", type: "crypt" }] }
];

  const chatMessages = {}, flashcards = {}, reminders = {};
  window.whiteboardData = window.whiteboardData || {};
  window.codeData = window.codeData || {};

  
  const readFile = (file) => new Promise((res) => {
    const reader = new FileReader();
    reader.onload = e => res({ name: file.name, type: file.type, content: e.target.result });
    (file.type.startsWith("image/") || file.type.startsWith("audio/"))
      ? reader.readAsDataURL(file)
      : reader.readAsText(file);
  });

  
  const renderSidebar = () => {
    const sidebar = document.querySelector(".sidebar");
    sidebar.innerHTML = "";
    sidebar.appendChild(el("button", { class: "collapse-btn", onclick: () => sidebar.classList.toggle("collapsed") }, "▶"));
    const frag = document.createDocumentFragment();
    categories.forEach(cat => {
      frag.appendChild(el("h2", {}, cat.name));
      const ul = el("ul", { class: "channel-list" });
      cat.channels.forEach(ch => {
        const li = el("li", {
          class: "channel-item",
          "data-channel-id": ch.id,
          "data-channel-type": ch.type,
          onclick: () => {
            if (ch.type === "function") {
              const codeCh = categories.flatMap(c => c.channels).find(ch => ch.type === "code");
              if (codeCh) { window.codeData[codeCh.id] = ch.code; selectChannel(codeCh); }
            } else selectChannel(ch);
          }
        }, ch.name);
        if (ch.type === "function") {
          li.appendChild(el("button", { class: "remove-btn", onclick: e => {
            e.stopPropagation();
            const funcCat = categories.find(c => c.name === "Functions");
            if (funcCat) { funcCat.channels = funcCat.channels.filter(x => x.id !== ch.id); renderSidebar(); }
          } }, "Remove"));
        }
        ul.appendChild(li);
      });
      frag.appendChild(ul);
    });
    frag.appendChild(el("div", { class: "version-text" }, "v1.18"));
    sidebar.appendChild(frag);
    if (!window.sidebarOutsideListenerAdded) {
      const collapseSidebar = e => { if (sidebar && !sidebar.contains(e.target)) sidebar.classList.add("collapsed"); };
      document.addEventListener("click", collapseSidebar);
      document.addEventListener("touchstart", collapseSidebar);
      window.sidebarOutsideListenerAdded = true;
    }
  };

  const selectChannel = channel => {
    activeChannelId = channel.id;
    document.querySelectorAll(".channel-item").forEach(item =>
        item.classList.toggle("active-channel", item.getAttribute("data-channel-id") === channel.id)
    );
    renderChannel(channel);
};

  
  const renderChannel = channel => {
    const main = document.querySelector(".main-content");
    main.innerHTML = "";
    ({
      text: () => renderTextChannel(main, channel),
      flashcard: () => renderFlashcardChannel(main, channel),
      whiteboard: () => renderWhiteboardChannel(main, channel),
      code: () => renderCodeChannel(main, channel),
      reminder: () => renderReminderChannel(main, channel),
	  crypt: () => renderCryptChannel(main, channel)
    }[channel.type] || (() => {}))();
  };
  
  const renderTextChannel = (container, channel) => {
    container.appendChild(el("h2", {}, "Text Channel"));
    const chatContainer = el("div", { class: "chat-container", style: { height: "90%" } });
    const messagesDiv = el("div", { class: "messages-area" });
    chatContainer.appendChild(messagesDiv);

    const updateMessages = () => {
      messagesDiv.innerHTML = "";
      const frag = document.createDocumentFragment();
      (chatMessages[channel.id] || []).forEach((msg, idx) => {
        const msgContainer = el("div", { class: "message-container" });
        msgContainer.appendChild(el("div", { class: "message-date" }, msg.date));
        const contentDiv = el("div", { class: "message-content" });
        const textContainer = el("span");
        msg.text.split(/(https?:\/\/\S+|www\.\S+)/gi).forEach((part, i) => {
          if (!part) return;
          if (i % 2) {
            let url = /^www\./i.test(part) ? "http://" + part : part;
            try {
              new URL(url);
              textContainer.appendChild(el("a", { href: url, target: "_blank", rel: "noopener noreferrer" }, part));
            } catch { textContainer.appendChild(document.createTextNode(part)); }
          } else {
            const textWithNewlines = part.split('\n').map((line, index, array) => {
              const lineElement = document.createTextNode(line);
              if (index < array.length - 1) {
                return [lineElement, el("br")];
              }
              return lineElement;
            }).flat();
            textWithNewlines.forEach(element => textContainer.appendChild(element));
          }
        });
        contentDiv.appendChild(textContainer);
        if (msg.files?.length) {
          const filesDiv = el("div");
          msg.files.forEach(file => {
            const fileWrapper = el("div", { style: { position: "relative" } });
            if (file.type.startsWith("image/")) {
              const img = el("img", { src: file.content, style: { maxWidth: "200px", cursor: "pointer" } });
              img.addEventListener("click", () => showImageOverlay(file.content));
              fileWrapper.appendChild(img);
            } else if (file.type.startsWith("audio/"))
              fileWrapper.appendChild(el("audio", { src: file.content, controls: true }));
            else if (file.type.startsWith("text/") || !file.type)
              fileWrapper.appendChild(el("pre", { style: { maxHeight: "150px", overflow: "auto" } }, file.content));
            else fileWrapper.textContent = file.name;
            fileWrapper.appendChild(el("button", {
              class: "download-btn",
              onclick: () => {
                const a = el("a");
                if (file.type.startsWith("image/") || file.type.startsWith("audio/"))
                  a.href = file.content;
                else {
                  const blob = new Blob([file.content], { type: file.type || "text/plain" });
                  a.href = URL.createObjectURL(blob);
                }
                a.download = file.name; a.click();
              }
            }, "Download"));
            filesDiv.appendChild(fileWrapper);
          });
          contentDiv.appendChild(filesDiv);
        }
        msgContainer.appendChild(contentDiv);
    
        const btnContainer = el("div", { class: "message-toolbar" });
        btnContainer.appendChild(el("button", { class: "edit-btn", onclick: () => {
          const editForm = el("form");
          const rows = msg.text.split('\n').length;
          const editInput = el("textarea", { class: "message-edited", rows: rows, value: msg.text });
          editForm.appendChild(editInput);
    
          let tempFiles = msg.files.slice();
    
          const editFilesDiv = el("div");
          
          const renderEditFiles = () => {
            editFilesDiv.innerHTML = "";
            tempFiles.forEach((file, fIdx) => {
              const fileRow = el("div", { style: { position: "relative" } });
              if (file.type.startsWith("image/")) {
                const img = el("img", { src: file.content, style: { maxWidth: "200px", cursor: "pointer" } });
                img.addEventListener("click", () => showImageOverlay(file.content));
                fileRow.appendChild(img);
              } else if (file.type.startsWith("audio/")) {
                fileRow.appendChild(el("audio", { src: file.content, controls: true }));
              } else if (file.type.startsWith("text/") || !file.type) {
                fileRow.appendChild(el("pre", { style: { maxHeight: "150px", overflow: "auto" } }, file.content));
              } else {
                fileRow.textContent = file.name;
              }
              fileRow.appendChild(el("button", { 
                type: "button", 
                class: "remove-btn", 
                style: { position: "absolute", top: "0px", right: "0px" }, 
                onclick: () => { 
                  tempFiles.splice(fIdx, 1);
                  renderEditFiles();
                } 
              }, "Remove"));
              editFilesDiv.appendChild(fileRow);
            });
          };
          renderEditFiles();
          editForm.appendChild(editFilesDiv);
    
          const newFileInput = el("input", { type: "file", multiple: true, style: { display: "none" } });
          const newAttachBtn = el("button", { type: "button", onclick: e => { 
            e.preventDefault(); newFileInput.click(); 
          } }, "Attach File");
          editForm.appendChild(newAttachBtn);
          editForm.appendChild(newFileInput);
          newFileInput.addEventListener("change", async () => {
            for (const file of newFileInput.files)
              tempFiles.push(await readFile(file));
            renderEditFiles();
            newFileInput.value = "";
          });
          const saveBtn = el("button", { type: "submit" }, "Save");
          const cancelBtn = el("button", { type: "button", onclick: updateMessages }, "Cancel");
          editForm.append(saveBtn, cancelBtn);
    
          const contentDiv = msgContainer.querySelector(".message-content");
          contentDiv.innerHTML = "";
          contentDiv.appendChild(editForm);
    
          editForm.addEventListener("submit", e => {
            e.preventDefault();
            msg.text = editInput.value;
            msg.files = tempFiles; 
            updateMessages();
          });
        } }, "Edit"));        
        btnContainer.appendChild(el("button", { class: "remove-btn", onclick: () => { 
          chatMessages[channel.id].splice(idx, 1); updateMessages(); 
        } }, "Remove"));
        msgContainer.appendChild(btnContainer);
        frag.appendChild(msgContainer);
      });
      messagesDiv.appendChild(frag);
    };

    const showImageOverlay = (src) => {
      const overlay = el("div", { class: "image-overlay" });
      const img = el("img", { src });
      overlay.appendChild(img);
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
          overlay.classList.remove("show");
          setTimeout(() => overlay.remove(), 100); 
        }
      });
      document.body.appendChild(overlay);
      setTimeout(() => overlay.classList.add("show"), 0); 
    };

    chatMessages[channel.id] = chatMessages[channel.id] || [];
    updateMessages();

    const fileListDiv = el("div", { style: { display: "flex", overflowX: "auto" } });
    chatContainer.appendChild(fileListDiv);

    const footerDiv = el("div", { class: "toolbar" });
    const textInput = el("textarea", {
      rows: "1",
      placeholder: "Type a message...", 
      style: { flex: "1", minWidth: "100px", maxWidth: "calc(100% - 120px)" },
      onkeydown: e => {
        if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
          e.preventDefault();
          form.dispatchEvent(new Event("submit", { cancelable: true }));
        }
      }
    });
    footerDiv.appendChild(textInput);
    const fileInput = el("input", { type: "file", multiple: true, style: { display: "none" } });
    footerDiv.appendChild(el("button", { type: "button", onclick: () => fileInput.click() }, "Attach File"));
    footerDiv.appendChild(fileInput);
    footerDiv.appendChild(el("button", { type: "submit" }, "Send"));
    chatContainer.appendChild(footerDiv);

    let attachedFiles = [];
    const updateFileList = () => {
      fileListDiv.innerHTML = "";
      attachedFiles.forEach((file, i) => {
        const fileDiv = el("div", { class: "file-item" }, file.name);
        fileDiv.appendChild(el("button", { class: "remove-btn", onclick: () => {
          attachedFiles.splice(i, 1); updateFileList();
        } }, "Remove"));
        fileListDiv.appendChild(fileDiv);
      });
    };
    fileInput.addEventListener("change", async () => {
      for (const file of fileInput.files)
        attachedFiles.push(await readFile(file));
      updateFileList(); fileInput.value = "";
    });
    const form = el("form", { onsubmit: e => {
      e.preventDefault();
      const text = textInput.value;
      if ((typeof text === "string" && text.trim() !== "") || attachedFiles.length) {
        chatMessages[channel.id].push({ date: new Date().toLocaleString(), text, files: attachedFiles });
        updateMessages(); textInput.value = ""; attachedFiles = []; updateFileList();
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
      }
    }});
    form.appendChild(fileListDiv);
    form.appendChild(footerDiv);
    chatContainer.appendChild(form);
    container.appendChild(chatContainer);
  };

  
  const renderFlashcardChannel = (container, channel) => {
    container.innerHTML = "";
    const titleContainer = el("div", { class: "flashcard-toolbar", style: { display: "flex", justifyContent: "space-between", alignItems: "center" } });
    titleContainer.appendChild(el("h2", {}, "Flashcard Maker & Tester"));
  
    const buttonContainer = el("div", { style: { display: "flex", flexWrap: "wrap" } });
    buttonContainer.appendChild(el("button", { type: "button", onclick: () => {
        const data = flashcards[channel.id] || [];
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        el("a", { href: URL.createObjectURL(blob), download: "flashcards.json" }).click();
    }}, "Export"));
    const importInput = el("input", { type: "file", accept: "application/json", style: { display: "none" },
        onchange: async e => {
            const file = e.target.files[0]; if (!file) return;
            const fileObj = await readFile(file);
            try {
                const imported = JSON.parse(fileObj.content);
                if (Array.isArray(imported)) { flashcards[channel.id] = imported; renderFlashcardsList(); }
            } catch {}
        }
    });
    buttonContainer.appendChild(importInput);
    buttonContainer.appendChild(el("button", { type: "button", onclick: () => importInput.click() }, "Import"));
    titleContainer.appendChild(buttonContainer);
    container.appendChild(titleContainer);
  
    const modeContainer = el("div"), creationDiv = el("div");
    const form = el("form", { class: "flashcard-form", onsubmit: e => {
        e.preventDefault();
        const q = questionInput.value.trim();
        if (!q) return;
        const answers = Array.from(answersContainer.querySelectorAll(".answer-row")).map(row => {
          const [chk, inp] = row.querySelectorAll("input");
          return inp.value.trim() ? { text: inp.value, correct: chk.checked } : null;
      }).filter(x => x);
      
        if (answers.length) {
            flashcards[channel.id] = flashcards[channel.id] || [];
            flashcards[channel.id].push({ question: q, answers });
            questionInput.value = ""; answersContainer.innerHTML = ""; addAnswerRow(); renderFlashcardsList();
        }
    }});

    const questionInput = el("input", { type: "text", placeholder: "Enter question here", required: true, style: { flex: "1" } });
    form.appendChild(questionInput);
    const answersContainer = el("div", { id: "answers-container" });
    form.appendChild(answersContainer);
    const addAnswerRow = (txt = "", corr = false) => {
      const row = el("div", { class: "answer-row", style: { display: "flex", alignItems: "center" } });
      row.appendChild(el("input", { type: "checkbox", title: "Mark as correct answer", checked: corr }));
      row.appendChild(el("input", { type: "text", placeholder: "Answer", required: true, value: txt, style: { flex: "1" } }));
      row.appendChild(el("button", { type: "button", class: "remove-btn", onclick: () => row.remove() }, "Remove"));
      answersContainer.appendChild(row);
  };
    addAnswerRow();
    form.appendChild(el("button", { type: "button", onclick: () => addAnswerRow() }, "Add Answer"));
    form.appendChild(el("button", { type: "submit" }, "Add Flashcard"));
    const startTestBtn = el("button", { type: "button" }, "Start Test");
    form.appendChild(startTestBtn);
    creationDiv.appendChild(form);

    const flashcardListDiv = el("div");
    creationDiv.appendChild(flashcardListDiv);
    const testDiv = el("div", { style: { display: "none" } });
    modeContainer.append(creationDiv, testDiv);
    
    container.appendChild(modeContainer);

const renderFlashcardsList = () => {
  flashcardListDiv.innerHTML = "";
  (flashcards[channel.id] = flashcards[channel.id] || []).forEach((card, idx) => {
    const cardDiv = el("div", { class: "flashcard" });
    const questionP = el("p", {}, "Q: " + card.question);
    cardDiv.appendChild(questionP);
    const ul = el("div");
    card.answers.forEach(ans => {
      const li = el("div", { style: { display: "flex", alignItems: "center" } });
      const checkbox = el("input", { type: "checkbox", checked: ans.correct, disabled: true });
      li.appendChild(checkbox);
      li.appendChild(document.createTextNode(ans.text));
      ul.appendChild(li);
    });
    cardDiv.appendChild(ul);

    const toolbar = el("div", { class: "toolbar" });

    const editBtn = el("button", { type: "button", onclick: function () {
      if (this.textContent === "Edit") {
        // Switch to edit mode:
        const qInput = el("input", { type: "text", value: card.question, style: { width: "100%" } });
        cardDiv.replaceChild(qInput, questionP);

        // Create a container for answer rows
        const answersDiv = el("div");
        card.answers.forEach(ans => {
          const row = el("div", { class: "answer-row", style: { display: "flex", alignItems: "center" } });
          row.appendChild(el("input", { type: "checkbox", checked: ans.correct }));
          row.appendChild(el("input", { type: "text", value: ans.text, style: { flex: "1" } }));
          answersDiv.appendChild(row);
        });
        // Replace the UL with the answers container
        cardDiv.replaceChild(answersDiv, ul);

        // Create and append the Add Answer button to the toolbar
        const addAnswerBtn = el("button", { type: "button", onclick: () => {
          const row = el("div", { class: "answer-row", style: { display: "flex", alignItems: "center" } });
          row.appendChild(el("input", { type: "checkbox" }));
          row.appendChild(el("input", { type: "text", placeholder: "New answer", style: { flex: "1" } }));
          answersDiv.appendChild(row);
        }}, "Add Answer");
        toolbar.insertBefore(addAnswerBtn, this.nextSibling);
        this.textContent = "Save";
      } else {
        // Save mode: update card data
        const qInput = cardDiv.querySelector("input[type='text']");
        card.question = qInput.value;
        const newAns = [];
        cardDiv.querySelectorAll(".answer-row").forEach(row => {
          const [chk, inp] = row.querySelectorAll("input");
          if (inp.value.trim()) newAns.push({ text: inp.value, correct: chk.checked });
        });
        card.answers = newAns;
        // Remove the Add Answer button from the toolbar if present
        const addAnswerBtn = toolbar.querySelector("button:nth-child(3)");
        if (addAnswerBtn && addAnswerBtn.textContent === "Add Answer") {
          toolbar.removeChild(addAnswerBtn);
        }
        renderFlashcardsList();
      }
    } }, "Edit");

    toolbar.appendChild(editBtn);
    toolbar.appendChild(el("button", { type: "button", class: "remove-btn", onclick: () => {
      flashcards[channel.id].splice(idx, 1);
      renderFlashcardsList();
    } }, "Remove"));

    cardDiv.appendChild(toolbar);
    flashcardListDiv.appendChild(cardDiv);
  });
  startTestBtn.disabled = !(flashcards[channel.id]?.length);
};

renderFlashcardsList();

    startTestBtn.addEventListener("click", () => {
        creationDiv.style.display = "none";
        renderTestMode(testDiv, channel);
        testDiv.style.display = "block";
    });
    const renderTestMode = (testContainer, channel) => {
  testContainer.innerHTML = "";
  const cards = [...(flashcards[channel.id] || [])].sort(() => Math.random() - 0.5);
  if (!cards.length) {
    testContainer.textContent = "No flashcards available for testing.";
    return;
  }

  const testData = cards.map(card => {
    const shuffledAnswers = card.answers.slice();
    for (let i = shuffledAnswers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledAnswers[i], shuffledAnswers[j]] = [shuffledAnswers[j], shuffledAnswers[i]];
    }
    return { question: card.question, answers: shuffledAnswers };
  });

  const formTest = el("form", { onsubmit: e => {
      e.preventDefault();
      let score = 0;
      testData.forEach((testCard, idx) => {
        const selected = Array.from(formTest.querySelectorAll(`input[name="card${idx}"]:checked`))
                              .map(inp => +inp.value);
        const correct = testCard.answers
                              .map((ans, i) => ans.correct ? i : null)
                              .filter(x => x !== null);
        if (selected.sort().toString() === correct.sort().toString()) score++;
        formTest.querySelectorAll(`input[name="card${idx}"]`).forEach(inp => {
          const val = +inp.value;
          if (correct.includes(val)) inp.parentElement.classList.add("correct-highlight");
          else if (inp.checked) inp.parentElement.classList.add("incorrect-highlight");
          inp.disabled = true;
        });
      });
      formTest.querySelector("button[type='submit']").disabled = true;
      formTest.appendChild(
        el("div", {}, `Your score: ${score} / ${testData.length}`)
      );
    }
  });

  testData.forEach((testCard, idx) => {
    const qDiv = el("div");
    qDiv.appendChild(el("p", {}, "Q: " + testCard.question));
    testCard.answers.forEach((ans, aIdx) => {
      const label = el("label", {
        style: { display: "flex", alignItems: "center" }
      });
      label.appendChild(el("input", { type: "checkbox", name: `card${idx}`, value: aIdx }));
      label.append(ans.text);
      qDiv.appendChild(label);
    });
    formTest.appendChild(qDiv);
  });

  formTest.appendChild(el("button", { type: "submit" }, "Submit Answers"));
  formTest.appendChild(el("button", { type: "button", onclick: () => {
    testContainer.style.display = "none";
    creationDiv.style.display = "block";
  }}, "Back"));

  testContainer.appendChild(formTest);
};

};

const renderWhiteboardChannel = (container, channel) => {
  // Clear and set up container layout.
  container.innerHTML = "";
  Object.assign(container.style, {
    display: "flex",
    flexDirection: "column",
  });

  // Create header and toolbar.
  const headerContainer = el("div", { style: { display: "flex", flexDirection: "column" } });
  headerContainer.appendChild(el("h2", {}, "Whiteboard"));

  // Shared constants.
  const PATTERN_SIZE = 40,
        DOT_RADIUS = 1,
        DOT_COLOR = "#3c3c81",
        BG_COLOR = "#1a1a2e";

  // --- Helper functions ---

  // Snap the given (x,y) to the underlying grid.
  const snapCoordinates = (x, y) => {
    let startXGrid = (offsetX * scale) % PATTERN_SIZE;
    let startYGrid = (offsetY * scale) % PATTERN_SIZE;
    if (startXGrid < 0) startXGrid += PATTERN_SIZE;
    if (startYGrid < 0) startYGrid += PATTERN_SIZE;
    return {
      x: startXGrid + Math.round((x - startXGrid) / PATTERN_SIZE) * PATTERN_SIZE,
      y: startYGrid + Math.round((y - startYGrid) / PATTERN_SIZE) * PATTERN_SIZE,
    };
  };

  // Helper to test if a point (px,py) is near a line segment (x0,y0)-(x1,y1)
  // within a given tolerance (adjusted by the line’s own thickness).
  const isNearLine = (x0, y0, x1, y1, px, py, tolerance, lineWidth) => {
    const A = px - x0;
    const B = py - y0;
    const C = x1 - x0;
    const D = y1 - y0;
    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    let param = (len_sq !== 0) ? dot / len_sq : -1;
    let xx, yy;
    if (param < 0) {
      xx = x0;
      yy = y0;
    } else if (param > 1) {
      xx = x1;
      yy = y1;
    } else {
      xx = x0 + param * C;
      yy = y0 + param * D;
    }
    const dx = px - xx;
    const dy = py - yy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist <= tolerance + lineWidth / 2;
  };

  // Create a zoom button (in/out based on isZoomIn flag).
  const createZoomButton = (isZoomIn) => {
    return el("button", {
      onclick: () => {
        const factor = 2,
              cx = canvas.width / 2,
              cy = canvas.height / 2;
        const newScale = isZoomIn ? scale * factor : scale / (factor * factor);
        // Adjust offsets so that the zoom centers around the canvas center.
        offsetX += cx * (1 / newScale - 1 / scale);
        offsetY += cy * (1 / newScale - 1 / scale);
        scale = newScale;
        redrawCanvas();
        whiteboardPanZoomData[channel] = { offsetX, offsetY, scale };
      }
    }, isZoomIn ? "Zoom In" : "Zoom Out");
  };

  // --- Toolbar UI Elements ---

  const toolbar = el("div", { class: "toolbar", style: { display: "flex" } });
  
  const colorPicker = el("input", { 
    type: "color", 
    value: "#ffffff",
    onchange: e => { 
      brushColor = e.target.value; 
      eraserMode = false; 
      eraserButton.style.backgroundColor = ""; 
    } 
  });

  const sizeSlider = el("input", { 
    type: "range", 
    min: "1", 
    max: "20", 
    value: "1", 
    onchange: e => {
      brushSize = +e.target.value;
      drawCursorCircle(); 
    } 
  });

  const eraserButton = el("button", { 
    onclick: () => { 
      eraserMode = !eraserMode; 
      eraserButton.style.backgroundColor = eraserMode ? "#ff0000" : ""; 
    }
  }, "Eraser");

  const panModeButton = el("button", { 
    onclick: () => { 
      panMode = !panMode; 
      panModeButton.style.backgroundColor = panMode ? "var(--color-accent)" : ""; 
      redrawCanvas(); 
    }
  }, "Pan Mode");

  const zoomInButton = createZoomButton(true);
  const zoomOutButton = createZoomButton(false);

  const snapButton = el("button", {
    onclick: () => { 
      snapMode = !snapMode;
      snapButton.style.backgroundColor = snapMode ? "var(--color-accent)" : "";
    }
  }, "Snap");

  const stampButton = el("button", {
    onclick: () => {
      stampMode = !stampMode;
      stampButton.style.backgroundColor = stampMode ? "var(--color-accent)" : "";
      if (stampMode) {
        canvas.style.cursor = "crosshair";
        stampApplyButton.style.display = "block";
      } else {
        canvas.style.cursor = "none";
        stampApplyButton.style.display = "none";
        brushStampData = null; // Reset any saved stamp vector data.
        stampArea = null; // Clear the selected area
        redrawCanvas(); // Redraw the canvas to remove the selection
      }
    }
  }, "Stamp");

  toolbar.append(colorPicker, sizeSlider, eraserButton, panModeButton, zoomInButton, zoomOutButton, snapButton, stampButton);
  headerContainer.appendChild(toolbar);
  container.appendChild(headerContainer);

  // --- Canvas Setup ---

  const canvasWrapper = el("div", { style: { flex: "1", position: "relative", overflow: "hidden" } });
  container.appendChild(canvasWrapper);

  const canvas = el("canvas");
  canvas.style.cursor = "none"; // Hide the default cursor.
  canvasWrapper.appendChild(canvas);
  const context = canvas.getContext("2d");
  canvas.classList.add("whiteboard-context");
  document.oncontextmenu = () => false;

  // --- Data Initialization ---

  window.whiteboardData[channel] = window.whiteboardData[channel] || [];
  const drawings = window.whiteboardData[channel];
  window.whiteboardPanZoomData = window.whiteboardPanZoomData || {};
  whiteboardPanZoomData = window.whiteboardPanZoomData;
  whiteboardPanZoomData[channel] = whiteboardPanZoomData[channel] || { offsetX: 0, offsetY: 0, scale: 1 };
  let { offsetX, offsetY, scale } = whiteboardPanZoomData[channel],
      cursorX = 0, cursorY = 0, prevCursorX = 0, prevCursorY = 0,
      brushColor = "#fff", brushSize = 1, eraserMode = false, panMode = false,
      snapMode = false, stampMode = false, stampArea = null;

  // When a stamp is captured, its vector data is stored here.
  let brushStampData = null; 
  let stampDataWidth = 0, stampDataHeight = 0;

  // --- Coordinate Conversion Functions ---
  const toScreenX = x => (x + offsetX) * scale;
  const toScreenY = y => (y + offsetY) * scale;
  const toTrueX = x => (x / scale) - offsetX;
  const toTrueY = y => (y / scale) - offsetY; 

  // --- Drawing Functions ---

  const redrawCanvas = () => {
    canvas.width = canvasWrapper.clientWidth;
    canvas.height = canvasWrapper.clientHeight;
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background pattern.
    context.fillStyle = BG_COLOR;
    context.fillRect(0, 0, canvas.width, canvas.height);
    let startX = (offsetX * scale) % PATTERN_SIZE;
    let startY = (offsetY * scale) % PATTERN_SIZE;
    if (startX < 0) startX += PATTERN_SIZE;
    if (startY < 0) startY += PATTERN_SIZE;
    context.fillStyle = DOT_COLOR;
    for (let x = startX; x < canvas.width; x += PATTERN_SIZE) {
      for (let y = startY; y < canvas.height; y += PATTERN_SIZE) {
        context.beginPath();
        context.arc(x, y, DOT_RADIUS, 0, Math.PI * 2);
        context.fill();
      }
    }
    
    // Redraw stored drawings.
    drawings.forEach(item => {
      if (item.type === "line") {
        drawLine(
          toScreenX(item.x0), toScreenY(item.y0),
          toScreenX(item.x1), toScreenY(item.y1),
          item.color, item.size
        );
      }
    });
    
    drawAxes();
    if (stampArea) drawStampArea();
  };
      
  const drawLine = (x0, y0, x1, y1, color, size) => {
    context.beginPath();
    context.moveTo(x0, y0);
    context.lineTo(x1, y1);
    context.strokeStyle = color;
    context.lineWidth = size;
    context.lineCap = "round";
    context.stroke();
  };
  
  const drawAxes = () => {
    if (!panMode) return; 
    const cx = canvas.width / 2, cy = canvas.height / 2;
    context.save();
    context.strokeStyle = DOT_COLOR; 
    context.lineWidth = 1;
    
    context.beginPath();
    context.moveTo(0, cy);
    context.lineTo(canvas.width, cy);
    context.stroke();
    
    context.beginPath();
    context.moveTo(cx, 0);
    context.lineTo(cx, canvas.height);
    context.stroke();
    context.restore();
  };
  
  // Draw selection rectangle for stamp mode.
  const drawStampArea = () => {
    if (!stampArea) return;
    const selLeft = Math.min(stampArea.x0, stampArea.x1),
          selRight = Math.max(stampArea.x0, stampArea.x1),
          selTop = Math.min(stampArea.y0, stampArea.y1),
          selBottom = Math.max(stampArea.y0, stampArea.y1);
    const screenX = toScreenX(selLeft),
          screenY = toScreenY(selTop),
          screenWidth = toScreenX(selRight) - toScreenX(selLeft),
          screenHeight = toScreenY(selBottom) - toScreenY(selTop);
    context.save();
    context.strokeStyle = "#3c3c81";
    context.lineWidth = 2;
    context.setLineDash([5, 5]);
    context.strokeRect(screenX, screenY, screenWidth, screenHeight);
    context.restore();
  };
  
  // When a stamp has been captured, draw its preview at the cursor.
  const drawStampPreview = () => {
    if (!brushStampData) return;
    let pasteX = toTrueX(cursorX) - stampDataWidth / 2;
    let pasteY = toTrueY(cursorY) - stampDataHeight / 2;
    if (snapMode) {
      ({ x: pasteX, y: pasteY } = snapCoordinates(pasteX, pasteY));
    }
    brushStampData.forEach(item => {
      if (item.type === "line") {
        const x0 = pasteX + item.x0,
              y0 = pasteY + item.y0,
              x1 = pasteX + item.x1,
              y1 = pasteY + item.y1;
        drawLine(toScreenX(x0), toScreenY(y0), toScreenX(x1), toScreenY(y1), item.color, item.size);
      }
    });
  };
  
  // The cursor drawing function shows either the stamp preview or a normal cursor.
  const drawCursorCircle = () => {
    redrawCanvas();
    if (stampMode && brushStampData) {
      drawStampPreview();
    } else {
      const dispSize = eraserMode ? brushSize * 4 : brushSize;
      context.beginPath();
      context.arc(cursorX, cursorY, dispSize / 2, 0, Math.PI * 2);
      context.strokeStyle = eraserMode ? "red" : "white";
      context.lineWidth = 1;
      context.stroke();
    }
  };
  
  // --- Mouse and Touch Event Handlers ---

let leftMouseDown = false;

const getTouchPos = (canvas, touchEvent) => {
  const rect = canvas.getBoundingClientRect();
  return {
    x: touchEvent.touches[0].clientX - rect.left,
    y: touchEvent.touches[0].clientY - rect.top
  };
};

canvas.addEventListener("mousedown", e => {
  if (e.button !== 0) return; // Only handle left-click.
  handleStart(e.offsetX, e.offsetY);
});

canvas.addEventListener("touchstart", e => {
  e.preventDefault();
  const touchPos = getTouchPos(canvas, e);
  handleStart(touchPos.x, touchPos.y);
});

const handleStart = (x, y) => {
  // In stamp mode with a saved stamp, paste it immediately.
  if (stampMode && brushStampData) {
    let pasteX = toTrueX(x) - stampDataWidth / 2;
    let pasteY = toTrueY(y) - stampDataHeight / 2;
    if (snapMode) {
      ({ x: pasteX, y: pasteY } = snapCoordinates(pasteX, pasteY));
    }
    brushStampData.forEach(item => {
      if (item.type === "line") {
        drawings.push({
          type: "line",
          x0: item.x0 + pasteX,
          y0: item.y0 + pasteY,
          x1: item.x1 + pasteX,
          y1: item.y1 + pasteY,
          color: item.color,
          size: item.size
        });
      }
    });
    window.whiteboardData[channel] = drawings;
    redrawCanvas();
    return; // Do not start a new drawing.
  }

  leftMouseDown = true;
  if (snapMode) ({ x, y } = snapCoordinates(x, y));
  cursorX = prevCursorX = x;
  cursorY = prevCursorY = y;

  // Begin a stamp selection if in stamp mode and no stamp is captured yet.
  if (stampMode && !brushStampData) {
    const trueX = toTrueX(x), trueY = toTrueY(y);
    stampArea = { x0: trueX, y0: trueY, x1: trueX, y1: trueY };
  }
};

canvas.addEventListener("mousemove", e => {
  handleMove(e.offsetX, e.offsetY);
});

canvas.addEventListener("touchmove", e => {
  e.preventDefault();
  const touchPos = getTouchPos(canvas, e);
  handleMove(touchPos.x, touchPos.y);
});

const handleMove = (x, y) => {
  if (snapMode) ({ x, y } = snapCoordinates(x, y));
  cursorX = x;
  cursorY = y;

  if (leftMouseDown) {
    if (panMode) {
      offsetX += (cursorX - prevCursorX) / scale;
      offsetY += (cursorY - prevCursorY) / scale;
      redrawCanvas();
      whiteboardPanZoomData[channel] = { offsetX, offsetY, scale };
    } else if (stampMode && !brushStampData && stampArea) {
      stampArea.x1 = toTrueX(x);
      stampArea.y1 = toTrueY(y);
      redrawCanvas();
    } else if (eraserMode) {
      // Instead of erasing only at the current point, sample several points
      // along the line from the previous to the current cursor positions
      // so that fast movements still “erase” continuously.
      const distance = Math.hypot(cursorX - prevCursorX, cursorY - prevCursorY);
      const samples = Math.max(Math.ceil(distance / (brushSize / 2)), 1);
      for (let i = 0; i <= samples; i++) {
        const t = i / samples;
        const sampleX = toTrueX(prevCursorX + (cursorX - prevCursorX) * t);
        const sampleY = toTrueY(prevCursorY + (cursorY - prevCursorY) * t);
        for (let j = drawings.length - 1; j >= 0; j--) {
          const d = drawings[j];
          if (d.type === "line" &&
              isNearLine(d.x0, d.y0, d.x1, d.y1, sampleX, sampleY, (brushSize / scale) * 2, d.size))
            drawings.splice(j, 1);
        }
      }
      window.whiteboardData[channel] = drawings;
      redrawCanvas();
    } else {
      // Normal drawing mode.
      const sx = toTrueX(cursorX), sy = toTrueY(cursorY),
            psx = toTrueX(prevCursorX), psy = toTrueY(prevCursorY);
      drawings.push({ 
        type: "line",
        x0: psx, y0: psy, 
        x1: sx, y1: sy, 
        color: brushColor, size: brushSize 
      });
      drawLine(prevCursorX, prevCursorY, cursorX, cursorY, brushColor, brushSize);
    }
  }
  prevCursorX = cursorX;
  prevCursorY = cursorY;
  drawCursorCircle();
};

canvas.addEventListener("mouseup", () => {
  leftMouseDown = false;
  if (stampMode && !brushStampData && stampArea) {
    drawStampArea();
  }
});

canvas.addEventListener("touchend", e => {
  e.preventDefault();
  leftMouseDown = false;
  if (stampMode && !brushStampData && stampArea) {
    drawStampArea();
  }
});

// --- Stamp Application ---
  
  // Utility: Check if a line is entirely inside the given rectangle.
  const isLineInsideRect = (line, left, top, right, bottom) =>
    (line.x0 >= left && line.x0 <= right &&
     line.y0 >= top  && line.y0 <= bottom &&
     line.x1 >= left && line.x1 <= right &&
     line.y1 >= top  && line.y1 <= bottom);
  
  // Extract vector data for lines inside the stamp area.
  const applyStamp = () => {
    if (!stampArea) return;
    const selLeft = Math.min(stampArea.x0, stampArea.x1),
          selRight = Math.max(stampArea.x0, stampArea.x1),
          selTop = Math.min(stampArea.y0, stampArea.y1),
          selBottom = Math.max(stampArea.y0, stampArea.y1);
    stampDataWidth = selRight - selLeft;
    stampDataHeight = selBottom - selTop;
    const stampVectorData = drawings.filter(item =>
      item.type === "line" && isLineInsideRect(item, selLeft, selTop, selRight, selBottom)
    );
    // Normalize the vector data relative to the selection's top-left.
    brushStampData = stampVectorData.map(item => ({
      type: "line",
      x0: item.x0 - selLeft,
      y0: item.y0 - selTop,
      x1: item.x1 - selLeft,
      y1: item.y1 - selTop,
      color: item.color,
      size: item.size
    }));
    
    stampArea = null;
    stampApplyButton.style.display = "none";
    redrawCanvas();
  };
  
  const stampApplyButton = el("button", {
    onclick: applyStamp,
    style: { display: "none" }
  }, "Apply Stamp");
  
  toolbar.appendChild(stampApplyButton);
  
  // --- Final Setup ---
  window.addEventListener("resize", redrawCanvas);
  redrawCanvas();
};

  
const renderCodeChannel = (container, channel) => {
  container.innerHTML = "";
  
  container.style.display = "flex";
  container.style.flexDirection = "column";
  
  const headerContainer = el("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    }
  });
  headerContainer.appendChild(el("h2", {}, "Code Runner"));
  
  const buttonContainer = el("div", { style: { display: "flex", flexWrap: "wrap" } });
  const saveBtn = el("button", {}, "Save");
  buttonContainer.appendChild(saveBtn);
  
  buttonContainer.appendChild(
    el("button", { onclick: () => {
      const funcCat = categories.find(c => c.name === "Functions");
      if (!funcCat?.channels?.length) return;
      const blob = new Blob(
        [JSON.stringify(funcCat.channels, null, 2)],
        { type: "application/json" }
      );
      el("a", {
        href: URL.createObjectURL(blob),
        download: "code_functions.json"
      }).click();
    } }, "Export")
  );
  buttonContainer.appendChild(
    el("button", { onclick: () => {
      const importInput = el("input", {
        type: "file",
        accept: "application/json",
        style: { display: "none" }
      });
      importInput.addEventListener("change", async e => {
        const file = e.target.files[0];
        if (!file) return;
        const fileObj = await readFile(file);
        try {
          const imported = JSON.parse(fileObj.content);
          if (Array.isArray(imported)) {
            let funcCat = categories.find(c => c.name === "Functions");
            if (!funcCat) { funcCat = { name: "Functions", channels: [] }; categories.push(funcCat); }
            imported.forEach(imp => {
              const idx = funcCat.channels.findIndex(
                ch => ch.name.toLowerCase() === imp.name.toLowerCase()
              );
              idx !== -1 ? funcCat.channels[idx] = imp : funcCat.channels.push(imp);
            });
            renderSidebar();
          }
        } catch {}
      });
      importInput.click();
    } }, "Import")
  );
  
  headerContainer.appendChild(buttonContainer);
  container.appendChild(headerContainer);

  const ioContainer = el("div", {
    class: "toolbar",
    style: {
      display: "flex",
      alignItems: "center"
    }
  });
  const functionNameInput = el("input", {
    type: "text",
    placeholder: "Function Name..",
    style: { flex: "1", minWidth: "80px" }
  });
  ioContainer.appendChild(functionNameInput);
  container.appendChild(ioContainer);

  const wrapper = el("div", {
    class: "code-runner-wrapper",
    style: {
      flex: "1",             
      position: "relative",
      display: "grid",
      gridTemplateRows: "1fr 100px", 
      overflow: "hidden"
    }
  });
  container.appendChild(wrapper);

  const runBtn = el("button", { class: "run-btn" }, "Run Code");
  wrapper.appendChild(runBtn);

  const codeArea = el("textarea", {
    class: "code-runner-textarea"
  });
  wrapper.appendChild(codeArea);
  if (window.codeData[channel.id])
    codeArea.value = window.codeData[channel.id];
  codeArea.addEventListener("input", () => window.codeData[channel.id] = codeArea.value);

  const outputDiv = el("div", {
    class: "code-runner-output"
  });
  wrapper.appendChild(outputDiv);

  runBtn.addEventListener("click", () => {
    const code = codeArea.value, logs = [];
    const origLog = console.log;
    console.log = (...args) => {
      logs.push(args.join(" "));
      origLog(...args);
    };
    try {
      const result = eval(code);
      outputDiv.textContent = logs.length ? logs.join("\n") : (result !== undefined ? result : "Code executed successfully.");
    } catch (err) {
      outputDiv.textContent = "Error: " + err;
    }
    console.log = origLog;
  });

  functionNameInput.addEventListener("input", () => {
    const funcCat = categories.find(c => c.name === "Functions");
    saveBtn.textContent = (funcCat &&
      funcCat.channels.find(ch => ch.name.toLowerCase() === functionNameInput.value.trim().toLowerCase()))
      ? "Update" : "Save";
  });

  saveBtn.addEventListener("click", () => {
    const code = codeArea.value;
    if (!code.trim()) return;
    let funcCat = categories.find(c => c.name === "Functions");
    if (!funcCat) {
      funcCat = { name: "Functions", channels: [] };
      categories.push(funcCat);
    }
    let name = functionNameInput.value.trim() || "Saved Function " + (funcCat.channels.length + 1);
    const idx = funcCat.channels.findIndex(ch => ch.name.toLowerCase() === name.toLowerCase());
    if (idx !== -1) funcCat.channels[idx].code = code;
    else {
      const id = "func_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
      funcCat.channels.push({ id, name, type: "function", code });
    }
    renderSidebar();
    functionNameInput.value = "";
    saveBtn.textContent = "Save";
  });
};

  
  const renderReminderChannel = (container, channel) => {
    container.innerHTML = "";
    container.appendChild(el("h2", {}, "Reminders"));
    const getContrastingTextColor = bg => {
      const parse = c => {
        c = c.trim().toLowerCase();
        if (c.startsWith('#')) {
          let hex = c.slice(1);
          if ([3, 4].includes(hex.length)) hex = hex.split('').map(ch => ch + ch).join('');
          return { r: parseInt(hex.substr(0, 2), 16), g: parseInt(hex.substr(2, 2), 16), b: parseInt(hex.substr(4, 2), 16) };
        }
        if (c.startsWith("rgb")) {
          const parts = c.match(/(\d+)/g) || [];
          return { r: +parts[0] || 0, g: +parts[1] || 0, b: +parts[2] || 0 };
        }
        return { r: 255, g: 255, b: 255 };
      };
      const { r, g, b } = parse(bg);
      const lum = (r, g, b) => { const f = c => (c /= 255) <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
      return lum(r, g, b) > 0.179 ? "#000000" : "#ffffff";
    };
    reminders[channel.id] = reminders[channel.id] || [];
    const listDiv = el("div");
    container.appendChild(listDiv);
    const renderReminders = () => {
      listDiv.innerHTML = "";
      reminders[channel.id].forEach((rem, idx) => {
        const remDiv = el("div", { class: "reminder-container", style: { backgroundColor: rem.color, color: getContrastingTextColor(rem.color), borderRadius: "4px" } });
        if (rem.date) remDiv.appendChild(el("div", {}, new Date(rem.date).toLocaleString()));
        remDiv.appendChild(el("div", {}, rem.text));
        remDiv.appendChild(el("button", { class: "remove-btn", onclick: () => { reminders[channel.id].splice(idx, 1); renderReminders(); } }, "Remove"));
        listDiv.appendChild(remDiv);
      });
    };
    renderReminders();
    const form = el("form", { onsubmit: e => {
      e.preventDefault();
      reminders[channel.id].push({ date: dateInput.value || null, text: textInput.value, color: colorInput.value });
      dateInput.value = ""; textInput.value = ""; renderReminders();
    }, style: { display: "flex", flexWrap: "wrap", alignItems: "center" } });
    
    const dateInput = el("input", { type: "datetime-local" });
    const textInput = el("input", { type: "text", placeholder: "Reminder text", required: true });
    const colorInput = el("input", { type: "color", value: "#007bff" });
    form.append(dateInput, textInput, colorInput, el("button", { type: "submit" }, "Add Reminder"));
    container.appendChild(form);
  };

  const renderCryptChannel = (container, channel) => {
    container.innerHTML = "";
    container.appendChild(el("h2", {}, "Crypt Channel"));
  
    const formDiv = el("div", {
      class: "crypt-container",
      style: { display: "flex", flexDirection: "column" }
    });
  
    const textAreaRow = el("div", {
      style: { display: "flex", justifyContent: "space-between", flexWrap: "wrap" }
    });
  
    // Message section
    const messageWrapper = el("div", { style: { flex: "1", marginRight: "5px" } });
    const messageInput = el("textarea", {
      placeholder: "Enter your message here",
      rows: "12",
      class: "code-runner-textarea"
    });
    
    // Copy Message button
    const copyMessageBtn = el("button", {
      onclick: () => {
        navigator.clipboard.writeText(messageInput.value);
      }
    }, "Copy Message");
  
    // Attach File button
    const attachFileBtn = el("button", {
      onclick: () => {
        fileInput.click();
      }
    }, "Attach File");
  
    // Hidden file input element
    const fileInput = el("input", { type: "file", style: { display: "none" } });
    fileInput.addEventListener("change", function() {
      if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = function(e) {
          messageInput.value = e.target.result;
        };
        reader.readAsText(file);
      }
    });
  
    messageWrapper.appendChild(messageInput);
    // Create a container for the message buttons below the textarea
    const messageButtonContainer = el("div", {
      style: { display: "flex", justifyContent: "space-between" }
    });
    messageButtonContainer.appendChild(attachFileBtn);
    messageButtonContainer.appendChild(copyMessageBtn);
    messageWrapper.appendChild(messageButtonContainer);
    messageWrapper.appendChild(fileInput);
    textAreaRow.appendChild(messageWrapper);
  
    // Result section
    const resultWrapper = el("div", { style: { flex: "1", marginLeft: "5px" } });
    const resultOutput = el("textarea", {
      placeholder: "The result will appear here",
      disabled: true,
      rows: "12",
      class: "code-runner-textarea"
    });
    
    // Copy Result button
    const copyResultBtn = el("button", {
      onclick: () => {
        navigator.clipboard.writeText(resultOutput.value);
      }
    }, "Copy Result");
  
    // Download button
    const downloadBtn = el("button", {
      onclick: () => {
        const blob = new Blob([resultOutput.value], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "result.txt";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    }, "Download");
  
    resultWrapper.appendChild(resultOutput);
    // Create a container for the result buttons below the textarea
    const resultButtonContainer = el("div", {
      style: { display: "flex", justifyContent: "space-between" }
    });
    resultButtonContainer.appendChild(downloadBtn);
    resultButtonContainer.appendChild(copyResultBtn);
    resultWrapper.appendChild(resultButtonContainer);
    textAreaRow.appendChild(resultWrapper);
  
    formDiv.appendChild(textAreaRow);
  
    const actionRow = el("div", {
      style: { display: "flex", alignItems: "center", flexWrap: "wrap" }
    });
  
    const sliderLabel = el("label", {}, "Password Length: ");
    const slider = el("input", {
      type: "range",
      min: "6",
      max: "200",
      value: "12",
      oninput: (e) => {
        passwordLengthDisplay.textContent = e.target.value;
      }
    });
    const passwordLengthDisplay = el("span", {}, slider.value);
    sliderLabel.appendChild(slider);
    sliderLabel.appendChild(passwordLengthDisplay);
    actionRow.appendChild(sliderLabel);
  
    const generateBtn = el("button", {
      onclick: () => {
        const length = parseInt(slider.value, 10);
        keyInput.value = generateRandomPassword(length);
      }
    }, "Generate");
  
    const encryptBtn = el("button", {
      onclick: async () => {
        if (!keyInput.value) {
          alert("Please enter an encryption key.");
          return;
        }
        try {
          resultOutput.value = await encryptMessage(messageInput.value, keyInput.value);
        } catch (e) {
          alert("Encryption failed: " + e.message);
        }
      }
    }, "Encrypt");
  
    const decryptBtn = el("button", {
      onclick: async () => {
        if (!keyInput.value) {
          alert("Please enter an encryption key.");
          return;
        }
        try {
          resultOutput.value = await decryptMessage(messageInput.value, keyInput.value);
        } catch (e) {
          alert("Decryption failed. Make sure the input is valid. " + e.message);
        }
      }
    }, "Decrypt");
  
    actionRow.appendChild(generateBtn);
    actionRow.appendChild(encryptBtn);
    actionRow.appendChild(decryptBtn);
    formDiv.appendChild(actionRow);
  
    const keyWrapper = el("div", { style: { display: "flex", alignItems: "center" } });
    const keyInput = el("input", {
      type: "text",
      placeholder: "Enter encryption key",
      class: "code-runner-textarea",
      style: { flex: "1" }
    });
    const copyKeyBtn = el("button", {
      onclick: () => {
        navigator.clipboard.writeText(keyInput.value);
      }
    }, "Copy Key");
    keyWrapper.appendChild(keyInput);
    keyWrapper.appendChild(copyKeyBtn);
    formDiv.appendChild(keyWrapper);
  
    container.appendChild(formDiv);
  
    // Helper functions for conversion and crypto operations
    function uint8ArrayToHex(uint8array) {
      return Array.from(uint8array)
        .map(b => ("0" + b.toString(16)).slice(-2))
        .join("");
    }
  
    function hexToUint8Array(hex) {
      let length = hex.length / 2;
      let result = new Uint8Array(length);
      for (let i = 0; i < length; i++) {
        result[i] = parseInt(hex.substr(i * 2, 2), 16);
      }
      return result;
    }
  
    function concatUint8Arrays(arrays) {
      let totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
      let result = new Uint8Array(totalLength);
      let offset = 0;
      arrays.forEach(arr => {
        result.set(arr, offset);
        offset += arr.length;
      });
      return result;
    }
  
    async function getKeystream(keyBuffer, iv, length) {
      const keystream = new Uint8Array(length);
      let counter = 0;
      let offset = 0;
      while (offset < length) {
        const counterBytes = new Uint8Array(4);
        new DataView(counterBytes.buffer).setUint32(0, counter, false);
        const combined = concatUint8Arrays([keyBuffer, iv, counterBytes]);
        const hashBuffer = await crypto.subtle.digest("SHA-256", combined);
        const hashArray = new Uint8Array(hashBuffer);
        const bytesToCopy = Math.min(hashArray.length, length - offset);
        keystream.set(hashArray.slice(0, bytesToCopy), offset);
        offset += bytesToCopy;
        counter++;
      }
      return keystream;
    }
  
    async function encryptMessage(message, key) {
      const encoder = new TextEncoder();
      const messageBuffer = encoder.encode(message);
      const keyBuffer = encoder.encode(key);
      const iv = new Uint8Array(16);
      crypto.getRandomValues(iv);
      const keystream = await getKeystream(keyBuffer, iv, messageBuffer.length);
      const encryptedBuffer = new Uint8Array(messageBuffer.length);
      for (let i = 0; i < messageBuffer.length; i++) {
        encryptedBuffer[i] = messageBuffer[i] ^ keystream[i];
      }
      return uint8ArrayToHex(iv) + ":" + uint8ArrayToHex(encryptedBuffer);
    }
  
    async function decryptMessage(encrypted, key) {
      const [ivHex, cipherHex] = encrypted.split(":");
      if (!ivHex || !cipherHex) throw new Error("Invalid encrypted message format");
      const iv = hexToUint8Array(ivHex);
      const encryptedBuffer = hexToUint8Array(cipherHex);
      const encoder = new TextEncoder();
      const keyBuffer = encoder.encode(key);
      const keystream = await getKeystream(keyBuffer, iv, encryptedBuffer.length);
      const decryptedBuffer = new Uint8Array(encryptedBuffer.length);
      for (let i = 0; i < encryptedBuffer.length; i++) {
        decryptedBuffer[i] = encryptedBuffer[i] ^ keystream[i];
      }
      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    }
  
    const generateRandomPassword = (length) => {
      const chars =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ¡¢£¤¥¦§¨©«®¯°±²³´µ¶·¸¹º¼½¾¿€©®™×÷ƒ∑∆∂∞≈≠≡≤≥⊂⊃∈∉√π∞∩∪⊥∧∨∩≈⊕⊗∫";
      let result = "";
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };
  };
  

  document.addEventListener("DOMContentLoaded", () => {
    renderSidebar();
    if (categories.length && categories[0].channels.length)
      selectChannel(categories[0].channels[0]);
  });
})();