# Speech-to-Whiteboard Drawing

Transform your spoken words into visual architecture diagrams in real-time using OpenAI's Realtime API and tldraw.

## 🎯 What It Does

Speak naturally about system architecture (e.g., _"Hey! For our implementation, the server will be connected with a 2 way connection to the frontend."_) and watch as your words are instantly transformed into visual diagrams on an interactive whiteboard! 

## Realtime Speech-to-Whiteboard Drawing Demo

[![Realtime Speech-to-Whiteboard Drawing](https://img.youtube.com/vi/7tANdJDI4sg/0.jpg)](https://youtu.be/7tANdJDI4sg)


### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd whiteboard
   ```

2. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

3. **Run the application**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   - Navigate to `http://localhost:3000`
   - Click "Get Started" on the landing page
   - A popup will appear asking for your OpenAI API key (get one [here](https://platform.openai.com/api-keys)!).
   - Paste your `sk-proj-...` key and click "Connect".
   - Allow microphone access when prompted.

5. **Start speaking your architecture!**
   Try mentioning "Draw a server connected to a frontend!".

### How to Use + Caveats
> The app works by mapping a set list of pre-built shapes to the user's speech. This means that if the user says something that is not in the list of pre-built shapes, the app will not be able to draw it. 

### Future Improvements
- [ ] Implement more shapes - perhaps a way of doing it automatically?
- [ ] Experiment with the model writing the subtitles for the shapes.
- [ ] It would be cool if the model could move the shapes without having to click and drag them.
- [ ] Feel free to make a PR for more possible improvements!

## How does the Drawing Work?
The model can only call certain shapes (via enums) in the `drawItem` tool. This, within the function, creates shapes with a random UUID and then adds them to the canvas (using the `editor.createShapes`).

A fun challenge was how do you connect everything with the arrows. When you try to connect the raw shapes, they often go to the center. Instead, if you draw an invisible ellipse around it, and connect the sticky arrow to those, boom it works! 

## 🏗️ Architecture

This is a **browser-only** application that connects directly to OpenAI's Realtime API:

```
User Speech
    ↓
OpenAI Realtime API (WebRTC connection)
    ↓
Tool Calls (draw_item, connect, delete_item, add_text)
    ↓
tldraw Canvas Updates (shapes and arrows rendered)
    ↓
(Async)Architecture Analysis (GPT-5-mini via Chat Completions API)
    ↓
AI Suggestions Popup (optional enhancements)
```

**Key Technologies:**
- **Frontend**: React + TypeScript
- **Whiteboard**: tldraw SDK
- **Voice AI**: OpenAI Realtime API (direct browser connection)
- **Suggestions**: OpenAI API (GPT-5-mini)


## 📁 Project Structure

```
/whiteboard
├── frontend/                   # React application
│   ├── src/
│   │   ├── App.tsx            # Router with landing page
│   │   ├── Whiteboard.tsx     # Main whiteboard component
│   │   ├── hooks/
│   │   │   ├── useOpenAIRealtime.ts      # Voice control via OpenAI Realtime API
│   │   │   └── useArchitectureAnalysis.ts # AI-powered suggestions
│   │   ├── components/
│   │   │   ├── SuggestionsPopup.tsx      # Architecture suggestions UI
│   │   │   └── ui/                       # Custom shape components
│   │   │       ├── DatabaseShape.tsx
│   │   │       ├── ServerShape.tsx
│   │   │       ├── UserShape.tsx
│   │   │       ├── LLMShape.tsx
│   │   │       ├── FrontendShape.tsx
│   │   │       └── GPTRealtimeShape.tsx
│   │   ├── index.css          # Global styles + shape color variables
│   │   └── main.tsx           # Application entry point
│   ├── token.ts               # Ephemeral token generator script
│   ├── package.json           # Dependencies
│   └── vite.config.ts         # Vite configuration
└── README.md                  # This file
```

## 🎯 How to Use
### Voice Commands

The AI agent understands natural language. Here are some example phrases:

**Drawing Components:**
- "Draw a database at the top right"
- "Connect the Database with GPT-5 - ensure it's a two-way connection"
- "Draw a frontend at the bottom left"

**Managing Shapes:**
- "Delete the database"
- "Remove the server"

**Adding Text:**
- "Add the following text at the bottom right..."

### AI Suggestions Feature

After you add components via voice:
1. The system automatically analyzes your diagram (after 11 seconds)
2. Suggestions appear in the popup on the right
3. Click "Add to Diagram" to accept a suggestion
4. The component and its connections are added automatically
5. A new analysis runs after adding suggested components

## 🎨 Customization
### Adding Your Own Custom Shape Types

1. **Create a new shape utility** in `frontend/src/components/ui/`:
   ```typescript
   import { BaseBoxShapeUtil, HTMLContainer, TLBaseShape } from 'tldraw'
   
   export type MyShape = TLBaseShape<'myshape', { w: number; h: number; color: string }>
   
   export class MyShapeUtil extends BaseBoxShapeUtil<MyShape> {
     static override type = 'myshape' as const
     getDefaultProps() { return { w: 100, h: 100, color: 'blue' } }
     component(shape: MyShape) { /* SVG rendering */ }
     indicator(shape: MyShape) { /* Selection indicator */ }
   }
   ```

2. **Register in Whiteboard.tsx**:
   ```typescript
   import { MyShapeUtil } from './components/ui/MyShape'
   
   <Tldraw shapeUtils={[..., MyShapeUtil]} />
   ```

3. **Add to useOpenAIRealtime.ts** tool definition:
   - Update the `item_type` enum in `drawItem` tool
   - Add mapping in `shapeTypeMap`
   - Define dimensions and color

4. **Add CSS variables** in `index.css`:
   ```css
   --myshape-primary: 200 70% 50%;
   ```

### Modifying the AI Agent

Edit the `SYSTEM_PROMPT` in `frontend/src/hooks/useOpenAIRealtime.ts` to change:
- Agent personality and behavior
- Available item types
- Instruction style
- Response patterns

### Customizing Suggestions

Modify `useArchitectureAnalysis.ts` to:
- Change the analysis prompt
- Adjust suggestion frequency
- Add new component types
- Modify the GPT-5-mini model or parameters

## 🔐 Security Notes

- **Ephemeral tokens** are short-lived (60 seconds) and provide temporary access

- **API keys** should never be committed to version control
- The `.env` file is gitignored by default
- Tokens are entered by users at runtime, not hardcoded

### Tool Call Examples

When you say "Draw a database at 100, 200":
```javascript
drawItem.execute({ 
  item_type: 'database', 
  x: 100, 
  y: 200 
})
```

This creates:
```javascript
{
  id: 'shape:uuid-here',
  type: 'database',
  x: 100,
  y: 200,
  props: { w: 160, h: 200, color: 'green' }
}
```

### Connection Geometry

The system uses smart edge point calculation:
- **Rectangular shapes** (server, gpt_realtime): Uses `edgePointRect()` for precise edge connections
- **Elliptical shapes** (database, user, llm, frontend): Uses `edgePointEllipse()` for curved edge connections
- Arrows automatically bind to shapes and follow them when moved

## 📝 Credits / License
This is a hackathon/demo project. Use as you see fit! It's under the MIT License. It's obviously a plus if you give me some credit / [reach out](https://www.linkedin.com/in/leo-camacho/) and invite me to chat about it - it's such a fun project! 
