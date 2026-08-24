import Foundation
import Capacitor
import AVFoundation
import AudioToolbox

@objc(SoundPlugin)
public class SoundPlugin: CAPPlugin, CAPBridgedPlugin, AVSpeechSynthesizerDelegate {
    public let identifier = "SoundPlugin"
    public let jsName = "Sound"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "playRestTimerBeep", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "speak", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "scheduleRestSound", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancelRestSound", returnType: CAPPluginReturnPromise)
    ]

    private let synthesizer = AVSpeechSynthesizer()
    private var audioEngine: AVAudioEngine?
    private var playerNode: AVAudioPlayerNode?
    private var timer: Timer?
    private var elapsedSeconds: Int = 0
    private var announceInterval: Int = 30
    private var isVoiceMode: Bool = true
    private var isRunning: Bool = false
    private var isAudioReady: Bool = false

    public override func load() {
        synthesizer.delegate = self
        // Warm up audio system on startup without playing sound
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            self?.warmUpAudio()
        }
    }

    private func warmUpAudio() {
        // Configure audio session
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playback, mode: .default, options: [.mixWithOthers])
            try session.setActive(true)
        } catch {
            print("Audio session error: \(error)")
        }

        // Preload voice
        _ = AVSpeechSynthesisVoice(language: "en-US")

        // Setup audio engine for background support
        let engine = AVAudioEngine()
        let player = AVAudioPlayerNode()

        engine.attach(player)

        let sampleRate: Double = 44100
        let format = AVAudioFormat(standardFormatWithSampleRate: sampleRate, channels: 2)!
        let frameCount = AVAudioFrameCount(sampleRate) // 1 second buffer

        guard let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frameCount) else { return }
        buffer.frameLength = frameCount

        // Fill with silence
        if let channelData = buffer.floatChannelData {
            for channel in 0..<Int(format.channelCount) {
                memset(channelData[channel], 0, Int(frameCount) * MemoryLayout<Float>.size)
            }
        }

        engine.connect(player, to: engine.mainMixerNode, format: format)
        engine.mainMixerNode.outputVolume = 0.001

        do {
            try engine.start()
            player.scheduleBuffer(buffer, at: nil, options: .loops)
            player.play()

            DispatchQueue.main.async {
                self.audioEngine = engine
                self.playerNode = player
                self.isAudioReady = true
            }
        } catch {
            print("Audio engine error: \(error)")
            DispatchQueue.main.async {
                self.isAudioReady = true
            }
        }
    }

    private func configureAudioSession() {
        guard !isAudioReady else { return }
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playback, mode: .default, options: [.mixWithOthers])
            try session.setActive(true)
        } catch {
            print("Audio session error: \(error)")
        }
    }

    @objc func playRestTimerBeep(_ call: CAPPluginCall) {
        let soundId = SystemSoundID(call.getInt("soundId") ?? 1007)

        DispatchQueue.main.async {
            self.playBeep(soundId: soundId)
            call.resolve()
        }
    }

    @objc func speak(_ call: CAPPluginCall) {
        let text = call.getString("text") ?? "Rest complete"
        let rate = call.getFloat("rate") ?? 0.5

        DispatchQueue.main.async {
            self.speakText(text: text, rate: rate)
            call.resolve()
        }
    }

    @objc func scheduleRestSound(_ call: CAPPluginCall) {
        let mode = call.getString("mode") ?? "voice"
        // Ensure interval is a valid integer, default to 30
        var interval = call.getInt("announceInterval") ?? 30
        if interval <= 0 {
            interval = 30
        }

        DispatchQueue.main.async {
            // Always stop first to prevent duplicates
            self.stopTimer()

            self.announceInterval = interval
            self.isVoiceMode = mode == "voice"
            self.elapsedSeconds = 0
            self.isRunning = true

            // Start timer immediately on main run loop
            self.timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
                self?.tick()
            }
            RunLoop.main.add(self.timer!, forMode: .common)

            call.resolve()
        }
    }

    @objc func cancelRestSound(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.stopEverything()
            call.resolve()
        }
    }

    private func stopTimer() {
        timer?.invalidate()
        timer = nil
        synthesizer.stopSpeaking(at: .immediate)
    }

    private func stopEverything() {
        stopTimer()
        isRunning = false
        // Keep audio engine running for next use
    }

    private func stopAudioEngine() {
        playerNode?.stop()
        audioEngine?.stop()
        playerNode = nil
        audioEngine = nil
    }

    private func tick() {
        elapsedSeconds += 1

        // Announce at intervals (both foreground and background)
        let shouldAnnounce = elapsedSeconds > 0 &&
                            announceInterval > 0 &&
                            (elapsedSeconds % announceInterval) == 0 &&
                            isVoiceMode

        if shouldAnnounce {
            let seconds = elapsedSeconds
            let text = formatDuration(seconds)
            speakText(text: text, rate: 0.52)
        }
    }

    private func speakText(text: String, rate: Float) {
        // Stop any current speech first
        if synthesizer.isSpeaking {
            synthesizer.stopSpeaking(at: .immediate)
        }

        // Configure audio session before speaking
        configureAudioSession()

        let utterance = AVSpeechUtterance(string: text)
        utterance.rate = rate
        utterance.voice = AVSpeechSynthesisVoice(language: "en-US")
        utterance.volume = 1.0

        synthesizer.speak(utterance)
    }

    // AVSpeechSynthesizerDelegate
    public func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        // Speech finished
    }

    public func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
        // Speech cancelled
    }

    private func formatDuration(_ totalSeconds: Int) -> String {
        let mins: Int = totalSeconds / 60
        let secs: Int = totalSeconds % 60

        if mins == 0 {
            return String(secs) + " seconds"
        } else if secs == 0 {
            if mins == 1 {
                return "1 minute"
            } else {
                return String(mins) + " minutes"
            }
        } else {
            if mins == 1 {
                return "1 minute " + String(secs)
            } else {
                return String(mins) + " minutes " + String(secs)
            }
        }
    }

    private func playBeep(soundId: SystemSoundID) {
        AudioServicesPlaySystemSound(soundId)
    }
}
