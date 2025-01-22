import { Application, extend } from '@pixi/react';
import { Graphics, Container, Text } from 'pixi.js';
import { useCallback, useState } from 'react';
import { Point } from '../types';

extend({ Graphics, Container });

interface LeftPlotProps {
    width: number;
    height: number;
}

export const LeftPlot = ({ width, height }: LeftPlotProps) => {
    const [points, setPoints] = useState<Point[]>([]);
    const [hoveredPoint, setHoveredPoint] = useState<Point | null>(null);
    const [axisLimits, setAxisLimits] = useState({
        xmin: 0.016,  // Period min
        xmax: 0.6,    // Period max
        ymin: 30,     // Velocity min
        ymax: 500     // Velocity max
    });

    // Calculate display values for coordinates
    const calculateDisplayValues = (screenX: number, screenY: number) => {
        // For x: right to left (screenX = 0 maps to xmax, screenX = width maps to xmin)
        const xRatio = (width - screenX) / width;  // Invert X direction
        const axisX = axisLimits.xmin + xRatio * (axisLimits.xmax - axisLimits.xmin);

        // For y: bottom to top (screenY = height maps to ymin, screenY = 0 maps to ymax)
        const yRatio = (height - screenY) / height;  // Invert Y direction
        const axisY = axisLimits.ymin + yRatio * (axisLimits.ymax - axisLimits.ymin);

        return { axisX, axisY };
    };

    const handlePointerMove = useCallback((event: any) => {
        const { x, y } = event.global;
        
        // Find the nearest point within a certain radius
        const nearestPoint = points.find(point => {
            const screenX = width - ((point.x - axisLimits.xmin) / (axisLimits.xmax - axisLimits.xmin)) * width;
            const screenY = height - ((point.y - axisLimits.ymin) / (axisLimits.ymax - axisLimits.ymin)) * height;
            
            const distance = Math.sqrt(
                Math.pow(x - screenX, 2) + 
                Math.pow(y - screenY, 2)
            );
            return distance < 10;
        }) || null;
        
        setHoveredPoint(nearestPoint);
    }, [points, width, height, axisLimits]);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const text = await file.text();
        const newPoints = text.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(line => {
                const [y, x] = line.split(',').map(num => parseFloat(num.trim()));
                return { x, y }; // x is period (second value), y is velocity (first value)
            })
            .filter(point => !isNaN(point.x) && !isNaN(point.y));

        if (newPoints.length > 0) {
            const xValues = newPoints.map(p => p.x);
            const yValues = newPoints.map(p => p.y);
            
            const xmin = Math.min(...xValues);
            const xmax = Math.max(...xValues);
            const ymin = Math.min(...yValues);
            const ymax = Math.max(...yValues);
            
            const xPadding = (xmax - xmin) * 0.1;
            const yPadding = (ymax - ymin) * 0.1;
            
            setAxisLimits({
                xmin: xmin - xPadding,
                xmax: xmax + xPadding,
                ymin: ymin - yPadding,
                ymax: ymax + yPadding
            });
            
            setPoints(newPoints);
        }
    };

    const handleAxisLimitChange = (
        axis: "xmin" | "xmax" | "ymin" | "ymax",
        value: string
    ) => {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
            setAxisLimits(prev => {
                const newLimits = { ...prev, [axis]: numValue };
                if (newLimits.xmin >= newLimits.xmax || newLimits.ymin >= newLimits.ymax) {
                    return prev;
                }
                return newLimits;
            });
        }
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex gap-4 flex-wrap justify-center">
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-600">Y Max (Top Left):</label>
                    <input
                        type="number"
                        value={axisLimits.ymax}
                        onChange={(e) => handleAxisLimitChange("ymax", e.target.value)}
                        className="w-24 px-2 py-1 text-sm border rounded shadow-sm"
                        step="1"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-600">Y Min (Bottom Left):</label>
                    <input
                        type="number"
                        value={axisLimits.ymin}
                        onChange={(e) => handleAxisLimitChange("ymin", e.target.value)}
                        className="w-24 px-2 py-1 text-sm border rounded shadow-sm"
                        step="1"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-600">X Max (Bottom Left):</label>
                    <input
                        type="number"
                        value={axisLimits.xmax}
                        onChange={(e) => handleAxisLimitChange("xmax", e.target.value)}
                        className="w-24 px-2 py-1 text-sm border rounded shadow-sm"
                        step="0.001"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-600">X Min (Bottom Right):</label>
                    <input
                        type="number"
                        value={axisLimits.xmin}
                        onChange={(e) => handleAxisLimitChange("xmin", e.target.value)}
                        className="w-24 px-2 py-1 text-sm border rounded shadow-sm"
                        step="0.001"
                    />
                </div>
            </div>
            <input
                type="file"
                accept=".txt"
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
            />
            <div className="relative bg-white p-4 rounded-lg shadow-md">
                {/* Y-axis labels (left side) */}
                <div className="absolute -left-12 top-0 h-full flex flex-col justify-between">
                    <div className="text-xs">{axisLimits.ymax.toFixed(1)}</div>
                    <div className="text-xs">{axisLimits.ymin.toFixed(1)}</div>
                </div>

                {/* X-axis labels (bottom) */}
                <div className="absolute -bottom-6 left-0 w-full flex justify-between">
                    <div className="text-xs">{axisLimits.xmax.toFixed(3)}</div>
                    <div className="text-xs">{axisLimits.xmin.toFixed(3)}</div>
                </div>

                <div className="relative border border-gray-200 rounded-lg bg-white shadow-sm">
                    <Application width={width} height={height} background="#ffffff">
                        <pixiContainer>
                            {/* Points Layer */}
                            {points.map((point, index) => (
                                <pixiGraphics
                                    key={`point-${index}`}
                                    draw={g => {
                                        g.clear();
                                        const screenX = width - ((point.x - axisLimits.xmin) / (axisLimits.xmax - axisLimits.xmin)) * width;
                                        const screenY = height - ((point.y - axisLimits.ymin) / (axisLimits.ymax - axisLimits.ymin)) * height;
                                        
                                        if (point === hoveredPoint) {
                                            g.beginFill(0xFF0000);
                                            g.drawCircle(screenX, screenY, 7);
                                            g.beginFill(0xFFFFFF, 0.8);
                                            g.drawCircle(screenX, screenY, 3);
                                        } else {
                                            g.beginFill(0xFF0000);
                                            g.drawCircle(screenX, screenY, 5);
                                        }
                                        g.endFill();
                                    }}
                                    eventMode="static"
                                    onpointerover={() => setHoveredPoint(point)}
                                    onpointerout={() => setHoveredPoint(null)}
                                />
                            ))}
                        </pixiContainer>
                    </Application>

                    {/* Tooltip */}
                    {hoveredPoint && (
                        <div
                            className="absolute bg-white border border-black rounded px-1.5 py-0.5 text-xs shadow-sm pointer-events-none"
                            style={{
                                left: width - ((hoveredPoint.x - axisLimits.xmin) / (axisLimits.xmax - axisLimits.xmin)) * width + 15,
                                top: height - ((hoveredPoint.y - axisLimits.ymin) / (axisLimits.ymax - axisLimits.ymin)) * height - 15,
                                zIndex: 1000
                            }}
                        >
                            <div className="flex items-center gap-1">
                                <div
                                    className="w-3 h-3 border border-black"
                                    style={{
                                        background: "rgb(255, 0, 0)"
                                    }}
                                />
                                {`(${hoveredPoint.y.toFixed(1)}, ${hoveredPoint.x.toFixed(3)})`}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}; 