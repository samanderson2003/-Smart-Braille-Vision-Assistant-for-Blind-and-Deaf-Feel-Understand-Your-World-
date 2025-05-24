import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Vibration,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
  ScrollView
} from 'react-native';

const BrailleKeyboard = () => {
  const [currentDisplay, setCurrentDisplay] = useState('a');
  const [dots, setDots] = useState([false, false, false, false, false, false]);
  const [inputMode, setInputMode] = useState('alphabets'); // 'alphabets' or 'numbers'
  const [appMode, setAppMode] = useState('write'); // 'write' or 'read'
  const [typedText, setTypedText] = useState('');
  const [teachingMode, setTeachingMode] = useState(false);
  const [currentLesson, setCurrentLesson] = useState('a');
  const [tutorialStep, setTutorialStep] = useState(0);
  
  // Chatbot related states
  const [messages, setMessages] = useState([
    { role: 'system', content: 'Welcome! Type your question using the Braille keyboard.' }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  // Predefined mappings for Braille patterns to characters
  const alphabetMappings = {
    '100000': 'a', '110000': 'b', '100100': 'c', '100110': 'd', '100010': 'e',
    '110100': 'f', '110110': 'g', '110010': 'h', '010100': 'i', '010110': 'j',
    '101000': 'k', '111000': 'l', '101100': 'm', '101110': 'n', '101010': 'o',
    '111100': 'p', '111110': 'q', '111010': 'r', '011100': 's', '011110': 't',
    '101001': 'u', '111001': 'v', '010111': 'w', '101101': 'x', '101111': 'y',
    '101011': 'z'
  };

  const numberMappings = {
    '100000': '1',
    '110000': '2',
    '100100': '3',
    '100110': '4',
    '100010': '5',
    '110100': '6',
    '110110': '7',
    '110010': '8',
    '010100': '9',
    '010110': '0'
  };

  // Reverse mappings for teaching mode
  const reverseAlphabetMappings = {};
  Object.keys(alphabetMappings).forEach(key => {
    reverseAlphabetMappings[alphabetMappings[key]] = key;
  });

  const reverseNumberMappings = {};
  Object.keys(numberMappings).forEach(key => {
    reverseNumberMappings[numberMappings[key]] = key;
  });

  // Teaching lessons sequence
  const alphabetLessons = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 
                          'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
  const numberLessons = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

  // Custom vibration patterns for each dot
  const vibrationPatterns = [
    [100, 50, 100], // Dot 1: short-pause-short
    [200, 50, 100], // Dot 2: medium-pause-short
    [300, 50, 100], // Dot 3: long-pause-short
    [100, 50, 200], // Dot 4: short-pause-medium
    [200, 50, 200], // Dot 5: medium-pause-medium
    [300, 50, 200]  // Dot 6: long-pause-medium
  ];

  // Function to set dots based on a character
  const setDotsForCharacter = (character) => {
    const mappings = inputMode === 'alphabets' ? reverseAlphabetMappings : reverseNumberMappings;
    const pattern = mappings[character];
    
    if (pattern) {
      const newDots = pattern.split('').map(dot => dot === '1');
      setDots(newDots);
    }
  };

  // Toggle a specific dot
  const toggleDot = (index) => {
    const newDots = [...dots];
    newDots[index] = !newDots[index];
    setDots(newDots);
    
    // Provide unique haptic feedback for this dot
    Vibration.vibrate(vibrationPatterns[index]);
    
    // Convert the current dot pattern to a character
    const dotString = newDots.map(dot => dot ? '1' : '0').join('');
    const mappings = inputMode === 'alphabets' ? alphabetMappings : numberMappings;
    
    if (mappings[dotString]) {
      setCurrentDisplay(mappings[dotString]);
      
      // Check if current pattern matches the lesson in teaching mode
      if (teachingMode && mappings[dotString] === currentLesson) {
        // Success feedback
        Vibration.vibrate([100, 50, 200, 50, 300]);
        moveToNextLesson();
      }
    } else {
      setCurrentDisplay('?');
    }
  };

  // Add the current character to the typed text
  const commitCharacter = () => {
    if (currentDisplay !== '?') {
      setTypedText(typedText + currentDisplay);
      // Reset dots after committing a character
      setDots([false, false, false, false, false, false]);
      setCurrentDisplay('');
      
      // Provide confirmation vibration
      Vibration.vibrate([100, 50, 200, 50, 100]);
    }
  };

  // Add a space to the typed text
  const addSpace = () => {
    setTypedText(typedText + ' ');
    // Provide space vibration feedback
    Vibration.vibrate([50, 30, 50]);
  };

  // Submit the current text to the chatbot
  const submitToChatbot = async () => {
    if (typedText.trim() === '') return;
    
    // Add user message to chat
    const newMessages = [
      ...messages,
      { role: 'user', content: typedText }
    ];
    setMessages(newMessages);
    
    // Clear typed text
    setTypedText('');
    
    // Start loading state
    setIsLoading(true);
    
    try {
      // Make API call to ChatGPT
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'its hidden',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 1000,
          messages: newMessages.filter(msg => msg.role !== 'system').map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          system: "You are a helpful assistant for blind users. Keep your responses clear, concise, and easy to understand through a screen reader."
        })
      });
      
      const data = await response.json();
      
      // Add response to chat
      if (data.content && data.content[0] && data.content[0].text) {
        setMessages([
          ...newMessages,
          { role: 'assistant', content: data.content[0].text }
        ]);
        
        // Provide response received vibration
        Vibration.vibrate([200, 100, 300]);
      } else {
        // Handle error
        setMessages([
          ...newMessages,
          { role: 'assistant', content: 'Sorry, I encountered an error processing your request.' }
        ]);
      }
    } catch (error) {
      console.error('Error fetching response:', error);
      setMessages([
        ...newMessages,
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Switch between alphabets and numbers mode
  const toggleInputMode = () => {
    const newMode = inputMode === 'alphabets' ? 'numbers' : 'alphabets';
    setInputMode(newMode);
    
    // Provide mode-specific vibration feedback
    if (newMode === 'numbers') {
      // Underscore-like vibration for Number Mode
      Vibration.vibrate(200);
    } else {
      // Dot-like vibration for Alphabet Mode
      Vibration.vibrate(50);
    }
    
    // Reset dots when switching modes
    setDots([false, false, false, false, false, false]);
    setCurrentDisplay('');
    
    // Reset teaching lesson based on mode
    setCurrentLesson(newMode === 'alphabets' ? alphabetLessons[0] : numberLessons[0]);
  };

  // Toggle between read and write modes
  const toggleAppMode = () => {
    const newMode = appMode === 'write' ? 'read' : 'write';
    setAppMode(newMode);
    
    // Provide app mode switch vibration feedback
    Vibration.vibrate([200, 100, 200]);
    
    // Reset dots when switching app modes
    setDots([false, false, false, false, false, false]);
    setCurrentDisplay('');
  };

  // Toggle teaching mode on/off
  const toggleTeachingMode = () => {
    setTeachingMode(!teachingMode);
    // Reset dots when toggling teaching mode
    setDots([false, false, false, false, false, false]);
    
    if (!teachingMode) {
      // Set up first lesson when entering teaching mode
      setCurrentLesson(inputMode === 'alphabets' ? alphabetLessons[0] : numberLessons[0]);
      setTutorialStep(0);
    }
  };

  // Move to the next lesson
  const moveToNextLesson = () => {
    const currentLessons = inputMode === 'alphabets' ? alphabetLessons : numberLessons;
    const currentIndex = currentLessons.indexOf(currentLesson);
    
    if (currentIndex < currentLessons.length - 1) {
      setCurrentLesson(currentLessons[currentIndex + 1]);
    } else {
      // Completed all lessons for this mode
      setCurrentLesson('Complete!');
      Vibration.vibrate([300, 100, 300, 100, 500]);
    }
    
    // Reset dots for new lesson
    setDots([false, false, false, false, false, false]);
    setCurrentDisplay('');
  };

  // Show dots for current lesson
  const showHint = () => {
    if (currentLesson !== 'Complete!') {
      setDotsForCharacter(currentLesson);
    }
  };

  // Update the current display when changing input mode
  useEffect(() => {
    // Reset display when changing modes
    setCurrentDisplay('');
  }, [inputMode]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar hidden />
      
     
      
      {/* Main Container - Landscape Layout */}
      <View style={styles.mainContainer}>
        {/* Left Dots (1-2-3) */}
        <View style={styles.dotsColumn}>
          <TouchableOpacity
            style={[styles.dot, dots[0] && styles.activeDot]}
            onPress={() => toggleDot(0)}
            accessibilityLabel="Dot 1"
          >
            <Text style={styles.dotText}>1</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.dot, dots[1] && styles.activeDot]}
            onPress={() => toggleDot(1)}
            accessibilityLabel="Dot 2"
          >
            <Text style={styles.dotText}>2</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.dot, dots[2] && styles.activeDot]}
            onPress={() => toggleDot(2)}
            accessibilityLabel="Dot 3"
          >
            <Text style={styles.dotText}>3</Text>
          </TouchableOpacity>
        </View>
        
        {/* Center Chat Area - Replacing Work Area */}
        <View style={styles.workAreaContainer}>
           {/* Top Control Buttons */}
      <View style={styles.topButtonsContainer}>
        <TouchableOpacity 
          style={styles.topButton}
          onPress={toggleInputMode}
          accessibilityLabel="Switch between alphabets and numbers"
        >
          <Text style={styles.topButtonText}>
            Button to switch{'\n'}
            {inputMode === 'alphabets' ? 'alphabets / Numbers' : 'Numbers / alphabets'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.topButton}
          onPress={toggleAppMode}
          accessibilityLabel="Switch between read mode and write mode"
        >
          <Text style={styles.topButtonText}>
            Button to Switch{'\n'}
            Read mode/Write mode
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onLongPress={submitToChatbot}>
          <View style={styles.chatArea} >
            <Text style={styles.chatAreaTitle}>
              Chat Assistant for Blind Users
            </Text>
            
            {/* Chat Messages */}
            <ScrollView 
              style={styles.messagesContainer}
              contentContainerStyle={styles.messagesContent}
              accessibilityLabel="Chat messages"
            >
              {messages.map((message, index) => (
                <View 
                  key={index} 
                  style={[
                    styles.messageBox,
                    message.role === 'user' ? styles.userMessage : styles.assistantMessage
                  ]}
                  accessibilityLabel={`${message.role === 'user' ? 'You' : 'Assistant'} said, ${message.content}`}
                >
                  <Text style={styles.messageText}>{message.content}</Text>
                </View>
              ))}
              {isLoading && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#ff40a0" />
                  <Text style={styles.loadingText}>Getting response...</Text>
                </View>
              )}
            </ScrollView>
            
            {/* Current Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.typedText}>{typedText}</Text>
              {currentDisplay && (
                <Text style={styles.currentCharacter}>Current: {currentDisplay}</Text>
              )}
            </View>
          </View>
      </TouchableOpacity>
          
          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity style={styles.actionButton} onPress={commitCharacter}>
              <Text style={styles.actionButtonText}>Add Letter</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton} onPress={addSpace}>
              <Text style={styles.actionButtonText}>Add Space</Text>
            </TouchableOpacity>
            
            {/* <TouchableOpacity 
              style={[styles.actionButton, styles.sendButton]} 
              onPress={submitToChatbot}
              disabled={isLoading || typedText.trim() === ''}
            >
              <Text style={styles.sendButtonText}>Send Message</Text>
            </TouchableOpacity> */}
          </View>
          
          {teachingMode && (
            <View style={styles.teachingControls}>
              <Text style={styles.lessonText}>Current Lesson: {currentLesson}</Text>
              <TouchableOpacity style={styles.hintButton} onPress={showHint}>
                <Text style={styles.hintButtonText}>Show Hint</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        
        {/* Right Dots (4-5-6) */}
        <View style={styles.dotsColumn}>
          <TouchableOpacity
            style={[styles.dot, dots[3] && styles.activeDot]}
            onPress={() => toggleDot(3)}
            accessibilityLabel="Dot 4"
          >
            <Text style={styles.dotText}>4</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.dot, dots[4] && styles.activeDot]}
            onPress={() => toggleDot(4)}
            accessibilityLabel="Dot 5"
          >
            <Text style={styles.dotText}>5</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.dot, dots[5] && styles.activeDot]}
            onPress={() => toggleDot(5)}
            accessibilityLabel="Dot 6"
          >
            <Text style={styles.dotText}>6</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Teaching Mode Toggle Button */}
      {/* <View style={styles.bottomContainer}>
        <TouchableOpacity 
          style={[styles.toggleButton, teachingMode && styles.activeToggle]} 
          onPress={toggleTeachingMode}
        >
          <Text style={styles.toggleButtonText}>
            Teaching Mode: {teachingMode ? 'ON' : 'OFF'}
          </Text>
        </TouchableOpacity>
      </View> */}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  topButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
  },
  topButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 15,
    width: '45%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    marginHorizontal: 20

  },
  topButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    textAlign: 'center',
  },
  mainContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 10,
    position: 'relative',
  },
  dotsColumn: {
    width: 70,
    alignItems: 'center',
    justifyContent: 'space-between', 
  },
  dot: {
    width: 90,
    height: 90,
    borderRadius: 50,
    backgroundColor: '#ff80ce',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    marginVertical: 15, 
  },
  activeDot: {
    backgroundColor: '#ff40a0',
    transform: [{ scale: 1.1 }],
  },
  dotText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  workAreaContainer: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  chatArea: {
    width: '90%',
    height: 200,
    backgroundColor: '#f7f9fc',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    overflow: 'hidden',
    flexDirection: 'column',
  },
  chatAreaTitle: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    paddingVertical: 8,
    backgroundColor: '#edf2f7',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    fontWeight: '500',
  },
  messagesContainer: {
    flex: 1,
    padding: 10,
  },
  messagesContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  messageBox: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    maxWidth: '80%',
    alignSelf: 'flex-start',
  },
  userMessage: {
    backgroundColor: '#e3f2fd',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 2,
  },
  assistantMessage: {
    backgroundColor: '#f0f0f0',
    borderBottomLeftRadius: 2,
  },
  messageText: {
    fontSize: 14,
    color: '#333',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 10,
  },
  loadingText: {
    marginTop: 5,
    color: '#666',
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    padding: 10,
    backgroundColor: '#fff',
  },
  typedText: {
    fontSize: 16,
    color: '#333',
  },
  currentCharacter: {
    fontSize: 14,
    color: '#ff40a0',
    fontWeight: 'bold',
    marginTop: 5,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginVertical: 10,
  },
  actionButton: {
    marginTop: 20,
    backgroundColor: '#f0f0f0',
    paddingVertical: 20,
    paddingHorizontal: 15,
    borderRadius: 15,
    width: '40%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    marginHorizontal: 20
  },
  actionButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  sendButton: {
    backgroundColor: '#ff40a0',
    borderColor: '#ff40a0',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  teachingControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '90%',
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  lessonText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  hintButton: {
    backgroundColor: '#eaf4fc',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#b3d7ff',
  },
  hintButtonText: {
    fontSize: 14,
    color: '#0066cc',
    fontWeight: '500',
  },
  bottomContainer: {
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    alignItems: 'center',
  },
  toggleButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  activeToggle: {
    backgroundColor: '#e0f7fa',
    borderColor: '#80deea',
  },
  toggleButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  }
});

export default BrailleKeyboard;