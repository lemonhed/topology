# Shape mapping: converts item types to tldraw shape definitions

from typing import Any, Dict


def get_shape_definition(item_type: str, unique_name: str, position: tuple[float, float] = (100, 100)) -> Dict[str, Any]:
    """
    Convert an item type to a tldraw shape definition.
    
    Args:
        item_type: The type of item (e.g., "database", "server", "user", "llm")
        unique_name: Unique identifier for this shape
        position: (x, y) position on the canvas
    
    Returns:
        tldraw shape definition as a dictionary
    """
    
    # Custom shape mappings matching our frontend shape definitions
    shape_templates = {
        "database": {
            "type": "database",
            "props": {
                "w": 160,
                "h": 200,
                "color": "green"
            }
        },
        "server": {
            "type": "server", 
            "props": {
                "w": 240,
                "h": 160,
                "color": "gray"
            }
        },
        "user": {
            "type": "user", 
            "props": {
                "w": 120,
                "h": 160,
                "color": "blue"
            }
        },
        "gpt_5": {
            "type": "llm",
            "props": {
                "w": 200,
                "h": 160,
                "color": "purple"
            }
        },
        "frontend": {
            "type": "frontend",
            "props": {
                "w": 180,
                "h": 140,
                "color": "red"
            }
        },
        "gpt_realtime": {
            "type": "gpt_realtime",
            "props": {
                "w": 220,
                "h": 120,
                "color": "blue"
            }
        }
    }
    
    template = shape_templates.get(item_type.lower(), {
        "type": "geo",
        "props": {
            "geo": "rectangle",
            "w": 100,
            "h": 60, 
            "fill": "solid",
            "color": "gray",
            "text": f"{item_type}: {unique_name}"
        }
    })
    
    # Create the full shape definition
    shape = {
        "id": f"shape:{unique_name}",
        "type": template["type"],
        "x": position[0],
        "y": position[1],
        "props": template["props"]
    }
    
    return shape


def get_connection_definition(item1: str, item2: str) -> Dict[str, Any]:
    """
    Create a tldraw arrow/line connecting two items.
    
    Args:
        item1: ID of the first item
        item2: ID of the second item
    
    Returns:
        tldraw arrow shape definition
    """
    connection_id = f"shape:connection_{item1}_{item2}"
    
    return {
        "id": connection_id,
        "type": "arrow",
        "props": {
            # start / end are points
            "start": {"x": 0, "y": 0},
            "end": {"x": 0, "y": 0},
            # bindings reference existing shapes
            "startBinding": {
                "boundShapeId": f"shape:{item1}",
                "normalizedAnchor": {"x": 0.5, "y": 0.5}
            },
            "endBinding": {
                "boundShapeId": f"shape:{item2}",
                "normalizedAnchor": {"x": 0.5, "y": 0.5}
            },
            "color": "black",
            "size": "m",
            "bend": 0
        }
    }
