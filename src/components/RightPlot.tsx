import { Application, extend } from '@pixi/react';
import { Graphics, Text, Container } from 'pixi.js';
import { useCallback, useState, useEffect } from 'react';
import { LayerData } from '../types';

extend({ Graphics, Text, Container });

interface RightPlotProps {
    layers: LayerData[];
    width: number;
    height: number;
    onLayerUpdate: (layers: LayerData[]) => void;
}

export const RightPlot = ({ layers, width, height, onLayerUpdate }: RightPlotProps) => {
    const [scale, setScale] = useState({ x: 1, y: 1 });
    const [selectedLine, setSelectedLine] = useState<{index: number, isHorizontal: boolean} | null>(null);
    const [axisLimits, setAxisLimits] = useState({
        xmin: 50,    // Velocity min
        xmax: 1000,  // Velocity max
        ymin: 0,     // Depth min
        ymax: 200    // Depth max
    });

    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    useEffect(() => {
        setScale({
            x: width / 800,
            y: height / 400
        });
    }, [width, height]);

    const calculateDisplayValues = (screenX: number, screenY: number) => {
        // Convert screen coordinates to axis values
        const xRatio = screenX / width;
        const yRatio = screenY / height;
        
        const axisX = axisLimits.xmin + xRatio * (axisLimits.xmax - axisLimits.xmin);
        const axisY = axisLimits.ymin + yRatio * (axisLimits.ymax - axisLimits.ymin);
        
        return { axisX, axisY };
    };

    const screenToAxisCoords = (value: number, isX: boolean) => {
        if (isX) {
            return ((value - axisLimits.xmin) / (axisLimits.xmax - axisLimits.xmin)) * width;
        } else {
            return ((value - axisLimits.ymin) / (axisLimits.ymax - axisLimits.ymin)) * height;
        }
    };

    const drawLayers = useCallback((g: Graphics) => {
        g.clear();
        
        // Draw grid
        g.setStrokeStyle({
            width: 1,
            color: 0xEEEEEE
        });
        
        // Vertical grid lines
        for (let val = axisLimits.xmin; val <= axisLimits.xmax; val += 200) {
            const x = screenToAxisCoords(val, true);
            g.moveTo(x, 0);
            g.lineTo(x, height);
        }
        
        // Horizontal grid lines
        for (let val = axisLimits.ymin; val <= axisLimits.ymax; val += 50) {
            const y = screenToAxisCoords(val, false);
            g.moveTo(0, y);
            g.lineTo(width, y);
        }
        g.stroke();
        
        // Draw border
        g.setStrokeStyle({
            width: 1,
            color: 0x000000
        });
        g.beginPath();
        g.rect(0, 0, width, height);
        g.stroke();

        // Draw axes values
        // Y-axis (depth) values
        for (let val = axisLimits.ymin; val <= axisLimits.ymax; val += 50) {
            const y = screenToAxisCoords(val, false);
            const text = new Text(val.toFixed(1), {
                fontSize: 10,
                fill: 0x000000
            });
            text.x = -30;
            text.y = y - 5;
            g.addChild(text);
        }

        // X-axis (velocity) values
        for (let val = axisLimits.xmin; val <= axisLimits.xmax; val += 200) {
            const x = screenToAxisCoords(val, true);
            const text = new Text(val.toString(), {
                fontSize: 10,
                fill: 0x000000
            });
            text.x = x - 15;
            text.y = height + 10;
            g.addChild(text);
        }
        
        // Draw layers
        layers.forEach((layer) => {
            const y = screenToAxisCoords(layer.depth, false);
            const x = screenToAxisCoords(layer.velocity, true);
            
            // Black horizontal line
            g.setStrokeStyle({
                width: 1,
                color: 0x000000
            });
            g.moveTo(0, y);
            g.lineTo(width, y);
            g.stroke();
            
            // Red vertical line
            g.setStrokeStyle({
                width: 1,
                color: 0xFF0000
            });
            g.moveTo(x, 0);
            g.lineTo(x, height);
            g.stroke();
            
            // Add velocity value
            const text = new Text(layer.velocity.toFixed(1), {
                fontSize: 10,
                fill: 0xFF0000
            });
            text.x = x + 5;
            text.y = y - 15;
            g.addChild(text);

            // Add depth value
            const depthText = new Text(layer.depth.toFixed(1), {
                fontSize: 10,
                fill: 0x000000
            });
            depthText.x = -25;
            depthText.y = y - 5;
            g.addChild(depthText);
        });

        // Add axis labels
        const depthLabel = new Text("Depth, m", {
            fontSize: 12,
            fill: 0x000000
        });
        depthLabel.x = -40;
        depthLabel.y = height / 2;
        depthLabel.rotation = -Math.PI / 2;
        g.addChild(depthLabel);

        const velocityLabel = new Text("Velocity, m/sec", {
            fontSize: 12,
            fill: 0x000000
        });
        velocityLabel.x = width / 2;
        velocityLabel.y = -20;
        g.addChild(velocityLabel);
    }, [layers, width, height, scale, axisLimits, screenToAxisCoords]);

    const handlePointerDown = (event: any) => {
        const { x, y } = event.global;
        
        // Check if we clicked near any lines
        layers.forEach((layer, index) => {
            const layerY = screenToAxisCoords(layer.depth, false);
            const layerX = screenToAxisCoords(layer.velocity, true);
            
            // Check horizontal line (black)
            if (Math.abs(y - layerY) < 5) {
                setSelectedLine({ index, isHorizontal: true });
                return;
            }
            
            // Check vertical line (red)
            if (Math.abs(x - layerX) < 5) {
                setSelectedLine({ index, isHorizontal: false });
                return;
            }
        });
    };

    const handlePointerMove = (event: any) => {
        if (!selectedLine) return;
        
        const { x, y } = event.global;
        const newLayers = [...layers];
        const layer = newLayers[selectedLine.index];
        
        if (selectedLine.isHorizontal) {
            // Update depth (y-coordinate)
            const newDepth = axisLimits.ymin + (y / height) * (axisLimits.ymax - axisLimits.ymin);
            layer.depth = Math.max(axisLimits.ymin, Math.min(axisLimits.ymax, newDepth));
        } else {
            // Update velocity (x-coordinate)
            const newVelocity = axisLimits.xmin + (x / width) * (axisLimits.xmax - axisLimits.xmin);
            layer.velocity = Math.max(axisLimits.xmin, Math.min(axisLimits.xmax, newVelocity));
        }
        
        onLayerUpdate(newLayers);
    };

    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        if (!event.shiftKey && !event.altKey) return;
        
        // Get mouse position from a separate mouse tracking state
        const clickDepth = axisLimits.ymin + (mousePos.y / height) * (axisLimits.ymax - axisLimits.ymin);
        
        if (event.shiftKey) {
            // Split layer
            const nearestLayer = layers.find(layer => Math.abs(layer.depth - clickDepth) < 10);
            if (nearestLayer) {
                const newLayer = { ...nearestLayer };
                const index = layers.indexOf(nearestLayer);
                const newLayers = [...layers];
                newLayers.splice(index + 1, 0, newLayer);
                onLayerUpdate(newLayers);
            }
        } else if (event.altKey) {
            // Remove layer
            const index = layers.findIndex(layer => Math.abs(layer.depth - clickDepth) < 10);
            if (index !== -1) {
                const newLayers = layers.filter((_, i) => i !== index);
                onLayerUpdate(newLayers);
            }
        }
    }, [layers, height, axisLimits, onLayerUpdate]);

    const handleMouseMove = useCallback((event: MouseEvent) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setMousePos({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        });
    }, []);

    const handlePointerUp = () => {
        setSelectedLine(null);
    };

    useEffect(() => {
        const element = document.querySelector('.plot-container');
        if (element) {
            element.addEventListener('mousemove', handleMouseMove);
            element.addEventListener('keydown', handleKeyDown);
            return () => {
                element.removeEventListener('mousemove', handleMouseMove);
                element.removeEventListener('keydown', handleKeyDown);
            };
        }
    }, [handleMouseMove, handleKeyDown]);

    return (
        <div className="flex flex-col gap-4">
            <div className="flex gap-4 flex-wrap justify-center">
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-600">Velocity Min:</label>
                    <input
                        type="number"
                        value={axisLimits.xmin}
                        onChange={(e) => setAxisLimits(prev => ({ ...prev, xmin: parseFloat(e.target.value) }))}
                        className="w-24 px-2 py-1 text-sm border rounded shadow-sm"
                        step="1"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-600">Velocity Max:</label>
                    <input
                        type="number"
                        value={axisLimits.xmax}
                        onChange={(e) => setAxisLimits(prev => ({ ...prev, xmax: parseFloat(e.target.value) }))}
                        className="w-24 px-2 py-1 text-sm border rounded shadow-sm"
                        step="1"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-600">Depth Min:</label>
                    <input
                        type="number"
                        value={axisLimits.ymin}
                        onChange={(e) => setAxisLimits(prev => ({ ...prev, ymin: parseFloat(e.target.value) }))}
                        className="w-24 px-2 py-1 text-sm border rounded shadow-sm"
                        step="1"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-600">Depth Max:</label>
                    <input
                        type="number"
                        value={axisLimits.ymax}
                        onChange={(e) => setAxisLimits(prev => ({ ...prev, ymax: parseFloat(e.target.value) }))}
                        className="w-24 px-2 py-1 text-sm border rounded shadow-sm"
                        step="1"
                    />
                </div>
            </div>
            <div className="plot-container relative" tabIndex={0}>
                <Application width={width} height={height} background="#ffffff">
                    <pixiContainer>
                        <pixiGraphics 
                            draw={drawLayers}
                            eventMode="static"
                            onpointerdown={handlePointerDown}
                            onpointermove={handlePointerMove}
                            onpointerup={handlePointerUp}
                            onpointerupoutside={handlePointerUp}
                            cursor="pointer"
                        />
                    </pixiContainer>
                </Application>
            </div>
        </div>
    );
}; 