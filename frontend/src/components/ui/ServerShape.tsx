import { BaseBoxShapeUtil, HTMLContainer, TLBaseShape } from 'tldraw'

// Define the shape type
export type ServerShape = TLBaseShape<
  'server',
  {
    w: number
    h: number
    color: string
  }
>

// Define the shape utility class
export class ServerShapeUtil extends BaseBoxShapeUtil<ServerShape> {
  static override type = 'server' as const

  // Default props for the shape
  getDefaultProps(): ServerShape['props'] {
    return {
      w: 120,
      h: 80,
      color: 'gray'
    }
  }

  // Component that renders the shape
  component(shape: ServerShape) {
    const bounds = this.getGeometry(shape).bounds
    
    return (
      <HTMLContainer
        style={{
          width: bounds.width,
          height: bounds.height,
        }}
      >
        <svg
          width={bounds.width}
          height={bounds.height}
          viewBox="0 0 120 80"
          style={{ 
            overflow: 'visible',
            pointerEvents: 'none'
          }}
        >
          {/* 3D Server Box */}
          
          {/* Front face */}
          <rect
            x="15"
            y="25"
            width="70"
            height="40"
            fill="hsl(var(--server-primary) / 0.1)"
            stroke="hsl(var(--server-primary))"
            strokeWidth="2"
          />
          
          {/* Top face (parallelogram for 3D effect) */}
          <path
            d="M15 25 L25 15 L95 15 L85 25 Z"
            fill="hsl(var(--server-secondary) / 0.2)"
            stroke="hsl(var(--server-secondary))"
            strokeWidth="2"
          />
          
          {/* Right side face (parallelogram for 3D effect) */}
          <path
            d="M85 25 L95 15 L95 55 L85 65 Z"
            fill="hsl(var(--server-secondary) / 0.15)"
            stroke="hsl(var(--server-secondary))"
            strokeWidth="2"
          />
          
          {/* Server details - front panel */}
          <rect
            x="20"
            y="30"
            width="60"
            height="8"
            fill="hsl(var(--server-accent) / 0.3)"
            stroke="hsl(var(--server-primary))"
            strokeWidth="1"
          />
          
          <rect
            x="20"
            y="42"
            width="60"
            height="8"
            fill="hsl(var(--server-accent) / 0.3)"
            stroke="hsl(var(--server-primary))"
            strokeWidth="1"
          />
          
          <rect
            x="20"
            y="54"
            width="60"
            height="8"
            fill="hsl(var(--server-accent) / 0.3)"
            stroke="hsl(var(--server-primary))"
            strokeWidth="1"
          />
          
          {/* Power indicators */}
          <circle cx="25" cy="34" r="1.5" fill="hsl(var(--server-secondary))" />
          <circle cx="25" cy="46" r="1.5" fill="hsl(var(--server-secondary))" />
          <circle cx="25" cy="58" r="1.5" fill="hsl(var(--server-secondary))" />
          
          {/* Vents on right side */}
          <line x1="88" y1="20" x2="88" y2="50" stroke="hsl(var(--server-secondary))" strokeWidth="1" opacity="0.8" />
          <line x1="90" y1="22" x2="90" y2="48" stroke="hsl(var(--server-secondary))" strokeWidth="1" opacity="0.8" />
          <line x1="92" y1="24" x2="92" y2="46" stroke="hsl(var(--server-secondary))" strokeWidth="1" opacity="0.8" />
          
          {/* Server label */}
          <text 
            x="60" 
            y="76" 
            textAnchor="middle" 
            fontSize="9" 
            fill="hsl(var(--server-primary))"
            fontFamily="system-ui, sans-serif"
            fontWeight="bold"
          >
            Server
          </text>
        </svg>
      </HTMLContainer>
    )
  }

  // Indicator when shape is selected
  indicator(shape: ServerShape) {
    const bounds = this.getGeometry(shape).bounds
    return (
      <rect
        width={bounds.width}
        height={bounds.height}
        fill="none"
        stroke="var(--color-selected)"
        strokeWidth="1"
        strokeDasharray="3 3"
      />
    )
  }
}