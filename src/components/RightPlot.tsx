import {
    Container,
    Sprite,
    Graphics,
    Text,
} from "pixi.js";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Application, extend } from "@pixi/react";
extend({ Container, Sprite, Graphics, Text });

interface Layer {
    startDepth: number;
    endDepth: number;
    velocity: number;
}

// Add new hover state types
interface HoveredLine {
    type: 'depth' | 'velocity';
    value: number;
    y?: number;
    x?: number;
}

interface DragState {
    layerIndex: number;
    type: 'boundary' | 'velocity';
    isDragging: boolean;
}

export const RightPlot = () => {
    const [layers, setLayers] = useState<Layer[]>([]);
    const [hoveredLine, setHoveredLine] = useState<HoveredLine | null>(null);
    const [dragState, setDragState] = useState<DragState | null>(null);
    const [axisLimits, setAxisLimits] = useState({
        xmin: 50,
        xmax: 1000,
        ymin: 0.0,
        ymax: 200.0,
    });
    const [plotDimensions, setPlotDimensions] = useState({ width: 640, height: 480 });
    const plotRef = useRef<HTMLDivElement>(null);

    // Update dimensions when component mounts or window resizes
    useEffect(() => {
        const updateDimensions = () => {
            if (plotRef.current) {
                const { width, height } = plotRef.current.getBoundingClientRect();
                setPlotDimensions({ width, height });
                console.log(`Width: ${width}, Height: ${height}`);
            }
        };

        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    // Update coordinate helpers to use dynamic dimensions
    const coordinateHelpers = useMemo(() => ({
        toScreenX: (value: number) => ((value - axisLimits.xmin) / (axisLimits.xmax - axisLimits.xmin)) * plotDimensions.width,
        toScreenY: (value: number) => ((value - axisLimits.ymin) / (axisLimits.ymax - axisLimits.ymin)) * plotDimensions.height,
        fromScreenX: (x: number) => axisLimits.xmin + (x / plotDimensions.width) * (axisLimits.xmax - axisLimits.xmin),
        fromScreenY: (y: number) => axisLimits.ymin + (y / plotDimensions.height) * (axisLimits.ymax - axisLimits.ymin)
    }), [axisLimits, plotDimensions]);

    // Update drawing functions to use dynamic dimensions
    const drawAllLines = useCallback((g: Graphics) => {
        g.clear();
        
        // Draw all black lines first
        if (layers.length > 0) {
            // Draw black lines
            g.setStrokeStyle({
                width: 2,
                color: 0x000000,
                alpha: 1
            });
            g.beginPath();
            
            // First layer's start depth
            const firstY = coordinateHelpers.toScreenY(layers[0].startDepth);
            g.moveTo(0, firstY);
            g.lineTo(plotDimensions.width, firstY);
            
            // Draw all layer end depths
            layers.forEach(layer => {
                const y = coordinateHelpers.toScreenY(layer.endDepth);
                g.moveTo(0, y);
                g.lineTo(plotDimensions.width, y);
            });
            g.stroke();
            g.closePath();
        }
        
        // Draw all red velocity lines
        if (layers.length > 0) {
            g.setStrokeStyle({
                width: 2,
                color: 0xFF0000,
                alpha: 1
            });
            g.beginPath();
            layers.forEach(layer => {
                const x = coordinateHelpers.toScreenX(layer.velocity);
                const startY = coordinateHelpers.toScreenY(layer.startDepth);
                const endY = coordinateHelpers.toScreenY(layer.endDepth);
                g.moveTo(x, startY);
                g.lineTo(x, endY);
            });
            g.stroke();
            g.closePath();
        }
    }, [layers, coordinateHelpers, plotDimensions]);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event?.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e: ProgressEvent<FileReader>) => {
                const text = e.target?.result as string;
                const lines = text.split("\n");
                const data = lines
                    .map((line: string) => {
                        const [depth, density, ignore, velocity] = line.trim().split(" ").map(Number);
                        return { depth, density, ignore, velocity };
                    })
                    .filter((item) => !isNaN(item.depth) && !isNaN(item.velocity));

                console.log("Parsed data:", data); // Debug log

                if (data.length > 0) {
                    // Create layers from consecutive points
                    const newLayers: Layer[] = [];
                    for (let i = 0; i < data.length - 1; i+=2) {
                        newLayers.push({
                            startDepth: data[i].depth,
                            endDepth: data[i + 1].depth,
                            velocity: data[i].velocity
                        });
                    }
                    console.log("Created layers:", newLayers); // Debug log

                    // Update axis limits based on data
                    const depthValues = data.map(d => d.depth);
                    const velocityValues = data.map(d => d.velocity);
                    
                    const newAxisLimits = {
                        xmin: Math.min(...velocityValues) * 0.9,
                        xmax: Math.max(...velocityValues) * 1.1,
                        ymin: Math.min(...depthValues) * 0.9,
                        ymax: Math.max(...depthValues) * 1.1
                    };
                    console.log("New axis limits:", newAxisLimits); // Debug log

                    setLayers(newLayers);
                    setAxisLimits(newAxisLimits);
                }
            };
            reader.readAsText(file);
        }
    };

    const handlePointerDown = (event: React.PointerEvent, layerIndex: number, type: 'boundary' | 'velocity') => {
        event.stopPropagation();
        
        // Handle shift+click to add new layer
        if (event.shiftKey && type === 'velocity') {
            const rect = event.currentTarget.getBoundingClientRect();
            const y = event.clientY - rect.top;
            const newDepth = axisLimits.ymin + (y / plotDimensions.height) * (axisLimits.ymax - axisLimits.ymin);
            
            // Only add new layer if click is within the layer's bounds
            const layer = layers[layerIndex];
            if (newDepth > layer.startDepth && newDepth < layer.endDepth) {
                const newLayers = [...layers];
                
                // Split the current layer into two
                const upperLayer: Layer = {
                    startDepth: layer.startDepth,
                    endDepth: newDepth,
                    velocity: layer.velocity
                };
                
                const lowerLayer: Layer = {
                    startDepth: newDepth,
                    endDepth: layer.endDepth,
                    velocity: layer.velocity
                };
                
                // Replace the current layer with the two new layers
                newLayers.splice(layerIndex, 1, upperLayer, lowerLayer);
                setLayers(newLayers);
                return;
            }
        }
        
        setDragState({ layerIndex, type, isDragging: true });
    };

    const handlePointerMove = (event: React.PointerEvent) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        if (!dragState?.isDragging || !layers.length) {
            // Handle hover state when not dragging
            let found = false;

            // Check black lines (boundaries)
            layers.forEach((layer, index) => {
                const startY = index === 0 ? 
                    (layer.startDepth - axisLimits.ymin) / (axisLimits.ymax - axisLimits.ymin) * plotDimensions.height :
                    (layer.endDepth - axisLimits.ymin) / (axisLimits.ymax - axisLimits.ymin) * plotDimensions.height;
                
                if (Math.abs(y - startY) < 10) {
                    setHoveredLine({
                        type: 'depth',
                        value: index === 0 ? layer.startDepth : layer.endDepth,
                        y: startY,
                        x
                    });
                    found = true;
                }
            });

            // Check red lines (velocities)
            if (!found) {
                layers.forEach((layer) => {
                    const lineX = ((layer.velocity - axisLimits.xmin) / (axisLimits.xmax - axisLimits.xmin)) * plotDimensions.width;
                    const startY = (layer.startDepth - axisLimits.ymin) / (axisLimits.ymax - axisLimits.ymin) * plotDimensions.height;
                    const endY = (layer.endDepth - axisLimits.ymin) / (axisLimits.ymax - axisLimits.ymin) * plotDimensions.height;

                    if (Math.abs(x - lineX) < 10 && y >= startY && y <= endY) {
                        setHoveredLine({
                            type: 'velocity',
                            value: layer.velocity,
                            y,
                            x: lineX
                        });
                        found = true;
                    }
                });
            }

            if (!found) {
                setHoveredLine(null);
            }
            return;
        }

        const newLayers = [...layers];

        if (dragState.type === 'velocity') {
            // Handle velocity drag (red line)
            const newVelocity = axisLimits.xmin + (x / plotDimensions.width) * (axisLimits.xmax - axisLimits.xmin);
            const constrainedVelocity = Math.max(
                axisLimits.xmin, 
                Math.min(axisLimits.xmax, newVelocity)
            );
            newLayers[dragState.layerIndex].velocity = constrainedVelocity;
            setLayers(newLayers);

            // Update tooltip for velocity
            setHoveredLine({
                type: 'velocity',
                value: constrainedVelocity,
                y,
                x: ((constrainedVelocity - axisLimits.xmin) / (axisLimits.xmax - axisLimits.xmin)) * plotDimensions.width
            });
        } else {
            // Handle boundary drag (black line)
            const newDepth = axisLimits.ymin + (y / plotDimensions.height) * (axisLimits.ymax - axisLimits.ymin);

            if (dragState.layerIndex === 0) {
                // First layer's start depth
                const maxDepth = layers[0].endDepth;
                const constrainedDepth = Math.min(maxDepth - 0.1, newDepth);
                newLayers[0].startDepth = constrainedDepth;
                setLayers(newLayers);
                // Update tooltip for depth
                setHoveredLine({
                    type: 'depth',
                    value: constrainedDepth,
                    y: (constrainedDepth - axisLimits.ymin) / (axisLimits.ymax - axisLimits.ymin) * plotDimensions.height,
                    x
                });
            } else if (dragState.layerIndex === layers.length) {
                // Last layer's end depth
                const lastLayer = layers[layers.length - 1];
                const minDepth = lastLayer.startDepth;
                const constrainedDepth = Math.max(minDepth + 0.1, newDepth);
                newLayers[layers.length - 1].endDepth = constrainedDepth;
                setLayers(newLayers);
                // Update tooltip for depth
                setHoveredLine({
                    type: 'depth',
                    value: constrainedDepth,
                    y: (constrainedDepth - axisLimits.ymin) / (axisLimits.ymax - axisLimits.ymin) * plotDimensions.height,
                    x
                });
            } else {
                // Middle boundaries
                const prevLayer = layers[dragState.layerIndex - 1];
                const nextLayer = layers[dragState.layerIndex];

                // Get constraints from adjacent layers
                const minDepth = prevLayer ? prevLayer.startDepth + 0.1 : -Infinity;
                const maxDepth = nextLayer ? nextLayer.endDepth - 0.1 : Infinity;

                // Constrain the movement
                const constrainedDepth = Math.max(minDepth, Math.min(maxDepth, newDepth));

                // Update both layers that share this boundary
                if (dragState.layerIndex > 0) {
                    newLayers[dragState.layerIndex - 1].endDepth = constrainedDepth;
                }
                newLayers[dragState.layerIndex].startDepth = constrainedDepth;
                
                setLayers(newLayers);

                // Update tooltip for depth
                setHoveredLine({
                    type: 'depth',
                    value: constrainedDepth,
                    y: (constrainedDepth - axisLimits.ymin) / (axisLimits.ymax - axisLimits.ymin) * plotDimensions.height,
                    x
                });
            }
        }
    };

    const handlePointerUp = () => {
        setDragState(null);
    };

    // Add click handler for the plot area
    const handlePlotClick = (event: React.PointerEvent) => {
        if (event.shiftKey && layers.length > 0) {
            const rect = event.currentTarget.getBoundingClientRect();
            // const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            
            // Find which layer was clicked
            for (let i = 0; i < layers.length; i++) {
                const layer = layers[i];
                const startY = (layer.startDepth - axisLimits.ymin) / (axisLimits.ymax - axisLimits.ymin) * plotDimensions.height;
                const endY = (layer.endDepth - axisLimits.ymin) / (axisLimits.ymax - axisLimits.ymin) * plotDimensions.height;
                
                if (y >= startY && y <= endY) {
                    const newDepth = axisLimits.ymin + (y / plotDimensions.height) * (axisLimits.ymax - axisLimits.ymin);
                    const newLayers = [...layers];
                    
                    // Split the current layer into two
                    const upperLayer: Layer = {
                        startDepth: layer.startDepth,
                        endDepth: newDepth,
                        velocity: layer.velocity
                    };
                    
                    const lowerLayer: Layer = {
                        startDepth: newDepth,
                        endDepth: layer.endDepth,
                        velocity: layer.velocity
                    };
                    
                    // Replace the current layer with the two new layers
                    newLayers.splice(i, 1, upperLayer, lowerLayer);
                    setLayers(newLayers);
                    break;
                }
            }
        }
    };

    useEffect(() => {
        window.addEventListener('pointerup', handlePointerUp);
        return () => window.removeEventListener('pointerup', handlePointerUp);
    }, []);

    return (
        <div className="flex flex-col items-center border-2 border-gray-300 rounded-lg p-4 shadow-sm w-full">
            <div className="w-full">
                <div className="flex gap-4 flex-wrap justify-center mb-4">
                    <div className='flex flex-col'>
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-600">Y Max:</label>
                            <input
                                type="number"
                                value={axisLimits.ymax}
                                onChange={(e) => setAxisLimits(prev => ({ ...prev, ymax: parseFloat(e.target.value) }))}
                                className="w-24 px-2 py-1 text-sm border rounded shadow-sm"
                                step="1"
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-600">Y Min:</label>
                            <input
                                type="number"
                                value={axisLimits.ymin}
                                onChange={(e) => setAxisLimits(prev => ({ ...prev, ymin: parseFloat(e.target.value) }))}
                                className="w-24 px-2 py-1 text-sm border rounded shadow-sm"
                                step="1"
                            />
                        </div>
                    </div>
                    <div className='flex flex-col'>
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-600">X Max:</label>
                            <input
                                type="number"
                                value={axisLimits.xmax}
                                onChange={(e) => setAxisLimits(prev => ({ ...prev, xmax: parseFloat(e.target.value) }))}
                                className="w-24 px-2 py-1 text-sm border rounded shadow-sm"
                                step="0.001"
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-600">X Min:</label>
                            <input
                                type="number"
                                value={axisLimits.xmin}
                                onChange={(e) => setAxisLimits(prev => ({ ...prev, xmin: parseFloat(e.target.value) }))}
                                className="w-24 px-2 py-1 text-sm border rounded shadow-sm"
                                step="0.001"
                            />
                        </div>
                    </div>
                </div>

                <input
                    type="file"
                    accept=".txt"
                    onChange={handleFileSelect}
                    className="block w-full text-sm text-gray-500 mb-4
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-blue-50 file:text-blue-700
                        hover:file:bg-blue-100"
                />

                <div 
                    ref={plotRef}
                    className="relative border border-gray-200 rounded-lg bg-white shadow-sm w-full aspect-[4/3] min-h-[300px]"
                    onPointerMove={handlePointerMove}
                    onPointerUp={() => setDragState(null)}
                    onPointerDown={handlePlotClick}
                >
                    {/* Y-axis labels (left side) */}
                    <div className="absolute -left-8 top-0 h-full flex flex-col justify-between">
                        <div className="text-xs">{axisLimits.ymin.toFixed(3)}</div>
                        <div className="text-xs">{axisLimits.ymax.toFixed(3)}</div>
                    </div>

                    {/* X-axis labels (bottom) */}
                    <div className="absolute -bottom-6 left-0 w-full flex justify-between">
                        <div className="text-xs">{axisLimits.xmin.toFixed(3)}</div>
                        <div className="text-xs">{axisLimits.xmax.toFixed(3)}</div>
                    </div>

                    {plotRef.current && <Application
                        className="w-full h-full"
                        width={plotDimensions.width}
                        height={plotDimensions.height}
                        background="white"
                    >
                        <pixiContainer>
                            {/* Single graphics object for all lines */}
                            <pixiGraphics draw={drawAllLines} />

                            {/* Separate container for hit areas */}
                            <pixiContainer>
                                {/* Hit area for first boundary */}
                                {layers.length > 0 && (
                                    <pixiGraphics
                                        draw={(g: Graphics) => {
                                            g.clear();
                                            g.setFillStyle({ color: 0xFFFFFF, alpha: 0 });
                                            const y = coordinateHelpers.toScreenY(layers[0].startDepth);
                                            g.rect(0, y - 10, plotDimensions.width, 20);
                                            g.fill();
                                        }}
                                        eventMode="static"
                                        cursor="ns-resize"
                                        onpointerdown={(e:any) => handlePointerDown(e, 0, 'boundary')}
                                    />
                                )}

                                {/* Hit areas for middle boundaries */}
                                {layers.map((layer, index) => (
                                    <pixiGraphics
                                        draw={(g: Graphics) => {
                                            g.clear();
                                            g.setFillStyle({ color: 0xFFFFFF, alpha: 0 });
                                            const y = coordinateHelpers.toScreenY(layer.endDepth);
                                            g.rect(0, y - 10, plotDimensions.width, 20);
                                            g.fill();
                                        }}
                                        eventMode="static"
                                        cursor="ns-resize"
                                        onpointerdown={(e:any) => handlePointerDown(e, index + 1, 'boundary')}
                                    />
                                ))}

                                {/* Hit areas for velocity lines */}
                                {layers.map((layer, index) => (
                                    <pixiGraphics
                                        draw={(g: Graphics) => {
                                            g.clear();
                                            g.setFillStyle({ color: 0xFFFFFF, alpha: 0 });
                                            const x = coordinateHelpers.toScreenX(layer.velocity);
                                            const startY = coordinateHelpers.toScreenY(layer.startDepth);
                                            const endY = coordinateHelpers.toScreenY(layer.endDepth);
                                            g.rect(x - 10, startY, 20, endY - startY);
                                            g.fill();
                                        }}
                                        eventMode="static"
                                        cursor="ew-resize"
                                        onpointerdown={(e:any) => handlePointerDown(e, index, 'velocity')}
                                    />
                                ))}
                            </pixiContainer>
                        </pixiContainer>
                    </Application>}

                    {/* Tooltip */}
                    {hoveredLine && (
                        <div
                            className="absolute bg-white border border-gray-300 rounded px-2 py-1 text-sm shadow-sm pointer-events-none"
                            style={{
                                left: (hoveredLine.x || 0) + 2,
                                top: (hoveredLine.y || 0) - 2,
                                transform: 'translate(0, -100%)',
                                zIndex: 1000
                            }}
                        >
                            {hoveredLine.type === 'depth' 
                                ? `Depth: ${hoveredLine.value.toFixed(2)}` 
                                : `Velocity: ${hoveredLine.value.toFixed(2)}`}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
