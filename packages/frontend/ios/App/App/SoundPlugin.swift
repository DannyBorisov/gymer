import Foundation
import Capacitor
import AVFoundation
import AudioToolbox

@objc(SoundPlugin)
public class SoundPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SoundPlugin"
    public let jsName = "Sound"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "playRestTimerBeep", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "speak", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "scheduleRestSound", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancelRestSound", returnType: CAPPluginReturnPromise)
    ]

    private let synthesizer = AVSpeechSynthesizer()
    private var restTimer: Timer?
    private var scheduledDuration: Int = 0
    private var scheduledMode: String = "voice"

    @objc func playRestTimerBeep(_ call: CAPPluginCall) {
        let soundId = SystemSoundID(call.getInt("soundId") ?? 1007)

        DispatchQueue.main.async {
            self.playBeepWithDucking(soundId: soundId)
            call.resolve()
        }
    }

    @objc func speak(_ call: CAPPluginCall) {
        let text = call.getString("text") ?? "Rest complete"
        let rate = call.getFloat("rate") ?? 0.5

        DispatchQueue.main.async {
            self.speakWithDucking(text: text, rate: rate)
            call.resolve()
        }
    }

    @objc func x(_ call: CAPPluginCall) {
        let duration = call.getInt("duration") ?? 60
        let mode = call.getString("mode") ?? "voice"

        DispatchQueue.main.async {
            // Cancel any existing timer
            self.restTimer?.invalidate()

            self.scheduledDuration = duration
            self.scheduledMode = mode

            // Keep audio session active for background
            do {
                let session = AVAudioSession.sharedInstance()
                try session.setCategory(.playback, options: [.mixWithOthers])
                try session.setActive(true)
            } catch {
                print("Failed to setup audio session: \(error)")
            }

            // Schedule timer
            self.restTimer = Timer.scheduledTimer(withTimeInterval: Double(duration), repeats: false) { [weak self] _ in
                self?.playScheduledSound()
            }

            call.resolve()
        }
    }

    @objc func cancelRestSound(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.restTimer?.invalidate()
            self.restTimer = nil
            call.resolve()
        }
    }

    private func playScheduledSound() {
        if scheduledMode == "voice" {
            let text = formatDuration(scheduledDuration)
            speakWithDucking(text: text, rate: 0.52)
        } else {
            playBeepWithDucking(soundId: 1007)
        }
    }

    private func formatDuration(_ seconds: Int) -> String {
        if seconds < 60 {
            return "\(seconds) seconds"
        }
        let minutes = seconds / 60
        if minutes == 1 {
            return "1 minute"
        }
        if seconds == 90 {
            return "1 and a half minutes"
        }
        return "\(minutes) minutes"
    }

    private func playBeepWithDucking(soundId: SystemSoundID) {
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playback, options: [.duckOthers])
            try session.setActive(true)

            AudioServicesPlaySystemSound(soundId)

            DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
            }
        } catch {
            print("SoundPlugin error: \(error)")
        }
    }

    private func speakWithDucking(text: String, rate: Float) {
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playback, options: [.duckOthers])
            try session.setActive(true)

            let utterance = AVSpeechUtterance(string: text)
            utterance.rate = rate
            utterance.voice = AVSpeechSynthesisVoice(language: "en-US")
            utterance.volume = 1.0

            synthesizer.speak(utterance)

            // Restore audio after speech
            let delay = Double(text.count) * 0.08 + 1.0
            DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
                try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
            }
        } catch {
            print("SoundPlugin speak error: \(error)")
        }
    }
}
