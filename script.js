;(() => {
  const el = (e, t = {}, ...n) => {
      const a = document.createElement(e)
      for (let [e, n] of Object.entries(t))
        'class' === e
          ? (a.className = n)
          : 'style' === e
          ? Object.assign(a.style, n)
          : e.startsWith('on') && 'function' == typeof n
          ? a.addEventListener(e.slice(2).toLowerCase(), n)
          : (a[e] = n)
      return (
        n.forEach(e => {
          'string' == typeof e
            ? a.appendChild(document.createTextNode(e))
            : e && a.appendChild(e)
        }),
        a
      )
    },
    categories = [
      {
        name: 'General',
        channels: [{ id: 'text1', name: 'General Chat', type: 'text' }]
      },
      {
        name: 'Learning',
        channels: [
          { id: 'flashcard1', name: 'Flashcards', type: 'flashcard' },
          { id: 'whiteboard1', name: 'Whiteboard', type: 'whiteboard' }
        ]
      },
      {
        name: 'Reminders',
        channels: [{ id: 'reminder1', name: 'Reminders', type: 'reminder' }]
      },
      {
        name: 'Utilities',
        channels: [
          { id: 'code1', name: 'Code Runner', type: 'code' },
          { id: 'crypt1', name: 'Crypt', type: 'crypt' }
        ]
      },
      {
        name: 'Settings',
        channels: [{ id: 'settings', name: 'Settings', type: 'settings' }]
      }
    ],
    chatMessages = {},
    flashcards = {},
    reminders = {}
  ;(window.whiteboardData = window.whiteboardData || {}),
    (window.codeData = window.codeData || {})
  const readFile = e =>
      new Promise(t => {
        const n = new FileReader()
        ;(n.onload = n =>
          t({ name: e.name, type: e.type, content: n.target.result })),
          e.type.startsWith('image/') || e.type.startsWith('audio/')
            ? n.readAsDataURL(e)
            : n.readAsText(e)
      }),
    renderSidebar = () => {
      const e = document.querySelector('.topbar')
      ;(e.innerHTML = ''),
        categories.forEach(t => {
          const n = el('div', {
              style: { display: 'flex', alignItems: 'center', gap: '0.5rem' }
            }),
            a = el('div', { class: 'channel-list' })
          t.channels.forEach(e => {
            const t = el(
              'div',
              {
                class: 'channel-item',
                'data-channel-id': e.id,
                'data-channel-type': e.type,
                oncontextmenu: n => {
                  if ((n.preventDefault(), 'function' === e.type)) {
                    t.textContent
                    t.classList.add('remove-btn'), (t.title = 'Click to remove')
                    const n = a => {
                        a.stopPropagation()
                        const l = categories.find(e => 'Functions' === e.name)
                        l &&
                          ((l.channels = l.channels.filter(t => t.id !== e.id)),
                          renderSidebar()),
                          t.removeEventListener('click', n)
                      },
                      a = e => {
                        e.target !== t &&
                          (t.classList.remove('remove-btn'),
                          (t.title = ''),
                          t.removeEventListener('click', n),
                          document.removeEventListener('click', a))
                      }
                    t.addEventListener('click', n),
                      document.addEventListener('click', a)
                  }
                },
                onclick: () => {
                  if ('function' === e.type) {
                    const t = categories
                      .flatMap(e => e.channels)
                      .find(e => 'code' === e.type)
                    t && ((window.codeData[t.id] = e.code), selectChannel(t))
                  } else selectChannel(e)
                }
              },
              e.name
            )
            a.appendChild(t)
          }),
            n.appendChild(a),
            e.appendChild(n)
        }),
        e.appendChild(
          el(
            'div',
            {
              class: 'version-text',
              style: { marginLeft: 'auto', padding: '0 1rem' }
            },
            'v1.25'
          )
        )
    }
  let activeChannelId = null
  const selectChannel = e => {
      ;(activeChannelId = e.id),
        document
          .querySelectorAll('.channel-item')
          .forEach(t =>
            t.classList.toggle(
              'active-channel',
              t.getAttribute('data-channel-id') === e.id
            )
          ),
        renderChannel(e)
    },
    renderChannel = e => {
      const t = document.querySelector('.main-content')
      ;(t.innerHTML = ''),
        (
          {
            text: () => renderTextChannel(t, e),
            flashcard: () => renderFlashcardChannel(t, e),
            whiteboard: () => renderWhiteboardChannel(t, e),
            code: () => renderCodeChannel(t, e),
            reminder: () => renderReminderChannel(t, e),
            crypt: () => renderCryptChannel(t, e),
            settings: () => renderSettingsChannel(t, e)
          }[e.type] || (() => {})
        )()
    },
    renderTextChannel = (e, t) => {
      const n = el('div', { class: 'chat-container', style: { height: '90%' } })
      e.appendChild(n)
      el('div', {
        class: 'flashcard-toolbar',
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }
      })
      const a = el('div', { class: 'messages-area' })
      n.appendChild(a)
      const l = () => {
          a.innerHTML = ''
          const e = document.createDocumentFragment()
          ;(chatMessages[t.id] || []).forEach((n, a) => {
            const i = el('div', { class: 'message-container' })
            i.appendChild(el('div', { class: 'message-date' }, n.date))
            const s = el('div', { class: 'message-content' }),
              r = el('span')
            if (
              (n.text.split(/(https?:\/\/\S+|www\.\S+)/gi).forEach((e, t) => {
                if (e)
                  if (t % 2) {
                    let t = /^www\./i.test(e) ? 'http://' + e : e
                    try {
                      new URL(t),
                        r.appendChild(
                          el(
                            'a',
                            {
                              href: t,
                              target: '_blank',
                              rel: 'noopener noreferrer'
                            },
                            e
                          )
                        )
                    } catch {
                      r.appendChild(document.createTextNode(e))
                    }
                  } else {
                    e.split('\n')
                      .map((e, t, n) => {
                        const a = document.createTextNode(e)
                        return t < n.length - 1 ? [a, el('br')] : a
                      })
                      .flat()
                      .forEach(e => r.appendChild(e))
                  }
              }),
              s.appendChild(r),
              n.files?.length)
            ) {
              const e = el('div')
              n.files.forEach(t => {
                const n = el('div', { style: { position: 'relative' } })
                if (t.type.startsWith('image/')) {
                  const e = el('img', {
                    src: t.content,
                    style: { maxWidth: '200px', cursor: 'pointer' }
                  })
                  e.addEventListener('click', () => o(t.content)),
                    n.appendChild(e)
                } else
                  t.type.startsWith('audio/')
                    ? n.appendChild(
                        el('audio', { src: t.content, controls: !0 })
                      )
                    : t.type.startsWith('text/') || !t.type
                    ? n.appendChild(
                        el(
                          'pre',
                          { style: { maxHeight: '150px', overflow: 'auto' } },
                          t.content
                        )
                      )
                    : (n.textContent = t.name)
                n.appendChild(
                  el(
                    'button',
                    {
                      class: 'download-btn',
                      onclick: () => {
                        const e = el('a')
                        if (
                          t.type.startsWith('image/') ||
                          t.type.startsWith('audio/')
                        )
                          e.href = t.content
                        else {
                          const n = new Blob([t.content], {
                            type: t.type || 'text/plain'
                          })
                          e.href = URL.createObjectURL(n)
                        }
                        ;(e.download = t.name), e.click()
                      }
                    },
                    'Download'
                  )
                ),
                  e.appendChild(n)
              }),
                s.appendChild(e)
            }
            i.appendChild(s)
            const d = el('div', { class: 'message-toolbar' })
            d.appendChild(
              el(
                'button',
                {
                  class: 'edit-btn',
                  onclick: () => {
                    const e = el('form'),
                      t = n.text.split('\n').length,
                      a = el('textarea', {
                        class: 'message-edited',
                        rows: t,
                        value: n.text
                      })
                    e.appendChild(a)
                    let s = n.files.slice()
                    const r = el('div'),
                      d = () => {
                        ;(r.innerHTML = ''),
                          s.forEach((e, t) => {
                            const n = el('div', {
                              style: { position: 'relative' }
                            })
                            if (e.type.startsWith('image/')) {
                              const t = el('img', {
                                src: e.content,
                                style: { maxWidth: '200px', cursor: 'pointer' }
                              })
                              t.addEventListener('click', () => o(e.content)),
                                n.appendChild(t)
                            } else
                              e.type.startsWith('audio/')
                                ? n.appendChild(
                                    el('audio', {
                                      src: e.content,
                                      controls: !0
                                    })
                                  )
                                : e.type.startsWith('text/') || !e.type
                                ? n.appendChild(
                                    el(
                                      'pre',
                                      {
                                        style: {
                                          maxHeight: '150px',
                                          overflow: 'auto'
                                        }
                                      },
                                      e.content
                                    )
                                  )
                                : (n.textContent = e.name)
                            n.appendChild(
                              el(
                                'button',
                                {
                                  type: 'button',
                                  class: 'remove-btn',
                                  style: {
                                    position: 'absolute',
                                    top: '0px',
                                    right: '0px'
                                  },
                                  onclick: () => {
                                    s.splice(t, 1), d()
                                  }
                                },
                                'Remove'
                              )
                            ),
                              r.appendChild(n)
                          })
                      }
                    d(), e.appendChild(r)
                    const c = el('input', {
                        type: 'file',
                        multiple: !0,
                        style: { display: 'none' }
                      }),
                      p = el(
                        'button',
                        {
                          type: 'button',
                          onclick: e => {
                            e.preventDefault(), c.click()
                          }
                        },
                        'Attach File'
                      )
                    e.appendChild(p),
                      e.appendChild(c),
                      c.addEventListener('change', async () => {
                        for (const e of c.files) s.push(await readFile(e))
                        d(), (c.value = '')
                      })
                    const h = el('button', { type: 'submit' }, 'Save'),
                      u = el('button', { type: 'button', onclick: l }, 'Cancel')
                    e.append(h, u)
                    const y = i.querySelector('.message-content')
                    ;(y.innerHTML = ''),
                      y.appendChild(e),
                      e.addEventListener('submit', e => {
                        e.preventDefault(),
                          (n.text = a.value),
                          (n.files = s),
                          l()
                      })
                  }
                },
                'Edit'
              )
            ),
              d.appendChild(
                el(
                  'button',
                  {
                    class: 'remove-btn',
                    onclick: () => {
                      chatMessages[t.id].splice(a, 1), l()
                    }
                  },
                  'Remove'
                )
              ),
              i.appendChild(d),
              e.appendChild(i)
          }),
            a.appendChild(e)
        },
        o = e => {
          const t = el('div', { class: 'image-overlay' }),
            n = el('img', { src: e })
          t.appendChild(n),
            t.addEventListener('click', e => {
              e.target === t &&
                (t.classList.remove('show'), setTimeout(() => t.remove(), 100))
            }),
            document.body.appendChild(t),
            setTimeout(() => t.classList.add('show'), 0)
        }
      ;(chatMessages[t.id] = chatMessages[t.id] || []), l()
      const i = el('div', {
        style: { display: 'flex', flexWrap: 'wrap', marginLeft: 'auto' }
      })
      i.appendChild(
        el(
          'button',
          {
            type: 'button',
            onclick: () => {
              const e = chatMessages[t.id] || [],
                n = new Blob([JSON.stringify(e, null, 2)], {
                  type: 'application/json'
                })
              el('a', {
                href: URL.createObjectURL(n),
                download: 'chat.json'
              }).click()
            }
          },
          'Export'
        )
      )
      const s = el('input', {
        type: 'file',
        accept: 'application/json',
        style: { display: 'none' },
        onchange: async e => {
          const n = e.target.files[0]
          if (!n) return
          const a = await readFile(n)
          try {
            const e = JSON.parse(a.content)
            Array.isArray(e) &&
              ((chatMessages[t.id] = chatMessages[t.id] || []),
              e.forEach(e => {
                e.id || (e.id = Date.now() + Math.random())
                const n = chatMessages[t.id].findIndex(t => t.id === e.id)
                ;-1 !== n
                  ? (chatMessages[t.id][n] = e)
                  : chatMessages[t.id].push(e)
              }),
              l())
          } catch (e) {}
        }
      })
      s.addEventListener('click', () => {
        s.value = ''
      }),
        i.appendChild(s),
        i.appendChild(
          el('button', { type: 'button', onclick: () => s.click() }, 'Import')
        ),
        n.insertBefore(i, a)
      const r = el('div', { style: { display: 'flex', overflowX: 'auto' } })
      n.appendChild(r)
      const d = el('div', { class: 'toolbar' }),
        c = el('textarea', {
          rows: '1',
          placeholder: 'Type a message...',
          style: {
            flex: '1',
            minWidth: '100px',
            maxWidth: 'calc(100% - 120px)'
          },
          onkeydown: e => {
            'Enter' !== e.key ||
              e.shiftKey ||
              e.isComposing ||
              (e.preventDefault(),
              y.dispatchEvent(new Event('submit', { cancelable: !0 })))
          }
        })
      d.appendChild(c)
      const p = el('input', {
        type: 'file',
        multiple: !0,
        style: { display: 'none' }
      })
      d.appendChild(
        el(
          'button',
          { type: 'button', onclick: () => p.click() },
          'Attach File'
        )
      ),
        d.appendChild(p),
        d.appendChild(el('button', { type: 'submit' }, 'Send')),
        n.appendChild(d)
      let h = []
      const u = () => {
        ;(r.innerHTML = ''),
          h.forEach((e, t) => {
            const n = el('div', { class: 'file-item' }, e.name)
            n.appendChild(
              el(
                'button',
                {
                  class: 'remove-btn',
                  onclick: () => {
                    h.splice(t, 1), u()
                  }
                },
                'Remove'
              )
            ),
              r.appendChild(n)
          })
      }
      p.addEventListener('change', async () => {
        for (const e of p.files) h.push(await readFile(e))
        u(), (p.value = '')
      })
      const y = el('form', {
        onsubmit: e => {
          e.preventDefault()
          const n = c.value
          ;(('string' == typeof n && '' !== n.trim()) || h.length) &&
            (chatMessages[t.id].push({
              id: Date.now() + '_' + Math.random().toString(36).substring(2, 9),
              date: new Date().toLocaleString(),
              text: n,
              files: h
            }),
            l(),
            (c.value = ''),
            (h = []),
            u(),
            (a.scrollTop = a.scrollHeight))
        }
      })
      y.appendChild(r), y.appendChild(d), n.appendChild(y)
    },
    renderFlashcardChannel = (e, t) => {
      e.innerHTML = ''
      const n = el('div', {
          class: 'flashcard-toolbar',
          style: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }
        }),
        a = el('div', {
          style: { display: 'flex', flexWrap: 'wrap', marginLeft: 'auto' }
        })
      a.appendChild(
        el(
          'button',
          {
            type: 'button',
            onclick: () => {
              const e = flashcards[t.id] || [],
                n = new Blob([JSON.stringify(e, null, 2)], {
                  type: 'application/json'
                })
              el('a', {
                href: URL.createObjectURL(n),
                download: 'flashcards.json'
              }).click()
            }
          },
          'Export'
        )
      )
      const l = el('input', {
        type: 'file',
        accept: 'application/json',
        style: { display: 'none' },
        onchange: async e => {
          const n = e.target.files[0]
          if (!n) return
          const a = await readFile(n)
          try {
            const e = JSON.parse(a.content)
            Array.isArray(e) &&
              ((flashcards[t.id] = flashcards[t.id] || []),
              e.forEach(e => {
                const n = flashcards[t.id].findIndex(
                  t => t.question === e.question
                )
                ;-1 !== n ? (flashcards[t.id][n] = e) : flashcards[t.id].push(e)
              }),
              y())
          } catch {}
        }
      })
      l.addEventListener('click', () => {
        l.value = ''
      }),
        a.appendChild(l),
        a.appendChild(
          el('button', { type: 'button', onclick: () => l.click() }, 'Import')
        ),
        n.appendChild(a),
        e.appendChild(n)
      const o = el('div'),
        i = el('div'),
        s = el('form', {
          class: 'flashcard-form',
          onsubmit: e => {
            e.preventDefault()
            const n = r.value.trim()
            if (!n) return
            const a = Array.from(d.querySelectorAll('.answer-row'))
              .map(e => {
                const [t, n] = e.querySelectorAll('input')
                return n.value.trim()
                  ? { text: n.value, correct: t.checked }
                  : null
              })
              .filter(e => e)
            a.length &&
              ((flashcards[t.id] = flashcards[t.id] || []),
              flashcards[t.id].push({ question: n, answers: a }),
              (r.value = ''),
              (d.innerHTML = ''),
              c(),
              y())
          }
        }),
        r = el('input', {
          type: 'text',
          placeholder: 'Enter question here',
          required: !0,
          style: { flex: '1' }
        })
      s.appendChild(r)
      const d = el('div', { id: 'answers-container' })
      s.appendChild(d)
      const c = (e = '', t = !1) => {
        const n = el('div', {
          class: 'answer-row',
          style: { display: 'flex', alignItems: 'center' }
        })
        n.appendChild(
          el('input', {
            type: 'checkbox',
            title: 'Mark as correct answer',
            checked: t
          })
        ),
          n.appendChild(
            el('input', {
              type: 'text',
              placeholder: 'Answer',
              required: !0,
              value: e,
              style: { flex: '1' }
            })
          ),
          n.appendChild(
            el(
              'button',
              {
                type: 'button',
                class: 'remove-btn',
                onclick: () => n.remove()
              },
              'Remove'
            )
          ),
          d.appendChild(n)
      }
      c(),
        s.appendChild(
          el('button', { type: 'button', onclick: () => c() }, 'Add Answer')
        ),
        s.appendChild(el('button', { type: 'submit' }, 'Add Flashcard'))
      const p = el('button', { type: 'button' }, 'Start Test')
      s.appendChild(p), i.appendChild(s)
      const h = el('div')
      i.appendChild(h)
      const u = el('div', { style: { display: 'none' } })
      o.append(i, u), e.appendChild(o)
      const y = () => {
        ;(h.innerHTML = ''),
          (flashcards[t.id] = flashcards[t.id] || []).forEach((e, n) => {
            const a = el('div', { class: 'flashcard' }),
              l = el('p', {}, 'Q: ' + e.question)
            a.appendChild(l)
            const o = el('div')
            e.answers.forEach(e => {
              const t = el('div', {
                  style: { display: 'flex', alignItems: 'center' }
                }),
                n = el('input', {
                  type: 'checkbox',
                  checked: e.correct,
                  disabled: !0
                })
              t.appendChild(n),
                t.appendChild(document.createTextNode(e.text)),
                o.appendChild(t)
            }),
              a.appendChild(o)
            const i = el('div', { class: 'toolbar' }),
              s = el(
                'button',
                {
                  type: 'button',
                  onclick: function () {
                    if ('Edit' === this.textContent) {
                      const t = el('input', {
                        type: 'text',
                        value: e.question,
                        style: { width: '100%' }
                      })
                      a.replaceChild(t, l)
                      const n = el('div')
                      e.answers.forEach(e => {
                        const t = el('div', {
                          class: 'answer-row',
                          style: { display: 'flex', alignItems: 'center' }
                        })
                        t.appendChild(
                          el('input', { type: 'checkbox', checked: e.correct })
                        ),
                          t.appendChild(
                            el('input', {
                              type: 'text',
                              value: e.text,
                              style: { flex: '1' }
                            })
                          ),
                          n.appendChild(t)
                      }),
                        a.replaceChild(n, o)
                      const s = el(
                        'button',
                        {
                          type: 'button',
                          onclick: () => {
                            const e = el('div', {
                              class: 'answer-row',
                              style: { display: 'flex', alignItems: 'center' }
                            })
                            e.appendChild(el('input', { type: 'checkbox' })),
                              e.appendChild(
                                el('input', {
                                  type: 'text',
                                  placeholder: 'New answer',
                                  style: { flex: '1' }
                                })
                              ),
                              n.appendChild(e)
                          }
                        },
                        'Add Answer'
                      )
                      i.insertBefore(s, this.nextSibling),
                        (this.textContent = 'Save')
                    } else {
                      const t = a.querySelector("input[type='text']")
                      e.question = t.value
                      const n = []
                      a.querySelectorAll('.answer-row').forEach(e => {
                        const [t, a] = e.querySelectorAll('input')
                        a.value.trim() &&
                          n.push({ text: a.value, correct: t.checked })
                      }),
                        (e.answers = n)
                      const l = i.querySelector('button:nth-child(3)')
                      l && 'Add Answer' === l.textContent && i.removeChild(l),
                        y()
                    }
                  }
                },
                'Edit'
              )
            i.appendChild(s),
              i.appendChild(
                el(
                  'button',
                  {
                    type: 'button',
                    class: 'remove-btn',
                    onclick: () => {
                      flashcards[t.id].splice(n, 1), y()
                    }
                  },
                  'Remove'
                )
              ),
              a.appendChild(i),
              h.appendChild(a)
          }),
          (p.disabled = !flashcards[t.id]?.length)
      }
      y(),
        p.addEventListener('click', () => {
          ;(i.style.display = 'none'), f(u, t), (u.style.display = 'block')
        })
      const f = (e, t) => {
        e.innerHTML = ''
        const n = [...(flashcards[t.id] || [])].sort(() => Math.random() - 0.5)
        if (!n.length)
          return void (e.textContent = 'No flashcards available for testing.')
        const a = n.map(e => {
            const t = e.answers.slice()
            for (let e = t.length - 1; e > 0; e--) {
              const n = Math.floor(Math.random() * (e + 1))
              ;[t[e], t[n]] = [t[n], t[e]]
            }
            return { question: e.question, answers: t }
          }),
          l = el('form', {
            onsubmit: e => {
              e.preventDefault()
              let t = 0
              a.forEach((e, n) => {
                const a = Array.from(
                    l.querySelectorAll(`input[name="card${n}"]:checked`)
                  ).map(e => +e.value),
                  o = e.answers
                    .map((e, t) => (e.correct ? t : null))
                    .filter(e => null !== e)
                a.sort().toString() === o.sort().toString() && t++,
                  l.querySelectorAll(`input[name="card${n}"]`).forEach(e => {
                    const t = +e.value
                    o.includes(t)
                      ? e.parentElement.classList.add('correct-highlight')
                      : e.checked &&
                        e.parentElement.classList.add('incorrect-highlight'),
                      (e.disabled = !0)
                  })
              }),
                (l.querySelector("button[type='submit']").disabled = !0),
                l.appendChild(el('div', {}, `Your score: ${t} / ${a.length}`))
            }
          })
        a.forEach((e, t) => {
          const n = el('div')
          n.appendChild(el('p', {}, 'Q: ' + e.question)),
            e.answers.forEach((e, a) => {
              const l = el('label', {
                style: { display: 'flex', alignItems: 'center' }
              })
              l.appendChild(
                el('input', { type: 'checkbox', name: `card${t}`, value: a })
              ),
                l.append(e.text),
                n.appendChild(l)
            }),
            l.appendChild(n)
        }),
          l.appendChild(el('button', { type: 'submit' }, 'Submit Answers')),
          l.appendChild(
            el(
              'button',
              {
                type: 'button',
                onclick: () => {
                  ;(e.style.display = 'none'), (i.style.display = 'block')
                }
              },
              'Back'
            )
          ),
          e.appendChild(l)
      }
    },
    renderWhiteboardChannel = (e, t) => {
      ;(e.innerHTML = ''),
        Object.assign(e.style, { display: 'flex', flexDirection: 'column' })
      const n = el('div', {
          style: { display: 'flex', flexDirection: 'column' }
        }),
        a = 30,
        l = '#6e6e6e',
        o = (e, t) => {
          let n = (E * S) % a,
            l = (D * S) % a
          return (
            n < 0 && (n += a),
            l < 0 && (l += a),
            {
              x: n + Math.round((e - n) / a) * a,
              y: l + Math.round((t - l) / a) * a
            }
          )
        },
        i = (e, t, n, a, l, o, i, s) => {
          const r = n - e,
            d = a - t,
            c = r * r + d * d
          let p,
            h,
            u = 0 !== c ? ((l - e) * r + (o - t) * d) / c : -1
          u < 0
            ? ((p = e), (h = t))
            : u > 1
            ? ((p = n), (h = a))
            : ((p = e + u * r), (h = t + u * d))
          const y = l - p,
            f = o - h
          return Math.sqrt(y * y + f * f) <= i + s / 2
        },
        s = e =>
          el(
            'button',
            {
              onclick: () => {
                const n = w.width / 2,
                  a = w.height / 2,
                  l = e ? 2 * S : S / 4
                ;(E += n * (1 / l - 1 / S)),
                  (D += a * (1 / l - 1 / S)),
                  (S = l),
                  z(),
                  (whiteboardPanZoomData[t] = {
                    offsetX: E,
                    offsetY: D,
                    scale: S
                  })
              }
            },
            e ? 'Zoom In' : 'Zoom Out'
          ),
        r = el('div', { class: 'toolbar', style: { display: 'flex' } }),
        d = el('input', {
          type: 'color',
          value: '#ffffff',
          onchange: e => {
            ;(T = e.target.value),
              (j = !1),
              (p.style.backgroundColor = ''),
              (F = !1),
              (h.style.backgroundColor = ''),
              (q = !1),
              (m.style.backgroundColor = '')
          }
        }),
        c = el('input', {
          type: 'range',
          min: '1',
          max: '20',
          value: '1',
          onchange: e => {
            ;(R = +e.target.value), J()
          }
        }),
        p = el(
          'button',
          {
            onclick: () => {
              ;(j = !j),
                (F = !1),
                (h.style.backgroundColor = ''),
                (q = !1),
                (m.style.backgroundColor = ''),
                (p.style.backgroundColor = j ? '#ff0000' : '')
            }
          },
          'Eraser'
        ),
        h = el(
          'button',
          {
            onclick: () => {
              ;(F = !F),
                (j = !1),
                (p.style.backgroundColor = ''),
                (q = !1),
                (m.style.backgroundColor = ''),
                (h.style.backgroundColor = F ? 'var(--color-accent)' : ''),
                z()
            }
          },
          'Pan'
        ),
        u = s(!0),
        y = s(!1),
        f = el(
          'button',
          {
            onclick: () => {
              ;(W = !W),
                (f.style.backgroundColor = W ? 'var(--color-accent)' : '')
            }
          },
          'Snap'
        ),
        m = el(
          'button',
          {
            onclick: () => {
              ;(q = !q),
                (j = !1),
                (p.style.backgroundColor = ''),
                (F = !1),
                (h.style.backgroundColor = ''),
                (m.style.backgroundColor = q ? 'var(--color-accent)' : ''),
                q
                  ? ((w.style.cursor = 'crosshair'),
                    (b.disabled = !1),
                    (v.disabled = !1))
                  : ((w.style.cursor = 'none'),
                    (b.disabled = !0),
                    (v.disabled = !0),
                    (N = null),
                    (O = null),
                    z())
            }
          },
          'Select'
        ),
        g = (e = !1) => {
          if (!O) return
          const n = Math.min(O.x0, O.x1),
            a = Math.max(O.x0, O.x1),
            l = Math.min(O.y0, O.y1),
            o = Math.max(O.y0, O.y1)
          ;(U = a - n), (B = o - l)
          const i = [],
            s = []
          for (let t = 0; t < k.length; t++) {
            const r = k[t]
            'line' === r.type &&
              ee(r, n, l, a, o) &&
              (i.push(r), e && s.push(t))
          }
          if (
            ((N = i.map(e => ({
              type: 'line',
              x0: e.x0 - n,
              y0: e.y0 - l,
              x1: e.x1 - n,
              y1: e.y1 - l,
              color: e.color,
              size: e.size
            }))),
            e && s.length > 0)
          ) {
            for (let e = s.length - 1; e >= 0; e--) k.splice(s[e], 1)
            window.whiteboardData[t] = k
          }
          ;(O = null), (b.disabled = !0), (v.disabled = !0), z()
        },
        b = el('button', { onclick: () => g(!1), disabled: !0 }, 'Copy'),
        v = el('button', { onclick: () => g(!0), disabled: !0 }, 'Cut')
      r.append(d, c, p, h, u, y, f, m, b, v), n.appendChild(r), e.appendChild(n)
      const C = el('div', {
        style: { flex: '1', position: 'relative', overflow: 'hidden' }
      })
      e.appendChild(C)
      const w = el('canvas')
      ;(w.style.cursor = 'none'), C.appendChild(w)
      const x = w.getContext('2d')
      w.classList.add('whiteboard-context'),
        (document.oncontextmenu = () => !1),
        (window.whiteboardData[t] = window.whiteboardData[t] || [])
      const k = window.whiteboardData[t]
      ;(window.whiteboardPanZoomData = window.whiteboardPanZoomData || {}),
        (whiteboardPanZoomData = window.whiteboardPanZoomData),
        (whiteboardPanZoomData[t] = whiteboardPanZoomData[t] || {
          offsetX: 0,
          offsetY: 0,
          scale: 1
        })
      let { offsetX: E, offsetY: D, scale: S } = whiteboardPanZoomData[t],
        L = 0,
        M = 0,
        A = 0,
        I = 0,
        T = '#fff',
        R = 1,
        j = !1,
        F = !1,
        W = !1,
        q = !1,
        O = null,
        N = null,
        U = 0,
        B = 0
      const _ = e => (e + E) * S,
        H = e => (e + D) * S,
        P = e => e / S - E,
        $ = e => e / S - D,
        z = () => {
          ;(w.width = C.clientWidth),
            (w.height = C.clientHeight),
            x.clearRect(0, 0, w.width, w.height),
            (x.fillStyle = '#202124'),
            x.fillRect(0, 0, w.width, w.height)
          let e = (E * S) % a,
            t = (D * S) % a
          e < 0 && (e += a), t < 0 && (t += a), (x.fillStyle = l)
          for (let n = e; n < w.width; n += a)
            for (let e = t; e < w.height; e += a)
              x.beginPath(), x.arc(n, e, 1, 0, 2 * Math.PI), x.fill()
          k.forEach(e => {
            'line' === e.type &&
              Y(_(e.x0), H(e.y0), _(e.x1), H(e.y1), e.color, e.size)
          }),
            G(),
            O && Z()
        },
        Y = (e, t, n, a, l, o) => {
          x.beginPath(),
            x.moveTo(e, t),
            x.lineTo(n, a),
            (x.strokeStyle = l),
            (x.lineWidth = o),
            (x.lineCap = 'round'),
            x.stroke()
        },
        G = () => {
          if (!F) return
          const e = w.width / 2,
            t = w.height / 2
          x.save(),
            (x.strokeStyle = l),
            (x.lineWidth = 1),
            x.beginPath(),
            x.moveTo(0, t),
            x.lineTo(w.width, t),
            x.stroke(),
            x.beginPath(),
            x.moveTo(e, 0),
            x.lineTo(e, w.height),
            x.stroke(),
            x.restore()
        },
        Z = () => {
          if (!O) return
          const e = Math.min(O.x0, O.x1),
            t = Math.max(O.x0, O.x1),
            n = Math.min(O.y0, O.y1),
            a = Math.max(O.y0, O.y1),
            l = _(e),
            o = H(n),
            i = _(t) - _(e),
            s = H(a) - H(n)
          x.save(),
            (x.strokeStyle = '#292a2d'),
            (x.lineWidth = 2),
            x.setLineDash([5, 5]),
            x.strokeRect(l, o, i, s),
            x.restore()
        },
        J = () => {
          if ((z(), q && N))
            (() => {
              if (!N) return
              let e = P(L) - U / 2,
                t = $(M) - B / 2
              if (W) {
                const n = o(_(e), H(t))
                ;(e = P(n.x)), (t = $(n.y))
              }
              N.forEach(n => {
                if ('line' === n.type) {
                  const a = e + n.x0,
                    l = t + n.y0,
                    o = e + n.x1,
                    i = t + n.y1
                  Y(_(a), H(l), _(o), H(i), n.color, n.size)
                }
              })
            })()
          else {
            const e = j ? 4 * R : R
            x.beginPath(),
              x.arc(L, M, e / 2, 0, 2 * Math.PI),
              (x.strokeStyle = j ? 'red' : 'white'),
              (x.lineWidth = 1),
              x.stroke()
          }
        }
      let X = !1
      const K = (e, t) => {
        const n = e.getBoundingClientRect()
        return {
          x: t.touches[0].clientX - n.left,
          y: t.touches[0].clientY - n.top
        }
      }
      w.addEventListener('mousedown', e => {
        0 === e.button && Q(e.offsetX, e.offsetY)
      }),
        w.addEventListener('touchstart', e => {
          e.preventDefault()
          const t = K(w, e)
          Q(t.x, t.y)
        })
      const Q = (e, n) => {
        if (q && N) {
          let a = P(e) - U / 2,
            l = $(n) - B / 2
          return (
            W && ({ x: a, y: l } = o(a, l)),
            N.forEach(e => {
              'line' === e.type &&
                k.push({
                  type: 'line',
                  x0: e.x0 + a,
                  y0: e.y0 + l,
                  x1: e.x1 + a,
                  y1: e.y1 + l,
                  color: e.color,
                  size: e.size
                })
            }),
            (window.whiteboardData[t] = k),
            void z()
          )
        }
        if (
          ((X = !0),
          W && ({ x: e, y: n } = o(e, n)),
          (L = A = e),
          (M = I = n),
          q && !N)
        ) {
          const t = P(e),
            a = $(n)
          O = { x0: t, y0: a, x1: t, y1: a }
        }
      }
      w.addEventListener('mousemove', e => {
        V(e.offsetX, e.offsetY)
      }),
        w.addEventListener('touchmove', e => {
          e.preventDefault()
          const t = K(w, e)
          V(t.x, t.y)
        })
      const V = (e, n) => {
        if ((W && ({ x: e, y: n } = o(e, n)), (L = e), (M = n), X))
          if (F)
            (E += (L - A) / S),
              (D += (M - I) / S),
              z(),
              (whiteboardPanZoomData[t] = { offsetX: E, offsetY: D, scale: S })
          else if (q && !N && O) (O.x1 = P(e)), (O.y1 = $(n)), z()
          else if (j) {
            const e = Math.hypot(L - A, M - I),
              n = Math.max(Math.ceil(e / (R / 2)), 1)
            for (let e = 0; e <= n; e++) {
              const t = e / n,
                a = P(A + (L - A) * t),
                l = $(I + (M - I) * t)
              for (let e = k.length - 1; e >= 0; e--) {
                const t = k[e]
                'line' === t.type &&
                  i(t.x0, t.y0, t.x1, t.y1, a, l, (R / S) * 2, t.size) &&
                  k.splice(e, 1)
              }
            }
            ;(window.whiteboardData[t] = k), z()
          } else {
            const e = P(L),
              t = $(M),
              n = P(A),
              a = $(I)
            k.push({
              type: 'line',
              x0: n,
              y0: a,
              x1: e,
              y1: t,
              color: T,
              size: R
            }),
              Y(A, I, L, M, T, R)
          }
        ;(A = L), (I = M), J()
      }
      w.addEventListener('mouseup', () => {
        ;(X = !1), q && !N && O && Z()
      }),
        w.addEventListener('touchend', e => {
          e.preventDefault(), (X = !1), q && !N && O && Z()
        })
      const ee = (e, t, n, a, l) =>
        e.x0 >= t &&
        e.x0 <= a &&
        e.y0 >= n &&
        e.y0 <= l &&
        e.x1 >= t &&
        e.x1 <= a &&
        e.y1 >= n &&
        e.y1 <= l
      window.addEventListener('resize', z), z()
    },
    renderCodeChannel = (container, channel) => {
      ;(container.innerHTML = ''),
        (container.style.display = 'flex'),
        (container.style.flexDirection = 'column')
      const headerContainer = el('div', {
          style: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }
        }),
        buttonContainer = el('div', {
          style: { display: 'flex', flexWrap: 'wrap', marginLeft: 'auto' }
        }),
        saveBtn = el('button', {}, 'Save')
      buttonContainer.appendChild(saveBtn),
        buttonContainer.appendChild(
          el(
            'button',
            {
              onclick: () => {
                const e = categories.find(e => 'Functions' === e.name)
                if (!e?.channels?.length) return
                const t = new Blob([JSON.stringify(e.channels, null, 2)], {
                  type: 'application/json'
                })
                el('a', {
                  href: URL.createObjectURL(t),
                  download: 'code_functions.json'
                }).click()
              }
            },
            'Export'
          )
        ),
        buttonContainer.appendChild(
          el(
            'button',
            {
              onclick: () => {
                const e = el('input', {
                  type: 'file',
                  accept: 'application/json',
                  style: { display: 'none' }
                })
                e.addEventListener('change', async e => {
                  const t = e.target.files[0]
                  if (!t) return
                  const n = await readFile(t)
                  try {
                    const e = JSON.parse(n.content)
                    if (Array.isArray(e)) {
                      let t = categories.find(e => 'Functions' === e.name)
                      t ||
                        ((t = { name: 'Functions', channels: [] }),
                        categories.push(t)),
                        e.forEach(e => {
                          const n = t.channels.findIndex(
                            t => t.name.toLowerCase() === e.name.toLowerCase()
                          )
                          ;-1 !== n ? (t.channels[n] = e) : t.channels.push(e)
                        }),
                        renderSidebar()
                    }
                  } catch {}
                }),
                  e.click()
              }
            },
            'Import'
          )
        ),
        headerContainer.appendChild(buttonContainer),
        container.appendChild(headerContainer)
      const ioContainer = el('div', {
          class: 'toolbar',
          style: { display: 'flex', alignItems: 'center' }
        }),
        functionNameInput = el('input', {
          type: 'text',
          placeholder: 'Function Name..',
          style: { flex: '1', minWidth: '80px' }
        })
      ioContainer.appendChild(functionNameInput),
        container.appendChild(ioContainer)
      const wrapper = el('div', {
        class: 'code-runner-wrapper',
        style: {
          flex: '1',
          position: 'relative',
          display: 'grid',
          gridTemplateRows: '1fr 100px',
          overflow: 'hidden'
        }
      })
      container.appendChild(wrapper)
      const runBtn = el('button', { class: 'run-btn' }, 'Run Code')
      wrapper.appendChild(runBtn)
      const codeArea = el('textarea', { class: 'code-runner-textarea' })
      wrapper.appendChild(codeArea),
        window.codeData[channel.id] &&
          (codeArea.value = window.codeData[channel.id]),
        codeArea.addEventListener(
          'input',
          () => (window.codeData[channel.id] = codeArea.value)
        )
      const outputDiv = el('div', { class: 'code-runner-output' })
      wrapper.appendChild(outputDiv),
        runBtn.addEventListener('click', () => {
          const code = codeArea.value,
            logs = [],
            origLog = console.log
          console.log = (...e) => {
            logs.push(e.join(' ')), origLog(...e)
          }
          try {
            const result = eval(code)
            outputDiv.textContent = logs.length
              ? logs.join('\n')
              : void 0 !== result
              ? result
              : 'Code executed successfully.'
          } catch (e) {
            outputDiv.textContent = 'Error: ' + e
          }
          console.log = origLog
        }),
        functionNameInput.addEventListener('input', () => {
          const e = categories.find(e => 'Functions' === e.name)
          saveBtn.textContent =
            e &&
            e.channels.find(
              e =>
                e.name.toLowerCase() ===
                functionNameInput.value.trim().toLowerCase()
            )
              ? 'Update'
              : 'Save'
        }),
        saveBtn.addEventListener('click', () => {
          const e = codeArea.value
          if (!e.trim()) return
          let t = categories.find(e => 'Functions' === e.name)
          t || ((t = { name: 'Functions', channels: [] }), categories.push(t))
          let n =
            functionNameInput.value.trim() ||
            'Saved Function ' + (t.channels.length + 1)
          const a = t.channels.findIndex(
            e => e.name.toLowerCase() === n.toLowerCase()
          )
          if (-1 !== a) t.channels[a].code = e
          else {
            const a =
              'func_' +
              Date.now() +
              '_' +
              Math.random().toString(36).substring(2, 9)
            t.channels.push({ id: a, name: n, type: 'function', code: e })
          }
          renderSidebar(),
            (functionNameInput.value = ''),
            (saveBtn.textContent = 'Save')
        })
    },
    renderReminderChannel = (e, t) => {
      e.innerHTML = ''
      const n = e => {
        const {
          r: t,
          g: n,
          b: a
        } = (e => {
          if ((e = e.trim().toLowerCase()).startsWith('#')) {
            let t = e.slice(1)
            return (
              [3, 4].includes(t.length) &&
                (t = t
                  .split('')
                  .map(e => e + e)
                  .join('')),
              {
                r: parseInt(t.substring(0, 2), 16),
                g: parseInt(t.substring(2, 2), 16),
                b: parseInt(t.substring(4, 2), 16)
              }
            )
          }
          if (e.startsWith('rgb')) {
            const t = e.match(/(\d+)/g) || []
            return { r: +t[0] || 0, g: +t[1] || 0, b: +t[2] || 0 }
          }
          return { r: 255, g: 255, b: 255 }
        })(e)
        return ((e, t, n) => {
          const a = e =>
            (e /= 255) <= 0.03928
              ? e / 12.92
              : Math.pow((e + 0.055) / 1.055, 2.4)
          return 0.2126 * a(e) + 0.7152 * a(t) + 0.0722 * a(n)
        })(t, n, a) > 0.179
          ? '#000000'
          : '#ffffff'
      }
      reminders[t.id] = reminders[t.id] || []
      const a = el('div')
      e.appendChild(a)
      const l = () => {
        ;(a.innerHTML = ''),
          reminders[t.id].forEach((e, o) => {
            const i = el('div', {
              class: 'reminder-container',
              style: {
                backgroundColor: e.color,
                color: n(e.color),
                borderRadius: '4px',
                position: 'relative',
                padding: '8px 28px 8px 8px'
              }
            })
            e.date &&
              i.appendChild(el('div', {}, new Date(e.date).toLocaleString())),
              i.appendChild(el('div', {}, e.text)),
              i.appendChild(
                el(
                  'button',
                  {
                    class: 'remove-btn',
                    style: {
                      position: 'absolute',
                      top: '0',
                      right: '0',
                      padding: '2px 8px',
                      border: 'none',
                      background: 'transparent',
                      color: 'inherit',
                      cursor: 'pointer',
                      fontSize: '14px',
                      borderRadius: '0 4px 0 4px'
                    },
                    onclick: () => {
                      reminders[t.id].splice(o, 1), l()
                    }
                  },
                  '×'
                )
              ),
              a.appendChild(i)
          })
      }
      l()
      const o = el('form', {
          onsubmit: e => {
            e.preventDefault(),
              reminders[t.id].push({
                date: i.value || null,
                text: s.value,
                color: r.value
              }),
              (i.value = ''),
              (s.value = ''),
              l()
          },
          style: { display: 'flex', flexWrap: 'wrap', alignItems: 'center' }
        }),
        i = el('input', { type: 'datetime-local' }),
        s = el('input', {
          type: 'text',
          placeholder: 'Reminder text',
          required: !0
        }),
        r = el('input', { type: 'color', value: '#007bff' })
      o.append(i, s, r, el('button', { type: 'submit' }, 'Add Reminder')),
        e.appendChild(o)
    },
    renderCryptChannel = (e, t) => {
      e.innerHTML = ''
      const n = el('div', {
          class: 'crypt-container',
          style: { display: 'flex', flexDirection: 'column' }
        }),
        a = el('div', {
          style: {
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'wrap'
          }
        })
      let l = !1,
        o = '',
        i = ''
      const s = el('div', { style: { flex: '1', marginRight: '5px' } }),
        r = el('textarea', {
          placeholder: 'Enter your message here',
          rows: '10',
          class: 'code-runner-textarea'
        }),
        d = el(
          'button',
          {
            onclick: () => {
              navigator.clipboard.writeText(r.value)
            }
          },
          'Copy Message'
        ),
        c = el(
          'button',
          {
            onclick: () => {
              u.click()
            }
          },
          'Attach File'
        ),
        p = el(
          'button',
          {
            onclick: () => {
              ;(l = !1),
                (o = ''),
                (i = ''),
                (r.disabled = !1),
                (m.disabled = !0),
                (r.value = ''),
                (m.value = ''),
                (r.placeholder = 'Enter your message here'),
                (m.placeholder = 'The result will appear here'),
                (p.style.display = 'none'),
                (c.style.display = 'inline'),
                (h.textContent = ''),
                (d.disabled = !1),
                (b.disabled = !1)
            },
            style: { display: 'none' }
          },
          'Clear File'
        ),
        h = el('div', {
          style: { marginTop: '5px', fontSize: '12px', color: '#666' }
        }),
        u = el('input', { type: 'file', style: { display: 'none' } })
      u.addEventListener('click', () => {
        u.value = ''
      }),
        u.addEventListener('change', function () {
          if (u.files && u.files[0]) {
            const e = u.files[0]
            ;(o = e.name),
              (i = e.type || 'application/octet-stream'),
              (l = !0),
              (r.disabled = !0),
              (m.disabled = !0),
              (d.disabled = !0),
              (b.disabled = !0),
              (r.placeholder = 'File content loaded (binary data)'),
              (m.placeholder =
                'Encrypted/Decrypted file content will appear here'),
              (p.style.display = 'inline'),
              (c.style.display = 'none'),
              (h.textContent = `File: ${o} (${T(e.size)})`)
            const t = new FileReader()
            ;(t.onload = function (e) {
              const t = e.target.result,
                n = new Uint8Array(t)
              ;(r.value = '_BINARY_DATA_'), (r._binaryData = n)
            }),
              t.readAsArrayBuffer(e)
          }
        }),
        s.appendChild(r)
      const y = el('div', {
        style: { display: 'flex', justifyContent: 'space-between' }
      })
      y.appendChild(c),
        y.appendChild(p),
        y.appendChild(d),
        s.appendChild(y),
        s.appendChild(h),
        s.appendChild(u),
        a.appendChild(s)
      const f = el('div', { style: { flex: '1', marginLeft: '5px' } }),
        m = el('textarea', {
          placeholder: 'The result will appear here',
          disabled: !0,
          rows: '10',
          class: 'code-runner-textarea'
        }),
        g = el('div', {
          style: { marginTop: '5px', fontSize: '12px', color: '#666' }
        }),
        b = el(
          'button',
          {
            onclick: () => {
              navigator.clipboard.writeText(m.value)
            }
          },
          'Copy Result'
        ),
        v = el(
          'button',
          {
            onclick: () => {
              if (l && m._binaryData) {
                let e = o
                if (e.includes('.')) {
                  const t = e.split('.'),
                    n = (t.pop(), t.join('.'))
                  e = e.endsWith('.enc') ? n : `${e}.enc`
                } else e = `${e}.enc`
                const t = new Blob([m._binaryData], { type: i }),
                  n = URL.createObjectURL(t),
                  a = document.createElement('a')
                ;(a.href = n),
                  (a.download = e),
                  document.body.appendChild(a),
                  a.click(),
                  document.body.removeChild(a),
                  URL.revokeObjectURL(n)
              } else {
                const e = new Blob([m.value], { type: 'text/plain' }),
                  t = URL.createObjectURL(e),
                  n = document.createElement('a')
                ;(n.href = t),
                  (n.download = 'result.txt'),
                  document.body.appendChild(n),
                  n.click(),
                  document.body.removeChild(n),
                  URL.revokeObjectURL(t)
              }
            }
          },
          'Download'
        )
      f.appendChild(m)
      const C = el('div', {
        style: { display: 'flex', justifyContent: 'space-between' }
      })
      C.appendChild(v),
        C.appendChild(b),
        f.appendChild(C),
        f.appendChild(g),
        a.appendChild(f),
        n.appendChild(a)
      const w = el('div', {
          style: {
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            marginTop: '10px'
          }
        }),
        x = el('label', {}, 'Password Length: '),
        k = el('input', {
          type: 'range',
          min: '6',
          max: '200',
          value: '12',
          oninput: e => {
            E.textContent = e.target.value
          }
        }),
        E = el('span', {}, k.value)
      x.appendChild(k), x.appendChild(E), w.appendChild(x)
      const D = el(
          'button',
          {
            onclick: () => {
              const e = parseInt(k.value, 10)
              A.value = W(e)
            }
          },
          'Generate'
        ),
        S = el(
          'button',
          {
            onclick: async () => {
              if (A.value)
                try {
                  if (l && r._binaryData) {
                    const e = r._binaryData,
                      [t, n] = await (async function (e, t) {
                        const n = crypto.getRandomValues(new Uint8Array(12)),
                          a = new TextEncoder().encode(t),
                          l = await crypto.subtle.digest('SHA-256', a),
                          o = await crypto.subtle.importKey(
                            'raw',
                            l,
                            { name: 'AES-GCM' },
                            !1,
                            ['encrypt']
                          ),
                          i = await crypto.subtle.encrypt(
                            { name: 'AES-GCM', iv: n },
                            o,
                            e
                          )
                        return [new Uint8Array(i), n]
                      })(e, A.value)
                    ;(m._binaryData = F([n, t])),
                      (m.value = '_ENCRYPTED_BINARY_DATA_'),
                      (m.disabled = !0),
                      (g.textContent = `Encrypted: ${T(
                        m._binaryData.length
                      )} (ready to download)`)
                  } else
                    (m.value = await (async function (e, t) {
                      const n = crypto.getRandomValues(new Uint8Array(12)),
                        a = new TextEncoder(),
                        l = a.encode(t),
                        o = await crypto.subtle.digest('SHA-256', l),
                        i = await crypto.subtle.importKey(
                          'raw',
                          o,
                          { name: 'AES-GCM' },
                          !1,
                          ['encrypt']
                        ),
                        s = a.encode(e),
                        r = await crypto.subtle.encrypt(
                          { name: 'AES-GCM', iv: n },
                          i,
                          s
                        )
                      return R(n) + ':' + R(new Uint8Array(r))
                    })(r.value, A.value)),
                      (g.textContent = '')
                } catch (e) {
                  alert('Encryption failed: ' + e.message)
                }
              else alert('Please enter an encryption key.')
            }
          },
          'Encrypt'
        ),
        L = el(
          'button',
          {
            onclick: async () => {
              if (A.value)
                try {
                  if (l && r._binaryData) {
                    const e = r._binaryData,
                      t = e.slice(0, 12),
                      n = e.slice(12),
                      a = await (async function (e, t, n) {
                        const a = new TextEncoder().encode(t),
                          l = await crypto.subtle.digest('SHA-256', a),
                          o = await crypto.subtle.importKey(
                            'raw',
                            l,
                            { name: 'AES-GCM' },
                            !1,
                            ['decrypt']
                          ),
                          i = await crypto.subtle.decrypt(
                            { name: 'AES-GCM', iv: n },
                            o,
                            e
                          )
                        return new Uint8Array(i)
                      })(n, A.value, t)
                    ;(m._binaryData = a),
                      (m.value = '_DECRYPTED_BINARY_DATA_'),
                      (m.disabled = !0),
                      (g.textContent = `Decrypted: ${T(
                        a.length
                      )} (ready to download)`)
                  } else
                    (m.value = await (async function (e, t) {
                      const [n, a] = e.split(':')
                      if (!n || !a)
                        throw new Error('Invalid encrypted message format')
                      const l = j(n),
                        o = j(a),
                        i = new TextEncoder().encode(t),
                        s = await crypto.subtle.digest('SHA-256', i),
                        r = await crypto.subtle.importKey(
                          'raw',
                          s,
                          { name: 'AES-GCM' },
                          !1,
                          ['decrypt']
                        ),
                        d = await crypto.subtle.decrypt(
                          { name: 'AES-GCM', iv: l },
                          r,
                          o
                        )
                      return new TextDecoder().decode(d)
                    })(r.value, A.value)),
                      (g.textContent = '')
                } catch (e) {
                  alert(
                    'Decryption failed. Make sure the input is valid and the encryption key is correct. ' +
                      e.message
                  )
                }
              else alert('Please enter an encryption key.')
            }
          },
          'Decrypt'
        )
      w.appendChild(D), w.appendChild(S), w.appendChild(L), n.appendChild(w)
      const M = el('div', {
          style: { display: 'flex', alignItems: 'center', marginTop: '10px' }
        }),
        A = el('input', {
          type: 'text',
          placeholder: 'Enter encryption key',
          class: 'code-runner-textarea',
          style: { flex: '1' }
        }),
        I = el(
          'button',
          {
            onclick: () => {
              navigator.clipboard.writeText(A.value)
            }
          },
          'Copy Key'
        )
      function T (e) {
        return e < 1024
          ? e + ' bytes'
          : e < 1048576
          ? (e / 1024).toFixed(2) + ' KB'
          : (e / 1048576).toFixed(2) + ' MB'
      }
      function R (e) {
        return Array.from(e)
          .map(e => ('0' + e.toString(16)).slice(-2))
          .join('')
      }
      function j (e) {
        let t = e.length / 2,
          n = new Uint8Array(t)
        for (let a = 0; a < t; a++)
          n[a] = parseInt(e.substring(2 * a, 2 * a + 2), 16)
        return n
      }
      function F (e) {
        let t = e.reduce((e, t) => e + t.length, 0),
          n = new Uint8Array(t),
          a = 0
        return (
          e.forEach(e => {
            n.set(e, a), (a += e.length)
          }),
          n
        )
      }
      M.appendChild(A), M.appendChild(I), n.appendChild(M), e.appendChild(n)
      const W = e => {
        const t =
          'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ¡¢£¤¥¦§¨©«®¯°±²³´µ¶·¸¹º¼½¾¿€©®™×÷ƒ∑∆∂∞≈≠≡≤≥⊂⊃∈∉√π∞∩∪⊥∧∨∩≈⊕⊗∫'
        let n = ''
        for (let a = 0; a < e; a++)
          n += t.charAt(Math.floor(Math.random() * t.length))
        return n
      }
    },
    renderSettingsChannel = (e, t) => {
      e.innerHTML = ''
      const n = el('div', {
          style: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }
        }),
        a = el('div', {
          style: {
            display: 'flex',
            flexWrap: 'wrap',
            marginRight: 'auto',
            alignItems: 'center'
          }
        })
      e.appendChild(n), n.appendChild(a)
      let l = null
      const o = 'true' === localStorage.getItem('autoSaveEnabled')
      let i = parseInt(localStorage.getItem('autoSaveInterval'), 10) || 3e4
      const s = el('input', {
          type: 'checkbox',
          checked: o,
          onchange: e => {
            e.target.checked
              ? (localStorage.setItem('autoSaveEnabled', 'true'), g(), b())
              : (localStorage.setItem('autoSaveEnabled', 'false'), v())
          }
        }),
        r = el(
          'label',
          {
            style: { marginLeft: '1rem', display: 'flex', alignItems: 'center' }
          },
          'Auto Save: ',
          s
        ),
        d = el('input', {
          type: 'range',
          min: '5000',
          max: '120000',
          step: '1000',
          value: i,
          oninput: e => {
            ;(i = parseInt(e.target.value, 10)),
              localStorage.setItem('autoSaveInterval', i),
              (c.textContent = `Interval: ${i / 1e3}s`),
              o && b()
          }
        }),
        c = el('span', {}, `Interval: ${i / 1e3}s`),
        p = el('div', { style: { marginLeft: '1rem' } }, d, c)
      a.appendChild(r), a.appendChild(p)
      const h = el(
          'button',
          {
            onclick: () => {
              const e = {
                chatMessages: chatMessages,
                flashcards: flashcards,
                whiteboardData: window.whiteboardData,
                codeData: window.codeData,
                reminders: reminders,
                categories: categories
              }
              localStorage.setItem('appData', JSON.stringify(e)),
                alert('Data saved in localStorage.'),
                m()
            }
          },
          'Save data'
        ),
        u = el(
          'button',
          {
            onclick: () => {
              localStorage.removeItem('appData'),
                localStorage.removeItem('autoSaveEnabled'),
                localStorage.removeItem('autoSaveInterval'),
                Object.keys(chatMessages).forEach(e => delete chatMessages[e]),
                Object.keys(flashcards).forEach(e => delete flashcards[e]),
                Object.keys(reminders).forEach(e => delete reminders[e]),
                (window.whiteboardData = {}),
                (window.codeData = {})
              const e = categories.findIndex(e => 'Functions' === e.name)
              ;-1 !== e && (categories.splice(e, 1), renderSidebar()),
                alert('Memory erased.'),
                m()
            }
          },
          'Erase memory'
        )
      a.appendChild(h), a.appendChild(u)
      const y = el('div', {
          style: {
            margin: 'var(--margin-small)',
            color: 'var(--color-text-muted)'
          }
        }),
        f = el('div')
      function m () {
        const e = {
            chatMessages: chatMessages,
            flashcards: flashcards,
            whiteboardData: window.whiteboardData,
            codeData: window.codeData,
            reminders: reminders
          },
          t = JSON.stringify(e),
          n = new Blob([t]).size
        if (navigator.storage && navigator.storage.estimate)
          navigator.storage.estimate().then(e => {
            const t = e.quota,
              a = (n / t) * 100
            ;(f.style.width = a + '%'),
              (y.textContent = `Memory used: ${(n / 1048576).toFixed(
                2
              )} MB (${a.toFixed(1)}% of quota)`)
          })
        else {
          const e = 102400,
            t = Math.min(100, (n / e) * 100)
          ;(f.style.width = t + '%'),
            (y.textContent = `Memory used: ${(n / 1048576).toFixed(
              2
            )} MB (${t.toFixed(1)}% of quota)`)
        }
      }
      function g () {
        const e = {
          chatMessages: chatMessages,
          flashcards: flashcards,
          whiteboardData: window.whiteboardData,
          codeData: window.codeData,
          reminders: reminders,
          categories: categories
        }
        localStorage.setItem('appData', JSON.stringify(e))
      }
      function b () {
        v(), (l = setInterval(g, i))
      }
      function v () {
        l && (clearInterval(l), (l = null))
      }
      y.appendChild(f), e.appendChild(y), o && b(), m()
    },
    loadSavedData = () => {
      const e = localStorage.getItem('appData')
      if (e)
        try {
          const t = JSON.parse(e)
          Object.assign(chatMessages, t.chatMessages || {}),
            Object.assign(flashcards, t.flashcards || {}),
            (window.whiteboardData = t.whiteboardData || {}),
            (window.codeData = t.codeData || {}),
            Object.assign(reminders, t.reminders || {}),
            t.categories &&
              categories.splice(0, categories.length, ...t.categories)
        } catch (e) {}
    }
  document.addEventListener('DOMContentLoaded', () => {
    loadSavedData(),
      renderSidebar(),
      categories.length &&
        categories[0].channels.length &&
        selectChannel(categories[0].channels[0])
  })
})()