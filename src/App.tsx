import { useState } from 'react';
import { LeftPlot } from './components/LeftPlot';
import { RightPlot } from './components/RightPlot';
import { LayerData, Point } from './types';

export default function App() {
    const [points] = useState<Point[]>([
        { x: 0.008, y: 12.350 },
        { x: 0.009, y: 14.500 }
    ]);

    const [layers, setLayers] = useState<LayerData[]>([
        { depth: 0, density: 2, ignore: 0, velocity: 208.308, description: "First is layer start" },
        { depth: 1.819, density: 2, ignore: 0, velocity: 208.308, description: "Second is layer end" },
        // Add other layers...
    ]);

    const handleLayerUpdate = (newLayers: LayerData[]) => {
        setLayers(newLayers);
    };

    return (
        <div className="flex flex-col min-h-screen bg-white p-8">
            <div className="flex gap-8 w-full">
                <div className="w-1/2">
                    <div className="text-center mb-2">Upload Points</div>
                    <LeftPlot 
                        width={500}
                        height={400}
                    />
                </div>
                <div className="w-1/2">
                    <div className="flex justify-between mb-2">
                        <div>Upload Model</div>
                        <div>Download Model</div>
                    </div>
                    {/* <RightPlot 
                        layers={layers}
                        width={500}
                        height={400}
                        onLayerUpdate={handleLayerUpdate}
                    /> */}
                </div>
            </div>
        </div>
    );
}
