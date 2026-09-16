import './style.css'
import {
  BrowserQRCodeReader,
  type IScannerControls,
} from '@zxing/browser'
import { products, type Product } from './products'

const GAME_DURATION_MS = 30_000
const CORRECT_FEEDBACK_MS = 700
const WRONG_FEEDBACK_MS = 550
const SAME_QR_GUARD_MS = 1_200
const URGENT_TIME_MS = 5_000

type GamePhase =
  | 'start'
  | 'preparing'
  | 'countdown'
  | 'playing'
  | 'finished'

type SoundEffect = 'correct' | 'wrong' | 'start' | 'finish'

type SoundPattern = {
  frequencies: number[]
  interval: number
  duration: number
  volume: number
  wave: OscillatorType
}

const soundPatterns: Record<SoundEffect, SoundPattern> = {
  correct: {
    frequencies: [660, 880],
    interval: 0.09,
    duration: 0.12,
    volume: 0.12,
    wave: 'sine',
  },
  wrong: {
    frequencies: [240, 180],
    interval: 0.1,
    duration: 0.13,
    volume: 0.1,
    wave: 'triangle',
  },
  start: {
    frequencies: [523, 659, 784],
    interval: 0.08,
    duration: 0.1,
    volume: 0.09,
    wave: 'sine',
  },
  finish: {
    frequencies: [784, 659, 523],
    interval: 0.11,
    duration: 0.15,
    volume: 0.1,
    wave: 'sine',
  },
}

const appElement = document.querySelector<HTMLDivElement>('#app')

if (!appElement) {
  throw new Error('#app が見つかりません')
}

const app = appElement
const qrReader = new BrowserQRCodeReader()

let phase: GamePhase = 'start'
let scannerControls: IScannerControls | null = null
let cameraStream: MediaStream | null = null
let scannerSession = 0
let feedbackTimer: number | null = null
let countdownTimer: number | null = null
let timerFrame: number | null = null
let deadlineTimer: number | null = null
let audioContext: AudioContext | null = null

let gameEndsAt = 0
let score = 0
let productBag: Product[] = []
let currentProduct: Product | null = null
let lastProductId: string | null = null

let isScanLocked = false
let lastProcessedQrValue: string | null = null
let lastProcessedAt = 0

function getElement<T extends Element>(selector: string) {
  const element = document.querySelector<T>(selector)

  if (!element) {
    throw new Error(`${selector} が見つかりません`)
  }

  return element
}

function getCurrentProduct() {
  if (!currentProduct) {
    throw new Error('出題する商品が見つかりません')
  }

  return currentProduct
}

function shuffleProducts(source: Product[]) {
  const shuffled = [...source]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    const temporaryProduct = shuffled[index]

    shuffled[index] = shuffled[randomIndex]
    shuffled[randomIndex] = temporaryProduct
  }

  return shuffled
}

function refillProductBag() {
  productBag = shuffleProducts(products)

  // 前の一巡の最後と、新しい一巡の最初が同じ商品になるのを防ぎます。
  if (
    lastProductId !== null &&
    productBag.length > 1 &&
    productBag[0]?.id === lastProductId
  ) {
    const swapIndex = productBag.findIndex(
      (product) => product.id !== lastProductId,
    )

    if (swapIndex > 0) {
      const firstProduct = productBag[0]
      productBag[0] = productBag[swapIndex]
      productBag[swapIndex] = firstProduct
    }
  }
}

function drawNextProduct() {
  if (productBag.length === 0) {
    refillProductBag()
  }

  const nextProduct = productBag.shift()

  if (!nextProduct) {
    throw new Error('商品一覧が空です')
  }

  currentProduct = nextProduct
  lastProductId = nextProduct.id

  return nextProduct
}

function stopCameraTracks() {
  cameraStream?.getTracks().forEach((track) => track.stop())
  cameraStream = null
  const video = document.querySelector<HTMLVideoElement>('#camera-preview')
  const stream = video?.srcObject

  if (video && stream instanceof MediaStream) {
    stream.getTracks().forEach((track) => track.stop())
    video.srcObject = null
  }
}

function stopSession() {
  scannerSession += 1

  scannerControls?.stop()
  scannerControls = null
  stopCameraTracks()

  if (feedbackTimer !== null) {
    window.clearTimeout(feedbackTimer)
    feedbackTimer = null
  }

  if (countdownTimer !== null) {
    window.clearTimeout(countdownTimer)
    countdownTimer = null
  }

  if (timerFrame !== null) {
    window.cancelAnimationFrame(timerFrame)
    timerFrame = null
  }

  if (deadlineTimer !== null) {
    window.clearTimeout(deadlineTimer)
    deadlineTimer = null
  }

  isScanLocked = false
}

function prepareAudio() {
  // 音声が利用できなくてもカメラとゲームは続けられるようにします。
  try {
    if (!audioContext) {
      const AudioContextConstructor =
        window.AudioContext ??
        (
          window as typeof window & {
            webkitAudioContext?: typeof AudioContext
          }
        ).webkitAudioContext

      if (!AudioContextConstructor) {
        return
      }

      audioContext = new AudioContextConstructor()
    }

    if (audioContext.state === 'suspended') {
      void audioContext.resume().catch(() => {})
    }

    // iPad Safariで後から鳴らせるよう、開始ボタンの操作中に音声を解放します。
    const unlockOscillator = audioContext.createOscillator()
    const unlockGain = audioContext.createGain()
    const unlockAt = audioContext.currentTime

    unlockGain.gain.setValueAtTime(0.0001, unlockAt)
    unlockOscillator.connect(unlockGain)
    unlockGain.connect(audioContext.destination)
    unlockOscillator.start(unlockAt)
    unlockOscillator.stop(unlockAt + 0.01)
    unlockOscillator.onended = () => {
      unlockOscillator.disconnect()
      unlockGain.disconnect()
    }
  } catch {
    audioContext = null
  }
}

function playSound(effect: SoundEffect) {
  if (!audioContext) {
    return
  }

  const context = audioContext
  const pattern = soundPatterns[effect]

  function scheduleNotes() {
    const startAt = context.currentTime

    pattern.frequencies.forEach((frequency, index) => {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      const noteStartsAt = startAt + index * pattern.interval
      const noteEndsAt = noteStartsAt + pattern.duration

      oscillator.type = pattern.wave
      oscillator.frequency.setValueAtTime(frequency, noteStartsAt)
      gain.gain.setValueAtTime(0.0001, noteStartsAt)
      gain.gain.exponentialRampToValueAtTime(
        pattern.volume,
        noteStartsAt + 0.015,
      )
      gain.gain.exponentialRampToValueAtTime(0.0001, noteEndsAt)

      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.start(noteStartsAt)
      oscillator.stop(noteEndsAt)
      oscillator.onended = () => {
        oscillator.disconnect()
        gain.disconnect()
      }
    })
  }

  if (context.state !== 'running') {
    const soundSession = scannerSession
    void context.resume()
      .then(() => {
        if (soundSession === scannerSession) scheduleNotes()
      })
      .catch(() => {})
    return
  }

  scheduleNotes()
}

function resetGameState() {
  score = 0
  productBag = []
  currentProduct = null
  lastProductId = null
  isScanLocked = false
  lastProcessedQrValue = null
  lastProcessedAt = 0
  drawNextProduct()
}

function showStartScreen() {
  phase = 'start'
  stopSession()

  app.innerHTML = `
    <main class="app-shell start-view">
      <section class="start-card" aria-labelledby="game-title">
        <p class="version-label">REGISTER GAME <span>V2</span></p>
        <p class="eyebrow"><span aria-hidden="true"></span> READY?</p>

        <div class="start-icon" aria-hidden="true">🛒</div>

        <h1 id="game-title">レジチャレンジ</h1>

        <p class="start-message">
          30秒で商品をいくつ見つけられるかな？
        </p>

        <button id="start-button" class="primary-button" type="button">
          ゲームをはじめる
          <span aria-hidden="true">→</span>
        </button>

        <p class="start-note">カメラを使って商品のQRコードを読み取ります</p>
      </section>
    </main>
  `

  getElement<HTMLButtonElement>('#start-button').addEventListener(
    'click',
    startGamePreparation,
  )
}

function renderGameScreen() {
  app.innerHTML = `
    <main class="app-shell game-view">
      <section id="game-card" class="game-card" aria-labelledby="product-title">
        <header class="game-hud">
          <div id="time-metric" class="metric">
            <span>TIME</span>
            <strong id="timer-display">30.0</strong>
          </div>

          <div id="score-metric" class="metric">
            <span>SCORE</span>
            <strong id="score-display">0</strong>
          </div>
        </header>

        <div class="game-layout">
          <section class="target-panel" aria-label="探す商品">
            <p class="section-label">探す商品</p>

            <div id="product-emoji" class="product-emoji" aria-hidden="true">？</div>

            <h1 id="product-title" class="product-title">
              <span id="product-name">準備中</span>
              <small id="product-instruction">開始までお待ちください</small>
            </h1>

            <p id="scan-status" class="scan-status" aria-live="assertive">
              カメラを準備しています
            </p>
          </section>

          <section class="camera-panel" aria-label="QRコード読み取りカメラ">
            <div class="camera-frame">
              <video
                id="camera-preview"
                autoplay
                muted
                playsinline
              ></video>

              <div class="camera-label" aria-hidden="true">
                <span></span>
                FRONT CAMERA
              </div>

              <div class="scan-guide" aria-hidden="true">
                <span></span>
              </div>

              <div id="countdown-overlay" class="countdown-overlay">
                <strong id="countdown-text">カメラを準備中…</strong>
                <small id="countdown-note">許可画面が出たら「許可」を押してください</small>
              </div>
            </div>

            <p class="camera-hint">QRコードを枠の中に映してください</p>
          </section>
        </div>

        <button id="back-button" class="text-button" type="button">
          ← 開始画面に戻る
        </button>
      </section>
    </main>
  `
}

function updateProductDisplay() {
  const product = getCurrentProduct()

  getElement<HTMLDivElement>('#product-emoji').textContent = product.emoji
  getElement<HTMLSpanElement>('#product-name').textContent = product.name
  getElement<HTMLElement>('#product-instruction').textContent =
    'を探してください！'
}

function showWaitingMessage() {
  const scanStatus = getElement<HTMLParagraphElement>('#scan-status')
  const gameCard = getElement<HTMLElement>('#game-card')

  scanStatus.classList.remove('is-correct', 'is-wrong')
  scanStatus.textContent = 'QRコードをカメラに映してください'
  gameCard.classList.remove('feedback-correct', 'feedback-wrong')
}

function runCountdown(currentSession: number) {
  phase = 'countdown'

  const overlay = getElement<HTMLDivElement>('#countdown-overlay')
  const countdownText = getElement<HTMLElement>('#countdown-text')
  const countdownNote = getElement<HTMLElement>('#countdown-note')
  const steps = ['3', '2', '1', 'START!']
  let stepIndex = 0

  countdownNote.textContent = 'まもなくスタートします'

  function showNextStep() {
    if (currentSession !== scannerSession || phase !== 'countdown') {
      return
    }

    const text = steps[stepIndex]

    if (!text) {
      overlay.classList.add('is-hidden')
      startTimedGame(currentSession)
      return
    }

    countdownText.textContent = text
    overlay.classList.remove('countdown-pop')
    void overlay.offsetWidth
    overlay.classList.add('countdown-pop')

    stepIndex += 1
    countdownTimer = window.setTimeout(
      showNextStep,
      text === 'START!' ? 500 : 700,
    )
  }

  showNextStep()
}

function startTimedGame(currentSession: number) {
  if (currentSession !== scannerSession) {
    return
  }

  phase = 'playing'
  gameEndsAt = performance.now() + GAME_DURATION_MS
  deadlineTimer = window.setTimeout(() => {
    if (currentSession === scannerSession) showResultScreen()
  }, GAME_DURATION_MS)

  playSound('start')
  updateProductDisplay()
  showWaitingMessage()
  updateTimer(currentSession)
}

function updateTimer(currentSession: number) {
  if (currentSession !== scannerSession || phase !== 'playing') {
    return
  }

  const remainingMs = Math.max(0, gameEndsAt - performance.now())
  const timerDisplay = getElement<HTMLElement>('#timer-display')
  const timeMetric = getElement<HTMLDivElement>('#time-metric')

  timerDisplay.textContent = (remainingMs / 1000).toFixed(1)
  timeMetric.classList.toggle('is-urgent', remainingMs <= URGENT_TIME_MS)

  if (remainingMs <= 0) {
    showResultScreen()
    return
  }

  timerFrame = window.requestAnimationFrame(() => {
    updateTimer(currentSession)
  })
}

function showCorrectFeedback() {
  const scanStatus = getElement<HTMLParagraphElement>('#scan-status')
  const gameCard = getElement<HTMLElement>('#game-card')
  const scoreDisplay = getElement<HTMLElement>('#score-display')
  const scoreMetric = getElement<HTMLElement>('#score-metric')

  score += 1
  isScanLocked = true

  scoreDisplay.textContent = String(score)
  scoreMetric.classList.remove('score-pop')
  void scoreMetric.offsetWidth
  scoreMetric.classList.add('score-pop')
  scanStatus.classList.remove('is-wrong')
  scanStatus.classList.add('is-correct')
  scanStatus.textContent = '○ 正解！ ＋1点'

  gameCard.classList.remove('feedback-wrong', 'feedback-correct')
  void gameCard.offsetWidth
  gameCard.classList.add('feedback-correct')
  playSound('correct')

  feedbackTimer = window.setTimeout(() => {
    feedbackTimer = null

    if (phase !== 'playing') {
      return
    }

    if (performance.now() >= gameEndsAt) {
      showResultScreen()
      return
    }

    drawNextProduct()
    updateProductDisplay()
    showWaitingMessage()
    isScanLocked = false
  }, CORRECT_FEEDBACK_MS)
}

function showWrongFeedback() {
  const scanStatus = getElement<HTMLParagraphElement>('#scan-status')
  const gameCard = getElement<HTMLElement>('#game-card')

  isScanLocked = true

  scanStatus.classList.remove('is-correct')
  scanStatus.classList.add('is-wrong')
  scanStatus.textContent = '× 違います！ 同じ商品を探してください'

  gameCard.classList.remove('feedback-correct', 'feedback-wrong')
  void gameCard.offsetWidth
  gameCard.classList.add('feedback-wrong')
  playSound('wrong')

  feedbackTimer = window.setTimeout(() => {
    feedbackTimer = null

    if (phase !== 'playing') {
      return
    }

    showWaitingMessage()
    isScanLocked = false
  }, WRONG_FEEDBACK_MS)
}

function handleQrResult(scannedValue: string, currentSession: number) {
  if (
    currentSession !== scannerSession ||
    phase !== 'playing'
  ) {
    return
  }

  const processedAt = performance.now()

  // 描画更新より先に読取結果が届いても、30秒以降は加点しません。
  if (processedAt >= gameEndsAt) {
    showResultScreen()
    return
  }

  if (isScanLocked) return

  if (
    scannedValue === lastProcessedQrValue &&
    processedAt - lastProcessedAt < SAME_QR_GUARD_MS
  ) {
    return
  }

  lastProcessedQrValue = scannedValue
  lastProcessedAt = processedAt

  if (scannedValue === getCurrentProduct().qrValue) {
    showCorrectFeedback()
  } else {
    showWrongFeedback()
  }
}

async function startGamePreparation() {
  stopSession()
  resetGameState()
  prepareAudio()

  phase = 'preparing'
  const currentSession = scannerSession

  renderGameScreen()

  getElement<HTMLButtonElement>('#back-button').addEventListener(
    'click',
    showStartScreen,
  )

  const video = getElement<HTMLVideoElement>('#camera-preview')
  const scanStatus = getElement<HTMLParagraphElement>('#scan-status')
  const countdownText = getElement<HTMLElement>('#countdown-text')
  const countdownNote = getElement<HTMLElement>('#countdown-note')
  let preparingStream: MediaStream | null = null

  try {
    preparingStream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: 'user',
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    })

    // 許可を待つ間に戻った場合、届いた映像をすぐ停止します。
    if (currentSession !== scannerSession) {
      preparingStream.getTracks().forEach((track) => track.stop())
      return
    }

    cameraStream = preparingStream
    const controls = await qrReader.decodeFromStream(
      preparingStream,
      video,
      (result) => {
        if (result) {
          handleQrResult(result.getText(), currentSession)
        }
      },
    )

    if (currentSession !== scannerSession) {
      controls.stop()
      return
    }

    scannerControls = controls
    scanStatus.textContent = 'カメラの準備ができました'
    countdownText.textContent = 'カメラOK'
    countdownNote.textContent = 'カウントダウンを始めます'

    countdownTimer = window.setTimeout(() => {
      countdownTimer = null
      runCountdown(currentSession)
    }, 350)
  } catch (error) {
    preparingStream?.getTracks().forEach((track) => track.stop())
    if (currentSession !== scannerSession) {
      return
    }

    console.error(error)
    stopSession()
    phase = 'preparing'
    scanStatus.classList.add('is-wrong')
    scanStatus.textContent = 'カメラを開始できませんでした'
    countdownText.textContent = 'カメラを使えません'
    countdownNote.textContent =
      'Safariのカメラ許可と、HTTPSで開いていることを確認してください'
  }
}

function showResultScreen() {
  if (phase !== 'playing') {
    return
  }

  phase = 'finished'
  stopSession()
  playSound('finish')

  const resultComment =
    score >= 10
      ? 'すばらしいスピード！'
      : score >= 5
        ? 'いいペースでした！'
        : 'もう一度チャレンジ！'

  app.innerHTML = `
    <main class="app-shell result-view">
      <section class="result-card" aria-labelledby="result-title">
        <p class="eyebrow finish-label">FINISH!</p>

        <div class="result-icon" aria-hidden="true">🎉</div>

        <h1 id="result-title" class="result-score">${score}点！</h1>

        <p class="result-message">30秒で${score}商品クリア</p>

        <p class="result-comment">${resultComment}</p>

        <button id="retry-button" class="primary-button" type="button">
          もう一度遊ぶ
          <span aria-hidden="true">↻</span>
        </button>
      </section>
    </main>
  `

  getElement<HTMLButtonElement>('#retry-button').addEventListener(
    'click',
    startGamePreparation,
  )
}

window.addEventListener('beforeunload', stopSession)
window.addEventListener('pagehide', showStartScreen)
document.addEventListener('visibilitychange', () => {
  // 別アプリやタブに移ったら中断し、見えない状態でカメラを使いません。
  if (document.hidden && phase !== 'start' && phase !== 'finished') {
    showStartScreen()
  }
})

showStartScreen()
