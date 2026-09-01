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
    private var startTime: Double = 0
    private var announceInterval: Int = 30
    private var isVoiceMode: Bool = true
    private var isRunning: Bool = false
    private var isAudioReady: Bool = false
    private var isSpeaking: Bool = false
    private var lastAnnouncedSecond: Int = -1

    public override func load() {
        synthesizer.delegate = self
        // Just preload the voice, don't activate audio session yet
        _ = AVSpeechSynthesisVoice(language: "en-US")
        isAudioReady = true
    }

    private func setupBackgroundAudio() {
        // Only setup audio engine if not already running
        guard audioEngine == nil else { return }

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

            self.audioEngine = engine
            self.playerNode = player
        } catch {
            print("Audio engine error: \(error)")
        }
    }

    private func activateAudioSession() {
        do {
            let session = AVAudioSession.sharedInstance()
            // Use duckOthers to lower other audio (like YouTube) instead of stopping it
            try session.setCategory(.playback, mode: .default, options: [.mixWithOthers, .duckOthers])
            try session.setActive(true)
            // Setup background audio engine when activating
            setupBackgroundAudio()
        } catch {
            print("Audio session error: \(error)")
        }
    }

    private func deactivateAudioSession() {
        // Stop audio engine
        stopAudioEngine()
        // Deactivate session to let other apps resume
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setActive(false, options: .notifyOthersOnDeactivation)
        } catch {
            print("Audio session deactivation error: \(error)")
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
        // Get start time from JS (milliseconds since epoch), default to now
        let jsStartTime = call.getDouble("startTime") ?? (Date().timeIntervalSince1970 * 1000)

        print("SoundPlugin: scheduleRestSound called - mode: \(mode), interval: \(interval), startTime: \(jsStartTime)")

        DispatchQueue.main.async {
            // Always stop first to prevent duplicates
            self.stopTimer()

            // Activate audio session when rest timer starts
            self.activateAudioSession()

            self.announceInterval = interval
            self.isVoiceMode = mode == "voice"
            self.startTime = jsStartTime
            self.isRunning = true
            self.isSpeaking = false
            self.lastAnnouncedSecond = -1

            print("SoundPlugin: Timer starting - isVoiceMode: \(self.isVoiceMode), interval: \(self.announceInterval)")

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
        isSpeaking = false
    }

    private func stopEverything() {
        stopTimer()
        isRunning = false
        // Deactivate audio session to let other apps resume
        deactivateAudioSession()
    }

    private func stopAudioEngine() {
        playerNode?.stop()
        audioEngine?.stop()
        playerNode = nil
        audioEngine = nil
    }

    private func tick() {
        guard isRunning else { return }

        // Calculate elapsed seconds from start time (same as frontend)
        let now = Date().timeIntervalSince1970 * 1000
        let elapsedSeconds = Int(floor((now - startTime) / 1000))

        // Announce at intervals (both foreground and background)
        let shouldAnnounce = elapsedSeconds > 0 &&
                            announceInterval > 0 &&
                            (elapsedSeconds % announceInterval) == 0 &&
                            isVoiceMode &&
                            !isSpeaking &&
                            elapsedSeconds != lastAnnouncedSecond

        if shouldAnnounce {
            print("SoundPlugin: Announcing at \(elapsedSeconds) seconds")
            lastAnnouncedSecond = elapsedSeconds
            let text = formatDuration(elapsedSeconds)
            speakText(text: text, rate: 0.52)
        }
    }

    private func speakText(text: String, rate: Float) {
        // Don't overlap speech
        guard !isSpeaking else { return }

        isSpeaking = true

        // Stop any current speech first
        if synthesizer.isSpeaking {
            synthesizer.stopSpeaking(at: .immediate)
        }

        // Configure audio session for speech - duck others to lower YouTube/video volume
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playback, mode: .spokenAudio, options: [.duckOthers])
            try session.setActive(true, options: [])
        } catch {
            print("SoundPlugin: Failed to configure audio session for speech: \(error)")
        }

        let utterance = AVSpeechUtterance(string: text)
        utterance.rate = rate
        // Try to get a good English voice, fall back to default
        if let voice = AVSpeechSynthesisVoice(language: "en-US") {
            utterance.voice = voice
        } else if let voice = AVSpeechSynthesisVoice(language: "en") {
            utterance.voice = voice
        }
        utterance.volume = 1.0
        utterance.pitchMultiplier = 1.0
        utterance.preUtteranceDelay = 0
        utterance.postUtteranceDelay = 0

        print("SoundPlugin: Speaking '\(text)'")
        synthesizer.speak(utterance)

        // Safety timeout - reset isSpeaking after 5 seconds max
        DispatchQueue.main.asyncAfter(deadline: .now() + 5.0) { [weak self] in
            if self?.isSpeaking == true {
                print("SoundPlugin: Safety timeout - resetting speech state")
                self?.isSpeaking = false
            }
        }
    }

    // AVSpeechSynthesizerDelegate
    public func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        print("SoundPlugin: Speech finished")
        DispatchQueue.main.async {
            self.isSpeaking = false
            self.restoreBackgroundAudioSession()
        }
    }

    public func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
        print("SoundPlugin: Speech cancelled")
        DispatchQueue.main.async {
            self.isSpeaking = false
            self.restoreBackgroundAudioSession()
        }
    }

    public func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didStart utterance: AVSpeechUtterance) {
        print("SoundPlugin: Speech started")
    }

    private func restoreBackgroundAudioSession() {
        // Restore audio session to background mode after speech
        // Only if still running (rest timer active)
        guard isRunning else { return }
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playback, mode: .default, options: [.mixWithOthers, .duckOthers])
        } catch {
            print("SoundPlugin: Failed to restore audio session: \(error)")
        }
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
