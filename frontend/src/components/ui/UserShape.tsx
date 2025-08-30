import { BaseBoxShapeUtil, HTMLContainer, TLBaseShape } from 'tldraw'

// Define the shape type
export type UserShape = TLBaseShape<
  'user',
  {
    w: number
    h: number
    color: string
  }
>

// Define the shape utility class
export class UserShapeUtil extends BaseBoxShapeUtil<UserShape> {
  static override type = 'user' as const

  // Default props for the shape
  getDefaultProps(): UserShape['props'] {
    return {
      w: 60,
      h: 80,
      color: 'blue'
    }
  }

  // Component that renders the shape
  component(shape: UserShape) {
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
          viewBox="0 0 60 80"
          style={{ 
            overflow: 'visible',
            pointerEvents: 'none'
          }}
        >
          {/* Ground shadow - cast by the user */}
          <ellipse 
            cx="32" 
            cy="74" 
            rx="15" 
            ry="4" 
            fill="hsl(219 85% 8%)" 
            opacity="0.2"
          />
          
          {/* 3D Head - back shadow outline */}
          <circle 
            cx="31" 
            cy="14" 
            r="8.5" 
            fill="none"
            stroke="hsl(219 85% 15%)" 
            strokeWidth="1"
            opacity="0.4"
          />
          
          {/* 3D Head - main outline */}
          <circle 
            cx="30" 
            cy="13" 
            r="8" 
            fill="none"
            stroke="hsl(221 83% 23%)" 
            strokeWidth="2"
          />
          
          {/* 3D Torso - back depth line */}
          <line 
            x1="32" 
            y1="21" 
            x2="32" 
            y2="48" 
            stroke="hsl(219 85% 15%)" 
            strokeWidth="3" 
            opacity="0.4" 
            strokeLinecap="round"
          />
          
          {/* 3D Torso - main line */}
          <line 
            x1="30" 
            y1="21" 
            x2="30" 
            y2="48" 
            stroke="hsl(221 83% 23%)" 
            strokeWidth="2" 
            strokeLinecap="round"
          />
          
          {/* 3D Arms - back depth (shadow arms) */}
          <line 
            x1="32" 
            y1="30" 
            x2="20" 
            y2="42" 
            stroke="hsl(219 85% 15%)" 
            strokeWidth="3" 
            opacity="0.4" 
            strokeLinecap="round"
          />
          <line 
            x1="32" 
            y1="30" 
            x2="44" 
            y2="42" 
            stroke="hsl(219 85% 15%)" 
            strokeWidth="3" 
            opacity="0.4" 
            strokeLinecap="round"
          />
          
          {/* 3D Arms - main outlines */}
          <line 
            x1="30" 
            y1="28" 
            x2="18" 
            y2="40" 
            stroke="hsl(221 83% 23%)" 
            strokeWidth="2" 
            strokeLinecap="round"
          />
          <line 
            x1="30" 
            y1="28" 
            x2="42" 
            y2="40" 
            stroke="hsl(221 83% 23%)" 
            strokeWidth="2" 
            strokeLinecap="round"
          />
          
          {/* 3D Legs - back depth (shadow legs) */}
          <line 
            x1="32" 
            y1="48" 
            x2="20" 
            y2="70" 
            stroke="hsl(219 85% 15%)" 
            strokeWidth="3" 
            opacity="0.4" 
            strokeLinecap="round"
          />
          <line 
            x1="32" 
            y1="48" 
            x2="44" 
            y2="70" 
            stroke="hsl(219 85% 15%)" 
            strokeWidth="3" 
            opacity="0.4" 
            strokeLinecap="round"
          />
          
          {/* 3D Legs - main outlines */}
          <line 
            x1="30" 
            y1="50" 
            x2="18" 
            y2="68" 
            stroke="hsl(221 83% 23%)" 
            strokeWidth="2" 
            strokeLinecap="round"
          />
          <line 
            x1="30" 
            y1="50" 
            x2="42" 
            y2="68" 
            stroke="hsl(221 83% 23%)" 
            strokeWidth="2" 
            strokeLinecap="round"
          />
          
          {/* Eyes */}
          <circle 
            cx="27" 
            cy="12" 
            r="1.5" 
            fill="hsl(221 83% 23%)"
          />
          <circle 
            cx="33" 
            cy="12" 
            r="1.5" 
            fill="hsl(221 83% 23%)"
          />
          
          {/* Eye highlights */}
          <circle 
            cx="27.5" 
            cy="11.5" 
            r="0.5" 
            fill="hsl(217 91% 60%)"
          />
          <circle 
            cx="33.5" 
            cy="11.5" 
            r="0.5" 
            fill="hsl(217 91% 60%)"
          />
          
          {/* 3D Feet - shadow outlines */}
          <ellipse 
            cx="19" 
            cy="70" 
            rx="3" 
            ry="2" 
            fill="none"
            stroke="hsl(219 85% 15%)" 
            strokeWidth="1"
            opacity="0.4"
          />
          <ellipse 
            cx="43" 
            cy="70" 
            rx="3" 
            ry="2" 
            fill="none"
            stroke="hsl(219 85% 15%)" 
            strokeWidth="1"
            opacity="0.4"
          />
          
          {/* 3D Feet - main outlines */}
          <ellipse 
            cx="18" 
            cy="69" 
            rx="2.5" 
            ry="1.5" 
            fill="none"
            stroke="hsl(221 83% 23%)" 
            strokeWidth="2"
          />
          <ellipse 
            cx="42" 
            cy="69" 
            rx="2.5" 
            ry="1.5" 
            fill="none"
            stroke="hsl(221 83% 23%)" 
            strokeWidth="2"
          />

          {/* User label */}
          <text 
            x="30" 
            y="76" 
            textAnchor="middle" 
            fontSize="8" 
            fill="hsl(221 83% 23%)"
            fontFamily="system-ui, sans-serif"
            fontWeight="bold"
          >
            User
          </text>
        </svg>
      </HTMLContainer>
    )
  }

  // Indicator when shape is selected
  indicator(shape: UserShape) {
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