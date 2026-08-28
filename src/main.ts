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

type GamePhase =
  | 'start'
  | 'preparing'
  | 'countdown'
  | 'playing'
  | 'finished'

const appElement = document.querySelector<HTMLDivElement>('#app')

if (!appElement) {
  throw new Error('#app が見つかりません')
}

const app = appElement
const qrReader = new BrowserQRCodeReader()

let phase: GamePhase = 'start'
let scannerControls: IScannerControls | null = null
let scannerSession = 0
let feedbackTimer: number | null = null
let countdownTimer: number | null = null
let timerFrame: number | null = null
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

  isScanLocked = false
}

function prepareAudio() {
  if (!audioContext) {
    audioContext = new AudioContext()
  }

  if (audioContext.state === 'suspended') {
    void audioContext.resume()
  }
}

function playFeedbackSound(result: 'correct' | 'wrong') {
  if (!audioContext) {
    return
  }

  void audioContext.resume()

  const startAt = audioContext.currentTime
  const frequencies = result === 'correct' ? [660, 880] : [240, 180]

  frequencies.forEach((frequency, index) => {
    const oscillator = audioContext?.createOscillator()
    const gain = audioContext?.createGain()

    if (!audioContext || !oscillator || !gain) {
      return
    }

    const noteStartsAt = startAt + index * 0.09
    const noteEndsAt = noteStartsAt + 0.12

    oscillator.type = result === 'correct' ? 'sine' : 'triangle'
    oscillator.frequency.setValueAtTime(frequency, noteStartsAt)
    gain.gain.setValueAtTime(0.0001, noteStartsAt)
    gain.gain.exponentialRampToValueAtTime(0.12, noteStartsAt + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, noteEndsAt)

    oscillator.connect(gain)
    gain.connect(audioContext.destination)
    oscillator.start(noteStartsAt)
    oscillator.stop(noteEndsAt)
  })
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

          <div class="metric">
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
  timeMetric.classList.toggle('is-urgent', remainingMs <= 10_000)

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

  score += 1
  isScanLocked = true

  getElement<HTMLElement>('#score-display').textContent = String(score)
  scanStatus.classList.remove('is-wrong')
  scanStatus.classList.add('is-correct')
  scanStatus.textContent = '○ 正解！ ＋1点'

  gameCard.classList.remove('feedback-wrong', 'feedback-correct')
  void gameCard.offsetWidth
  gameCard.classList.add('feedback-correct')
  playFeedbackSound('correct')

  feedbackTimer = window.setTimeout(() => {
    feedbackTimer = null

    if (phase !== 'playing') {
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
  playFeedbackSound('wrong')

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
    phase !== 'playing' ||
    isScanLocked
  ) {
    return
  }

  const processedAt = performance.now()

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

  try {
    const controls = await qrReader.decodeFromConstraints(
      {
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      },
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
    if (currentSession !== scannerSession) {
      return
    }

    console.error(error)
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

  app.innerHTML = `
    <main class="app-shell result-view">
      <section class="result-card" aria-labelledby="result-title">
        <p class="eyebrow finish-label">FINISH!</p>

        <div class="result-icon" aria-hidden="true">🎉</div>

        <h1 id="result-title" class="result-score">${score}点！</h1>

        <p class="result-message">30秒で${score}商品クリア</p>

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

showStartScreen()
