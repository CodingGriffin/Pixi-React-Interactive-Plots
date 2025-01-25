import { Application, extend } from '@pixi/react';
import { Graphics, Container } from 'pixi.js';
import { useState, useRef, useEffect } from 'react';
import { Point } from '../types';

extend({ Graphics, Container });

export const LeftPlot = () => {
    const [points, setPoints] = useState<Point[]>([]);
    const [hoveredPoint, setHoveredPoint] = useState<Point | null>(null);
    const [axisLimits, setAxisLimits] = useState({
        xmin: 0.016,  // Period min
        xmax: 0.6,    // Period max
        ymin: 30,     // Velocity min
        ymax: 500     // Velocity max
    });
    const [plotDimensions, setPlotDimensions] = useState({ width: 640, height: 480 });
    const plotRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        if (plotRef.current) {
            const { width, height } = plotRef.current.getBoundingClientRect();
            console.log(`Width: ${width}, Height: ${height}`);
            setPlotDimensions({ width, height });
        }
    }, []);

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
        <div className="flex flex-col items-center border-2 border-gray-300 rounded-lg p-4 shadow-sm">
            <div className="w-full">
                <div className="flex gap-4 flex-wrap justify-center mb-4">
                    <div className='flex flex-col'>
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-600">Y Max:</label>
                            <input
                                type="number"
                                value={axisLimits.ymax}
                                onChange={(e) => handleAxisLimitChange("ymax", e.target.value)}
                                className="w-24 px-2 py-1 text-sm border rounded shadow-sm"
                                step="1"
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-600">Y Min:</label>
                            <input
                                type="number"
                                value={axisLimits.ymin}
                                onChange={(e) => handleAxisLimitChange("ymin", e.target.value)}
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
                                onChange={(e) => handleAxisLimitChange("xmax", e.target.value)}
                                className="w-24 px-2 py-1 text-sm border rounded shadow-sm"
                                step="0.001"
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-600">X Min:</label>
                            <input
                                type="number"
                                value={axisLimits.xmin}
                                onChange={(e) => handleAxisLimitChange("xmin", e.target.value)}
                                className="w-24 px-2 py-1 text-sm border rounded shadow-sm"
                                step="0.001"
                            />
                        </div>
                    </div>
                </div>

                <input
                    type="file"
                    accept=".txt"
                    onChange={handleFileUpload}
                    className="block w-full text-sm text-gray-500 mb-4
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-blue-50 file:text-blue-700
                        hover:file:bg-blue-100"
                />

                <div className="relative border border-gray-200 rounded-lg bg-white shadow-sm w-full aspect-[4/3] min-h-[300px]" ref={plotRef}>
                    {/* Y-axis labels (left side) */}
                    <div className="absolute -left-8 top-0 h-full flex flex-col justify-between">
                        <div className="text-xs">{axisLimits.ymax.toFixed(3)}</div>
                        <div className="text-xs">{axisLimits.ymin.toFixed(3)}</div>
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
                            {points.map((point) => (
                                <pixiGraphics
                                    // key={index}
                                    draw={(g: Graphics) => {
                                        g.clear();
                                        const screenX = ((point.x - axisLimits.xmin) / (axisLimits.xmax - axisLimits.xmin)) * plotDimensions.width;
                                        const screenY = ((point.y - axisLimits.ymin) / (axisLimits.ymax - axisLimits.ymin)) * plotDimensions.height;

                                        if (point === hoveredPoint) {
                                            g.fill({ color: 0xFF0000 });
                                            g.circle(screenX, screenY, 7);
                                            g.fill({ color: 0xFFFFFF, alpha: 0.8 });
                                            g.circle(screenX, screenY, 3);
                                        } else {
                                            g.fill({ color: 0xFF0000 });
                                            g.circle(screenX, screenY, 5);
                                        }
                                        g.fill();
                                    }}
                                    eventMode="static"
                                    onpointerover={() => setHoveredPoint(point)}
                                    onpointerout={() => setHoveredPoint(null)}
                                />
                            ))}
                        </pixiContainer>
                    </Application>}

                    {/* Tooltip */}
                    {hoveredPoint && (
                        <div
                            className="absolute bg-white border border-black rounded px-1.5 py-0.5 text-xs shadow-sm pointer-events-none"
                            style={{
                                left: ((hoveredPoint.x - axisLimits.xmin) / (axisLimits.xmax - axisLimits.xmin)) * plotDimensions.width + 2,
                                top: ((hoveredPoint.y - axisLimits.ymin) / (axisLimits.ymax - axisLimits.ymin)) * plotDimensions.height - 2,
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
                                {`(${hoveredPoint.y.toFixed(3)}, ${hoveredPoint.x.toFixed(3)})`}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}; 