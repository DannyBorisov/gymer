package com.dannyborisov.gymerr

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.ToneGenerator
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.util.*

@CapacitorPlugin(name = "Sound")
class SoundPlugin : Plugin() {

    private var tts: TextToSpeech? = null
    private var audioManager: AudioManager? = null
    private var focusRequest: AudioFocusRequest? = null
    private var restTimer: Timer? = null
    private var elapsedSeconds: Int = 0
    private var announceInterval: Int = 30
    private var isVoiceMode: Boolean = true
    private var isRunning: Boolean = false
    private val handler = Handler(Looper.getMainLooper())

    override fun load() {
        audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
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
    fun playRestTimerBeep(call: PluginCall) {
        handler.post {
            requestAudioFocus {
                playBeep()
                releaseAudioFocusDelayed(1000)
            }
            call.resolve()
        }
    }

    @PluginMethod
    fun speak(call: PluginCall) {
        val text = call.getString("text") ?: "Rest complete"
        val rate = call.getFloat("rate") ?: 0.5f

        handler.post {
            requestAudioFocus {
                tts?.setSpeechRate(rate * 1.8f) // Adjust rate for Android
                tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                    override fun onStart(utteranceId: String?) {}
                    override fun onDone(utteranceId: String?) {
                        releaseAudioFocusDelayed(500)
                    }
                    override fun onError(utteranceId: String?) {
                        releaseAudioFocusDelayed(500)
                    }
                })
                tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "rest_timer_utterance")
            }
            call.resolve()
        }
    }

    @PluginMethod
    fun scheduleRestSound(call: PluginCall) {
        val mode = call.getString("mode") ?: "voice"
        var interval = call.getInt("announceInterval") ?: 30
        if (interval <= 0) interval = 30

        handler.post {
            // Cancel any existing timer
            restTimer?.cancel()
            restTimer = null

            announceInterval = interval
            isVoiceMode = mode == "voice"
            elapsedSeconds = 0
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

        elapsedSeconds += 1

        // Announce at intervals
        val shouldAnnounce = elapsedSeconds > 0 &&
                            announceInterval > 0 &&
                            (elapsedSeconds % announceInterval) == 0 &&
                            isVoiceMode

        if (shouldAnnounce) {
            val text = formatDuration(elapsedSeconds)
            speakText(text)
        }
    }

    private fun speakText(text: String) {
        requestAudioFocus {
            tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                override fun onStart(utteranceId: String?) {}
                override fun onDone(utteranceId: String?) {
                    releaseAudioFocusDelayed(500)
                }
                override fun onError(utteranceId: String?) {
                    releaseAudioFocusDelayed(500)
                }
            })
            tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "rest_timer_announce")
        }
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

    private fun playBeep() {
        try {
            val toneGenerator = ToneGenerator(AudioManager.STREAM_NOTIFICATION, 100)
            toneGenerator.startTone(ToneGenerator.TONE_PROP_BEEP, 200)
            handler.postDelayed({
                toneGenerator.startTone(ToneGenerator.TONE_PROP_BEEP, 200)
                handler.postDelayed({
                    toneGenerator.release()
                }, 300)
            }, 300)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun requestAudioFocus(onFocusGranted: () -> Unit) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val audioAttributes = AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build()

            focusRequest = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
                .setAudioAttributes(audioAttributes)
                .setOnAudioFocusChangeListener { }
                .build()

            val result = audioManager?.requestAudioFocus(focusRequest!!)
            if (result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED) {
                onFocusGranted()
            }
        } else {
            @Suppress("DEPRECATION")
            val result = audioManager?.requestAudioFocus(
                { },
                AudioManager.STREAM_NOTIFICATION,
                AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK
            )
            if (result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED) {
                onFocusGranted()
            }
        }
    }

    private fun releaseAudioFocusDelayed(delayMs: Long) {
        handler.postDelayed({
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                focusRequest?.let { audioManager?.abandonAudioFocusRequest(it) }
            } else {
                @Suppress("DEPRECATION")
                audioManager?.abandonAudioFocus { }
            }
        }, delayMs)
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
