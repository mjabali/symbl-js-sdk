const { sdk } = require('@symblai/symbl-js');

const APP_ID = '<your App ID>';
const APP_SECRET = '<your App Secret>';
const EMAIL = '<your Email address>';
const FULL_NAME = '<your name>';

const uuid = require('uuid').v4

// For demo purposes, we're using mic to simply get audio from the microphone and pass it on to the WebSocket connection
const mic = require('mic')

const sampleRateHertz = 16000

const micInstance = mic({
  rate: sampleRateHertz,
  channels: '1',
  debug: false,
  exitOnSilence: 6,
});

(async () => {
  try {
    // Initialize the SDK
    await sdk.init({
      appId: APP_ID,
      appSecret: APP_SECRET,
      basePath: 'https://api.symbl.ai',
    })

    // Need unique Id
    const id = uuid()

    // Start Real-time Request (Uses Real-time WebSocket API behind the scenes)
    const connection = await sdk.startRealtimeRequest({
      id,
      insightTypes: ['action_item', 'question'],
      config: {
        meetingTitle: 'My Test Meeting', // Set name for meeting
        confidenceThreshold: 0.7,
        timezoneOffset: 480, // Offset in minutes from UTC
        languageCode: 'en-US',
        sampleRateHertz
      },
      speaker: {
        // Optional, if not specified, will simply not send an email in the end.
        userId: EMAIL, // Update with valid email
        name: FULL_NAME 
      },
      handlers: {
        // This will return live speech-to-text transcription of the call.
        onSpeechDetected: (data) => {
          if (data) {
            const { punctuated } = data
            console.log('Live: ', punctuated && punctuated.transcript)
            console.log('');
          }
          // console.log('onSpeechDetected ', JSON.stringify(data, null, 2));
        },
        
        // When processed messages are available, this callback will be called.
        onMessageResponse: (data) => {
          console.log('onMessageResponse', JSON.stringify(data, null, 2))
        },
        
        // When Symbl detects an insight, this callback will be called.
        onInsightResponse: (data) => {
          console.log('onInsightResponse', JSON.stringify(data, null, 2))
        },
        
        // When Symbl detects a topic, this callback will be called.
        onTopicResponse: (data) => {
          console.log('onTopicResponse', JSON.stringify(data, null, 2))
        }
      }
    });
    console.log('Successfully connected. Conversation ID: ', connection.conversationId);

    const micInputStream = micInstance.getAudioStream()
    
    // Raw audio stream
    micInputStream.on('data', (data) => {
      // Push audio from Microphone to websocket connection
      connection.sendAudio(data)
    })

    // Logging errors from  the mic instance
    micInputStream.on('error', function (err) {
      console.log('Error in Input Stream: ' + err)
    })

    // Logging when the mic instance connects and begins listening to microphone
    micInputStream.on('startComplete', function () {
      console.log('Started listening to Microphone.')
    })

    // Logging when the mic is only picking up silence.
    micInputStream.on('silence', function () {
      console.log('Got SIGNAL silence')
    })

    micInstance.start()

    setTimeout(async () => {
      // Stop listening to microphone
      micInstance.stop()
      console.log('Stopped listening to Microphone.')
      try {
        // Stop connection
        await connection.stop()
        console.log('Connection Stopped.')
      } catch (e) {
        console.error('Error while stopping the connection.', e)
      }
    }, 60 * 1000) // Stop connection after 1 minute i.e. 60 secs
  } catch (e) {
    console.error('Error: ', e)
  }
})();
