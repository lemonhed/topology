import { BaseBoxShapeUtil, HTMLContainer, TLBaseShape } from 'tldraw'

// Define the shape type
export type DatabaseShape = TLBaseShape<
  'database',
  {
    w: number
    h: number
    color: string
  }
>

// Define the shape utility class
export class DatabaseShapeUtil extends BaseBoxShapeUtil<DatabaseShape> {
  static override type = 'database' as const

  // Default props for the shape
  getDefaultProps(): DatabaseShape['props'] {
    return {
      w: 80,
      h: 100,
      color: 'green'
    }
  }

  // Component that renders the shape
  component(shape: DatabaseShape) {
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
          viewBox="0 0 80 100"
          style={{ 
            overflow: 'visible',
            pointerEvents: 'none'
          }}
        >
          {/* Database cylinder body */}
          <rect
            x="20"
            y="15"
            width="40"
            height="70"
            fill="hsl(var(--database-primary) / 0.05)"
            stroke="hsl(var(--database-primary))"
            strokeWidth="2"
          />
          
          {/* Top disk (ellipse) */}
          <ellipse
            cx="40"
            cy="15"
            rx="20"
            ry="6"
            fill="hsl(var(--database-primary) / 0.3)"
            stroke="hsl(var(--database-primary))"
            strokeWidth="2"
          />
          
          {/* Middle disk */}
          <ellipse
            cx="40"
            cy="40"
            rx="20"
            ry="6"
            fill="hsl(var(--database-secondary) / 0.3)"
            stroke="hsl(var(--database-secondary))"
            strokeWidth="2"
          />
          
          {/* Bottom disk */}
          <ellipse
            cx="40"
            cy="65"
            rx="20"
            ry="6"
            fill="hsl(var(--database-accent) / 0.3)"
            stroke="hsl(var(--database-accent))"
            strokeWidth="2"
          />
          
          {/* Bottom cap (full ellipse) */}
          <ellipse
            cx="40"
            cy="85"
            rx="20"
            ry="6"
            fill="hsl(var(--database-primary) / 0.4)"
            stroke="hsl(var(--database-primary))"
            strokeWidth="2"
          />
          
          {/* Data visualization dots */}
          <circle cx="30" cy="25" r="1" fill="hsl(var(--database-accent))" opacity="0.8" />
          <circle cx="35" cy="28" r="1" fill="hsl(var(--database-secondary))" opacity="0.8" />
          <circle cx="45" cy="27" r="1" fill="hsl(var(--database-primary))" opacity="0.8" />
          <circle cx="50" cy="26" r="1" fill="hsl(var(--database-accent))" opacity="0.8" />
          
          <circle cx="32" cy="50" r="1" fill="hsl(var(--database-primary))" opacity="0.8" />
          <circle cx="40" cy="52" r="1" fill="hsl(var(--database-secondary))" opacity="0.8" />
          <circle cx="48" cy="51" r="1" fill="hsl(var(--database-accent))" opacity="0.8" />
          
          {/* Database label */}
          <text 
            x="40" 
            y="96" 
            textAnchor="middle" 
            fontSize="8" 
            fill="hsl(var(--database-primary))"
            fontFamily="system-ui, sans-serif"
            fontWeight="bold"
          >
            Database
          </text>
        </svg>
      </HTMLContainer>
    )
  }

  // Indicator when shape is selected
  indicator(shape: DatabaseShape) {
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