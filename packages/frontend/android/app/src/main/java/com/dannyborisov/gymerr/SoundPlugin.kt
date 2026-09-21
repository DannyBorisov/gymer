package com.dannyborisov.gymerr

import android.os.Handler
import android.os.Looper
import android.speech.tts.TextToSpeech
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.util.*

@CapacitorPlugin(name = "Sound")
class SoundPlugin : Plugin() {

    private var tts: TextToSpeech? = null
    private var restTimer: Timer? = null
    private var restStartTime: Long = 0
    private var lastAnnouncedInterval: Int = 0
    private var announceInterval: Int = 30
    private var isRunning: Boolean = false
    private val handler = Handler(Looper.getMainLooper())

    override fun load() {
        initTTS()
    }

    private fun initTTS() {
        tts = TextToSpeech(context) { status ->
            if (status == TextToSpeech.SUCCESS) {
                tts?.language = Locale.US
                tts?.setSpeechRate(0.9f)
            }
        }
    }

    @PluginMethod
    fun speak(call: PluginCall) {
        val text = call.getString("text") ?: "Rest complete"
        val rate = call.getFloat("rate") ?: 0.5f

        handler.post {
            tts?.setSpeechRate(rate * 1.8f) // Adjust rate for Android
            tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "rest_timer_utterance")
            call.resolve()
        }
    }

    @PluginMethod
    fun scheduleRestSound(call: PluginCall) {
        var interval = call.getInt("announceInterval") ?: 30
        if (interval <= 0) interval = 30
        val startTime = call.getLong("startTime") ?: System.currentTimeMillis()

        handler.post {
            // Cancel any existing timer
            restTimer?.cancel()
            restTimer = null

            announceInterval = interval
            restStartTime = startTime
            lastAnnouncedInterval = 0
            isRunning = true

            // Start timer that ticks every second
            restTimer = Timer()
            restTimer?.scheduleAtFixedRate(object : TimerTask() {
                override fun run() {
                    handler.post {
                        tick()
                    }
                }
            }, 1000L, 1000L)

            call.resolve()
        }
    }

    @PluginMethod
    fun cancelRestSound(call: PluginCall) {
        handler.post {
            restTimer?.cancel()
            restTimer = null
            isRunning = false
            tts?.stop()
            call.resolve()
        }
    }

    private fun tick() {
        if (!isRunning) return

        // Derive elapsed time from the wall clock rather than counting ticks:
        // if Android throttles this timer while the app is backgrounded, the
        // next tick that does fire still reports the real elapsed time
        // instead of resuming a stalled counter (which was making the
        // announcement get stuck repeating the same value).
        val elapsedSeconds = ((System.currentTimeMillis() - restStartTime) / 1000L).toInt()
        if (elapsedSeconds <= 0 || announceInterval <= 0) return

        val currentInterval = elapsedSeconds / announceInterval
        if (currentInterval > lastAnnouncedInterval) {
            lastAnnouncedInterval = currentInterval
            speakText(formatDuration(currentInterval * announceInterval))
        }
    }

    private fun speakText(text: String) {
        tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "rest_timer_announce")
    }

    private fun formatDuration(totalSeconds: Int): String {
        val mins = totalSeconds / 60
        val secs = totalSeconds % 60

        return when {
            mins == 0 -> "$secs seconds"
            secs == 0 && mins == 1 -> "1 minute"
            secs == 0 -> "$mins minutes"
            mins == 1 -> "1 minute $secs"
            else -> "$mins minutes $secs"
        }
    }

    override fun handleOnDestroy() {
        isRunning = false
        tts?.stop()
        tts?.shutdown()
        restTimer?.cancel()
        restTimer = null
        super.handleOnDestroy()
    }
}
