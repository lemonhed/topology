

interface ArchitectureSuggestion {
  id: string
  title: string
  description: string
  component_type: 'database' | 'person' | 'server' | 'llm'
  reasoning: string
}

interface SuggestionsPopupProps {
  suggestions: ArchitectureSuggestion[]
  isAnalyzing: boolean
  error: string | null
  onDismiss: (id: string) => void
  onClearAll: () => void
  onAcceptSuggestion: (suggestion: ArchitectureSuggestion) => void
  lastAnalysis: Date | null
}

const getComponentIcon = (type: string) => {
  switch (type) {
    case 'database':
      return '🗄️'
    case 'person':
      return '👤'
    case 'server':
      return '🖥️'
    case 'llm':
      return '🤖'
    default:
      return '📦'
  }
}

const getComponentColor = (type: string) => {
  switch (type) {
    case 'database':
      return '#10b981' // green
    case 'person':
      return '#3b82f6' // blue
    case 'server':
      return '#6b7280' // gray
    case 'llm':
      return '#8b5cf6' // purple
    default:
      return '#64748b'
  }
}

export function SuggestionsPopup({
  suggestions,
  isAnalyzing,
  error,
  onDismiss,
  onClearAll,
  onAcceptSuggestion,
  lastAnalysis
}: SuggestionsPopupProps) {
  const hasContent = suggestions.length > 0 || isAnalyzing || error

  if (!hasContent) {
    return null // No UI when there's nothing to show
  }

  return (
    <div style={{
      position: 'absolute',
      top: 10,
      right: 10,
      zIndex: 1000,
      background: 'white',
      border: '2px solid #3b82f6',
      borderRadius: '12px',
      boxShadow: '0 10px 25px rgba(59, 130, 246, 0.25)',
      width: '320px',
      maxHeight: '500px',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #e5e7eb',
        background: 'linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#111827' }}>
            💡 Architecture Suggestions
          </h3>
          {lastAnalysis && (
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
              Auto-analyzing every 10 seconds
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {suggestions.length > 0 && (
            <button
              onClick={onClearAll}
              style={{
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {isAnalyzing && (
          <div style={{
            padding: '24px',
            textAlign: 'center',
            color: '#6b7280'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔍</div>
            <p style={{ margin: 0, fontSize: '14px' }}>Analyzing your architecture...</p>
          </div>
        )}

        {error && (
          <div style={{
            padding: '16px',
            background: '#fef2f2',
            color: '#dc2626',
            fontSize: '14px'
          }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {suggestions.length === 0 && !isAnalyzing && !error && (
          <div style={{
            padding: '24px',
            textAlign: 'center',
            color: '#6b7280'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>✅</div>
            <p style={{ margin: 0, fontSize: '14px' }}>Architecture looks complete!</p>
          </div>
        )}

        {suggestions.map((suggestion) => (
          <div key={suggestion.id} style={{
            padding: '16px',
            borderBottom: '1px solid #f3f4f6'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>
                  {getComponentIcon(suggestion.component_type)}
                </span>
                <h4 style={{
                  margin: 0,
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#111827'
                }}>
                  {suggestion.title}
                </h4>
              </div>
              <button
                onClick={() => onDismiss(suggestion.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#9ca3af',
                  cursor: 'pointer',
                  fontSize: '16px',
                  padding: '0',
                  lineHeight: '1'
                }}
              >
                ✕
              </button>
            </div>

            <p style={{
              margin: '0 0 8px 0',
              fontSize: '13px',
              color: '#4b5563',
              lineHeight: '1.4'
            }}>
              {suggestion.description}
            </p>

            <p style={{
              margin: '0 0 12px 0',
              fontSize: '12px',
              color: '#6b7280',
              lineHeight: '1.4',
              fontStyle: 'italic'
            }}>
              {suggestion.reasoning}
            </p>

            <button
              onClick={() => onAcceptSuggestion(suggestion)}
              style={{
                background: getComponentColor(suggestion.component_type),
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>{getComponentIcon(suggestion.component_type)}</span>
              Add to Diagram
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
